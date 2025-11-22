import * as Cause from "effect/Cause"
import { flow } from "effect/Function"
import { failCause } from "./failCause.ts"

/**
 * Creates an Fx that immediately interrupts.
 *
 * @param id - The FiberId responsible for the interruption.
 * @returns An `Fx` that is interrupted.
 * @since 1.0.0
 * @category constructors
 */
export const interrupt = /*#__PURE__*/ flow(Cause.interrupt, failCause)
