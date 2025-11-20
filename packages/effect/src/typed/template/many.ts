import * as Option from "effect/data/Option"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type { Scope } from "effect/Scope"
import * as ServiceMap from "effect/ServiceMap"
import * as Fx from "effect/typed/fx"
import * as RefSubject from "effect/typed/fx/RefSubject"
import { HydrateContext } from "./HydrateContext.ts"
import { renderToString } from "./internal/encoding.ts"
import { HtmlRenderEvent, isHtmlRenderEvent, type RenderEvent } from "./RenderEvent.ts"

export function many<A, E, R, B extends PropertyKey, R2, E2>(
  values: Fx.Fx<ReadonlyArray<A>, E, R>,
  getKey: (a: A) => B,
  render: (value: RefSubject.RefSubject<A>, key: B) => Fx.Fx<RenderEvent, E2, R2>
): Fx.Fx<RenderEvent | ReadonlyArray<RenderEvent> | null, E | E2, R | R2 | Scope> {
  return Fx.gen(function*() {
    const behavior = yield* RefSubject.CurrentComputedBehavior
    if (behavior === "multiple") {
      const services = yield* Effect.services<never>()
      const hydrateContext = ServiceMap.getOption(services, HydrateContext)
      // If we're hydrating, attempt to provide the correct HydrateContext to rendering Fx
      if (Option.isSome(hydrateContext) && hydrateContext.value.hydrate) {
        return Fx.keyed(values, {
          getKey,
          onValue: (ref, key) =>
            Fx.provide(
              render(ref, key),
              Layer.succeedServices(
                HydrateContext.serviceMap({ ...hydrateContext.value, manyKey: key.toString() })
              )
            )
        })
      }

      return Fx.keyed(values, { getKey, onValue: render })
    }

    const initial = yield* Fx.first(values)
    if (Option.isNone(initial) || initial.value.length === 0) return Fx.null
    const initialValues = initial.value
    const lastIndex = initialValues.length - 1
    return Fx.mergeOrdered(
      ...initialValues.map((value, i) => renderValue<A, E, R, B, R2, E2>(value, getKey, render, i === lastIndex))
    )
  })
}

function renderValue<A, E, R, B extends PropertyKey, R2, E2>(
  value: A,
  getKey: (a: A) => B,
  render: (value: RefSubject.RefSubject<A>, key: B) => Fx.Fx<RenderEvent, E2, R2>,
  last: boolean
): Fx.Fx<RenderEvent, E | E2, R | R2 | Scope> {
  return Fx.unwrap(Effect.map(RefSubject.make(value), (ref) => {
    const key = getKey(value)

    return render(RefSubject.slice(ref, 0, 1), key).pipe(
      Fx.dropAfter((e) => isHtmlRenderEvent(e) && e.last),
      Fx.map((r) => HtmlRenderEvent(renderToString(r, ""), false)),
      Fx.append(HtmlRenderEvent(MANY_HOLE(key), last))
    )
  }))
}

export const MANY_HOLE = (key: PropertyKey) => `<!--/m_${key.toString()}-->`
