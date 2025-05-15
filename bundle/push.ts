import * as Effect from "#dist/effect/Effect"
import * as Push from "#dist/effect/Push"

console.time("Push")
Push.range(1, 1000).pipe(
  Push.filter(x => x % 2 === 0),
  Push.map(x => x * 2),
  Push.runCollect,
  Effect.runSync
)
console.timeEnd("Push")
