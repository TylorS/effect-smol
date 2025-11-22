import * as Effect from "#dist/effect/Effect"
import * as Layer from "#dist/effect/Layer"
import { Fx } from "#dist/effect/typed/fx/index"
import { DomRenderTemplate, html, render } from "#dist/effect/typed/template/index"

await html`<div>Hello, world!</div>`.pipe(
  render(document.body),
  Fx.drainLayer,
  Layer.provide(DomRenderTemplate),
  Layer.launch,
  Effect.runPromise
)
