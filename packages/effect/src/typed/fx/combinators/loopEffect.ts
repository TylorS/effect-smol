import type * as Effect from "../../../Effect.ts"
import { dual } from "../../../Function.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"
import * as sinkCore from "../sink/combinators.ts"

export const loopEffect: {
  <B, A, E2, R2, C>(
    seed: B,
    f: (acc: B, a: A) => Effect.Effect<readonly [C, B], E2, R2>
  ): <E, R>(self: Fx<A, E | E2, R>) => Fx<C, E | E2, R | R2>

  <A, E, R, B, C>(
    self: Fx<A, E, R>,
    seed: B,
    f: (acc: B, a: A) => Effect.Effect<readonly [C, B], E, R>
  ): Fx<C, E, R>
} = dual(3, <A, E, R, B, C>(
  self: Fx<A, E, R>,
  seed: B,
  f: (acc: B, a: A) => Effect.Effect<readonly [C, B], E, R>
): Fx<C, E, R> => make<C, E, R>((sink) => self.run(sinkCore.loopEffect(seed, f)(sink))))
