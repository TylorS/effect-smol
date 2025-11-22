import type * as Effect from "effect/Effect"
import { dual, flow } from "effect/Function"
import type * as Scope from "effect/Scope"
import { fromEffect } from "../constructors/fromEffect.ts"
import type { Fx } from "../Fx.ts"
import { flatMap } from "./flatMap.ts"

/**
 * Type definition for flatMapEffect functions to support variable arguments.
 * @since 1.0.0
 * @category types
 */
export type FlatMapEffectLike<Args extends ReadonlyArray<any> = []> = {
  <A, B, E2, R2>(
    f: (a: A) => Effect.Effect<B, E2, R2>,
    ...args: Args
  ): <E, R>(self: Fx<A, E, R>) => Fx<B, E | E2, R | R2 | Scope.Scope>

  <A, E, R, B, E2, R2>(
    self: Fx<A, E, R>,
    f: (a: A) => Effect.Effect<B, E2, R2>,
    ...args: Args
  ): Fx<B, E | E2, R | R2 | Scope.Scope>
}

/**
 * Maps each element of an Fx to an Effect, and merges the results.
 *
 * The effects are run concurrently.
 *
 * @param f - A function that maps an element `A` to an `Effect<B>`.
 * @returns An `Fx` that emits the results of the effects.
 * @since 1.0.0
 * @category combinators
 */
export const flatMapEffect: FlatMapEffectLike = dual(2, <A, E, R, B, E2, R2>(
  self: Fx<A, E, R>,
  f: (a: A) => Effect.Effect<B, E2, R2>
): Fx<B, E | E2, R | R2 | Scope.Scope> => flatMap(self, flow(f, fromEffect)))
