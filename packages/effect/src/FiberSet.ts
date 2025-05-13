import * as Effect from "./Effect.js"
import type * as Exit from "./Exit.js"
import * as Fiber from "./Fiber.js"
import { dual, identity } from "./Function.js"
import type { Pipeable } from "./Pipeable.js"
import { pipeArguments } from "./Pipeable.js"
import * as Scope from "./Scope.js"
import * as SynchronizedRef from "./SynchronizedRef.js"
import type { Covariant } from "./Types.js"

export const TypeId = Symbol.for("effect/FiberSet")

export interface FiberSet<A, E> extends Pipeable {
  readonly [TypeId]: FiberSet.Variance<A, E>
  readonly ref: SynchronizedRef.SynchronizedRef<Set<Fiber.Fiber<A, E>>>
  readonly scope: Scope.Scope.Closeable
}

export namespace FiberSet {
  export type Variance<A, E> = {
    readonly _A: Covariant<A>
    readonly _E: Covariant<E>
  }
}

const _variance: FiberSet.Variance<any, any> = {
  _A: identity,
  _E: identity
}

class FiberSetImpl<A, E> implements FiberSet<A, E> {
  readonly [TypeId]: FiberSet.Variance<A, E> = _variance

  constructor(
    readonly ref: SynchronizedRef.SynchronizedRef<Set<Fiber.Fiber<A, E>>>,
    readonly scope: Scope.Scope.Closeable
  ) {}

  pipe() {
    return pipeArguments(this, arguments)
  }
}

const withScopedFork = <A, E, R>(
  f: (scope: Scope.Scope.Closeable) => Effect.Effect<A, E, R>
): Effect.Effect<A, E, R | Scope.Scope> =>
  Effect.gen(function*() {
    const scope = yield* Effect.scope
    const forked = yield* Scope.fork(scope, "parallel")
    return yield* f(forked)
  })

export const make = <A, E>(): Effect.Effect<FiberSet<A, E>, never, Scope.Scope> =>
  withScopedFork((scope) =>
    SynchronizedRef.make(new Set<Fiber.Fiber<A, E>>()).pipe(
      Effect.map((ref) => new FiberSetImpl(ref, scope))
    )
  )

export const add: {
  <A, E, R>(effect: Effect.Effect<A, E, R>): <A, E>(set: FiberSet<A, E>) => Effect.Effect<Fiber.Fiber<A, E>, never, R>
  <A, E, R>(set: FiberSet<A, E>, effect: Effect.Effect<A, E, R>): Effect.Effect<Fiber.Fiber<A, E>, never, R>
} = dual(
  2,
  <A, E, R>(set: FiberSet<A, E>, effect: Effect.Effect<A, E, R>): Effect.Effect<Fiber.Fiber<A, E>, never, R> =>
    set.ref.pipe(
      SynchronizedRef.modifyEffect((fibers) =>
        Effect.gen(function*() {
          const fiber = yield* Effect.forkIn(effect, set.scope)
          const newFibers = new Set(fibers)
          newFibers.add(fiber)
          return [fiber, newFibers] as const
        })
      )
    )
)

export const remove: {
  <A, E>(fiber: Fiber.Fiber<A, E>): <A, E>(set: FiberSet<A, E>) => Effect.Effect<void>
  <A, E>(set: FiberSet<A, E>, fiber: Fiber.Fiber<A, E>): Effect.Effect<void>
} = dual(2, <A, E>(set: FiberSet<A, E>, fiber: Fiber.Fiber<A, E>): Effect.Effect<void> =>
  set.ref.pipe(
    SynchronizedRef.update((fibers) => {
      const newFibers = new Set(fibers)
      newFibers.delete(fiber)
      return newFibers
    })
  ))

export const interruptAll = <A, E>(set: FiberSet<A, E>): Effect.Effect<void> =>
  set.ref.pipe(
    SynchronizedRef.get,
    Effect.flatMap(Fiber.interruptAll)
  )

export const joinAll = <A, E>(set: FiberSet<A, E>): Effect.Effect<Array<A>, E> =>
  set.ref.pipe(
    SynchronizedRef.get,
    Effect.flatMap((fibers) => Effect.forEach(fibers, (fiber) => Fiber.join(fiber), { concurrency: "unbounded" }))
  )

export const size = <A, E>(set: FiberSet<A, E>): Effect.Effect<number> =>
  set.ref.pipe(
    SynchronizedRef.get,
    Effect.map((fibers) => fibers.size)
  )

export const close: {
  <A, E>(set: FiberSet<A, E>, exit: Exit.Exit<unknown, unknown>): Effect.Effect<void, never>
  (exit: Exit.Exit<unknown, unknown>): <A, E>(set: FiberSet<A, E>) => Effect.Effect<void, never>
} = dual(
  2,
  <A, E>(set: FiberSet<A, E>, exit: Exit.Exit<unknown, unknown>): Effect.Effect<void, never> =>
    Scope.close(set.scope, exit)
)

export const run = <R>() =>
<A, E>(
  set: FiberSet<A, E>
): Effect.Effect<(effect: Effect.Effect<A, E, R>) => Effect.Effect<Fiber.Fiber<A, E>>, never, R> =>
  Effect.gen(function*() {
    const ctx = yield* Effect.context<R>()
    return (effect: Effect.Effect<A, E, R>) => add(set, effect.pipe(Effect.provide(ctx)))
  })
