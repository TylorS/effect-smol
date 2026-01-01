import { describe, expect, it } from "vitest"

import * as AST from "effect/typed/router/AST"
import * as Path from "effect/typed/router/Path"

describe("typed/router/Path", () => {
  describe("parseWithRest", () => {
    it("parses literals and parameters", () => {
      const [asts, rest] = Path.parseWithRest("/users/:id")

      expect(asts).toEqual([AST.literal("users"), AST.parameter("id")])
      expect(rest).toEqual("")
    })

    it("parses wildcard segments", () => {
      const [asts, rest] = Path.parseWithRest("/files/*")

      expect(asts).toEqual([AST.literal("files"), AST.wildcard()])
      expect(rest).toEqual("")
    })

    it("parses parameters with regex and optional mark", () => {
      const [asts, rest] = Path.parseWithRest("/:id(\\d+)?")

      expect(asts).toEqual([AST.parameter("id", true, "\\d+")])
      expect(rest).toEqual("")
    })

    it("parses query params with literal, parameter, and wildcard values", () => {
      const [asts, rest] = Path.parseWithRest("/search?term=:term&limit=10&rest=*")

      expect(asts).toEqual([
        AST.literal("search"),
        AST.queryParams([
          AST.queryParam("term", AST.parameter("term")),
          AST.queryParam("limit", AST.literal("10")),
          AST.queryParam("rest", AST.wildcard())
        ])
      ])
      expect(rest).toEqual("")
    })

    it("stops parsing query params when a tail param can't be parsed, leaving '&' for the outer parser", () => {
      const [asts, rest] = Path.parseWithRest("/?a=b&")

      expect(asts).toEqual([AST.queryParams([AST.queryParam("a", AST.literal("b"))]), AST.literal("&")])
      expect(rest).toEqual("")
    })
  })

  describe("parse", () => {
    it("accepts a root path", () => {
      expect(Path.parse("/")).toEqual([])
    })

    it("throws when unparsed rest contains non-slash characters", () => {
      expect(() => Path.parse("/:")).toThrow()
    })
  })
})
