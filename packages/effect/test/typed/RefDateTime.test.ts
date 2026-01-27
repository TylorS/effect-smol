import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import * as DateTime from "effect/DateTime"
import * as Duration from "effect/Duration"
import * as RefDateTime from "effect/typed/fx/RefSubject/RefDateTime"

describe("RefDateTime", () => {
  it.effect("creates and gets value", () =>
    Effect.gen(function*() {
      const value = DateTime.nowUnsafe()
      const ref = yield* RefDateTime.make(value)
      const current = yield* ref
      expect(current.epochMillis).toBe(value.epochMillis)
    }))

  it.effect("adds duration", () =>
    Effect.gen(function*() {
      const ref = yield* RefDateTime.make(DateTime.makeUnsafe(0))
      const result = yield* RefDateTime.addDuration(ref, Duration.seconds(5))
      expect(result.epochMillis).toBe(5000)
    }))

  it.effect("subtracts duration", () =>
    Effect.gen(function*() {
      const ref = yield* RefDateTime.make(DateTime.makeUnsafe(10000))
      const result = yield* RefDateTime.subtractDuration(ref, Duration.seconds(3))
      expect(result.epochMillis).toBe(7000)
    }))

  it.effect("gets epoch milliseconds", () =>
    Effect.gen(function*() {
      const ref = yield* RefDateTime.make(DateTime.makeUnsafe(12345))
      const epochMillis = yield* RefDateTime.epochMillis(ref)
      expect(epochMillis).toBe(12345)
    }))

  it.effect("checks if before", () =>
    Effect.gen(function*() {
      const ref = yield* RefDateTime.make(DateTime.makeUnsafe(1000))
      const isBefore = yield* RefDateTime.isBefore(ref, DateTime.makeUnsafe(2000))
      expect(isBefore).toBe(true)
    }))
})
