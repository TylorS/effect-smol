import { Fx, RefSubject } from "@typed/fx"
import { describe, expect, it } from "@typed/vitest"
import { Effect, Fiber } from "effect"
import { TestClock } from "effect/testing"

describe("RefSubject", () => {
  it.effect("tracks an initial value", () =>
    Effect.gen(function*() {
      const ref = yield* RefSubject.make(0)
      expect(yield* ref).toEqual(0)

      // Can be updated
      expect(yield* ref.pipe(RefSubject.update((n) => n + 1))).toEqual(1)
      expect(yield* ref).toEqual(1)

      // Can be reset
      yield* RefSubject.reset(ref)
      expect(yield* ref).toEqual(0)
    }))

  it.effect("tracks an initial effect", () =>
    Effect.gen(function*() {
      const ref = yield* RefSubject.make(Effect.callback<number>((resume) => {
        const id = setTimeout(() => resume(Effect.succeed(1)), 100)
        return Effect.sync(() => clearTimeout(id))
      }))
      const fiber = yield* Effect.fork(ref.asEffect())
      expect(yield* Fiber.join(fiber)).toEqual(1)
    }))

  it.effect("tracks updates to an fx", () =>
    Effect.gen(function*() {
      const fx = Fx.mergeAll(
        Fx.succeed(1),
        Fx.at(2, 100),
        Fx.at(3, 200)
      )

      const ref = yield* RefSubject.make(fx)
      expect(yield* ref).toEqual(1)
      yield* TestClock.adjust(100)
      expect(yield* ref).toEqual(2)
      yield* TestClock.adjust(100)
      expect(yield* ref).toEqual(3)
    }))
})
