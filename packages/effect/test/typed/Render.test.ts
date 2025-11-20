import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import * as Fx from "effect/typed/fx/index"
import * as EventHandler from "effect/typed/template/EventHandler"
import { html, type Renderable } from "effect/typed/template/index"
import { DomRenderTemplate, render } from "effect/typed/template/Render"
import type { Rendered } from "effect/typed/template/Wire"
import { Window } from "happy-dom"

describe("Render", () => {
  it.effect(
    "renders a simple template",
    Effect.fn(function*() {
      yield* renderHtmlElement`<div>Hello, world!</div>`
    })
  )

  it.effect(
    "renders template with static attribute",
    Effect.fn(function*() {
      const staticExample = yield* renderHtmlElement`<div data-foo="Hello, world!"></div>`
      assert(staticExample.getAttribute("data-foo") === "Hello, world!")
      assert(staticExample.dataset.foo === "Hello, world!")
    })
  )

  it.effect(
    "renders template with primitive attribute interpolation",
    Effect.fn(function*() {
      const primitiveExample = yield* renderHtmlElement`<div data-foo=${"Hello, world!"}></div>`
      assert(primitiveExample.getAttribute("data-foo") === "Hello, world!")
      assert(primitiveExample.dataset.foo === "Hello, world!")
    })
  )

  it.effect(
    "renders template with Effect attribute",
    Effect.fn(function*() {
      const effectExample = yield* renderHtmlElement`<div data-foo=${Effect.succeed("Hello, world!")}></div>`
      assert(effectExample.getAttribute("data-foo") === "Hello, world!")
      assert(effectExample.dataset.foo === "Hello, world!")
    })
  )

  it.live(
    "renders template with reactive Fx attribute",
    Effect.fn(function*() {
      const values = ["A", "B", "C"]
      const interval = 500
      const fxExample = yield* renderHtmlElement`<div data-foo=${
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
    "renders template with a boolean attribute",
    Effect.fn(function*() {
      const trueExample = yield* renderHtmlElement`<div ?hidden=${true}></div>`
      assert(trueExample.hasAttribute("hidden"))

      const falseExample = yield* renderHtmlElement`<div ?hidden=${false}></div>`
      assert(!falseExample.hasAttribute("hidden"))

      const effectTrueExample = yield* renderHtmlElement`<div ?hidden=${Effect.succeed(true)}></div>`
      assert(effectTrueExample.hasAttribute("hidden"))

      const effectFalseExample = yield* renderHtmlElement`<div ?hidden=${Effect.succeed(false)}></div>`
      assert(!effectFalseExample.hasAttribute("hidden"))

      const fxTrueExample = yield* renderHtmlElement`<div ?hidden=${Fx.succeed(true)}></div>`
      assert(fxTrueExample.hasAttribute("hidden"))

      const fxFalseExample = yield* renderHtmlElement`<div ?hidden=${Fx.succeed(false)}></div>`
      assert(!fxFalseExample.hasAttribute("hidden"))
    })
  )

  it.effect(
    "renders template with a class name",
    Effect.fn(function*() {
      const staticExample = yield* renderHtmlElement`<div class="foo"></div>`
      assert(staticExample.classList.contains("foo"))

      const primitiveExample = yield* renderHtmlElement`<div class=${"foo"}></div>`
      assert(primitiveExample.classList.contains("foo"))

      const effectExample = yield* renderHtmlElement`<div class=${Effect.succeed("foo")}></div>`
      assert(effectExample.classList.contains("foo"))

      const fxExample = yield* renderHtmlElement`<div class=${Fx.succeed("foo")}></div>`
      assert(fxExample.classList.contains("foo"))
    })
  )

  it.effect(
    "renders template with a class name interpolation",
    Effect.fn(function*() {
      const classNameExample = yield* renderHtmlElement`<div class=${"foo bar baz"}></div>`
      assert(classNameExample.classList.contains("foo"))
      assert(classNameExample.classList.contains("bar"))
      assert(classNameExample.classList.contains("baz"))
    })
  )

  it.effect(
    "renders template with a class name interpolation with holes",
    Effect.fn(function*() {
      const classNameExample = yield* renderHtmlElement`<div class="${"foo"} ${Effect.succeed("bar")} ${
        Fx.succeed("baz")
      }"></div>`
      assert(classNameExample.classList.contains("foo"))
      assert(classNameExample.classList.contains("bar"))
      assert(classNameExample.classList.contains("baz"))
    })
  )

  it.effect(
    "renders template with data attributes",
    Effect.fn(function*() {
      const dataExample = yield* renderHtmlElement`<div .data=${{
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
    "renders comments",
    Effect.fn(function*() {
      const commentExample = yield* renderComment`<!--Hello, world!-->`
      assert.equal(commentExample.textContent, "Hello, world!")
    })
  )

  it.effect(
    "renders comments with holes",
    Effect.fn(function*() {
      const commentExample = yield* renderComment`<!--${"Hello, world!"}-->`
      assert.equal(commentExample.textContent, "Hello, world!")
    })
  )

  it.effect(
    "renders comments with multiple holes",
    Effect.fn(function*() {
      const commentExample = yield* renderComment`<!--${"Hello"}, ${Effect.succeed("world")}${Fx.succeed("!")}-->`
      assert.equal(commentExample.textContent, "Hello, world!")
    })
  )

  it.effect(
    "renders template with property syntax",
    Effect.fn(function*() {
      const x = {}
      const propertyExample = yield* renderHtmlElement`<div .foo=${Effect.succeed(x)}></div>`
      assert((propertyExample as any).foo === x)
    })
  )

  it.effect(
    "supports ref parts",
    Effect.fn(function*() {
      let element: HTMLElement | undefined
      const refExample = yield* renderHtmlElement`<div ref=${(el: HTMLElement) => {
        element = el
      }}></div>`
      assert(element === refExample)
    })
  )

  it.effect(
    "supports sparse attributes",
    Effect.fn(function*() {
      const sparseExample = yield* renderHtmlElement`<div attr="${"foo"} ${"bar"} ${"baz"}"></div>`
      assert(sparseExample.getAttribute("attr") === "foo bar baz")
    })
  )

  it.effect(
    "supports text only elements",
    Effect.fn(function*() {
      const textOnlyExample = yield* renderHtmlElement`<script>console.log("${"Hello, world!"}")</script>`
      assert.equal(textOnlyExample.textContent, "console.log(\"Hello, world!\")")
    })
  )

  it.effect(
    "supports text only elements with multipleholes",
    Effect.fn(function*() {
      const textOnlyExample = yield* renderHtmlElement`<script>console.log("${"Hello"}, ${Effect.succeed("world")}${
        Fx.succeed("!")
      }")</script>`
      assert.equal(textOnlyExample.textContent, "console.log(\"Hello, world!\")")
    })
  )

  it.effect(
    "supports spread attributes",
    Effect.fn(function*() {
      const spreadExample = yield* renderHtmlElement`<div ...${{ foo: "bar", baz: "qux" }}></div>`
      assert(spreadExample.getAttribute("foo") === "bar")
      assert(spreadExample.getAttribute("baz") === "qux")
    })
  )

  it.effect(
    "supports effects as event handlers using @event syntax",
    Effect.fn(function*() {
      let clicked = false
      const eventExample = yield* renderHtmlElement`<div @click=${
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
      const eventExample = yield* renderHtmlElement`<div @click=${
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
      const eventExample = yield* renderHtmlElement`<div onclick=${
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
      const eventExample = yield* renderHtmlElement`<div onclick=${
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
      const eventExample = yield* renderHtmlElement`<div onClick=${
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
      const numberExample = yield* renderHtmlElement`<div>${1}</div>`
      assert.equal(numberExample.textContent, "1")
      const stringExample = yield* renderHtmlElement`<div>${"Hello, world!"}</div>`
      assert.equal(stringExample.textContent, "Hello, world!")
      const booleanExample = yield* renderHtmlElement`<div>${true}</div>`
      assert.equal(booleanExample.textContent, "true")
      const bigintExample = yield* renderHtmlElement`<div>${BigInt(1)}</div>`
      assert.equal(bigintExample.textContent, "1")
      const symbolExample = yield* renderHtmlElement`<div>${Symbol("foo")}</div>`
      assert.equal(symbolExample.textContent, "Symbol(foo)")
      const undefinedExample = yield* renderHtmlElement`<div>${undefined}</div>`
      assert.equal(undefinedExample.textContent, "")
      const nullExample = yield* renderHtmlElement`<div>${null}</div>`
      assert.equal(nullExample.textContent, "")
      const arrayExample = yield* renderHtmlElement`<div>${[1, "Hello", true]}</div>`
      assert.equal(arrayExample.textContent, "1Hellotrue")
    })
  )

  it.effect(
    "interpolates dom render events",
    Effect.fn(function*() {
      const renderEventExample = yield* renderHtmlElement`<div>${html`<p>Hello, world!</p>`}</div>`
      assert.equal(renderEventExample.innerHTML, `<p>Hello, world!</p>${TYPED_NODE_END(0)}`)
    })
  )

  it.effect(
    "interpolates array of render events",
    Effect.fn(function*() {
      const renderEventExample = yield* renderHtmlElement`<div>${[
        html`<p>A</p>`,
        html`<p>B</p>`
      ]}</div>`
      assert.equal(
        renderEventExample.innerHTML,
        `<p>A</p><p>B</p>${TYPED_NODE_END(0)}`
      )
    })
  )
})

function renderHtmlElement<Values extends ReadonlyArray<Renderable.Any>>(
  template: TemplateStringsArray,
  ...values: Values
) {
  return renderTemplate(
    template,
    values,
    (example, window): asserts example is HTMLElement => assert(example instanceof window.HTMLElement)
  )
}

function renderComment<Values extends ReadonlyArray<Renderable.Any>>(
  template: TemplateStringsArray,
  ...values: Values
) {
  return renderTemplate(
    template,
    values,
    (example, window): asserts example is Comment => assert(example instanceof window.Comment)
  )
}

function renderTemplate<Values extends ReadonlyArray<Renderable.Any>, T extends Rendered>(
  template: TemplateStringsArray,
  values: Values,
  assertion: (example: Rendered, window: globalThis.Window & typeof globalThis) => asserts example is T
) {
  return Effect.gen(function*() {
    const [window, layer] = createHappyDomLayer()
    const [example] = yield* render(html(template, ...values), window.document.body).pipe(
      Fx.provide(layer),
      Fx.take(1),
      Fx.collectAll
    )

    assertion(example, window)

    return example
  })
}

function createHappyDomLayer(...params: ConstructorParameters<typeof Window>) {
  const window = new Window(...params) as unknown as globalThis.Window & typeof globalThis
  const layer = DomRenderTemplate.using(window.document)
  return [window, layer] as const
}

const TYPED_NODE_END = (i: number) => `<!--/n_${i}-->`
