import { map } from "effect/Effect"
import type { Scope } from "effect/Scope"
import * as ServiceMap from "effect/ServiceMap"
import type { Fx } from "effect/typed/fx"
import { unwrap } from "effect/typed/fx"
import type { Renderable } from "./Renderable.ts"
import type { RenderEvent } from "./RenderEvent.ts"

export class RenderTemplate extends ServiceMap.Service<RenderTemplate, {
  <const Values extends ArrayLike<Renderable.Any>>(
    template: TemplateStringsArray,
    values: Values
  ): Fx<RenderEvent, Renderable.Error<Values[number]>, Renderable.Services<Values[number]> | Scope>
}>()("RenderTemplate") {}

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
