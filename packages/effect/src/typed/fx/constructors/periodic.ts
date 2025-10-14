import type * as Duration from "../../../Duration.ts"
import { spaced } from "../../../Schedule.ts"
import type { Fx } from "../Fx.ts"
import { fromSchedule } from "./fromSchedule.ts"

export const periodic = (period: Duration.DurationInput): Fx<void> => /*#__PURE__*/ fromSchedule(spaced(period))
