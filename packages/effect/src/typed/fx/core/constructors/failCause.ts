import type * as Cause from "effect/Cause"
import type { Fx } from "../Fx.ts"
import { make } from "./make.ts"

/**
 * Creates an Fx that immediately terminates with the specified Cause.
 *
 * @param cause - The cause of failure.
 * @returns An `Fx` that terminates with the given cause.
 * @since 1.0.0
 * @category constructors
 */
export const failCause = <E>(cause: Cause.Cause<E>): Fx<never, E, never> =>
  /*#__PURE__*/ make<never, E, never>((sink) => sink.onFailure(cause))
