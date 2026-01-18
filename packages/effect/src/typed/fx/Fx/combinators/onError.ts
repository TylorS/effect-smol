import type * as Cause from "../../../../Cause.ts"
import * as Effect from "../../../../Effect.ts"
import { dual } from "../../../../Function.ts"
import { make as makeSink } from "../../Sink/Sink.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"

/**
 * Adds an `Effect.onError`-style finalizer to an `Fx`.
 *
 * The cleanup is run only if the stream fails (including defects / interrupts
 * carried in the `Cause`).
 *
 * @since 1.0.0
 * @category combinators
 */
export const onError: {
  <E, X, R2>(
    cleanup: (cause: Cause.Cause<E>) => Effect.Effect<X, never, R2>
  ): <A, R>(self: Fx<A, E, R>) => Fx<A, E, R | R2>

  <A, E, R, X, R2>(
    self: Fx<A, E, R>,
    cleanup: (cause: Cause.Cause<E>) => Effect.Effect<X, never, R2>
  ): Fx<A, E, R | R2>
} = dual(2, <A, E, R, X, R2>(
  self: Fx<A, E, R>,
  cleanup: (cause: Cause.Cause<E>) => Effect.Effect<X, never, R2>
): Fx<A, E, R | R2> =>
  make<A, E, R | R2>((sink) =>
    self.run(makeSink(
      (cause) => Effect.flatMap(sink.onFailure(cause), () => Effect.ignore(cleanup(cause))),
      sink.onSuccess
    ))
  ))

