/* eslint-disable no-restricted-syntax */
import * as Effect from "../../Effect.ts"
import { type Pipeable, pipeArguments } from "../../Pipeable.ts"
import { singleton } from "../../Record.ts"
import * as Schema from "../../Schema.ts"
import * as Parser from "../../SchemaParser.ts"
import * as Transformation from "../../SchemaTransformation.ts"
import type { Simplify } from "../../Types.ts"
import * as AST from "./AST.ts"
import * as Path from "./Path.ts"

export interface Route<
  P extends string,
  S extends Schema.Codec<any, Path.Params<P>, any, any> = Schema.Codec<Path.Params<P>>
> extends Pipeable {
  readonly ast: AST.RouteAst
  readonly path: P

  readonly paramsSchema: S
  readonly pathSchema: Schema.Codec<Path.PathParams<P>>
  readonly querySchema: Schema.Codec<Path.QueryParams<P>>
}

export declare namespace Route {
  export type Any = Route<any, any>

  export type Path<T> = T extends Route<infer P, any> ? P : never
  export type Schema<T> = T extends Route<any, infer S> ? S : never
  export type Type<T> = T extends Route<any, infer S> ? S["Type"] : never
  export type Params<T> = T extends Route<infer P, infer _S> ? Path.Params<P> : never
  export type DecodingServices<T> = T extends Route<any, infer S> ? S["DecodingServices"] : never
  export type EncodingServices<T> = T extends Route<any, infer S> ? S["EncodingServices"] : never

  export type PathType<T extends Any> = T["pathSchema"]["Type"]
  export type QueryType<T extends Any> = T["querySchema"]["Type"]
}

export function make<
  const P extends string,
  S extends Schema.Codec<any, Path.Params<P>, any, any> = Schema.Codec<
    Path.Params<P>
  >
>(ast: AST.RouteAst): Route<P, S> {
  const getParts = once(() => getPathAst(ast))
  const path = once(() => Path.join(getParts()) as P)
  const paramsSchema = once(() => getParamsSchema(ast) as S)
  const pathSchema = once(() => getPathSchema(ast) as Schema.Codec<Path.PathParams<P>>)
  const querySchema = once(() => getQuerySchema(ast) as Schema.Codec<Path.QueryParams<P>>)

  return {
    ast,
    get path() {
      return path()
    },
    get paramsSchema() {
      return paramsSchema()
    },
    get pathSchema() {
      return pathSchema()
    },
    get querySchema() {
      return querySchema()
    },
    pipe() {
      return pipeArguments(this, arguments)
    }
  }
}

function once<T>(fn: () => T): () => T {
  let memoized: [T] | [] = []
  return (): T => {
    if (memoized.length === 1) {
      return memoized[0]
    }
    const result = fn()
    memoized = [result]
    return result
  }
}

function getPathAst(ast: AST.RouteAst): ReadonlyArray<AST.PathAst> {
  switch (ast.type) {
    case "path":
      return [ast.path]
    case "transform":
      return getPathAst(ast.from)
    case "join": {
      const result: Array<AST.PathAst> = []
      for (let i = 0; i < ast.parts.length; i++) {
        if (i > 0) {
          result.push(AST.slash())
        }
        result.push(...getPathAst(ast.parts[i]))
      }
      return result
    }
  }
}

function getParamsSchema(ast: AST.RouteAst): Schema.Top {
  switch (ast.type) {
    case "path": {
      const { paramsSchema } = Path.getSchemas(getPathAst(ast))
      return paramsSchema
    }
    case "transform": {
      const { paramsSchema } = Path.getSchemas(getPathAst(ast.from))
      return paramsSchema.pipe(Schema.decodeTo(ast.to, ast.transformation))
    }
    case "join": {
      const parts = ast.parts.map((part) => Path.getSchemaFields(getPathAst(part)))
      const requiredFields: Array<[string, Schema.Top]> = []
      const optionalFields: Array<[Schema.Record.Key, Schema.Top]> = []
      const queryParams: Array<[string, {
        readonly requiredFields: Array<[string, Schema.Top]>
        readonly optionalFields: Array<[Schema.Record.Key, Schema.Top]>
      }]> = []

      for (const part of parts) {
        requiredFields.push(...part.requiredFields)
        optionalFields.push(...part.optionalFields)
        queryParams.push(...part.queryParams)
      }

      const pathFields = Object.fromEntries(requiredFields)
      const queryFields = Object.fromEntries(queryParams.map(([name, { optionalFields, requiredFields }]) => [
        name,
        Schema.StructWithRest(
          Schema.Struct(Object.fromEntries(requiredFields)),
          optionalFields.map(([key, value]) => Schema.Record(key, value))
        )
      ]))

      const paramsSchema = Schema.StructWithRest(
        Schema.Struct({ ...pathFields, ...queryFields }),
        optionalFields.map(([key, value]) => Schema.Record(key, value))
      )

      return paramsSchema
    }
  }
}

function getPathSchema(ast: AST.RouteAst): Schema.Top {
  if (ast.type !== "join") return Path.getSchemas(getPathAst(ast)).pathSchema

  const parts = ast.parts.map((part) => Path.getSchemaFields(getPathAst(part)))
  const requiredFields: Array<[string, Schema.Top]> = []
  const optionalFields: Array<[Schema.Record.Key, Schema.Top]> = []

  for (const part of parts) {
    requiredFields.push(...part.requiredFields)
    optionalFields.push(...part.optionalFields)
  }

  const pathFields = Object.fromEntries(requiredFields)
  return Schema.StructWithRest(
    Schema.Struct(pathFields),
    optionalFields.map(([key, value]) => Schema.Record(key, value))
  )
}

function getQuerySchema(ast: AST.RouteAst): Schema.Top {
  if (ast.type !== "join") return Path.getSchemas(getPathAst(ast)).querySchema

  const parts = ast.parts.map((part) => Path.getSchemaFields(getPathAst(part)))
  const queryParams: Array<[string, {
    readonly requiredFields: Array<[string, Schema.Top]>
    readonly optionalFields: Array<[Schema.Record.Key, Schema.Top]>
  }]> = []

  for (const part of parts) {
    queryParams.push(...part.queryParams)
  }

  const queryFields = Object.fromEntries(queryParams.map(([name, { optionalFields, requiredFields }]) => [
    name,
    Schema.StructWithRest(
      Schema.Struct(Object.fromEntries(requiredFields)),
      optionalFields.map(([key, value]) => Schema.Record(key, value))
    )
  ]))

  return Schema.Struct(queryFields)
}

export const Parse = <const P extends string>(path: P): Route<Path.Join<Path.ParseAsts<P>>> => {
  const asts = Path.parse(path) as ReadonlyArray<AST.PathAst>
  if (asts.length === 0) return Slash as unknown as Route<Path.Join<Path.ParseAsts<P>>>
  if (asts.length === 1) return make(AST.path(asts[0]))
  return join<Array<any>>(...asts.map((ast) => make(AST.path(ast)))) as unknown as Route<Path.Join<Path.ParseAsts<P>>>
}

export const Slash = make<"/">(AST.path(AST.literal("")))

export const Wildcard = make<"*">(AST.path(AST.wildcard()))

export const Param = <const P extends string>(paramName: P): Route<`/:${P}`> =>
  make<`/:${P}`>(AST.path(AST.parameter(paramName)))

export const ParamWithSchema = <
  const P extends string,
  S extends Schema.Codec<any, string, any, any> = Schema.Codec<string>
>(
  paramName: P,
  schema: S
): Route<
  `/:${P}`,
  Schema.Codec<{ readonly [K in P]: S["Type"] }, Path.Params<`/:${P}`>, S["DecodingServices"], S["EncodingServices"]>
> => {
  const decode = Parser.decodeEffect(schema)
  const encode = Parser.encodeEffect(schema)

  return make(AST.transform(
    AST.path(AST.parameter(paramName)),
    Schema.Struct(singleton(paramName, schema.Type)),
    Transformation.transformOrFail({
      decode: (input: Record<P, S["Encoded"]>) =>
        Effect.map(decode(input[paramName]), (decoded) => singleton(paramName, decoded)),
      encode: (output: Record<P, S["Type"]>) =>
        Effect.map(encode(output[paramName]), (encoded) => singleton(paramName, encoded))
    })
  ))
}

export const Number = <const P extends string>(
  paramName: P
): Route<`/:${P}`, Schema.Codec<{ readonly [K in P]: number }, Path.Params<`/:${P}`>>> =>
  ParamWithSchema(paramName, Schema.NumberFromString)

export const Int = <const P extends string>(
  paramName: P
): Route<`/:${P}`, Schema.Codec<{ readonly [K in P]: number }, Path.Params<`/:${P}`>>> =>
  ParamWithSchema(paramName, Schema.NumberFromString.pipe(Schema.decodeTo(Schema.Int)))

export type Join<Routes extends ReadonlyArray<Route<any, any>>> = [
  Route<
    RouteJoinPath<Routes>,
    Schema.Codec<
      Simplify<UnionToIntersection<Routes[number]["paramsSchema"]["Type"]>>,
      Path.Params<RouteJoinPath<Routes>>,
      Routes[number]["paramsSchema"]["DecodingServices"],
      Routes[number]["paramsSchema"]["EncodingServices"]
    >
  >
] extends [Route<infer Path, infer Schema>] ? Route<Path, Schema> : never

type AnyRoutes = ReadonlyArray<Route<any, any> | ReadonlyArray<Route<any, any>>>
type FlattenRoutes<T extends AnyRoutes> = T extends
  readonly [infer Head extends Route<any, any> | ReadonlyArray<Route<any, any>>, ...infer Tail extends AnyRoutes]
  ? readonly [...(Head extends ReadonlyArray<Route<any, any>> ? FlattenRoutes<Head> : [Head]), ...FlattenRoutes<Tail>]
  : []

const removeSlash = (ast: AST.RouteAst): ReadonlyArray<AST.RouteAst> => {
  if (ast.type === "path" && ast.path.type === "slash") return []
  return [ast]
}

export const join = <const Routes extends AnyRoutes>(
  ...routes: Routes
): Join<FlattenRoutes<Routes>> =>
  make(AST.join(routes.flatMap((route) => {
    if (Array.isArray(route)) return route.flatMap(removeSlash)
    return removeSlash((route as Route<any, any>).ast)
  })))

type UnionToIntersection<T> = (T extends any ? (x: T) => any : never) extends (x: infer R) => any ? R : never
type RouteJoinPath<Routes extends ReadonlyArray<Route<any, any>>, R extends string = ""> = Routes extends
  readonly [infer First extends Route<any, any>, ...infer Rest extends ReadonlyArray<Route<any, any>>]
  ? RouteJoinPath<Rest, `${R}/${StripSlashes<First["path"]>}`>
  : R
type StripSlashes<T extends string> = StripTrailingSlash<StripLeadingSlash<T>>
type StripLeadingSlash<T extends string> = T extends `/${infer Rest}` ? StripLeadingSlash<Rest> : T
type StripTrailingSlash<T extends string> = T extends `/${infer Rest}` ? StripTrailingSlash<Rest> : T
