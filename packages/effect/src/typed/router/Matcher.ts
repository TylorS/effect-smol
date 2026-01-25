import * as findMyWay from "find-my-way-ts"
import type * as Arr from "../../Array.ts"
import * as Cause from "../../Cause.ts"
import * as Effect from "../../Effect.ts"
import * as Exit from "../../Exit.ts"
import { interrupt, isSuccess } from "../../Exit.ts"
import { isFail } from "../../Filter.ts"
import { dual, identity } from "../../Function.ts"
import * as Layer from "../../Layer.ts"
import * as Option from "../../Option.ts"
import { type Pipeable, pipeArguments } from "../../Pipeable.ts"
import * as Schema from "../../Schema.ts"
import { defaultFormatter } from "../../SchemaIssue.ts"
import * as Scope from "../../Scope.ts"
import * as ServiceMap from "../../ServiceMap.ts"
import * as Stream from "../../Stream.ts"
import type { ExcludeTag, ExtractTag, NoInfer, Tags } from "../../Types.ts"
import { exit } from "../fx/Fx.ts"
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
import { CurrentPath } from "../navigation/Navigation.ts"
import * as AST from "./AST.ts"
import type { MatchAst, RouteAst } from "./AST.ts"
import { CurrentRoute } from "./CurrentRoute.ts"
import { join, make as makeRoute, type Route } from "./Route.ts"

export type Layout<Params, A, E, R, B, E2, R2> = (
  params: LayoutParams<Params, A, E, R>
) => Fx.Fx<B, E2, R2>

export type LayoutParams<Params, A, E, R> = {
  readonly params: RefSubject.RefSubject<Params>
  readonly content: Fx.Fx<A, E, R>
}

export type CatchHandler<E, A, E2, R2> = (
  cause: RefSubject.RefSubject<Cause.Cause<E>>
) => Fx.Fx<A, E2, R2>

export type AnyLayer =
  | Layer.Layer<any, any, any>
  | Layer.Layer<never, any, any>
  | Layer.Layer<any, never, any>
  | Layer.Layer<any, any, never>
  | Layer.Layer<never, never, never>
  | Layer.Layer<any, never, never>
  | Layer.Layer<never, any, never>
  | Layer.Layer<never, never, any>

type AnyServiceMap = ServiceMap.ServiceMap<any> | ServiceMap.ServiceMap<never>
type AnyDependency = AnyLayer | AnyServiceMap
type AnyLayout = Layout<any, any, any, any, any, any, any>
type AnyCatch = CatchHandler<any, any, any, any>
type AnyGuard = GuardType<any, any, any, any>
type AnyMatchHandler = (params: RefSubject.RefSubject<any>) => Fx.Fx<any, any, any>

type DependencyProvided<D> = D extends Layer.Layer<infer Provided, any, any> ? Provided
  : D extends ServiceMap.ServiceMap<infer Provided> ? Provided
  : never
type DependencyError<D> = D extends Layer.Layer<any, infer E, any> ? E : never
type DependencyRequirements<D> = D extends Layer.Layer<any, any, infer R> ? R : never

type LayerSuccess<L> = L extends Layer.Layer<infer Provided, any, any> ? Provided : never
type LayerError<L> = L extends Layer.Layer<any, infer E, any> ? E : never
type LayerServices<L> = L extends Layer.Layer<any, any, infer R> ? R : never

export type GuardType<I, O, E = never, R = never> = (input: I) => Effect.Effect<Option.Option<O>, E, R>
export interface AsGuard<I, O, E = never, R = never> {
  readonly asGuard: () => GuardType<I, O, E, R>
}
export type GuardInput<I, O, E = never, R = never> = GuardType<I, O, E, R> | AsGuard<I, O, E, R>

type GuardOutput<G> = G extends GuardType<any, infer O, any, any> ? O
  : G extends AsGuard<any, infer O, any, any> ? O
  : never
type GuardError<G> = G extends GuardType<any, any, infer E, any> ? E
  : G extends AsGuard<any, any, infer E, any> ? E
  : never
type GuardServices<G> = G extends GuardType<any, any, any, infer R> ? R
  : G extends AsGuard<any, any, any, infer R> ? R
  : never

type MatchOptions<Rt extends Route.Any, B, E2, R2, D, LB, LE2, LR2, C> = {
  readonly route: Rt
  readonly handler:
  | MatchHandlerReturnValue<B, E2, R2>
  | ((params: RefSubject.RefSubject<Route.Type<Rt>>) => MatchHandlerReturnValue<B, E2, R2>)
  readonly dependencies?: D
  readonly layout?: Layout<Route.Type<Rt>, B, E2, R2, LB, LE2, LR2>
  readonly catch?: C
}

type MatchHandlerReturnValue<A, E, R> =
  | Fx.Fx<A, E, R>
  | Stream.Stream<A, E, R>
  | Effect.Effect<A, E, R>
  | A

type MatchHandlerOptions<Params, B, E2, R2, D, LB, LE2, LR2, C> = {
  readonly handler:
  | MatchHandlerReturnValue<B, E2, R2>
  | ((params: RefSubject.RefSubject<Params>) => MatchHandlerReturnValue<B, E2, R2>)
  readonly dependencies?: D
  readonly layout?: Layout<Params, B, E2, R2, LB, LE2, LR2>
  readonly catch?: C
}

type ApplyDependencies<E, R, D> = D extends ReadonlyArray<infer Dep> ? {
  readonly e: E | DependencyError<Dep>
  readonly r: Exclude<R, DependencyProvided<Dep>> | DependencyRequirements<Dep>
}
  : { readonly e: E; readonly r: R }

type ApplyCatch<A, E, R, C> = C extends CatchHandler<any, infer CA, infer CE, infer CR>
  ? { readonly a: A | CA; readonly e: CE; readonly r: R | CR }
  : { readonly a: A; readonly e: E; readonly r: R }

type ComputeMatchResult<Params, B, E2, R2, D, LB, LE2, LR2, C, GE, GR> = ApplyCatch<
  LB,
  ApplyDependencies<E2 | GE | LE2, R2 | GR | LR2, D>["e"],
  ApplyDependencies<E2 | GE | LE2, R2 | GR | LR2, D>["r"],
  C
>

export interface Matcher<A, E = never, R = never> extends Pipeable {
  readonly cases: ReadonlyArray<MatchAst>

  // Overload 1: match(route, handler) - function handler (must be first for inference)
  match<Rt extends Route.Any, B, E2 = never, R2 = never>(
    route: Rt,
    handler: (params: RefSubject.RefSubject<Route.Type<Rt>>) => MatchHandlerReturnValue<B, E2, R2>
  ): Matcher<A | B, E | E2, R | R2 | Scope.Scope>

  // Overload 2: match(route, effectLike) - Fx/Effect/Stream handler
  match<Rt extends Route.Any, B, E2 = never, R2 = never>(
    route: Rt,
    handler: Fx.Fx<B, E2, R2> | Effect.Effect<B, E2, R2> | Stream.Stream<B, E2, R2>
  ): Matcher<A | B, E | E2, R | R2 | Scope.Scope>

  // Overload 3: match(route, options) - route with options object
  match<
    Rt extends Route.Any,
    B,
    E2 = never,
    R2 = never,
    D extends ReadonlyArray<AnyDependency> | undefined = undefined,
    LB = B,
    LE2 = never,
    LR2 = never,
    C extends CatchHandler<any, any, any, any> | undefined = undefined
  >(
    route: Rt,
    options: MatchHandlerOptions<Route.Type<Rt>, B, E2, R2, D, LB, LE2, LR2, C>
  ): Matcher<
    | A
    | ComputeMatchResult<Route.Type<Rt>, B, E2, R2, D, LB, LE2, LR2, C, never, never>["a"],
    | E
    | ComputeMatchResult<Route.Type<Rt>, B, E2, R2, D, LB, LE2, LR2, C, never, never>["e"],
    | R
    | ComputeMatchResult<Route.Type<Rt>, B, E2, R2, D, LB, LE2, LR2, C, never, never>["r"]
    | Scope.Scope
  >

  // Overload 4: match(route, value) - direct value handler (last for 2-arg form)
  match<Rt extends Route.Any, B>(
    route: Rt,
    handler: B
  ): Matcher<A | B, E, R | Scope.Scope>

  // Overload 5: match(route, guard, handler) - guard with function handler (must be before value)
  match<
    Rt extends Route.Any,
    G extends GuardInput<Route.Type<Rt>, any, any, any>,
    B,
    E2 = never,
    R2 = never
  >(
    route: Rt,
    guard: G,
    handler: (params: RefSubject.RefSubject<GuardOutput<G>>) => MatchHandlerReturnValue<B, E2, R2>
  ): Matcher<A | B, E | E2 | GuardError<G>, R | R2 | GuardServices<G> | Scope.Scope>

  // Overload 6: match(route, guard, effectLike) - guard with Fx/Effect/Stream handler
  match<
    Rt extends Route.Any,
    G extends GuardInput<Route.Type<Rt>, any, any, any>,
    B,
    E2 = never,
    R2 = never
  >(
    route: Rt,
    guard: G,
    handler: Fx.Fx<B, E2, R2> | Effect.Effect<B, E2, R2> | Stream.Stream<B, E2, R2>
  ): Matcher<A | B, E | E2 | GuardError<G>, R | R2 | GuardServices<G> | Scope.Scope>

  // Overload 7: match(route, guard, options) - route with guard and options object
  match<
    Rt extends Route.Any,
    G extends GuardInput<Route.Type<Rt>, any, any, any>,
    B,
    E2 = never,
    R2 = never,
    D extends ReadonlyArray<AnyDependency> | undefined = undefined,
    LB = B,
    LE2 = never,
    LR2 = never,
    C extends CatchHandler<any, any, any, any> | undefined = undefined
  >(
    route: Rt,
    guard: G,
    options: MatchHandlerOptions<GuardOutput<G>, B, E2, R2, D, LB, LE2, LR2, C>
  ): Matcher<
    | A
    | ComputeMatchResult<GuardOutput<G>, B, E2, R2, D, LB, LE2, LR2, C, GuardError<G>, GuardServices<G>>["a"],
    | E
    | ComputeMatchResult<GuardOutput<G>, B, E2, R2, D, LB, LE2, LR2, C, GuardError<G>, GuardServices<G>>["e"],
    | R
    | ComputeMatchResult<GuardOutput<G>, B, E2, R2, D, LB, LE2, LR2, C, GuardError<G>, GuardServices<G>>["r"]
    | Scope.Scope
  >

  // Overload 8: match(route, guard, value) - guard with value handler (last for 3-arg form)
  match<
    Rt extends Route.Any,
    G extends GuardInput<Route.Type<Rt>, any, any, any>,
    B
  >(
    route: Rt,
    guard: G,
    handler: B
  ): Matcher<A | B, E | GuardError<G>, R | GuardServices<G> | Scope.Scope>

  // Overload 9: match(fullOptions) - full options object including route
  match<
    Rt extends Route.Any,
    B,
    E2 = never,
    R2 = never,
    D extends ReadonlyArray<AnyDependency> | undefined = undefined,
    LB = B,
    LE2 = never,
    LR2 = never,
    C extends CatchHandler<any, any, any, any> | undefined = undefined
  >(
    options: MatchOptions<Rt, B, E2, R2, D, LB, LE2, LR2, C>
  ): Matcher<
    | A
    | ComputeMatchResult<Route.Type<Rt>, B, E2, R2, D, LB, LE2, LR2, C, never, never>["a"],
    | E
    | ComputeMatchResult<Route.Type<Rt>, B, E2, R2, D, LB, LE2, LR2, C, never, never>["e"],
    | R
    | ComputeMatchResult<Route.Type<Rt>, B, E2, R2, D, LB, LE2, LR2, C, never, never>["r"]
    | Scope.Scope
  >

  readonly prefix: <Rt extends Route.Any>(route: Rt) => Matcher<A, E, R>

  readonly provide: <Layers extends readonly [AnyLayer, ...AnyLayer[]]>(
    ...layers: Layers
  ) => Matcher<
    A,
    E | LayerError<Layers[number]>,
    Exclude<R, LayerSuccess<Layers[number]>> | LayerServices<Layers[number]>
  >

  readonly provideService: <Id, S>(
    tag: ServiceMap.Service<Id, S>,
    service: S
  ) => Matcher<A, E, Exclude<R, Id>>

  readonly provideServices: <R2>(
    services: ServiceMap.ServiceMap<R2>
  ) => Matcher<A, E, Exclude<R, R2>>

  readonly catchCause: <B, E2, R2>(
    f: CatchHandler<E, B, E2, R2>
  ) => Matcher<A | B, E2, R | R2>

  readonly catch: <B, E2, R2>(
    f: (e: E) => Fx.Fx<B, E2, R2>
  ) => Matcher<A | B, E2, R | R2>

  readonly catchTag: <const K extends Tags<E> | Arr.NonEmptyReadonlyArray<Tags<E>>, B, E2, R2>(
    tag: K,
    f: (e: ExtractTag<NoInfer<E>, K extends Arr.NonEmptyReadonlyArray<string> ? K[number] : K>) => Fx.Fx<B, E2, R2>
  ) => Matcher<A | B, E2 | ExcludeTag<E, K extends Arr.NonEmptyReadonlyArray<string> ? K[number] : K>, R | R2>

  readonly layout: <B, E2, R2>(
    layout: Layout<any, A, E, R, B, E2, R2>
  ) => Matcher<B, E | E2, R | R2>
}

export type MatchHandler<Params, A, E, R> =
  | Fx.Fx<A, E, R>
  | Stream.Stream<A, E, R>
  | Effect.Effect<A, E, R>
  | A
  | ((
    params: RefSubject.RefSubject<Params>
  ) => Fx.Fx<A, E, R> | Stream.Stream<A, E, R> | Effect.Effect<A, E, R> | A)

type MatchHandlerFn<Params, A, E, R> = (
  params: RefSubject.RefSubject<Params>
) => Fx.Fx<A, E, R> | Stream.Stream<A, E, R> | Effect.Effect<A, E, R> | A

function isMatchHandlerFn<Params, A, E, R>(
  handler: MatchHandler<Params, A, E, R>
): handler is MatchHandlerFn<Params, A, E, R> {
  return typeof handler === "function"
}

function isHandlerOptions(value: unknown): value is { readonly handler: unknown } {
  return typeof value === "object" && value !== null && "handler" in value
}

// Monomorphic shape - all properties always present for V8 optimization
type ParsedMatch = {
  readonly route: Route.Any
  readonly handler: unknown
  readonly guard: AnyGuard | undefined
  readonly layout: AnyLayout | undefined
  readonly catchFn: AnyCatch | undefined
  readonly dependencies: ReadonlyArray<AnyDependency> | undefined
}

function parseMatchArgs(args: [unknown, ...Array<unknown>]): ParsedMatch {
  const [first, second, third] = args

  // Single arg: full options object (Overload 9)
  if (second === undefined) {
    const opts = first as MatchOptions<Route.Any, any, any, any, any, any, any, any, any>
    return {
      route: opts.route,
      handler: opts.handler,
      guard: undefined,
      layout: opts.layout as AnyLayout | undefined,
      catchFn: opts.catch as AnyCatch | undefined,
      dependencies: opts.dependencies as ReadonlyArray<AnyDependency> | undefined
    }
  }

  // Two args
  if (third === undefined) {
    if (isHandlerOptions(second)) {
      // Overload 3: match(route, options)
      const opts = second as MatchHandlerOptions<any, any, any, any, any, any, any, any, any>
      return {
        route: first as Route.Any,
        handler: opts.handler,
        guard: undefined,
        layout: opts.layout as AnyLayout | undefined,
        catchFn: opts.catch as AnyCatch | undefined,
        dependencies: opts.dependencies as ReadonlyArray<AnyDependency> | undefined
      }
    }
    // Overloads 1, 2, 4: match(route, handler)
    return {
      route: first as Route.Any,
      handler: second,
      guard: undefined,
      layout: undefined,
      catchFn: undefined,
      dependencies: undefined
    }
  }

  // Three args
  if (isHandlerOptions(third)) {
    // Overload 7: match(route, guard, options)
    const opts = third as MatchHandlerOptions<any, any, any, any, any, any, any, any, any>
    return {
      route: first as Route.Any,
      handler: opts.handler,
      guard: second as AnyGuard,
      layout: opts.layout as AnyLayout | undefined,
      catchFn: opts.catch as AnyCatch | undefined,
      dependencies: opts.dependencies as ReadonlyArray<AnyDependency> | undefined
    }
  }

  // Overloads 5, 6, 8: match(route, guard, handler)
  return {
    route: first as Route.Any,
    handler: third,
    guard: second as AnyGuard,
    layout: undefined,
    catchFn: undefined,
    dependencies: undefined
  }
}

class MatcherImpl<A, E, R> implements Matcher<A, E, R> {
  readonly cases: ReadonlyArray<MatchAst>
  constructor(cases: ReadonlyArray<MatchAst>) {
    this.cases = cases
  }

  // Implementation overloads for type inference - use simplified return types
  match<Rt extends Route.Any, B, E2 = never, R2 = never>(
    route: Rt,
    handler: (params: RefSubject.RefSubject<Route.Type<Rt>>) => MatchHandlerReturnValue<B, E2, R2>
  ): Matcher<A | B, E | E2, R | R2 | Scope.Scope>
  match<Rt extends Route.Any, B, E2 = never, R2 = never>(
    route: Rt,
    handler: Fx.Fx<B, E2, R2> | Effect.Effect<B, E2, R2> | Stream.Stream<B, E2, R2>
  ): Matcher<A | B, E | E2, R | R2 | Scope.Scope>
  match<
    Rt extends Route.Any,
    B,
    E2 = never,
    R2 = never,
    D extends ReadonlyArray<AnyDependency> | undefined = undefined
  >(
    route: Rt,
    options: MatchHandlerOptions<Route.Type<Rt>, B, E2, R2, D, B, never, never, undefined>
  ): Matcher<A | B, E | E2 | DependencyError<D extends ReadonlyArray<infer Dep> ? Dep : never>, R | R2 | Scope.Scope>
  match<Rt extends Route.Any, B>(route: Rt, handler: B): Matcher<A | B, E, R | Scope.Scope>
  match<Rt extends Route.Any, G extends GuardInput<Route.Type<Rt>, any, any, any>, B, E2, R2>(
    route: Rt,
    guard: G,
    handler: (params: RefSubject.RefSubject<GuardOutput<G>>) => MatchHandlerReturnValue<B, E2, R2>
  ): Matcher<A | B, E | E2 | GuardError<G>, R | R2 | GuardServices<G> | Scope.Scope>
  match<Rt extends Route.Any, G extends GuardInput<Route.Type<Rt>, any, any, any>, B, E2, R2>(
    route: Rt,
    guard: G,
    handler: Fx.Fx<B, E2, R2> | Effect.Effect<B, E2, R2> | Stream.Stream<B, E2, R2>
  ): Matcher<A | B, E | E2 | GuardError<G>, R | R2 | GuardServices<G> | Scope.Scope>
  match<
    Rt extends Route.Any,
    G extends GuardInput<Route.Type<Rt>, any, any, any>,
    B,
    E2 = never,
    R2 = never,
    D extends ReadonlyArray<AnyDependency> | undefined = undefined
  >(
    route: Rt,
    guard: G,
    options: MatchHandlerOptions<GuardOutput<G>, B, E2, R2, D, B, never, never, undefined>
  ): Matcher<
    A | B,
    E | E2 | GuardError<G> | DependencyError<D extends ReadonlyArray<infer Dep> ? Dep : never>,
    R | R2 | GuardServices<G> | Scope.Scope
  >
  match<Rt extends Route.Any, G extends GuardInput<Route.Type<Rt>, any, any, any>, B>(
    route: Rt,
    guard: G,
    handler: B
  ): Matcher<A | B, E | GuardError<G>, R | GuardServices<G> | Scope.Scope>
  match<
    Rt extends Route.Any,
    B,
    E2 = never,
    R2 = never,
    D extends ReadonlyArray<AnyDependency> | undefined = undefined
  >(
    options: MatchOptions<Rt, B, E2, R2, D, B, never, never, undefined>
  ): Matcher<A | B, E | E2 | DependencyError<D extends ReadonlyArray<infer Dep> ? Dep : never>, R | R2 | Scope.Scope>
  match(...args: [unknown, ...Array<unknown>]): Matcher<any, any, any> {
    const parsed = parseMatchArgs(args)
    const normalizedGuard = parsed.guard !== undefined
      ? getGuard(parsed.guard as GuardInput<any, any, any, any>)
      : defaultGuard()

    const routeAst = AST.route(
      parsed.route.ast,
      parsed.handler as MatchHandler<any, any, any, any>,
      normalizedGuard
    )

    let matches: ReadonlyArray<MatchAst> = [routeAst]
    if (parsed.layout !== undefined) {
      matches = [AST.layout(matches, parsed.layout)]
    }
    if (parsed.catchFn !== undefined) {
      matches = [AST.catchCause(matches, parsed.catchFn)]
    }
    if (parsed.dependencies !== undefined && parsed.dependencies.length > 0) {
      matches = [AST.layer(matches, normalizeDependencies(parsed.dependencies))]
    }

    return new MatcherImpl([...this.cases, ...matches])
  }

  prefix<Rt extends Route.Any>(route: Rt): Matcher<A, E, R> {
    return new MatcherImpl<A, E, R>([AST.prefixed(this.cases, route.ast)])
  }

  provide<Layers extends readonly [AnyLayer, ...AnyLayer[]]>(
    ...layers: Layers
  ): Matcher<
    A,
    E | LayerError<Layers[number]>,
    Exclude<R, LayerSuccess<Layers[number]>> | LayerServices<Layers[number]>
  > {
    return new MatcherImpl([AST.layer(this.cases, layers)]) as Matcher<
      A,
      E | LayerError<Layers[number]>,
      Exclude<R, LayerSuccess<Layers[number]>> | LayerServices<Layers[number]>
    >
  }

  provideService<Id, S>(
    tag: ServiceMap.Service<Id, S>,
    service: S
  ): Matcher<A, E, Exclude<R, Id>> {
    return this.provideServices(ServiceMap.make(tag, service))
  }

  provideServices<R2>(services: ServiceMap.ServiceMap<R2>): Matcher<A, E, Exclude<R, R2>> {
    return this.provide(Layer.succeedServices(services))
  }

  catchCause<B, E2, R2>(
    f: CatchHandler<E, B, E2, R2>
  ): Matcher<A | B, E2, R | R2> {
    return new MatcherImpl<A | B, E2, R | R2>([AST.catchCause(this.cases, f as AnyCatch)])
  }

  catch<B, E2, R2>(f: (e: E) => Fx.Fx<B, E2, R2>): Matcher<A | B, E2, R | R2> {
    return this.catchCause((causeRef) =>
      unwrap(Effect.gen(function* () {
        const cause = yield* causeRef
        const filtered = Cause.filterFail(cause)
        if (isFail(filtered)) {
          return fromEffect(Effect.failCause(filtered.fail))
        }
        return f(filtered.error)
      }))
    )
  }

  catchTag<const K extends Tags<E> | Arr.NonEmptyReadonlyArray<Tags<E>>, B, E2, R2>(
    tag: K,
    f: (e: ExtractTag<NoInfer<E>, K extends Arr.NonEmptyReadonlyArray<string> ? K[number] : K>) => Fx.Fx<B, E2, R2>
  ): Matcher<A | B, E2 | ExcludeTag<E, K extends Arr.NonEmptyReadonlyArray<string> ? K[number] : K>, R | R2> {
    const rethrow = (cause: Cause.Cause<E>) =>
      fromEffect(Effect.failCause(cause)) as Fx.Fx<
        B,
        E2 | ExcludeTag<E, K extends Arr.NonEmptyReadonlyArray<string> ? K[number] : K>,
        R2
      >

    return new MatcherImpl<
      A | B,
      E2 | ExcludeTag<E, K extends Arr.NonEmptyReadonlyArray<string> ? K[number] : K>,
      R | R2
    >([
      AST.catchCause(this.cases, (causeRef) =>
        unwrap(Effect.gen(function* () {
          const cause = yield* causeRef
          const filtered = Cause.filterFail(cause)
          if (isFail(filtered)) {
            return rethrow(cause)
          }
          if (matchesTag(tag, filtered.error)) {
            return f(filtered.error)
          }
          return rethrow(cause)
        })))
    ])
  }

  layout<B, E2, R2>(
    layout: Layout<any, A, E, R, B, E2, R2>
  ): Matcher<B, E | E2, R | R2> {
    return new MatcherImpl<B, E | E2, R | R2>([AST.layout(this.cases, layout as AnyLayout)]) as Matcher<
      B,
      E | E2,
      R | R2
    >
  }

  pipe() {
    return pipeArguments(this, arguments)
  }
}

function normalizeHandler<Params, B, E2 = never, R2 = never>(
  handler: MatchHandler<Params, B, E2, R2>
): (params: RefSubject.RefSubject<Params>) => Fx.Fx<B, E2, R2> {
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

export class RouteGuardError extends Schema.ErrorClass<RouteGuardError>("@typed/router/RouteGuardError")({
  _tag: Schema.tag("RouteGuardError"),
  path: Schema.String,
  causes: Schema.Array(Schema.Unknown)
}) { }

export class RouteNotFound extends Schema.ErrorClass<RouteNotFound>("@typed/router/RouteNotFound")({
  _tag: Schema.tag("RouteNotFound"),
  path: Schema.String
}) { }

export class RouteDecodeError extends Schema.ErrorClass<RouteDecodeError>("@typed/router/RouteDecodeError")({
  _tag: Schema.tag("RouteDecodeError"),
  path: Schema.String,
  cause: Schema.String
}) { }

type CompiledEntry = {
  readonly route: Route.Any
  readonly guard: AnyGuard
  readonly handler: AnyMatchHandler
  readonly layers: ReadonlyArray<AnyLayer>
  readonly layouts: ReadonlyArray<AnyLayout>
  readonly catches: ReadonlyArray<AnyCatch>
  readonly decode: (input: unknown) => Effect.Effect<any, Schema.SchemaError, any>
}

export function run<A, E, R>(
  matcher: Matcher<A, E, R>
): Fx.Fx<A, E | RouteNotFound | RouteDecodeError | RouteGuardError, R | Navigation | CurrentRoute | Scope.Scope> {
  return unwrap(Effect.gen(function* () {
    const fiberId = yield* Effect.fiberId
    const rootScope = yield* Effect.scope
    const current = yield* CurrentRoute
    const prefixed = matcher.prefix(current.route)
    const entries = compile(prefixed.cases)
    const router = findMyWay.make<ReadonlyArray<CompiledEntry>>({ ignoreTrailingSlash: true, caseSensitive: false })
    const handlersByPath = new Map<string, Array<CompiledEntry>>()
    const memoMap = yield* Layer.makeMemoMap
    const layerManager = makeLayerManager(memoMap, rootScope, fiberId)
    const layoutManager = makeLayoutManager(rootScope, fiberId)
    const catchManager = makeCatchManager(rootScope, fiberId)

    for (const entry of entries) {
      const path = entry.route.path
      const existing = handlersByPath.get(path)
      if (existing !== undefined) {
        existing.push(entry)
      } else {
        const list: Array<CompiledEntry> = [entry]
        handlersByPath.set(path, list)
        router.all(path, list)
      }
    }

    let currentState: {
      entry: CompiledEntry
      params: RefSubject.RefSubject<any>
      fx: Fx.Fx<A, E, R | Scope.Scope | Navigation | CurrentRoute>
      scope: Scope.Closeable
    } | null = null

    return CurrentPath.pipe(
      mapEffect(Effect.fn(function* (path) {
        const result = router.find("GET", path)
        if (result === undefined) return yield* new RouteNotFound({ path })

        const input = { ...result.params, ...result.searchParams }
        const entries = result.handler
        const guardCauses: Array<Cause.Cause<any>> = []
        let matchedEntry: CompiledEntry | undefined = undefined
        let matchedParams: any = undefined
        let matchedPrepared:
          | { services: AnyServiceMap; commit: Effect.Effect<void>; rollback: Effect.Effect<void> }
          | undefined = undefined

        for (const entry of entries) {
          const params = yield* Effect.mapErrorEager(
            entry.decode(input),
            (cause) => new RouteDecodeError({ path, cause: defaultFormatter(cause.issue) })
          )

          const prepared = yield* layerManager.prepare(entry.layers)
          const guardExit = yield* entry.guard(params).pipe(
            Effect.provideServices(prepared.services),
            Effect.exit
          )

          if (Exit.isFailure(guardExit)) {
            guardCauses.push(guardExit.cause)
            yield* prepared.rollback
            continue
          }

          if (Option.isNone(guardExit.value)) {
            yield* prepared.rollback
            continue
          }

          matchedEntry = entry
          matchedParams = guardExit.value.value
          matchedPrepared = prepared
          break
        }

        if (matchedEntry === undefined || matchedPrepared === undefined) {
          return yield* new RouteGuardError({ path, causes: guardCauses })
        }

        yield* matchedPrepared.commit

        if (currentState !== null && currentState.entry === matchedEntry) {
          yield* RefSubject.set(currentState.params, matchedParams)
          yield* layoutManager.updateParams(matchedEntry.layouts, matchedParams)
          return currentState.fx
        }

        if (currentState !== null) {
          yield* Scope.close(currentState.scope, interrupt(fiberId))
          currentState = null
        }

        const scope = yield* Scope.fork(rootScope)
        const paramsRef = yield* RefSubject.make(matchedParams).pipe(
          Scope.provide(scope)
        )

        const preparedServices = matchedPrepared.services as ServiceMap.ServiceMap<any>
        const handlerServices = ServiceMap.merge(
          preparedServices,
          ServiceMap.make(Scope.Scope, scope)
        )

        const handlerFx = matchedEntry.handler(paramsRef).pipe(
          provideServices(handlerServices)
        )
        const withLayouts = yield* layoutManager.apply(matchedEntry.layouts, matchedParams, handlerFx, preparedServices)
        const withCatches = yield* catchManager.apply(matchedEntry.catches, withLayouts, preparedServices)
        const fx = withCatches

        currentState = {
          entry: matchedEntry,
          params: paramsRef,
          scope,
          fx
        }

        return currentState.fx
      })),
      skipRepeats,
      switchMap(identity)
    )
  }))
}

export const catchCause: {
  <E, B, E2, R2>(
    f: (
      cause: RefSubject.RefSubject<Cause.Cause<E | RouteNotFound | RouteDecodeError | RouteGuardError>>
    ) => Fx.Fx<B, E2, R2>
  ): <A, R>(
    input: Fx.Fx<A, E, R> | Matcher<A, E, R>
  ) => Fx.Fx<A | B, E2, R | R2 | Navigation | CurrentRoute | Scope.Scope>

  <A, E, R, B, E2, R2>(
    input: Fx.Fx<A, E, R> | Matcher<A, E, R>,
    f: (
      cause: RefSubject.RefSubject<Cause.Cause<E | RouteNotFound | RouteDecodeError | RouteGuardError>>
    ) => Fx.Fx<B, E2, R2>
  ): Fx.Fx<A | B, E2, R | R2 | Navigation | CurrentRoute | Scope.Scope>
} = dual(2, <A, E, R, B, E2, R2>(
  input: Fx.Fx<A, E, R> | Matcher<A, E, R>,
  f: (
    cause: RefSubject.RefSubject<Cause.Cause<E | RouteNotFound | RouteDecodeError | RouteGuardError>>
  ) => Fx.Fx<B, E2, R2>
): Fx.Fx<A | B, E2, R | R2 | Navigation | CurrentRoute | Scope.Scope> =>
  unwrap(Effect.gen(function* () {
    const fiberId = yield* Effect.fiberId
    const rootScope = yield* Effect.scope
    const fx = isFx(input) ? input : run(input)
    const manager = makeCatchManager(rootScope, fiberId)
    return yield* manager.apply([f], fx, ServiceMap.empty() as ServiceMap.ServiceMap<any>)
  })))

export const catch_: {
  <E, B, E2, R2>(
    f: (e: E) => Fx.Fx<B, E2, R2>
  ): <A, R>(
    input: Fx.Fx<A, E, R> | Matcher<A, E, R>
  ) => Fx.Fx<A | B, E2, R | R2 | Navigation | CurrentRoute | Scope.Scope>

  <A, E, R, B, E2, R2>(
    input: Fx.Fx<A, E, R> | Matcher<A, E, R>,
    f: (e: E) => Fx.Fx<B, E2, R2>
  ): Fx.Fx<A | B, E2, R | R2 | Navigation | CurrentRoute | Scope.Scope>
} = dual(2, <A, E, R, B, E2, R2>(
  input: Fx.Fx<A, E, R> | Matcher<A, E, R>,
  f: (e: E) => Fx.Fx<B, E2, R2>
): Fx.Fx<A | B, E2, R | R2 | Navigation | CurrentRoute | Scope.Scope> =>
  catchCause(input, (causeRef) =>
    unwrap(Effect.gen(function* () {
      const cause = yield* causeRef
      const filtered = Cause.filterFail(cause)
      if (isFail(filtered)) {
        return fromEffect(Effect.failCause(filtered.fail))
      }
      return f(filtered.error as E)
    }))))

export { catch_ as catch }

export const catchTag: {
  <const K extends Tags<E> | Arr.NonEmptyReadonlyArray<Tags<E>>, E, B, E2, R2>(
    k: K,
    f: (
      e: ExtractTag<NoInfer<E>, K extends Arr.NonEmptyReadonlyArray<string> ? K[number] : K>
    ) => Fx.Fx<B, E2, R2>
  ): <A, R>(
    input: Fx.Fx<A, E, R> | Matcher<A, E, R>
  ) => Fx.Fx<
    A | B,
    E2 | ExcludeTag<E, K extends Arr.NonEmptyReadonlyArray<string> ? K[number] : K>,
    R | R2 | Navigation | CurrentRoute | Scope.Scope
  >

  <A, E, R, const K extends Tags<E> | Arr.NonEmptyReadonlyArray<Tags<E>>, B, E2, R2>(
    input: Fx.Fx<A, E, R> | Matcher<A, E, R>,
    k: K,
    f: (
      e: ExtractTag<E, K extends Arr.NonEmptyReadonlyArray<string> ? K[number] : K>
    ) => Fx.Fx<B, E2, R2>
  ): Fx.Fx<
    A | B,
    E2 | ExcludeTag<E, K extends Arr.NonEmptyReadonlyArray<string> ? K[number] : K>,
    R | R2 | Navigation | CurrentRoute | Scope.Scope
  >
} = dual(3, <A, E, R, const K extends Tags<E> | Arr.NonEmptyReadonlyArray<Tags<E>>, B, E2, R2>(
  input: Fx.Fx<A, E, R> | Matcher<A, E, R>,
  k: K,
  f: (
    e: ExtractTag<E, K extends Arr.NonEmptyReadonlyArray<string> ? K[number] : K>
  ) => Fx.Fx<B, E2, R2>
): Fx.Fx<
  A | B,
  E2 | ExcludeTag<E, K extends Arr.NonEmptyReadonlyArray<string> ? K[number] : K>,
  R | R2 | Navigation | CurrentRoute | Scope.Scope
> =>
  catchCause(input, (causeRef) =>
    unwrap(Effect.gen(function* () {
      const cause = yield* causeRef
      const filtered = Cause.filterFail(cause)
      if (isFail(filtered)) {
        return fromEffect(Effect.failCause(filtered.fail))
      }
      if (matchesTag(k, filtered.error)) {
        return f(filtered.error as ExtractTag<E, K extends Arr.NonEmptyReadonlyArray<string> ? K[number] : K>)
      }
      return fromEffect(Effect.fail(filtered.error as E2))
    }))))

const hasTag = (u: unknown): u is { readonly _tag: string } =>
  typeof u === "object" && u !== null && "_tag" in u && typeof (u as Record<string, unknown>)["_tag"] === "string"

const matchesTag = <E, K extends string>(
  tag: K | Arr.NonEmptyReadonlyArray<K>,
  error: E
): error is ExtractTag<E, K> => {
  if (!hasTag(error)) return false
  if (typeof tag === "string") return error._tag === tag
  return tag.some((t) => t === error._tag)
}

function normalizeDependencies(dependencies: ReadonlyArray<AnyDependency>): ReadonlyArray<AnyLayer> {
  return dependencies.map((dep) =>
    Layer.isLayer(dep) ? dep : Layer.succeedServices(dep as ServiceMap.ServiceMap<any>) as AnyLayer
  )
}

function getGuard<I, O, E, R>(guard: GuardInput<I, O, E, R>): GuardType<I, O, E, R> {
  return "asGuard" in guard ? guard.asGuard() : guard
}

function defaultGuard<A>(): GuardType<A, A> {
  return Effect.succeedSome
}

function mergeLayers(layers: ReadonlyArray<AnyLayer>): AnyLayer {
  if (layers.length === 1) return layers[0]
  let current = layers[0]
  for (let i = 1; i < layers.length; i++) {
    current = Layer.merge(current, layers[i])
  }
  return current
}

function compile(cases: ReadonlyArray<MatchAst>): ReadonlyArray<CompiledEntry> {
  const entries: Array<CompiledEntry> = []

  const visit = (
    matches: ReadonlyArray<MatchAst>,
    context: {
      readonly layers: ReadonlyArray<AnyLayer>
      readonly layouts: ReadonlyArray<AnyLayout>
      readonly catches: ReadonlyArray<AnyCatch>
      readonly prefixes: ReadonlyArray<RouteAst>
    }
  ): void => {
    for (const match of matches) {
      switch (match.type) {
        case "route": {
          const baseRoute = makeRoute(match.route)
          const prefixedRoute = applyPrefixes(baseRoute, context.prefixes)
          entries.push({
            route: prefixedRoute,
            guard: getGuard(match.guard as GuardInput<any, any, any, any>),
            handler: normalizeHandler(match.handler),
            layers: context.layers,
            layouts: context.layouts,
            catches: context.catches,
            decode: Schema.decodeUnknownEffect(prefixedRoute.paramsSchema)
          })
          break
        }
        case "layer": {
          const merged = mergeLayers(match.deps)
          visit(match.matches, {
            ...context,
            layers: [...context.layers, merged]
          })
          break
        }
        case "layout": {
          visit(match.matches, {
            ...context,
            layouts: [...context.layouts, match.layout as AnyLayout]
          })
          break
        }
        case "prefixed": {
          visit(match.matches, {
            ...context,
            prefixes: [...context.prefixes, match.prefix]
          })
          break
        }
        case "catch": {
          visit(match.matches, {
            ...context,
            catches: [...context.catches, match.f as AnyCatch]
          })
          break
        }
      }
    }
  }

  visit(cases, { layers: [], layouts: [], catches: [], prefixes: [] })
  return entries
}

function applyPrefixes(route: Route.Any, prefixes: ReadonlyArray<RouteAst>): Route.Any {
  if (prefixes.length === 0) return route
  const prefixRoutes = prefixes.map((prefix) => makeRoute(prefix))
  return join(...prefixRoutes, route)
}

// Parallel scope cleanup helper
const closeScopes = (
  scopes: Iterable<Scope.Closeable>,
  fiberId: number
) =>
  Effect.forEach(
    scopes,
    (scope) => Scope.close(scope, interrupt(fiberId)),
    { concurrency: "unbounded", discard: true }
  )

function makeLayerManager(
  memoMap: Layer.MemoMap,
  rootScope: Scope.Scope,
  fiberId: number
) {
  const states = new Map<AnyLayer, { scope: Scope.Closeable; services: AnyServiceMap }>()
  let order: ReadonlyArray<AnyLayer> = []
  let cachedDesiredSet: Set<AnyLayer> | undefined = undefined
  let cachedOrder: ReadonlyArray<AnyLayer> | undefined = undefined

  const prepare = (desired: ReadonlyArray<AnyLayer>) =>
    Effect.gen(function* () {
      const desiredSet = cachedOrder === desired
        ? cachedDesiredSet!
        : (cachedDesiredSet = new Set(desired), cachedOrder = desired, cachedDesiredSet)
      const removed = order.filter((layer) => !desiredSet.has(layer))
      const added: Array<AnyLayer> = []
      let services = ServiceMap.empty()

      for (const layer of desired) {
        const existing = states.get(layer)
        if (existing) {
          services = ServiceMap.merge(services, existing.services)
          continue
        }

        const scope = yield* Scope.fork(rootScope)
        const buildExit = yield* Layer.buildWithMemoMap(layer, memoMap, scope).pipe(
          Effect.provideServices(services),
          Effect.exit
        )

        if (Exit.isFailure(buildExit)) {
          for (let i = added.length - 1; i >= 0; i--) {
            const addedLayer = added[i]
            const addedState = states.get(addedLayer)
            if (addedState) {
              states.delete(addedLayer)
              yield* Scope.close(addedState.scope, interrupt(fiberId))
            }
          }
          yield* Scope.close(scope, buildExit)
          return yield* Effect.failCause(buildExit.cause)
        }

        const servicesForLayer = buildExit.value
        services = ServiceMap.merge(services, servicesForLayer)
        states.set(layer, { scope, services: servicesForLayer })
        added.push(layer)
      }

      const commit = Effect.gen(function* () {
        for (let i = removed.length - 1; i >= 0; i--) {
          const layer = removed[i]
          const state = states.get(layer)
          if (state) {
            states.delete(layer)
            yield* Scope.close(state.scope, interrupt(fiberId))
          }
        }
        order = desired
      })

      const rollback = Effect.gen(function* () {
        for (let i = added.length - 1; i >= 0; i--) {
          const layer = added[i]
          const state = states.get(layer)
          if (state) {
            states.delete(layer)
            yield* Scope.close(state.scope, interrupt(fiberId))
          }
        }
      })

      return { services, commit, rollback }
    })

  return { prepare }
}

function makeLayoutManager(rootScope: Scope.Scope, fiberId: number) {
  const states = new Map<AnyLayout, {
    params: RefSubject.RefSubject<any>
    content: RefSubject.RefSubject<Fx.Fx<any, any, any>>
    fx: Fx.Fx<any, any, any>
    scope: Scope.Closeable
  }>()
  let active: ReadonlyArray<AnyLayout> = []

  const removeUnused = (layouts: ReadonlyArray<AnyLayout>) =>
    Effect.gen(function* () {
      const next = new Set(layouts)
      const removed = active.filter((layout) => !next.has(layout))
      const scopes = removed.map((layout) => {
        const state = states.get(layout)!
        states.delete(layout)
        return state.scope
      })
      yield* closeScopes(scopes, fiberId)
      active = layouts
    })

  const apply = (
    layouts: ReadonlyArray<AnyLayout>,
    paramsValue: any,
    inner: Fx.Fx<any, any, any>,
    services: ServiceMap.ServiceMap<any>
  ) =>
    Effect.gen(function* () {
      let current = inner
      for (let i = layouts.length - 1; i >= 0; i--) {
        const layout = layouts[i]
        const state = states.get(layout)
        if (state === undefined) {
          const scope = yield* Scope.fork(rootScope)
          const params = yield* RefSubject.make(paramsValue).pipe(Scope.provide(scope))
          const content = yield* RefSubject.make<Fx.Fx<any, any, any>>(Effect.succeed(current), {
            eq: (left, right) => left === right
          }).pipe(Scope.provide(scope))
          const fx = layout({ params, content: content.pipe(switchMap(identity)) }).pipe(
            provideServices(ServiceMap.merge(services, ServiceMap.make(Scope.Scope, scope)))
          )
          states.set(layout, { params, content, fx, scope })
          current = fx
        } else {
          yield* RefSubject.set(state.params, paramsValue)
          // @effect-diagnostics-next-line floatingEffect:off
          yield* RefSubject.set(state.content, current)
          current = state.fx
        }
      }
      yield* removeUnused(layouts)
      return current
    })

  const updateParams = (layouts: ReadonlyArray<AnyLayout>, paramsValue: any) =>
    Effect.forEach(
      layouts,
      (layout) => {
        const state = states.get(layout)
        return state !== undefined ? RefSubject.set(state.params, paramsValue) : Effect.void
      },
      { discard: true }
    )

  return { apply, updateParams }
}

function makeCatchManager(rootScope: Scope.Scope, fiberId: number) {
  const states = new Map<AnyCatch, {
    causes: RefSubject.RefSubject<Cause.Cause<any>>
    content: RefSubject.RefSubject<Fx.Fx<any, any, any>>
    fx: Fx.Fx<any, any, any>
    scope: Scope.Closeable
  }>()
  let active: ReadonlyArray<AnyCatch> = []

  const removeUnused = (catches: ReadonlyArray<AnyCatch>) =>
    Effect.gen(function* () {
      const next = new Set(catches)
      const removed = active.filter((c) => !next.has(c))
      const scopes = removed.map((c) => {
        const state = states.get(c)!
        states.delete(c)
        return state.scope
      })
      yield* closeScopes(scopes, fiberId)
      active = catches
    })

  const apply = (
    catches: ReadonlyArray<AnyCatch>,
    inner: Fx.Fx<any, any, any>,
    services: ServiceMap.ServiceMap<any>
  ) =>
    Effect.gen(function* () {
      let current = inner
      for (let i = catches.length - 1; i >= 0; i--) {
        const catcher = catches[i]
        const state = states.get(catcher)
        if (state === undefined) {
          const scope = yield* Scope.fork(rootScope)
          const causes = yield* RefSubject.make<Cause.Cause<any>>(Cause.fail(undefined)).pipe(Scope.provide(scope))
          const content = yield* RefSubject.make<Fx.Fx<any, any, any>>(Effect.succeed(current), {
            eq: (left, right) => left === right
          }).pipe(Scope.provide(scope))
          const fallback = catcher(causes).pipe(
            provideServices(ServiceMap.merge(services, ServiceMap.make(Scope.Scope, scope)))
          )
          const fx = content.pipe(
            switchMap(identity),
            exit,
            mapEffect(Effect.fn(function* (e) {
              if (isSuccess(e)) return succeed(e.value)
              yield* RefSubject.set(causes, e.cause)
              return fallback
            })),
            skipRepeats,
            switchMap(identity)
          )
          states.set(catcher, { causes, content, fx, scope })
          current = fx
        } else {
          // @effect-diagnostics-next-line floatingEffect:off
          yield* RefSubject.set(state.content, current)
          current = state.fx
        }
      }
      yield* removeUnused(catches)
      return current
    })

  return { apply }
}
