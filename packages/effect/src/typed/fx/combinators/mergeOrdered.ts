import * as Cause from "../../../Cause.ts"
import * as Deferred from "../../../Deferred.ts"
import * as Effect from "../../../Effect.ts"
import * as Exit from "../../../Exit.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"
import * as Sink from "../sink/Sink.ts"

/**
 * While it runs all the Fx instances concurrently, it guarantees that the values are emitted in the order provided
 * buffering as necessary.
 */
export function mergeOrdered<FX extends ReadonlyArray<Fx<any, any, any>>>(
  ...fx: FX
): Fx<Fx.Success<FX[number]>, Fx.Error<FX[number]>, Fx.Services<FX[number]>> {
  return make<Fx.Success<FX[number]>, Fx.Error<FX[number]>, Fx.Services<FX[number]>>(Effect.fn(function*(sink) {
    const { makeSink, onEnd } = withBuffers(fx.length, sink)

    yield* Effect.forEach(fx, (fx, i) => Effect.onExit(fx.run(makeSink(i)), () => onEnd(i)), {
      concurrency: "unbounded",
      discard: true
    })
  }))
}

function withBuffers<A, E, R>(
  size: number,
  sink: Sink.Sink<A, E, R>
) {
  const buffers = indexedBuffers(size, sink)
  const onSuccess = (index: number, value: A) => buffers.get(index)!.onSuccess(value)
  const onEnd = (index: number) => buffers.get(index)!.onEnd

  const makeSink = (index: number) =>
    Sink.make<A, E, R>(
      (cause) => Cause.isInterruptedOnly(cause) ? onEnd(index) : sink.onFailure(cause),
      (value) => onSuccess(index, value)
    )

  return {
    onSuccess,
    onEnd,
    makeSink
  } as const
}

function indexedBuffers<A, E, R>(
  size: number,
  sink: Sink.Sink<A, E, R>
) {
  const buffers = new Map<number, ReturnType<typeof IndexedBuffer<A, E, R>>>()

  const last = size - 1
  for (let i = 0; i < size; i++) {
    const deferred = Deferred.makeUnsafe<void>()
    const state = {
      ready: i === 0,
      deferred
    }

    // First should start immediately
    if (i === 0) {
      Deferred.doneUnsafe(deferred, Exit.void)
    }

    buffers.set(
      i,
      IndexedBuffer(
        state,
        sink,
        i === last ? Effect.void : Effect.suspend(() => {
          const next = buffers.get(i + 1)!
          next.state.ready = true
          return Deferred.done(next.state.deferred, Exit.void)
        })
      )
    )
  }

  return buffers
}

function IndexedBuffer<A, E, R>(
  state: {
    ready: boolean
    deferred: Deferred.Deferred<void>
  },
  sink: Sink.Sink<A, E, R>,
  onDone: Effect.Effect<void>
) {
  let buffer: Array<A> = []

  const onSuccess = (value: A) => {
    if (state.ready) {
      if (buffer.length === 0) return sink.onSuccess(value)
      buffer.push(value)
      const effect = Effect.forEach(buffer, sink.onSuccess)
      buffer = []
      return effect
    } else {
      buffer.push(value)
      return Effect.void
    }
  }

  const onEnd = Effect.flatMap(Deferred.await(state.deferred), () => {
    if (buffer.length === 0) return onDone
    const effect = Effect.forEach(buffer, sink.onSuccess)
    buffer = []
    return Effect.ensuring(effect, onDone)
  })

  return {
    state,
    onSuccess,
    onEnd
  }
}
