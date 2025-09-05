import * as Effect from "effect/Effect"
import type * as Fiber from "effect/Fiber"
import * as Scope from "effect/Scope"

export type ExecutionStrategy = "sequential" | "parallel"

export const withScope = <A, E, R>(
  f: (scope: Scope.Scope.Closeable) => Effect.Effect<A, E, R>,
  executionStrategy?: ExecutionStrategy
): Effect.Effect<A, E, R | Scope.Scope> =>
  Effect.acquireUseRelease(Effect.scopedWith((scope) => Scope.fork(scope, executionStrategy)), f, Scope.close)

export type ForkOptions = {
  readonly startImmediately?: boolean
  readonly uninterruptible?: boolean | "inherit"
}

export type Fork = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  options?: ForkOptions
) => Effect.Effect<Fiber.Fiber<A, E>, never, R>

export const withScopedFork = <A, E, R>(
  f: (fork: Fork) => Effect.Effect<A, E, R>,
  executionStrategy?: ExecutionStrategy
): Effect.Effect<A, E, R | Scope.Scope> =>
  withScope((scope) =>
    f((effect) =>
      Effect.forkIn(effect, scope, {
        startImmediately: true,
        uninterruptible: false
      })
    ), executionStrategy)

// export type FxFork = <R>(
//   effect: Effect.Effect<void, never, R>
// ) => Effect.Effect<void, never, R>

// export function withSwitchFork<A, E, R>(
//   f: (fork: FxFork, scope: Scope.Scope.Closeable) => Effect.Effect<A, E, R>,
//   executionStrategy: ExecutionStrategy
// ) {
//   return withScopedFork(
//     (fork, scope) =>
//       Effect.flatMap(
//         SynchronizedRef.make<Fiber.Fiber<unknown>>(Fiber.void),
//         (ref) => runSwitchFork(ref, fork, scope, f)
//       ),
//     executionStrategy
//   )
// }

// export function runSwitchFork<A, E, R>(
//   ref: SynchronizedRef.SynchronizedRef<Fiber.Fiber<unknown>>,
//   fork: ScopedFork,
//   scope: Scope.CloseableScope,
//   f: (fork: FxFork, scope: Scope.CloseableScope) => Effect.Effect<A, E, R>
// ) {
//   return Effect.zipRight(
//     f(
//       (effect) =>
//         SynchronizedRef.updateEffect(
//           ref,
//           (fiber) =>
//             Effect.zipRight(
//               Fiber.interrupt(fiber),
//               fork(effect)
//             )
//         ),
//       scope
//     ),
//     Effect.flatMap(SynchronizedRef.get(ref), Fiber.join)
//   )
// }
