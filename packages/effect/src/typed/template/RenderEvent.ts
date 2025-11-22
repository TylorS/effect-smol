import { hasProperty } from "effect/data/Predicate"
import { type Rendered, toHtml } from "./Wire.ts"

/**
 * Represents the result of a rendering operation.
 * Can be either a DOM-based event (containing actual Nodes) or an HTML-based event (containing strings).
 */
export type RenderEvent =
  | DomRenderEvent
  | HtmlRenderEvent

export const RenderEventTypeId = Symbol.for("@typed/template/RenderEvent")
export type RenderEventTypeId = typeof RenderEventTypeId

/**
 * A RenderEvent containing DOM nodes.
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
 */
export const DomRenderEvent = (content: Rendered): DomRenderEvent => ({
  [RenderEventTypeId]: "dom",
  content,
  toString: () => toHtml(content),
  valueOf: () => content
})

/**
 * A RenderEvent containing an HTML string.
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
 */
export function isRenderEvent(event: unknown): event is RenderEvent {
  return hasProperty(event, RenderEventTypeId)
}

/**
 * Checks if a value is a `DomRenderEvent`.
 */
export function isDomRenderEvent(event: unknown): event is DomRenderEvent {
  return isRenderEvent(event) && event[RenderEventTypeId] === "dom"
}

/**
 * Checks if a value is an `HtmlRenderEvent`.
 */
export function isHtmlRenderEvent(event: unknown): event is HtmlRenderEvent {
  return isRenderEvent(event) && event[RenderEventTypeId] === "html"
}
