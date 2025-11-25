import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import * as Fx from "effect/typed/fx/Fx"
import * as Versioned from "effect/typed/fx/Versioned/"

describe("Versioned", () => {
  describe("Service", () => {
    it.effect("should allow defining a Versioned as a Service", () =>
      Effect.gen(function*() {
        class MyVersioned extends Versioned.Service<MyVersioned, never, number, never, number>()(
          "MyVersioned"
        ) {}

        const layer = MyVersioned.make(
          Effect.succeed(1),
          Fx.succeed(42),
          Effect.succeed(42)
        )

        yield* Effect.gen(function*() {
          expect(yield* MyVersioned).toEqual(42)
          expect(yield* MyVersioned.version).toEqual(1)
          expect(yield* Fx.collectAll(MyVersioned)).toEqual([42])
        }).pipe(Effect.provide(layer))
      }))
  })
})
