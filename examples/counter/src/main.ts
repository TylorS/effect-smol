import { Effect, Layer } from "effect"
import { Fx, RefSubject } from "effect/typed/fx"
import { DomRenderTemplate, html, render } from "effect/typed/template"

const Counter = Fx.gen(function*() {
  const count = yield* RefSubject.make(0)

  return html`<div>
    <button onclick=${RefSubject.increment(count)}>Increment</button>
    <button onclick=${RefSubject.decrement(count)}>Decrement</button>
    <p>Count: ${count}</p>
  </div>`
})

await render(Counter, document.body).pipe(
  Fx.drainLayer,
  Layer.provide(DomRenderTemplate),
  Layer.launch,
  Effect.runPromise
)
