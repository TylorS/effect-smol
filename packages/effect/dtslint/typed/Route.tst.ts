import { hole } from "effect/Function"
import * as Route from "effect/typed/router/Route"
import { describe, expect, it } from "tstyche"

describe("Route", () => {
  describe("Literal", () => {
    it("should have correct path type for simple literal", () => {
      const route = Route.Parse("users")
      expect(route.path).type.toBe<"/users">()
    })

    it("should have correct path type for multi-segment literal", () => {
      const route = Route.Parse("api/v1/users")
      expect(route.path).type.toBe<"/api/v1/users">()
    })

    it("should strip leading slashes in type", () => {
      const route = Route.Parse("/users")
      expect(route.path).type.toBe<"/users">()
    })

    it("should handle empty string as root", () => {
      const route = Route.Parse("")
      expect(route.path).type.toBe<"/">()
    })
  })

  describe("Slash", () => {
    it("should have path type /", () => {
      expect(Route.Slash.path).type.toBe<"/">()
    })
  })

  describe("Wildcard", () => {
    it("should have path type *", () => {
      expect(Route.Wildcard.path).type.toBe<"*">()
    })
  })

  describe("Param", () => {
    it("should have correct path type with colon prefix", () => {
      const route = Route.Param("id")
      expect(route.path).type.toBe<":id">()
    })

    it("should have correct path type for descriptive param", () => {
      const route = Route.Param("userId")
      expect(route.path).type.toBe<":userId">()
    })
  })

  describe("join", () => {
    it("should join literal routes with slashes", () => {
      const route = Route.join(Route.Parse("api"), Route.Parse("users"))
      expect(route.path).type.toBe<"/api/users">()
    })

    it("should join literal with param", () => {
      const route = Route.join(Route.Parse("users"), Route.Param("id"))
      expect(route.path).type.toBe<"/users/:id">()
    })

    it("should join multiple routes", () => {
      const route = Route.join(
        Route.Parse("api"),
        Route.Parse("v1"),
        Route.Parse("users"),
        Route.Param("userId"),
        Route.Parse("posts"),
        Route.Param("postId")
      )
      expect(route.path).type.toBe<"/api/v1/users/:userId/posts/:postId">()
    })

    it("should join with wildcard", () => {
      const route = Route.join(Route.Parse("files"), Route.Wildcard)
      expect(route.path).type.toBe<"/files/*">()
    })

    it("should join single route", () => {
      const route = Route.join(Route.Parse("users"))
      expect(route.path).type.toBe<"/users">()
    })

    it("should join three params", () => {
      const route = Route.join(Route.Param("a"), Route.Param("b"), Route.Param("c"))
      expect(route.path).type.toBe<"/:a/:b/:c">()
    })

    it("should join param between literals", () => {
      const route = Route.join(
        Route.Parse("users"),
        Route.Param("id"),
        Route.Parse("profile")
      )
      expect(route.path).type.toBe<"/users/:id/profile">()
    })

    it("should join wildcard at end for catch-all", () => {
      const route = Route.join(
        Route.Parse("docs"),
        Route.Param("version"),
        Route.Wildcard
      )
      expect(route.path).type.toBe<"/docs/:version/*">()
    })
  })

  describe("Route type helpers", () => {
    it("Route.Path extracts path type", () => {
      const route = Route.join(Route.Parse("users"), Route.Param("id"))
      expect(hole<Route.Route.Path<typeof route>>()).type.toBe<"/users/:id">()
    })

    it("Route.Params extracts params type", () => {
      const route = Route.join(Route.Parse("users"), Route.Param("id"))
      expect(hole<Route.Route.Params<typeof route>>()).type.toBe<{ readonly id: string }>()
    })

    it("Route.Params extracts multiple params", () => {
      const route = Route.join(
        Route.Parse("users"),
        Route.Param("userId"),
        Route.Parse("posts"),
        Route.Param("postId")
      )
      expect(hole<Route.Route.Params<typeof route>>()).type.toBe<{
        readonly userId: string
        readonly postId: string
      }>()
    })

    it("Route.Params includes wildcard", () => {
      const route = Route.join(Route.Parse("files"), Route.Wildcard)
      expect(hole<Route.Route.Params<typeof route>>()).type.toBe<{ readonly "*": string }>()
    })

    it("Route.Type extracts schema Type", () => {
      const route = Route.Param("id")
      expect(hole<Route.Route.Type<typeof route>>()).type.toBe<{ readonly id: string }>()
    })
  })

  describe("paramsSchema type", () => {
    it("Literal route has empty params", () => {
      const route = Route.Parse("users")
      expect(hole<typeof route.paramsSchema.Type>()).type.toBe<{}>()
    })

    it("Param route has string param", () => {
      const route = Route.Param("id")
      expect(hole<typeof route.paramsSchema.Type>()).type.toBe<{ readonly id: string }>()
    })

    it("Wildcard route has * param", () => {
      expect(hole<typeof Route.Wildcard.paramsSchema.Type>()).type.toBe<{ readonly "*": string }>()
    })

    it("joined route combines params", () => {
      const route = Route.join(
        Route.Parse("users"),
        Route.Param("userId"),
        Route.Parse("posts"),
        Route.Param("postId")
      )
      expect(hole<typeof route.paramsSchema.Type>()).type.toBe<{
        readonly userId: string
        readonly postId: string
      }>()
    })
  })
})
