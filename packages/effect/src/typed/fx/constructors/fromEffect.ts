import * as Effect from "../../../Effect.ts"
import { matchCauseEffect } from "../../../Effect.ts"
import type { Fx } from "../Fx.ts"
import { make } from "./make.ts"

export const fromEffect = <A, E = never, R = never>(
  effect: Effect.Effect<A, E, R>
): Fx<A, E, R> => /*#__PURE__*/ make<A, E, R>((sink) => matchCauseEffect(effect, sink))

export const never: Fx<never, never, never> = make<never, never, never>(() => Effect.never)
