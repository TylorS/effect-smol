import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as Layer from "effect/Layer"
import * as ServiceMap from "effect/ServiceMap"
import type { Cuid } from "./Cuid.ts"
import { cuid, CuidState } from "./Cuid.ts"
import { DateTimes } from "./DateTimes.ts"
import type { Ksuid } from "./Ksuid.ts"
import { ksuid } from "./Ksuid.ts"
import type { NanoId } from "./NanoId.ts"
import { nanoId } from "./NanoId.ts"
import { RandomValues } from "./RandomValues.ts"
import type { Ulid } from "./Ulid.ts"
import { ulid } from "./Ulid.ts"
import type { Uuid4 } from "./Uuid4.ts"
import { uuid4 } from "./Uuid4.ts"
import { type Uuid5, Uuid5Namespace } from "./Uuid5.ts"
import { uuid5 } from "./Uuid5.ts"
import type { Uuid7 } from "./Uuid7.ts"
import { uuid7, Uuid7State } from "./Uuid7.ts"

export class Ids extends ServiceMap.Service<Ids>()("@typed/id/Ids", {
  make: Effect.gen(function*() {
    const services = yield* Effect.services<DateTimes | RandomValues | CuidState | Uuid7State>()

    const uuid5_: {
      (namespace: Uuid5Namespace): (name: string) => Effect.Effect<Uuid5>
      (name: string, namespace: Uuid5Namespace): Effect.Effect<Uuid5>
      readonly dns: (name: string) => Effect.Effect<Uuid5>
      readonly url: (name: string) => Effect.Effect<Uuid5>
      readonly oid: (name: string) => Effect.Effect<Uuid5>
      readonly x500: (name: string) => Effect.Effect<Uuid5>
    } = Object.assign(
      dual(2, (name: string, namespace: Uuid5Namespace) => Effect.provide(uuid5(name, namespace), services)),
      {
        dns: uuid5(Uuid5Namespace.DNS),
        url: uuid5(Uuid5Namespace.URL),
        oid: uuid5(Uuid5Namespace.OID),
        x500: uuid5(Uuid5Namespace.X500)
      }
    )

    return {
      cuid: Effect.provide(cuid, services),
      ksuid: Effect.provide(ksuid, services),
      nanoId: Effect.provide(nanoId, services),
      ulid: Effect.provide(ulid, services),
      uuid4: Effect.provide(uuid4, services),
      uuid5: uuid5_,
      uuid7: Effect.provide(uuid7, services)
    }
  })
}) {
  static readonly cuid: Effect.Effect<
    Cuid,
    never,
    Ids
  > = Effect.flatMap(Ids.asEffect(), ({ cuid }) => cuid)

  static readonly ksuid: Effect.Effect<Ksuid, never, Ids> = Effect.flatMap(Ids.asEffect(), ({ ksuid }) => ksuid)

  static readonly nanoId: Effect.Effect<NanoId, never, Ids> = Effect.flatMap(Ids.asEffect(), ({ nanoId }) => nanoId)

  static readonly ulid: Effect.Effect<Ulid, never, Ids> = Effect.flatMap(Ids.asEffect(), ({ ulid }) => ulid)

  static readonly uuid4: Effect.Effect<Uuid4, never, Ids> = Effect.flatMap(Ids.asEffect(), ({ uuid4 }) => uuid4)

  static readonly uuid5: {
    (namespace: Uuid5Namespace): (name: string) => Effect.Effect<Uuid5, never, Ids>
    (name: string, namespace: Uuid5Namespace): Effect.Effect<Uuid5, never, Ids>
    readonly dns: (name: string) => Effect.Effect<Uuid5, never, Ids>
    readonly url: (name: string) => Effect.Effect<Uuid5, never, Ids>
    readonly oid: (name: string) => Effect.Effect<Uuid5, never, Ids>
    readonly x500: (name: string) => Effect.Effect<Uuid5, never, Ids>
  } = Object.assign(
    dual(
      2,
      (name: string, namespace: Uuid5Namespace) => Effect.flatMap(Ids.asEffect(), ({ uuid5 }) => uuid5(name, namespace))
    ),
    {
      dns: (name: string) => Effect.flatMap(Ids.asEffect(), ({ uuid5 }) => uuid5.dns(name)),
      url: (name: string) => Effect.flatMap(Ids.asEffect(), ({ uuid5 }) => uuid5.url(name)),
      oid: (name: string) => Effect.flatMap(Ids.asEffect(), ({ uuid5 }) => uuid5.oid(name)),
      x500: (name: string) => Effect.flatMap(Ids.asEffect(), ({ uuid5 }) => uuid5.x500(name))
    }
  )
  static readonly uuid7: Effect.Effect<Uuid7, never, Ids> = Effect.flatMap(Ids.asEffect(), ({ uuid7 }) => uuid7)

  static readonly Default: Layer.Layer<Ids | DateTimes | RandomValues, never, never> = Layer.effect(Ids, Ids.make).pipe(
    Layer.provide([CuidState.Default, Uuid7State.Default]),
    Layer.provideMerge([DateTimes.Default, RandomValues.Default])
  )

  static readonly Test = (options?: {
    readonly currentTime?: number | string | Date
    readonly envData?: string
  }): Layer.Layer<Ids | DateTimes | RandomValues> =>
    Layer.effect(Ids, Ids.make).pipe(
      Layer.provide([Layer.effect(CuidState, CuidState.make(options?.envData ?? "node")), Uuid7State.Default]),
      Layer.provideMerge([DateTimes.Fixed(options?.currentTime ?? 0), RandomValues.Random])
    )
}
