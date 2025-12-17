import type { Option } from "../../data/Option.ts"
import type { Effect } from "../../Effect.ts"
import type { Codec, SchemaError, Top } from "../../schema/Schema.ts"
import type * as ServiceMap from "../../ServiceMap.ts"
import type { Equals } from "../../types/Types.ts"

export type RouteAST =
  // Values :: We compile these directly to Schemas
  | RouteAST.Literal
  | RouteAST.Parameter
  | RouteAST.ParameterWithRegex
  | RouteAST.Wildcard
  | RouteAST.Optional
  // Compound :: Normalizes to sequences of literals WITHOUT any delimiters
  | RouteAST.Sequence
  // Transforms string -> A using a Schema
  | RouteAST.WithSchema
  // When concatentating ASTs, we always keep query params on the "outermost" portion
  | RouteAST.QueryParams

export declare namespace RouteAST {
  export type Literal<Value extends string = string> = {
    readonly _tag: "Literal"
    readonly value: Value
  }

  export type Parameter<Name extends string = string> = {
    readonly _tag: "Parameter"
    readonly name: Name
  }

  export type ParameterWithRegex<Name extends string = string, Regex extends string = string> = {
    readonly _tag: "ParameterWithRegex"
    readonly name: Name
    readonly regex: Regex
  }

  export type Wildcard = {
    readonly _tag: "Wildcard"
  }

  export type Optional<Route extends RouteAST = RouteAST> = {
    readonly _tag: "Optional"
    readonly route: Route
  }

  export type Sequence<Routes extends ReadonlyArray<RouteAST> = ReadonlyArray<RouteAST>> = {
    readonly _tag: "Sequence"
    readonly routes: Routes
  }

  export type QueryParams<
    Route extends RouteAST = RouteAST,
    Params extends ReadonlyArray<QueryParam> = ReadonlyArray<QueryParam>
  > = {
    readonly _tag: "QueryParams"
    readonly route: Route
    readonly params: Params
  }

  export type QueryParam<Name extends string = string, Value extends RouteAST = RouteAST> = {
    readonly name: Name
    readonly value: Value
  }

  export type WithSchema<Route extends RouteAST = RouteAST, S extends Top = Top> = {
    readonly _tag: "WithSchema"
    readonly route: Route
    readonly schema: S
  }
}

export interface Route<Path extends string, RD = never, RE = never> extends Codec<ParamsOf<Path>, string, RD, RE> {
  readonly routeAST: RouteAST

  // RouteAST -> Path
  readonly path: Path

  // RouteAST -> (Path -> Option<Params>)
  readonly match: (path: string) => Option<ParamsOf<Path>>

  // RouteAST -> (Params -> Path)
  readonly interpolate: <P extends ParamsOf<Path>>(params: P) => Interpolate<Path, P>
}

// Path -> { [key: string]: * }
export type ParamsOf<Path extends string> = ParamsOfAST<Parse<Path>>

export type ParamsOfAST<A extends RouteAST> = A extends RouteAST.Literal ? {}
  : A extends RouteAST.Parameter<infer Name> ? { [K in Name]: string }
  : A extends RouteAST.ParameterWithRegex<infer Name> ? { [K in Name]: string }
  : A extends RouteAST.Wildcard ? { "*": string }
  : A extends RouteAST.Optional<infer R> ? Partial<ParamsOfAST<R>>
  : A extends RouteAST.Sequence<infer Routes> ? ParamsOfSequence<Routes>
  : A extends RouteAST.QueryParams<infer R, infer P> ? ParamsOfAST<R> & ParamsOfQueryParams<P>
  : never

type ParamsOfSequence<Routes extends ReadonlyArray<RouteAST>> = Routes extends readonly [
  infer Head extends RouteAST,
  ...infer Tail extends ReadonlyArray<RouteAST>
] ? ParamsOfAST<Head> & ParamsOfSequence<Tail>
  : {}

type ParamsOfQueryParams<Params extends ReadonlyArray<RouteAST.QueryParam>> = Params extends readonly [
  infer Head extends RouteAST.QueryParam,
  ...infer Tail extends ReadonlyArray<RouteAST.QueryParam>
] ? ParamsOfQueryParam<Head> & ParamsOfQueryParams<Tail>
  : {}

type ParamsOfQueryParam<P extends RouteAST.QueryParam> = P extends RouteAST.QueryParam<any, infer Value>
  ? ParamsOfAST<Value>
  : {}

// Path -> { [key: string]: * } -> Path

export type Interpolate<Path extends string, Params extends ParamsOf<Path>> = InterpolateAST<Parse<Path>, Params>

type InterpolateAST<A extends RouteAST, Params> = A extends RouteAST.Literal<infer Value> ? Value
  : A extends RouteAST.Parameter<infer Name>
    ? Name extends keyof Params ? Params[Name] extends string | number | boolean ? `${Params[Name]}`
      : never
    : never
  : A extends RouteAST.ParameterWithRegex<infer Name>
    ? Name extends keyof Params ? Params[Name] extends string | number | boolean ? `${Params[Name]}`
      : never
    : never
  : A extends RouteAST.Wildcard
    ? "*" extends keyof Params ? Params["*"] extends string | number | boolean ? `${Params["*"]}`
      : never
    : never
  : A extends RouteAST.Sequence<infer Routes> ? InterpolateSequence<Routes, Params>
  : A extends RouteAST.QueryParams<infer R, infer P>
    ? `${InterpolateAST<R, Params>}?${InterpolateQueryParams<P, Params>}`
  : never

type InterpolateSequence<Routes extends ReadonlyArray<RouteAST>, Params> = Routes extends readonly [
  infer Head extends RouteAST,
  ...infer Tail extends ReadonlyArray<RouteAST>
] ? Tail extends [] ? InterpolateAST<Head, Params>
  : `${InterpolateAST<Head, Params>}/${InterpolateSequence<Tail, Params>}`
  : ""

type InterpolateQueryParams<Params extends ReadonlyArray<RouteAST.QueryParam>, P> = Params extends readonly [
  infer Head extends RouteAST.QueryParam,
  ...infer Tail extends ReadonlyArray<RouteAST.QueryParam>
] ? `${InterpolateQueryParam<Head, P>}${Tail extends [] ? "" : "&"}${InterpolateQueryParams<Tail, P>}`
  : ""

type InterpolateQueryParam<Param extends RouteAST.QueryParam, P> = Param extends
  RouteAST.QueryParam<infer Name, infer Value> ? `${Name}=${InterpolateAST<Value, P>}`
  : never

// Parser

export type Parse<Path extends string> = Path extends `${infer Pathname}?${infer Query}`
  ? RouteAST.QueryParams<ParsePathname<Pathname>, ParseQuery<Query>>
  : ParsePathname<Path>

type ParsePathname<Path extends string> = Path extends "" ? RouteAST.Sequence<[]>
  : Path extends "/" ? RouteAST.Literal<"/">
  : Path extends `/${infer Rest}`
    ? RouteAST.Sequence<[RouteAST.Literal<"">, ...ParseSegments<FilterEmpty<Split<Rest, "/">>>]>
  : RouteAST.Sequence<ParseSegments<FilterEmpty<Split<Path, "/">>>>

type ParseSegments<Segments extends Array<string>> = Segments extends [
  infer Head extends string,
  ...infer Tail extends Array<string>
] ? [ParseSegment<Head>, ...ParseSegments<Tail>]
  : []

type ParseSegment<S extends string> = S extends `:${infer Name}(${infer Regex})`
  ? RouteAST.ParameterWithRegex<Name, Regex>
  : S extends `:${infer Name}` ? RouteAST.Parameter<Name>
  : S extends `*` ? RouteAST.Wildcard
  : RouteAST.Literal<S>

type ParseQuery<Query extends string> = ParseQueryParams<FilterEmpty<Split<Query, "&">>>

type ParseQueryParams<Params extends Array<string>> = Params extends [
  infer Head extends string,
  ...infer Tail extends Array<string>
] ? [ParseQueryParam<Head>, ...ParseQueryParams<Tail>]
  : []

type ParseQueryParam<Param extends string> = Param extends `${infer Key}=:${infer Value}`
  ? RouteAST.QueryParam<Key, RouteAST.Parameter<Value>>
  : Param extends `${infer Key}=${infer Value}` ? RouteAST.QueryParam<Key, RouteAST.Literal<Value>>
  : RouteAST.QueryParam<Param, RouteAST.Literal<"">>

type Split<S extends string, D extends string> = string extends S ? Array<string>
  : S extends "" ? []
  : S extends `${infer Head}${D}${infer Tail}` ? [Head, ...Split<Tail, D>]
  : [S]

type FilterEmpty<T extends Array<string>> = T extends [infer Head, ...infer Tail extends Array<string>]
  ? Head extends "" ? FilterEmpty<Tail>
  : [Head, ...FilterEmpty<Tail>]
  : []
