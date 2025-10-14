import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Fx from "effect/typed/fx"
import * as Subject from "effect/typed/fx/subject"

describe("Subject", () => {
  it.effect(
    "allows imperatively sending events",
    Effect.fn(function*() {
      const subject = yield* Subject.make<number>()
      const values = yield* Fx.collectAllFork(subject)

      yield* subject.onSuccess(1)
      yield* subject.onSuccess(2)
      yield* subject.onSuccess(3)
      yield* subject.interrupt

      expect(yield* Fiber.join(values)).toEqual([1, 2, 3])
    })
  )

  it.effect(
    "supports replaying events",
    Effect.fn(function*() {
      const subject = yield* Subject.make<number>(1)
      const values1 = yield* Fx.collectAllFork(subject)
      yield* subject.onSuccess(1)
      const values2 = yield* Fx.collectAllFork(subject)
      yield* subject.onSuccess(2)
      yield* subject.onSuccess(3)
      yield* subject.interrupt

      const expected = [1, 2, 3]

      expect(yield* Fiber.join(values1)).toEqual(expected)
      expect(yield* Fiber.join(values2)).toEqual(expected)
    })
  )
})
