import * as Effect from "../../Effect.ts"
import * as Layer from "../../Layer.ts"
import * as ServiceMap from "../../ServiceMap.ts"
import { Navigation } from "../navigation/Navigation.ts"
import { Parse, type Route } from "./Route.ts"

export interface CurrentRouteTree {
  readonly route: Route.Any
  readonly parent?: CurrentRouteTree | undefined
}

export class CurrentRoute extends ServiceMap.Service<CurrentRoute, CurrentRouteTree>()("@typed/router/CurrentRoute", {
  make: Effect.map(Navigation.base, (base) => ({ route: Parse(base) }))
}) {
  static readonly Default = Layer.effect(CurrentRoute, CurrentRoute.make)

  static readonly extend = (route: Route.Any) => Layer.unwrap(Effect.gen(function* () {
    const services = yield* Effect.services<never>()
    const parent = ServiceMap.getOrUndefined(services, CurrentRoute)
    return Layer.succeed(CurrentRoute, {
      route,
      parent
    })
  }))
}
