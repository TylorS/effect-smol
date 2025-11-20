import type * as Option from "effect/data/Option"
import type * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as sinkCore from "../../Sink/combinators.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"

export const filterMapEffect: {
  <A, B, E2, R2>(
    f: (a: A) => Effect.Effect<Option.Option<B>, E2, R2>
  ): <E, R>(self: Fx<A, E | E2, R>) => Fx<B, E | E2, R | R2>

  <A, E, R, B, E2, R2>(
    self: Fx<A, E | E2, R>,
    f: (a: A) => Effect.Effect<Option.Option<B>, E2, R2>
  ): Fx<B, E | E2, R | R2>
} = dual(2, <A, E, R, B, E2, R2>(
  self: Fx<A, E, R>,
  f: (a: A) => Effect.Effect<Option.Option<B>, E2, R2>
): Fx<B, E | E2, R | R2> => make<B, E | E2, R | R2>((sink) => self.run(sinkCore.filterMapEffect(f)(sink))))
