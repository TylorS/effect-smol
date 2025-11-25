import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Random from "effect/Random"
import * as ServiceMap from "effect/ServiceMap"

export class RandomValues extends ServiceMap.Service<RandomValues>()("@typed/id/RandomValues", {
  make: Effect.succeed(<A extends Uint8Array>(length: A["length"]): Effect.Effect<A> =>
    Effect.sync(() => crypto.getRandomValues(new Uint8Array(length)) as A)
  )
}) {
  static override readonly call = <A extends Uint8Array>(
    length: A["length"]
  ): Effect.Effect<A, never, RandomValues> =>
    RandomValues.asEffect().pipe(Effect.flatMap((randomValues) => randomValues(length)))

  static readonly Default = Layer.effect(RandomValues, RandomValues.make)

  static readonly Random = Layer.effect(
    RandomValues,
    Effect.gen(function*() {
      const random = yield* Random.Random
      return RandomValues.of(<A extends Uint8Array>(length: A["length"]): Effect.Effect<A> =>
        Effect.sync(() => {
          const view = new Uint8Array(length)
          for (let i = 0; i < length; ++i) view[i] = random.nextIntUnsafe()
          return view as A
        })
      )
    })
  )
}
