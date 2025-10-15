import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import * as Fx from "effect/typed/fx/index"
import { html } from "effect/typed/template/index"
import { DomRenderTemplate, render } from "effect/typed/template/Render"
import { Window } from "happy-dom"

describe("Render", () => {
  it.effect(
    "renders a simple template",
    Effect.fn(function*() {
      const [window, layer] = createHappyDomLayer()
      const [example] = yield* render(html`<div>Hello, world!</div>`, window.document.body).pipe(
        Fx.provide(layer),
        Fx.take(1),
        Fx.collectAll
      )

      assert(example instanceof window.HTMLElement)
    })
  )
})

function createHappyDomLayer(...params: ConstructorParameters<typeof Window>) {
  const window = new Window(...params) as unknown as globalThis.Window & typeof globalThis
  const layer = DomRenderTemplate.using(window.document)
  return [window, layer] as const
}
