import type { Yieldable } from "effect/Effect"
import { matchCauseEffect } from "effect/Effect"
import type { Fx } from "../Fx.ts"
import { make } from "./make.ts"

/**
 * Creates an Fx from any Yieldable value (e.g., Effect, Promise, etc.).
 *
 * @param yieldable - The yieldable value to convert.
 * @returns An `Fx` that emits the result of the yieldable.
 * @since 1.0.0
 * @category constructors
 */
export const fromYieldable = <A, E = never, R = never>(
  yieldable: Yieldable<any, A, E, R>
): Fx<A, E, R> => /*#__PURE__*/ make<A, E, R>((sink) => matchCauseEffect(yieldable.asEffect(), sink))
