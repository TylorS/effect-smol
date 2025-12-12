import * as Effect from "../../../../Effect.ts"
import type { Fx } from "../Fx.ts"
import { make } from "./make.ts"

/**
 * Creates an Fx from an Effect.
 *
 * If the Effect succeeds, the Fx emits the value and completes.
 * If the Effect fails, the Fx fails with the same error.
 *
 * @param effect - The effect to convert.
 * @returns An `Fx` representing the execution of the effect.
 * @since 1.0.0
 * @category constructors
 */
export const fromEffect = <A, E = never, R = never>(
  effect: Effect.Effect<A, E, R>
): Fx<A, E, R> => /*#__PURE__*/ make<A, E, R>((sink) => Effect.matchCauseEffect(effect, sink))

/**
 * An Fx that runs forever without emitting any values.
 * @since 1.0.0
 * @category constructors
 */
export const never: Fx<never, never, never> = make<never, never, never>(() => Effect.never)
