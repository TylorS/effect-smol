import * as Cause from "effect/Cause"
import { flow } from "effect/Function"
import type { Fx } from "../Fx.ts"
import { failCause } from "./failCause.ts"

export const fail: <E>(error: E) => Fx<never, E, never> = /*#__PURE__*/ flow(Cause.fail, failCause)
