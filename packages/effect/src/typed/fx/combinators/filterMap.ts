import type * as Option from "../../../data/Option.ts"
import { dual } from "../../../Function.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"
import * as sinkCore from "../sink/combinators.ts"

export const filterMap: {
  <A, B>(
    f: (a: A) => Option.Option<B>
  ): <E, R>(self: Fx<A, E, R>) => Fx<B, E, R>

  <A, E, R, B>(
    self: Fx<A, E, R>,
    f: (a: A) => Option.Option<B>
  ): Fx<B, E, R>
} = dual(2, <A, E, R, B>(
  self: Fx<A, E, R>,
  f: (a: A) => Option.Option<B>
): Fx<B, E, R> => make<B, E, R>((sink) => self.run(sinkCore.filterMap(sink, f))))
