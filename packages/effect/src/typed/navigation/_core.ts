import * as Effect from "../../Effect.ts"
import * as Option from "../../Option.ts"
import * as Result from "../../Result.ts"
import type * as Scope from "../../Scope.ts"
import type * as ServiceMap from "../../ServiceMap.ts"
import * as RefSubject from "../fx/RefSubject/RefSubject.ts"
import type {
  BeforeNavigationEvent,
  CancelNavigation,
  Destination,
  NavigationError,
  NavigationEvent,
  ProposedDestination,
  RedirectError,
  Transition
} from "./model.ts"
import type { BeforeNavigationHandler, Navigation, NavigationHandler } from "./Navigation.ts"

export type NavigationState = {
  readonly entries: ReadonlyArray<Destination>
  readonly index: number
  readonly transition: Option.Option<Transition>
}

const MAX_DEPTH = 10

export const makeNavigationCore = Effect.fn(function*(
  origin: string,
  base: string,
  state: RefSubject.RefSubject<NavigationState>,
  commit: (before: BeforeNavigationEvent) => Effect.Effect<Destination, NavigationError>
) {
  const entries = RefSubject.map(state, (s) => s.entries)
  const currentEntry = RefSubject.map(state, (s) => s.entries[s.index])
  const transition = RefSubject.filterMap(state, (s) => s.transition)
  const canGoBack = RefSubject.map(state, (s) => s.index > 0)
  const canGoForward = RefSubject.map(state, (s) => s.index < s.entries.length - 1)

  const beforeHandlers = yield* RefSubject.make(
    Effect.sync((): Set<readonly [BeforeNavigationHandler<any, any>, ServiceMap.ServiceMap<any>]> => new Set())
  )
  const handlers = yield* RefSubject.make(
    Effect.sync((): Set<readonly [NavigationHandler<any, any>, ServiceMap.ServiceMap<any>]> => new Set())
  )

  const runBeforeHandlers = (event: BeforeNavigationEvent) =>
    Effect.gen(function*() {
      const handlers = yield* beforeHandlers
      const matches: Array<
        Effect.Effect<unknown, RedirectError | CancelNavigation>
      > = []

      for (const [handler, ctx] of handlers) {
        const exit = yield* handler(event).pipe(
          Effect.provideServices(ctx),
          Effect.result
        )
        if (Result.isSuccess(exit)) {
          const match = exit.success
          if (Option.isSome(match)) {
            matches.push(Effect.provideServices(match.value, ctx))
          }
        } else {
          return Option.some(exit.failure)
        }
      }

      if (matches.length > 0) {
        for (const match of matches) {
          const exit = yield* Effect.result(match)
          if (Result.isFailure(exit)) {
            return Option.some(exit.failure)
          }
        }
      }

      return Option.none<RedirectError | CancelNavigation>()
    })

  const runHandlers = (event: NavigationEvent) =>
    Effect.gen(function*() {
      const eventHandlers = yield* handlers
      const matches: Array<Effect.Effect<unknown>> = []

      for (const [handler, ctx] of eventHandlers) {
        const match = yield* Effect.provide(handler(event), ctx)
        if (Option.isSome(match)) {
          matches.push(Effect.provide(match.value, ctx))
        }
      }

      if (matches.length > 0) {
        yield* Effect.all(matches, { discard: true })
      }
    })

  const runNavigationEvent = Effect.fn(function*(
    before: BeforeNavigationEvent,
    ref: RefSubject.GetSetDelete<NavigationState>,
    depth: number
  ) {
    let current = yield* ref.get
    current = yield* ref.set({
      entries: current.entries,
      index: current.index,
      transition: Option.some(before)
    })
    const beforeError = yield* runBeforeHandlers(before)

    if (Option.isSome(beforeError)) {
      return yield* handleError(beforeError.value, ref, depth)
    }

    const to = yield* commit(before)

    const event: NavigationEvent = {
      type: before.type,
      info: before.info,
      destination: to
    }

    if (before.type === "push") {
      const index = current.index + 1
      const entries = current.entries.slice(0, index).concat([to])
      yield* ref.set({ entries, index, transition: Option.none() })
    } else if (before.type === "replace") {
      const index = current.index
      const before = current.entries.slice(0, index)
      const after = current.entries.slice(index + 1)
      const entries = [...before, to, ...after]

      yield* ref.set({ entries, index, transition: Option.none() })
    } else if (before.type === "traverse") {
      const nextIndex = current.index + before.delta

      yield* ref.set({
        entries: current.entries,
        index: nextIndex,
        transition: Option.none()
      })
    } else if (before.type === "reload") {
      yield* ref.set({ ...current, transition: Option.none() })
    }

    yield* runHandlers(event)

    return to
  })

  const handleError = (
    error: RedirectError | CancelNavigation,
    ref: RefSubject.GetSetDelete<NavigationState>,
    depth: number
  ): Effect.Effect<Destination, NavigationError> =>
    Effect.gen(function*() {
      if (depth >= MAX_DEPTH) {
        return yield* Effect.die(`Redirect loop detected.`)
      }

      const { entries, index } = yield* ref.get
      const from = entries[index]

      if (error._tag === "CancelNavigation") {
        yield* ref.set({ entries, index, transition: Option.none() })
        return from
      } else {
        return yield* runNavigationEvent(makeRedirectEvent(origin, error, from), ref, depth + 1)
      }
    })

  const navigate = (
    pathOrUrl: string | URL,
    options?: NavigationNavigateOptions
  ) =>
    state.updates(Effect.fn(function*(ref) {
      const state = yield* ref.get
      const from = state.entries[state.index]
      const history = options?.history ?? "auto"
      const url = getUrl(origin, pathOrUrl)
      const type = history === "auto"
        ? from.url.origin === url.origin && from.url.pathname === url.pathname
          ? "replace"
          : "push"
        : history
      const event: BeforeNavigationEvent = {
        type,
        from,
        to: {
          key: from.key,
          url,
          state: options?.state,
          sameDocument: url.origin === origin
        },
        delta: type === "replace" ? 0 : 1,
        info: options?.info
      }

      return yield* runNavigationEvent(event, ref, 0)
    }))

  const traverseTo = (
    key: Destination["key"],
    options?: { readonly info?: unknown }
  ) =>
    state.updates(Effect.fn(function*(ref) {
      const state = yield* ref.get
      const { entries, index } = state
      const from = entries[index]
      const nextIndex = entries.findIndex((e) => e.key === key)

      if (nextIndex === -1) return from

      const to = entries[nextIndex]
      const delta = nextIndex - index
      const event: BeforeNavigationEvent = {
        type: "traverse",
        from,
        to,
        delta,
        info: options?.info
      }

      return yield* runNavigationEvent(event, ref, 0)
    }))

  const back = Effect.fn(function*(options?: { readonly info?: unknown }) {
    const { entries, index } = yield* state
    if (index === 0) return entries[index]
    const { key } = entries[index - 1]
    return yield* traverseTo(key, options)
  })

  const forward = Effect.fn(function*(options?: { readonly info?: unknown }) {
    const { entries, index } = yield* state
    if (index === entries.length - 1) return entries[index]
    const { key } = entries[index + 1]
    return yield* traverseTo(key, options)
  })

  const reload = (
    options?: { readonly info?: unknown }
  ) =>
    state.updates(Effect.fn(function*(ref) {
      const { entries, index } = yield* ref.get
      const current = entries[index]

      const event: BeforeNavigationEvent = {
        type: "reload",
        from: current,
        to: current,
        delta: 0,
        info: options?.info
      }

      return yield* runNavigationEvent(event, ref, 0)
    }))

  const onBeforeNavigation = <R = never, R2 = never>(
    handler: BeforeNavigationHandler<R, R2>
  ): Effect.Effect<void, never, R | R2 | Scope.Scope> =>
    Effect.servicesWith((ctx) => {
      const entry = [handler, ctx] as const

      return Effect.flatMap(
        RefSubject.update(
          beforeHandlers,
          (handlers) => new Set([...handlers, entry])
        ),
        () =>
          Effect.addFinalizer(() =>
            RefSubject.update(beforeHandlers, (handlers) => {
              const updated = new Set(handlers)
              updated.delete(entry)
              return updated
            })
          )
      )
    })

  const onNavigation = <R = never, R2 = never>(
    handler: NavigationHandler<R, R2>
  ): Effect.Effect<void, never, R | R2 | Scope.Scope> =>
    Effect.servicesWith((ctx) => {
      const entry = [handler, ctx] as const

      return Effect.flatMap(
        RefSubject.update(handlers, (handlers) => new Set([...handlers, entry])),
        () =>
          Effect.addFinalizer(() =>
            RefSubject.update(handlers, (handlers) => {
              const updated = new Set(handlers)
              updated.delete(entry)
              return updated
            })
          )
      )
    })

  const updateCurrentEntry = (options: { readonly state: unknown }) =>
    state.updates((ref) =>
      Effect.gen(function*() {
        const { entries, index } = yield* ref.get
        const current = entries[index]
        return yield* runNavigationEvent(
          {
            type: "replace",
            from: current,
            to: { ...current, state: options.state },
            delta: 0,
            info: null
          },
          ref,
          0
        )
      })
    )

  return {
    origin,
    base,
    entries,
    currentEntry,
    transition,
    canGoBack,
    canGoForward,
    navigate,
    back,
    forward,
    traverseTo,
    reload,
    onBeforeNavigation,
    onNavigation,
    updateCurrentEntry
  } satisfies Navigation["Service"]
})

function makeRedirectEvent(
  origin: string,
  redirect: RedirectError,
  from: Destination
) {
  const url = getUrl(origin, redirect.url)
  const to: ProposedDestination = { url, state: redirect.options?.state, sameDocument: url.origin === origin }
  const event: BeforeNavigationEvent = {
    type: "replace",
    from,
    to,
    delta: 0,
    info: redirect.options?.info
  }

  return event
}

export const getUrl = (origin: string, urlOrPath: string | URL): URL =>
  typeof urlOrPath === "string" ? new URL(urlOrPath, origin) : urlOrPath
