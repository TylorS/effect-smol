import * as Cause from "./Cause.js"
import * as Deferred from "./Deferred.js"
import type * as Duration from "./Duration.js"
import * as Effect from "./Effect.js"
import { Fiber } from "./Fiber.js"
import * as FiberHandle from "./FiberHandle.js"
import * as FiberSet from "./FiberSet.js"
import type { LazyArg } from "./Function.js"
import { constVoid, dual, flow, identity } from "./Function.js"
import * as Option from "./Option.js"
import type { Pipeable } from "./Pipeable.js"
import { pipeArguments } from "./Pipeable.js"
import * as PushSink from "./PushSink.js"
import type * as Scope from "./Scope.js"
import type { Covariant } from "./Types.js"

export const TypeId = Symbol.for("effect/Push")
export type TypeId = typeof TypeId

export interface Push<A, E = never, R = never> extends Pipeable {
  readonly [TypeId]: Push.Variance<A, E, R>
  readonly run: (sink: PushSink.PushSink<A, E>) => Effect.Effect<unknown, never, R>
}

export namespace Push {
  export type Variance<A, E, R> = {
    readonly _A: Covariant<A>
    readonly _E: Covariant<E>
    readonly _R: Covariant<R>
  }
}

const _variance: Push.Variance<any, any, any> = {
  _A: identity,
  _E: identity,
  _R: identity
}

abstract class PushImpl<A = never, E = never, R = never> implements Push<A, E, R> {
  abstract run(sink: PushSink.PushSink<A, E>): Effect.Effect<unknown, never, R>

  readonly [TypeId]: Push.Variance<A, E, R> = _variance
  pipe() {
    return pipeArguments(this, arguments)
  }
}

class PushSucceed<A> extends PushImpl<A> {
  constructor(readonly value: A) {
    super()
  }

  run<R2>(sink: PushSink.PushSink<A, never, R2>): Effect.Effect<unknown, never, R2> {
    return sink.onSuccess(this.value)
  }
}

export const succeed = <A>(value: A): Push<A> => new PushSucceed(value)

export const succeedNone: Push<Option.Option<never>> = new PushSucceed(Option.none())

export const succeedSome = <A>(value: A): Push<Option.Option<A>> => new PushSucceed(Option.some(value))

class PushSuspend<A, E, R> extends PushImpl<A, E, R> {
  constructor(readonly lazy: LazyArg<Push<A, E, R>>) {
    super()
  }

  run(sink: PushSink.PushSink<A, E>): Effect.Effect<unknown, never, R> {
    return Effect.suspend(() => this.lazy().run(sink))
  }
}

export const suspend = <A, E, R>(lazy: LazyArg<Push<A, E, R>>): Push<A, E, R> => new PushSuspend(lazy)

class PushSync<A> extends PushImpl<A> {
  constructor(readonly value: () => A) {
    super()
  }

  run<R2>(sink: PushSink.PushSink<A, never, R2>): Effect.Effect<unknown, never, R2> {
    return Effect.suspend(() => sink.onSuccess(this.value()))
  }
}

export const sync = <A>(value: () => A): Push<A> => new PushSync(value)

const _void: Push<void> = new PushSync(constVoid)
export {
  /**
   * @since 2.0.0
   * @category Creating Push
   */
  _void as void
}

class PushMake<A, E, R> extends PushImpl<A, E, R> {
  constructor(readonly run: (sink: PushSink.PushSink<A, E>) => Effect.Effect<unknown, never, R>) {
    super()
  }
}

export const make = <A = never, E = never, R = never>(
  run: (sink: PushSink.PushSink<A, E>) => Effect.Effect<unknown, never, R>
): Push<A, E, R> => new PushMake(run)

export const never = make(() => Effect.never)

class PushFailCause<E> extends PushImpl<never, E> {
  constructor(readonly cause: Cause.Cause<E>) {
    super()
  }

  run<R2>(sink: PushSink.PushSink<never, E, R2>): Effect.Effect<unknown, never, R2> {
    return sink.onFailure(this.cause)
  }
}

export const failCause = <E>(cause: Cause.Cause<E>): Push<never, E> => new PushFailCause(cause)

export const fail = <E>(error: E): Push<never, E> => failCause(Cause.fail(error))

export const die = <E = never>(defect: unknown): Push<never, E> => failCause(Cause.die(defect))

export const interrupt = (fiberId: number): Push<never> => failCause(Cause.interrupt(fiberId))

export const fromFailures = <E>(failures: ReadonlyArray<Cause.Failure<E>>): Push<never, E> =>
  failCause(Cause.fromFailures(failures))

class PushFromEffect<A, E, R> extends PushImpl<A, E, R> {
  constructor(readonly effect: Effect.Effect<A, E, R>) {
    super()
  }

  run<R2>(sink: PushSink.PushSink<A, E, R2>): Effect.Effect<unknown, never, R | R2> {
    return Effect.matchCauseEffect(this.effect, sink)
  }
}

export const fromEffect = <A, E, R>(effect: Effect.Effect<A, E, R>): Push<A, E, R> => new PushFromEffect(effect)

export const callback = flow(Effect.callback, fromEffect)
export const promise = flow(Effect.promise, fromEffect)
export const tryPromise = flow(Effect.tryPromise, fromEffect)
export const withFiber = flow(Effect.withFiber, fromEffect)

export function unwrap<A, E, R, E2, R2>(effect: Effect.Effect<Push<A, E, R>, E2, R2>): Push<A, E | E2, R | R2> {
  return make((sink) =>
    Effect.matchCauseEffect(effect, {
      onFailure: sink.onFailure,
      onSuccess: (push) => push.run(sink)
    })
  )
}

export function scoped<A, E, R>(push: Push<A, E, R>): Push<A, E, Exclude<R, Scope.Scope>> {
  return make((sink) => Effect.scoped(push.run(sink)))
}

export function unwrapScoped<A, E, R, E2, R2>(
  effect: Effect.Effect<Push<A, E, R>, E2, R2>
): Push<A, E | E2, Exclude<R | R2, Scope.Scope>> {
  return make((sink) =>
    Effect.scoped(Effect.matchCauseEffect(effect, {
      onFailure: sink.onFailure,
      onSuccess: (push) => push.run(sink)
    }))
  )
}

export function flatMap<A, E, R, B, E2, R2>(
  push: Push<A, E, R>,
  f: (a: A) => Push<B, E2, R2>
): Push<B, E | E2, R | R2 | Scope.Scope> {
  return make(Effect.fnUntraced(function* (sink) {
    const set = yield* FiberSet.make<void, never>()
    const run = yield* FiberSet.run<R | R2>()(set)

    yield* push.run(PushSink.make({
      onFailure: sink.onFailure,
      onSuccess: (a: A) => run(f(a).run(sink))
    }))

    return yield* FiberSet.joinAll(set)
  }))
}

const withFiberHandle = (strategy: FiberHandle.FiberHandle.Strategy): {
  <A, E, R, B, E2, R2>(
    push: Push<A, E, R>,
    f: (a: A) => Push<B, E2, R2>
  ): Push<B, E | E2, R | R2 | Scope.Scope>

  <A, B, E2, R2>(
    f: (a: A) => Push<B, E2, R2>
  ): <E, R>(push: Push<A, E, R>) => Push<B, E | E2, R | R2 | Scope.Scope>
} =>
  dual(2, <A, E, R, B, E2, R2>(
    push: Push<A, E, R>,
    f: (a: A) => Push<B, E2, R2>
  ): Push<B, E | E2, R | R2 | Scope.Scope> =>
    make(Effect.fnUntraced(function* (sink) {
      const handle = yield* FiberHandle.make<void, never>()
      const run = yield* FiberHandle.run<R | R2>(strategy)(handle)

      yield* push.run(PushSink.make({
        onFailure: sink.onFailure,
        onSuccess: (a) => run(f(a).run(sink))
      }))

      return yield* FiberHandle.await(handle)
    })))

export const switchMap = withFiberHandle("drop")
export const exhaustMap = withFiberHandle("slide")
export const exhaustMapLatest = withFiberHandle("slide-buffer")

export const debounce: {
  (duration: Duration.DurationInput): <A, E, R>(push: Push<A, E, R>) => Push<A, E, R | Scope.Scope>
  <A, E, R>(push: Push<A, E, R>, duration: Duration.DurationInput): Push<A, E, R | Scope.Scope>
} = dual(
  2,
  <A, E, R>(push: Push<A, E, R>, duration: Duration.DurationInput): Push<A, E, R | Scope.Scope> =>
    switchMap(push, (a) => make((sink) => Effect.delay(sink.onSuccess(a), duration)))
)

export const throttle: {
  (duration: Duration.DurationInput): <A, E, R>(push: Push<A, E, R>) => Push<A, E, R | Scope.Scope>
  <A, E, R>(push: Push<A, E, R>, duration: Duration.DurationInput): Push<A, E, R | Scope.Scope>
} = dual(
  2,
  <A, E, R>(push: Push<A, E, R>, duration: Duration.DurationInput): Push<A, E, R | Scope.Scope> =>
    exhaustMap(push, (a) => make((sink) => Effect.tap(sink.onSuccess(a), () => Effect.sleep(duration))))
)

class Filter<A, E, R> extends PushImpl<A, E, R> {
  constructor(readonly push: Push<A, E, R>, readonly f: (a: A) => boolean) {
    super()
  }

  run(sink: PushSink.PushSink<A, E>): Effect.Effect<unknown, never, R> {
    return this.push.run(PushSink.filter(sink, this.f))
  }
}

export const filter: {
  <A>(f: (a: A) => boolean): <E, R>(push: Push<A, E, R>) => Push<A, E, R>
  <A, E, R>(push: Push<A, E, R>, f: (a: A) => boolean): Push<A, E, R>
} = dual(2, <A, E, R>(push: Push<A, E, R>, f: (a: A) => boolean): Push<A, E, R> => new Filter(push, f))

class Map<A, E, R, B> extends PushImpl<B, E, R> {
  constructor(readonly push: Push<A, E, R>, readonly f: (a: A) => B) {
    super()
  }

  run(sink: PushSink.PushSink<B, E>): Effect.Effect<unknown, never, R> {
    return this.push.run(PushSink.map(sink, this.f))
  }
}

export const map: {
  <A, B>(f: (a: A) => B): <E, R>(push: Push<A, E, R>) => Push<B, E, R>
  <A, E, R, B>(push: Push<A, E, R>, f: (a: A) => B): Push<B, E, R>
} = dual(2, <A, E, R, B>(push: Push<A, E, R>, f: (a: A) => B): Push<B, E, R> => new Map(push, f))

class MapErrorCause<A, E, R, F> extends PushImpl<A, F, R> {
  constructor(readonly push: Push<A, E, R>, readonly f: (cause: Cause.Cause<E>) => Cause.Cause<F>) {
    super()
  }

  run(sink: PushSink.PushSink<A, F>): Effect.Effect<unknown, never, R> {
    return this.push.run(PushSink.mapErrorCause(sink, this.f))
  }
}

export const mapErrorCause: {
  <A, E, R, F>(push: Push<A, E, R>, f: (cause: Cause.Cause<E>) => Cause.Cause<F>): Push<A, F, R>
  <E, F>(f: (cause: Cause.Cause<E>) => Cause.Cause<F>): <A, R>(push: Push<A, E, R>) => Push<A, F, R>
} = dual(
  2,
  <A, E, R, F>(push: Push<A, E, R>, f: (cause: Cause.Cause<E>) => Cause.Cause<F>): Push<A, F, R> =>
    new MapErrorCause(push, f)
)

export const mapError: {
  <A, E, R, F>(push: Push<A, E, R>, f: (error: E) => F): Push<A, F, R>
  <E, F>(f: (error: E) => F): <A, R>(push: Push<A, E, R>) => Push<A, F, R>
} = dual(2, <A, E, R, F>(push: Push<A, E, R>, f: (error: E) => F): Push<A, F, R> => mapErrorCause(push, Cause.map(f)))

export class Observe<A, E = never, R = never, E2 = never, R2 = never> {
  constructor(readonly push: Push<A, E, R>, readonly onSuccess: (value: A) => Effect.Effect<unknown, E2, R2>) {
  }

  [Symbol.iterator]() {
    return this.asEffect()[Symbol.iterator]()
  }

  asEffect(): Effect.Effect<unknown, E | E2, R | R2> {
    return Effect.gen(this, function* () {
      const deferred = yield* Deferred.make<unknown, E | E2>()
      const ctx = yield* Effect.context<R | R2>()

      return yield* Effect.raceAllFirst([
        this.push.run(PushSink.make({
          onFailure: (cause) => Deferred.failCause(deferred, cause),
          onSuccess: (value) =>
            this.onSuccess(value).pipe(
              Effect.matchCauseEffect({
                onFailure: (cause) => Deferred.failCause(deferred, cause),
                onSuccess: () => Effect.void
              }),
              Effect.provide(ctx)
            )
        })),
        Deferred.await(deferred)
      ])
    })
  }

  fork(): Effect.Effect<Fiber<unknown, E | E2>, never, R | R2> {
    return Effect.fork(this.asEffect())
  }

  forkIn(scope: Scope.Scope): Effect.Effect<Fiber<unknown, E | E2>, never, R | R2> {
    return Effect.forkIn(this.asEffect(), scope)
  }

  forkScoped(): Effect.Effect<Fiber<unknown, E | E2>, never, R | R2 | Scope.Scope> {
    return Effect.forkScoped(this.asEffect())
  }
}

export const observe: {
  <A, E2, R2>(onSuccess: (value: A) => Effect.Effect<unknown, E2, R2>): <E, R>(push: Push<A, E, R>) => Observe<A, E, R, E2, R2>
  <A, E, R, E2, R2>(push: Push<A, E, R>, onSuccess: (value: A) => Effect.Effect<unknown, E2, R2>): Observe<A, E, R, E2, R2>
} = dual(2, <A, E, R, E2, R2>(push: Push<A, E, R>, onSuccess: (value: A) => Effect.Effect<unknown, E2, R2>): Observe<A, E, R, E2, R2> =>
  new Observe(push, onSuccess))

export const drain = <A, E, R>(push: Push<A, E, R>): Observe<A, E, R> => observe(push, () => Effect.void)
