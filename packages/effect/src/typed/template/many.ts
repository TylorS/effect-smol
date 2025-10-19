import * as Option from "../../data/Option.ts"
import * as Effect from "../../Effect.ts"
import type { Scope } from "../../Scope.ts"
import * as Fx from "../fx/index.ts"
import * as RefSubject from "../fx/ref-subject/RefSubject.ts"
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
      // TODO: Handle HydrateContext

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
