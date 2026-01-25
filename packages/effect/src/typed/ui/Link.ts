import * as Effect from "../../Effect.ts"
import type { Scope } from "../../Scope.ts"
import type { Stream } from "../../Stream.ts"
import { type Fx, gen } from "../fx/Fx.ts"
import { RefSubject } from "../fx/RefSubject.ts"
import { getUrl } from "../navigation/_core.ts"
import type { NavigationError } from "../navigation/model.ts"
import { Navigation } from "../navigation/Navigation.ts"
import * as EventHandler from "../template/EventHandler.ts"
import type { Renderable } from "../template/Renderable.ts"
import type { RenderEvent } from "../template/RenderEvent.ts"
import { html, type RenderTemplate } from "../template/RenderTemplate.ts"

type EventHandlerProperty = `on${string}`

type AnchorEventHandlers = {
  readonly [K in keyof HTMLAnchorElement as K extends EventHandlerProperty ? K : never]?:
  | Effect.Effect<unknown, any, any>
  | EventHandler.EventHandler<Event, any, any>
}

type AnchorRef = {
  readonly ref?: (
    element: HTMLAnchorElement
  ) => void | Effect.Effect<unknown, any, any> | Stream<unknown, any, any> | Fx<unknown, any, any>
}

type AnchorProperties = {
  readonly [K in keyof HTMLAnchorElement as K extends EventHandlerProperty | "ref" ? never : K]?: Renderable<
    HTMLAnchorElement[K],
    any,
    any
  >
}

export interface LinkOptions extends AnchorEventHandlers, AnchorRef, AnchorProperties {
  readonly href: Renderable<string, any, any>
  readonly replace?: boolean
}

function makeLinkClickHandler(replace$: RefSubject.RefSubject<boolean>): EventHandler.EventHandler<
  MouseEvent,
  NavigationError,
  Navigation
> {
  return EventHandler.make((ev: MouseEvent) =>
    Effect.gen(function* () {
      const anchor = ev.currentTarget as HTMLAnchorElement
      const href = anchor.href
      if (ev.ctrlKey || ev.metaKey || ev.shiftKey) return
      const t = anchor.target
      if (t && t !== "_self") return
      const nav = yield* Navigation
      const target = getUrl(nav.origin, href)
      if (target.origin !== nav.origin) return
      ev.preventDefault()
      const replace = yield* replace$
      yield* nav.navigate(href, { history: replace ? "replace" : "push" })
    })
  )
}

/**
 * Renders an `<a href="...">` that intercepts same-origin, same-document clicks
 * and navigates via `Navigation.navigate` instead of full page load. Requires
 * `Navigation` and `RenderTemplate` in the Effect context (e.g. `BrowserRouter`).
 */
export function Link<const Opts extends LinkOptions>(options: Opts) {
  return <Values extends ReadonlyArray<Renderable.Any> = readonly []>(
    template: TemplateStringsArray,
    ...values: Values
  ): Fx<
    RenderEvent,
    Renderable.ErrorFromObject<Opts> | Renderable.Error<Values[number]>,
    Renderable.ServicesFromObject<Opts> | Renderable.Services<Values[number]> | Scope | RenderTemplate
  > =>
    gen(function* () {
      const { replace = false, onclick, ...rest } = options
      const replace$ = yield* RefSubject.make(replace)
      const navigationHandler = makeLinkClickHandler(replace$)

      // Merge navigation handler with user-provided onclick if present
      const clickHandler: EventHandler.EventHandler<MouseEvent, any, any> = onclick
        ? EventHandler.make((ev: MouseEvent) =>
          Effect.gen(function* () {
            const userHandler = EventHandler.fromEffectOrEventHandler(
              onclick as Effect.Effect<unknown, any, any> | EventHandler.EventHandler<MouseEvent, any, any>
            )
            yield* userHandler.handler(ev)
            if (ev.defaultPrevented) return
            yield* navigationHandler.handler(ev)
          })
        )
        : navigationHandler

      // Build properties object with all options except href and replace
      const props: Record<string, unknown> = { ...rest, onclick: clickHandler }

      return html`<a ...${props}>${html(template, ...values)}</a>`
    })
}
