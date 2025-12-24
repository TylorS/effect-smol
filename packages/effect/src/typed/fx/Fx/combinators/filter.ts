import { dual } from "../../../../Function.ts"
import * as sinkCore from "../../Sink/combinators.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"

/**
 * Filters elements of an Fx using a predicate function.
 *
 * @param f - A predicate function.
 * @returns An `Fx` that emits only the elements for which `f` returns `true`.
 * @since 1.0.0
 * @category combinators
 */
export const filter: {
  <A>(
    f: (a: A) => boolean
  ): <E, R>(self: Fx<A, E, R>) => Fx<A, E, R>

  <A, E, R>(
    self: Fx<A, E, R>,
    f: (a: A) => boolean
  ): Fx<A, E, R>
} = dual(2, <A, E, R>(
  self: Fx<A, E, R>,
  f: (a: A) => boolean
): Fx<A, E, R> => make<A, E, R>((sink) => self.run(sinkCore.filter(sink, f))))
