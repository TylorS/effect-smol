import type * as Effect from "../../../Effect.ts"
import { dual } from "../../../Function.ts"
import type * as Scope from "../../../Scope.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"
import * as sinkCore from "../sink/combinators.ts"

export const mapEffect: {
  <A, B, E2, R2>(
    f: (a: A) => Effect.Effect<B, E2, R2>
  ): <E, R>(fx: Fx<A, E | E2, R>) => Fx<B, E | E2, R | R2>

  <A, E, R, B, E2, R2>(
    fx: Fx<A, E | E2, R>,
    f: (a: A) => Effect.Effect<B, E2, R2>
  ): Fx<B, E | E2, R | R2>
} = dual(2, <A, E, R, B, E2, R2>(
  self: Fx<A, E, R>,
  f: (a: A) => Effect.Effect<B, E2, R2>
): Fx<B, E | E2, R | R2 | Scope.Scope> =>
  make<B, E | E2, R | R2 | Scope.Scope>((sink) => self.run(sinkCore.mapEffect(sink, f))))
