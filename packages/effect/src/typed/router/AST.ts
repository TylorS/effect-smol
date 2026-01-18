import type { Top } from "../../Schema.ts"
import type { Transformation } from "../../SchemaTransformation.ts"

export type PathAst =
  | PathAst.Literal
  | PathAst.Parameter
  | PathAst.Slash
  | PathAst.Wildcard
  | PathAst.QueryParams

export declare namespace PathAst {
  export type Literal = {
    type: "literal"
    value: string
  }
  export type Parameter = {
    type: "parameter"
    name: string
    optional?: boolean
    regex?: string
  }

  export type Wildcard = {
    type: "wildcard"
  }

  export type Slash = {
    type: "slash"
  }

  export type QueryParams = {
    type: "query-params"
    value: ReadonlyArray<PathAst.QueryParam>
  }

  export type QueryParam = {
    type: "query-param"
    name: string
    value: PathAst
  }
}

export const literal = (value: string): PathAst.Literal => ({ type: "literal", value })
export const parameter = (name: string, optional?: boolean, regex?: string): PathAst.Parameter => ({
  type: "parameter",
  name,
  ...(optional ? { optional } : {}),
  ...(regex ? { regex } : {})
})
export const wildcard = (): PathAst.Wildcard => ({ type: "wildcard" })
export const slash = (): PathAst.Slash => ({ type: "slash" })
export const queryParams = (value: ReadonlyArray<PathAst.QueryParam>): PathAst.QueryParams => ({
  type: "query-params",
  value
})
export const queryParam = (name: string, value: PathAst): PathAst.QueryParam => ({ type: "query-param", name, value })

export type RouteAst =
  | RouteAst.Path
  | RouteAst.Transform
  | RouteAst.Join

export declare namespace RouteAst {
  export interface Path {
    type: "path"
    path: PathAst
  }

  export interface Transform {
    type: "transform"
    from: RouteAst
    to: Top
    transformation: Transformation<any, any, any, any>
  }

  export interface Join {
    type: "join"
    parts: ReadonlyArray<RouteAst>
  }
}

export const path = (path: PathAst): RouteAst.Path => ({ type: "path", path })
export const transform = (
  from: RouteAst,
  to: Top,
  transformation: Transformation<any, any, any, any>
): RouteAst.Transform => ({
  type: "transform",
  from,
  to,
  transformation
})
export const join = (parts: ReadonlyArray<RouteAst>): RouteAst.Join => ({ type: "join", parts })
