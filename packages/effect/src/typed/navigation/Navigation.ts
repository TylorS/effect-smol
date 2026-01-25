import type * as Effect from "../../Effect.ts"
import type * as Option from "../../Option.ts"
import type * as Scope from "../../Scope.ts"
import * as ServiceMap from "../../ServiceMap.ts"
import * as RefSubject from "../fx/RefSubject/RefSubject.ts"
import type {
  BeforeNavigationEvent,
  CancelNavigation,
  Destination,
  NavigationError,
  NavigationEvent,
  RedirectError,
  Transition
} from "./model.ts"

export class Navigation extends ServiceMap.Service<Navigation, {
  readonly origin: string
  readonly base: string
  readonly currentEntry: RefSubject.Computed<Destination>
  readonly entries: RefSubject.Computed<ReadonlyArray<Destination>>
  readonly transition: RefSubject.Filtered<Transition>
  readonly canGoBack: RefSubject.Computed<boolean>
  readonly canGoForward: RefSubject.Computed<boolean>

  readonly navigate: (
    url: string | URL,
    options?: NavigationNavigateOptions
  ) => Effect.Effect<Destination, NavigationError>
  readonly back: (options?: { readonly info?: unknown }) => Effect.Effect<Destination, NavigationError>
  readonly forward: (options?: { readonly info?: unknown }) => Effect.Effect<Destination, NavigationError>
  readonly traverseTo: (
    key: Destination["key"],
    options?: { readonly info?: unknown }
  ) => Effect.Effect<Destination, NavigationError>
  readonly updateCurrentEntry: (
    options: { readonly state: unknown }
  ) => Effect.Effect<Destination, NavigationError>
  readonly reload: (
    options?: { readonly info?: unknown; readonly state?: unknown }
  ) => Effect.Effect<Destination, NavigationError>

  readonly onBeforeNavigation: <R = never, R2 = never>(
    handler: BeforeNavigationHandler<R, R2>
  ) => Effect.Effect<void, never, R | R2 | Scope.Scope>
  readonly onNavigation: <R = never, R2 = never>(
    handler: NavigationHandler<R, R2>
  ) => Effect.Effect<void, never, R | R2 | Scope.Scope>
}>()("@typed/navigation/Navigation") {

  static readonly origin = Navigation.useSync((n) => n.origin)
  static readonly base = Navigation.useSync((n) => n.base)

  static readonly currentEntry = RefSubject.computedFromService(Navigation.useSync((n) => n.currentEntry))
  static readonly entries = RefSubject.computedFromService(Navigation.useSync((n) => n.entries))
  static readonly transition = RefSubject.filteredFromService(Navigation.useSync((n) => n.transition))
  static readonly canGoBack = RefSubject.computedFromService(Navigation.useSync((n) => n.canGoBack))
  static readonly canGoForward = RefSubject.computedFromService(Navigation.useSync((n) => n.canGoForward))

  static readonly navigate = (url: string | URL, options?: NavigationNavigateOptions) =>
    Navigation.use((n) => n.navigate(url, options))
  static readonly back = (options?: { readonly info?: unknown }) => Navigation.use((n) => n.back(options))
  static readonly forward = (options?: { readonly info?: unknown }) => Navigation.use((n) => n.forward(options))
  static readonly traverseTo = (key: Destination["key"], options?: { readonly info?: unknown }) =>
    Navigation.use((n) => n.traverseTo(key, options))
  static readonly updateCurrentEntry = (options: { readonly state: unknown }) =>
    Navigation.use((n) => n.updateCurrentEntry(options))
  static readonly reload = (options?: { readonly info?: unknown; readonly state?: unknown }) =>
    Navigation.use((n) => n.reload(options))

  static readonly onBeforeNavigation = <R = never, R2 = never>(handler: BeforeNavigationHandler<R, R2>) =>
    Navigation.use((n) => n.onBeforeNavigation(handler))
  static readonly onNavigation = <R = never, R2 = never>(handler: NavigationHandler<R, R2>) =>
    Navigation.use((n) => n.onNavigation(handler))
}

export type BeforeNavigationHandler<R, R2> = (
  event: BeforeNavigationEvent
) => Effect.Effect<
  Option.Option<
    Effect.Effect<unknown, RedirectError | CancelNavigation, R2>
  >,
  RedirectError | CancelNavigation,
  R
>

export type NavigationHandler<R, R2> = (
  event: NavigationEvent
) => Effect.Effect<
  Option.Option<
    Effect.Effect<unknown, never, R2>
  >,
  never,
  R
>

export const CurrentPath = RefSubject.computedFromService(Navigation.useSync((n) => n.currentEntry.pipe(
  RefSubject.map((entry) => entry.url.pathname + entry.url.search)
)))
