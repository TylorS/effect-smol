import * as Option from "../../data/Option.ts"
import * as Effect from "../../Effect.ts"
import * as Layer from "../../Layer.ts"
import type { Scope } from "../../Scope.ts"
import * as ServiceMap from "../../ServiceMap.ts"
import * as Fx from "../fx/Fx.js"
import * as RefSubject from "../fx/RefSubject/RefSubject.ts"
import { HydrateContext } from "./HydrateContext.ts"
import { renderToString } from "./internal/encoding.ts"
import { DomRenderEvent, HtmlRenderEvent, isHtmlRenderEvent, type RenderEvent } from "./RenderEvent.ts"

// We wrap the all the nodes in a single RenderEvent so that we can micro-optimize
// the downstream behaviors of diffing/patching.
const wrapInRenderEvent = Fx.map((events: ReadonlyArray<RenderEvent>): RenderEvent =>
  DomRenderEvent(
    events.flatMap(getNodesFromRendered)
  )
)

/**
 * Efficiently renders a reactive list of items by using keys to minimize DOM operations and maintain component state.
 *
 * `many` optimizes list rendering by:
 * 1. **Keyed Diffing**: Uniquely identifies items using `getKey`. Components are only mounted when a new key appears and unmounted when a key disappears.
 * 2. **Granular Updates**: Instead of re-rendering the component when an item changes, `many` passes a `RefSubject<A>` to the `render` function.
 *    The component remains mounted, and the `RefSubject` emits the updated value, allowing the component to update only the changed parts of the DOM.
 *
 * This pattern is essential for performance when rendering lists where items may be reordered, added, removed, or modified in place.
 *
 * **Rendering Modes:**
 *
 * `many` behaves differently based on the environment:
 * - **HTML/SSR** (Computed Behavior = `'one'`): Concurrently renders all portions of the list but streams ready pieces in the order of their definitions.
 * - **DOM** (Computed Behavior = `'multiple'`): Integrates with hydration behaviors to reuse existing DOM nodes or efficiently update the DOM using keyed diffing.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import { html, many } from "@typed/template"
 * import { DomRenderTemplate, render } from "@typed/template/Render"
 * import { Fx } from "@typed/fx"
 * import { Layer } from "effect"
 * import * as RefSubject from "@typed/fx/RefSubject"
 *
 * interface Todo {
 *   readonly id: string
 *   readonly text: string
 *   readonly completed: boolean
 * }
 *
 * const program = Effect.gen(function* () {
 *   const todos = yield* RefSubject.make<Todo[]>([
 *     { id: "1", text: "Learn Effect", completed: false },
 *     { id: "2", text: "Build app", completed: false }
 *   ])
 *
 *   const todoList = many(
 *     todos,
 *     (todo) => todo.id, // Key function
 *     (todoRef, key) => // Render function receives RefSubject
 *       html`<li>
 *         ${RefSubject.map(todoRef, (todo) => todo.text)}
 *         <button onclick=${RefSubject.update(todoRef, (todo) =>
 *           ({ ...todo, completed: !todo.completed })
 *         )}>Toggle</button>
 *       </li>`
 *   )
 *
 *   const template = html`<ul>${todoList}</ul>`
 *
 *   yield* render(template, document.body).pipe(
 *     Fx.drainLayer,
 *     Layer.provide(DomRenderTemplate),
 *     Layer.launch
 *   )
 * })
 * ```
 *
 * @since 1.0.0
 * @category rendering
 */
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
