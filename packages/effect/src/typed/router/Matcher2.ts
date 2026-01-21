import type { Effect } from "../../Effect.ts"
import type {
  Any as AnyLayer,
  Error as LayerError,
  Services as LayerServices,
  Success as LayerSuccess
} from "../../Layer.ts"
import type { Stream } from "../../Stream.ts"
import type * as Fx from "../fx/Fx/Fx.ts"
import type { Guard } from "../guard/index.ts"
import type { CatchHandler, Layout, LayoutParams, MatchHandler } from "./Matcher.ts"
import type { Route } from "./Route.ts"

type BaseOptions = RouteHandlerOptions<any, any> | RouteGuardOptions<any, any, any>

type RouteHandlerOptions<Rt, H extends MatchHandler<Route.Type<Rt>, any, any, any>> = {
  readonly route: Rt
  readonly handler: H
}

type RouteGuardOptions<
  Rt,
  G extends Guard<Route.Type<Rt>, any, any, any>,
  H extends MatchHandler<Guard.Output<G>, any, any, any>
> = {
  readonly route: Rt
  readonly guard: G
  readonly handler: H
}

type RouteLayoutOptions<O extends BaseOptions> = O & {
  readonly layout: Layout<
    LayoutParams<
      "guard" extends keyof O ? Guard.Output<O["guard"]> : Route.Type<O["route"]>,
      any,
      any,
      any
    >,
    any,
    any,
    any,
    any,
    any,
    any
  >
}

type RouteDependenciesOptions<O extends RouteLayoutOptions<BaseOptions>> = O & {
  readonly dependencies: ReadonlyArray<AnyLayer>
}

type CatchBaseOptions = RouteLayoutOptions<BaseOptions> | RouteDependenciesOptions<RouteLayoutOptions<BaseOptions>>

type DepErrors<O> = "dependencies" extends keyof O
  ? O["dependencies"] extends ReadonlyArray<infer X extends AnyLayer> ? LayerError<X> : never
  : never

type RouteCatchOptions<O extends CatchBaseOptions> = O & {
  readonly catch: CatchHandler<
    ("layout" extends keyof O ? Fx.Error<ReturnType<O["layout"]>> : Fx.Error<ReturnType<O["handler"]>>) | DepErrors<O>,
    any,
    any,
    any
  >
}

export type AnyMatcherOptions =
  | BaseOptions
  | RouteLayoutOptions<BaseOptions>
  | RouteDependenciesOptions<RouteLayoutOptions<BaseOptions>>
  | RouteCatchOptions<CatchBaseOptions>

export type Success<O extends AnyMatcherOptions> =
  | ("catch" extends keyof O ? O["catch"] extends CatchHandler<any, infer A, any, any> ? A : never : never)
  | ("layout" extends keyof O ? O["layout"] extends Layout<any, any, any, any, infer B, any, any> ? B : never
    : Fx.Success<ReturnType<O["handler"]>>)

type HandlerOutput<H> = H extends (...args: any) => infer R ? R : H
type NormalizeHandlerOutput<H> = HandlerOutput<H> extends Fx.Fx<infer A, infer E, infer R> ? Fx.Fx<A, E, R>
  : HandlerOutput<H> extends Stream<infer A, infer E, infer R> ? Fx.Fx<A, E, R>
  : HandlerOutput<H> extends Effect<infer A, infer E, infer R> ? Fx.Fx<A, E, R>
  : Fx.Fx<HandlerOutput<H>>

type ErrorFromCatch<O> = "catch" extends keyof O ? O["catch"] extends CatchHandler<any, any, infer E, any> ? E : never
  : never
type ErrorFromLayout<O> = "layout" extends keyof O
  ? O["layout"] extends Layout<any, any, any, any, any, infer E, any> ? E : never
  : never
type ErrorFromHandler<O> = "handler" extends keyof O
  ? NormalizeHandlerOutput<O["handler"]> extends Fx.Fx<any, infer E, any> ? E : never
  : never

type PickFirstNotNever<T extends readonly any[]> = T extends readonly [infer X, ...infer Rest]
  ? [X] extends [never] ? PickFirstNotNever<Rest> : X
  : never

export type Error<O extends AnyMatcherOptions> =
  | (PickFirstNotNever<[ErrorFromCatch<O>, ErrorFromLayout<O>, ErrorFromHandler<O>]>)
  | ("dependencies" extends keyof O
    ? O["dependencies"] extends ReadonlyArray<infer X extends AnyLayer> ? LayerError<X> : never
    : never)

type SuccessFromDependencies<O> = "dependencies" extends keyof O
  ? O["dependencies"] extends ReadonlyArray<infer X extends AnyLayer> ? LayerSuccess<X> : never
  : never
type ServicesFromDependencies<O> = "dependencies" extends keyof O
  ? O["dependencies"] extends ReadonlyArray<infer X extends AnyLayer> ? LayerServices<X> : never
  : never
type ServicesFromCatch<O> = "catch" extends keyof O
  ? O["catch"] extends CatchHandler<any, any, any, infer R> ? R : never
  : never
type ServicesFromLayout<O> = "layout" extends keyof O
  ? O["layout"] extends Layout<any, any, any, any, any, any, infer R> ? R : never
  : never
type ServicesFromHandler<O> = "handler" extends keyof O
  ? NormalizeHandlerOutput<O["handler"]> extends Fx.Fx<any, any, infer R> ? R : never
  : never

export type Services<O extends AnyMatcherOptions> =
  | (Exclude<PickFirstNotNever<[ServicesFromLayout<O>, ServicesFromHandler<O>]>, SuccessFromDependencies<O>>)
  | ServicesFromCatch<O>
  | ServicesFromDependencies<O>
