import { map } from "../../Effect.ts"
import type { Scope } from "../../Scope.ts"
import * as ServiceMap from "../../ServiceMap.ts"
import type { Fx } from "../fx/Fx.ts"
import { unwrap } from "../fx/index.ts"
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
