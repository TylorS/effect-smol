import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { Fx, Push, Sink } from "effect/typed/fx"

describe("Push", () => {
  describe("Service", () => {
    it.effect("should allow defining a Push as a Service", () =>
      Effect.gen(function*() {
        class MyPush extends Push.Service<MyPush, number, never, string, never>()("MyPush") {}

        const layer = MyPush.make(
          Sink.make(
            () => Effect.void,
            () => Effect.void
          ),
          Fx.succeed("foo")
        )

        const result = yield* Fx.collectAll(MyPush).pipe(Effect.provide(layer))
        expect(result).toEqual(["foo"])
      }))
  })
})
