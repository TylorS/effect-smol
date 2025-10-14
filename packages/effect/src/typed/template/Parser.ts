/* eslint-disable no-restricted-syntax */

import type { IToken } from "html5parser"
import { tokenize } from "html5parser"
import { keyToPartType } from "./internal/keyToPartType.ts"
import { PART_REGEX, PART_STRING } from "./internal/meta.ts"
import { PathStack } from "./internal/PathStack.ts"
import { templateHash } from "./internal/templateHash.ts"
import * as Template from "./Template.ts"

let parser: Parser | undefined
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
      throw new Error(`Expected ${kind} but got ${token.type}`)
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
    if (!kinds.includes(token.type as any)) {
      throw new Error(`Expected ${kinds.join(" or ")} but got ${token.type}`)
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
    // Comments
    if (value === "!--") {
      return this.parseCommentNode()
    }

    // Doctype
    if (value === "!doctype") {
      return this.parseDocTypeNode()
    }

    // Tags which MUST be self-closing
    if (SELF_CLOSING_TAGS.has(value)) {
      return this.parseSelfClosingElementNode(value)
    }

    // Tags which MUST only have text as children
    if (TEXT_ONLY_NODES_REGEX.has(value)) {
      return this.parseTextOnlyElementNode(value)
    }

    // Normal elements
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
    const next = this.consumeNextTokenOfKinds(TokenKind.AttrValueNq, TokenKind.OpenTagEnd)
    if (next.type === TokenKind.AttrValueNq) {
      this.consumeWhitespace()
      this.consumeNextTokenOfKind(TokenKind.OpenTagEnd)
      return new Template.DocType(next.value)
    }
    return new Template.DocType("html")
  }

  private parseSelfClosingElementNode(name: string): Template.Node {
    const { attributes, wasSelfClosed } = this.parseAttributes()

    if (wasSelfClosed) {
      return new Template.SelfClosingElementNode(name, attributes)
    }

    throw new Error(`Self-closing element ${name} must be self-closed`)
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
      const token = this.peek()

      if (token === undefined) {
        throw new Error("Unexpected end of template in attributes")
      }

      if (
        token.type === TokenKind.OpenTagEnd ||
        token.type === TokenKind.CloseTag
      ) {
        this.index++
        wasSelfClosed = token.value === "/"
        this.consumeWhitespace()
        break
      }

      if (
        token.type === TokenKind.Whitespace
      ) {
        this.index++
        continue
      }

      const [shouldContinue, attr, isSelfClosed] = this.parseAttribute()

      attributes.push(attr)

      if (shouldContinue === false) {
        wasSelfClosed = isSelfClosed
        break
      }
    }

    return {
      attributes,
      wasSelfClosed
    }
  }

  private parseAttribute(): [boolean, Template.Attribute, boolean] {
    const { value: rawName } = this.consumeNextTokenOfKind(TokenKind.AttrValueNq)

    if (isSpreadAttribute(rawName)) {
      return [true, this.parsePropertiesAttribute(rawName.slice(3)), false]
    }

    const next = this.consumeNextTokenOfKinds(TokenKind.AttrValueEq, TokenKind.Whitespace, TokenKind.OpenTagEnd)

    if (next.type === TokenKind.AttrValueEq) {
      const { type, value } = this.consumeNextTokenOfKinds(
        TokenKind.AttrValueDq,
        TokenKind.AttrValueSq,
        TokenKind.AttrValueNq
      )
      return [
        true,
        this.parseAttributeWithValue(rawName, type === TokenKind.AttrValueNq ? value : value.slice(1, -1)),
        false
      ]
    } else if (next.type === TokenKind.Whitespace) {
      return [true, new Template.BooleanNode(rawName), false]
    } else if (next.type === TokenKind.OpenTagEnd) {
      this.consumeWhitespace()
      return [false, new Template.BooleanNode(rawName), true]
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
  ): Template.AttributeNode | Template.ClassNameNode | Template.SparseClassNameNode {
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

  if (parts.length === 1) {
    if (s.trimStart() === "") return []
    return [new Template.TextNode(s)]
  }

  // Each part takes 2 indices, so we need to subtract 2 to get the last part
  const last = parts.length - 2

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]

    if (isPlaceholder(part)) {
      out.push(createPartFromIndex(parseInt(parts[++i], 10)))
      // If we encounter a part, we should not skip whitespace, unless we are at the last part
      skipWhitespace = i === last
    } else if ((skipWhitespace ? part.trimStart() : part) === "") {
      continue
    } else {
      out.push(new Template.TextNode(part))
      onTextNodeInserted?.()
    }
  }

  return out
}

function isPlaceholder(part: string): boolean {
  return part[0] === "{" &&
    part[1] === "{" &&
    part[part.length - 1] === "}" &&
    part[part.length - 2] === "}"
}

// Only to be utilized when parsing positions which MUST be a single part.
function unsafeParsePartIndex(text: string): number {
  return parseInt(text.slice(2, -2), 10)
}

function isSpreadAttribute(rawName: string): boolean {
  return rawName[0] === "." && rawName[1] === "." && rawName[2] === "."
}
