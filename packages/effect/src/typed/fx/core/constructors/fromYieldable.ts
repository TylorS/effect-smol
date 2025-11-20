import type { Yieldable } from "effect/Effect"
import { matchCauseEffect } from "effect/Effect"
import type { Fx } from "../Fx.ts"
import { make } from "./make.ts"

export const fromYieldable = <A, E = never, R = never>(
  yieldable: Yieldable<any, A, E, R>
): Fx<A, E, R> => /*#__PURE__*/ make<A, E, R>((sink) => matchCauseEffect(yieldable.asEffect(), sink))
