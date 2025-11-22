import { dual } from "effect/Function"
import * as sinkCore from "../../Sink/combinators.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"

/**
 * Transforms the elements of an Fx using a provided function.
 *
 * @param f - A function that transforms values of type `A` to `B`.
 * @returns An `Fx` that emits values of type `B`.
 * @since 1.0.0
 * @category combinators
 */
export const map: {
  <A, B>(
    f: (a: A) => B
  ): <E, R>(self: Fx<A, E, R>) => Fx<B, E, R>

  <A, E, R, B>(
    self: Fx<A, E, R>,
    f: (a: A) => B
  ): Fx<B, E, R>
} = dual(2, <A, E, R, B>(
  self: Fx<A, E, R>,
  f: (a: A) => B
): Fx<B, E, R> => make<B, E, R>((sink) => self.run(sinkCore.map(sink, f))))
