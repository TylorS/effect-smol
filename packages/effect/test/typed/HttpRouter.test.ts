import { NodeHttpServer } from "@effect/platform-node"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import * as Fx from "effect/typed/fx/Fx"
import { map } from "effect/typed/fx/Fx/combinators/map"
import { Navigation } from "effect/typed/navigation/Navigation"
import { CurrentRoute } from "effect/typed/router/CurrentRoute"
import * as Matcher from "effect/typed/router/Matcher"
import * as Route from "effect/typed/router/Route"
import { html, StaticHtmlRenderTemplate } from "effect/typed/template"
import { handleHttpServerError, ssrForHttp } from "effect/typed/ui/HttpRouter"
import { HttpClient, HttpRouter } from "effect/unstable/http"

describe("typed/ui/HttpRouter", () => {
  it.effect("renders simple html template", () => {
    const matcher = Matcher.empty.match(
      Route.Parse("home"),
      html`<div>Hello, world!</div>`
    )
    const Live = HttpRouter.use(ssrForHttp(matcher)).pipe(
      Layer.provide(StaticHtmlRenderTemplate),
      HttpRouter.serve,
      Layer.provideMerge(NodeHttpServer.layerTest)
    )
    return Effect.gen(function*() {
      const response = yield* HttpClient.get("/home").pipe(
        Effect.flatMap((r) => r.text)
      )
      assert.strictEqual(response, "<div>Hello, world!</div>")
    }).pipe(Effect.provide(Live))
  })

  it.effect("renders html template with route params", () => {
    const users = Route.Join(Route.Parse("users"), Route.Param("id"))
    const matcher = Matcher.empty.match(
      users,
      (params) => html`<div>User ${params.pipe(map((p) => p.id))}</div>`
    )
    const Live = HttpRouter.use(ssrForHttp(matcher)).pipe(
      Layer.provide(StaticHtmlRenderTemplate),
      HttpRouter.serve,
      Layer.provideMerge(NodeHttpServer.layerTest)
    )
    return Effect.gen(function*() {
      const response = yield* HttpClient.get("/users/123").pipe(
        Effect.flatMap((r) => r.text)
      )
      assert.strictEqual(response, "<div>User 123</div>")
    }).pipe(Effect.provide(Live))
  })

  it.effect("renders html template with search params", () => {
    const route = Route.Parse("search")
    const matcher = Matcher.empty.match(
      route,
      html`<div>Search results</div>`
    )
    const Live = HttpRouter.use(ssrForHttp(matcher)).pipe(
      Layer.provide(StaticHtmlRenderTemplate),
      HttpRouter.serve,
      Layer.provideMerge(NodeHttpServer.layerTest)
    )
    return Effect.gen(function*() {
      const response = yield* HttpClient.get("/search?q=test").pipe(
        Effect.flatMap((r) => r.text)
      )
      assert.strictEqual(response, "<div>Search results</div>")
    }).pipe(Effect.provide(Live))
  })

  it.effect("handles multiple routes", () => {
    const home = Route.Parse("home")
    const about = Route.Parse("about")
    const matcher = Matcher.empty
      .match(home, html`<div>Home</div>`)
      .match(about, html`<div>About</div>`)
    const Live = HttpRouter.use(ssrForHttp(matcher)).pipe(
      Layer.provide(StaticHtmlRenderTemplate),
      HttpRouter.serve,
      Layer.provideMerge(NodeHttpServer.layerTest)
    )
    return Effect.gen(function*() {
      const homeResponse = yield* HttpClient.get("/home").pipe(
        Effect.flatMap((r) => r.text)
      )
      assert.strictEqual(homeResponse, "<div>Home</div>")
      const aboutResponse = yield* HttpClient.get("/about").pipe(
        Effect.flatMap((r) => r.text)
      )
      assert.strictEqual(aboutResponse, "<div>About</div>")
    }).pipe(Effect.provide(Live))
  })

  it.effect("returns 404 for unmatched routes", () => {
    const matcher = Matcher.empty.match(
      Route.Parse("home"),
      html`<div>Home</div>`
    )
    const Live = HttpRouter.use(Effect.fn(function*(router) {
      yield* ssrForHttp(router, matcher)
      yield* handleHttpServerError(router)
    })).pipe(
      Layer.provide(StaticHtmlRenderTemplate),
      HttpRouter.serve,
      Layer.provideMerge(NodeHttpServer.layerTest)
    )
    return Effect.gen(function*() {
      const response = yield* HttpClient.get("/notfound")
      assert.strictEqual(response.status, 404)
    }).pipe(Effect.provide(Live))
  })

  it.effect("renders dynamic content from Effect", () => {
    const matcher = Matcher.empty.match(
      Route.Parse("dynamic"),
      html`<div>Value: ${Effect.succeed("42")}</div>`
    )
    const Live = HttpRouter.use(ssrForHttp(matcher)).pipe(
      HttpRouter.serve,
      Layer.provideMerge(NodeHttpServer.layerTest),
      Layer.provide(StaticHtmlRenderTemplate)
    )
    return Effect.gen(function*() {
      const response = yield* HttpClient.get("/dynamic").pipe(
        Effect.flatMap((r) => r.text)
      )
      assert.strictEqual(response, "<div>Value: 42</div>")
    }).pipe(Effect.provide(Live))
  })

  it.effect("sets correct content-type header", () => {
    const matcher = Matcher.empty.match(
      Route.Parse("home"),
      html`<div>Hello</div>`
    )
    const Live = HttpRouter.use(ssrForHttp(matcher)).pipe(
      Layer.provide(StaticHtmlRenderTemplate),
      HttpRouter.serve,
      Layer.provideMerge(NodeHttpServer.layerTest)
    )
    return Effect.gen(function*() {
      const response = yield* HttpClient.get("/home")
      const contentType = response.headers["content-type"]
      assert.strictEqual(contentType, "text/html; charset=utf-8")
    }).pipe(Effect.provide(Live))
  })

  it.effect("handles nested routes", () => {
    const users = Route.Join(Route.Parse("api"), Route.Parse("users"))
    const user = Route.Join(users, Route.Param("id"))
    const matcher = Matcher.empty
      .match(users, html`<div>Users list</div>`)
      .match(user, (params) => html`<div>User ${params.pipe(map((p) => p.id))}</div>`)
    const Live = HttpRouter.use(ssrForHttp(matcher)).pipe(
      Layer.provide(StaticHtmlRenderTemplate),
      HttpRouter.serve,
      Layer.provideMerge(NodeHttpServer.layerTest)
    )
    return Effect.gen(function*() {
      const listResponse = yield* HttpClient.get("/api/users").pipe(
        Effect.flatMap((r) => r.text)
      )
      assert.strictEqual(listResponse, "<div>Users list</div>")
      const userResponse = yield* HttpClient.get("/api/users/456").pipe(
        Effect.flatMap((r) => r.text)
      )
      assert.strictEqual(userResponse, "<div>User 456</div>")
    }).pipe(Effect.provide(Live))
  })

  it.effect("provides Navigation with correct base and origin", () => {
    const matcher = Matcher.empty.match(
      Route.Parse("test"),
      Fx.gen(function*() {
        const origin = yield* Navigation.origin
        const base = yield* Navigation.base
        const currentEntry = yield* Navigation.currentEntry
        return html`<div data-origin="${origin}" data-base="${base}" data-url="${currentEntry.url.href}"></div>`
      })
    )
    const Live = HttpRouter.use(ssrForHttp(matcher)).pipe(
      Layer.provide(StaticHtmlRenderTemplate),
      HttpRouter.serve,
      Layer.provideMerge(NodeHttpServer.layerTest)
    )
    return Effect.gen(function*() {
      const response = yield* HttpClient.get("/test").pipe(
        Effect.flatMap((r) => r.text)
      )
      assert.ok(response.includes("data-origin=\"http://localhost\""))
      assert.ok(response.includes("data-base=\"/\""))
      assert.ok(response.includes("data-url=\"http://localhost/test\""))
    }).pipe(Effect.provide(Live))
  })

  it.effect("provides CurrentRoute with correct route path", () => {
    const matcher = Matcher.empty.match(
      Route.Parse("users"),
      Fx.gen(function*() {
        const currentRoute = yield* CurrentRoute
        return html`<div data-path="${currentRoute.route.path}"></div>`
      })
    )
    const Live = HttpRouter.use(ssrForHttp(matcher)).pipe(
      Layer.provide(StaticHtmlRenderTemplate),
      HttpRouter.serve,
      Layer.provideMerge(NodeHttpServer.layerTest)
    )
    return Effect.gen(function*() {
      const response = yield* HttpClient.get("/users").pipe(
        Effect.flatMap((r) => r.text)
      )
      assert.ok(response.includes("data-path=\"/users\""))
    }).pipe(Effect.provide(Live))
  })

  it.effect("provides CurrentRoute with no parent for root routes", () => {
    const matcher = Matcher.empty.match(
      Route.Parse("home"),
      Fx.gen(function*() {
        const currentRoute = yield* CurrentRoute
        const hasParent = currentRoute.parent !== undefined
        return html`<div data-has-parent="${hasParent}"></div>`
      })
    )
    const Live = HttpRouter.use(ssrForHttp(matcher)).pipe(
      Layer.provide(StaticHtmlRenderTemplate),
      HttpRouter.serve,
      Layer.provideMerge(NodeHttpServer.layerTest)
    )
    return Effect.gen(function*() {
      const response = yield* HttpClient.get("/home").pipe(
        Effect.flatMap((r) => r.text)
      )
      assert.ok(response.includes("data-has-parent=\"false\""))
    }).pipe(Effect.provide(Live))
  })

  it.effect("provides CurrentRoute with parent for nested routes", () => {
    const api = Route.Parse("api")
    const users = Route.Parse("users")
    const matcher = Matcher.empty
      .match(Route.Slash, html`<div>API</div>`)
      .match(
        users,
        Fx.gen(function*() {
          const currentRoute = yield* CurrentRoute
          const hasParent = currentRoute.parent !== undefined
          const parentPath = currentRoute.parent?.route.path ?? "none"
          return html`<div data-has-parent="${hasParent}" data-parent-path="${parentPath}"></div>`
        })
      )
    const Live = HttpRouter.use(ssrForHttp(matcher)).pipe(
      Layer.provide(StaticHtmlRenderTemplate),
      HttpRouter.serve,
      Layer.provideMerge(NodeHttpServer.layerTest),
      Layer.provide(CurrentRoute.extend(api))
    )
    return Effect.gen(function*() {
      const response = yield* HttpClient.get("/api/users").pipe(
        Effect.flatMap((r) => r.text)
      )
      assert.ok(response.includes("data-has-parent=\"true\""))
      assert.ok(response.includes("data-parent-path=\"/api\""))
    }).pipe(Effect.provide(Live))
  })

  it.effect("provides Navigation with correct currentEntry for different paths", () => {
    const matcher = Matcher.empty.match(
      Route.Parse("about"),
      Fx.gen(function*() {
        const currentEntry = yield* Navigation.currentEntry
        return html`<div data-pathname="${currentEntry.url.pathname}"></div>`
      })
    )
    const Live = HttpRouter.use(ssrForHttp(matcher)).pipe(
      Layer.provide(StaticHtmlRenderTemplate),
      HttpRouter.serve,
      Layer.provideMerge(NodeHttpServer.layerTest)
    )
    return Effect.gen(function*() {
      const response = yield* HttpClient.get("/about").pipe(
        Effect.flatMap((r) => r.text)
      )
      assert.ok(response.includes("data-pathname=\"/about\""))
    }).pipe(Effect.provide(Live))
  })
})
