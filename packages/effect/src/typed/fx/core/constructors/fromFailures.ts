import * as Cause from "effect/Cause"
import { flow } from "effect/Function"
import { failCause } from "./failCause.ts"

export const fromFailures = /*#__PURE__*/ flow(Cause.fromFailures, failCause)
