import { hasProperty } from "../../data/Predicate.ts"
import { type Rendered, toHtml } from "./Wire.ts"

export type RenderEvent =
  | DomRenderEvent
  | HtmlRenderEvent

export const RenderEventTypeId = Symbol.for("@typed/template/RenderEvent")
export type RenderEventTypeId = typeof RenderEventTypeId

export interface DomRenderEvent {
  readonly [RenderEventTypeId]: "dom"
  readonly content: Rendered
  readonly toString: () => string
  readonly valueOf: () => Rendered
}

export const DomRenderEvent = (content: Rendered): DomRenderEvent => ({
  [RenderEventTypeId]: "dom",
  content,
  toString: () => toHtml(content),
  valueOf: () => content
})

export interface HtmlRenderEvent {
  readonly [RenderEventTypeId]: "html"
  readonly html: string
  readonly last: boolean
  readonly toString: () => string
  readonly valueOf: () => string
}

export const HtmlRenderEvent = (html: string, last: boolean): HtmlRenderEvent => ({
  [RenderEventTypeId]: "html",
  html,
  last,
  toString: () => html,
  valueOf: () => html
})

export function isRenderEvent(event: unknown): event is RenderEvent {
  return hasProperty(event, RenderEventTypeId)
}

export function isDomRenderEvent(event: unknown): event is DomRenderEvent {
  return isRenderEvent(event) && event[RenderEventTypeId] === "dom"
}

export function isHtmlRenderEvent(event: unknown): event is HtmlRenderEvent {
  return isRenderEvent(event) && event[RenderEventTypeId] === "html"
}
