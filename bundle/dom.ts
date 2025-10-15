import * as Fx from "#dist/@typed/fx/index"
import { DomRenderTemplate, html, render } from "#dist/@typed/template/index"
import * as Effect from "#dist/effect/Effect"

const start = performance.now()
const [output] = await html`<div>Hello, world!</div>`.pipe(
  render(document.body),
  Fx.provide(DomRenderTemplate),
  Fx.collectUpTo(1),
  Effect.runPromise
)
console.log(`render: ${performance.now() - start}ms`)
console.log(output)
