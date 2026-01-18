import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Ref from "effect/Ref"
import { map } from "effect/typed/fx/Fx/combinators/map"
import { take } from "effect/typed/fx/Fx/combinators/take"
import { unwrap } from "effect/typed/fx/Fx/combinators/unwrap"
import { collectAll } from "effect/typed/fx/Fx/run/collect"
import { observe } from "effect/typed/fx/Fx/run/observe"
import { CurrentPath } from "effect/typed/router/CurrentPath"
import { CurrentRoute } from "effect/typed/router/CurrentRoute"
import * as Matcher from "effect/typed/router/Matcher"
import * as Route from "effect/typed/router/Route"

describe("typed/router/Matcher", () => {
  it.live("matches routes and emits values as the path changes", () =>
    Effect.gen(function* () {
      const users = Route.join(Route.Parse("users"), Route.Param("id"))
      const about = Route.Parse("about")

      const fx = Matcher.run(
        Matcher.empty
          .match(users, (params) => map(params, ({ id }) => `users:${id}`))
          .match(about, "about")
      )

      const values: Array<string> = []
      const first = Effect.makeLatchUnsafe()
      const done = Effect.makeLatchUnsafe()
      const fiber = yield* Effect.forkChild(observe(fx, (value) =>
        Effect.sync(() => {
          values.push(value)
        }).pipe(
          Effect.flatMap(() => {
            if (values.length === 1) return first.open
            if (values.length === 2) return done.open
            return Effect.void
          })
        )))
      yield* Effect.yieldNow

      yield* first.await
      yield* CurrentPath.onSuccess("/about")

      yield* done.await
      yield* Fiber.interrupt(fiber)

      expect(values).toEqual(["users:1", "about"])
    }).pipe(Effect.provide(Layer.mergeAll(
      CurrentRoute.Default(),
      CurrentPath.make("/users/1")
    ))))

  it.effect("fails with RouteNotFound when no route matches", () =>
    Effect.gen(function* () {
      const route = Route.Parse("about")
      const fx = Matcher.run(Matcher.empty.match(route, "about"))

      const result = yield* collectAll(take(fx, 1)).pipe(
        Effect.as("matched" as const),
        Effect.catchTag("RouteNotFound", (e) => Effect.succeed(e.path))
      )

      expect(result).toEqual("/nope")
    }).pipe(Effect.provide(Layer.mergeAll(
      CurrentRoute.Default(),
      CurrentPath.make("/nope")
    ))))

  it.live("updates params without re-running the handler for the same route", () =>
    Effect.gen(function* () {
      const mounts = yield* Ref.make(0)
      const users = Route.join(Route.Parse("users"), Route.Param("id"))

      const matcher = Matcher.empty.match(users, (params) =>
        unwrap(
          Ref.update(mounts, (n) => n + 1).pipe(
            Effect.as(map(params, ({ id }) => id))
          )
        ))

      const fx = Matcher.run(matcher)

      const values: Array<string> = []
      const first = Effect.makeLatchUnsafe()
      const done = Effect.makeLatchUnsafe()
      const fiber = yield* Effect.forkChild(observe(fx, (value) =>
        Effect.sync(() => {
          values.push(value)
        }).pipe(
          Effect.flatMap(() => {
            if (values.length === 1) return first.open
            if (values.length === 2) return done.open
            return Effect.void
          })
        )))
      yield* Effect.yieldNow

      yield* first.await
      yield* CurrentPath.onSuccess("/users/2")

      yield* done.await
      yield* Fiber.interrupt(fiber)

      expect(values).toEqual(["1", "2"])
      expect(yield* Ref.get(mounts)).toEqual(1)
    }).pipe(Effect.provide(Layer.mergeAll(
      CurrentRoute.Default(),
      CurrentPath.make("/users/1")
    ))))
})
