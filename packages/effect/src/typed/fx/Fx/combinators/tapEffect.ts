import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as sinkCore from "../../Sink/combinators.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"

/**
 * Performs an effect for each element of the Fx, without changing the elements.
 *
 * @param f - An effectful function to apply to each element.
 * @returns An `Fx` that emits the original elements.
 * @since 1.0.0
 * @category combinators
 */
export const tap: {
  <A, E2 = never, R2 = never>(
    f: (a: A) => void | Effect.Effect<unknown, E2, R2>
  ): <E, R>(self: Fx<A, E | E2, R>) => Fx<A, E | E2, R | R2>

  <A, E, R, E2 = never, R2 = never>(
    self: Fx<A, E | E2, R>,
    f: (a: A) => void | Effect.Effect<unknown, E2, R2>
  ): Fx<A, E | E2, R | R2>
} = dual(2, <A, E, R, E2, R2>(
  self: Fx<A, E, R>,
  f: (a: A) => void | Effect.Effect<unknown, E2, R2>
): Fx<A, E | E2, R | R2> =>
  make<A, E | E2, R | R2>((sink) =>
    self.run(sinkCore.tapEffect(sink, (a) => {
      const x = f(a)
      if (Effect.isEffect(x)) return x
      return Effect.void
    }))
  ))
