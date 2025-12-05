import type * as Duration from "../../../../Duration.ts"
import { spaced } from "../../../../Schedule.ts"
import type { Fx } from "../Fx.ts"
import { fromSchedule } from "./fromSchedule.ts"

/**
 * Creates an Fx that emits a `void` value periodically.
 *
 * @param period - The duration between emissions.
 * @returns An `Fx` that emits repeatedly.
 * @since 1.0.0
 * @category constructors
 */
export const periodic = (period: Duration.DurationInput): Fx<void> => /*#__PURE__*/ fromSchedule(spaced(period))
