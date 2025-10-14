import * as Cause from "../../../Cause.ts"
import * as Option from "../../../data/Option.ts"
import * as Effect from "../../../Effect.ts"
import * as Exit from "../../../Exit.ts"
import { dual, flow, identity } from "../../../Function.ts"
import * as MutableRef from "../../../MutableRef.ts"
import * as Ref from "../../../Ref.ts"
import type { Scheduler } from "../../../Scheduler.ts"
import type { Sink } from "./Sink.ts"

class MapSink<A, E, R, B> implements Sink<B, E, R> {
  readonly sink: Sink<A, E, R>
  readonly f: (b: B) => A

  constructor(sink: Sink<A, E, R>, f: (b: B) => A) {
    this.sink = sink
    this.f = f
  }

  onSuccess(value: B): Effect.Effect<unknown, never, R> {
    return this.sink.onSuccess(this.f(value))
  }

  onFailure(cause: Cause.Cause<E>): Effect.Effect<unknown, never, R> {
    return this.sink.onFailure(cause)
  }

  static make<A, E, R, B>(sink: Sink<A, E, R>, f: (b: B) => A): Sink<B, E, R> {
    if (sink instanceof MapSink) {
      return new MapSink(sink.sink, flow(f, sink.f))
    }

    if (sink instanceof FilterMapSink) {
      return new FilterMapSink(sink.sink, flow(f, sink.f))
    }

    return new MapSink(sink, f)
  }
}

export function map<A, E, R, B>(
  sink: Sink<A, E, R>,
  f: (b: B) => A
): Sink<B, E, R> {
  return MapSink.make(sink, f)
}

class FilterMapSink<A, E, R, B> implements Sink<B, E, R> {
  readonly sink: Sink<A, E, R>
  readonly f: (b: B) => Option.Option<A>

  constructor(sink: Sink<A, E, R>, f: (b: B) => Option.Option<A>) {
    this.sink = sink
    this.f = f
  }

  onSuccess(value: B): Effect.Effect<unknown, never, R> {
    const a = this.f(value)
    return Option.match(a, {
      onSome: (a) => this.sink.onSuccess(a),
      onNone: () => Effect.void
    })
  }

  onFailure(cause: Cause.Cause<E>): Effect.Effect<unknown, never, R> {
    return this.sink.onFailure(cause)
  }

  static make<A, E, R, B>(sink: Sink<A, E, R>, f: (b: B) => Option.Option<A>): Sink<B, E, R> {
    if (sink instanceof FilterMapSink) {
      return new FilterMapSink(sink.sink, flow(f, Option.flatMap(sink.f)))
    }

    if (sink instanceof MapSink) {
      return new FilterMapSink(sink.sink, flow(f, Option.map(sink.f)))
    }

    return new FilterMapSink(sink, f)
  }
}

export function filterMap<A, E, R, B>(
  sink: Sink<A, E, R>,
  f: (b: B) => Option.Option<A>
): Sink<B, E, R> {
  return FilterMapSink.make(sink, f)
}

export function compact<A, E, R>(
  sink: Sink<A, E, R>
): Sink<Option.Option<A>, E, R> {
  return filterMap(sink, identity)
}

export function filter<A, E, R>(
  sink: Sink<A, E, R>,
  f: (a: A) => boolean
): Sink<A, E, R> {
  return filterMap(sink, Option.liftPredicate(f))
}

export function withEarlyExit<A, E, R, R2>(
  sink: Sink<A, E, R>,
  f: (
    sink: Sink.WithEarlyExit<A, E, R>,
    params: { signal: AbortSignal; scheduler: Scheduler }
  ) => Effect.Effect<unknown, never, R2>
): Effect.Effect<void, never, R | R2> {
  return Effect.servicesWith((services) =>
    Effect.callback<unknown, never, R2>(function(this: Scheduler, resume, signal) {
      const earlyExit = Effect.callback<never>(() => resume(Effect.void))
      const sinkWithEarlyExit: Sink.WithEarlyExit<A, E, R> = {
        ...sink,
        earlyExit
      }

      f(sinkWithEarlyExit, { signal, scheduler: this }).pipe(
        Effect.flatMap(() => earlyExit),
        (_) => Effect.runForkWith(services)(_, { scheduler: this, signal })
      )
    })
  )
}

export function withState<A, E, R, B, R2>(
  sink: Sink<A, E, R>,
  state: B,
  f: (
    sink: Sink.WithState<A, E, R, B>,
    params: { signal: AbortSignal; scheduler: Scheduler }
  ) => Effect.Effect<unknown, never, R2>
) {
  return withEarlyExit(sink, (sink, params) => f({ ...sink, state: Ref.makeUnsafe(state) }, params))
}

export function withStateSemaphore<A, E, R, B, R2>(
  sink: Sink<A, E, R>,
  state: B,
  f: (
    sink: Sink.WithStateSemaphore<A, E, R, B>,
    params: { signal: AbortSignal; scheduler: Scheduler }
  ) => Effect.Effect<unknown, never, R2>
) {
  return withEarlyExit(sink, (sink, params) => {
    const stateRef = MutableRef.make(state)
    const semaphore = Effect.makeSemaphoreUnsafe(1)
    const lock = semaphore.withPermits(1)
    const modifyEffect = <C, E2, R2>(f: (state: B) => Effect.Effect<readonly [C, B], E2, R2>) =>
      Effect.suspend(() => f(MutableRef.get(stateRef))).pipe(
        Effect.flatMap(([c, b]) => {
          MutableRef.set(stateRef, b)
          return Effect.succeed(c)
        }),
        lock
      )
    const updateEffect = <E2, R2>(f: (state: B) => Effect.Effect<B, E2, R2>) =>
      modifyEffect((state) => f(state).pipe(Effect.map((b) => [b, b])))
    const get = modifyEffect((state) => Effect.succeed([state, state]))

    return f({ ...sink, modifyEffect, updateEffect, get }, params)
  })
}

export const loop: {
  <B, A, C>(seed: B, f: (acc: B, a: A) => readonly [C, B]): <E, R>(
    sink: Sink<C, E, R>
  ) => Sink<A, E, R>
  <A, E, R, B, C>(sink: Sink<C, E, R>, seed: B, f: (acc: B, a: A) => readonly [C, B]): Sink<A, E, R>
} = dual(3, function loop<A, E, R, B, C>(
  sink: Sink<C, E, R>,
  seed: B,
  f: (acc: B, a: A) => readonly [C, B]
): Sink<A, E, R> {
  return new LoopSink(sink, seed, f)
})

class LoopSink<A, E, R, B, C> implements Sink<A, E, R> {
  readonly sink: Sink<C, E, R>
  private seed: B
  readonly f: (acc: B, a: A) => readonly [C, B]

  constructor(
    sink: Sink<C, E, R>,
    seed: B,
    f: (acc: B, a: A) => readonly [C, B]
  ) {
    this.sink = sink
    this.seed = seed
    this.f = f
    this.onFailure = this.onFailure.bind(this)
    this.onSuccess = this.onSuccess.bind(this)
  }

  onFailure(cause: Cause.Cause<E>): Effect.Effect<unknown, never, R> {
    return this.sink.onFailure(cause)
  }

  onSuccess(value: A) {
    const [c, acc] = this.f(this.seed, value)
    this.seed = acc
    return this.sink.onSuccess(c)
  }
}

export const loopCause: {
  <B, A, C>(seed: B, f: (acc: B, a: Cause.Cause<A>) => readonly [Cause.Cause<C>, B]): <E, R>(
    sink: Sink<A, C, R>
  ) => Sink<A, E, R>
  <A, E, R, B, C>(
    sink: Sink<A, C, R>,
    seed: B,
    f: (acc: B, a: Cause.Cause<E>) => readonly [Cause.Cause<C>, B]
  ): Sink<A, E, R>
} = dual(3, function loopCause<A, E, R, B, C>(
  sink: Sink<A, C, R>,
  seed: B,
  f: (acc: B, a: Cause.Cause<E>) => readonly [Cause.Cause<C>, B]
): Sink<A, E, R> {
  return new LoopCauseSink(sink, seed, f)
})

class LoopCauseSink<A, E, R, B, C> implements Sink<A, E, R> {
  readonly sink: Sink<A, C, R>
  private seed: B
  readonly f: (acc: B, a: Cause.Cause<E>) => readonly [Cause.Cause<C>, B]

  constructor(
    sink: Sink<A, C, R>,
    seed: B,
    f: (acc: B, a: Cause.Cause<E>) => readonly [Cause.Cause<C>, B]
  ) {
    this.sink = sink
    this.seed = seed
    this.f = f
    this.onFailure = this.onFailure.bind(this)
    this.onSuccess = this.onSuccess.bind(this)
  }

  onFailure(cause: Cause.Cause<E>): Effect.Effect<unknown, never, R> {
    const [c, acc] = this.f(this.seed, cause)
    this.seed = acc
    return this.sink.onFailure(c)
  }

  onSuccess(value: A) {
    return this.sink.onSuccess(value)
  }
}

export const filterMapLoop: {
  <B, A, C>(seed: B, f: (acc: B, a: A) => readonly [Option.Option<C>, B]): <E, R>(
    sink: Sink<C, E, R>
  ) => Sink<A, E, R>
  <A, E, R, B, C>(sink: Sink<C, E, R>, seed: B, f: (acc: B, a: A) => readonly [Option.Option<C>, B]): Sink<A, E, R>
} = dual(3, function filterMapLoop<A, E, R, B, C>(
  sink: Sink<C, E, R>,
  seed: B,
  f: (acc: B, a: A) => readonly [Option.Option<C>, B]
): Sink<A, E, R> {
  return new FilterMapLoopSink(sink, seed, f)
})

class FilterMapLoopSink<A, E, R, B, C> implements Sink<A, E, R> {
  readonly sink: Sink<C, E, R>
  private seed: B
  readonly f: (acc: B, a: A) => readonly [Option.Option<C>, B]

  constructor(
    sink: Sink<C, E, R>,
    seed: B,
    f: (acc: B, a: A) => readonly [Option.Option<C>, B]
  ) {
    this.sink = sink
    this.seed = seed
    this.f = f
    this.onFailure = this.onFailure.bind(this)
    this.onSuccess = this.onSuccess.bind(this)
  }

  onFailure(cause: Cause.Cause<E>): Effect.Effect<unknown, never, R> {
    return this.sink.onFailure(cause)
  }

  onSuccess(value: A) {
    const [option, acc] = this.f(this.seed, value)
    this.seed = acc
    if (Option.isSome(option)) return this.sink.onSuccess(option.value)
    return Effect.void
  }
}

export const filterMapLoopCause: {
  <B, A, C>(seed: B, f: (acc: B, a: Cause.Cause<A>) => readonly [Option.Option<Cause.Cause<C>>, B]): <E, R>(
    sink: Sink<A, C, R>
  ) => Sink<A, E, R>
  <A, E, R, B, C>(
    sink: Sink<A, C, R>,
    seed: B,
    f: (acc: B, a: Cause.Cause<E>) => readonly [Option.Option<Cause.Cause<C>>, B]
  ): Sink<A, E, R>
} = dual(3, function filterMapLoopCause<A, E, R, B, C>(
  sink: Sink<A, C, R>,
  seed: B,
  f: (acc: B, a: Cause.Cause<E>) => readonly [Option.Option<Cause.Cause<C>>, B]
): Sink<A, E, R> {
  return new FilterMapLoopCauseSink(sink, seed, f)
})

class FilterMapLoopCauseSink<A, E, R, B, C> implements Sink<A, E, R> {
  readonly sink: Sink<A, C, R>
  private seed: B
  readonly f: (acc: B, a: Cause.Cause<E>) => readonly [Option.Option<Cause.Cause<C>>, B]

  constructor(
    sink: Sink<A, C, R>,
    seed: B,
    f: (acc: B, a: Cause.Cause<E>) => readonly [Option.Option<Cause.Cause<C>>, B]
  ) {
    this.sink = sink
    this.seed = seed
    this.f = f
    this.onFailure = this.onFailure.bind(this)
    this.onSuccess = this.onSuccess.bind(this)
  }

  onFailure(cause: Cause.Cause<E>): Effect.Effect<unknown, never, R> {
    const [option, acc] = this.f(this.seed, cause)
    this.seed = acc
    if (Option.isSome(option)) return this.sink.onFailure(option.value)
    return Effect.void
  }

  onSuccess(value: A) {
    return this.sink.onSuccess(value)
  }
}

export const loopEffect: {
  <B, A, E2, R2, C>(seed: B, f: (acc: B, a: A) => Effect.Effect<readonly [C, B], E2, R2>): <E, R>(
    sink: Sink<C, E | E2, R>
  ) => Sink<A, E | E2, R | R2>
  <A, E, R, B, C>(
    sink: Sink<C, E, R>,
    seed: B,
    f: (acc: B, a: A) => Effect.Effect<readonly [C, B], E, R>
  ): Sink<A, E, R>
} = dual(3, function loopEffect<A, E, R, B, C>(
  sink: Sink<C, E, R>,
  seed: B,
  f: (acc: B, a: A) => Effect.Effect<readonly [C, B], E, R>
): Sink<A, E, R> {
  return new LoopEffectSink(sink, seed, f)
})

class LoopEffectSink<A, E, R, B, C> implements Sink<A, E, R> {
  readonly sink: Sink<C, E, R>
  private seed: B
  readonly f: (acc: B, a: A) => Effect.Effect<readonly [C, B], E, R>

  constructor(
    sink: Sink<C, E, R>,
    seed: B,
    f: (acc: B, a: A) => Effect.Effect<readonly [C, B], E, R>
  ) {
    this.sink = sink
    this.seed = seed
    this.f = f
    this.onFailure = this.onFailure.bind(this)
    this.onSuccess = this.onSuccess.bind(this)
  }

  onFailure(cause: Cause.Cause<E>): Effect.Effect<unknown, never, R> {
    return this.sink.onFailure(cause)
  }

  onSuccess(value: A) {
    return Effect.matchCauseEffect(this.f(this.seed, value), {
      onFailure: (cause) => this.sink.onFailure(cause),
      onSuccess: ([c, acc]) => {
        this.seed = acc
        return this.sink.onSuccess(c)
      }
    })
  }
}

export const filterMapLoopEffect: {
  <B, A, E2, R2, C>(seed: B, f: (acc: B, a: A) => Effect.Effect<readonly [Option.Option<C>, B], E2, R2>): <E, R>(
    sink: Sink<C, E, R>
  ) => Sink<A, E | E2, R | R2>
  <A, E, R, B, R2, C>(
    sink: Sink<C, E, R>,
    seed: B,
    f: (acc: B, a: A) => Effect.Effect<readonly [Option.Option<C>, B], E, R2>
  ): Sink<A, E, R | R2>
} = dual(3, function filterMapLoopEffect<A, E, R, B, R2, C>(
  sink: Sink<C, E, R>,
  seed: B,
  f: (acc: B, a: A) => Effect.Effect<readonly [Option.Option<C>, B], E, R2>
): Sink<A, E, R | R2> {
  return new FilterMapLoopEffectSink(sink, seed, f)
})

class FilterMapLoopEffectSink<A, E, R, B, R2, C> implements Sink<A, E, R | R2> {
  readonly sink: Sink<C, E, R>
  private seed: B
  readonly f: (acc: B, a: A) => Effect.Effect<readonly [Option.Option<C>, B], E, R2>

  constructor(
    sink: Sink<C, E, R>,
    seed: B,
    f: (acc: B, a: A) => Effect.Effect<readonly [Option.Option<C>, B], E, R2>
  ) {
    this.sink = sink
    this.seed = seed
    this.f = f
    this.onFailure = this.onFailure.bind(this)
    this.onSuccess = this.onSuccess.bind(this)
  }

  onFailure(cause: Cause.Cause<E>): Effect.Effect<unknown, never, R> {
    return this.sink.onFailure(cause)
  }

  onSuccess(value: A) {
    return Effect.matchCauseEffect(this.f(this.seed, value), {
      onFailure: (cause) => this.sink.onFailure(cause),
      onSuccess: ([option, acc]) => {
        this.seed = acc
        if (Option.isSome(option)) return this.sink.onSuccess(option.value)
        return Effect.void
      }
    })
  }
}

export const loopCauseEffect: {
  <B, A, E2, R2, C>(
    seed: B,
    f: (acc: B, a: Cause.Cause<A>) => Effect.Effect<readonly [Cause.Cause<C>, B], E2, R2>
  ): <E, R>(
    sink: Sink<A, E | C, R>
  ) => Sink<A, E, R>
  <A, E, R, B, C>(
    sink: Sink<A, E | C, R>,
    seed: B,
    f: (acc: B, a: Cause.Cause<E>) => Effect.Effect<readonly [Cause.Cause<C>, B], E, R>
  ): Sink<A, E, R>
} = dual(3, function loopCauseEffect<A, E, R, B, C>(
  sink: Sink<A, E | C, R>,
  seed: B,
  f: (acc: B, a: Cause.Cause<E>) => Effect.Effect<readonly [Cause.Cause<C>, B], E, R>
): Sink<A, E, R> {
  return new LoopCauseEffectSink(sink, seed, f)
})

class LoopCauseEffectSink<A, E, R, B, C> implements Sink<A, E, R> {
  readonly sink: Sink<A, E | C, R>
  private seed: B
  readonly f: (acc: B, a: Cause.Cause<E>) => Effect.Effect<readonly [Cause.Cause<C>, B], E, R>

  constructor(
    sink: Sink<A, E | C, R>,
    seed: B,
    f: (acc: B, a: Cause.Cause<E>) => Effect.Effect<readonly [Cause.Cause<C>, B], E, R>
  ) {
    this.sink = sink
    this.seed = seed
    this.f = f
    this.onFailure = this.onFailure.bind(this)
    this.onSuccess = this.onSuccess.bind(this)
  }

  onFailure(cause: Cause.Cause<E>): Effect.Effect<unknown, never, R> {
    return Effect.matchCauseEffect(this.f(this.seed, cause), {
      onFailure: (cause2) => this.sink.onFailure(Cause.fromFailures([...cause.failures, ...cause2.failures])),
      onSuccess: ([c, acc]) => {
        this.seed = acc
        return this.sink.onFailure(c)
      }
    })
  }

  onSuccess(value: A) {
    return this.sink.onSuccess(value)
  }
}

export function filterMapLoopCauseEffect<A, E, R, B, E2, R2, C>(
  sink: Sink<A, E2 | C, R>,
  seed: B,
  f: (acc: B, a: Cause.Cause<E>) => Effect.Effect<readonly [Option.Option<Cause.Cause<C>>, B], E2, R2>
): Sink<A, E, R | R2> {
  return new FilterMapLoopCauseEffectSink(sink, seed, f)
}

class FilterMapLoopCauseEffectSink<A, E, R, B, E2, R2, C> implements Sink<A, E, R | R2> {
  readonly sink: Sink<A, E2 | C, R>
  private seed: B
  readonly f: (acc: B, a: Cause.Cause<E>) => Effect.Effect<readonly [Option.Option<Cause.Cause<C>>, B], E2, R2>

  constructor(
    sink: Sink<A, E2 | C, R>,
    seed: B,
    f: (acc: B, a: Cause.Cause<E>) => Effect.Effect<readonly [Option.Option<Cause.Cause<C>>, B], E2, R2>
  ) {
    this.sink = sink
    this.seed = seed
    this.f = f
    this.onFailure = this.onFailure.bind(this)
    this.onSuccess = this.onSuccess.bind(this)
  }

  onFailure(cause: Cause.Cause<E>): Effect.Effect<unknown, never, R | R2> {
    return Effect.matchCauseEffect(this.f(this.seed, cause), {
      onFailure: (cause2) => this.sink.onFailure(cause2),
      onSuccess: ([option, acc]) => {
        this.seed = acc
        if (Option.isSome(option)) return this.sink.onFailure(option.value)
        return Effect.void
      }
    })
  }

  onSuccess(value: A) {
    return this.sink.onSuccess(value)
  }
}

export interface Bounds {
  readonly skip: number
  readonly take: number
}

export const slice: {
  <A, E, R, R2>(bounds: Bounds, f: (sink: Sink<A, E, R>) => Effect.Effect<unknown, never, R2>): (
    sink: Sink<A, E, R>
  ) => Effect.Effect<void, never, R | R2>
  <A, E, R, R2>(
    sink: Sink<A, E, R>,
    bounds: Bounds,
    f: (sink: Sink<A, E, R>) => Effect.Effect<unknown, never, R2>
  ): Effect.Effect<void, never, R | R2>
} = dual(3, function slice<A, E, R, R2>(
  sink: Sink<A, E, R>,
  bounds: Bounds,
  f: (sink: Sink<A, E, R>) => Effect.Effect<unknown, never, R2>
): Effect.Effect<void, never, R | R2> {
  return withEarlyExit(sink, (s) => f(new SliceSink(s, bounds)))
})

class SliceSink<A, E, R> implements Sink<A, E, R> {
  private drop: number
  private take: number

  readonly sink: Sink.WithEarlyExit<A, E, R>
  readonly bounds: Bounds

  constructor(
    sink: Sink.WithEarlyExit<A, E, R>,
    bounds: Bounds
  ) {
    this.sink = sink
    this.bounds = bounds
    this.drop = this.bounds.skip
    this.take = this.bounds.take

    this.onFailure = this.onFailure.bind(this)
    this.onSuccess = this.onSuccess.bind(this)
  }

  onFailure(cause: Cause.Cause<E>): Effect.Effect<unknown, never, R> {
    return this.sink.onFailure(cause)
  }

  onSuccess(value: A) {
    if (this.drop > 0) {
      this.drop--
      return Effect.void
    }
    if (this.take-- > 0) {
      return Effect.tap(this.sink.onSuccess(value), () => this.take === 0 ? this.sink.earlyExit : Effect.void)
    }
    return this.sink.earlyExit
  }
}

export const mapEffect: {
  <B, A, E2, R2>(f: (b: B) => Effect.Effect<A, E2, R2>): <E, R>(
    sink: Sink<A, E | E2, R>
  ) => Sink<B, E | E2, R | R2>
  <A, E, R, B, E2, R2>(sink: Sink<A, E | E2, R>, f: (b: B) => Effect.Effect<A, E2, R2>): Sink<B, E | E2, R | R2>
} = dual(2, function mapEffect<A, E, R, B, E2, R2>(
  sink: Sink<A, E | E2, R>,
  f: (b: B) => Effect.Effect<A, E2, R2>
): Sink<B, E | E2, R | R2> {
  return new MapEffectSink(sink, f)
})

class MapEffectSink<A, E, R, B, E2, R2> implements Sink<B, E | E2, R | R2> {
  readonly sink: Sink<A, E | E2, R>
  readonly f: (b: B) => Effect.Effect<A, E2, R2>
  constructor(
    sink: Sink<A, E | E2, R>,
    f: (b: B) => Effect.Effect<A, E2, R2>
  ) {
    this.sink = sink
    this.f = f
    this.onFailure = this.onFailure.bind(this)
    this.onSuccess = this.onSuccess.bind(this)
  }

  onFailure(cause: Cause.Cause<E | E2>): Effect.Effect<unknown, never, R | R2> {
    return this.sink.onFailure(cause)
  }

  onSuccess(value: B) {
    return Effect.matchCauseEffect(this.f(value), this.sink)
  }
}

export const filterMapEffect: {
  <B, A, E2, R2>(f: (b: B) => Effect.Effect<Option.Option<A>, E2, R2>): <E, R>(
    sink: Sink<A, E | E2, R>
  ) => Sink<B, E | E2, R | R2>

  <A, E, R, B, E2, R2>(
    sink: Sink<A, E | E2, R>,
    f: (b: B) => Effect.Effect<Option.Option<A>, E2, R2>
  ): Sink<B, E | E2, R | R2>
} = dual(2, function filterMapEffect<A, E, R, B, E2, R2>(
  sink: Sink<A, E | E2, R>,
  f: (b: B) => Effect.Effect<Option.Option<A>, E2, R2>
): Sink<B, E | E2, R | R2> {
  return new FilterMapEffectSink(sink, f)
})

class FilterMapEffectSink<A, E, R, B, E2, R2> implements Sink<B, E | E2, R | R2> {
  readonly sink: Sink<A, E | E2, R>
  readonly f: (b: B) => Effect.Effect<Option.Option<A>, E2, R2>
  constructor(
    sink: Sink<A, E | E2, R>,
    f: (b: B) => Effect.Effect<Option.Option<A>, E2, R2>
  ) {
    this.sink = sink
    this.f = f
    this.onFailure = this.onFailure.bind(this)
    this.onSuccess = this.onSuccess.bind(this)
  }

  onFailure(cause: Cause.Cause<E | E2>): Effect.Effect<unknown, never, R | R2> {
    return this.sink.onFailure(cause)
  }

  onSuccess(value: B) {
    return Effect.matchCauseEffect(this.f(value), {
      onFailure: (cause) => this.sink.onFailure(cause),
      onSuccess: (option) => {
        if (Option.isSome(option)) return this.sink.onSuccess(option.value)
        else return Effect.void
      }
    })
  }
}

export const filterEffect: {
  <A, E2, R2>(f: (a: A) => Effect.Effect<boolean, E2, R2>): <E, R>(
    sink: Sink<A, E | E2, R>
  ) => Sink<A, E | E2, R | R2>
  <A, E, R>(sink: Sink<A, E, R>, f: (a: A) => Effect.Effect<boolean, E, R>): Sink<A, E, R>
} = dual(2, function filterEffect<A, E, R, R2>(
  sink: Sink<A, E, R>,
  f: (a: A) => Effect.Effect<boolean, E, R2>
): Sink<A, E, R | R2> {
  return new FilterEffectSink<A, E, R | R2>(sink, f)
})

class FilterEffectSink<A, E, R> implements Sink<A, E, R> {
  readonly sink: Sink<A, E, R>
  readonly f: (a: A) => Effect.Effect<boolean, E, R>
  constructor(
    sink: Sink<A, E, R>,
    f: (a: A) => Effect.Effect<boolean, E, R>
  ) {
    this.sink = sink
    this.f = f
    this.onFailure = this.onFailure.bind(this)
    this.onSuccess = this.onSuccess.bind(this)
  }

  onFailure(cause: Cause.Cause<E>): Effect.Effect<unknown, never, R> {
    return this.sink.onFailure(cause)
  }

  onSuccess(value: A) {
    return Effect.matchCauseEffect(this.f(value), {
      onFailure: (cause) => this.sink.onFailure(cause),
      onSuccess: (b) => {
        if (b) return this.sink.onSuccess(value)
        else return Effect.void
      }
    })
  }
}

export const tapEffect: {
  <A, E2, R2>(f: (a: A) => Effect.Effect<unknown, E2, R2>): <E, R>(
    sink: Sink<A, E | E2, R>
  ) => Sink<A, E | E2, R | R2>
  <A, E, R, E2, R2>(sink: Sink<A, E | E2, R>, f: (a: A) => Effect.Effect<unknown, E2, R2>): Sink<A, E | E2, R | R2>
} = dual(2, function tapEffect<A, E, R, E2, R2>(
  sink: Sink<A, E | E2, R>,
  f: (a: A) => Effect.Effect<unknown, E2, R2>
): Sink<A, E | E2, R | R2> {
  return new TapEffectSink(sink, f)
})

class TapEffectSink<A, E, R, E2, R2> implements Sink<A, E, R | R2> {
  readonly sink: Sink<A, E | E2, R>
  readonly f: (a: A) => Effect.Effect<unknown, E2, R2>

  constructor(
    sink: Sink<A, E | E2, R>,
    f: (a: A) => Effect.Effect<unknown, E2, R2>
  ) {
    this.sink = sink
    this.f = f
    this.onFailure = this.onFailure.bind(this)
    this.onSuccess = this.onSuccess.bind(this)
  }

  onFailure(cause: Cause.Cause<E>): Effect.Effect<unknown, never, R | R2> {
    return this.sink.onFailure(cause)
  }

  onSuccess(value: A) {
    return Effect.matchCauseEffect(this.f(value), {
      onFailure: (cause) => this.sink.onFailure(cause),
      onSuccess: () => this.sink.onSuccess(value)
    })
  }
}

export const flip = <A, E, R>(sink: Sink<A, E, R>): Sink<E, A, R> => new FlipSink(sink)

class FlipSink<A, E, R> implements Sink<E, A, R> {
  readonly sink: Sink<A, E, R>
  constructor(sink: Sink<A, E, R>) {
    this.sink = sink
  }

  onSuccess(value: E) {
    return this.sink.onFailure(Cause.fail(value))
  }

  onFailure(cause: Cause.Cause<A>) {
    const fail = cause.failures.find((failure) => failure._tag === "Fail")
    if (!fail) return this.sink.onFailure(cause as Cause.Cause<never>)
    return this.sink.onSuccess(fail.error)
  }
}

export const exit = <A, E, R>(sink: Sink<Exit.Exit<A, E>, never, R>) => new ExitSink(sink)

class ExitSink<A, E, R> implements Sink<A, E, R> {
  readonly sink: Sink<Exit.Exit<A, E>, never, R>
  constructor(sink: Sink<Exit.Exit<A, E>, never, R>) {
    this.sink = sink
  }

  onSuccess(value: A) {
    return this.sink.onSuccess(Exit.succeed(value))
  }

  onFailure(cause: Cause.Cause<E>) {
    return this.sink.onSuccess(Exit.failCause(cause))
  }
}
