import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import * as RefString from "effect/typed/fx/RefSubject/RefString"

describe("RefString", () => {
  it.effect("creates and gets value", () =>
    Effect.gen(function*() {
      const ref = yield* RefString.make("hello")
      const current = yield* ref
      expect(current).toBe("hello")
    }))

  it.effect("concatenates strings", () =>
    Effect.gen(function*() {
      const ref = yield* RefString.make("hello")
      const result = yield* RefString.concat(ref, " world")
      expect(result).toBe("hello world")
    }))

  it.effect("converts to uppercase", () =>
    Effect.gen(function*() {
      const ref = yield* RefString.make("hello")
      const result = yield* RefString.toUpperCase(ref)
      expect(result).toBe("HELLO")
    }))

  it.effect("converts to lowercase", () =>
    Effect.gen(function*() {
      const ref = yield* RefString.make("HELLO")
      const result = yield* RefString.toLowerCase(ref)
      expect(result).toBe("hello")
    }))

  it.effect("trims whitespace", () =>
    Effect.gen(function*() {
      const ref = yield* RefString.make("  hello  ")
      const result = yield* RefString.trim(ref)
      expect(result).toBe("hello")
    }))

  it.effect("checks if empty", () =>
    Effect.gen(function*() {
      const ref = yield* RefString.make("")
      const isEmpty = yield* RefString.isEmpty(ref)
      expect(isEmpty).toBe(true)
    }))

  it.effect("checks length", () =>
    Effect.gen(function*() {
      const ref = yield* RefString.make("hello")
      const length = yield* RefString.length(ref)
      expect(length).toBe(5)
    }))

  it.effect("checks startsWith", () =>
    Effect.gen(function*() {
      const ref = yield* RefString.make("hello")
      const startsWith = yield* RefString.startsWith(ref, "he")
      expect(startsWith).toBe(true)
    }))
})
