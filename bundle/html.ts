import { runSync } from "#dist/effect/Effect"
import { html, renderToHtmlString } from "#dist/effect/typed/template/index"

runSync(renderToHtmlString(html`<div>Hello, world!</div>`))
