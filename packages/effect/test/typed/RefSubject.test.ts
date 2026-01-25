import { describe, expect, it } from "@effect/vitest"
import { Effect, Fiber } from "effect"
import { TestClock } from "effect/testing"
import { Fx, RefSubject } from "effect/typed/fx"

describe("RefSubject", () => {
  it.effect("tracks an initial value", () => {
    return Effect.gen(function* () {
      const ref = yield* RefSubject.make(0)
      expect(yield* ref).toEqual(0)

      // Can be updated
      expect(yield* ref.pipe(RefSubject.update((n) => n + 1))).toEqual(1)
      expect(yield* ref).toEqual(1)

      // Can be reset
      yield* RefSubject.reset(ref)
      expect(yield* ref).toEqual(0)
    })
  })

  it.effect("tracks an initial effect", () =>
    Effect.gen(function* () {
      const ref = yield* RefSubject.make(Effect.callback<number>((resume) => {
        const id = setTimeout(() => resume(Effect.succeed(1)), 100)
        return Effect.sync(() => clearTimeout(id))
      }))
      const fiber = yield* Effect.forkChild(ref.asEffect())
      expect(yield* Fiber.join(fiber)).toEqual(1)
    }))

  it.effect("tracks updates to an fx", () =>
    Effect.gen(function* () {
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

  it.effect("transform invariantly maps RefSubject", () =>
    Effect.gen(function* () {
      const count = yield* RefSubject.make(5)
      const countStr = RefSubject.transform(
        count,
        (n) => n.toString(),
        (s) => parseInt(s, 10)
      )

      expect(yield* countStr).toEqual("5")
      expect(yield* count).toEqual(5)

      yield* RefSubject.set(countStr, "10")
      expect(yield* countStr).toEqual("10")
      expect(yield* count).toEqual(10)

      yield* RefSubject.set(count, 20)
      expect(yield* countStr).toEqual("20")
      expect(yield* count).toEqual(20)
    }))
})
