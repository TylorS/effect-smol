import { NodeHttpServer } from "@effect/platform-node"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { map } from "effect/typed/fx/Fx/combinators/map"
import * as Matcher from "effect/typed/router/Matcher"
import * as Route from "effect/typed/router/Route"
import { html, StaticHtmlRenderTemplate } from "effect/typed/template"
import { handleHttpServerError, mountForHttp } from "effect/typed/ui/HttpRouter"
import { HttpClient, HttpRouter } from "effect/unstable/http"

describe("typed/ui/HttpRouter", () => {
  it.effect("renders simple html template", () => {
    const matcher = Matcher.empty.match(
      Route.Parse("home"),
      html`<div>Hello, world!</div>`
    )
    const Live = HttpRouter.serve(
      HttpRouter.use((r) => mountForHttp(r, matcher)).pipe(
        Layer.provide(StaticHtmlRenderTemplate)
      ),
      { disableListenLog: true, disableLogger: true }
    ).pipe(Layer.provideMerge(NodeHttpServer.layerTest))
    return Effect.gen(function*() {
      const response = yield* HttpClient.get("/home").pipe(
        Effect.flatMap((r) => r.text)
      )
      assert.strictEqual(response, "<div>Hello, world!</div>")
    }).pipe(Effect.provide(Live))
  })

  it.effect("renders html template with route params", () => {
    const users = Route.join(Route.Parse("users"), Route.Param("id"))
    const matcher = Matcher.empty.match(
      users,
      (params) => html`<div>User ${params.pipe(map((p) => p.id))}</div>`
    )
    const Live = HttpRouter.serve(
      HttpRouter.use((r) => mountForHttp(r, matcher)).pipe(
        Layer.provide(StaticHtmlRenderTemplate)
      ),
      { disableListenLog: true, disableLogger: true }
    ).pipe(Layer.provideMerge(NodeHttpServer.layerTest))
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
    const Live = HttpRouter.serve(
      HttpRouter.use((r) => mountForHttp(r, matcher)).pipe(
        Layer.provide(StaticHtmlRenderTemplate)
      ),
      { disableListenLog: true, disableLogger: true }
    ).pipe(Layer.provideMerge(NodeHttpServer.layerTest))
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
    const Live = HttpRouter.serve(
      HttpRouter.use((r) => mountForHttp(r, matcher)).pipe(
        Layer.provide(StaticHtmlRenderTemplate)
      ),
      { disableListenLog: true, disableLogger: true }
    ).pipe(Layer.provideMerge(NodeHttpServer.layerTest))
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
    const Live = HttpRouter.serve(
      HttpRouter.use(Effect.fn(function*(r) {
        yield* mountForHttp(r, matcher)
        yield* handleHttpServerError(r)
      })).pipe(
        Layer.provide(StaticHtmlRenderTemplate)
      ),
      { disableListenLog: true, disableLogger: true }
    ).pipe(Layer.provideMerge(NodeHttpServer.layerTest))
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
    const Live = HttpRouter.serve(
      HttpRouter.use((r) => mountForHttp(r, matcher)).pipe(
        Layer.provide(StaticHtmlRenderTemplate)
      ),
      { disableListenLog: true, disableLogger: true }
    ).pipe(Layer.provideMerge(NodeHttpServer.layerTest))
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
    const Live = HttpRouter.serve(
      HttpRouter.use((r) => mountForHttp(r, matcher)).pipe(
        Layer.provide(StaticHtmlRenderTemplate)
      ),
      { disableListenLog: true, disableLogger: true }
    ).pipe(Layer.provideMerge(NodeHttpServer.layerTest))
    return Effect.gen(function*() {
      const response = yield* HttpClient.get("/home")
      const contentType = response.headers["content-type"]
      assert.strictEqual(contentType, "text/html; charset=utf-8")
    }).pipe(Effect.provide(Live))
  })

  it.effect("handles nested routes", () => {
    const users = Route.join(Route.Parse("api"), Route.Parse("users"))
    const user = Route.join(users, Route.Param("id"))
    const matcher = Matcher.empty
      .match(users, html`<div>Users list</div>`)
      .match(user, (params) => html`<div>User ${params.pipe(map((p) => p.id))}</div>`)
    const Live = HttpRouter.serve(
      HttpRouter.use((r) => mountForHttp(r, matcher)).pipe(
        Layer.provide(StaticHtmlRenderTemplate)
      ),
      { disableListenLog: true, disableLogger: true }
    ).pipe(Layer.provideMerge(NodeHttpServer.layerTest))
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
})
