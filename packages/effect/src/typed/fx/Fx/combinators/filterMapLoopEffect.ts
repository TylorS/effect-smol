import type * as Option from "../../../../data/Option.ts"
import type * as Effect from "../../../../Effect.ts"
import { dual } from "../../../../Function.ts"
import * as sinkCore from "../../Sink/combinators.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"

/**
 * Effectfully loops over an Fx with an accumulator, producing an optional new value.
 *
 * @param seed - The initial state.
 * @param f - The effectful loop function.
 * @returns An `Fx` emitting the transformed values.
 * @since 1.0.0
 * @category combinators
 */
export const filterMapLoopEffect: {
  <B, A, E2, R2, C>(
    seed: B,
    f: (acc: B, a: A) => Effect.Effect<readonly [Option.Option<C>, B], E2, R2>
  ): <E, R>(self: Fx<A, E | E2, R>) => Fx<C, E | E2, R | R2>

  <A, E, R, B, R2, C>(
    self: Fx<A, E, R>,
    seed: B,
    f: (acc: B, a: A) => Effect.Effect<readonly [Option.Option<C>, B], E, R2>
  ): Fx<C, E, R | R2>
} = dual(3, <A, E, R, B, R2, C>(
  self: Fx<A, E, R>,
  seed: B,
  f: (acc: B, a: A) => Effect.Effect<readonly [Option.Option<C>, B], E, R2>
): Fx<C, E, R | R2> => make<C, E, R | R2>((sink) => self.run(sinkCore.filterMapLoopEffect(sink, seed, f))))
