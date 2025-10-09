import type { Scope } from "effect"
import type * as Effect from "effect/Effect"
import { dual, flow } from "effect/Function"
import { fromEffect } from "../constructors/fromEffect.ts"
import type { Fx } from "../Fx.ts"
import { exhaustLatestMap } from "./exhaustLatestMap.ts"
import type { FlatMapEffectLike } from "./flatMapEffect.ts"

export const exhaustLatestMapEffect: FlatMapEffectLike = dual(2, <A, E, R, B, E2, R2>(
  self: Fx<A, E, R>,
  f: (a: A) => Effect.Effect<B, E2, R2>
): Fx<B, E | E2, R | R2 | Scope.Scope> => exhaustLatestMap(self, flow(f, fromEffect)))
