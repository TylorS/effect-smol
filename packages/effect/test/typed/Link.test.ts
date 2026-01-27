import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import * as Layer from "effect/Layer"
import { Fx } from "effect/typed/fx"
import { CurrentPath } from "effect/typed/navigation/Navigation"
import { ServerRouter } from "effect/typed/router/Router"
import { DomRenderTemplate, render } from "effect/typed/template"
import { Link } from "effect/typed/ui/Link"
import { Window } from "happy-dom"

describe("typed/ui/Link", () => {
  it.effect("renders <a> with href and content", () =>
    Effect.gen(function*() {
      const [window, layer] = createHappyDomLayer()

      const [root] = yield* render(
        Link({ href: "/about", content: "Go to about" }),
        window.document.body
      ).pipe(Fx.provide(layer), Fx.take(1), Fx.collectAll)

      assert(root instanceof window.HTMLElement)
      const anchor = root as HTMLAnchorElement
      assert(anchor.tagName === "A")
      assert(anchor.getAttribute("href") === "/about")
      assert(anchor.textContent === "Go to about")
    }))

  it.live("intercepts same-origin click and navigates", () => {
    const [window, layer] = createHappyDomLayer({ url: "http://localhost/" })
    return Effect.gen(function*() {
      const [root] = yield* render(
        Link({ href: "/about", content: "Go" }),
        window.document.body
      ).pipe(Fx.take(1), Fx.collectAll)

      assert(root instanceof window.HTMLElement)
      const anchor = root as HTMLAnchorElement
      assert(anchor.tagName === "A")

      const pathBefore = yield* CurrentPath
      anchor.click()
      yield* Effect.sleep(50)
      const pathAfter = yield* CurrentPath

      assert(pathBefore === "/" || pathBefore === "")
      assert(pathAfter === "/about")
    }).pipe(Effect.provide(layer))
  })

  it.live("does not intercept when modifier key is pressed", () => {
    const [window, layer] = createHappyDomLayer()
    return Effect.gen(function*() {
      const [root] = yield* render(
        Link({ href: "/other", content: "Go" }),
        window.document.body
      ).pipe(Fx.take(1), Fx.collectAll)

      assert(root instanceof window.HTMLElement)
      const anchor = root as HTMLAnchorElement
      assert(anchor.tagName === "A")

      const ev = new window.MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        ctrlKey: true
      })
      anchor.dispatchEvent(ev)
      yield* Effect.sleep(50)
      const pathAfter = yield* CurrentPath

      assert(pathAfter === "/" || pathAfter === "")
    }).pipe(Effect.provide(layer))
  })
})

function createHappyDomLayer(...params: ConstructorParameters<typeof Window>) {
  const window = new Window(...params) as unknown as globalThis.Window & typeof globalThis
  const domLayer = DomRenderTemplate.using(window.document)
  const opts = params[0] as { url?: string } | undefined
  const url = opts?.url ?? "http://localhost/"
  const routerLayer = ServerRouter({ url })
  const layer = domLayer.pipe(Layer.merge(routerLayer))
  return [window, layer] as const
}
