import { Effect, Layer } from "effect"
import * as Fx from "effect/typed/fx"
import { DomRenderTemplate, render } from "effect/typed/template"
import { Services } from "./infrastructure"
import { TodoApp } from "./presentation"

await render(TodoApp, document.body).pipe(
  Fx.drainLayer,
  Layer.provide([Services, DomRenderTemplate]),
  Layer.launch,
  Effect.runPromise
)
