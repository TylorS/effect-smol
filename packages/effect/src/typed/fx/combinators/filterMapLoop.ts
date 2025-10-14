import type * as Option from "../../../data/Option.ts"
import { dual } from "../../../Function.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"
import * as sinkCore from "../sink/combinators.ts"

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
