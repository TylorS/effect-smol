import { hole } from "effect/Function"
import type * as Path from "effect/typed/router/Path"
import { describe, expect, it } from "tstyche"

describe("Path", () => {
  describe("Parse", () => {
    it("should parse a path", () => {
      expect(hole<Path.Params<"/users/:id">>()).type.toBe<{ readonly id: string }>()
    })

    it("should parse a path with a query param", () => {
      expect(hole<Path.Params<"/users/:id/?page=:page?&sort=:sort?">>()).type.toBe<
        { readonly id: string; readonly page?: string; readonly sort?: string }
      >()
    })

    it("should parse a path with a wildcard", () => {
      expect(hole<Path.Params<"/users/*">>()).type.toBe<{ readonly "*": string }>()
    })

    it("should parse a path with a regex param", () => {
      expect(hole<Path.Params<"/users/:id(\\d+)">>()).type.toBe<{ readonly id: string }>()
    })
  })
})
