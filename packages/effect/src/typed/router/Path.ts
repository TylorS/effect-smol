import type { Arg0, TypeLambda1 } from "hkt-core"

import * as Schema from "../../Schema.ts"
import type { PathAst } from "./AST.ts"
import * as AST from "./AST.ts"
import type { Parser } from "./Parser.ts"

type PathStopChar = "/" | ":" | "*" | "?"
type QueryValueStopChar = "&"

type TakeWhileNotInternal<
  Input extends string,
  Stop extends string,
  Acc extends string = ""
> = Input extends `${infer Head}${infer Tail}` ? Head extends Stop ? readonly [Acc, Input]
  : TakeWhileNotInternal<Tail, Stop, `${Acc}${Head}`>
  : readonly [Acc, Input]

type TakeWhileNot1Internal<
  Input extends string,
  Stop extends string
> = TakeWhileNotInternal<Input, Stop> extends readonly [
  infer Taken extends string,
  infer Rest extends string
] ? Taken extends "" ? never : readonly [Taken, Rest]
  : never

interface TakeWhileNot1<Stop extends string> extends Parser<string> {
  readonly return: Arg0<this> extends infer Input extends string ? TakeWhileNot1Internal<Input, Stop> : never
}

interface Second extends TypeLambda1 {
  readonly return: Arg0<this> extends readonly [infer _A, infer B] ? B : never
}

interface RegexBetweenParens extends TypeLambda1 {
  readonly return: Arg0<this> extends readonly ["(", readonly [infer Regex extends string, ")"]] ? Regex : never
}

type RegexParser = Parser.Map<
  Parser.Zip<Parser.Char<"(">, Parser.Zip<TakeWhileNot1<")">, Parser.Char<")">>>,
  RegexBetweenParens
>

type OptionalRegexParser = Parser.Optional<RegexParser>
type OptionalQuestionMarkParser = Parser.Optional<Parser.Char<"?">>

type ParameterNameParser = Parser.Zip<Parser.Char<":">, Parser.TakeWhile1<Parser.AlphaNumeric>>

type ParameterPartsParser = Parser.Zip<ParameterNameParser, Parser.Zip<OptionalRegexParser, OptionalQuestionMarkParser>>

type ParameterAst<
  Name extends string,
  Regex extends string | undefined,
  OptionalMark extends "?" | undefined
> = [
  & { readonly type: "parameter"; readonly name: Name }
  & ([Regex] extends [string] ? { regex: Regex } : {})
  & ([OptionalMark] extends ["?"] ? { optional: true } : {})
] extends [infer Ast] ? ToReadonlyRecord<Ast> : never

interface ToParameterAst extends TypeLambda1 {
  readonly return: Arg0<this> extends readonly [
    readonly [":", infer Name extends string],
    readonly [infer Regex, infer OptionalMark]
  ] ? ParameterAst<
      Name,
      Regex extends string ? Regex : undefined,
      OptionalMark extends "?" ? OptionalMark : undefined
    >
    : never
}

type ParameterParser = Parser.Map<ParameterPartsParser, ToParameterAst>

interface ToWildcardAst extends TypeLambda1 {
  readonly return: { readonly type: "wildcard" }
}

type WildcardParser = Parser.Map<Parser.Char<"*">, ToWildcardAst>

interface ToLiteralAst extends TypeLambda1 {
  readonly return: Arg0<this> extends infer Value extends string ? { readonly type: "literal"; readonly value: Value }
    : never
}

type PathLiteralParser = Parser.Map<TakeWhileNot1<PathStopChar>, ToLiteralAst>

type QueryLiteralParser = Parser.Map<TakeWhileNot1<QueryValueStopChar>, ToLiteralAst>

type QueryValueParser = Parser.OrElse<ParameterParser, Parser.OrElse<WildcardParser, QueryLiteralParser>>

interface ToQueryParamAst extends TypeLambda1 {
  readonly return: Arg0<this> extends readonly [
    infer Name extends string,
    readonly ["=", infer Value extends PathAst]
  ] ? { readonly type: "query-param"; readonly name: Name; readonly value: Value }
    : never
}

type QueryParamParser = Parser.Map<
  Parser.Zip<Parser.TakeWhile1<Parser.AlphaNumeric>, Parser.Zip<Parser.Char<"=">, QueryValueParser>>,
  ToQueryParamAst
>

type QueryParamTailParser = Parser.Map<Parser.Zip<Parser.Char<"&">, QueryParamParser>, Second>

interface PrependToTuple extends TypeLambda1 {
  readonly return: Arg0<this> extends readonly [infer Head, infer Tail extends ReadonlyArray<unknown>] ?
    readonly [Head, ...Tail]
    : never
}

type QueryParamListParser = Parser.Map<Parser.Zip<QueryParamParser, Parser.Many<QueryParamTailParser>>, PrependToTuple>

interface ToQueryParamsAst extends TypeLambda1 {
  readonly return: Arg0<this> extends readonly ["?", infer Params extends ReadonlyArray<PathAst.QueryParam>] ? {
      readonly type: "query-params"
      readonly value: Params
    }
    : never
}

type QueryParamsParser = Parser.Map<Parser.Zip<Parser.Char<"?">, QueryParamListParser>, ToQueryParamsAst>

type PathAtomParser = Parser.OrElse<
  QueryParamsParser,
  Parser.OrElse<ParameterParser, Parser.OrElse<WildcardParser, PathLiteralParser>>
>

type SkipSlashesParser = Parser.Optional<Parser.Many1<Parser.Char<"/">>>

export type PathParser = Parser.Map<Parser.Zip<SkipSlashesParser, PathAtomParser>, Second>

type SlashAst = { readonly type: "slash" }

type PathChunk = readonly [PathAst] | readonly [SlashAst, PathAst]

interface ToPathChunk extends TypeLambda1 {
  readonly return: Arg0<this> extends readonly [infer Slashes, infer Ast extends PathAst] ?
    [Slashes] extends [undefined] ? readonly [Ast]
    : readonly [SlashAst, Ast]
    : never
}

type PathChunkParser = Parser.Map<Parser.Zip<SkipSlashesParser, PathAtomParser>, ToPathChunk>

type FlattenChunks<
  Chunks extends ReadonlyArray<PathChunk>,
  Acc extends ReadonlyArray<PathAst> = readonly []
> = Chunks extends readonly [infer Head extends PathChunk, ...infer Tail extends ReadonlyArray<PathChunk>] ?
  FlattenChunks<Tail, readonly [...Acc, ...Head]> :
  Acc

type CombineChunks<First, Chunks extends ReadonlyArray<PathChunk>> = [First] extends [PathAst] ?
  readonly [First, ...FlattenChunks<Chunks>] :
  FlattenChunks<Chunks>

interface ToAsts extends TypeLambda1 {
  readonly return: Arg0<this> extends readonly [infer First, infer Chunks extends ReadonlyArray<PathChunk>] ?
    CombineChunks<First, Chunks> :
    never
}

type ParseAstsResult<Input extends string> = Parser.Run<
  Parser.Map<Parser.Zip<Parser.Optional<PathParser>, Parser.Many<PathChunkParser>>, ToAsts>,
  Input
>

type GetAsts<R> = [R] extends [never] ? never
  : R extends readonly [infer Asts extends ReadonlyArray<PathAst>, infer _Rest extends string] ? Asts
  : never

type ParseAsts<Input extends string> = GetAsts<ParseAstsResult<Input>>

type ParamsOfAst<T> = T extends { type: "parameter"; name: infer Name extends string; optional: true } ?
  { [K in Name]?: string } :
  T extends { readonly type: "parameter"; readonly name: infer Name extends string } ? { [K in Name]: string } :
  T extends { readonly type: "wildcard" } ? { "*": string } :
  T extends { readonly type: "query-params"; readonly value: infer Values extends ReadonlyArray<PathAst.QueryParam> } ?
    ParamsOfQueryParams<Values> :
  {}

type ParamsOfQueryParams<T extends ReadonlyArray<PathAst.QueryParam>, Acc = {}> = T extends readonly [
  infer Head,
  ...infer Tail extends ReadonlyArray<PathAst.QueryParam>
] ? ParamsOfQueryParams<Tail, Acc & ParamsOfQueryParam<Head>>
  : Acc

type ParamsOfQueryParam<T> = T extends { readonly type: "query-param"; readonly value: infer Value extends PathAst } ?
  ParamsOfAst<Value>
  : {}

type GetParams<T extends ReadonlyArray<PathAst>, Acc = {}> = T extends readonly [
  infer Head,
  ...infer Tail extends ReadonlyArray<PathAst>
] ? GetParams<Tail, Acc & ParamsOfAst<Head>>
  : Acc

type PathParamsOfAst<T> = T extends { type: "parameter"; name: infer Name extends string; optional: true } ?
  { [K in Name]?: string } :
  T extends { readonly type: "parameter"; readonly name: infer Name extends string } ? { [K in Name]: string } :
  T extends { readonly type: "wildcard" } ? { "*": string } :
  {}

type QueryParamsOfAst<T> = T extends {
  readonly type: "query-params"
  readonly value: infer Values extends ReadonlyArray<PathAst.QueryParam>
} ? ParamsOfQueryParams<Values> :
  {}

type GetPathParams<T extends ReadonlyArray<PathAst>, Acc = {}> = T extends readonly [
  infer Head,
  ...infer Tail extends ReadonlyArray<PathAst>
] ? GetPathParams<Tail, Acc & PathParamsOfAst<Head>>
  : Acc

type GetQueryParams<T extends ReadonlyArray<PathAst>, Acc = {}> = T extends readonly [
  infer Head,
  ...infer Tail extends ReadonlyArray<PathAst>
] ? GetQueryParams<Tail, Acc & QueryParamsOfAst<Head>>
  : Acc

type ToReadonlyRecord<T> = [T] extends [infer T2] ? { readonly [K in keyof T2]: T2[K] } : never

export type PathParams<P extends string> = ParseAsts<P> extends infer Asts ? [Asts] extends [never] ? never
  : Asts extends ReadonlyArray<PathAst> ? ToReadonlyRecord<GetPathParams<Asts>>
  : never
  : never

export type QueryParams<P extends string> = ParseAsts<P> extends infer Asts ? [Asts] extends [never] ? never
  : Asts extends ReadonlyArray<PathAst> ? ToReadonlyRecord<GetQueryParams<Asts>>
  : never
  : never

export type Params<P extends string> = ParseAsts<P> extends infer Asts ? [Asts] extends [never] ? never
  : Asts extends ReadonlyArray<PathAst> ? ToReadonlyRecord<GetParams<Asts>>
  : never
  : never

export type RuntimeParseResult = readonly [asts: ReadonlyArray<PathAst>, rest: string]

export function parseWithRest(input: string): RuntimeParseResult {
  let index = 0
  const asts: Array<PathAst> = []

  while (index < input.length) {
    const start = index
    let hasSlash = false
    while (index < input.length && input[index] === "/") {
      hasSlash = true
      index++
    }

    const atom = parseAtom(input, index)
    if (atom === undefined) {
      index = start
      break
    }

    if (hasSlash && asts.length > 0) {
      asts.push(AST.slash())
    }
    asts.push(atom.ast)
    index = atom.index
  }

  return [asts, input.slice(index)]
}

export function parse<const P extends string>(input: P): ParseAsts<P> {
  const [asts, rest] = parseWithRest(input)
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] !== "/") {
      const index = input.length - rest.length
      throw new Error(`Failed to parse path at index ${index}`)
    }
  }
  return asts as ParseAsts<P>
}

export type Join<Parts extends ReadonlyArray<PathAst>> = `/${StringJoin<
  {
    [K in keyof Parts]: FormatAst<Parts[K]>
  },
  ""
>}`

type StringJoin<Input extends ReadonlyArray<string>, R extends string = ""> = Input extends
  readonly [infer A extends string, ...infer Rest extends ReadonlyArray<string>] ? StringJoin<Rest, `${R}${A}`> : R

type FormatAst<T extends PathAst> = [T] extends [PathAst.Literal] ? T["value"] :
  [T] extends [PathAst.Parameter] ? FormatParameterAst<T> :
  [T] extends [PathAst.Wildcard] ? `*` :
  [T] extends [PathAst.Slash] ? `/` :
  [T] extends [PathAst.QueryParams] ? FormatQueryParamsAst<T["value"]> :
  never

type FormatParameterAst<T extends PathAst.Parameter> = `:${T["name"]}${T["optional"] extends true ? "?" : ""}`
type FormatQueryParamsAst<T extends ReadonlyArray<PathAst.QueryParam>, R extends string = "?"> = T extends
  readonly [infer Head extends PathAst.QueryParam, ...infer Tail extends ReadonlyArray<PathAst.QueryParam>]
  ? FormatQueryParamsAst<Tail, `${R}${R extends "?" ? "" : "&"}${FormatQueryParamAst<Head>}`>
  : R

type FormatQueryParamAst<T extends PathAst.QueryParam> = `${T["name"]}=${FormatAst<T["value"]>}`

export function join<const Parts extends ReadonlyArray<PathAst>>(asts: Parts): Join<Parts> {
  return `/${asts.map(formatAst).join("")}` as Join<Parts>
}

function formatAst(ast: PathAst): string {
  switch (ast.type) {
    case "literal":
      return ast.value
    case "parameter":
      return `:${ast.name}`
    case "wildcard":
      return "*"
    case "slash":
      return "/"
    case "query-params":
      return `?${ast.value.map(getQueryParamAst).join("&")}`
  }
}

function getQueryParamAst(ast: PathAst.QueryParam): string {
  return `${ast.name}=${formatAst(ast.value)}`
}

type Atom = {
  readonly ast: PathAst
  readonly index: number
}

function parseAtom(input: string, index: number): Atom | undefined {
  const char = input[index]

  if (char === undefined) {
    return undefined
  }

  if (char === "?") {
    return parseQueryParams(input, index)
  }

  if (char === ":") {
    return parseParameter(input, index)
  }

  if (char === "*") {
    return { ast: AST.wildcard(), index: index + 1 }
  }

  return parsePathLiteral(input, index)
}

function parseParameter(input: string, index: number): Atom | undefined {
  if (input[index] !== ":") {
    return undefined
  }

  let i = index + 1
  let name = ""
  while (i < input.length && isAlphaNumeric(input[i])) {
    name += input[i]
    i++
  }

  if (name.length === 0) {
    return undefined
  }

  let regex: string | undefined = undefined
  if (input[i] === "(") {
    i++
    const start = i
    while (i < input.length && input[i] !== ")") {
      i++
    }
    if (i >= input.length) {
      return undefined
    }
    if (i === start) {
      return undefined
    }
    regex = input.slice(start, i)
    i++
  }

  let optional: true | undefined = undefined
  if (input[i] === "?") {
    optional = true
    i++
  }

  return { ast: AST.parameter(name, optional, regex), index: i }
}

function parsePathLiteral(input: string, index: number): Atom | undefined {
  const char = input[index]
  if (char === undefined || isPathStopChar(char)) {
    return undefined
  }

  let i = index
  while (i < input.length && !isPathStopChar(input[i])) {
    i++
  }

  return { ast: AST.literal(input.slice(index, i)), index: i }
}

function parseQueryParams(input: string, index: number): Atom | undefined {
  if (input[index] !== "?") {
    return undefined
  }

  const first = parseQueryParam(input, index + 1)
  if (first === undefined) {
    return undefined
  }

  let i = first.index
  const params: Array<PathAst.QueryParam> = [first.ast]

  while (i < input.length && input[i] === "&") {
    const start = i
    const next = parseQueryParam(input, i + 1)
    if (next === undefined) {
      i = start
      break
    }
    params.push(next.ast)
    i = next.index
  }

  return { ast: AST.queryParams(params), index: i }
}

type QueryParamResult = {
  readonly ast: PathAst.QueryParam
  readonly index: number
}

function parseQueryParam(input: string, index: number): QueryParamResult | undefined {
  let i = index
  let name = ""
  while (i < input.length && isAlphaNumeric(input[i])) {
    name += input[i]
    i++
  }

  if (name.length === 0) {
    return undefined
  }

  if (input[i] !== "=") {
    return undefined
  }
  i++

  const value = parseQueryValue(input, i)
  if (value === undefined) {
    return undefined
  }

  return { ast: AST.queryParam(name, value.ast), index: value.index }
}

function parseQueryValue(input: string, index: number): Atom | undefined {
  const char = input[index]

  if (char === undefined) {
    return undefined
  }

  if (char === ":") {
    return parseParameter(input, index)
  }

  if (char === "*") {
    return { ast: AST.wildcard(), index: index + 1 }
  }

  let i = index
  while (i < input.length && input[i] !== "&") {
    i++
  }

  if (i === index) {
    return undefined
  }

  return { ast: AST.literal(input.slice(index, i)), index: i }
}

function isPathStopChar(char: string): boolean {
  return char === "/" || char === ":" || char === "*" || char === "?"
}

function isAlphaNumeric(char: string): boolean {
  return char >= "0" && char <= "9" || char >= "a" && char <= "z" || char >= "A" && char <= "Z"
}

/**
 * @internal
 */
export function getSchemaFields<const Parts extends ReadonlyArray<PathAst>>(parts: Parts) {
  const requiredFields: Array<[string, Schema.Top]> = []
  const optionalFields: Array<[Schema.Record.Key, Schema.Top]> = []
  const queryParams: Array<[string, {
    readonly requiredFields: Array<[string, Schema.Top]>
    readonly optionalFields: Array<[Schema.Record.Key, Schema.Top]>
  }]> = []

  function addParameter(param: PathAst.Parameter) {
    const base = param.regex
      ? Schema.String.pipe(Schema.check(Schema.isPattern(new RegExp(param.regex))))
      : Schema.String

    if (param.optional) {
      optionalFields.push([Schema.optionalKey(Schema.Literal(param.name)), Schema.optional(base)])
    } else {
      requiredFields.push([param.name, base])
    }
  }

  function addQueryParams(params: ReadonlyArray<PathAst.QueryParam>) {
    for (const param of params) {
      const { optionalFields, queryParams: _queryParams, requiredFields } = getSchemaFields([param.value])
      queryParams.push([param.name, { optionalFields, requiredFields }])
      // eslint-disable-next-line no-restricted-syntax
      queryParams.push(..._queryParams)
    }
  }

  function addParts(parts: ReadonlyArray<PathAst>) {
    for (const part of parts) {
      if (part.type === "parameter") {
        addParameter(part)
      } else if (part.type === "wildcard") {
        requiredFields.push(["*", Schema.String])
      } else if (part.type === "query-params") {
        addQueryParams(part.value)
      }
    }
  }

  addParts(parts)

  return {
    requiredFields,
    optionalFields,
    queryParams
  }
}

export function getSchemas<const Parts extends ReadonlyArray<PathAst>>(parts: Parts) {
  const { optionalFields, queryParams, requiredFields } = getSchemaFields(parts)
  const pathFields = Object.fromEntries(requiredFields)
  const queryFields = Object.fromEntries(queryParams.map(([name, { optionalFields, requiredFields }]) => [
    name,
    Schema.StructWithRest(
      Schema.Struct(Object.fromEntries(requiredFields)),
      optionalFields.map(([key, value]) => Schema.Record(key, value))
    )
  ]))

  const pathSchema = Schema.StructWithRest(
    Schema.Struct(pathFields),
    optionalFields.map(([key, value]) => Schema.Record(key, value))
  )
  const querySchema = Schema.Struct(queryFields)
  const paramsSchema = Schema.StructWithRest(
    Schema.Struct({ ...pathFields, ...queryFields }),
    optionalFields.map(([key, value]) => Schema.Record(key, value))
  )

  return {
    pathSchema,
    querySchema,
    paramsSchema
  } as const
}
