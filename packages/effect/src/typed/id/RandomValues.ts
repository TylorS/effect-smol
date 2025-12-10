import * as Effect from "../../Effect.ts"
import * as Layer from "../../Layer.ts"
import * as Random from "../../Random.ts"
import * as ServiceMap from "../../ServiceMap.ts"

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
