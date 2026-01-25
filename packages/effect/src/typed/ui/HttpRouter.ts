import * as Effect from "../../Effect.ts"
import * as Exit from "../../Exit.ts"
import { dual } from "../../Function.ts"
import * as Layer from "../../Layer.ts"
import * as Option from "../../Option.ts"
import * as Scope from "../../Scope.ts"
import * as ServiceMap from "../../ServiceMap.ts"
import { type HttpRouter, type Route, RouteContext } from "../../unstable/http/HttpRouter.ts"
import * as HttpServerError from "../../unstable/http/HttpServerError.ts"
import * as HttpServerRequest from "../../unstable/http/HttpServerRequest.ts"
import * as HttpServerResponse from "../../unstable/http/HttpServerResponse.ts"
import { RefSubject } from "../fx/RefSubject.ts"
import { CurrentRoute } from "../router/CurrentRoute.ts"
import {
  compile,
  type CompiledEntry,
  makeCatchManager,
  makeLayerManager,
  makeLayoutManager,
  type Matcher
} from "../router/Matcher.ts"
import { renderToHtmlString } from "../template/Html.ts"
import type { RenderEvent } from "../template/RenderEvent.ts"

export const ssrForHttp: {
  <E, R>(
    input: Matcher<RenderEvent, E, R>
  ): (router: HttpRouter) => Effect.Effect<void>
  <E, R>(router: HttpRouter, input: Matcher<RenderEvent, E, R>): Effect.Effect<void>
} = dual(2, <E, R>(router: HttpRouter, input: Matcher<RenderEvent, E, R>) => {
  return Effect.gen(function* () {
    const matcher = Option.match(yield* Effect.serviceOption(CurrentRoute), {
      onNone: () => input,
      onSome: (parent) => input.prefix(parent.route)
    })
    const entries = compile(matcher.cases)
    const currentServices = yield* Effect.services<never>()

    yield* router.addAll(entries.map((e) => toRoute(e, currentServices)))
  })
})

export function handleHttpServerError(router: HttpRouter): Effect.Effect<void> {
  return router.addGlobalMiddleware((eff) =>
    Effect.catch(eff, (error) => {
      if (HttpServerError.isHttpServerError(error)) {
        switch (error.reason._tag) {
          case "RouteNotFound":
            return Effect.succeed(HttpServerResponse.empty({ status: 404 }))
          case "InternalError":
            return Effect.succeed(HttpServerResponse.empty({ status: 500 }))
          case "RequestParseError":
            return Effect.succeed(HttpServerResponse.empty({ status: 400 }))
          case "ResponseError":
            return Effect.succeed(HttpServerResponse.empty({ status: 500 }))
        }
      }
      return Effect.fail(error)
    })
  )
}

function toRoute(entry: CompiledEntry, currentServices: ServiceMap.ServiceMap<never>): Route<any, any> {
  return {
    "~effect/http/HttpRouter/Route": "~effect/http/HttpRouter/Route",
    method: "GET",
    path: entry.route.path,
    handler: Effect.gen(function* () {
      const fiberId = yield* Effect.fiberId
      const rootScope = yield* Effect.scope
      const routeContext = yield* RouteContext
      const request = yield* HttpServerRequest.HttpServerRequest
      const searchParams = yield* HttpServerRequest.ParsedSearchParams

      const input = { ...routeContext.params, ...searchParams }

      const params = yield* Effect.mapError(
        entry.decode(input),
        (cause) =>
          new HttpServerError.HttpServerError({
            reason: new HttpServerError.RequestParseError({ request, cause })
          })
      )

      const memoMap = yield* Layer.makeMemoMap
      const layerManager = makeLayerManager(memoMap, rootScope, fiberId)
      const layoutManager = makeLayoutManager(rootScope, fiberId)
      const catchManager = makeCatchManager(rootScope, fiberId)
      const prepared = yield* layerManager.prepare(entry.layers)

      const guardExit = yield* entry.guard(params).pipe(
        Effect.provideServices(prepared.services),
        Effect.exit
      )

      if (Exit.isFailure(guardExit) || Option.isNone(guardExit.value)) {
        yield* prepared.rollback
        return yield* new HttpServerError.HttpServerError({
          reason: new HttpServerError.RouteNotFound({ request })
        })
      }

      const matchedParams = guardExit.value.value
      yield* prepared.commit

      const scope = yield* Scope.fork(rootScope)
      const paramsRef = yield* RefSubject.make(matchedParams).pipe(
        Scope.provide(scope)
      )

      const preparedServices = prepared.services as ServiceMap.ServiceMap<any>
      const handlerServices = ServiceMap.merge(
        ServiceMap.merge(currentServices, preparedServices),
        ServiceMap.make(Scope.Scope, scope)
      )

      const handlerFx = entry.handler(paramsRef)

      const withLayouts = yield* layoutManager.apply(
        entry.layouts,
        matchedParams,
        handlerFx,
        preparedServices
      )

      const withCatches = yield* catchManager.apply(
        entry.catches,
        withLayouts,
        preparedServices
      )

      const html = yield* renderToHtmlString(withCatches).pipe(
        Effect.provideServices(handlerServices)
      )
      return HttpServerResponse.text(html, {
        headers: { "content-type": "text/html; charset=utf-8" }
      })
    }),
    uninterruptible: false,
    prefix: undefined
  }
}
