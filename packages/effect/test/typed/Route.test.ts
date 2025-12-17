import { describe, it } from "@effect/vitest"
import type { ParamsOf, Parse, RouteAST } from "../../src/typed/router/Route"
import type { Equals } from "../../src/types/Types"

describe("Route", () => {
  describe("Parse", () => {
    it("parses static paths", () => {
      type Actual = Parse<"/users">
      type Expected = RouteAST.Sequence<[RouteAST.Literal<"">, RouteAST.Literal<"users">]>
      const test: Equals<Actual, Expected> = true
    })

    it("parses params", () => {
      type Actual = Parse<"/users/:id">
      type Expected = RouteAST.Sequence<[RouteAST.Literal<"">, RouteAST.Literal<"users">, RouteAST.Parameter<"id">]>
      const test: Equals<Actual, Expected> = true
    })

    it("parses params with regex", () => {
      type Actual = Parse<"/users/:id(\\d+)">
      type Expected = RouteAST.Sequence<[RouteAST.Literal<"">, RouteAST.Literal<"users">, RouteAST.ParameterWithRegex<"id", "\\d+">]>
      const test: Equals<Actual, Expected> = true
    })
    
    it("parses query params", () => {
       type Actual = Parse<"/users?page=:page">
       type Expected = RouteAST.QueryParams<
         RouteAST.Sequence<[RouteAST.Literal<"">, RouteAST.Literal<"users">]>,
         [RouteAST.QueryParam<"page", RouteAST.Parameter<"page">>]
       >
       const test: Equals<Actual, Expected> = true
    })
  })

  describe("ParamsOf", () => {
    it("extracts params", () => {
      type Actual = ParamsOf<"/users/:id">
      type Expected = { id: string }
      const test: Equals<Actual, Expected> = true
    })

    it("extracts query params", () => {
      type Actual = ParamsOf<"/users?page=:page&sort=:sort">
      type Expected = { page: string; sort: string }
      const test: Equals<Actual, Expected> = true
    })

    it("extracts mixed params", () => {
      type Actual = ParamsOf<"/users/:userId/posts/:postId?draft=:draft">
      type Expected = { userId: string; postId: string; draft: string }
      const test: Equals<Actual, Expected> = true
    })
  })
})
