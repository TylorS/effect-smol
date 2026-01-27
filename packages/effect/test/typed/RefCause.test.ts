import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import * as Cause from "effect/Cause"
import type * as Scope from "effect/Scope"
import * as RefCause from "effect/typed/fx/RefSubject/RefCause"

describe("RefCause", () => {
  it.effect("creates and gets value", (): Effect.Effect<void, unknown, Scope.Scope> =>
    Effect.gen(function*() {
      const value = Cause.fail("error")
      const ref = yield* RefCause.make(value)
      const current = yield* ref
      expect(Cause.hasFail(current)).toBe(true)
    }))

  it.effect("sets Fail cause", (): Effect.Effect<void, unknown, Scope.Scope> =>
    Effect.gen(function*() {
      const ref = yield* RefCause.make<string, unknown, Scope.Scope>(Cause.empty)
      yield* RefCause.setFail(ref, "error")
      const result = yield* ref
      expect(Cause.hasFail(result)).toBe(true)
    }))

  it.effect("sets Die cause", (): Effect.Effect<void, unknown, Scope.Scope> =>
    Effect.gen(function*() {
      const ref = yield* RefCause.make(Cause.empty)
      yield* RefCause.setDie(ref, new Error("defect"))
      const result = yield* ref
      expect(Cause.hasDie(result)).toBe(true)
    }))

  it.effect("sets Interrupt cause", (): Effect.Effect<void, unknown, Scope.Scope> =>
    Effect.gen(function*() {
      const ref = yield* RefCause.make(Cause.empty)
      yield* RefCause.setInterrupt(ref, 123)
      const result = yield* ref
      expect(Cause.hasInterrupt(result)).toBe(true)
    }))

  it.effect("checks if has Fail", (): Effect.Effect<void, unknown, Scope.Scope> =>
    Effect.gen(function*() {
      const ref = yield* RefCause.make(Cause.fail("error"))
      const hasFail = yield* RefCause.hasFail(ref)
      expect(hasFail).toBe(true)
    }))

  it.effect("checks size", (): Effect.Effect<void, unknown, Scope.Scope> =>
    Effect.gen(function*() {
      const ref = yield* RefCause.make(Cause.fail("error"))
      const size = yield* RefCause.size(ref)
      expect(size).toBe(1)
    }))
})
