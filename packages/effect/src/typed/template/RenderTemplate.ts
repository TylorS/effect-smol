import { map } from "effect/Effect"
import type { Scope } from "effect/Scope"
import * as ServiceMap from "effect/ServiceMap"
import { Fx } from "effect/typed/fx"
import type { Renderable } from "./Renderable.ts"
import type { RenderEvent } from "./RenderEvent.ts"

/**
 * A service that defines how templates are rendered.
 *
 * Different implementations can be provided for different environments (e.g., `DomRenderTemplate` for browsers,
 * `HtmlRenderTemplate` for SSR).
 */
export class RenderTemplate extends ServiceMap.Service<RenderTemplate, {
  <const Values extends ArrayLike<Renderable.Any>>(
    template: TemplateStringsArray,
    values: Values
  ): Fx.Fx<RenderEvent, Renderable.Error<Values[number]>, Renderable.Services<Values[number]> | Scope>
}>()("RenderTemplate") {}

/**
 * The main template tag function.
 *
 * It creates a reactive `Fx` stream that renders the template. The actual rendering logic
 * depends on the provided `RenderTemplate` service.
 *
 * @example
 * ```ts
 * import { html } from "@typed/template"
 *
 * const myTemplate = html`<div>Hello ${name}</div>`
 * ```
 *
 * @param template - The template strings.
 * @param values - The interpolated values.
 * @returns An `Fx` that emits `RenderEvent`s.
 */
export function html<const Values extends ReadonlyArray<Renderable.Any> = readonly []>(
  template: TemplateStringsArray,
  ...values: Values
): Fx.Fx<
  RenderEvent,
  Renderable.Error<Values[number]>,
  Renderable.Services<Values[number]> | Scope | RenderTemplate
> {
  return Fx.unwrap(map(RenderTemplate.asEffect(), (render) => render(template, values)))
}
