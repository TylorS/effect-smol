import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import * as RefStruct from "effect/typed/fx/RefSubject/RefStruct"

describe("RefStruct", () => {
  it.effect("creates and gets value", () =>
    Effect.gen(function*() {
      const value = { name: "John", age: 30 }
      const ref = yield* RefStruct.make(value)
      const current = yield* ref
      expect(current).toEqual(value)
    }))

  it.effect("sets a property", () =>
    Effect.gen(function*() {
      const ref = yield* RefStruct.make({ name: "John", age: 30 })
      yield* RefStruct.set(ref, "age", 31)
      const result = yield* ref
      expect(result.age).toBe(31)
      expect(result.name).toBe("John")
    }))

  it.effect("updates a property", () =>
    Effect.gen(function*() {
      const ref = yield* RefStruct.make({ name: "John", age: 30 })
      yield* RefStruct.update(ref, "age", (n) => n + 1)
      const result = yield* ref
      expect(result.age).toBe(31)
    }))

  it.effect("merges structs", () =>
    Effect.gen(function*() {
      const ref = yield* RefStruct.make({ name: "John", age: 30 })
      yield* RefStruct.merge(ref, { age: 31, city: "NYC" })
      const result = yield* ref
      expect(result.age).toBe(31)
      expect(result.name).toBe("John")
    }))

  it.effect("gets a property", () =>
    Effect.gen(function*() {
      const ref = yield* RefStruct.make({ name: "John", age: 30 })
      const name = yield* RefStruct.get(ref, "name")
      expect(name).toBe("John")
    }))

  it.effect("gets keys", () =>
    Effect.gen(function*() {
      const ref = yield* RefStruct.make({ name: "John", age: 30 })
      const keys = yield* RefStruct.keys(ref)
      expect(keys.sort()).toEqual(["age", "name"])
    }))

  it.effect("checks size", () =>
    Effect.gen(function*() {
      const ref = yield* RefStruct.make({ name: "John", age: 30 })
      const size = yield* RefStruct.size(ref)
      expect(size).toBe(2)
    }))
})
