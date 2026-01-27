import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import type * as Scope from "effect/Scope"
import * as Tuple from "effect/Tuple"
import * as RefTuple from "effect/typed/fx/RefSubject/RefTuple"

describe("RefTuple", () => {
  it.effect("creates and gets value", () =>
    Effect.gen(function* () {
      const value = Tuple.make(1, "hello", true)
      const ref = yield* RefTuple.make(value)
      const current = yield* ref
      expect(current).toEqual(value)
    }))

  it.effect("sets value at index", () =>
    Effect.gen(function* () {
      const ref = yield* RefTuple.make(Tuple.make(1, "hello", true))
      yield* RefTuple.setAt(ref, 1, "world")
      const result = yield* ref
      expect(result[1]).toBe("world")
      expect(result[0]).toBe(1)
      expect(result[2]).toBe(true)
    }))

  it.effect("updates value at index", () =>
    Effect.gen(function* () {
      const ref = yield* RefTuple.make(Tuple.make(1, 2, 3))
      yield* RefTuple.updateAt(ref, 1, (n) => n * 2)
      const result = yield* ref
      expect(result[1]).toBe(4)
    }))

  it.effect("appends element", () =>
    Effect.gen(function* () {
      const ref = yield* RefTuple.make(Tuple.make(1, 2))
      const result = yield* RefTuple.appendElement(ref, 3)
      expect(result).toEqual([1, 2, 3])
    }))

  it.effect("prepends element", () =>
    Effect.gen(function* () {
      const ref = yield* RefTuple.make(Tuple.make(2, 3))
      const result = yield* RefTuple.prependElement(ref, 1)
      expect(result).toEqual([1, 2, 3])
    }))

  it.effect("gets element at index", () =>
    Effect.gen(function* () {
      const ref = yield* RefTuple.make(Tuple.make(1, "hello", true))
      const value = yield* RefTuple.get(ref, 1)
      expect(value).toBe("hello")
    }))

  it.effect("gets length", () =>
    Effect.gen(function* () {
      const ref = yield* RefTuple.make(Tuple.make(1, 2, 3))
      const length = yield* RefTuple.length(ref)
      expect(length).toBe(3)
    }))
})
