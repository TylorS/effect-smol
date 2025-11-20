import type * as Effect from "../../../Effect.ts"
import { dual, flow } from "../../../Function.ts"
import type * as Scope from "../../../Scope.ts"
import { fromEffect } from "../constructors/fromEffect.ts"
import type { Fx } from "../Fx.ts"
import { exhaustLatestMap } from "./exhaustLatestMap.ts"
import type { FlatMapEffectLike } from "./flatMapEffect.ts"

export const exhaustLatestMapEffect: FlatMapEffectLike = dual(2, <A, E, R, B, E2, R2>(
  self: Fx<A, E, R>,
  f: (a: A) => Effect.Effect<B, E2, R2>
): Fx<B, E | E2, R | R2 | Scope.Scope> => exhaustLatestMap(self, flow(f, fromEffect)))
