import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import * as Result from "effect/Result"
import * as RefResult from "effect/typed/fx/RefSubject/RefResult"

describe("RefResult", () => {
  it.effect("creates and gets value", () =>
    Effect.gen(function*() {
      const value = Result.succeed(42)
      const ref = yield* RefResult.make(value)
      const current = yield* ref
      expect(Result.isSuccess(current)).toBe(true)
      if (Result.isSuccess(current)) {
        expect(current.success).toBe(42)
      }
    }))

  it.effect("sets Success value", () =>
    Effect.gen(function*() {
      const ref = yield* RefResult.make<number, string>(Result.fail("error"))
      yield* RefResult.setSuccess(ref, 10)
      const result = yield* ref
      expect(Result.isSuccess(result)).toBe(true)
      if (Result.isSuccess(result)) {
        expect(result.success).toBe(10)
      }
    }))

  it.effect("sets Failure value", () =>
    Effect.gen(function*() {
      const ref = yield* RefResult.make<number, string>(Result.succeed(42))
      yield* RefResult.setFailure(ref, "error")
      const result = yield* ref
      expect(Result.isFailure(result)).toBe(true)
      if (Result.isFailure(result)) {
        expect(result.failure).toBe("error")
      }
    }))

  it.effect("maps Success value", () =>
    Effect.gen(function*() {
      const ref = yield* RefResult.make(Result.succeed(5))
      const result = yield* RefResult.map(ref, (n) => n * 2)
      expect(Result.isSuccess(result)).toBe(true)
      if (Result.isSuccess(result)) {
        expect(result.success).toBe(10)
      }
    }))

  it.effect("checks if Success", () =>
    Effect.gen(function*() {
      const ref = yield* RefResult.make(Result.succeed(42))
      const isSuccess = yield* RefResult.isSuccess(ref)
      expect(isSuccess).toBe(true)
    }))

  it.effect("checks if Failure", () =>
    Effect.gen(function*() {
      const ref = yield* RefResult.make(Result.fail("error"))
      const isFailure = yield* RefResult.isFailure(ref)
      expect(isFailure).toBe(true)
    }))
})
