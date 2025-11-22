import * as Effect from "effect/Effect"
import type * as Scope from "effect/Scope"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"

/**
 * Unwraps an Effect that produces an Fx into a single Fx, managing the scope of the effect.
 *
 * The scope of the effect is closed when the Fx completes or is interrupted.
 *
 * @param effect - An `Effect` that produces an `Fx`.
 * @returns An `Fx` that runs the effect and then the produced Fx.
 * @since 1.0.0
 * @category combinators
 */
export const unwrapScoped = <A, E, R, E2, R2>(
  effect: Effect.Effect<Fx<A, E, R>, E2, R2 | Scope.Scope>
): Fx<A, E | E2, Exclude<R | R2, Scope.Scope>> =>
  make<A, E | E2, Exclude<R | R2, Scope.Scope>>((sink) =>
    Effect.scoped(Effect.matchCauseEffect(effect, {
      onFailure: (cause) => sink.onFailure(cause),
      onSuccess: (fx) => fx.run(sink)
    }))
  )
