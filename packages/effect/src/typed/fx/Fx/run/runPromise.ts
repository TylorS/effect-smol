import type { RunOptions } from "effect/Effect"
import * as Effect from "effect/Effect"
import type * as Exit from "effect/Exit"
import type { Fx } from "../Fx.ts"
import { drain } from "./observe.ts"

/**
 * Runs an `Fx` stream to completion and returns a Promise of the Exit.
 *
 * @param fx - The `Fx` stream to run.
 * @param options - `RunOptions` for execution.
 * @returns A Promise resolving to the `Exit` of the execution.
 * @since 1.0.0
 * @category runners
 */
export const runPromiseExit = <A, E>(
  fx: Fx<A, E>,
  options?: RunOptions
): Promise<Exit.Exit<void, E>> => Effect.runPromiseExit(drain(fx), options)

/**
 * Runs an `Fx` stream to completion and returns a Promise.
 * Rejects if the stream fails.
 *
 * @param fx - The `Fx` stream to run.
 * @param options - `RunOptions` for execution.
 * @returns A Promise that resolves when the stream completes.
 * @since 1.0.0
 * @category runners
 */
export const runPromise = <A, E>(
  fx: Fx<A, E>,
  options?: RunOptions
): Promise<unknown> => Effect.runPromise(drain(fx), options)
