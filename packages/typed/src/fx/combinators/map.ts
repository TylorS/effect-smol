import { dual } from "effect/Function"
import * as sinkCore from "../../sink/combinators.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"

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
