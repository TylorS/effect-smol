/* eslint-disable no-restricted-syntax */

import type { IToken } from "html5parser"
import { tokenize } from "html5parser"
import { keyToPartType } from "./internal/keyToPartType.ts"
import { PART_REGEX, PART_STRING } from "./internal/meta.ts"
import { PathStack } from "./internal/PathStack.ts"
import { templateHash } from "./internal/templateHash.ts"
import * as Template from "./Template.ts"

let parser: Parser | undefined
/**
 * Parses a template string array (from a tagged template literal) into a reusable `Template` object.
 *
 * This parser handles:
 * - Standard HTML structure (elements, attributes, text, comments).
 * - Custom part syntax for interpolation (e.g., `${value}`).
 * - Special attributes like `.property`, `@event`, `?boolean`.
 * - Self-closing tags and text-only elements (script, style).
 *
 * The result is a cached `Template` instance that contains the static AST and dynamic part locations.
 *
 * @example
 * ```ts
 * import { parse } from "@typed/template/Parser"
 * import * as Template from "@typed/template/Template"
 *
 * // Parse a template
 * const template = parse`<div id=${"my-id"} class="container">
 *   <p>Hello, ${"world"}!</p>
 * </div>`
 *
 * // Access parsed structure
 * console.log(template.nodes) // Array of parsed nodes
 * console.log(template.parts) // Array of dynamic interpolation points
 * console.log(template.hash) // Unique hash for the template
 * ```
 *
 * @param template - The template strings array from a tagged template literal.
 * @returns A `Template` object representing the parsed structure.
 * @since 1.0.0
 * @category parsing
 */
export function parse(template: ReadonlyArray<string>): Template.Template {
  parser ??= new Parser()
  return parser.parse(template)
}

class Parser {
  protected html!: string
  protected tokens!: Array<IToken>
  protected index!: number
  protected parts!: Array<readonly [part: Template.PartNode | Template.SparsePartNode, path: Array<number>]>
  protected path!: PathStack

  parse(templateStrings: ReadonlyArray<string>): Template.Template {
    this.init(templateStrings)
    return new Template.Template(this.parseNodes(), templateHash(templateStrings), this.parts)
  }

  private init(templateStrings: ReadonlyArray<string>) {
    this.html = templateWithParts(templateStrings)
    this.tokens = tokenize(this.html)
    this.index = 0
    this.parts = []
    this.path = new PathStack()
  }

  private peek(): IToken | undefined {
    return this.tokens[this.index]
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  private consumeNextTokenOfKind(kind: import("html5parser").TokenKind) {
    const token = this.tokens[this.index]
    if (token.type !== kind) {
      throw new Error(`Expected ${TokenKindToName[kind]} but got ${TokenKindToName[token.type]}`)
    }
    this.index++
    return token
  }

  private consumeWhitespace() {
    while (this.tokens[this.index]?.type === TokenKind.Whitespace) {
      this.index++
    }
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  private consumeNextTokenOfKinds(...kinds: Array<import("html5parser").TokenKind>) {
    const token = this.tokens[this.index]
    if (!kinds.includes(token.type)) {
      throw new Error(
        `Expected ${kinds.map((kind) => TokenKindToName[kind]).join(" or ")} but got ${TokenKindToName[token.type]}`
      )
    }
    this.index++
    return token
  }

  private parseNodes(): Array<Template.Node> {
    const nodes: Array<Template.Node> = []

    while (this.index < this.tokens.length) {
      const token = this.consumeNextTokenOfKinds(
        TokenKind.Literal,
        TokenKind.OpenTag,
        TokenKind.CloseTag,
        TokenKind.Whitespace
      )

      if (token.type === TokenKind.Literal) {
        nodes.push(...this.parseNodeParts(token))
      } else if (token.type === TokenKind.OpenTag) {
        nodes.push(this.parseOpenTag(token))
        this.path.inc()
      } else if (token.type === TokenKind.CloseTag) {
        this.consumeWhitespace()
        break
      } else if (nodes.length > 0) {
        nodes.push(new Template.TextNode(token.value))
        this.path.inc()
      }
    }

    return nodes
  }

  private parseNodeParts(literal: IToken): Array<Template.Node> {
    return parseTextAndParts(
      literal.value,
      (index) => this.addPartWithPrevious(new Template.NodePart(index)),
      () => this.path.inc()
    )
  }

  private parseOpenTag({ value }: IToken): Template.Node {
    if (value === "!--") return this.parseCommentNode()
    if (value === "!doctype") return this.parseDocTypeNode()
    if (SELF_CLOSING_TAGS.has(value)) return this.parseSelfClosingElementNode(value)
    if (TEXT_ONLY_NODES_REGEX.has(value)) return this.parseTextOnlyElementNode(value)
    // All other elements
    const { attributes, wasSelfClosed } = this.parseAttributes()
    const children = wasSelfClosed ? [] : this.parseChildren()
    return new Template.ElementNode(value, attributes, children)
  }

  private parseChildren() {
    this.path.push()
    const children = this.parseNodes()
    this.path.pop()
    return children
  }

  private parseCommentNode(): Template.Node {
    const { value } = this.consumeNextTokenOfKind(TokenKind.Literal)
    this.consumeNextTokenOfKind(TokenKind.OpenTagEnd)

    return this.parseMultipleParts(
      value,
      (index) => new Template.CommentPartNode(index),
      (text) => new Template.CommentNode(text.value),
      (parts) => new Template.SparseCommentNode(parts)
    )
  }

  private parseDocTypeNode(): Template.Node {
    this.consumeWhitespace()

    // Try to parse the name
    const parsedName = this.parseLiteralLike()
    if (parsedName.closed) return new Template.DocType("html")
    const name = parsedName.value ?? "html"

    const { closed, publicId, systemId } = this.parseDocTypeIds()

    if (!closed) {
      this.consumeWhitespace()
      this.consumeNextTokenOfKind(TokenKind.OpenTagEnd)
    }

    return new Template.DocType(name, publicId, systemId)
  }

  private parseDocTypeIds(): {
    closed: boolean
    publicId: string | undefined
    systemId: string | undefined
  } {
    const firstIdType = this.parseDocTypeId()
    if (firstIdType.closed) return firstIdType
    const secondIdType = this.parseDocTypeId()
    return {
      closed: secondIdType.closed,
      publicId: secondIdType.publicId ?? firstIdType.publicId,
      systemId: secondIdType.systemId ?? firstIdType.systemId
    }
  }

  private parseDocTypeId(): {
    closed: boolean
    publicId: string | undefined
    systemId: string | undefined
  } {
    const parsedIdType = this.parseLiteralLike()

    if (parsedIdType.closed || parsedIdType.value === null) {
      return { closed: parsedIdType.closed, publicId: undefined, systemId: undefined }
    }

    const value = parsedIdType.value.toLowerCase()
    if (value === "public" || value === "system") {
      const parsedLiteral = this.parseLiteralLike()
      if (parsedLiteral.closed || parsedLiteral.value === null) {
        return { closed: parsedLiteral.closed, publicId: undefined, systemId: undefined }
      }
      return {
        closed: false,
        publicId: value === "public" ? parsedLiteral.value : undefined,
        systemId: value === "system" ? parsedLiteral.value : undefined
      }
    }

    return { closed: false, publicId: undefined, systemId: undefined }
  }

  private parseLiteralLike(): {
    closed: boolean
    value: string | null
  } {
    this.consumeWhitespace()

    const { type, value } = this.consumeNextTokenOfKinds(
      TokenKind.Literal,
      TokenKind.AttrValueNq,
      TokenKind.AttrValueDq,
      TokenKind.AttrValueSq,
      TokenKind.OpenTagEnd
    )

    if (type === TokenKind.OpenTagEnd) return { closed: true, value: null }
    if (type === TokenKind.Literal || type === TokenKind.AttrValueNq) return { closed: false, value }
    if (type === TokenKind.AttrValueDq || type === TokenKind.AttrValueSq) {
      return { closed: false, value: value.slice(1, -1) }
    }
    throw new Error(`Unexpected token ${TokenKindToName[type]} in place of literal`)
  }

  private parseSelfClosingElementNode(name: string): Template.Node {
    const { attributes } = this.parseAttributes()
    return new Template.SelfClosingElementNode(name, attributes)
  }

  private parseTextOnlyElementNode(name: string): Template.Node {
    const { attributes, wasSelfClosed } = this.parseAttributes()
    const textContent = wasSelfClosed ? null : this.parseTextOnlyChildren()
    return new Template.TextOnlyElement(name, attributes, textContent)
  }

  private parseAttributes(): {
    attributes: Array<Template.Attribute>
    wasSelfClosed: boolean
  } {
    let wasSelfClosed = false
    const attributes: Array<Template.Attribute> = []

    this.consumeWhitespace()

    while (this.index < this.tokens.length) {
      const token = this.peek()!

      if (token.type === TokenKind.OpenTagEnd) {
        this.index++
        wasSelfClosed = token.value === "/"
        this.consumeWhitespace()
        break
      }

      if (token.type === TokenKind.Whitespace) {
        this.index++
        continue
      }

      const { attribute, isSelfClosed, shouldContinue } = this.parseAttribute()
      attributes.push(attribute)
      wasSelfClosed ||= isSelfClosed
      if (!shouldContinue) {
        this.consumeWhitespace()
        break
      }
    }

    return {
      attributes,
      wasSelfClosed
    }
  }

  private parseAttribute(): {
    shouldContinue: boolean
    isSelfClosed: boolean
    attribute: Template.Attribute
  } {
    const { value: name } = this.consumeNextTokenOfKind(TokenKind.AttrValueNq)

    if (isSpreadAttribute(name)) {
      return { shouldContinue: true, isSelfClosed: false, attribute: this.parsePropertiesAttribute(name.slice(3)) }
    }

    const next = this.consumeNextTokenOfKinds(TokenKind.AttrValueEq, TokenKind.Whitespace, TokenKind.OpenTagEnd)

    if (next.type === TokenKind.AttrValueEq) {
      const { type, value } = this.consumeNextTokenOfKinds(
        TokenKind.AttrValueDq,
        TokenKind.AttrValueSq,
        TokenKind.AttrValueNq
      )
      return {
        shouldContinue: true,
        isSelfClosed: false,
        attribute: this.parseAttributeWithValue(name, type === TokenKind.AttrValueNq ? value : value.slice(1, -1))
      }
    } else if (next.type === TokenKind.Whitespace) {
      return {
        shouldContinue: true,
        isSelfClosed: false,
        attribute: new Template.BooleanNode(name)
      }
    } else if (next.type === TokenKind.OpenTagEnd) {
      this.consumeWhitespace()
      return {
        shouldContinue: false,
        isSelfClosed: next.value === "/",
        attribute: new Template.BooleanNode(name)
      }
    } else {
      throw new Error(`Unexpected token ${TokenKindToName[next.type]} in place of attribute`)
    }
  }

  private parseAttributeWithValue(rawName: string, value: string): Template.Attribute | Template.SparseAttrNode {
    const [match, name] = keyToPartType(rawName)
    switch (match) {
      case "attr":
        return this.parseAttributePart(value, name)
      case "boolean":
        return this.parseBooleanAttribute(value, name)
      case "class":
        return this.parseClassNameAttribute(value)
      case "data":
        return this.parseDataAttribute(value)
      case "event":
        return this.parseEventAttribute(value, name)
      case "properties":
        return this.parsePropertiesAttribute(value)
      case "property":
        return this.parsePropertyAttribute(value, name)
      case "ref":
        return this.parseRefAttribute(value)
    }
  }

  private parseAttributePart(value: string, name: string): Template.Attribute | Template.SparseAttrNode {
    return this.parseMultipleParts(
      value,
      (index) => new Template.AttrPartNode(name, index),
      (text) => new Template.AttributeNode(name, text.value),
      (parts) => new Template.SparseAttrNode(name, parts)
    )
  }

  private parseBooleanAttribute(value: string, name: string): Template.BooleanNode | Template.BooleanPartNode {
    return this.parseMultipleParts(
      value,
      (index) => new Template.BooleanPartNode(name, index),
      () => new Template.BooleanNode(name),
      () => {
        throw new Error("Boolean attributes cannot have multiple parts")
      }
    )
  }

  private parseClassNameAttribute(
    value: string
  ): Template.AttributeNode | Template.ClassNamePartNode | Template.SparseClassNameNode {
    return this.parseMultipleParts(
      value,
      (index) => new Template.ClassNamePartNode(index),
      (text) => new Template.AttributeNode("class", text.value.trim()),
      (parts) => new Template.SparseClassNameNode(parts)
    )
  }

  private parseDataAttribute(value: string): Template.AttributeNode | Template.DataPartNode {
    return this.addPart(new Template.DataPartNode(unsafeParsePartIndex(value)))
  }

  private parseEventAttribute(value: string, name: string): Template.AttributeNode | Template.EventPartNode {
    return this.addPart(new Template.EventPartNode(name, unsafeParsePartIndex(value)))
  }

  private parsePropertyAttribute(value: string, name: string): Template.AttributeNode | Template.PropertyPartNode {
    return this.addPart(new Template.PropertyPartNode(name, unsafeParsePartIndex(value)))
  }

  private parsePropertiesAttribute(value: string): Template.AttributeNode | Template.PropertiesPartNode {
    return this.addPart(new Template.PropertiesPartNode(unsafeParsePartIndex(value)))
  }

  private parseRefAttribute(value: string): Template.AttributeNode | Template.RefPartNode {
    return this.addPart(new Template.RefPartNode(unsafeParsePartIndex(value)))
  }

  private parseTextOnlyChildren(): Template.Text | null {
    const { type, value } = this.consumeNextTokenOfKinds(TokenKind.Literal, TokenKind.CloseTag)

    if (type === TokenKind.Literal) {
      this.consumeNextTokenOfKind(TokenKind.CloseTag)
      return this.parseMultipleParts(
        value,
        (index) => new Template.TextPartNode(index),
        (text) => text,
        (parts) => new Template.SparseTextNode(parts)
      )
    }
    this.consumeWhitespace()
    return null
  }

  private parseMultipleParts<
    T extends Template.PartNode,
    T2 extends Template.Attribute | Template.Node,
    U extends Template.SparsePartNode
  >(
    value: string,
    createPart: (index: number) => T,
    onSingleTextNode: (text: Template.TextNode) => T2,
    onMultiParts: (parts: Array<T | Template.TextNode>) => U
  ): T | T2 | U {
    const parts = parseTextAndParts(value, createPart)
    if (parts.length === 1) {
      if (parts[0]._tag === "text") return onSingleTextNode(parts[0])
      return this.addPart(parts[0])
    }
    return this.addPart(onMultiParts(parts))
  }

  private addPart<T extends Template.PartNode | Template.SparsePartNode>(part: T): T {
    this.parts.push([part, this.path.toChunk()])
    return part
  }

  private addPartWithPrevious<T extends Template.PartNode | Template.SparsePartNode>(part: T): T {
    this.parts.push([part, this.path.previousChunk()])
    this.path.inc() // Nodes will be inserted as a comment
    return part
  }
}

const TEXT_ONLY_NODES_REGEX = new Set([
  "textarea",
  "script",
  "style",
  "title",
  "plaintext",
  "xmp"
])

const SELF_CLOSING_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "command",
  "embed",
  "hr",
  "img",
  "input",
  "keygen",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
])

const TokenKind = {
  /* eslint-disable @typescript-eslint/consistent-type-imports */
  Literal: 0 as import("html5parser").TokenKind.Literal,
  OpenTag: 1 as import("html5parser").TokenKind.OpenTag,
  OpenTagEnd: 2 as import("html5parser").TokenKind.OpenTagEnd,
  CloseTag: 3 as import("html5parser").TokenKind.CloseTag,
  Whitespace: 4 as import("html5parser").TokenKind.Whitespace,
  AttrValueEq: 5 as import("html5parser").TokenKind.AttrValueEq,
  AttrValueNq: 6 as import("html5parser").TokenKind.AttrValueNq,
  AttrValueSq: 7 as import("html5parser").TokenKind.AttrValueSq,
  AttrValueDq: 8 as import("html5parser").TokenKind.AttrValueDq
  /* eslint-enable @typescript-eslint/consistent-type-imports */
} as const

const TokenKindToName = {
  [TokenKind.Literal]: "Literal",
  [TokenKind.OpenTag]: "OpenTag",
  [TokenKind.OpenTagEnd]: "OpenTagEnd",
  [TokenKind.CloseTag]: "CloseTag",
  [TokenKind.Whitespace]: "Whitespace",
  [TokenKind.AttrValueEq]: "AttrValueEq",
  [TokenKind.AttrValueNq]: "AttrValueNq",
  [TokenKind.AttrValueSq]: "AttrValueSq",
  [TokenKind.AttrValueDq]: "AttrValueDq"
} as const

function templateWithParts(template: ReadonlyArray<string>): string {
  const length = template.length
  if (length === 0) return ""

  // oxlint-disable-next-line no-new-array
  const parts: Array<string> = new Array(length + length - 1)

  let j = 0
  for (let i = 0; i < length; i++) {
    parts[j++] = template[i]
    if (i !== length - 1) {
      parts[j++] = PART_STRING(i)
    }
  }

  return parts.join("")
}

function parseTextAndParts<T>(
  s: string,
  createPartFromIndex: (index: number) => T,
  onTextNodeInserted?: () => void
): Array<Template.TextNode | T> {
  let skipWhitespace = true
  const out: Array<Template.TextNode | T> = []
  const parts = s.split(PART_REGEX)
  // Each part takes 2 indices, so we need to subtract 2 to get the last part
  const last = parts.length - 2

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]

    if (part[0] === "{" && part[1] === "{" && part[part.length - 1] === "}" && part[part.length - 2] === "}") {
      out.push(createPartFromIndex(parseInt(parts[++i], 10)))
      // If we encounter a part, we should not skip whitespace, unless we are at the last part
      skipWhitespace = i === last
    } else if (part === "" || (skipWhitespace && !/\S/.test(part))) {
      continue
    } else {
      out.push(new Template.TextNode(part))
      onTextNodeInserted?.()
    }
  }

  return out
}

// Only to be utilized when parsing positions which MUST be a single part.
function unsafeParsePartIndex(text: string): number {
  return parseInt(text.slice(2, -2), 10)
}

function isSpreadAttribute(rawName: string): boolean {
  return rawName[0] === "." && rawName[1] === "." && rawName[2] === "."
}
