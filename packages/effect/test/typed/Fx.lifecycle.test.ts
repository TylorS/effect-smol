import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Ref from "effect/Ref"
import { Fx } from "effect/typed/fx"

describe("Fx", () => {
  describe("lifecycle hooks", () => {
    it.effect("onExit runs on success", () =>
      Effect.gen(function*() {
        const tag = yield* Ref.make("unset")

        const fx = Fx.fromIterable([1]).pipe(
          Fx.onExit((exit) => Ref.set(tag, Exit.isSuccess(exit) ? "success" : "failure"))
        )

        const result = yield* Fx.collectAll(fx)
        assert.deepStrictEqual(result, [1])
        assert.strictEqual(yield* Ref.get(tag), "success")
      }))

    it.effect("onExit runs on failure", () =>
      Effect.gen(function*() {
        const tag = yield* Ref.make("unset")

        const fx = Fx.fail("boom").pipe(
          Fx.onExit((exit) => Ref.set(tag, Exit.isFailure(exit) ? "failure" : "success"))
        )

        const exit = yield* Effect.exit(Fx.collectAll(fx))
        assert(Exit.isFailure(exit))
        assert.strictEqual(yield* Ref.get(tag), "failure")
      }))

    it.effect("onInterrupt runs when interrupted", () =>
      Effect.gen(function*() {
        const interrupted = yield* Ref.make(false)

        const fiber = yield* Fx.never.pipe(
          Fx.onInterrupt(() => Ref.set(interrupted, true)),
          Fx.collectAllFork
        )

        yield* Fiber.interrupt(fiber)
        assert.isTrue(yield* Ref.get(interrupted))
      }))

    it.effect("onError runs only on failure", () =>
      Effect.gen(function*() {
        const count = yield* Ref.make(0)

        yield* Fx.fromIterable([1]).pipe(
          Fx.onError(() => Ref.update(count, (n) => n + 1)),
          Fx.collectAll
        )
        assert.strictEqual(yield* Ref.get(count), 0)

        const exit = yield* Effect.exit(
          Fx.fail("boom").pipe(
            Fx.onError(() => Ref.update(count, (n) => n + 1)),
            Fx.collectAll
          )
        )
        assert(Exit.isFailure(exit))
        assert.strictEqual(yield* Ref.get(count), 1)
      }))

    it.effect("ensuring runs when interrupted", () =>
      Effect.gen(function*() {
        const ensured = yield* Ref.make(false)

        const fiber = yield* Fx.never.pipe(
          Fx.ensuring(Ref.set(ensured, true)),
          Fx.collectAllFork
        )

        yield* Fiber.interrupt(fiber)
        assert.isTrue(yield* Ref.get(ensured))
      }))
  })
})
