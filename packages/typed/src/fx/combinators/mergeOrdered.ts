import * as Cause from "effect/Cause"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Sink from "../../sink/Sink.js"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"

/**
 * While it runs all the Fx instances concurrently, it guarantees that the values are emitted in the order provided
 * buffering as necessary.
 */
export function mergeOrdered<FX extends ReadonlyArray<Fx<any, any, any>>>(
  ...fx: FX
): Fx<Fx.Success<FX[number]>, Fx.Error<FX[number]>, Fx.Services<FX[number]>> {
  return make<Fx.Success<FX[number]>, Fx.Error<FX[number]>, Fx.Services<FX[number]>>((sink) => {
    const { onEnd, onSuccess } = withBuffers(fx.length, sink)

    return Effect.forEach(
      fx,
      (fx, i) =>
        fx.run(
          Sink.make(
            (cause) => Cause.isInterruptedOnly(cause) ? onEnd(i) : sink.onFailure(cause),
            (a) => onSuccess(i, a)
          )
        ),
      { concurrency: "unbounded", discard: true }
    )
  })
}

function withBuffers<A, E, R>(
  size: number,
  sink: Sink.Sink<A, E, R>
) {
  const buffers = indexedBuffers(size, sink)
  const onSuccess = (index: number, value: A) => buffers.get(index)!.onSuccess(value)
  const onEnd = (index: number) => buffers.get(index)!.onEnd

  return {
    onSuccess,
    onEnd
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
    return Effect.flatMap(effect, () => onDone)
  })

  return {
    state,
    onSuccess,
    onEnd
  }
}
