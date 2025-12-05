import { type Inspectable, NodeInspectSymbol } from "../../interfaces/Inspectable.ts"

/**
 * Represents a parsed HTML template.
 *
 * A `Template` instance contains the static structure of an HTML template (nodes)
 * and metadata about dynamic parts (interpolation points).
 *
 * @example
 * ```ts
 * import { parse } from "@typed/template/Parser"
 * import * as Template from "@typed/template/Template"
 *
 * // Parse a template string
 * const template = parse`<div>Hello ${"world"}</div>`
 *
 * // Access template structure
 * console.log(template.nodes) // Array of parsed nodes
 * console.log(template.parts) // Array of dynamic parts
 * console.log(template.hash) // Unique hash for caching
 * ```
 *
 * @since 1.0.0
 * @category models
 */
export class Template implements Inspectable {
  readonly _tag = "template"

  /**
   * The root nodes of the template.
   */
  readonly nodes: ReadonlyArray<Node>

  /**
   * A unique hash representing the template content. Used for caching and hydration.
   */
  readonly hash: string

  /**
   * A list of dynamic parts in the template.
   * Each part is associated with a path (array of indices) to locate the corresponding
   * node in the DOM tree.
   */
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

/**
 * Represents a node that can be a parent of other nodes in the template AST.
 */
export type ParentNode = ElementNode | SelfClosingElementNode | TextOnlyElement

/**
 * Represents any node in the template AST.
 */
export type Node =
  | ElementNode
  | SelfClosingElementNode
  | TextOnlyElement
  | TextNode
  | NodePart
  | Comment
  | DocType

/**
 * Represents a dynamic part of the template that will be updated at runtime.
 */
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

/**
 * Represents a "sparse" part, which is a text or attribute value composed of
 * mix of static text and dynamic parts (e.g. `id="prefix-${id}"`).
 */
export type SparsePartNode = SparseAttrNode | SparseClassNameNode | SparseCommentNode | SparseTextNode

/**
 * Represents an HTML element with children.
 */
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

/**
 * Represents a dynamic insertion point within the node structure (e.g. `<div>${content}</div>`).
 */
export class NodePart {
  readonly _tag = "node"
  /**
   * The index of the value in the interpolation array.
   */
  readonly index: number
  constructor(index: number) {
    this.index = index
  }
}

/**
 * Represents a self-closing HTML element (e.g. `<br />`, `<img />`).
 */
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

/**
 * Represents an element that contains only text (e.g. `<script>`, `<style>`).
 */
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

/**
 * Represents a DOCTYPE declaration.
 */
export class DocType {
  readonly _tag = "doctype"
  readonly name: string
  readonly publicId: string | undefined
  readonly systemId: string | undefined
  constructor(
    name: string,
    publicType?: string,
    systemId?: string
  ) {
    this.name = name
    this.publicId = publicType
    this.systemId = systemId
  }
}

/**
 * Represents an attribute on an element.
 */
export type Attribute =
  | AttributeNode
  | AttrPartNode
  | SparseAttrNode
  | BooleanNode
  | BooleanPartNode
  | ClassNamePartNode
  | SparseClassNameNode
  | DataPartNode
  | EventPartNode
  | PropertyPartNode
  | PropertiesPartNode
  | RefPartNode

/**
 * Represents a static attribute (e.g. `class="foo"`).
 */
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

/**
 * Represents a dynamic attribute (e.g. `src="${url}"`).
 */
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

/**
 * Represents a sparse attribute (e.g. `class="foo ${bar}"`).
 */
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

/**
 * Represents a boolean attribute (e.g. `disabled`).
 */
export class BooleanNode {
  readonly _tag = "boolean" as const
  readonly name: string
  constructor(name: string) {
    this.name = name
  }
}

/**
 * Represents a dynamic boolean attribute (e.g. `?disabled="${isDisabled}"`).
 */
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
/**
 * Represents a dynamic class name part (e.g. `class="${classes}"`).
 */
export class ClassNamePartNode {
  readonly _tag = "className-part" as const
  readonly index: number
  constructor(index: number) {
    this.index = index
  }
}

/**
 * Represents a sparse class name (e.g. `class="foo ${bar}"`).
 */
export class SparseClassNameNode {
  readonly _tag = "sparse-class-name" as const

  readonly nodes: Array<ClassNamePartNode | TextNode>
  constructor(nodes: Array<ClassNamePartNode | TextNode>) {
    this.nodes = nodes
  }
}

/**
 * Represents a data attribute part (e.g. `data-foo="${value}"`).
 */
export class DataPartNode {
  readonly _tag = "data" as const

  readonly index: number
  constructor(index: number) {
    this.index = index
  }
}

/**
 * Represents an event listener part (e.g. `@click="${handler}"`).
 */
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

/**
 * Represents a property assignment (e.g. `.value="${value}"`).
 */
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

/**
 * Represents a spread of properties (e.g. `${...props}`).
 */
export class PropertiesPartNode {
  readonly _tag = "properties" as const
  readonly index: number
  constructor(
    index: number
  ) {
    this.index = index
  }
}

/**
 * Represents a reference capture (e.g. `ref="${ref}"`).
 */
export class RefPartNode {
  readonly _tag = "ref" as const

  readonly index: number
  constructor(index: number) {
    this.index = index
  }
}

/**
 * Represents text content.
 */
export type Text = TextNode | TextPartNode | SparseTextNode

/**
 * Represents a static text node.
 */
export class TextNode {
  readonly _tag = "text" as const

  readonly value: string
  constructor(value: string) {
    this.value = value
  }
}

/**
 * Represents a dynamic text part (e.g. `${text}`).
 */
export class TextPartNode {
  readonly _tag = "text-part" as const

  readonly index: number
  constructor(index: number) {
    this.index = index
  }
}

/**
 * Represents sparse text content (e.g. `Hello ${name}!`).
 */
export class SparseTextNode {
  readonly _tag = "sparse-text" as const
  readonly nodes: Array<TextNode | TextPartNode>
  constructor(nodes: Array<TextNode | TextPartNode>) {
    this.nodes = nodes
  }
}

/**
 * Represents a comment node.
 */
export type Comment = CommentNode | CommentPartNode | SparseCommentNode

/**
 * Represents a static comment.
 */
export class CommentNode {
  readonly _tag = "comment" as const

  readonly value: string
  constructor(value: string) {
    this.value = value
  }
}

/**
 * Represents a dynamic comment part.
 */
export class CommentPartNode {
  readonly _tag = "comment-part" as const

  readonly index: number
  constructor(index: number) {
    this.index = index
  }
}

/**
 * Represents a sparse comment.
 */
export class SparseCommentNode {
  readonly _tag = "sparse-comment" as const

  readonly nodes: Array<TextNode | CommentPartNode>
  constructor(nodes: Array<TextNode | CommentPartNode>) {
    this.nodes = nodes
  }
}
