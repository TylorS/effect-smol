import * as Cause from "effect/Cause"
import { flow } from "effect/Function"
import { failCause } from "./failCause.ts"

/**
 * Creates an Fx from a collection of failures (errors).
 *
 * @param failures - An iterable of failures.
 * @returns An `Fx` that fails with the combined failures.
 * @since 1.0.0
 * @category constructors
 */
export const fromFailures = /*#__PURE__*/ flow(Cause.fromFailures, failCause)
