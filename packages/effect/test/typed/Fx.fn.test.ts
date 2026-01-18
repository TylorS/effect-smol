import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"

describe("Fx", () => {
  describe("fn", () => {
    it.effect("generator returns an Fx", () =>
      Effect.gen(function* () {
        const makeFx = Fx.fn(function* (n: number) {
          const next = yield* Effect.succeed(n + 1)
          return Fx.succeed(next)
        })

        const result = yield* Fx.collectAll(makeFx(1))
        assert.deepStrictEqual(result, [2])
      }))

    it.effect("non-generator returns an Fx", () =>
      Effect.gen(function* () {
        const makeFx = Fx.fn((n: number) => Fx.succeed(n))

        const result = yield* Fx.collectAll(makeFx(3))
        assert.deepStrictEqual(result, [3])
      }))

    it.effect("named variant supports generator bodies", () =>
      Effect.gen(function* () {
        const makeFx = Fx.fn("Fx.fn (named)")(function* (input: string) {
          return Fx.succeed(input)
        })

        const result = yield* Fx.collectAll(makeFx("ok"))
        assert.deepStrictEqual(result, ["ok"])
      }))

    it.effect("pipeables compose over the returned Fx", () =>
      Effect.gen(function* () {
        const makeFx = Fx.fn(
          function* (n: number) {
            const next = yield* Effect.succeed(n + 1)
            return Fx.succeed(next)
          },
          Fx.map((n) => n * 2)
        )

        const result = yield* Fx.collectAll(makeFx(1))
        assert.deepStrictEqual(result, [4])
      }))
  })
})
