import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import type { Scheduler } from "effect/Scheduler"
import * as Scope from "effect/Scope"

export type ExecutionStrategy = "sequential" | "parallel"

export const withCloseableScope = <A, E, R>(
  f: (scope: Scope.Closeable) => Effect.Effect<A, E, R>,
  executionStrategy?: ExecutionStrategy
): Effect.Effect<A, E, R | Scope.Scope> =>
  Effect.scopedWith((scope) => Effect.flatMap(Scope.fork(scope, executionStrategy), f))

export const extendScope = <A, E, R>(
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R | Scope.Scope> =>
  withCloseableScope(
    (scope) => Scope.provide(effect.pipe(Effect.onExit((exit) => Scope.close(scope, exit))), scope),
    "sequential"
  )

export const withExtendedScope = <A, E, R>(
  f: (scope: Scope.Closeable) => Effect.Effect<A, E, R>,
  executionStrategy?: ExecutionStrategy
): Effect.Effect<A, E, R | Scope.Scope> =>
  withCloseableScope(
    (scope) => Scope.provide(f(scope).pipe(Effect.onExit((exit) => Scope.close(scope, exit))), scope),
    executionStrategy
  )

export type Fork = <A, E, R>(
  effect: Effect.Effect<A, E, R>
) => Effect.Effect<Fiber.Fiber<A, E>, never, R>

export const withScopedFork = <A, E, R>(
  f: (fork: Fork, scope: Scope.Closeable) => Effect.Effect<A, E, R>,
  executionStrategy?: ExecutionStrategy
): Effect.Effect<A, E, R | Scope.Scope> =>
  withExtendedScope(
    (scope) => f((eff) => Effect.forkIn(eff, scope, { uninterruptible: false, startImmediately: false }), scope),
    executionStrategy
  )

export function awaitScopeClose(scope: Scope.Scope) {
  return Effect.callback<unknown, never, never>(function(this: Scheduler, cb) {
    return Fiber.interrupt(
      Effect.runFork(Scope.addFinalizerExit(scope, () => Effect.sync(() => cb(Effect.void))), { scheduler: this })
    )
  })
}
