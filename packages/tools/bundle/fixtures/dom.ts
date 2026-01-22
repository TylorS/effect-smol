import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Fx from "effect/typed/fx/Fx"
import { DomRenderTemplate, html, render } from "effect/typed/template"

await html`<div>Hello, world!</div>`.pipe(
  render(document.body),
  Fx.drainLayer,
  Layer.provide(DomRenderTemplate),
  Layer.launch,
  Effect.runPromise
)
