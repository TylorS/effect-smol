import * as Effect from "effect/Effect"
import * as Schema from "effect/schema/Schema"
import { RandomValues } from "./RandomValues.js"

export const NanoId = Schema.String.pipe(
  Schema.check(Schema.isPattern(/[0-9a-zA-Z_-]/)),
  Schema.brand<"@typed/id/NanoId">()
)
export type NanoId = typeof NanoId.Type

export const isNanoId: (value: string) => value is NanoId = Schema.is(NanoId)

type NanoIdSeed = Uint8Array & { length: 21 }

export const nanoId: Effect.Effect<NanoId, never, RandomValues> = Effect.map(
  RandomValues.call<NanoIdSeed>(21),
  (seed: NanoIdSeed): NanoId => NanoId.makeUnsafe(Array.from(seed, numToCharacter).join(""))
)

function numToCharacter(byte: number): string {
  byte &= 63
  if (byte < 36) {
    // `0-9a-z`
    return byte.toString(36)
  } else if (byte < 62) {
    // `A-Z`
    return (byte - 26).toString(36).toUpperCase()
  } else if (byte > 62) {
    return "-"
  } else {
    return "_"
  }
}
