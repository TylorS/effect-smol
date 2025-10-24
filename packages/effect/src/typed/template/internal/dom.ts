/// <reference types="./udomdiff.d.ts" />

import udomdiff from "udomdiff"
import { isNullish } from "../../../data/Predicate.ts"
import { CouldNotFindCommentError } from "../errors.ts"
import { diffable } from "../PersistentDocumentFragment.ts"
import { isRenderEvent, RenderEventTypeId } from "../RenderEvent.ts"
import { renderToString } from "./encoding.ts"

export function makeTextContentUpdater(element: Node) {
  return (value: unknown) => {
    element.textContent = renderToString(value, "")
  }
}

export function makeAttributeValueUpdater(element: HTMLElement | SVGElement, attr: Attr) {
  let isSet = false
  const setValue = (value: unknown) => {
    if (isNullish(value)) {
      element.removeAttribute(attr.name)
      isSet = false
    } else {
      attr.value = renderToString(value, "")
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
  return (value: unknown) => {
    const classNames = getClassList(value)
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
  if (isNullish(value)) {
    return []
  }
  if (Array.isArray(value)) {
    return value.flatMap(getClassList)
  }
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
      } else if (Array.isArray(value)) {
        // arrays can be used to cleanup, if empty
        if (value.length === 0) return onNodes([])
        // or diffed, if these contains nodes or "wires"
        return onNodes(value.flatMap((_) => renderEventToArray(document, _)))
      } else if (isRenderEvent(value)) {
        const isHtml = value[RenderEventTypeId] === "html"
        if (isHtml) {
          const tmp = document.createElement("template")
          tmp.innerHTML = value.html
          return onNodes(Array.from(tmp.childNodes))
        } else {
          return onNodes(renderEventToArray(document, value))
        }
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
      if (Array.isArray(x)) return x.flatMap((_) => renderEventToArray(document, _))
      if (isRenderEvent(x)) {
        if (x[RenderEventTypeId] === "dom") {
          const value = x.valueOf()
          return Array.isArray(value) ? value : [value as Node]
        }
        const tmp = document.createElement("template")
        tmp.innerHTML = x.html
        return Array.from(tmp.childNodes)
      }
      return [x as Node]
    default:
      return []
  }
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

export function findHoleComment(parent: Element, index: number) {
  const childNodes = parent.childNodes

  for (let i = 0; i < childNodes.length; ++i) {
    const node = childNodes[i]

    if (node.nodeType === 8 && node.nodeValue === `/n_${index}`) {
      return node as Comment
    }
  }

  throw new CouldNotFindCommentError(index)
}

export function findHoleStartComment(parent: Element, index: number) {
  const childNodes = parent.childNodes

  for (let i = 0; i < childNodes.length; ++i) {
    const node = childNodes[i]
    if (node.nodeType === 8 && node.nodeValue === `n_${index}`) {
      return node as Comment
    }
  }

  throw new CouldNotFindCommentError(index)
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
    nodes = diffChildren(comment, nodes, [text, comment], document)
  }

  const updateNodes = (updatedNodes: Array<Node>) => {
    if (updatedNodes[updatedNodes.length - 1] !== comment) {
      updatedNodes.push(comment)
    }
    nodes = diffChildren(comment, nodes, updatedNodes, document)
  }

  return (value: unknown) => {
    matchNodeValue(document, value, updateCommentText, updateNodes)
  }
}

export function makeBooleanUpdater(element: HTMLElement | SVGElement, name: string) {
  return (value: unknown) => {
    element.toggleAttribute(name, !!value)
  }
}
