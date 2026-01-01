import type { Arg0, TypeLambda1 } from "hkt-core"

import type { PathAst } from "./AST.ts"
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

type ParseAstsResult<Input extends string> = Parser.Run<Parser.Many<PathParser>, Input>

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
