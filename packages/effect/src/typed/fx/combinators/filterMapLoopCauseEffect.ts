import type * as Cause from "../../../Cause.ts"
import type * as Option from "../../../data/Option.ts"
import type * as Effect from "../../../Effect.ts"
import { dual } from "../../../Function.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"
import * as sinkCore from "../sink/combinators.ts"

export const filterMapLoopCauseEffect: {
  <B, A, E2, R2, C>(
    seed: B,
    f: (acc: B, a: Cause.Cause<A>) => Effect.Effect<readonly [Option.Option<Cause.Cause<C>>, B], E2, R2>
  ): <E, R>(self: Fx<A, E | E2, R>) => Fx<A, C | E2, R | R2>

  <A, E, R, B, R2, C>(
    self: Fx<A, E, R>,
    seed: B,
    f: (acc: B, a: Cause.Cause<E>) => Effect.Effect<readonly [Option.Option<Cause.Cause<C>>, B], C, R2>
  ): Fx<A, C, R | R2>
} = dual(3, <A, E, R, B, R2, C>(
  self: Fx<A, E, R>,
  seed: B,
  f: (acc: B, a: Cause.Cause<E>) => Effect.Effect<readonly [Option.Option<Cause.Cause<C>>, B], C, R2>
): Fx<A, C, R | R2> => make<A, C, R | R2>((sink) => self.run(sinkCore.filterMapLoopCauseEffect(sink, seed, f))))
