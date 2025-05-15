import * as Effect from "#dist/effect/Effect"
import * as Push from "#dist/effect/Push"

Push.succeed(1).pipe(
  Push.runCollect,
  Effect.runSync
)
