import * as findMyWay from "find-my-way-ts"
import * as Effect from "../../Effect.ts"
import { interrupt } from "../../Exit.ts"
import { identity } from "../../Function.ts"
import { type Pipeable, pipeArguments } from "../../Pipeable.ts"
import * as Schema from "../../Schema.ts"
import * as Scope from "../../Scope.ts"
import * as ServiceMap from "../../ServiceMap.ts"
import * as Stream from "../../Stream.ts"
import { mapEffect } from "../fx/Fx/combinators/mapEffect.ts"
import { provideServices } from "../fx/Fx/combinators/provide.ts"
import { skipRepeats } from "../fx/Fx/combinators/skipRepeats.ts"
import { switchMap } from "../fx/Fx/combinators/switchMap.ts"
import { unwrap } from "../fx/Fx/combinators/unwrap.ts"
import { fromEffect } from "../fx/Fx/constructors/fromEffect.ts"
import { succeed } from "../fx/Fx/constructors/succeed.ts"
import type * as Fx from "../fx/Fx/Fx.ts"
import { fromStream } from "../fx/Fx/stream.ts"
import { isFx } from "../fx/Fx/TypeId.ts"
import { RefSubject } from "../fx/RefSubject.ts"
import { CurrentPath } from "./CurrentPath.ts"
import { CurrentRoute } from "./CurrentRoute.ts"
import { join, type Route } from "./Route.ts"
import { defaultFormatter } from "../../SchemaIssue.ts"

// TODO: not found handling 
// TODO: providing environments
// TODO: adding layouts
// TODO: middlewares and/or guards ?

export interface Matcher<A, E = never, R = never> extends Pipeable {
  readonly cases: ReadonlyArray<MatchCase<Route.Any, A, E, R>>
  readonly match: <Rt extends Route.Any, B, E2 = never, R2 = never>(
    route: Rt,
    handler: MatchHandler<Rt, B, E2, R2>
  ) => Matcher<A | B, E | E2, R | R2>
  readonly prefix: <Rt extends Route.Any>(route: Rt) => Matcher<A, E, R>
}

export interface MatchCase<Rt extends Route.Any, A, E, R> {
  readonly route: Rt
  readonly handler: (
    params: RefSubject.RefSubject<Route.Type<Rt>>
  ) => Fx.Fx<A, E, R | Scope.Scope | CurrentPath | CurrentRoute>
}

export type MatchHandler<Rt extends Route.Any, A, E, R> =
  | Fx.Fx<A, E, R>
  | Stream.Stream<A, E, R>
  | Effect.Effect<A, E, R>
  | A
  | ((
    params: RefSubject.RefSubject<Route.Type<Rt>>
  ) => Fx.Fx<A, E, R> | Stream.Stream<A, E, R> | Effect.Effect<A, E, R> | A)

type MatchHandlerFn<Rt extends Route.Any, A, E, R> = (
  params: RefSubject.RefSubject<Route.Type<Rt>>
) => Fx.Fx<A, E, R> | Stream.Stream<A, E, R> | Effect.Effect<A, E, R> | A

function isMatchHandlerFn<Rt extends Route.Any, A, E, R>(
  handler: MatchHandler<Rt, A, E, R>
): handler is MatchHandlerFn<Rt, A, E, R> {
  return typeof handler === "function"
}

class MatcherImpl<A, E, R> implements Matcher<A, E, R> {
  readonly cases: ReadonlyArray<MatchCase<Route.Any, A, E, R>>
  constructor(cases: ReadonlyArray<MatchCase<Route.Any, A, E, R>>) {
    this.cases = cases
    this.pipe = this.pipe.bind(this)
  }
  match = <Rt extends Route.Any, B, E2 = never, R2 = never>(
    route: Rt,
    handler: MatchHandler<Rt, B, E2, R2>
  ): Matcher<A | B, E | E2, R | R2> =>
    new MatcherImpl<A | B, E | E2, R | R2>([...this.cases, { route, handler: normalizeHandler(handler) }])
  prefix = <Rt extends Route.Any>(route: Rt): Matcher<A, E, R> =>
    new MatcherImpl<A, E, R>(this.cases.map((c) => ({ ...c, route: join(route, c.route) })))
  pipe() {
    return pipeArguments(this, arguments)
  }
}

function normalizeHandler<Rt extends Route.Any, B, E2 = never, R2 = never>(
  handler: MatchHandler<Rt, B, E2, R2>
): (params: RefSubject.RefSubject<Route.Type<Rt>>) => Fx.Fx<B, E2, R2> {
  if (isMatchHandlerFn(handler)) return (params) => toFx(handler(params))
  return () => toFx(handler)
}

function toFx<A, E, R>(
  value: Fx.Fx<A, E, R> | Stream.Stream<A, E, R> | Effect.Effect<A, E, R> | A
): Fx.Fx<A, E, R> {
  if (isFx(value)) return value
  if (Stream.isStream(value)) return fromStream(value)
  if (Effect.isEffect(value)) return fromEffect(value)
  return succeed(value)
}

export const empty: Matcher<never> = new MatcherImpl([])
export const { match } = empty

export class RouteNotFound extends Schema.ErrorClass<RouteNotFound>("@typed/router/RouteNotFound")({
  _tag: Schema.tag("RouteNotFound"),
  path: Schema.String
}) { }

export class RouteDecodeError extends Schema.ErrorClass<RouteDecodeError>("@typed/router/RouteDecodeError")({
  _tag: Schema.tag("RouteDecodeError"),
  path: Schema.String,
  cause: Schema.String,
}) { }

export function run<A, E, R>(
  matcher: Matcher<A, E, R>
): Fx.Fx<A, E | RouteNotFound | RouteDecodeError, R | CurrentPath | CurrentRoute | Scope.Scope> {
  return unwrap(Effect.gen(function* () {
    const fiberId = yield* Effect.fiberId
    const rootScope = yield* Effect.scope
    const current = yield* CurrentRoute
    const prefixed = matcher.prefix(current.route)
    const router = findMyWay.make<MatchCase<Route.Any, A, E, R>>({ ignoreTrailingSlash: true, caseSensitive: false })

    for (const c of prefixed.cases) {
      router.all(c.route.path, c)
    }

    let currentState: {
      params: RefSubject.RefSubject<Route.Type<Route.Any>>
      route: Route.Any
      fx: Fx.Fx<A, E, R | Scope.Scope | CurrentPath | CurrentRoute>
      scope: Scope.Closeable
    } | null = null

    return CurrentPath.pipe(
      mapEffect(Effect.fn(function* (path) {
        const result = router.find("GET", path)

        // No match found at all
        if (result === undefined) return yield* Effect.fail(new RouteNotFound({ path }))

        const input = { ...result.params, ...result.searchParams }
        const decode = Schema.decodeUnknownEffect(result.handler.route.paramsSchema)
        const params = yield* Effect.mapErrorEager(decode(input), (cause) => new RouteDecodeError({ path, cause: defaultFormatter(cause.issue) }))

        // Match found, but the route is the same as the current one
        if (currentState !== null && currentState.route === result.handler.route) {
          // Update the params
          yield* RefSubject.set(currentState.params, params)
          // Return the current fx, skipRepeats will keep us from remounting
          return currentState.fx
        }

        // Close the current scope if it exists
        if (currentState !== null) {
          yield* Scope.close(currentState.scope, interrupt(fiberId))
        }

        const scope = yield* Scope.fork(rootScope)
        const paramsRef = yield* RefSubject.make(params).pipe(
          Scope.provide(scope)
        )

        currentState = {
          params: paramsRef,
          route: result.handler.route,
          scope,
          fx: result.handler.handler(paramsRef).pipe(
            provideServices(ServiceMap.make(Scope.Scope, scope))
          )
        }

        return currentState.fx
      })),
      skipRepeats,
      switchMap(identity)
    )
  }))
}

