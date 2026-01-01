import type * as Schema from "../../Schema.ts"
import type { RouteAst } from "./AST.ts"
import type * as Path from "./Path.ts"

export interface Route<
  P extends string,
  S extends Schema.Codec<any, string, any, any> = Schema.Codec<Path.Params<P>, string>
> {
  readonly ast: RouteAst
  readonly path: P
  readonly schema: S
}

export declare namespace Route {
  export type Any = Route<any, any>
}
