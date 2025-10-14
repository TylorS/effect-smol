import { hasProperty } from "../../data/Predicate.ts"
import { getOuterHtml, type PersistentDocumentFragment } from "./PersistentDocumentFragment.ts"

export type RenderEvent =
  | DomRenderEvent
  | HtmlRenderEvent

export const RenderEventTypeId = Symbol.for("@typed/template/RenderEvent")
export type RenderEventTypeId = typeof RenderEventTypeId

export interface DomRenderEvent {
  readonly [RenderEventTypeId]: "dom"
  readonly content: Node | Array<Node> | PersistentDocumentFragment
  readonly toString: () => string
}

export const DomRenderEvent = (content: Node | Array<Node> | PersistentDocumentFragment): DomRenderEvent => ({
  [RenderEventTypeId]: "dom",
  content,
  toString: () => getOuterHtml(content)
})

export interface HtmlRenderEvent {
  readonly [RenderEventTypeId]: "html"
  readonly html: string
  readonly last: boolean
  readonly toString: () => string
}

export const HtmlRenderEvent = (html: string, last: boolean): HtmlRenderEvent => ({
  [RenderEventTypeId]: "html",
  html,
  last,
  toString: () => html
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
