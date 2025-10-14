import * as Cause from "../../../Cause.ts"
import { flow } from "../../../Function.ts"
import type { Fx } from "../Fx.ts"
import { failCause } from "./failCause.ts"

export const die: (defect: unknown) => Fx<never, never, never> = /*#__PURE__*/ flow(Cause.die, failCause)
