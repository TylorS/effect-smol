const NODE_TYPE = 111

export class PersistentDocumentFragment {
  readonly firstChild: Comment
  readonly fragment: DocumentFragment
  readonly lastChild: Comment

  readonly nodeType = NODE_TYPE
  readonly ELEMENT_NODE = 1
  readonly TEXT_NODE = 3
  readonly COMMENT_NODE = 8
  readonly DOCUMENT_FRAGMENT_NODE = 11

  constructor(
    firstChild: Comment,
    fragment: DocumentFragment,
    lastChild: Comment
  ) {
    this.firstChild = firstChild
    this.fragment = fragment
    this.lastChild = lastChild

    this.rebuildFragment()
  }

  valueOf(): Node | DocumentFragment | null {
    this.rebuildFragment()
    if (this.fragment.childNodes.length < 3) return null
    if (this.fragment.childNodes.length === 3) return this.fragment.childNodes[1] as Node
    return this.fragment
  }

  toString(): string {
    this.rebuildFragment()
    return Array.from(this.fragment.childNodes, getOuterHtml).join("")
  }

  getChildNodes(): Array<Node> {
    this.rebuildFragment()
    return Array.from(this.fragment.childNodes).slice(1, -1)
  }

  private rebuildFragment() {
    if (this.fragment.childNodes.length === 0) {
      for (const node of getAllSiblingsBetween(this.firstChild, this.lastChild)) {
        this.fragment.append(node)
      }
    }
  }
}

export function getAllSiblingsBetween(start: Node, end: Node): Array<Node> {
  const siblings = [start]
  let node: Node | null = start.nextSibling
  while (node !== null && node !== end) {
    siblings.push(node)
    node = node.nextSibling
  }
  siblings.push(end)
  return siblings
}

export const diffable = (document: Document) => (node: Node, operation: number): Node => {
  if (node.nodeType !== NODE_TYPE) return node

  if (1 / operation < 0) {
    return operation ? remove(node, document) : (node.lastChild as Node)
  }

  return operation ? (node.valueOf() as Node) : (node.firstChild as Node)
}

const remove = ({ firstChild, lastChild }: Node, document: Document): Node => {
  const range = document.createRange()
  range.setStartAfter(firstChild!)
  range.setEndAfter(lastChild!)
  range.deleteContents()
  return firstChild as Node
}

export function getElements(node: Rendered): Array<Element> {
  if (Array.isArray(node)) return node.flatMap((node) => getElements(node))
  if (node instanceof PersistentDocumentFragment) {
    return node.getChildNodes().filter((node) => node.nodeType === 1) as Array<Element>
  }
  return node.nodeType === 1 ? [node as Element] : []
}

export function getNodes(node: Rendered): Array<Node> {
  if (Array.isArray(node)) return node.flatMap((node) => getNodes(node))
  if (node instanceof PersistentDocumentFragment) {
    return node.getChildNodes()
  }
  return [node]
}

export function getOuterHtml(node: Rendered): string {
  if (Array.isArray(node)) return node.map((node) => getOuterHtml(node)).join("")
  if (node instanceof PersistentDocumentFragment) return node.toString()
  if (node.nodeType === node.ELEMENT_NODE) return (node as Element).outerHTML
  if (node.nodeType === node.COMMENT_NODE) return `<!--${node.textContent}-->`
  if (node.nodeType === node.TEXT_NODE) return node.textContent ?? ""
  return node.textContent ?? node.nodeValue ?? ""
}

export type Rendered = Node | Array<Node> | PersistentDocumentFragment

export function isComment(rendered: Rendered): rendered is Comment {
  if (Array.isArray(rendered)) return false
  return rendered.nodeType === 8
}

export function isCommentWithValue(rendered: Rendered, value: string): rendered is Comment {
  if (Array.isArray(rendered)) return false
  return isComment(rendered) && rendered.nodeValue === value
}

export function isElement(rendered: Rendered): rendered is Element {
  if (Array.isArray(rendered)) return false
  return rendered.nodeType === 1
}

export function isText(rendered: Rendered): rendered is Text {
  if (Array.isArray(rendered)) return false
  return rendered.nodeType === 3
}
