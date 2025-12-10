import { map } from "../../Effect.ts"
import type { Scope } from "../../Scope.ts"
import * as ServiceMap from "../../ServiceMap.ts"
import type { Fx } from "../fx/Fx.ts"
import { unwrap } from "../fx/Fx.ts"
import type { Renderable } from "./Renderable.ts"
import type { RenderEvent } from "./RenderEvent.ts"

/**
 * A service that defines how templates are rendered.
 *
 * Different implementations can be provided for different environments (e.g., `DomRenderTemplate` for browsers,
 * `HtmlRenderTemplate` for SSR).
 *
 * @example
 * ```ts
 * import { Effect, Layer } from "effect"
 * import { html } from "@typed/template"
 * import { DomRenderTemplate } from "@typed/template/Render"
 * import { HtmlRenderTemplate } from "@typed/template/Html"
 * import { Fx } from "@typed/fx"
 *
 * // Use DOM rendering for browser
 * const browserApp = Effect.gen(function* () {
 *   const template = html`<div>Hello</div>`
 *   yield* render(template, document.body).pipe(
 *     Fx.provide(DomRenderTemplate)
 *   )
 * })
 *
 * // Use HTML rendering for SSR
 * const serverApp = Effect.gen(function* () {
 *   const template = html`<div>Hello</div>`
 *   const htmlString = yield* renderToHtmlString(template).pipe(
 *     Fx.provide(HtmlRenderTemplate)
 *   )
 *   console.log(htmlString) // "<div>Hello</div>"
 * })
 * ```
 *
 * @since 1.0.0
 * @category models
 */
export class RenderTemplate extends ServiceMap.Service<RenderTemplate, {
  <const Values extends ArrayLike<Renderable.Any>>(
    template: TemplateStringsArray,
    values: Values
  ): Fx<RenderEvent, Renderable.Error<Values[number]>, Renderable.Services<Values[number]> | Scope>
}>()("RenderTemplate") {}

/**
 * The main template tag function.
 *
 * It creates a reactive `Fx` stream that renders the template. The actual rendering logic
 * depends on the provided `RenderTemplate` service.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import { html } from "@typed/template"
 * import { DomRenderTemplate, render } from "@typed/template/Render"
 * import { Fx } from "@typed/fx"
 * import { Layer } from "effect"
 *
 * // Simple static template
 * const staticTemplate = html`<div>Hello, world!</div>`
 *
 * // Template with dynamic values
 * const name = "Alice"
 * const dynamicTemplate = html`<div>Hello, ${name}!</div>`
 *
 * // Template with reactive values
 * const program = Effect.gen(function* () {
 *   const count = yield* RefSubject.make(0)
 *
 *   const template = html`<div>
 *     <p>Count: ${count}</p>
 *     <button onclick=${RefSubject.increment(count)}>Increment</button>
 *   </div>`
 *
 *   yield* render(template, document.body).pipe(
 *     Fx.drainLayer,
 *     Layer.provide(DomRenderTemplate),
 *     Layer.launch
 *   )
 * })
 * ```
 *
 * @param template - The template strings.
 * @param values - The interpolated values.
 * @returns An `Fx` that emits `RenderEvent`s.
 * @since 1.0.0
 * @category constructors
 */
export function html<const Values extends ReadonlyArray<Renderable.Any> = readonly []>(
  template: TemplateStringsArray,
  ...values: Values
): Fx<
  RenderEvent,
  Renderable.Error<Values[number]>,
  Renderable.Services<Values[number]> | Scope | RenderTemplate
> {
  return unwrap(map(RenderTemplate.asEffect(), (render) => render(template, values)))
}
