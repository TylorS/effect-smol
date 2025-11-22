import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { Fx } from "effect/typed/fx/index"
import * as EventHandler from "effect/typed/template/EventHandler"
import { HtmlRenderTemplate, renderToHtmlString } from "effect/typed/template/Html"
import { html, many, type Renderable } from "effect/typed/template/index"
import { DomRenderTemplate, render } from "effect/typed/template/Render"
import type { Rendered } from "effect/typed/template/Wire"
import { Window } from "happy-dom"

describe("Hydration", () => {
  it.effect(
    "hydrates a simple template",
    Effect.fn(function*() {
      yield* hydrateHtmlElement`<div>Hello, world!</div>`
    })
  )

  it.effect(
    "hydrates template with static attribute",
    Effect.fn(function*() {
      const staticExample = yield* hydrateHtmlElement`<div data-foo="Hello, world!"></div>`
      assert(staticExample.getAttribute("data-foo") === "Hello, world!")
      assert(staticExample.dataset.foo === "Hello, world!")
    })
  )

  it.effect(
    "hydrates template with primitive attribute interpolation",
    Effect.fn(function*() {
      const primitiveExample = yield* hydrateHtmlElement`<div data-foo=${"Hello, world!"}></div>`
      assert(primitiveExample.getAttribute("data-foo") === "Hello, world!")
      assert(primitiveExample.dataset.foo === "Hello, world!")
    })
  )

  it.effect(
    "hydrates template with Effect attribute",
    Effect.fn(function*() {
      const effectExample = yield* hydrateHtmlElement`<div data-foo=${Effect.succeed("Hello, world!")}></div>`
      assert(effectExample.getAttribute("data-foo") === "Hello, world!")
      assert(effectExample.dataset.foo === "Hello, world!")
    })
  )

  it.live(
    "hydrates template with reactive Fx attribute",
    Effect.fn(function*() {
      const values = ["A", "B", "C"]
      const interval = 500
      const fxExample = yield* hydrateHtmlElement`<div data-foo=${
        Fx.mergeAll(...values.map((value, index) => Fx.at(value, interval * index)))
      }></div>`
      assert(fxExample.getAttribute("data-foo") === "A")
      assert.equal(fxExample.dataset["foo"], "A")

      yield* Effect.sleep(interval * 1.5)
      assert(fxExample.getAttribute("data-foo") === "B")
      assert.equal(fxExample.dataset["foo"], "B")

      yield* Effect.sleep(interval * 1.5)
      assert(fxExample.getAttribute("data-foo") === "C")
      assert.equal(fxExample.dataset["foo"], "C")
    })
  )

  it.effect(
    "hydrates template with a boolean attribute",
    Effect.fn(function*() {
      const trueExample = yield* hydrateHtmlElement`<div ?hidden=${true}></div>`
      assert(trueExample.hasAttribute("hidden"))

      const falseExample = yield* hydrateHtmlElement`<div ?hidden=${false}></div>`
      assert(!falseExample.hasAttribute("hidden"))

      const effectTrueExample = yield* hydrateHtmlElement`<div ?hidden=${Effect.succeed(true)}></div>`
      assert(effectTrueExample.hasAttribute("hidden"))

      const effectFalseExample = yield* hydrateHtmlElement`<div ?hidden=${Effect.succeed(false)}></div>`
      assert(!effectFalseExample.hasAttribute("hidden"))

      const fxTrueExample = yield* hydrateHtmlElement`<div ?hidden=${Fx.succeed(true)}></div>`
      assert(fxTrueExample.hasAttribute("hidden"))

      const fxFalseExample = yield* hydrateHtmlElement`<div ?hidden=${Fx.succeed(false)}></div>`
      assert(!fxFalseExample.hasAttribute("hidden"))
    })
  )

  it.effect(
    "hydrates template with a class name",
    Effect.fn(function*() {
      const staticExample = yield* hydrateHtmlElement`<div class="foo"></div>`
      assert(staticExample.classList.contains("foo"))

      const primitiveExample = yield* hydrateHtmlElement`<div class=${"foo"}></div>`
      assert(primitiveExample.classList.contains("foo"))

      const effectExample = yield* hydrateHtmlElement`<div class=${Effect.succeed("foo")}></div>`
      assert(effectExample.classList.contains("foo"))

      const fxExample = yield* hydrateHtmlElement`<div class=${Fx.succeed("foo")}></div>`
      assert(fxExample.classList.contains("foo"))
    })
  )

  it.effect(
    "hydrates template with a class name interpolation",
    Effect.fn(function*() {
      const classNameExample = yield* hydrateHtmlElement`<div class=${"foo bar baz"}></div>`
      assert(classNameExample.classList.contains("foo"))
      assert(classNameExample.classList.contains("bar"))
      assert(classNameExample.classList.contains("baz"))
    })
  )

  it.effect(
    "hydrates template with a class name interpolation with holes",
    Effect.fn(function*() {
      const classNameExample = yield* hydrateHtmlElement`<div class="${"foo"} ${Effect.succeed("bar")} ${
        Fx.succeed("baz")
      }"></div>`
      assert(classNameExample.classList.contains("foo"))
      assert(classNameExample.classList.contains("bar"))
      assert(classNameExample.classList.contains("baz"))
    })
  )

  it.effect(
    "hydrates template with data attributes",
    Effect.fn(function*() {
      const dataExample = yield* hydrateHtmlElement`<div .data=${{
        a: "a",
        b: Effect.succeed("b"),
        c: Fx.succeed("c")
      }} />`

      assert(dataExample.dataset.a === "a")
      assert(dataExample.dataset.b === "b")
      assert(dataExample.dataset.c === "c")
    })
  )

  it.effect(
    "hydrates comments",
    Effect.fn(function*() {
      const commentExample = yield* hydrateComment`<!--Hello, world!-->`
      assert.equal(commentExample.textContent, "Hello, world!")
    })
  )

  it.effect(
    "hydrates comments with holes",
    Effect.fn(function*() {
      const commentExample = yield* hydrateComment`<!--${"Hello, world!"}-->`
      assert.equal(commentExample.textContent, "Hello, world!")
    })
  )

  it.effect(
    "hydrates comments with multiple holes",
    Effect.fn(function*() {
      const commentExample = yield* hydrateComment`<!--${"Hello"}, ${Effect.succeed("world")}${Fx.succeed("!")}-->`
      assert.equal(commentExample.textContent, "Hello, world!")
    })
  )

  it.effect(
    "hydrates template with property syntax",
    Effect.fn(function*({ expect }) {
      const x = {}
      const propertyExample = yield* hydrateHtmlElement`<div .foo=${Effect.succeed(x)}></div>`
      expect(propertyExample.outerHTML).toMatchInlineSnapshot(`"<div foo="{}"></div>"`)
    })
  )

  it.effect(
    "supports ref parts",
    Effect.fn(function*() {
      let element: HTMLElement | undefined
      const refExample = yield* hydrateHtmlElement`<div ref=${(el: HTMLElement) => {
        element = el
      }}></div>`
      assert(element === refExample)
    })
  )

  it.effect(
    "supports sparse attributes",
    Effect.fn(function*() {
      const sparseExample = yield* hydrateHtmlElement`<div attr="${"foo"} ${"bar"} ${"baz"}"></div>`
      assert(sparseExample.getAttribute("attr") === "foo bar baz")
    })
  )

  it.effect(
    "supports text only elements",
    Effect.fn(function*() {
      const textOnlyExample = yield* hydrateHtmlElement`<script>console.log("${"Hello, world!"}")</script>`
      assert.equal(textOnlyExample.textContent, "console.log(\"Hello, world!\")")
    })
  )

  it.effect(
    "supports text only elements with multipleholes",
    Effect.fn(function*() {
      const textOnlyExample = yield* hydrateHtmlElement`<script>console.log("${"Hello"}, ${Effect.succeed("world")}${
        Fx.succeed("!")
      }")</script>`
      assert.equal(textOnlyExample.textContent, "console.log(\"Hello, world!\")")
    })
  )

  it.effect(
    "supports spread attributes",
    Effect.fn(function*() {
      const spreadExample = yield* hydrateHtmlElement`<div ...${{ foo: "bar", baz: "qux" }}></div>`
      assert(spreadExample.getAttribute("foo") === "bar")
      assert(spreadExample.getAttribute("baz") === "qux")
    })
  )

  it.effect(
    "supports effects as event handlers using @event syntax",
    Effect.fn(function*() {
      let clicked = false
      const eventExample = yield* hydrateHtmlElement`<div @click=${
        Effect.sync(() => {
          clicked = true
        })
      }></div>`
      eventExample.click()
      assert(clicked)
    })
  )

  it.effect(
    "supports EventHandlers using @event syntax",
    Effect.fn(function*() {
      let clicked = false
      const eventExample = yield* hydrateHtmlElement`<div @click=${
        EventHandler.make(() => {
          clicked = true
        })
      }></div>`
      eventExample.click()
      assert(clicked)
    })
  )

  it.effect(
    "supports effects as event handlers using onclick attribute",
    Effect.fn(function*() {
      let clicked = false
      const eventExample = yield* hydrateHtmlElement`<div onclick=${
        Effect.sync(() => {
          clicked = true
        })
      }></div>`
      eventExample.click()
      assert(clicked)
    })
  )

  it.effect(
    "supports EventHandlers using onclick attribute",
    Effect.fn(function*() {
      let clicked = false
      const eventExample = yield* hydrateHtmlElement`<div onclick=${
        EventHandler.make(() => {
          clicked = true
        })
      }></div>`
      eventExample.click()
      assert(clicked)
    })
  )

  it.effect(
    "event handler allows camelCase event names",
    Effect.fn(function*() {
      let clicked = false
      const eventExample = yield* hydrateHtmlElement`<div onClick=${
        EventHandler.make((event) => {
          clicked = true
          assert(event.defaultPrevented)
        }, { preventDefault: true })
      }></div>`
      eventExample.click()
      assert(clicked)
    })
  )

  it.effect(
    "interpolates primitive children",
    Effect.fn(function*() {
      const numberExample = yield* hydrateHtmlElement`<div>${1}</div>`
      assert.equal(numberExample.textContent, "1")
      const stringExample = yield* hydrateHtmlElement`<div>${"Hello, world!"}</div>`
      assert.equal(stringExample.textContent, "Hello, world!")
      const booleanExample = yield* hydrateHtmlElement`<div>${true}</div>`
      assert.equal(booleanExample.textContent, "true")
      const bigintExample = yield* hydrateHtmlElement`<div>${BigInt(1)}</div>`
      assert.equal(bigintExample.textContent, "1")
      const symbolExample = yield* hydrateHtmlElement`<div>${Symbol("foo")}</div>`
      assert.equal(symbolExample.textContent, "Symbol(foo)")
      const undefinedExample = yield* hydrateHtmlElement`<div>${undefined}</div>`
      assert.equal(undefinedExample.textContent, "")
      const nullExample = yield* hydrateHtmlElement`<div>${null}</div>`
      assert.equal(nullExample.textContent, "")
      const arrayExample = yield* hydrateHtmlElement`<div>${[1, "Hello", true]}</div>`
      assert.equal(arrayExample.textContent, "1Hellotrue")
    })
  )

  it.effect(
    "interpolates dom render events",
    Effect.fn(function*({ expect }) {
      const renderEventExample = yield* hydrateHtmlElement`<div>${html`<p>Hello, world!</p>`}</div>`
      expect(renderEventExample.innerHTML).toMatchInlineSnapshot(
        `"<!--n_0--><!--t_1XMifUHMTBw=--><p>Hello, world!</p><!--/t_1XMifUHMTBw=--><!--/n_0-->"`
      )
    })
  )

  it.effect(
    "interpolates array of render events",
    Effect.fn(function*({ expect }) {
      const renderEventExample = yield* hydrateHtmlElement`<div>${[html`<p>A</p>`, html`<p>B</p>`]}</div>`
      expect(renderEventExample.innerHTML).toMatchInlineSnapshot(
        `"<!--n_0--><!--t_KwZ/fMOUm3w=--><p>A</p><!--/t_KwZ/fMOUm3w=--><!--t_KwZ/fASZm3w=--><p>B</p><!--/t_KwZ/fASZm3w=--><!--/n_0-->"`
      )
    })
  )

  it.effect(
    "interpolates many comments",
    Effect.fn(function*({ expect }) {
      const { current, original } = yield* hydrateHtmlElementWithOriginal`<div>${
        many(Fx.succeed([1, 2, 3]), (n) => n, (n) => html`<p>${n}</p>`)
      }</div>`
      assert(original === current)
      // Verify that the nodes are the same
      for (const [index, node] of Array.from(current.childNodes).entries()) {
        const originalNode = original.childNodes[index]
        expect(node).toBe(originalNode)
        expect(node.textContent).toBe(originalNode.textContent)
      }

      expect(current.innerHTML).toMatchInlineSnapshot(
        `"<!--n_0--><!--t_KwZ/fKKViAs=--><p><!--n_0-->1<!--/n_0--></p><!--/t_KwZ/fKKViAs=--><!--/m_1--><!--t_KwZ/fKKViAs=--><p><!--n_0-->2<!--/n_0--></p><!--/t_KwZ/fKKViAs=--><!--/m_2--><!--t_KwZ/fKKViAs=--><p><!--n_0-->3<!--/n_0--></p><!--/t_KwZ/fKKViAs=--><!--/m_3--><!--/n_0-->"`
      )
    })
  )
})

function createHappyDomLayer(...params: ConstructorParameters<typeof Window>) {
  const window = new Window(...params) as unknown as globalThis.Window & typeof globalThis
  const layer = DomRenderTemplate.using(window.document)
  return [window, layer] as const
}

function hydrateHtmlElement<Values extends ReadonlyArray<Renderable.Any>>(
  template: TemplateStringsArray,
  ...values: Values
) {
  return hydrateTemplate(
    template,
    values,
    (example, window, message): asserts example is HTMLElement => {
      assert(example instanceof window.HTMLElement, message)
    }
  ).pipe(
    Effect.map(({ current }) => current)
  )
}

function hydrateComment<Values extends ReadonlyArray<Renderable.Any>>(
  template: TemplateStringsArray,
  ...values: Values
) {
  return hydrateTemplate(
    template,
    values,
    (example, window, message): asserts example is Comment => assert(example instanceof window.Comment, message)
  ).pipe(
    Effect.map(({ current }) => current)
  )
}

function hydrateTemplate<Values extends ReadonlyArray<Renderable.Any>, T extends Rendered>(
  template: TemplateStringsArray,
  values: Values,
  assertion: (
    example: Rendered,
    window: globalThis.Window & typeof globalThis,
    message?: string
  ) => asserts example is T
) {
  return Effect.gen(function*() {
    const [window, layer] = createHappyDomLayer()
    const fx = html(template, ...values)
    const htmlString = yield* renderToHtmlString(fx).pipe(
      Effect.provide(HtmlRenderTemplate)
    )
    const body = window.document.body
    body.innerHTML = htmlString

    let initial = body.firstChild
    assert(initial)
    if (initial.nodeType === initial.COMMENT_NODE) {
      initial = initial.nextSibling
    }

    assertion(initial as Node, window)

    const [example] = yield* render(fx, body).pipe(
      Fx.provide(layer),
      Fx.take(1),
      Fx.collectUpTo(1)
    )

    assertion(example, window)

    // They should be the same node after hydration
    assert((initial as Node) === example)

    return {
      original: initial,
      current: example
    }
  })
}

function hydrateHtmlElementWithOriginal<Values extends ReadonlyArray<Renderable.Any>>(
  template: TemplateStringsArray,
  ...values: Values
) {
  return hydrateTemplate(template, values, (example, window, message): asserts example is HTMLElement => {
    assert(example instanceof window.HTMLElement, message)
  })
}
