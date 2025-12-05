import type * as Option from "../../../../data/Option.ts"
import type * as Effect from "../../../../Effect.ts"
import { dual } from "../../../../Function.ts"
import * as sinkCore from "../../Sink/combinators.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"

/**
 * Maps and filters elements of an Fx using an effectful function.
 *
 * @param f - An effectful function that returns an `Option` for each element.
 * @returns An `Fx` that emits values for which `f` returns `Some`.
 * @since 1.0.0
 * @category combinators
 */
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
