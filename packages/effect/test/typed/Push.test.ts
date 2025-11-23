import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import * as Fx from "effect/typed/fx/Fx"
import * as Push from "effect/typed/fx/Push"
import * as Sink from "effect/typed/fx/Sink"

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

