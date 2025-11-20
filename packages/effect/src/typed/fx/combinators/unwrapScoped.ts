import * as Effect from "../../../Effect.ts"
import type * as Scope from "../../../Scope.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"

export const unwrapScoped = <A, E, R, E2, R2>(
  effect: Effect.Effect<Fx<A, E, R>, E2, R2 | Scope.Scope>
): Fx<A, E | E2, Exclude<R | R2, Scope.Scope>> =>
  make<A, E | E2, Exclude<R | R2, Scope.Scope>>((sink) =>
    Effect.scoped(Effect.matchCauseEffect(effect, {
      onFailure: (cause) => sink.onFailure(cause),
      onSuccess: (fx) => fx.run(sink)
    }))
  )
