import * as Effect from "#dist/effect/Effect"
import * as Layer from "#dist/effect/Layer"
import * as Fx from "#dist/effect/typed/fx/core/index"
import { DomRenderTemplate, html, render } from "#dist/effect/typed/template/index"

await html`<div>Hello, world!</div>`.pipe(
  render(document.body),
  Fx.drainLayer,
  Layer.provide(DomRenderTemplate),
  Layer.launch,
  Effect.runPromise
)
