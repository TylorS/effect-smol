import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as Route from "effect/typed/router/Route"

describe("typed/router/Route", () => {
  describe("literal", () => {
    it("creates route from literal string", () => {
      const route = Route.literal("users")

      expect(route.path).toEqual("/users")
      expect(route.ast.type).toEqual("path")
    })

    it("creates route from multi-segment literal", () => {
      const route = Route.literal("api/v1/users")

      expect(route.path).toEqual("/api/v1/users")
    })
  })

  describe("slash", () => {
    it("creates root route", () => {
      expect(Route.slash.path).toEqual("/")
    })
  })

  describe("wildcard", () => {
    it("creates wildcard route", () => {
      expect(Route.wildcard.path).toEqual("/*")
    })
  })

  describe("param", () => {
    it("creates parameter route", () => {
      const route = Route.param("id")

      expect(route.path).toEqual("/:id")
    })

    it("creates parameter route with descriptive name", () => {
      const route = Route.param("userId")

      expect(route.path).toEqual("/:userId")
    })
  })

  describe("join", () => {
    it("joins literal routes", () => {
      const route = Route.join(Route.literal("api"), Route.literal("users"))

      expect(route.path).toEqual("/api/users")
    })

    it("joins literal with parameter", () => {
      const route = Route.join(Route.literal("users"), Route.param("id"))

      expect(route.path).toEqual("/users/:id")
    })

    it("joins multiple routes", () => {
      const route = Route.join(
        Route.literal("api"),
        Route.literal("v1"),
        Route.literal("users"),
        Route.param("userId"),
        Route.literal("posts"),
        Route.param("postId")
      )

      expect(route.path).toEqual("/api/v1/users/:userId/posts/:postId")
    })

    it("joins with wildcard", () => {
      const route = Route.join(Route.literal("files"), Route.wildcard)

      expect(route.path).toEqual("/files/*")
    })
  })

  describe("paramsSchema", () => {
    it.effect("decodes path params from literal route", () =>
      Effect.gen(function*() {
        const route = Route.literal("users")
        const decoded = yield* Schema.decodeEffect(route.paramsSchema)({})

        console.log({ decoded })

        expect(decoded).toEqual({})
      }))

    it.effect("decodes path params from param route", () =>
      Effect.gen(function*() {
        const route = Route.param("id")
        const decoded = yield* Schema.decodeEffect(route.paramsSchema)({ id: "123" })

        expect(decoded).toEqual({ id: "123" })
      }))

    it.effect("decodes path params from joined route", () =>
      Effect.gen(function*() {
        const route = Route.join(Route.literal("users"), Route.param("id"))
        const decoded = yield* Schema.decodeEffect(route.paramsSchema)({ id: "123" })

        expect(decoded).toEqual({ id: "123" })
      }))

    it.effect("decodes wildcard params", () =>
      Effect.gen(function*() {
        const route = Route.join(Route.literal("files"), Route.wildcard)
        const decoded = yield* Schema.decodeEffect(route.paramsSchema)({ "*": "path/to/file" })

        expect(decoded).toEqual({ "*": "path/to/file" })
      }))

    it.effect("decodes multiple params from joined route", () =>
      Effect.gen(function*() {
        const route = Route.join(
          Route.literal("users"),
          Route.param("userId"),
          Route.literal("posts"),
          Route.param("postId")
        )
        const decoded = yield* Schema.decodeEffect(route.paramsSchema)({ userId: "u1", postId: "p1" })

        expect(decoded).toEqual({ userId: "u1", postId: "p1" })
      }))
  })

  describe("pathSchema", () => {
    it.effect("decodes path-only params (excludes query)", () =>
      Effect.gen(function*() {
        const route = Route.join(Route.literal("users"), Route.param("id"))
        const decoded = yield* Schema.decodeEffect(route.pathSchema)({ id: "123" })

        expect(decoded).toEqual({ id: "123" })
      }))
  })

  describe("querySchema", () => {
    it.effect("decodes empty query schema for path-only route", () =>
      Effect.gen(function*() {
        const route = Route.join(Route.literal("users"), Route.param("id"))
        const decoded = yield* Schema.decodeEffect(route.querySchema)({})

        expect(decoded).toEqual({})
      }))
  })

  describe("pipe", () => {
    it("supports pipeable interface", () => {
      const route = Route.literal("users")
      const result = route.pipe((r) => r.path)

      expect(result).toEqual("/users")
    })
  })
})
