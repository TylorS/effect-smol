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

type IfEquals<X, Y, Output> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? Output
  : never

type WritableKeys<T> = {
  [P in keyof T]-?: IfEquals<
    { [Q in P]: T[P] },
    { -readonly [Q in P]: T[P] },
    P
  >
}[keyof T]

type AnchorProperties = {
  readonly [K in WritableKeys<HTMLAnchorElement> as K extends EventHandlerProperty | "ref" ? never : K]?: Renderable<
    HTMLAnchorElement[K],
    any,
    any
  >
}

export interface LinkOptions extends AnchorEventHandlers, AnchorRef, AnchorProperties {
  readonly href: Renderable<string, any, any>
  readonly content: Renderable<string | number | boolean | null | undefined | void | RenderEvent, any, any>
  readonly replace?: boolean // false
}

function makeLinkClickHandler(replace$: RefSubject.RefSubject<boolean>): EventHandler.EventHandler<
  MouseEvent & { readonly currentTarget: HTMLAnchorElement },
  NavigationError,
  Navigation
> {
  return EventHandler.make((ev: MouseEvent & { readonly currentTarget: HTMLAnchorElement }) =>
    Effect.gen(function*() {
      const href = ev.currentTarget.href
      if (ev.ctrlKey || ev.metaKey || ev.shiftKey) return
      const t = ev.currentTarget.target
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
export function Link<const Opts extends LinkOptions>(
  options: Opts
): Fx<RenderEvent, Renderable.ErrorFromObject<Opts>, Renderable.ServicesFromObject<Opts> | Scope | RenderTemplate> {
  return gen(function*() {
    const { replace = false, onclick, content: children, ...rest } = options
    const replace$ = yield* RefSubject.make(replace)
    const navigationHandler = makeLinkClickHandler(replace$)
    const userHandler = onclick ? EventHandler.fromEffectOrEventHandler(onclick) : undefined
    const clickHandler = userHandler
      ? EventHandler.make(
        Effect.fn(function*(ev: MouseEvent & { readonly currentTarget: HTMLAnchorElement }) {
          yield* userHandler.handler(ev)
          if (ev.defaultPrevented) return
          yield* navigationHandler.handler(ev)
        }),
        userHandler.options
      )
      : navigationHandler

    const props: Record<string, unknown> = { ...rest, onclick: clickHandler }

    return html`<a ...${props}>${children}</a>`
  })
}
