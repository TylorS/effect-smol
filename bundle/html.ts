import * as Effect from "#dist/effect/Effect"
import { html, HtmlRenderTemplate, renderToHtmlString } from "#dist/effect/typed/template/index"

const start = performance.now()
const output = html`<div>Hello, world!</div>`.pipe(
  renderToHtmlString,
  Effect.provide(HtmlRenderTemplate),
  Effect.runSync
)
console.log(`renderToHtmlString: ${performance.now() - start}ms`)
console.log(output)
