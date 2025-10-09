import { schedule as schedule_Effect } from "effect/Effect"
import type { Schedule } from "effect/Schedule"
import type { Fx } from "../Fx.ts"
import { make } from "./make.ts"

export const fromSchedule = <Error, Env>(
  schedule: Schedule<unknown, unknown, Error, Env>
): Fx<void, Error, Env> => /*#__PURE__*/ make<void, Error, Env>((sink) => schedule_Effect(sink.onSuccess(), schedule))
