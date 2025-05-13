import * as Effect from "./Effect.js"
import * as Fiber from "./Fiber.js"
import { dual, flow, identity } from "./Function.js"
import type { Exit } from "./index.js"
import * as Option from "./Option.js"
import type { Pipeable } from "./Pipeable.js"
import { pipeArguments } from "./Pipeable.js"
import * as Ref from "./Ref.js"
import * as Scope from "./Scope.js"
import * as SynchronizedRef from "./SynchronizedRef.js"
import type { Covariant } from "./Types.js"

export const TypeId = Symbol.for("effect/FiberHandle")
export type TypeId = typeof TypeId

export interface FiberHandle<A, E> extends Pipeable {
  readonly [TypeId]: FiberHandle.Variance<A, E>
  readonly ref: SynchronizedRef.SynchronizedRef<Option.Option<Fiber.Fiber<A, E>>>
  readonly scope: Scope.Scope.Closeable
}

export namespace FiberHandle {
  export type Variance<A, E> = {
    readonly _A: Covariant<A>
    readonly _E: Covariant<E>
  }

  export type Strategy =
    | "drop" // When new effects are started, interrupt the previous effect
    | "slide" // When new effects are started, ignore them if there is an active effect
    | "slide-buffer" // When new effects started, if there is an active effect, buffer the new effect until the previous one completes
}

const _variance: FiberHandle.Variance<any, any> = {
  _A: identity,
  _E: identity
}

class FiberHandleImpl<A, E> implements FiberHandle<A, E> {
  readonly [TypeId]: FiberHandle.Variance<A, E> = _variance

  constructor(
    readonly ref: SynchronizedRef.SynchronizedRef<Option.Option<Fiber.Fiber<A, E>>>,
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
    const forked = yield* Scope.fork(scope, "sequential")
    return yield* f(forked)
  })

export const make = <A, E>(): Effect.Effect<FiberHandle<A, E>, never, Scope.Scope> =>
  withScopedFork((scope) =>
    SynchronizedRef.make(Option.none<Fiber.Fiber<A, E>>()).pipe(
      Effect.map((ref) => new FiberHandleImpl(ref, scope))
    )
  )

export const run = <R>(strategy: FiberHandle.Strategy) => {
  switch (strategy) {
    case "drop":
      return runDrop<R>()
    case "slide":
      return runSlide<R>()
    case "slide-buffer":
      return runSlideBuffer<R>()
  }
}

const runDrop = <R>() => <A, E>(handle: FiberHandle<A, E>) =>
  Effect.gen(function*() {
    const ctx = yield* Effect.context<R>()

    return (effect: Effect.Effect<A, E, R>): Effect.Effect<void> =>
      handle.ref.pipe(
        SynchronizedRef.modifyEffect((current) =>
          Effect.gen(function*() {
            if (Option.isSome(current)) {
              yield* Fiber.interrupt(current.value)
            }

            const cleanupFiber: Effect.Effect<Option.Option<Fiber.Fiber<A, E>>, never, never> = SynchronizedRef.update(
              handle.ref,
              Option.flatMap((f) => typeof fiber !== "undefined" && f === fiber ? Option.none() : Option.some(f))
            )

            const fiber = yield* effect.pipe(
              Effect.provide(ctx),
              Effect.onExit(() => cleanupFiber),
              Effect.forkIn(handle.scope)
            )

            return [void 0, Option.some(fiber)] as const
          })
        )
      )
  })

const runSlide = <R>() =>
  Effect.fnUntraced(function*<A, E>(handle: FiberHandle<A, E>) {
    const ctx = yield* Effect.context<R>()

    return (effect: Effect.Effect<A, E, R>) =>
      SynchronizedRef.updateEffect(handle.ref, (current) =>
        Effect.gen(function*() {
          if (Option.isSome(current)) return current

          const cleanupFiber: Effect.Effect<Option.Option<Fiber.Fiber<A, E>>> = SynchronizedRef.update(
            handle.ref,
            Option.flatMap((f) => typeof fiber !== "undefined" && f === fiber ? Option.none() : Option.some(f))
          )

          const fiber = yield* effect.pipe(
            Effect.provide(ctx),
            Effect.onExit(() => cleanupFiber),
            Effect.forkIn(handle.scope)
          )
          return Option.some(fiber)
        }))
  })

const runSlideBuffer = <R>() => <A, E>(handle: FiberHandle<A, E>) =>
  Effect.gen(function*() {
    const ctx = yield* Effect.context<R>()
    const next = yield* Ref.make<Option.Option<Effect.Effect<A, E>>>(Option.none())

    return (effect: Effect.Effect<A, E, R>) =>
      SynchronizedRef.updateEffect(handle.ref, (current) =>
        Effect.gen(function*() {
          if (Option.isSome(current)) {
            yield* Ref.set(next, Option.some(effect.pipe(Effect.provide(ctx))))
            return current
          }

          const cleanup = (fiber: Fiber.Fiber<A, E>): Effect.Effect<Option.Option<Fiber.Fiber<A, E>>> =>
            SynchronizedRef.updateEffect(
              handle.ref,
              (current) =>
                Effect.gen(function*() {
                  // First clear the current fiber from the handle
                  const cleared = Option.flatMap(current, (f) =>
                    typeof fiber !== "undefined" && f === fiber ? Option.none() : Option.some(f))
                  if (Option.isSome(cleared)) {
                    return cleared
                  }

                  // Check if there's a next effect to run
                  const nextEffect = yield* Ref.get(next)
                  if (Option.isSome(nextEffect)) {
                    // Clear the next effect
                    yield* Ref.set(next, Option.none())

                    // Fork the next effect
                    const nextFiber: Fiber.Fiber<A, E> = yield* nextEffect.value.pipe(
                      Effect.onExit(() =>
                        cleanup(nextFiber)
                      ),
                      Effect.forkIn(handle.scope)
                    )

                    // Return the new fiber
                    return Option.some(nextFiber)
                  }

                  return Option.none()
                })
            )

          const fiber: Fiber.Fiber<A, E> = yield* effect.pipe(
            Effect.provide(ctx),
            Effect.onExit(() => cleanup(fiber)),
            Effect.forkIn(handle.scope)
          )

          return Option.some(fiber)
        }))
  })

const _await = <A, E>(handle: FiberHandle<A, E>): Effect.Effect<Option.Option<A>, E> =>
  handle.ref.pipe(
    SynchronizedRef.get,
    Effect.flatMap(Option.match({
      onNone: () => Effect.succeedNone,
      onSome: flow(Fiber.join, Effect.asSome)
    }))
  )

export { _await as await }

export const close: {
  (exit: Exit.Exit<unknown, unknown>): <A, E>(handle: FiberHandle<A, E>) => Effect.Effect<void, never>
  <A, E>(handle: FiberHandle<A, E>, exit: Exit.Exit<unknown, unknown>): Effect.Effect<void, never>
} = dual(2, <A, E>(handle: FiberHandle<A, E>, exit: Exit.Exit<unknown, unknown>) => Scope.close(handle.scope, exit))

export function exists<A, E>(handle: FiberHandle<A, E>): Effect.Effect<boolean> {
  return handle.ref.pipe(
    SynchronizedRef.get,
    Effect.map(Option.isSome)
  )
}
