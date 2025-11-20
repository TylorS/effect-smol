import type * as Duration from "effect/Duration"
import { spaced } from "effect/Schedule"
import type { Fx } from "../Fx.ts"
import { fromSchedule } from "./fromSchedule.ts"

export const periodic = (period: Duration.DurationInput): Fx<void> => /*#__PURE__*/ fromSchedule(spaced(period))
