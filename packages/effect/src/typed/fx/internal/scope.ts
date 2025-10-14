import * as Effect from "../../../Effect.ts"
import type * as Fiber from "../../../Fiber.ts"
import type { Scheduler } from "../../../Scheduler.ts"
import * as Scope from "../../../Scope.ts"

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
    Effect.runFork(Scope.addFinalizerExit(scope, () => Effect.sync(() => cb(Effect.void))), { scheduler: this })
  })
}
