import type * as Option from "../../../../data/Option.ts"
import { dual } from "../../../../Function.ts"
import * as sinkCore from "../../Sink/combinators.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"

/**
 * Loops over an Fx with an accumulator, producing an optional new value for each element.
 * If the function returns `None`, the element is filtered out.
 *
 * @param seed - The initial state.
 * @param f - The loop function returning `Option<C>` and the new state.
 * @returns An `Fx` emitting the transformed values.
 * @since 1.0.0
 * @category combinators
 */
export const filterMapLoop: {
  <B, A, C>(
    seed: B,
    f: (acc: B, a: A) => readonly [Option.Option<C>, B]
  ): <E, R>(self: Fx<A, E, R>) => Fx<C, E, R>

  <A, E, R, B, C>(
    self: Fx<A, E, R>,
    seed: B,
    f: (acc: B, a: A) => readonly [Option.Option<C>, B]
  ): Fx<C, E, R>
} = dual(3, <A, E, R, B, C>(
  self: Fx<A, E, R>,
  seed: B,
  f: (acc: B, a: A) => readonly [Option.Option<C>, B]
): Fx<C, E, R> => make<C, E, R>((sink) => self.run(sinkCore.filterMapLoop(sink, seed, f))))
