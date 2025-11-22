import type { Effect, RunOptions } from "effect/Effect"
import { fork as effectFork, runFork as effectRunFork } from "effect/Effect"
import type { Fiber } from "effect/Fiber"
import type { Fx } from "../Fx.ts"
import { drain } from "./observe.ts"

/**
 * Forks the execution of an `Fx` into a background fiber.
 * The stream will run until it completes or the fiber is interrupted.
 *
 * @param fx - The `Fx` stream to fork.
 * @param options - Configuration for the forked fiber.
 * @returns An `Effect` that produces a `Fiber`.
 * @since 1.0.0
 * @category runners
 */
export const fork = <A, E, R>(fx: Fx<A, E, R>, options?: {
  readonly startImmediately?: boolean
  readonly uninterruptible?: boolean
}): Effect<Fiber<unknown, E>, never, R> =>
  effectFork(drain(fx), {
    startImmediately: options?.startImmediately ?? true,
    uninterruptible: options?.uninterruptible ?? false
  })

/**
 * Runs an `Fx` in a new fiber, using the standard `Effect.runFork`.
 * This is useful for integrating with the top-level Effect runtime.
 *
 * @param fx - The `Fx` stream to run.
 * @param options - `RunOptions` for the execution.
 * @returns The created `Fiber`.
 * @since 1.0.0
 * @category runners
 */
export const runFork = <A, E>(fx: Fx<A, E>, options?: RunOptions): Fiber<void, E> => effectRunFork(drain(fx), options)
