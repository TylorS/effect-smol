import type * as Cause from "../../../../Cause.ts"
import type * as Option from "../../../../data/Option.ts"
import { dual } from "../../../../Function.ts"
import * as sinkCore from "../../Sink/combinators.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"

/**
 * Loops over the failure causes of an Fx with an accumulator, potentially transforming or filtering them.
 * This allows for complex error handling logic that maintains state across failures.
 *
 * @param seed - The initial state.
 * @param f - The loop function for causes.
 * @returns An `Fx` with transformed errors.
 * @since 1.0.0
 * @category combinators
 */
export const filterMapLoopCause: {
  <B, A, C>(
    seed: B,
    f: (acc: B, a: Cause.Cause<A>) => readonly [Option.Option<Cause.Cause<C>>, B]
  ): <E, R>(self: Fx<A, E, R>) => Fx<A, C, R>

  <A, E, R, B, C>(
    self: Fx<A, E, R>,
    seed: B,
    f: (acc: B, a: Cause.Cause<E>) => readonly [Option.Option<Cause.Cause<C>>, B]
  ): Fx<A, C, R>
} = dual(3, <A, E, R, B, C>(
  self: Fx<A, E, R>,
  seed: B,
  f: (acc: B, a: Cause.Cause<E>) => readonly [Option.Option<Cause.Cause<C>>, B]
): Fx<A, C, R> => make<A, C, R>((sink) => self.run(sinkCore.filterMapLoopCause(sink, seed, f))))
