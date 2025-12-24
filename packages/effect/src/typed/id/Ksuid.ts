import * as Effect from "../../Effect.ts"
import * as Schema from "../../schema/Schema.ts"
import { DateTimes } from "./DateTimes.ts"
import { RandomValues } from "./RandomValues.ts"

// Constants
const EPOCH = 14e11 // 2014-03-01T00:00:00Z
const TIMESTAMP_BYTES = 4
const PAYLOAD_BYTES = 16
const TOTAL_BYTES = TIMESTAMP_BYTES + PAYLOAD_BYTES
const STRING_LENGTH = 27

// Schema
export const Ksuid = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^[0-9a-zA-Z]{27}$/)),
  Schema.brand<"@typed/id/KSUID">()
)
export type Ksuid = typeof Ksuid.Type

export const isKsuid: (value: string) => value is Ksuid = Schema.is(Ksuid)

// Types
type KsuidSeed = Uint8Array & { length: 16 }

// Public API
export const ksuid: Effect.Effect<Ksuid, never, DateTimes | RandomValues> = Effect.zipWith(
  DateTimes.now,
  RandomValues.call<KsuidSeed>(PAYLOAD_BYTES),
  (timestamp, payload) => {
    // Create the combined bytes
    const bytes = new Uint8Array(TOTAL_BYTES)

    // Support for timestamps before the epoch, usually for testing
    if (timestamp < EPOCH) {
      timestamp += EPOCH
    }

    // Write timestamp (4 bytes, big-endian)
    const seconds = Math.floor((timestamp - EPOCH) / 1000)
    bytes[0] = (seconds >>> 24) & 0xff
    bytes[1] = (seconds >>> 16) & 0xff
    bytes[2] = (seconds >>> 8) & 0xff
    bytes[3] = seconds & 0xff

    // Copy payload
    bytes.set(payload, TIMESTAMP_BYTES)

    // Encode as base62
    return Ksuid.makeUnsafe(base62Encode(bytes))
  }
)

// Utilities
const base62Chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
const base = BigInt(base62Chars.length)

function base62Encode(bytes: Uint8Array): string {
  let number = 0n
  for (const byte of bytes) {
    number = (number << 8n) + BigInt(byte)
  }

  const chars: Array<string> = Array(STRING_LENGTH)
  let i = chars.length

  while (i > 0) {
    i--
    const remainder = Number(number % base)
    chars[i] = base62Chars[remainder]
    number = number / base
  }

  return chars.join("")
}
