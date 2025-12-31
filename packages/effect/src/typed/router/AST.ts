import type { Codec } from "../../Schema.ts"
import type { Transformation } from "../../SchemaTransformation.ts"

export type PathAst =
  | PathAst.Literal
  | PathAst.Parameter
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

export type RouteAst =
  | RouteAst.Path
  | RouteAst.Schema
  | RouteAst.Transform
  | RouteAst.Join

export declare namespace RouteAst {
  export interface Path {
    type: "path"
    path: PathAst
  }

  export interface Schema {
    type: "schema"
    path: PathAst
    schema: Codec<any, string, any, any>
  }

  export interface Transform {
    type: "transform"
    from: RouteAst
    transformation: Transformation<any, any, any, any>
  }

  export interface Join {
    type: "join"
    parts: ReadonlyArray<RouteAst>
  }
}
