import type { Cause } from "../../Cause.ts"
import { succeedSome } from "../../Effect.ts"
import type { Top } from "../../Schema.ts"
import type { Transformation } from "../../SchemaTransformation.ts"
import type { Fx } from "../fx/Fx.ts"
import type { RefSubject } from "../fx/RefSubject/RefSubject.ts"
import type { Guard } from "../guard/index.ts"
import type { AnyLayer, Layout as LayoutType, MatchHandler } from "./Matcher.ts"

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

export type MatchAst =
  | MatchAst.Route
  | MatchAst.Layer
  | MatchAst.Layout
  | MatchAst.Prefixed
  | MatchAst.Catch

export declare namespace MatchAst {
  export interface Route {
    type: "route"
    route: RouteAst
    guard: Guard<any, any, any, any>
    handler: MatchHandler<any, any, any, any>
  }

  export interface Layer {
    type: "layer"
    matches: ReadonlyArray<MatchAst>
    deps: ReadonlyArray<AnyLayer>
  }

  export interface Layout {
    type: "layout"
    matches: ReadonlyArray<MatchAst>
    layout: LayoutType<any, any, any, any, any, any, any>
  }

  export interface Prefixed {
    type: "prefixed"
    matches: ReadonlyArray<MatchAst>
    prefix: RouteAst
  }

  export interface Catch {
    type: "catch"
    matches: ReadonlyArray<MatchAst>
    f: (cause: RefSubject<Cause<any>>) => Fx<any, any, any>
  }
}

export const route = (
  route: RouteAst,
  handler: MatchHandler<any, any, any, any>,
  guard: Guard<any, any, any, any> = succeedSome
): MatchAst.Route => ({ type: "route", route, guard, handler })

export const layer = (
  matches: ReadonlyArray<MatchAst>,
  deps: ReadonlyArray<AnyLayer>
): MatchAst.Layer => ({ type: "layer", matches, deps })

export const layout = (
  matches: ReadonlyArray<MatchAst>,
  layout: LayoutType<any, any, any, any, any, any, any>
): MatchAst.Layout => ({ type: "layout", matches, layout })

export const prefixed = (
  matches: ReadonlyArray<MatchAst>,
  prefix: RouteAst
): MatchAst.Prefixed => ({ type: "prefixed", matches, prefix })

export const catchCause = (
  matches: ReadonlyArray<MatchAst>,
  f: (cause: RefSubject<Cause<any>>) => Fx<any, any, any>
): MatchAst.Catch => ({ type: "catch", matches, f })
