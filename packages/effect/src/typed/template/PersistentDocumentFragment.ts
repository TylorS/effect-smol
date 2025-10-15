const NODE_TYPE = 111

export class PersistentDocumentFragment {
  readonly firstChild: Comment
  readonly fragment: DocumentFragment
  readonly lastChild: Comment

  readonly nodeType = NODE_TYPE

  constructor(
    firstChild: Comment,
    fragment: DocumentFragment,
    lastChild: Comment
  ) {
    this.firstChild = firstChild
    this.fragment = fragment
    this.lastChild = lastChild

    fragment.prepend(firstChild)
    fragment.append(lastChild)
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
      this.fragment.append(this.firstChild)

      let next = this.firstChild.nextSibling
      while (next && next !== this.lastChild) {
        this.fragment.append(next)
        next = next.nextSibling
      }

      this.fragment.append(this.lastChild)
    }
  }
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

export function getElements(node: Node | Array<Node> | PersistentDocumentFragment): Array<Element> {
  if (Array.isArray(node)) return node.flatMap((node) => getElements(node))
  if (node instanceof PersistentDocumentFragment) {
    return node.getChildNodes().filter((node) => node.nodeType === 1) as Array<Element>
  }
  return node.nodeType === 1 ? [node as Element] : []
}

export function getOuterHtml(node: Node | Array<Node> | PersistentDocumentFragment): string {
  if (Array.isArray(node)) return node.map((node) => getOuterHtml(node)).join("")
  if (node instanceof PersistentDocumentFragment) return node.toString()
  if (node.nodeType === 1) return (node as Element).outerHTML
  return node.textContent ?? node.nodeValue ?? ""
}
