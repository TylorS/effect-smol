import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Random from "effect/Random"
import * as ServiceMap from "effect/ServiceMap"

export class GetRandomValues extends ServiceMap.Service<GetRandomValues>()("effect/typed/id/GetRandomValues", {
  make: Effect.succeed({
    getRandomValues: (length: number) => Effect.sync(() => crypto.getRandomValues(new Uint8Array(length)))
  })
}) {
  static override readonly call = <A extends ArrayLike<number> = Uint8Array>(length: A["length"]) =>
    GetRandomValues.asEffect().pipe(
      Effect.flatMap(({ getRandomValues }) => getRandomValues(length)),
      Effect.map((view) => view as unknown as A)
    )

  static readonly Default = Layer.effect(GetRandomValues, GetRandomValues.make)

  static readonly Random = Layer.effect(
    this,
    Effect.gen(function*() {
      const random = yield* Random.Random
      return GetRandomValues.of({
        getRandomValues: (length: number) =>
          Effect.sync(() => {
            const view = new Uint8Array(length)
            for (let i = 0; i < length; ++i) view[i] = random.nextIntUnsafe()
            return view
          })
      })
    })
  )
}
