import { type Cause, Data, Effect, Layer, Option, type Scope, ServiceMap, Stream } from "effect"
import { hole } from "effect/Function"
import { map } from "effect/typed/fx/Fx/combinators/map"
import { succeed } from "effect/typed/fx/Fx/constructors/succeed"
import type * as Fx from "effect/typed/fx/Fx/Fx"
import type { RefSubject } from "effect/typed/fx/RefSubject/RefSubject"
import * as Matcher from "effect/typed/router/Matcher"
import * as Route from "effect/typed/router/Route"
import { describe, expect, it } from "tstyche"

// Test fixtures
class TestError extends Data.TaggedError("TestError")<{ readonly message: string }> {}
class OtherError extends Data.TaggedError("OtherError")<{ readonly code: number }> {}
class GuardError extends Data.TaggedError("GuardError")<{ readonly reason: string }> {}

// Routes
const usersRoute = Route.Parse("users")
const userIdRoute = Route.join(Route.Parse("users"), Route.Param("id"))
const userPostRoute = Route.join(
  Route.Parse("users"),
  Route.Param("userId"),
  Route.Parse("posts"),
  Route.Param("postId")
)
const aboutRoute = Route.Parse("about")

describe("Matcher", () => {
  describe("match with function handler", () => {
    it("infers params from route type", () => {
      const matcher = Matcher.empty.match(
        userIdRoute,
        (params) => map(params, ({ id }) => id)
      )
      expect(matcher).type.toBe<Matcher.Matcher<string, never, Scope.Scope>>()
    })

    it("infers multiple params", () => {
      const matcher = Matcher.empty.match(
        userPostRoute,
        (params) => map(params, ({ userId, postId }) => `${userId}:${postId}`)
      )
      expect(matcher).type.toBe<Matcher.Matcher<string, never, Scope.Scope>>()
    })

    it("allows Effect handler returning value", () => {
      const matcher = Matcher.empty.match(
        userIdRoute,
        (_params) => Effect.succeed("hello")
      )
      expect(matcher).type.toBe<Matcher.Matcher<string, never, Scope.Scope>>()
    })

    it("propagates Effect errors", () => {
      const matcher = Matcher.empty.match(
        userIdRoute,
        (_params) => Effect.fail(new TestError({ message: "fail" }))
      )
      expect(matcher).type.toBe<Matcher.Matcher<never, TestError, Scope.Scope>>()
    })
  })

  describe("match with value handler", () => {
    it("infers string value type", () => {
      const matcher = Matcher.empty.match(usersRoute, "users")
      expect(matcher).type.toBe<Matcher.Matcher<string, never, Scope.Scope>>()
    })

    it("infers number value type", () => {
      const matcher = Matcher.empty.match(usersRoute, 42)
      expect(matcher).type.toBe<Matcher.Matcher<number, never, Scope.Scope>>()
    })

    it("infers object value type", () => {
      const matcher = Matcher.empty.match(usersRoute, { type: "users" as const })
      expect(matcher).type.toBe<
        Matcher.Matcher<{ type: "users" }, never, Scope.Scope>
      >()
    })
  })

  describe("match with Effect/Fx/Stream handlers", () => {
    it("accepts Effect handler", () => {
      const matcher = Matcher.empty.match(usersRoute, Effect.succeed("users"))
      expect(matcher).type.toBe<Matcher.Matcher<string, never, Scope.Scope>>()
    })

    it("accepts Effect with error", () => {
      const matcher = Matcher.empty.match(
        usersRoute,
        Effect.fail(new TestError({ message: "fail" }))
      )
      expect(matcher).type.toBe<Matcher.Matcher<never, TestError, Scope.Scope>>()
    })

    it("accepts Stream handler", () => {
      const matcher = Matcher.empty.match(usersRoute, Stream.make(1, 2, 3))
      expect(matcher).type.toBe<Matcher.Matcher<1 | 2 | 3, never, Scope.Scope>>()
    })
  })

  describe("match with guard", () => {
    it("infers guard output type for handler params", () => {
      const matcher = Matcher.empty.match(
        userIdRoute,
        (input) => Effect.succeed(Option.some({ ...input, ok: true as const })),
        (params) => map(params, (p) => p.ok)
      )
      // ok is `true as const`, so result is `true` not `boolean`
      expect(matcher).type.toBe<Matcher.Matcher<true, never, Scope.Scope>>()
    })

    it("propagates guard errors", () => {
      const matcher = Matcher.empty.match(
        userIdRoute,
        (_input): Effect.Effect<Option.Option<{ validated: true }>, GuardError> =>
          Effect.fail(new GuardError({ reason: "fail" })),
        (params) => map(params, (p) => p.validated)
      )
      // validated is `true` literal type
      expect(matcher).type.toBe<
        Matcher.Matcher<true, GuardError, Scope.Scope>
      >()
    })

    it("allows value handler with guard", () => {
      const matcher = Matcher.empty.match(
        userIdRoute,
        (input) => Effect.succeed(Option.some({ ...input, ok: true as const })),
        "matched"
      )
      expect(matcher).type.toBe<Matcher.Matcher<string, never, Scope.Scope>>()
    })

    it("guard that returns Option.none skips match", () => {
      const matcher = Matcher.empty.match(
        userIdRoute,
        (_input) => Effect.succeed(Option.none()),
        "never reached"
      )
      expect(matcher).type.toBe<Matcher.Matcher<string, never, Scope.Scope>>()
    })
  })

  describe("chaining matches", () => {
    it("accumulates success types", () => {
      const matcher = Matcher.empty
        .match(usersRoute, "users")
        .match(aboutRoute, 42)
      expect(matcher).type.toBe<
        Matcher.Matcher<string | number, never, Scope.Scope>
      >()
    })

    it("accumulates error types", () => {
      const matcher = Matcher.empty
        .match(usersRoute, Effect.fail(new TestError({ message: "" })))
        .match(aboutRoute, Effect.fail(new OtherError({ code: 1 })))
      expect(matcher).type.toBe<
        Matcher.Matcher<never, TestError | OtherError, Scope.Scope>
      >()
    })

    it("accumulates success and error types", () => {
      const matcher = Matcher.empty
        .match(usersRoute, Effect.succeed("ok"))
        .match(aboutRoute, Effect.fail(new TestError({ message: "" })))
      expect(matcher).type.toBe<
        Matcher.Matcher<string | never, TestError, Scope.Scope>
      >()
    })
  })

  describe("catchCause", () => {
    it("transforms error channel", () => {
      const base = Matcher.empty.match(
        usersRoute,
        Effect.fail(new TestError({ message: "" }))
      )
      const caught = base.catchCause(() => succeed("recovered"))
      expect(caught).type.toBe<
        Matcher.Matcher<string, never, Scope.Scope>
      >()
    })

    it("can introduce new errors", () => {
      const base = Matcher.empty.match(
        usersRoute,
        Effect.fail(new TestError({ message: "" }))
      )
      const caught = base.catchCause(
        () => succeed("recovered") as Fx.Fx<string, OtherError, never>
      )
      expect(caught).type.toBe<
        Matcher.Matcher<string, OtherError, Scope.Scope>
      >()
    })
  })

  describe("catch", () => {
    it("catches errors and transforms", () => {
      const base = Matcher.empty.match(
        usersRoute,
        Effect.fail(new TestError({ message: "" }))
      )
      const caught = base.catch(() => succeed("recovered"))
      expect(caught).type.toBe<
        Matcher.Matcher<string, never, Scope.Scope>
      >()
    })
  })

  describe("catchTag", () => {
    it("narrows error type with single tag", () => {
      const base = Matcher.empty.match(
        usersRoute,
        Effect.fail(new TestError({ message: "" })) as Effect.Effect<
          never,
          TestError | OtherError
        >
      )
      const caught = base.catchTag("TestError", () => succeed("recovered"))
      expect(caught).type.toBe<
        Matcher.Matcher<string, OtherError, Scope.Scope>
      >()
    })

    it("narrows error type with multiple tags", () => {
      const base = Matcher.empty.match(
        usersRoute,
        Effect.fail(new TestError({ message: "" })) as Effect.Effect<
          never,
          TestError | OtherError | GuardError
        >
      )
      const caught = base.catchTag(["TestError", "OtherError"], () => succeed("recovered"))
      expect(caught).type.toBe<
        Matcher.Matcher<string, GuardError, Scope.Scope>
      >()
    })
  })

  describe("layout", () => {
    it("transforms output type", () => {
      const base = Matcher.empty.match(usersRoute, "users")
      const withLayout = base.layout(({ content }) => map(content, (s) => s.length))
      expect(withLayout).type.toBe<
        Matcher.Matcher<number, never, Scope.Scope>
      >()
    })

    it("preserves errors from base matcher", () => {
      const base = Matcher.empty.match(
        usersRoute,
        Effect.fail(new TestError({ message: "" }))
      )
      const withLayout = base.layout(
        ({ content }) => map(content, () => "ok")
      )
      expect(withLayout).type.toBe<
        Matcher.Matcher<string, TestError, Scope.Scope>
      >()
    })
  })

  describe("prefix", () => {
    it("preserves matcher types", () => {
      const base = Matcher.empty.match(usersRoute, "users")
      const prefixed = base.prefix(Route.Parse("api"))
      expect(prefixed).type.toBe<Matcher.Matcher<string, never, Scope.Scope>>()
    })
  })

  describe("empty matcher", () => {
    it("has never for all type parameters", () => {
      expect(Matcher.empty).type.toBe<Matcher.Matcher<never, never, never>>()
    })
  })

  describe("type helpers", () => {
    it("GuardType has correct shape", () => {
      type G = Matcher.GuardType<
        { id: string },
        { id: string; valid: boolean },
        TestError,
        never
      >
      expect(hole<G>()).type.toBe<
        (
          input: { id: string }
        ) => Effect.Effect<
          Option.Option<{ id: string; valid: boolean }>,
          TestError,
          never
        >
      >()
    })

    it("Layout has correct shape", () => {
      type L = Matcher.Layout<
        { id: string },
        string,
        TestError,
        never,
        number,
        OtherError,
        never
      >
      expect(hole<L>()).type.toBe<
        (
          params: Matcher.LayoutParams<{ id: string }, string, TestError, never>
        ) => Fx.Fx<number, OtherError, never>
      >()
    })

    it("CatchHandler has correct shape", () => {
      type C = Matcher.CatchHandler<TestError, string, OtherError, never>
      expect(hole<C>()).type.toBe<
        (
          cause: RefSubject<Cause.Cause<TestError>>
        ) => Fx.Fx<string, OtherError, never>
      >()
    })
  })

  describe("match with options object", () => {
    it("infers guard output via match(route, guard, options)", () => {
      const matcher = Matcher.empty.match(
        userIdRoute,
        (input) => Effect.succeed(Option.some({ ...input, ok: true as const })),
        { handler: (params) => map(params, (p) => p.ok) }
      )
      // handler returns p.ok which is `true` literal
      expect(matcher).type.toBe<Matcher.Matcher<true, never, Scope.Scope>>()
    })

    it("accepts function handler in options", () => {
      const matcher = Matcher.empty.match(userIdRoute, {
        handler: (params) => map(params, ({ id }) => id)
      })
      expect(matcher).type.toBe<Matcher.Matcher<string, never, Scope.Scope>>()
    })

    it("accepts value handler in options", () => {
      const matcher = Matcher.empty.match(usersRoute, { handler: "users" })
      expect(matcher).type.toBe<Matcher.Matcher<string, never, Scope.Scope>>()
    })

    it("accepts Effect handler in options", () => {
      const matcher = Matcher.empty.match(usersRoute, { handler: Effect.succeed(42) })
      expect(matcher).type.toBe<Matcher.Matcher<number, never, Scope.Scope>>()
    })

    it("accepts handler with catch in options", () => {
      const matcher = Matcher.empty.match(usersRoute, {
        handler: Effect.fail(new TestError({ message: "" })),
        catch: () => succeed("recovered")
      })
      // Error is caught and replaced with string recovery
      expect(matcher).type.toBe<Matcher.Matcher<string, never, Scope.Scope>>()
    })
  })

  describe("provide", () => {
    it("adds layer errors to error channel", () => {
      const failingLayer = Layer.effectServices(
        Effect.fail(new TestError({ message: "fail" }))
      )
      const base = Matcher.empty.match(usersRoute, "ok")
      const provided = base.provide(failingLayer)
      // Layer has no requirements, so R is never (Scope from base is excluded)
      expect(provided).type.toBe<
        Matcher.Matcher<string, TestError, never>
      >()
    })

    it("merges multiple layer errors", () => {
      const layer1 = Layer.effectServices(
        Effect.fail(new TestError({ message: "" }))
      )
      const layer2 = Layer.effectServices(
        Effect.fail(new OtherError({ code: 1 }))
      )
      const base = Matcher.empty.match(usersRoute, "ok")
      const provided = base.provide(layer1, layer2)
      expect(provided).type.toBe<
        Matcher.Matcher<string, TestError | OtherError, never>
      >()
    })
  })

  describe("match with full options object (Overload 9)", () => {
    // Note: Full options object inference requires explicit return type annotation
    // for full type safety. Tests document current behavior.
    it("accepts full options object", () => {
      const matcher = Matcher.empty.match({
        route: userIdRoute,
        handler: "value"
      })
      // Returns Matcher<any, any, any> due to inference limitations
      expect(matcher).type.toBe<Matcher.Matcher<any, any, any>>()
    })
  })

  describe("match with dependencies option", () => {
    it("adds layer errors to error channel", () => {
      const failingLayer = Layer.effectServices(
        Effect.fail(new TestError({ message: "fail" }))
      )
      const matcher = Matcher.empty.match(usersRoute, {
        handler: "ok",
        dependencies: [failingLayer]
      })
      expect(matcher).type.toBe<
        Matcher.Matcher<string, TestError, Scope.Scope>
      >()
    })

    it("merges multiple dependency errors", () => {
      const layer1 = Layer.effectServices(
        Effect.fail(new TestError({ message: "" }))
      )
      const layer2 = Layer.effectServices(
        Effect.fail(new OtherError({ code: 1 }))
      )
      const matcher = Matcher.empty.match(usersRoute, {
        handler: "ok",
        dependencies: [layer1, layer2]
      })
      expect(matcher).type.toBe<
        Matcher.Matcher<string, TestError | OtherError, Scope.Scope>
      >()
    })
  })

  // Note: layout option in match options has type inference issues due to overload
  // resolution. Use .layout() method instead for proper type inference.

  describe("provideService and provideServices", () => {
    it("provideService removes requirement from R", () => {
      class MyService extends ServiceMap.Service<MyService, { readonly value: number }>()("MyService") {}

      const base = Matcher.empty.match(usersRoute, "ok")
      const provided = base.provideService(MyService, { value: 42 })
      expect(provided).type.toBe<
        Matcher.Matcher<string, never, Exclude<Scope.Scope, MyService>>
      >()
    })

    it("provideServices removes multiple requirements from R", () => {
      class ServiceA extends ServiceMap.Service<ServiceA, { readonly a: string }>()("ServiceA") {}
      class ServiceB extends ServiceMap.Service<ServiceB, { readonly b: number }>()("ServiceB") {}

      const base = Matcher.empty.match(usersRoute, "ok")
      const services = ServiceMap.make(ServiceA, { a: "hello" }).pipe(
        ServiceMap.add(ServiceB, { b: 42 })
      )
      const provided = base.provideServices(services)
      expect(provided).type.toBe<
        Matcher.Matcher<string, never, Exclude<Scope.Scope, ServiceA | ServiceB>>
      >()
    })
  })
})
