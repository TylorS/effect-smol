import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/schema/Schema"
import * as ServiceMap from "effect/ServiceMap"
import { uuidStringify } from "./_uuid-stringify.ts"
import { DateTimes } from "./DateTimes.ts"
import { GetRandomValues } from "./GetRandomValues.js"

export const Uuid7 = Schema.String.pipe(Schema.check(Schema.isUUID(7)), Schema.brand<"@typed/id/UUID7">())
export type Uuid7 = Schema.Schema.Type<typeof Uuid7>

export const isUuid7: (value: string) => value is Uuid7 = Schema.is(Uuid7)

export type Uuid7Seed = {
  readonly timestamp: number
  readonly seq: number
  readonly randomBytes: Uint8Array
}

export class Uuid7State extends ServiceMap.Service<Uuid7State>()("@typed/id/Uuid7State", {
  make: Effect.gen(function*() {
    const { now } = yield* DateTimes
    const { getRandomValues } = yield* GetRandomValues
    const state = {
      msecs: Number.NEGATIVE_INFINITY,
      seq: 0
    }

    function updateV7State(now: number, randomBytes: Uint8Array) {
      if (now > state.msecs) {
        // Time has moved on! Pick a new random sequence number
        state.seq = (randomBytes[6] << 23) | (randomBytes[7] << 16) | (randomBytes[8] << 8) | randomBytes[9]
        state.msecs = now
      } else {
        // Bump sequence counter w/ 32-bit rollover
        state.seq = (state.seq + 1) | 0

        // In case of rollover, bump timestamp to preserve monotonicity. This is
        // allowed by the RFC and should self-correct as the system clock catches
        // up. See https://www.rfc-editor.org/rfc/rfc9562.html#section-6.2-9.4
        if (state.seq === 0) {
          state.msecs++
        }
      }
    }

    return Effect.gen(function*() {
      const randomBytes = yield* getRandomValues(16)
      updateV7State(yield* now, randomBytes)
      return { timestamp: state.msecs, seq: state.seq, randomBytes }
    })
  })
}) {
  static readonly next = Effect.flatten(Uuid7State.asEffect())

  static readonly Default = Layer.effect(Uuid7State, Uuid7State.make).pipe(
    Layer.provideMerge([DateTimes.Default, GetRandomValues.Default])
  )
}

export const makeUuid7: Effect.Effect<Uuid7, never, Uuid7State> = Effect.map(Uuid7State.next, uuid7FromSeed)

function uuid7FromSeed({ randomBytes, seq, timestamp }: Uuid7Seed): Uuid7 {
  const result = new Uint8Array(16)

  // byte 0-5: timestamp (48 bits)
  result[0] = (timestamp / 0x10000000000) & 0xff
  result[1] = (timestamp / 0x100000000) & 0xff
  result[2] = (timestamp / 0x1000000) & 0xff
  result[3] = (timestamp / 0x10000) & 0xff
  result[4] = (timestamp / 0x100) & 0xff
  result[5] = timestamp & 0xff

  // byte 6: `version` (4 bits) | sequence bits 28-31 (4 bits)
  result[6] = 0x70 | ((seq >>> 28) & 0x0f)

  // byte 7: sequence bits 20-27 (8 bits)
  result[7] = (seq >>> 20) & 0xff

  // byte 8: `variant` (2 bits) | sequence bits 14-19 (6 bits)
  result[8] = 0x80 | ((seq >>> 14) & 0x3f)

  // byte 9: sequence bits 6-13 (8 bits)
  result[9] = (seq >>> 6) & 0xff

  // byte 10: sequence bits 0-5 (6 bits) | random (2 bits)
  result[10] = ((seq << 2) & 0xff) | (randomBytes[10] & 0x03)

  // bytes 11-15: random (40 bits)
  result[11] = randomBytes[11]
  result[12] = randomBytes[12]
  result[13] = randomBytes[13]
  result[14] = randomBytes[14]
  result[15] = randomBytes[15]

  return Uuid7.makeUnsafe(uuidStringify(result))
}
