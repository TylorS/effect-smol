import * as Layer from "../../Layer.ts"
import * as ServiceMap from "../../ServiceMap.ts"
import { Parse, type Route } from "./Route.ts"

export interface CurrentRouteService {
  readonly route: Route.Any
  readonly parent: CurrentRouteService | null
}

export class CurrentRoute
  extends ServiceMap.Service<CurrentRoute, CurrentRouteService>()("@typed/router/CurrentRoute")
{
  static make = <R extends Route.Any, P extends CurrentRouteService | null = null>(
    route: R,
    parent: P = null as P
  ): CurrentRouteService => ({ route, parent })

  static layer = <R extends Route.Any, P extends CurrentRouteService | null = null>(
    route: R,
    parent: P = null as P
  ): Layer.Layer<CurrentRoute> => Layer.succeed(CurrentRoute, CurrentRoute.make(route, parent))

  static Default = (path: string = "") => CurrentRoute.layer(Parse(path))
}
