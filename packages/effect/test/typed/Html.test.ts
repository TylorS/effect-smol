import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import * as Fx from "effect/typed/fx/index"
import { renderToHtmlString, StaticHtmlRenderTemplate } from "effect/typed/template/Html"
import { HtmlRenderEvent, type RenderEvent } from "effect/typed/template/RenderEvent"
import { html } from "effect/typed/template/RenderTemplate"

describe("Html", () => {
  it.live(
    "static template",
    Effect.fn(function*() {
      expect(yield* getStaticHtml(html`<div>Hello, world!</div>`)).toMatchInlineSnapshot(`"<div>Hello, world!</div>"`)
    })
  )

  it.live(
    "dynamic template for text",
    Effect.fn(function*() {
      expect(yield* getStaticHtml(html`<div>Hello, ${"Typed"}!</div>`)).toMatchInlineSnapshot(
        `"<div>Hello, Typed!</div>"`
      )
    })
  )

  it.live(
    "dynamic template for effect",
    Effect.fn(function*() {
      expect(yield* getStaticHtml(html`<div>Hello, ${Effect.succeed("Typed")}!</div>`)).toMatchInlineSnapshot(
        `"<div>Hello, Typed!</div>"`
      )
    })
  )

  it.live(
    "dynamic template for fx only takes first value",
    Effect.fn(function*() {
      expect(yield* getStaticHtml(html`<div>Hello, ${Fx.mergeAll(Fx.succeed("Typed"), Fx.succeed("Other"))}!</div>`))
        .toMatchInlineSnapshot(
          `"<div>Hello, Typed!</div>"`
        )
    })
  )

  it.live(
    "streams render events in order",
    Effect.fn(function*() {
      expect(
        yield* getStaticHtml(html`<div>Hello, ${
          Fx.mergeAll(
            Fx.succeed(HtmlRenderEvent("Typ", false)),
            Fx.succeed(HtmlRenderEvent("ed", true))
          )
        }!</div>`)
      ).toMatchInlineSnapshot(
        `"<div>Hello, Typed!</div>"`
      )
    })
  )
})

function getStaticHtml<E, R>(renderable: Fx.Fx<RenderEvent, E, R>) {
  return renderToHtmlString(renderable).pipe(
    Effect.provide(StaticHtmlRenderTemplate)
  )
}
