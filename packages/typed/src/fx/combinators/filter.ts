import { dual } from "effect/Function"
import * as sinkCore from "../../sink/combinators.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"

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
