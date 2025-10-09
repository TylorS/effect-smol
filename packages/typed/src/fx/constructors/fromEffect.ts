import type { Effect } from "effect/Effect"
import { matchCauseEffect } from "effect/Effect"
import type { Fx } from "../Fx.ts"
import { make } from "./make.ts"

export const fromEffect = <A, E = never, R = never>(
  effect: Effect<A, E, R>
): Fx<A, E, R> => /*#__PURE__*/ make<A, E, R>((sink) => matchCauseEffect(effect, sink))
