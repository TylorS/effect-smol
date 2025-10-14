import type {
  Attribute,
  ElementNode,
  Node,
  PartNode,
  SelfClosingElementNode,
  SparsePartNode,
  Template,
  Text,
  TextOnlyElement
} from "./Template.ts"

import { sortBy } from "../../collections/Array.ts"
import * as Order from "../../data/Order.ts"
import { isObject } from "../../data/Predicate.ts"
import { constVoid } from "../../Function.ts"
import { renderToEscapedString } from "./internal/encoding.ts"
import { TEMPLATE_END_COMMENT, TEMPLATE_START_COMMENT } from "./internal/meta.ts"

export type HtmlChunk =
  | HtmlTextChunk
  | HtmlPartChunk
  | HtmlSparsePartChunk

export interface HtmlTextChunk {
  readonly _tag: "text"
  readonly text: string
}

export interface HtmlPartChunk {
  readonly _tag: "part"
  readonly node: PartNode
  readonly render: (value: unknown) => string
}

export interface HtmlSparsePartChunk {
  readonly _tag: "sparse-part"
  readonly node: SparsePartNode
  readonly render: (value: unknown) => string
}

export class HtmlChunksBuilder {
  private chunks: Array<HtmlChunk> = []

  text(text: string): HtmlChunksBuilder {
    const lastIndex = this.chunks.length - 1
    const lastChunk = this.chunks[lastIndex]
    if (lastChunk?._tag === "text") {
      this.chunks[lastIndex] = { _tag: "text", text: lastChunk.text + text }
    } else {
      this.chunks.push({ _tag: "text", text })
    }
    return this
  }

  part(node: PartNode, render: (value: unknown) => string): HtmlChunksBuilder {
    this.chunks.push({ _tag: "part", node, render })
    return this
  }

  sparsePart(node: SparsePartNode, render: (value: unknown) => string): HtmlChunksBuilder {
    this.chunks.push({ _tag: "sparse-part", node, render })
    return this
  }

  build(): ReadonlyArray<HtmlChunk> {
    const chunks = this.chunks
    this.chunks = []
    return chunks
  }
}

// TODO: Add support for unsafe HTML content.

export function templateToHtmlChunks({ hash, nodes }: Template, isStatic: boolean) {
  const builder = new HtmlChunksBuilder()

  if (!isStatic) {
    builder.text(TEMPLATE_START_COMMENT(hash))
  }

  for (const node of nodes) {
    nodeToHtmlChunk(builder, node)
  }

  if (!isStatic) {
    builder.text(TEMPLATE_END_COMMENT(hash))
  }

  return builder.build()
}

type NodeMap = {
  readonly [K in Node["_tag"]]: (builder: HtmlChunksBuilder, node: Extract<Node, { _tag: K }>) => void
}

const nodeMap: NodeMap = {
  doctype: (builder, node) => builder.text(`<!DOCTYPE ${node.name}>`),
  element: elementToHtmlChunks,
  text: (builder, node) => builder.text(node.value),
  node: (builder, part) => builder.part(part, (v) => renderToEscapedString(v, "")),
  "self-closing-element": selfClosingElementToHtmlChunks,
  "text-only-element": textOnlyElementToHtmlChunks,
  comment: (builder, node) => builder.text(`<!--${node.value}-->`),
  "comment-part": (builder, part) => builder.part(part, (v) => `<!--${renderToEscapedString(v, "")}-->`),
  "sparse-comment": (builder, part) => builder.sparsePart(part, (v) => `<!--${renderToEscapedString(v, "")}-->`)
}

function selfClosingElementToHtmlChunks(
  builder: HtmlChunksBuilder,
  node: SelfClosingElementNode
) {
  builder.text(`<${node.tagName}`)
  for (const attribute of sortAttributes(node.attributes)) {
    attributeToHtmlChunk(builder, attribute)
  }
  builder.text(`/>`)
}

function textOnlyElementToHtmlChunks(
  builder: HtmlChunksBuilder,
  node: TextOnlyElement
) {
  builder.text(`<${node.tagName}`)

  for (const attribute of sortAttributes(node.attributes)) {
    attributeToHtmlChunk(builder, attribute)
  }

  if (node.textContent) {
    textContentToHtml(builder, node.textContent)
  }

  builder.text(`</${node.tagName}>`)
}

function textContentToHtml(builder: HtmlChunksBuilder, textContent: Text) {
  switch (textContent._tag) {
    case "text":
      return builder.text(textContent.value)
    case "text-part":
      return builder.part(textContent, (v) => renderToEscapedString(v, ""))
    case "sparse-text":
      return builder.sparsePart(textContent, (v) => renderToEscapedString(v, ""))
  }
}

function nodeToHtmlChunk(builder: HtmlChunksBuilder, node: Node) {
  const handler = nodeMap[node._tag]
  handler(builder, node as never)
}

function elementToHtmlChunks(
  builder: HtmlChunksBuilder,
  { attributes, children, tagName }: ElementNode
) {
  builder.text(`<${tagName}`)
  for (const attribute of attributes) {
    attributeToHtmlChunk(builder, attribute)
  }
  builder.text(">")
  for (const child of children) {
    nodeToHtmlChunk(builder, child)
  }
  builder.text(`</${tagName}>`)
}

type AttributeMap = {
  readonly [K in Attribute["_tag"]]: (
    builder: HtmlChunksBuilder,
    attribute: Extract<Attribute, { _tag: K }>
  ) => void
}

function attributeToHtmlChunk(builder: HtmlChunksBuilder, attr: Attribute): void {
  attributeMap[attr._tag](builder, attr as never)
}

const attributeMap: AttributeMap = {
  attribute: (builder, attribute) => builder.text(`${attribute.name}="${attribute.value}"`),
  boolean: (builder, attribute) => builder.text(`${attribute.name}`),
  text: (builder, attribute) => builder.text(attribute.value),
  attr: (builder, attribute) => builder.part(attribute, (v) => `${attribute.name}="${renderToEscapedString(v, "")}"`),
  "sparse-attr": (builder, attribute) =>
    builder.sparsePart(attribute, (v) => `${attribute.name}="${renderToEscapedString(v, "")}"`),
  "boolean-part": (builder, attribute) => builder.part(attribute, (v) => v ? `${attribute.name}` : ""),
  "className-part": (builder, attribute) => builder.part(attribute, (v) => `class="${renderToEscapedString(v, "")}"`),
  "sparse-class-name": (builder, attribute) =>
    builder.sparsePart(attribute, (v) => `class="${renderToEscapedString(v, " ")}"`),
  data: (builder, attribute) => builder.part(attribute, (v) => isObject(v) ? recordWithPrefix(`data-`, v) : ""),
  property: (builder, attribute) =>
    builder.part(attribute, (v) => `${attribute.name}="${renderToEscapedString(v, "")}"`),
  properties: (builder, attribute) => builder.part(attribute, (v) => isObject(v) ? recordWithPrefix(``, v) : ""),

  // Don't have HTML representations for these
  ref: constVoid,
  event: constVoid
}

function recordWithPrefix(prefix: string, r: {}) {
  const s = Object.entries(r)
    .map((
      [key, value]
    ) => (value === undefined ? `${prefix}${key}` : `${prefix}${key}="${renderToEscapedString(value, "")}"`))
    .join(" ")

  return s.length === 0 ? "" : " " + s
}

const AttributeOrder = Order.mapInput(
  Order.number,
  (attr: Attribute) => isStaticAttribute(attr) ? -1 : isSparseAttribute(attr) ? 1 : 0
)

const sortAttributes = sortBy(AttributeOrder)

const staticAttributes = new Set<Attribute["_tag"]>([
  "attribute",
  "boolean"
])

function isStaticAttribute(attr: Attribute) {
  return staticAttributes.has(attr._tag)
}

const sparseAttributes = new Set<Attribute["_tag"]>([
  "sparse-attr",
  "sparse-class-name"
])

function isSparseAttribute(attr: Attribute) {
  return sparseAttributes.has(attr._tag)
}
