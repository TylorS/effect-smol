import { type Inspectable, NodeInspectSymbol } from "../../../interfaces/Inspectable.ts"
import { CouldNotFindRootElement, CouldNotFindTemplateEndError } from "../errors.ts"
import type { HydrateContext } from "../HydrateContext.ts"
import { isComment, isElement, toHtml } from "../Wire.ts"

const TYPED_TEMPLATE_PREFIX = `t_`
const TYPED_TEMPLATE_END_PREFIX = `/t_`
const MANY_PREFIX = `/m_`
const HOLE_PREFIX = `n_`

export function getRendered(where: HydrationNode) {
  const nodes = getNodes(where)
  if (nodes.length === 1) return nodes[0]
  return nodes
}

export function findHydrationTemplateByHash(
  hydrateCtx: HydrateContext,
  hash: string
): HydrationTemplate | null {
  // If there is not a manyKey, we can just find the template by its hash
  if (hydrateCtx.manyKey === undefined) {
    return findHydrationTemplate(getChildNodes(hydrateCtx.where), hash)
  }

  // If there is a manyKey, we need to find the many node first
  const many = findHydrationMany(getChildNodes(hydrateCtx.where), hydrateCtx.manyKey)

  if (many === null) return null

  // Then we can find the template by its hash
  return findHydrationTemplate(getChildNodes(many), hash)
}

export function getHydrationRoot(root: HTMLElement): HydrationElement {
  const childNodes = Array.from(root.childNodes)
  let hydrationNodes = getHydrationNodes(childNodes)

  // If your whole template is wrapped in a single hole, unwrap it.
  if (hydrationNodes.length === 1 && hydrationNodes[0]._tag === "hole") {
    hydrationNodes = getChildNodes(hydrationNodes[0])
  }

  return new HydrationElement(root, hydrationNodes)
}

function getHydrationNodes(nodes: Array<Node>): Array<HydrationNode> {
  const out: Array<HydrationNode> = []

  for (let i = 0; i < nodes.length; ++i) {
    const node = nodes[i]
    if (isComment(node)) {
      if (node.data.startsWith(TYPED_TEMPLATE_PREFIX)) {
        const hash = node.data.slice(TYPED_TEMPLATE_PREFIX.length)
        const endIndex = getTemplateEndIndex(nodes, i, hash)
        const childNodes = nodes.slice(i + 1, endIndex)

        out.push(new HydrationTemplate(hash, getHydrationNodes(childNodes)))

        i = endIndex
      } else if (node.data.startsWith(MANY_PREFIX)) {
        const last = out.pop()
        out.push(new HydrationMany(node.data.slice(MANY_PREFIX.length), node, last ? [last] : []))
      } else if (node.data.startsWith(HOLE_PREFIX)) {
        const index = parseInt(node.data.slice(HOLE_PREFIX.length), 10)
        const endIndex = getHoleEndIndex(nodes, i, index)
        const endComment = nodes[endIndex] as Comment
        out.push(new HydrationHole(index, node, endComment, getHydrationNodes(nodes.slice(i + 1, endIndex))))
        i = endIndex
      } else {
        out.push(new HydrationLiteral(node))
      }
    } else if (isElement(node)) {
      out.push(new HydrationElement(node, getHydrationNodes(Array.from(node.childNodes))))
    } else {
      out.push(new HydrationLiteral(node))
    }
  }

  return out
}

function getTemplateEndIndex(nodes: Array<Node>, start: number, hash: string): number {
  const endHash = TYPED_TEMPLATE_END_PREFIX + hash

  for (let i = start; i < nodes.length; ++i) {
    const node = nodes[i]

    if (isComment(node) && node.data === endHash) {
      return i
    }
  }

  throw new CouldNotFindTemplateEndError(hash)
}

function getHoleEndIndex(nodes: Array<Node>, start: number, index: number): number {
  const endHash = `/${HOLE_PREFIX}${index}`

  let templateDepth = 0

  for (let i = start; i < nodes.length; ++i) {
    const node = nodes[i]

    if (isComment(node)) {
      if (templateDepth === 0 && node.data === endHash) return i
      else if (node.data.startsWith(TYPED_TEMPLATE_PREFIX)) templateDepth++
      else if (node.data.startsWith(TYPED_TEMPLATE_END_PREFIX)) templateDepth--
    }
  }

  throw new CouldNotFindRootElement(index)
}

export class HydrationElement implements Inspectable {
  readonly _tag = "element" as const

  readonly parentNode: Element
  readonly childNodes: Array<HydrationNode>

  constructor(
    parentNode: Element,
    childNodes: Array<HydrationNode>
  ) {
    this.parentNode = parentNode
    this.childNodes = childNodes
  }

  toJSON(): unknown {
    return {
      _tag: this._tag,
      parentNode: toHtml(this.parentNode),
      childNodes: this.childNodes.map((n) => n.toJSON())
    }
  }

  [NodeInspectSymbol]() {
    return JSON.stringify(this.toJSON(), null, 2)
  }
}

export class HydrationTemplate implements Inspectable {
  readonly _tag = "template" as const

  readonly hash: string
  readonly childNodes: Array<HydrationNode>

  constructor(
    hash: string,
    childNodes: Array<HydrationNode>
  ) {
    this.hash = hash
    this.childNodes = childNodes
  }

  toJSON(): unknown {
    return {
      _tag: this._tag,
      hash: this.hash,
      childNodes: this.childNodes.map((n) => n.toJSON())
    }
  }

  [NodeInspectSymbol]() {
    return JSON.stringify(this.toJSON(), null, 2)
  }
}

export type HydrationNode = HydrationElement | HydrationTemplate | HydrationMany | HydrationHole | HydrationLiteral

export class HydrationMany implements Inspectable {
  readonly _tag = "many" as const

  readonly key: string
  readonly comment: Comment
  readonly childNodes: Array<HydrationNode>

  constructor(
    key: string,
    comment: Comment,
    childNodes: Array<HydrationNode>
  ) {
    this.key = key
    this.comment = comment
    this.childNodes = childNodes
  }

  toJSON(): unknown {
    return {
      _tag: this._tag,
      key: this.key,
      childNodes: this.childNodes.map((n) => n.toJSON())
    }
  }

  [NodeInspectSymbol]() {
    return JSON.stringify(this.toJSON(), null, 2)
  }
}

export class HydrationHole implements Inspectable {
  readonly _tag = "hole" as const

  readonly index: number
  readonly startComment: Comment
  readonly endComment: Comment
  readonly childNodes: Array<HydrationNode>

  constructor(
    index: number,
    startComment: Comment,
    endComment: Comment,
    childNodes: Array<HydrationNode>
  ) {
    this.index = index
    this.startComment = startComment
    this.endComment = endComment
    this.childNodes = childNodes
  }

  toJSON(): unknown {
    return {
      _tag: this._tag,
      index: this.index,
      childNodes: this.childNodes.map((n) => n.toJSON())
    }
  }

  [NodeInspectSymbol]() {
    return JSON.stringify(this.toJSON(), null, 2)
  }
}

export class HydrationLiteral implements Inspectable {
  readonly _tag = "literal" as const

  readonly node: Node

  constructor(
    node: Node
  ) {
    this.node = node
  }

  toJSON(): unknown {
    return {
      _tag: this._tag,
      node: toHtml(this.node)
    }
  }

  [NodeInspectSymbol]() {
    return JSON.stringify(this.toJSON(), null, 2)
  }
}

export function getChildNodes(node: HydrationNode): Array<HydrationNode> {
  switch (node._tag) {
    case "literal":
      return []
    case "hole":
    case "element":
    case "template":
    case "many":
      return node.childNodes
  }
}

export function findHydrationTemplate(
  nodes: Array<HydrationNode>,
  templateHash: string
): HydrationTemplate | null {
  const toProcess: Array<HydrationNode> = [...nodes]

  while (toProcess.length > 0) {
    const node = toProcess.shift()!

    if (node._tag === "template" && node.hash === templateHash) {
      return node
    } else if (node._tag === "element") {
      // eslint-disable-next-line no-restricted-syntax
      toProcess.push(...node.childNodes)
    }
  }

  return null
}

export function findHydrationMany(
  nodes: Array<HydrationNode>,
  key: string
): HydrationMany | null {
  for (let i = 0; i < nodes.length; ++i) {
    const node = nodes[i]
    if (node._tag === "many" && node.key === key) {
      return node
    }
  }

  return null
}

export function findHydrationHole(nodes: Array<HydrationNode>, index: number): HydrationHole | null {
  for (const node of nodes) {
    if (node._tag === "hole" && node.index === index) {
      return node
    } else if (node._tag === "element") {
      const found = findHydrationHole(node.childNodes, index)
      if (found !== null) {
        return found
      }
    }
  }

  return null
}

export function findHydrationNode(
  node: HydrationNode,
  index: number,
  manyKey?: string
): HydrationHole | HydrationMany | null {
  const childNodes = getChildNodes(node)
  const found = manyKey === undefined
    ? findHydrationHole(childNodes, index)
    : findHydrationMany(childNodes, manyKey)

  return found
}

export function getNodes(node: HydrationNode): Array<Node> {
  switch (node._tag) {
    case "element":
      return [node.parentNode]
    case "literal":
      return [node.node]
    case "hole":
      return [node.startComment, ...node.childNodes.flatMap(getNodes), node.endComment]
    case "many":
      return [...node.childNodes.flatMap(getNodes), node.comment]
    case "template":
      return node.childNodes.flatMap(getNodes)
  }
}

export function getNodesExcludingStartComment(node: HydrationNode): Array<Node> {
  switch (node._tag) {
    case "element":
      return [node.parentNode]
    case "literal":
      return [node.node]
    case "hole":
      return [...node.childNodes.flatMap(getNodesExcludingStartComment), node.endComment]
    case "many":
      return [...node.childNodes.flatMap(getNodesExcludingStartComment), node.comment]
    case "template":
      return node.childNodes.flatMap(getNodesExcludingStartComment)
  }
}

export const findHydratePath = (
  node: HydrationNode,
  path: ReadonlyArray<number>
): Node => {
  if (path.length === 0) {
    return getNodesExcludingStartComment(node)[0]
  }

  const [first, ...rest] = path

  // Hydration adds an extra starting comment node which should not be included in the path
  let current: Node = getNodesExcludingStartComment(node)[first]
  for (const index of rest) {
    // Use secondary index to skip start comments without creating intermediate arrays
    let targetIndex = 0

    for (const child of current.childNodes) {
      if (isNotStartComment(child)) {
        if (targetIndex === index) {
          current = child
          break
        }
        targetIndex++
      }
    }
  }

  return current
}

function isNotStartComment(node: Node) {
  return !isComment(node) || !node.data.startsWith("n_")
}
