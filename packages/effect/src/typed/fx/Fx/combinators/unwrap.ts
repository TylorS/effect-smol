import * as Effect from "../../../../Effect.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"

/**
 * Unwraps an Effect that produces an Fx into a single Fx.
 *
 * @param effect - An `Effect` that produces an `Fx`.
 * @returns An `Fx` that runs the effect and then the produced Fx.
 * @since 1.0.0
 * @category combinators
 */
export const unwrap = <A, E, R, E2, R2>(
  effect: Effect.Effect<Fx<A, E, R>, E2, R2>
): Fx<A, E | E2, R | R2> =>
  make<A, E | E2, R | R2>((sink) =>
    Effect.matchCauseEffect(effect, {
      onFailure: (cause) => sink.onFailure(cause),
      onSuccess: (fx) => fx.run(sink)
    })
  )
