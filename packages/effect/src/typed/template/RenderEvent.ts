import { hasProperty } from "effect/data/Predicate"
import { type Rendered, toHtml } from "./Wire.ts"

/**
 * Represents the result of a rendering operation.
 * Can be either a DOM-based event (containing actual Nodes) or an HTML-based event (containing strings).
 *
 * @example
 * ```ts
 * import { html } from "effect/typed/template"
 * import { DomRenderEvent, HtmlRenderEvent } from "effect/typed/template/RenderEvent"
 * import { Fx } from "effect/typed/fx"
 *
 * const template = html`<div>Hello</div>`
 *
 * // Render events are emitted by the template Fx
 * const program = Fx.gen(function* () {
 *   const event = yield* Fx.first(template)
 *
 *   if (event && DomRenderEvent.isDomRenderEvent(event)) {
 *     // Handle DOM event
 *     const nodes = event.valueOf()
 *   } else if (event && HtmlRenderEvent.isHtmlRenderEvent(event)) {
 *     // Handle HTML event
 *     const html = event.toString()
 *   }
 * })
 * ```
 *
 * @since 1.0.0
 * @category models
 */
export type RenderEvent =
  | DomRenderEvent
  | HtmlRenderEvent

export const RenderEventTypeId = Symbol.for("@typed/template/RenderEvent")
export type RenderEventTypeId = typeof RenderEventTypeId

/**
 * A RenderEvent containing DOM nodes.
 *
 * @example
 * ```ts
 * import { DomRenderEvent } from "effect/typed/template/RenderEvent"
 *
 * const node = document.createElement("div")
 * const event = DomRenderEvent(node)
 *
 * // Get the DOM node
 * const domNode = event.valueOf()
 *
 * // Convert to HTML string
 * const htmlString = event.toString()
 * ```
 *
 * @since 1.0.0
 * @category models
 */
export interface DomRenderEvent {
  readonly [RenderEventTypeId]: "dom"
  /**
   * The actual rendered DOM content.
   */
  readonly content: Rendered
  readonly toString: () => string
  readonly valueOf: () => Rendered
}

/**
 * Creates a `DomRenderEvent`.
 *
 * @example
 * ```ts
 * import { DomRenderEvent } from "effect/typed/template/RenderEvent"
 *
 * const div = document.createElement("div")
 * div.textContent = "Hello"
 * const event = DomRenderEvent(div)
 * ```
 *
 * @since 1.0.0
 * @category constructors
 */
export const DomRenderEvent = (content: Rendered): DomRenderEvent => ({
  [RenderEventTypeId]: "dom",
  content,
  toString: () => toHtml(content),
  valueOf: () => content
})

/**
 * A RenderEvent containing an HTML string.
 *
 * @example
 * ```ts
 * import { HtmlRenderEvent } from "effect/typed/template/RenderEvent"
 *
 * const event = HtmlRenderEvent("<div>Hello</div>", true)
 *
 * // Get the HTML string
 * const html = event.toString()
 *
 * // Check if it's the last chunk
 * if (event.last) {
 *   console.log("Final chunk")
 * }
 * ```
 *
 * @since 1.0.0
 * @category models
 */
export interface HtmlRenderEvent {
  readonly [RenderEventTypeId]: "html"
  /**
   * The rendered HTML string.
   */
  readonly html: string
  /**
   * Indicates if this is the last part of a chunked render.
   */
  readonly last: boolean
  readonly toString: () => string
  readonly valueOf: () => string
}

/**
 * Creates an `HtmlRenderEvent`.
 *
 * @example
 * ```ts
 * import { HtmlRenderEvent } from "effect/typed/template/RenderEvent"
 *
 * // Create a single-chunk HTML event
 * const event = HtmlRenderEvent("<div>Hello</div>", true)
 *
 * // Create a multi-chunk HTML event
 * const chunk1 = HtmlRenderEvent("<div>", false)
 * const chunk2 = HtmlRenderEvent("Hello", false)
 * const chunk3 = HtmlRenderEvent("</div>", true)
 * ```
 *
 * @since 1.0.0
 * @category constructors
 */
export const HtmlRenderEvent = (html: string, last: boolean): HtmlRenderEvent => ({
  [RenderEventTypeId]: "html",
  html,
  last,
  toString: () => html,
  valueOf: () => html
})

/**
 * Checks if a value is a `RenderEvent`.
 *
 * @example
 * ```ts
 * import { isRenderEvent, DomRenderEvent } from "effect/typed/template/RenderEvent"
 *
 * const event = DomRenderEvent(document.createElement("div"))
 * console.log(isRenderEvent(event)) // true
 * console.log(isRenderEvent("not an event")) // false
 * ```
 *
 * @since 1.0.0
 * @category guards
 */
export function isRenderEvent(event: unknown): event is RenderEvent {
  return hasProperty(event, RenderEventTypeId)
}

/**
 * Checks if a value is a `DomRenderEvent`.
 *
 * @example
 * ```ts
 * import { isDomRenderEvent, DomRenderEvent } from "effect/typed/template/RenderEvent"
 *
 * const event = DomRenderEvent(document.createElement("div"))
 * console.log(isDomRenderEvent(event)) // true
 * ```
 *
 * @since 1.0.0
 * @category guards
 */
export function isDomRenderEvent(event: unknown): event is DomRenderEvent {
  return isRenderEvent(event) && event[RenderEventTypeId] === "dom"
}

/**
 * Checks if a value is an `HtmlRenderEvent`.
 *
 * @example
 * ```ts
 * import { isHtmlRenderEvent, HtmlRenderEvent } from "effect/typed/template/RenderEvent"
 *
 * const event = HtmlRenderEvent("<div>Hello</div>", true)
 * console.log(isHtmlRenderEvent(event)) // true
 * ```
 *
 * @since 1.0.0
 * @category guards
 */
export function isHtmlRenderEvent(event: unknown): event is HtmlRenderEvent {
  return isRenderEvent(event) && event[RenderEventTypeId] === "html"
}
