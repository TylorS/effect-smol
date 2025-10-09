import type * as Duration from "effect/Duration"
import { delay as delay_Effect } from "effect/Effect"
import { dual } from "effect/Function"
import type { Fx } from "../Fx.ts"
import { make } from "./make.ts"

export const at: {
  (delay: Duration.DurationInput): <A>(value: A) => Fx<A>
  <A>(value: A, delay: Duration.DurationInput): Fx<A>
} = /*#__PURE__*/ dual(
  2,
  <A>(value: A, delay: Duration.DurationInput): Fx<A> =>
    /*#__PURE__*/ make<A, never, never>((sink) => delay_Effect(sink.onSuccess(value), delay))
)
