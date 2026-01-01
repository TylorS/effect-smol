import { dual } from "../../../../Function.ts"
import * as sinkCore from "../../Sink/combinators.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"

/**
 * Loops over an Fx with an accumulator, producing a new value for each element
 * and updating the accumulator.
 *
 * @param seed - The initial value of the accumulator.
 * @param f - A function that takes the accumulator and an element, returning a tuple of the emitted value and the new accumulator.
 * @returns An `Fx` that emits the transformed values.
 * @since 1.0.0
 * @category combinators
 */
export const loop: {
  <B, A, C>(
    seed: B,
    f: (acc: B, a: A) => readonly [C, B]
  ): <E, R>(self: Fx<A, E, R>) => Fx<C, E, R>

  <A, E, R, B, C>(
    self: Fx<A, E, R>,
    seed: B,
    f: (acc: B, a: A) => readonly [C, B]
  ): Fx<C, E, R>
} = dual(3, <A, E, R, B, C>(
  self: Fx<A, E, R>,
  seed: B,
  f: (acc: B, a: A) => readonly [C, B]
): Fx<C, E, R> => make<C, E, R>((sink) => self.run(sinkCore.loop(sink, seed, f))))
