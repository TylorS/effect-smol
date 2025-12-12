import * as Cause from "../../../../Cause.ts"
import { flow } from "../../../../Function.ts"
import type { Fx } from "../Fx.ts"
import { failCause } from "./failCause.ts"

/**
 * Creates an Fx that immediately terminates with a defect (unexpected error).
 *
 * @param defect - The defect value.
 * @returns An `Fx` that dies immediately.
 * @since 1.0.0
 * @category constructors
 */
export const die: (defect: unknown) => Fx<never, never, never> = /*#__PURE__*/ flow(Cause.die, failCause)
