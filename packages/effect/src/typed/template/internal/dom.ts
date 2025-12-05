/// <reference types="./udomdiff.d.ts" />

import udomdiff from "udomdiff"
import { isNullish, isObject } from "../../../data/Predicate.ts"
import * as Effect from "../../../Effect.ts"
import { CouldNotFindCommentError } from "../errors.ts"
import { type EventHandler, fromEffectOrEventHandler, isEventHandler } from "../EventHandler.ts"
import {
  type DomRenderEvent,
  type HtmlRenderEvent,
  isRenderEvent,
  type RenderEvent,
  RenderEventTypeId
} from "../RenderEvent.js"
import { diffable, isComment } from "../Wire.ts"
import { renderToString } from "./encoding.ts"

export function makeTextContentUpdater(element: Node) {
  return (value: unknown) => {
    element.textContent = renderToString(value, "")
  }
}

export function makeAttributeValueUpdater(element: HTMLElement | SVGElement, attr: Attr) {
  let isSet = false
  const setValue = (value: string | null | undefined) => {
    if (isNullish(value)) {
      element.removeAttribute(attr.name)
      isSet = false
    } else {
      attr.value = value
      if (isSet === false) {
        element.setAttributeNode(attr)
        isSet = true
      }
    }
  }

  return setValue
}

export function makeClassListUpdater(element: HTMLElement | SVGElement) {
  // We do double-bookeeping such that we don't assume we know everything about the classList
  // Other DOM-based libraries might have additional classes in the classList, so we need to allow them to exist
  // outside of our control.
  let classList: ReadonlyArray<string> = Array.from(element.classList)
  return (classNames: ReadonlyArray<string>) => {
    const { added, removed } = diffStrings(classList, classNames)
    if (added.length > 0) {
      element.classList.add(...added)
    }
    if (removed.length > 0) {
      element.classList.remove(...removed)
    }
    classList = classNames
  }
}

export function makeDatasetUpdater(element: HTMLElement | SVGElement) {
  // We do double-bookeeping such that we don't assume we know everything about the dataset
  // Other DOM-based libraries might have additional keys in the dataset, so we need to allow them to exist
  // outside of our control.
  const previous = { ...element.dataset }
  return (value: unknown) => {
    const diff = diffDataSet(previous, value as Record<string, string | undefined>)
    if (diff) {
      const { added, removed } = diff
      removed.forEach((k) => {
        delete element.dataset[k]
        delete previous[k]
      })
      added.forEach(([k, v]) => {
        element.dataset[k] = v
        previous[k] = v
      })
    }
  }
}

export function diffStrings(
  previous: ReadonlyArray<string> | null | undefined,
  current: ReadonlyArray<string> | null | undefined
): { added: ReadonlyArray<string>; removed: ReadonlyArray<string>; unchanged: ReadonlyArray<string> } {
  if (previous == null || previous.length === 0) {
    return {
      added: current || [],
      removed: [],
      unchanged: []
    }
  } else if (current == null || current.length === 0) {
    return {
      added: [],
      removed: previous,
      unchanged: []
    }
  } else {
    const added = current.filter((c) => !previous.includes(c))
    const removed: Array<string> = []
    const unchanged: Array<string> = []

    for (let i = 0; i < previous.length; ++i) {
      if (current.includes(previous[i])) {
        unchanged.push(previous[i])
      } else {
        removed.push(previous[i])
      }
    }

    return {
      added,
      removed,
      unchanged
    }
  }
}

export function diffDataSet(
  a: Record<string, string | undefined> | null | undefined,
  b: Record<string, string | undefined> | null | undefined
):
  | { added: Array<readonly [string, string | undefined]>; removed: ReadonlyArray<string> }
  | null
{
  if (!a) return b ? { added: Object.entries(b), removed: [] } : null
  if (!b) return { added: [], removed: Object.keys(a) }

  const { added, removed, unchanged } = diffStrings(Object.keys(a), Object.keys(b))

  return {
    added: added.concat(unchanged).map((k) => [k, b[k]] as const),
    removed
  }
}

export function getClassList(value: unknown): ReadonlyArray<string> {
  if (isNullish(value)) return []
  if (Array.isArray(value)) return value.flatMap(getClassList)
  return splitClassNames(renderToString(value, ""))
}

const ASCII_SPACE_CODE = 32

/**
 * Splits a string of class names (like those used in HTML `class=""` attributes)
 * into an array of individual class names (words), separated by whitespace.
 *
 * This function avoids creating intermediate arrays and unnecessary string copying by:
 *   - Scanning the string one character at a time
 *   - Skipping over all leading whitespace for each word
 *   - Collecting all consecutive non-whitespace characters as a "word"
 *   - Repeating until the input is exhausted
 *
 * All ASCII "whitespace" characters with code <= 32 are considered as delimiters.
 * This is more efficient than `String.prototype.trim` and `String.prototype.split(/\s+/)`
 * as it only allocates memory for the result array, not for intermediate or empty strings.
 *
 * Example:
 *    splitClassNames("  foo   bar\tbaz\nqux  ") // => ["foo", "bar", "baz", "qux"]
 */
export function splitClassNames(value: string): Array<string> {
  const result: Array<string> = []
  let start = 0
  const len = value.length

  while (start < len) {
    // Skip leading whitespace (all ASCII <= 32)
    while (start < len && value.charCodeAt(start) <= ASCII_SPACE_CODE) start++
    if (start >= len) break
    // Find the end of the word (next whitespace)
    let end = start + 1
    while (end < len && value.charCodeAt(end) > ASCII_SPACE_CODE) end++
    result.push(value.slice(start, end))
    // Move start past the end of the last word (one char after end)
    start = end + 1
  }

  return result
}

export function matchNodeValue<A, B>(
  document: Document,
  value: unknown,
  onText: (text: string) => A,
  onNodes: (nodes: Array<Node>) => B
): A | B {
  switch (typeof value) {
    // primitives are handled as text content
    case "string":
    case "symbol":
    case "number":
    case "bigint":
    case "boolean":
      return onText(String(value))
    case "undefined":
    case "function":
    case "object": {
      if (isNullish(value)) {
        return onNodes([])
      } else if (isRenderEvent(value)) {
        return onNodes(unwrapRenderEvent(document, value))
      } else if (Array.isArray(value)) {
        return onNodes(value.flatMap((_) => renderEventToArray(document, _)))
      } else {
        return onNodes(renderEventToArray(document, value))
      }
    }
  }
}

export function renderEventToArray(document: Document, x: unknown): Array<Node> {
  switch (typeof x) {
    case "string":
    case "number":
    case "bigint":
    case "boolean":
    case "symbol":
      return [document.createTextNode(String(x))]
    case "undefined":
    case "function":
    case "object":
      if (isNullish(x)) return []
      if (isRenderEvent(x)) return unwrapRenderEvent(document, x)
      if (Array.isArray(x)) return x.flatMap((_) => renderEventToArray(document, _))
      return [x as Node]
    default:
      return []
  }
}

function unwrapRenderEvent(document: Document, x: RenderEvent): Array<Node> {
  if (x[RenderEventTypeId] === "dom") return unwrapDomRenderEvent(x)
  return unwrapHtmlRenderEvent(document, x)
}

function unwrapDomRenderEvent(x: DomRenderEvent): Array<Node> {
  const value = x.content
  return Array.isArray(value) ? value : [value as Node]
}

function unwrapHtmlRenderEvent(document: Document, x: HtmlRenderEvent): Array<Node> {
  const tmp = document.createElement("template")
  tmp.innerHTML = x.html
  return Array.from(tmp.childNodes)
}

export function diffChildren(
  comment: Comment,
  currentNodes: Array<Node>,
  nextNodes: Array<Node>,
  document: Document
) {
  return udomdiff(
    comment.parentNode!,
    currentNodes,
    nextNodes,
    diffable(document),
    comment
  )
}

export function findNodePartEndComment(parent: Element, index: number) {
  const childNodes = parent.childNodes

  for (let i = 0; i < childNodes.length; ++i) {
    const node = childNodes[i]

    if (isCommentWithValue(node, `/n_${index}`)) {
      return node
    }
  }

  throw new CouldNotFindCommentError(index)
}

export function findNodePartStartComment(parent: Element, index: number) {
  const childNodes = parent.childNodes

  for (let i = 0; i < childNodes.length; ++i) {
    const node = childNodes[i]
    if (isCommentWithValue(node, `n_${index}`)) {
      return node
    }
  }

  throw new CouldNotFindCommentError(index)
}

function isCommentWithValue(node: Node, value: string): node is Comment {
  return isComment(node) && node.nodeValue === value
}

export function makeNodeUpdater(
  document: Document,
  comment: Comment,
  text: Text | null = null,
  nodes: Array<Node> = []
) {
  const element = comment.parentNode as HTMLElement | SVGElement
  const updateCommentText = (value: unknown) => {
    if (text === null) {
      text = document.createTextNode("")
      element.insertBefore(text, comment)
    }

    text.textContent = renderToString(value, "")
    nodes = diffChildren(comment, nodes, [text], document)
  }

  const updateNodes = (updatedNodes: Array<Node>) => {
    nodes = diffChildren(comment, nodes, updatedNodes, document)
  }

  return (value: unknown) => {
    matchNodeValue(document, value, updateCommentText, updateNodes)
  }
}

export function makeBooleanUpdater(element: HTMLElement | SVGElement, name: string) {
  return (value: boolean) => {
    element.toggleAttribute(name, value)
  }
}

export function getAttributeValue(value: unknown): string | null | undefined {
  if (isNullish(value)) return null
  return renderToString(value, "")
}

export function getBooleanValue(value: unknown): boolean {
  return !!value
}

export function getDatasetValue(value: unknown): Record<string, string | undefined> | null | undefined {
  if (isNullish(value)) return null
  if (isObject(value)) return value as Record<string, string | undefined>
  return null
}

export function getEventHandlerValue<E, R>(value: unknown): EventHandler<Event, E, R> | null | undefined {
  if (isNullish(value)) return null
  if (isEventHandler(value) || Effect.isEffect(value)) return fromEffectOrEventHandler(value)
  return null
}
