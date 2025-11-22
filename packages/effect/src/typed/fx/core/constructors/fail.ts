import * as Cause from "effect/Cause"
import { flow } from "effect/Function"
import type { Fx } from "../Fx.ts"
import { failCause } from "./failCause.ts"

/**
 * Creates an Fx that immediately fails with the specified error.
 *
 * @param error - The error to fail with.
 * @returns An `Fx` that fails immediately.
 * @since 1.0.0
 * @category constructors
 */
export const fail: <E>(error: E) => Fx<never, E, never> = /*#__PURE__*/ flow(Cause.fail, failCause)
