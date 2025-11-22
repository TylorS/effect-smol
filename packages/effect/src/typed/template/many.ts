import * as Option from "effect/data/Option"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type { Scope } from "effect/Scope"
import * as ServiceMap from "effect/ServiceMap"
import * as Fx from "effect/typed/fx"
import * as RefSubject from "effect/typed/fx/RefSubject"
import { HydrateContext } from "./HydrateContext.ts"
import { renderToString } from "./internal/encoding.ts"
import { DomRenderEvent, HtmlRenderEvent, isHtmlRenderEvent, type RenderEvent } from "./RenderEvent.ts"

// We wrap the all the nodes in a single RenderEvent so that we can micro-optimize
// the downstream behaviors of diffing/patching.
const wrapInRenderEvent = Fx.map((events: ReadonlyArray<RenderEvent>): RenderEvent =>
  DomRenderEvent(
    events.flatMap((event) => getNodesFromRendered(event))
  )
)

export function many<A, E, R, B extends PropertyKey, R2, E2>(
  values: Fx.Fx<ReadonlyArray<A>, E, R>,
  getKey: (a: A) => B,
  render: (value: RefSubject.RefSubject<A>, key: B) => Fx.Fx<RenderEvent, E2, R2 | Scope>
): Fx.Fx<RenderEvent, E | E2, R | R2 | Scope> {
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
        }).pipe(
          wrapInRenderEvent
        )
      }

      return Fx.keyed(values, { getKey, onValue: render }).pipe(
        wrapInRenderEvent
      )
    }

    const initial = yield* Fx.first(values)
    if (Option.isNone(initial) || initial.value.length === 0) return Fx.empty
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
  render: (value: RefSubject.RefSubject<A>, key: B) => Fx.Fx<RenderEvent, E2, R2 | Scope>,
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

function getNodesFromRendered(rendered: RenderEvent): Array<globalThis.Node> {
  const value = rendered.valueOf() as globalThis.Node | Array<globalThis.Node>
  return Array.isArray(value) ? value : [value]
}

export const MANY_HOLE = (key: PropertyKey) => `<!--/m_${key.toString()}-->`
