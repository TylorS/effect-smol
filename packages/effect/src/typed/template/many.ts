import * as Option from "../../data/Option.ts"
import * as Effect from "../../Effect.ts"
import type { Scope } from "../../Scope.ts"
import * as Fx from "../fx/index.ts"
import * as RefSubject from "../fx/ref-subject/RefSubject.ts"
import { HtmlRenderEvent, type RenderEvent } from "./RenderEvent.ts"

export function many<A, E, R, B extends PropertyKey, R2, E2>(
  values: Fx.Fx<ReadonlyArray<A>, E, R>,
  getKey: (a: A) => B,
  render: (value: RefSubject.RefSubject<A>, key: B) => Fx.Fx<RenderEvent, E2, R2>
): Fx.Fx<RenderEvent | ReadonlyArray<RenderEvent> | null, E | E2, R | R2 | Scope> {
  return Fx.gen(function*() {
    const behavior = yield* RefSubject.CurrentComputedBehavior
    if (behavior === "multiple") {
      return Fx.keyed(values, {
        getKey,
        onValue: render
      })
    }

    const initial = yield* Fx.first(values)
    if (Option.isNone(initial)) return Fx.null
    const initialValues = initial.value
    const lastIndex = initialValues.length - 1
    return Fx.mergeOrdered(...initialValues.map((value, i) =>
      Fx.unwrap(
        Effect.map(RefSubject.make(value), (ref) => {
          const key = getKey(value)
          return Fx.append(
            Fx.map(
              render(RefSubject.slice(ref, 0, 1), key),
              (r) => HtmlRenderEvent((r as HtmlRenderEvent).html, false)
            ),
            HtmlRenderEvent(MANY_HOLE(key), i === lastIndex)
          )
        })
      )
    ))
  })
}

export const MANY_HOLE = (key: PropertyKey) => `<!--m_${key.toString()}-->`
