import * as Cause from "effect/Cause"
import { flow } from "effect/Function"
import { failCause } from "./failCause.ts"

export const interrupt = /*#__PURE__*/ flow(Cause.interrupt, failCause)
