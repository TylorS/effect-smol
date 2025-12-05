import type * as Effect from "../../../../Effect.ts"
import { dual, flow } from "../../../../Function.ts"
import type * as Scope from "../../../../Scope.ts"
import { fromEffect } from "../constructors/fromEffect.ts"
import type { Fx } from "../Fx.ts"
import { exhaustLatestMap } from "./exhaustLatestMap.ts"
import type { FlatMapEffectLike } from "./flatMapEffect.ts"

/**
 * Maps each element of an Fx to an Effect, but only runs one effect at a time.
 * If a new element arrives while an effect is running, the new element is buffered (overwriting any previously buffered value).
 * When the current effect completes, the latest buffered effect is run.
 *
 * @param f - A function that maps an element `A` to an `Effect<B>`.
 * @returns An `Fx` that emits the results of the effects.
 * @since 1.0.0
 * @category combinators
 */
export const exhaustLatestMapEffect: FlatMapEffectLike = dual(2, <A, E, R, B, E2, R2>(
  self: Fx<A, E, R>,
  f: (a: A) => Effect.Effect<B, E2, R2>
): Fx<B, E | E2, R | R2 | Scope.Scope> => exhaustLatestMap(self, flow(f, fromEffect)))
