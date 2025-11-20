import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Fx from "effect/typed/fx/core/index"
import { DomRenderTemplate, html, render } from "effect/typed/template/index"

await html`<div>Hello, world!</div>`.pipe(
  render(document.body),
  Fx.drainLayer,
  Layer.provide(DomRenderTemplate),
  Layer.launch,
  Effect.runPromise
)
