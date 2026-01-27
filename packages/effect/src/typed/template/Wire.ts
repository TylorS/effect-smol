/**
 * Wire is a data type that serves as a persistent, reusable DocumentFragment.
 *
 * Unlike a standard `DocumentFragment`, which empties itself when appended to the DOM,
 * a `Wire` retains references to its child nodes. This allows it to be moved around
 * the DOM or updated without losing track of its content.
 *
 * It is used internally to manage the lifecycle of template instances.
 *
 * @example
 * ```ts
 * import { persistent } from "@typed/template/Wire"
 *
 * // Wire is created internally by the template renderer
 * // It wraps DocumentFragments with multiple children
 * // to maintain references after DOM operations
 * ```
 *
 * @since 1.0.0
 * @category models
 */
export interface Wire {
  readonly ELEMENT_NODE: 1
  readonly DOCUMENT_FRAGMENT_NODE: 11
  readonly nodeType: 111
  readonly firstChild: Node | null
  readonly lastChild: Node | null
  readonly childNodes: Array<Node>
  readonly valueOf: () => DocumentFragment
}

const ELEMENT_NODE = 1
const DOCUMENT_FRAGMENT_NODE = 11
const nodeType = 111

const remove = ({ firstChild, lastChild }: Node, document: Document): Node => {
  const range = document.createRange()

  range.setStartAfter(firstChild!)

  range.setEndAfter(lastChild!)
  range.deleteContents()
  return firstChild as Node
}

/**
 * Create a diffable node from any Node which also might be a Wire.
 * @internal
 */
export const diffable = (document: Document) => (node: Node, operation: number): Node => {
  if (node.nodeType !== nodeType) return node

  if (1 / operation < 0) {
    return operation ? remove(node, document) : (node.lastChild as Node)
  }

  return operation ? (node.valueOf() as Node) : (node.firstChild as Node)
}

/**
 * Creates a Wire from a DocumentFragment.
 *
 * If the fragment has only one child, that child is returned directly.
 * If it has multiple children, they are wrapped in a `Wire` structure (bounded by comments)
 * to allow them to be treated as a single unit.
 */
export const persistent = (
  document: Document,
  templateHash: string,
  fragment: DocumentFragment
): DocumentFragment | Node | Wire => {
  const { childNodes } = fragment
  const { length } = childNodes
  if (length === 0) return fragment
  if (length === 1) return childNodes[0]
  const firstChild = document.createComment(`t_${templateHash}`)
  const lastChild = document.createComment(`/t_${templateHash}`)
  return fromComments(fragment, firstChild, lastChild)
}

/**
 * Creates a Wire from a Fragment and boundary comments.
 * @internal
 */
export const fromComments = (
  fragment: DocumentFragment,
  firstChild: Comment,
  lastChild: Comment
): Wire => {
  if (fragment.childNodes[0] !== firstChild) {
    fragment.prepend(firstChild)
  }
  if (fragment.childNodes[fragment.childNodes.length - 1] !== lastChild) {
    fragment.append(lastChild)
  }

  const getChildNodes = () => {
    const nodes = getAllSiblingsBetween(firstChild, lastChild)

    if (fragment.childNodes.length !== nodes.length) {
      fragment.replaceChildren(...nodes)
    }

    return nodes
  }

  return {
    ELEMENT_NODE,
    DOCUMENT_FRAGMENT_NODE,
    nodeType,
    firstChild,
    lastChild,
    get childNodes() {
      return getChildNodes()
    },
    valueOf(): DocumentFragment {
      getChildNodes()
      return fragment
    }
  }
}

/**
 * Gets all sibling nodes between a start and end node (exclusive).
 * @internal
 */
export function getAllSiblingsBetween(start: Node, end: Node): Array<Node> {
  const siblings = []
  let node = start.nextSibling as Node
  while (node && node !== end) {
    siblings.push(node)
    node = node.nextSibling as Node
  }
  return siblings
}

/**
 * A union type representing all possible rendered values.
 * Can be a single Node, a DocumentFragment, a Wire, or an array of these.
 *
 * @example
 * ```ts
 * import type { Rendered } from "@typed/template/Wire"
 *
 * // Rendered can be various DOM node types
 * const node: Rendered = document.createElement("div")
 * const fragment: Rendered = document.createDocumentFragment()
 * const array: Rendered = [node, fragment]
 * ```
 *
 * @since 1.0.0
 * @category models
 */
export type Rendered = Rendered.Value | ReadonlyArray<Rendered>

export namespace Rendered {
  /**
   * Single rendered value type.
   */
  export type Value = Node | DocumentFragment | Wire

  /**
   * Extract the values from a Rendered type
   */
  export type Values<T extends Rendered> = [T] extends [ReadonlyArray<infer R>] ?
    ReadonlyArray<R | Exclude<T, ReadonlyArray<any>>>
    : ReadonlyArray<T>

  /**
   * Extract the elements from a Rendered type
   */
  export type Elements<T extends Rendered> = ReadonlyArray<
    [Node] extends [Exclude<T, DocumentFragment | Wire | ReadonlyArray<Rendered>>] ? HTMLElement | SVGElement
      : Exclude<T, DocumentFragment | Wire | ReadonlyArray<Rendered>>
  >
}

/**
 * Checks if a rendered node is a `Wire`.
 */
export function isWire(node: Rendered): node is Wire {
  if (!isArray(node)) return node.nodeType === nodeType
  return false
}

/**
 * Checks if a rendered node is a standard DOM `Node`.
 */
export function isNode(node: Rendered): node is Node {
  if (!isArray(node)) return node.nodeType !== node.DOCUMENT_FRAGMENT_NODE
  return false
}

/**
 * Checks if a rendered node is an `Element`.
 */
export function isElement(node: Rendered): node is Element {
  return isNode(node) && node.nodeType === node.ELEMENT_NODE
}

/**
 * Checks if a rendered node is an `SVGElement`.
 */
export function isSvgElement(node: Rendered): node is SVGElement {
  return isElement(node) && "ownerSVGElement" in node
}

/**
 * Checks if a rendered node is an `HTMLElement`.
 */
export function isHtmlElement(node: Rendered): node is HTMLElement {
  return isElement(node) && !("ownerSVGElement" in node)
}

/**
 * Checks if a rendered node is a `Text` node.
 */
export function isText(node: Rendered): node is Text {
  return isNode(node) && node.nodeType === node.TEXT_NODE
}

/**
 * Checks if a rendered node is an `Attr` node.
 */
export function isAttr(node: Rendered): node is Attr {
  return isNode(node) && node.nodeType === node.ATTRIBUTE_NODE
}

/**
 * Checks if a rendered node is a `Comment` node.
 */
export function isComment(node: Rendered): node is Comment {
  return isNode(node) && node.nodeType === node.COMMENT_NODE
}

/**
 * Checks if a rendered node is a `DocumentFragment`.
 */
export function isDocumentFragment(node: Rendered): node is DocumentFragment {
  if (!isArray(node)) return node.nodeType === node.DOCUMENT_FRAGMENT_NODE
  return false
}

/**
 * Checks if a rendered value is an array of nodes.
 */
export function isArray(node: Rendered): node is ReadonlyArray<Rendered> {
  return Array.isArray(node)
}

/**
 * Converts a `Rendered` value to an HTML string.
 *
 * @example
 * ```ts
 * import { toHtml } from "@typed/template/Wire"
 *
 * const div = document.createElement("div")
 * div.textContent = "Hello"
 * const html = toHtml(div) // "<div>Hello</div>"
 *
 * const fragment = document.createDocumentFragment()
 * fragment.appendChild(div)
 * const fragmentHtml = toHtml(fragment) // "<div>Hello</div>"
 * ```
 *
 * @since 1.0.0
 * @category utilities
 */
export function toHtml(node: Rendered): string {
  if (isArray(node)) return node.map(toHtml).join("")
  if (isWire(node)) return toHtml(node.valueOf())
  if (isElement(node)) return node.outerHTML
  if (isText(node)) return node.data
  if (isComment(node)) return `<!--${node.data}-->`
  if (isDocumentFragment(node)) return Array.from(node.childNodes ?? [], toHtml).join("")
  return node.nodeValue || ""
}

/**
 * Extracts all Elements from a `Rendered` value.
 *
 * @example
 * ```ts
 * import { getElements } from "@typed/template/Wire"
 *
 * const div = document.createElement("div")
 * const span = document.createElement("span")
 * const fragment = document.createDocumentFragment()
 * fragment.appendChild(div)
 * fragment.appendChild(span)
 *
 * const elements = getElements(fragment)
 * console.log(elements.length) // 2
 * ```
 *
 * @since 1.0.0
 * @category utilities
 */
export function getElements(node: Rendered): Array<Element> {
  if (isArray(node)) return node.flatMap(getElements)
  if (isWire(node)) return getElements(node.valueOf())
  if (isElement(node)) return [node]
  if (isDocumentFragment(node)) return Array.from(node.childNodes ?? []).flatMap(getElements)
  return []
}
