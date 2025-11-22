import type * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as sinkCore from "../../Sink/combinators.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"

/**
 * Filters elements of an Fx using an effectful predicate function.
 *
 * @param f - An effectful predicate function.
 * @returns An `Fx` that emits only the elements for which `f` returns `true`.
 * @since 1.0.0
 * @category combinators
 */
export const filterEffect: {
  <A, E2, R2>(
    f: (a: A) => Effect.Effect<boolean, E2, R2>
  ): <E, R>(self: Fx<A, E | E2, R>) => Fx<A, E | E2, R | R2>

  <A, E, R, E2, R2>(
    self: Fx<A, E | E2, R>,
    f: (a: A) => Effect.Effect<boolean, E2, R2>
  ): Fx<A, E | E2, R | R2>
} = dual(2, <A, E, R, E2, R2>(
  self: Fx<A, E, R>,
  f: (a: A) => Effect.Effect<boolean, E2, R2>
): Fx<A, E | E2, R | R2> => make<A, E | E2, R | R2>((sink) => self.run(sinkCore.filterEffect(f)(sink))))
