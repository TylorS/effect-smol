import { schedule as schedule_Effect } from "effect/Effect"
import type { Schedule } from "effect/Schedule"
import type { Fx } from "../Fx.ts"
import { make } from "./make.ts"

/**
 * Creates an Fx that emits values according to a Schedule.
 * The Fx emits `void` each time the schedule fires.
 *
 * @param schedule - The schedule to follow.
 * @returns An `Fx` that emits periodically according to the schedule.
 * @since 1.0.0
 * @category constructors
 */
export const fromSchedule = <Error, Env>(
  schedule: Schedule<unknown, unknown, Error, Env>
): Fx<void, Error, Env> => /*#__PURE__*/ make<void, Error, Env>((sink) => schedule_Effect(sink.onSuccess(), schedule))
