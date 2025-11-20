import * as Cause from "effect/Cause"
import { flow } from "effect/Function"
import type { Fx } from "../Fx.ts"
import { failCause } from "./failCause.ts"

export const die: (defect: unknown) => Fx<never, never, never> = /*#__PURE__*/ flow(Cause.die, failCause)
