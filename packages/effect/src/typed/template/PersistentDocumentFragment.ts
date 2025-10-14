export class PersistentDocumentFragment {
  readonly firstChild: Comment
  readonly fragment: DocumentFragment
  readonly lastChild: Comment

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

  valueOf(): DocumentFragment {
    this.rebuildFragment()
    return this.fragment
  }

  toString(): string {
    this.rebuildFragment()
    return Array.from(this.fragment.childNodes, getOuterHtml).join("")
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

export function getOuterHtml(node: Node | Array<Node> | PersistentDocumentFragment): string {
  if (Array.isArray(node)) return node.map((node) => getOuterHtml(node)).join("")
  if (node instanceof PersistentDocumentFragment) return node.toString()
  if (node.nodeType === Node.ELEMENT_NODE) return (node as Element).outerHTML
  return node.textContent ?? node.nodeValue ?? ""
}
