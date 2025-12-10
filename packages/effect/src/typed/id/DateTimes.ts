import * as Clock from "../../Clock.ts"
import * as Effect from "../../Effect.ts"
import * as Layer from "../../Layer.ts"
import * as ServiceMap from "../../ServiceMap.ts"

export class DateTimes extends ServiceMap.Service<DateTimes>()("@typed/id/DateTimes", {
  make: Effect.succeed({
    now: Effect.sync(() => Date.now()),
    date: Effect.sync(() => new Date())
  })
}) {
  static readonly now = Effect.flatMap(DateTimes.asEffect(), ({ now }) => now)
  static readonly date = Effect.flatMap(DateTimes.asEffect(), ({ date }) => date)

  static readonly Default = Layer.effect(DateTimes, DateTimes.make)

  static readonly Fixed = (baseDate: number | string | Date) =>
    Layer.effect(
      DateTimes,
      Effect.gen(function*() {
        const clock = yield* Clock.Clock
        const base = new Date(baseDate)
        const baseN = BigInt(base.getTime())
        const startMillis = yield* clock.currentTimeMillis
        const now = clock.currentTimeMillis.pipe(
          Effect.map((millis) =>
            // Use BigInt to avoid floating point precision issues which can break deterministic testing
            Number(baseN + BigInt(millis) - BigInt(startMillis))
          )
        )
        const date = now.pipe(
          Effect.map((millis) => new Date(millis))
        )

        return DateTimes.of({ now, date })
      })
    )
}
