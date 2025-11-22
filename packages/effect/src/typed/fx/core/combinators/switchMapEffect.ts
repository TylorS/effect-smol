import type * as Effect from "effect/Effect"
import { dual, flow } from "effect/Function"
import type * as Scope from "effect/Scope"
import { fromEffect } from "../constructors/fromEffect.ts"
import type { Fx } from "../Fx.ts"
import type { FlatMapEffectLike } from "./flatMapEffect.ts"
import { switchMap } from "./switchMap.ts"

/**
 * Maps each element of an Fx to an Effect, and switches to the latest effect.
 *
 * When a new element is emitted, the previous effect is cancelled.
 *
 * @param f - A function that maps an element `A` to an `Effect<B>`.
 * @returns An `Fx` that emits the results of the latest effect.
 * @since 1.0.0
 * @category combinators
 */
export const switchMapEffect: FlatMapEffectLike = dual(2, <A, E, R, B, E2, R2>(
  self: Fx<A, E, R>,
  f: (a: A) => Effect.Effect<B, E2, R2>
): Fx<B, E | E2, R | R2 | Scope.Scope> => switchMap(self, flow(f, fromEffect)))
