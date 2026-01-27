import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import * as Duration from "effect/Duration"
import * as RefDuration from "effect/typed/fx/RefSubject/RefDuration"

describe("RefDuration", () => {
  it.effect("creates and gets value", () =>
    Effect.gen(function*() {
      const value = Duration.seconds(5)
      const ref = yield* RefDuration.make(value)
      const current = yield* ref
      expect(Duration.equals(current, value)).toBe(true)
    }))

  it.effect("adds two durations", () =>
    Effect.gen(function*() {
      const ref = yield* RefDuration.make(Duration.seconds(5))
      const result = yield* RefDuration.add(ref, Duration.seconds(3))
      expect(Duration.toSeconds(result)).toBe(8)
    }))

  it.effect("subtracts two durations", () =>
    Effect.gen(function*() {
      const ref = yield* RefDuration.make(Duration.seconds(10))
      const result = yield* RefDuration.subtract(ref, Duration.seconds(3))
      expect(Duration.toSeconds(result)).toBe(7)
    }))

  it.effect("multiplies duration by number", () =>
    Effect.gen(function*() {
      const ref = yield* RefDuration.make(Duration.seconds(5))
      const result = yield* RefDuration.multiply(ref, 2)
      expect(Duration.toSeconds(result)).toBe(10)
    }))

  it.effect("checks if zero", () =>
    Effect.gen(function*() {
      const ref = yield* RefDuration.make(Duration.zero)
      const isZero = yield* RefDuration.isZero(ref)
      expect(isZero).toBe(true)
    }))

  it.effect("gets seconds", () =>
    Effect.gen(function*() {
      const ref = yield* RefDuration.make(Duration.seconds(5))
      const seconds = yield* RefDuration.seconds(ref)
      expect(seconds).toBe(5)
    }))
})
