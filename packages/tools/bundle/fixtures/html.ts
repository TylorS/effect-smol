import * as Effect from "effect/Effect"
import { html, HtmlRenderTemplate, renderToHtmlString } from "effect/typed/template/index"

const start = performance.now()
const output = html`<div>Hello, world!</div>`.pipe(
  renderToHtmlString,
  Effect.provide(HtmlRenderTemplate),
  // TODO: Fix this? #dist/effect/Effect is not the same as effect/Effect
  (_) => Effect.scoped(_) as Effect.Effect<string>,
  Effect.runSync
)
console.log(`renderToHtmlString: ${performance.now() - start}ms`)
console.log(output)
