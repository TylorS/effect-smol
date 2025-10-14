import * as Cause from "../../../Cause.ts"
import { flow } from "../../../Function.ts"
import { failCause } from "./failCause.ts"

export const interrupt = /*#__PURE__*/ flow(Cause.interrupt, failCause)
