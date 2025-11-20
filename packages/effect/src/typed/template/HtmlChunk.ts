import type * as Template from "./Template.ts"

import * as Array from "effect/collections/Array"
import * as Order from "effect/data/Order"
import * as Predicate from "effect/data/Predicate"
import { constVoid } from "effect/Function"
import { renderToEscapedString, renderToString } from "./internal/encoding.ts"
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
  readonly node: Template.PartNode
  readonly render: (value: unknown) => string
}

export interface HtmlSparsePartChunk {
  readonly _tag: "sparse-part"
  readonly node: Template.SparsePartNode
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

  part(node: Template.PartNode, render: (value: unknown) => string): HtmlChunksBuilder {
    this.chunks.push({ _tag: "part", node, render })
    return this
  }

  sparsePart(node: Template.SparsePartNode, render: (value: unknown) => string): HtmlChunksBuilder {
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

export function templateToHtmlChunks({ nodes }: Template.Template) {
  const builder = new HtmlChunksBuilder()

  for (const node of nodes) {
    nodeToHtmlChunk(builder, node)
  }

  return builder.build()
}

export function addTemplateHash(
  chunks: ReadonlyArray<HtmlChunk>,
  { hash }: Template.Template
): ReadonlyArray<HtmlChunk> {
  const start = TEMPLATE_START_COMMENT(hash)
  const end = TEMPLATE_END_COMMENT(hash)
  if (chunks.length === 0) return [{ _tag: "text", text: start + end }]
  return appendTextChunk(prependTextChunk(chunks, start), end)
}

function prependTextChunk(chunks: ReadonlyArray<HtmlChunk>, text: string): ReadonlyArray<HtmlChunk> {
  if (chunks.length === 0) return [{ _tag: "text", text }]
  const firstChunk = chunks[0]
  if (firstChunk._tag === "text") {
    return [{ _tag: "text", text: text + firstChunk.text }, ...chunks.slice(1)]
  }
  return [{ _tag: "text", text }, ...chunks]
}

function appendTextChunk(chunks: ReadonlyArray<HtmlChunk>, text: string): ReadonlyArray<HtmlChunk> {
  if (chunks.length === 0) return [{ _tag: "text", text }]
  const lastChunk = chunks[chunks.length - 1]
  if (lastChunk._tag === "text") {
    return [...chunks.slice(0, -1), { _tag: "text", text: lastChunk.text + text }]
  }
  return [...chunks, { _tag: "text", text }]
}

type NodeMap = {
  readonly [K in Template.Node["_tag"]]: (builder: HtmlChunksBuilder, node: Extract<Template.Node, { _tag: K }>) => void
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
  node: Template.SelfClosingElementNode
) {
  builder.text(`<${node.tagName}`)
  addAttributes(builder, node.attributes)
  builder.text(`/>`)
}

function textOnlyElementToHtmlChunks(
  builder: HtmlChunksBuilder,
  node: Template.TextOnlyElement
) {
  builder.text(`<${node.tagName}`)
  addAttributes(builder, node.attributes)
  builder.text(">")
  if (node.textContent !== null) {
    textContentToHtml(builder, node.textContent)
  }

  builder.text(`</${node.tagName}>`)
}

function textContentToHtml(builder: HtmlChunksBuilder, textContent: Template.Text) {
  switch (textContent._tag) {
    case "text":
      return builder.text(textContent.value)
    case "text-part":
      return builder.part(textContent, (v) => renderToString(v, ""))
    case "sparse-text":
      return builder.sparsePart(textContent, (v) => renderToString(v, ""))
  }
}

function nodeToHtmlChunk(builder: HtmlChunksBuilder, node: Template.Node) {
  const handler = nodeMap[node._tag]
  handler(builder, node as never)
}

function elementToHtmlChunks(
  builder: HtmlChunksBuilder,
  { attributes, children, tagName }: Template.ElementNode
) {
  builder.text(`<${tagName}`)
  addAttributes(builder, attributes)
  builder.text(">")
  for (const child of children) {
    nodeToHtmlChunk(builder, child)
  }
  builder.text(`</${tagName}>`)
}

function addAttributes(builder: HtmlChunksBuilder, attributes: ReadonlyArray<Template.Attribute>) {
  if (attributes.length > 0) {
    const lastIndex = attributes.length - 1
    for (const [index, attribute] of sortAttributes(attributes).entries()) {
      attributeToHtmlChunk(builder, attribute, { isFirst: index === 0, isLast: index === lastIndex })
    }
  }
}

type Placement = {
  readonly isFirst: boolean
  readonly isLast: boolean
}

type AttributeMap = {
  readonly [K in Template.Attribute["_tag"]]: (
    builder: HtmlChunksBuilder,
    attribute: Extract<Template.Attribute, { _tag: K }>,
    placement: Placement
  ) => void
}

function attributeToHtmlChunk(builder: HtmlChunksBuilder, attr: Template.Attribute, placement: Placement): void {
  attributeMap[attr._tag](builder, attr as never, placement)
}

const attributeMap: AttributeMap = {
  attribute: (builder, attribute, placement) =>
    builder.text(addAttributeSpace(`${attribute.name}="${attribute.value}"`, placement)),
  boolean: (builder, attribute, placement) => builder.text(addAttributeSpace(`${attribute.name}`, placement)),
  attr: (builder, attribute, placement) =>
    builder.part(attribute, (v) => addAttributeSpace(`${attribute.name}="${renderToEscapedString(v, "")}"`, placement)),
  "sparse-attr": (builder, attribute, placement) =>
    builder.sparsePart(
      attribute,
      (v) => addAttributeSpace(`${attribute.name}="${renderToEscapedString(v, "")}"`, placement)
    ),
  "boolean-part": (builder, attribute, placement) =>
    builder.part(attribute, (v) => addAttributeSpace(v ? `${attribute.name}` : "", placement)),
  "className-part": (builder, attribute, placement) =>
    builder.part(attribute, (v) => addAttributeSpace(`class="${renderToEscapedString(v, " ")}"`, placement)),
  "sparse-class-name": (builder, attribute, placement) =>
    builder.sparsePart(attribute, (v) => addAttributeSpace(`class="${renderToEscapedString(v, "")}"`, placement)),
  data: (builder, attribute) =>
    builder.part(attribute, (v) => Predicate.isObject(v) ? recordWithPrefix(`data-`, v) : ""),
  property: (builder, attribute, placement) =>
    builder.part(attribute, (v) => addAttributeSpace(`${attribute.name}="${renderToEscapedString(v, "")}"`, placement)),
  properties: (builder, attribute, placement) =>
    builder.part(attribute, (v) => addAttributeSpace(Predicate.isObject(v) ? recordWithPrefix(``, v) : "", placement)),

  // Don't have HTML representations for these
  ref: constVoid,
  event: constVoid
}

function addAttributeSpace(str: string, placement: Placement) {
  if (str.length === 0) return str
  if (placement.isFirst) return " " + str + (placement.isLast ? "" : " ")
  return str + (placement.isLast ? "" : " ")
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
  // Order such that static attributes can be streamed out first
  // and sparse attributes can be streamed out last
  (attr: Template.Attribute) => isStaticAttribute(attr) ? -1 : isSparseAttribute(attr) ? 1 : 0
)

const sortAttributes = Array.sortBy(AttributeOrder)

const staticAttributes = new Set<Template.Attribute["_tag"]>([
  "attribute",
  "boolean"
])

function isStaticAttribute(attr: Template.Attribute) {
  return staticAttributes.has(attr._tag)
}

const sparseAttributes = new Set<Template.Attribute["_tag"]>([
  "sparse-attr",
  "sparse-class-name"
])

function isSparseAttribute(attr: Template.Attribute) {
  return sparseAttributes.has(attr._tag)
}
