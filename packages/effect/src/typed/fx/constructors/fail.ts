import * as Cause from "../../../Cause.ts"
import { flow } from "../../../Function.ts"
import type { Fx } from "../Fx.ts"
import { failCause } from "./failCause.ts"

export const fail: <E>(error: E) => Fx<never, E, never> = /*#__PURE__*/ flow(Cause.fail, failCause)
