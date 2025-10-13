import { type Inspectable, NodeInspectSymbol } from "effect/interfaces/Inspectable"

export class Template implements Inspectable {
  readonly _tag = "template"

  readonly nodes: ReadonlyArray<Node>
  readonly hash: string
  readonly parts: ReadonlyArray<
    readonly [part: PartNode | SparsePartNode, path: Array<number>]
  >

  constructor(
    nodes: ReadonlyArray<Node>,
    hash: string,
    parts: ReadonlyArray<
      readonly [part: PartNode | SparsePartNode, path: Array<number>]
    >
  ) {
    this.nodes = nodes
    this.hash = hash
    this.parts = parts
  }

  toJSON() {
    return {
      _tag: "template",
      nodes: this.nodes,
      hash: this.hash,
      parts: this.parts
    }
  }

  [NodeInspectSymbol]() {
    return this.toJSON()
  }
}

export type ParentNode = ElementNode | SelfClosingElementNode | TextOnlyElement

export type Node =
  | ElementNode
  | SelfClosingElementNode
  | TextOnlyElement
  | TextNode
  | NodePart
  | Comment
  | DocType

export type PartNode =
  | AttrPartNode
  | BooleanPartNode
  | ClassNamePartNode
  | DataPartNode
  | EventPartNode
  | NodePart
  | PropertyPartNode
  | PropertiesPartNode
  | RefPartNode
  | TextPartNode
  | CommentPartNode

export type SparsePartNode = SparseAttrNode | SparseClassNameNode | SparseCommentNode | SparseTextNode

export class ElementNode {
  readonly _tag = "element"
  readonly tagName: string
  readonly attributes: Array<Attribute>
  readonly children: Array<Node>
  constructor(
    tagName: string,
    attributes: Array<Attribute>,
    children: Array<Node>
  ) {
    this.tagName = tagName
    this.attributes = attributes
    this.children = children
  }
}

export class NodePart {
  readonly _tag = "node"
  readonly index: number
  constructor(index: number) {
    this.index = index
  }
}

export class SelfClosingElementNode {
  readonly _tag = "self-closing-element"
  readonly tagName: string
  readonly attributes: Array<Attribute>
  constructor(
    tagName: string,
    attributes: Array<Attribute>
  ) {
    this.tagName = tagName
    this.attributes = attributes
  }
}

export class TextOnlyElement {
  readonly _tag = "text-only-element"

  readonly tagName: string
  readonly attributes: Array<Attribute>
  readonly textContent: Text | null
  constructor(
    tagName: string,
    attributes: Array<Attribute>,
    textContent: Text | null
  ) {
    this.tagName = tagName
    this.attributes = attributes
    this.textContent = textContent
  }
}

export class DocType {
  readonly _tag = "doctype"
  readonly name: string
  readonly publicType: string | undefined
  readonly systemId: string | undefined
  constructor(
    name: string,
    publicType?: string,
    systemId?: string
  ) {
    this.name = name
    this.publicType = publicType
    this.systemId = systemId
  }
}

export type Attribute =
  | AttributeNode
  | AttrPartNode
  | SparseAttrNode
  | BooleanNode
  | BooleanPartNode
  | ClassNameNode
  | SparseClassNameNode
  | DataPartNode
  | EventPartNode
  | PropertyPartNode
  | PropertiesPartNode
  | RefPartNode

export class AttributeNode {
  readonly _tag = "attribute" as const
  readonly name: string
  readonly value: string
  constructor(
    name: string,
    value: string
  ) {
    this.name = name
    this.value = value
  }
}

export class AttrPartNode {
  readonly _tag = "attr" as const
  readonly name: string
  readonly index: number
  constructor(
    name: string,
    index: number
  ) {
    this.name = name
    this.index = index
  }
}

export class SparseAttrNode {
  readonly _tag = "sparse-attr" as const
  readonly name: string
  readonly nodes: Array<AttrPartNode | TextNode>
  constructor(
    name: string,
    nodes: Array<AttrPartNode | TextNode>
  ) {
    this.name = name
    this.nodes = nodes
  }
}

export class BooleanNode {
  readonly _tag = "boolean" as const
  readonly name: string
  constructor(name: string) {
    this.name = name
  }
}

export class BooleanPartNode {
  readonly _tag = "boolean-part" as const
  readonly name: string
  readonly index: number
  constructor(
    name: string,
    index: number
  ) {
    this.name = name
    this.index = index
  }
}

export type ClassNameNode = TextNode | ClassNamePartNode

export class ClassNamePartNode {
  readonly _tag = "className-part" as const
  readonly index: number
  constructor(index: number) {
    this.index = index
  }
}

export class SparseClassNameNode {
  readonly _tag = "sparse-class-name" as const

  readonly nodes: Array<ClassNameNode>
  constructor(nodes: Array<ClassNameNode>) {
    this.nodes = nodes
  }
}

export class DataPartNode {
  readonly _tag = "data" as const

  readonly index: number
  constructor(index: number) {
    this.index = index
  }
}

export class EventPartNode {
  readonly _tag = "event" as const
  readonly name: string
  readonly index: number
  constructor(
    name: string,
    index: number
  ) {
    this.name = name
    this.index = index
  }
}

export class PropertyPartNode {
  readonly _tag = "property" as const
  readonly name: string
  readonly index: number
  constructor(
    name: string,
    index: number
  ) {
    this.name = name
    this.index = index
  }
}

export class PropertiesPartNode {
  readonly _tag = "properties" as const
  readonly index: number
  constructor(
    index: number
  ) {
    this.index = index
  }
}

export class RefPartNode {
  readonly _tag = "ref" as const

  readonly index: number
  constructor(index: number) {
    this.index = index
  }
}

export type Text = TextNode | TextPartNode | SparseTextNode

export class TextNode {
  readonly _tag = "text" as const

  readonly value: string
  constructor(value: string) {
    this.value = value
  }
}

export class TextPartNode {
  readonly _tag = "text-part" as const

  readonly index: number
  constructor(index: number) {
    this.index = index
  }
}

export class SparseTextNode {
  readonly _tag = "sparse-text" as const
  readonly nodes: Array<TextNode | TextPartNode>
  constructor(nodes: Array<TextNode | TextPartNode>) {
    this.nodes = nodes
  }
}

export type Comment = CommentNode | CommentPartNode | SparseCommentNode

export class CommentNode {
  readonly _tag = "comment" as const

  readonly value: string
  constructor(value: string) {
    this.value = value
  }
}

export class CommentPartNode {
  readonly _tag = "comment-part" as const

  readonly index: number
  constructor(index: number) {
    this.index = index
  }
}

export class SparseCommentNode {
  readonly _tag = "sparse-comment" as const

  readonly nodes: Array<TextNode | CommentPartNode>
  constructor(nodes: Array<TextNode | CommentPartNode>) {
    this.nodes = nodes
  }
}
