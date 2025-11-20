import type * as Cause from "effect/Cause"
import type * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as sinkCore from "../../Sink/combinators.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"

export const loopCauseEffect: {
  <B, A, E, R2, C>(
    seed: B,
    f: (acc: B, a: Cause.Cause<A>) => Effect.Effect<readonly [Cause.Cause<C>, B], R2>
  ): <R>(self: Fx<A, E, R>) => Fx<A, C | E, R | R2>

  <A, E, R, B, R2, C>(
    self: Fx<A, E, R>,
    seed: B,
    f: (acc: B, a: Cause.Cause<E>) => Effect.Effect<readonly [Cause.Cause<C>, B], E, R2>
  ): Fx<A, C, R | R2>
} = dual(3, <A, E, R, B, R2, C>(
  self: Fx<A, E, R>,
  seed: B,
  f: (acc: B, a: Cause.Cause<E>) => Effect.Effect<readonly [Cause.Cause<C>, B], E, R2>
): Fx<A, C | E, R | R2> => make<A, C | E, R | R2>((sink) => self.run(sinkCore.loopCauseEffect(sink, seed, f))))
