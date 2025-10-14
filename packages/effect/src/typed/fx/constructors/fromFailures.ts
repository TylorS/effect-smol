import * as Cause from "../../../Cause.ts"
import { flow } from "../../../Function.ts"
import { failCause } from "./failCause.ts"

export const fromFailures = /*#__PURE__*/ flow(Cause.fromFailures, failCause)
