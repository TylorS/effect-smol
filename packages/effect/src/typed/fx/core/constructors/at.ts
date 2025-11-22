import type * as Duration from "effect/Duration"
import { flatMap, sleep } from "effect/Effect"
import { dual } from "effect/Function"
import type { Fx } from "../Fx.ts"
import { make } from "./make.ts"

/**
 * Creates an Fx that emits a single value after a specified delay.
 *
 * @param value - The value to emit.
 * @param delay - The duration to wait before emitting.
 * @returns An `Fx` that emits the value after the delay.
 * @since 1.0.0
 * @category constructors
 */
export const at: {
  (delay: Duration.DurationInput): <A>(value: A) => Fx<A>
  <A>(value: A, delay: Duration.DurationInput): Fx<A>
} = dual(
  2,
  <A>(value: A, delay: Duration.DurationInput): Fx<A> =>
    make<A, never, never>((sink) => flatMap(sleep(delay), () => sink.onSuccess(value)))
)
