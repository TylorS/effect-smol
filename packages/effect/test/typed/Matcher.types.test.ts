import { describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import type * as Scope from "effect/Scope"
import { map } from "effect/typed/fx/Fx/combinators/map"
import { succeed } from "effect/typed/fx/Fx/constructors/succeed"
import * as Matcher from "effect/typed/router/Matcher"
import * as Route from "effect/typed/router/Route"

describe("typed/router/Matcher types", () => {
  it("infers params from route via match(route, handler)", () => {
    const users = Route.join(Route.Parse("users"), Route.Param("id"))
    const matcher = Matcher.empty.match(
      users,
      (params) => map(params, ({ id }) => id)
    )

    const _check: Matcher.Matcher<string, never, Scope.Scope> = matcher
    void matcher
    void _check
  })

  it("infers guard output via match(route, guard, handler)", () => {
    const users = Route.join(Route.Parse("users"), Route.Param("id"))
    const matcher = Matcher.empty.match(
      users,
      (input) => Effect.succeed(Option.some({ ...input, ok: true as const })),
      (params) => map(params, (p) => p.ok)
    )

    const _check: Matcher.Matcher<true, never, Scope.Scope> = matcher
    void matcher
    void _check
  })

  it("accepts layout, dependencies, and catch via match(route, options)", () => {
    const matcher = Matcher.empty.match(
      Route.Parse("about"),
      {
        handler: "ok",
        layout: ({ content }) => map(content, (value) => value.length),
        dependencies: [],
        catch: () => succeed(0)
      }
    )

    const _check: Matcher.Matcher<string | number, never, Scope.Scope> = matcher
    void matcher
    void _check
  })

  it("accepts match(route, guard, options)", () => {
    const users = Route.join(Route.Parse("users"), Route.Param("id"))
    // Note: options-object form has weaker inference, use direct handler for better types
    const matcher = Matcher.empty.match(
      users,
      (input) => Effect.succeed(Option.some({ ...input, ok: true as const })),
      {
        handler: (params) => map(params, (p) => p.ok)
      }
    )

    // Type inference for options object is more general
    void (matcher satisfies Matcher.Matcher<any, any, any>)
  })

  it("rejects guard arrays and missing handlers", () => {
    const users = Route.join(Route.Parse("users"), Route.Param("id"))

    // @ts-expect-error guard arrays are not supported
    Matcher.empty.match(users, [Effect.succeedSome, Effect.succeedSome], (params) => map(params, ({ id }) => id))

    // @ts-expect-error handler is required
    Matcher.empty.match(users, { layout: ({ content }) => content })
  })
})
