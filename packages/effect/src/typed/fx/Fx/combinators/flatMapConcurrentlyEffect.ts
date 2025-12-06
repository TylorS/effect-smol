import type * as Effect from "../../../../Effect.ts"
import { dual, flow } from "../../../../Function.ts"
import type * as Scope from "../../../../Scope.ts"
import { fromEffect } from "../constructors/fromEffect.ts"
import type { Fx } from "../Fx.ts"
import { flatMapConcurrently } from "./flatMapConcurrently.ts"
import type { FlatMapEffectLike } from "./flatMapEffect.ts"

/**
 * Maps each element of an Fx to an Effect, running them concurrently with a limit.
 *
 * @param f - A function that maps an element `A` to an `Effect<B>`.
 * @param concurrency - The maximum number of concurrent effects.
 * @returns An `Fx` that emits the results of the effects.
 * @since 1.0.0
 * @category combinators
 */
export const flatMapConcurrentlyEffect: FlatMapEffectLike<[concurrency: number]> = dual(3, <A, E, R, B, E2, R2>(
  self: Fx<A, E, R>,
  f: (a: A) => Effect.Effect<B, E2, R2>,
  concurrency: number
): Fx<B, E | E2, R | R2 | Scope.Scope> => flatMapConcurrently(self, flow(f, fromEffect), concurrency))
