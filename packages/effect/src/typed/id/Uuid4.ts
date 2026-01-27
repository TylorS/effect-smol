import * as Effect from "../../Effect.ts"
import * as Schema from "../../Schema.ts"
import { uuidStringify } from "./_uuid-stringify.ts"
import { RandomValues } from "./RandomValues.ts"

export const Uuid4 = Schema.String.pipe(Schema.check(Schema.isUUID(4)), Schema.brand("@typed/id/UUID4"))
export type Uuid4 = typeof Uuid4.Type

export const isUuid4: (value: string) => value is Uuid4 = Schema.is(Uuid4)

type Uuid4Seed = Uint8Array & { length: 16 }

export const uuid4: Effect.Effect<Uuid4, never, RandomValues> = Effect.map(
  RandomValues.call<Uuid4Seed>(16),
  (seed: Uuid4Seed): Uuid4 => {
    // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
    seed[6] = (seed[6] & 0x0f) | 0x40
    seed[8] = (seed[8] & 0x3f) | 0x80
    return Uuid4.makeUnsafe(uuidStringify(seed))
  }
)
