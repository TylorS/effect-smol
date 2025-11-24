import * as Effect from "effect/Effect"
import * as Schema from "effect/schema/Schema"
import { uuidStringify } from "./_uuid-stringify.ts"
import { GetRandomValues } from "./GetRandomValues.js"

export const Uuid4 = Schema.String.pipe(Schema.check(Schema.isUUID(4)), Schema.brand<"@typed/id/UUID4">())
export type Uuid4 = Schema.Schema.Type<typeof Uuid4>

export const isUuid4: (value: string) => value is Uuid4 = Schema.is(Uuid4)

export const makeUuid4: Effect.Effect<Uuid4, never, GetRandomValues> = Effect.map(
  GetRandomValues.call<Uint8Array>(16),
  (seed: Uint8Array): Uuid4 => {
    // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
    seed[6] = (seed[6] & 0x0f) | 0x40
    seed[8] = (seed[8] & 0x3f) | 0x80
    return Uuid4.makeUnsafe(uuidStringify(seed))
  }
)
