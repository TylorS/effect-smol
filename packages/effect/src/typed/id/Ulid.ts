import * as Effect from "../../Effect.ts"
import * as Schema from "../../Schema.ts"
import { DateTimes } from "./DateTimes.ts"
import { RandomValues } from "./RandomValues.ts"

export const Ulid = Schema.String.pipe(Schema.check(Schema.isULID()), Schema.brand("@typed/id/ULID"))
export type Ulid = typeof Ulid.Type

export const isUlid: (value: string) => value is Ulid = Schema.is(Ulid)

type UlidSeed = Uint8Array & { length: 16 }

// Crockford's Base32
const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
const ENCODING_LEN = ENCODING.length
const TIME_MAX = 2 ** 48 - 1
const TIME_LEN = 10
const RANDOM_LEN = 16

export const ulid: Effect.Effect<Ulid, never, RandomValues | DateTimes> = Effect.zipWith(
  DateTimes.now,
  RandomValues.call<UlidSeed>(16),
  (now, seed) => {
    if (now > TIME_MAX) {
      throw new Error("Cannot generate ULID due to timestamp overflow")
    }

    return Ulid.makeUnsafe(encodeTime(now, TIME_LEN) + encodeRandom(seed))
  }
)

function encodeTime(now: number, len: number): string {
  let str = ""
  for (let i = len - 1; i >= 0; i--) {
    const mod = now % ENCODING_LEN
    str = ENCODING.charAt(mod) + str
    now = (now - mod) / ENCODING_LEN
  }
  return str
}

function encodeRandom(seed: UlidSeed): string {
  let str = ""
  for (let i = 0; i < RANDOM_LEN; i++) {
    str = str + ENCODING.charAt(seed[i] % ENCODING_LEN)
  }
  return str
}
