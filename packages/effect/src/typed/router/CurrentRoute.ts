import * as Effect from "../../Effect.ts"
import * as Layer from "../../Layer.ts"
import * as ServiceMap from "../../ServiceMap.ts"
import { Parse, type Route } from "./Route.ts"

export interface CurrentRouteService {
  readonly route: Route.Any
  readonly parent: CurrentRouteService | undefined
}

export class CurrentRoute
  extends ServiceMap.Service<CurrentRoute, CurrentRouteService>()("@typed/router/CurrentRoute")
{
  static layer = <R extends Route.Any, P extends CurrentRouteService | null = null>(
    route: R
  ): Layer.Layer<CurrentRoute> =>
    Layer.unwrap(Effect.gen(function*() {
      const services = yield* Effect.services<never>()
      const parent = ServiceMap.getOrUndefined(services, CurrentRoute)
      return Layer.succeed(CurrentRoute, {
        route,
        parent
      })
    }))

  static Default = (path: string = "") => CurrentRoute.layer(Parse(path))
}
