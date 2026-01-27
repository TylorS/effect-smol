import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import * as RefBoolean from "effect/typed/fx/RefSubject/RefBoolean"

describe("RefBoolean", () => {
  it.effect("creates and gets value", () =>
    Effect.gen(function* () {
      const ref = yield* RefBoolean.make(true)
      const current = yield* ref
      expect(current).toBe(true)
    }))

  it.effect("toggles boolean value", () =>
    Effect.gen(function* () {
      const ref = yield* RefBoolean.make(true)
      yield* RefBoolean.toggle(ref)
      const result = yield* ref
      expect(result).toBe(false)
    }))

  it.effect("sets to true", () =>
    Effect.gen(function* () {
      const ref = yield* RefBoolean.make(false)
      yield* RefBoolean.setTrue(ref)
      const result = yield* ref
      expect(result).toBe(true)
    }))

  it.effect("sets to false", () =>
    Effect.gen(function* () {
      const ref = yield* RefBoolean.make(true)
      yield* RefBoolean.setFalse(ref)
      const result = yield* ref
      expect(result).toBe(false)
    }))

  it.effect("applies AND operation", () =>
    Effect.gen(function* () {
      const ref = yield* RefBoolean.make(true)
      const result = yield* RefBoolean.and(ref, false)
      expect(result).toBe(false)
    }))

  it.effect("applies OR operation", () =>
    Effect.gen(function* () {
      const ref = yield* RefBoolean.make(false)
      const result = yield* RefBoolean.or(ref, true)
      expect(result).toBe(true)
    }))

  it.effect("checks if true", () =>
    Effect.gen(function* () {
      const ref = yield* RefBoolean.make(true)
      const isTrue = yield* RefBoolean.isTrue(ref)
      expect(isTrue).toBe(true)
    }))
})
