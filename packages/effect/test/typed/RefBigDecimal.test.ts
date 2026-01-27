import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import type * as Scope from "effect/Scope"
import * as BigDecimal from "effect/BigDecimal"
import * as RefBigDecimal from "effect/typed/fx/RefSubject/RefBigDecimal"

describe("RefBigDecimal", () => {
  it.effect("creates and gets value", (): Effect.Effect<void, unknown, Scope.Scope> =>
    Effect.gen(function* () {
      const value = BigDecimal.fromStringUnsafe("123.45")
      const ref = yield* RefBigDecimal.make(value)
      const current = yield* ref
      expect(BigDecimal.equals(current, value)).toBe(true)
    }))

  it.effect("adds two BigDecimal values", (): Effect.Effect<void, unknown, Scope.Scope> =>
    Effect.gen(function* () {
      const ref = yield* RefBigDecimal.make(BigDecimal.fromStringUnsafe("10.5"))
      const result = yield* RefBigDecimal.add(ref, BigDecimal.fromStringUnsafe("5.25"))
      expect(BigDecimal.format(result)).toBe("15.75")
    }))

  it.effect("subtracts two BigDecimal values", (): Effect.Effect<void, unknown, Scope.Scope> =>
    Effect.gen(function* () {
      const ref = yield* RefBigDecimal.make(BigDecimal.fromStringUnsafe("10.5"))
      const result = yield* RefBigDecimal.subtract(ref, BigDecimal.fromStringUnsafe("3.25"))
      expect(BigDecimal.format(result)).toBe("7.25")
    }))

  it.effect("multiplies two BigDecimal values", (): Effect.Effect<void, unknown, Scope.Scope> =>
    Effect.gen(function* () {
      const ref = yield* RefBigDecimal.make(BigDecimal.fromStringUnsafe("2.5"))
      const result = yield* RefBigDecimal.multiply(ref, BigDecimal.fromStringUnsafe("4"))
      expect(BigDecimal.format(result)).toBe("10")
    }))

  it.effect("gets absolute value", (): Effect.Effect<void, unknown, Scope.Scope> =>
    Effect.gen(function* () {
      const ref = yield* RefBigDecimal.make(BigDecimal.fromStringUnsafe("-5.5"))
      const result = yield* RefBigDecimal.abs(ref)
      expect(BigDecimal.format(result)).toBe("5.5")
    }))

  it.effect("checks if zero", (): Effect.Effect<void, unknown, Scope.Scope> =>
    Effect.gen(function* () {
      const ref = yield* RefBigDecimal.make(BigDecimal.fromStringUnsafe("0"))
      const isZero = yield* RefBigDecimal.isZero(ref)
      expect(isZero).toBe(true)
    }))

  it.effect("checks if less than", (): Effect.Effect<void, unknown, Scope.Scope> =>
    Effect.gen(function* () {
      const ref = yield* RefBigDecimal.make(BigDecimal.fromStringUnsafe("5"))
      const isLess = yield* RefBigDecimal.isLessThan(ref, BigDecimal.fromStringUnsafe("10"))
      expect(isLess).toBe(true)
    }))
})
