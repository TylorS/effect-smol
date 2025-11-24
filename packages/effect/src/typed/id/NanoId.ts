import * as Effect from "effect/Effect"
import * as Schema from "effect/schema/Schema"
import { GetRandomValues } from "./GetRandomValues.js"

const nanoIdPattern = /[0-9a-zA-Z_-]/

export const isNanoId = (id: string): id is NanoId => nanoIdPattern.test(id)

export const NanoId = Schema.String.pipe(Schema.check(Schema.makeFilter(isNanoId)), Schema.brand<"@typed/id/NanoId">())
export type NanoId = Schema.Schema.Type<typeof NanoId>

export type NanoIdSeed = readonly [
  zero: number,
  one: number,
  two: number,
  three: number,
  four: number,
  five: number,
  six: number,
  seven: number,
  eight: number,
  nine: number,
  ten: number,
  eleven: number,
  twelve: number,
  thirteen: number,
  fourteen: number,
  fifteen: number,
  sixteen: number,
  seventeen: number,
  eighteen: number,
  nineteen: number,
  twenty: number
]

const numToCharacter = (byte: number): string => {
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

export const nanoIdFromSeed = (seed: NanoIdSeed): NanoId => NanoId.makeUnsafe(seed.map(numToCharacter).join(""))

export const nanoId: Effect.Effect<NanoId, never, GetRandomValues> = Effect.map(
  GetRandomValues.call<NanoIdSeed>(21),
  nanoIdFromSeed
)
