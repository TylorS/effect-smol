import * as Effect from "../../../../Effect.ts"
import { dual } from "../../../../Function.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"

/**
 * Adds an `Effect.ensuring`-style finalizer to an `Fx`.
 *
 * The finalizer is guaranteed to run when the stream terminates (success,
 * failure, or interruption).
 *
 * @since 1.0.0
 * @category combinators
 */
export const ensuring: {
  <R2>(
    finalizer: Effect.Effect<void, never, R2>
  ): <A, E, R>(self: Fx<A, E, R>) => Fx<A, E, R | R2>

  <A, E, R, R2>(
    self: Fx<A, E, R>,
    finalizer: Effect.Effect<void, never, R2>
  ): Fx<A, E, R | R2>
} = dual(2, <A, E, R, R2>(
  self: Fx<A, E, R>,
  finalizer: Effect.Effect<void, never, R2>
): Fx<A, E, R | R2> =>
  make<A, E, R | R2>((sink) => self.run(sink).pipe(Effect.ensuring(finalizer))))

