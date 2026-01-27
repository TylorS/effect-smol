/**
 * @since 1.0.0
 */

import * as Effect from "../../Effect.ts"
import * as Layer from "../../Layer.ts"
import * as Option from "../../Option.ts"
import * as RefSubject from "../fx/RefSubject/RefSubject.ts"
import { getUrl, makeNavigationCore, type NavigationState } from "./_core.ts"
import { type BeforeNavigationEvent, type Destination, NavigationError } from "./model.ts"
import { Navigation } from "./Navigation.ts"

export const fromWindow = (window: Window = globalThis.window) =>
  Layer.effect(Navigation)(
    Effect.gen(function* () {
      const origin = window.location.origin
      const base = getBaseHref(window)
      const state = yield* RefSubject.make(
        Effect.sync((): NavigationState => getNavigationState(window.navigation, origin))
      )

      const zip = Effect.zipWith(awaitNavigation, (destination: Destination, _) => destination)

      return yield* makeNavigationCore(
        origin,
        base,
        state,
        (before: BeforeNavigationEvent) => {
          switch (before.type) {
            case "push":
            case "replace":
              return zip(navigateCommit(window.navigation, before.to.url.href, {
                history: before.type,
                state: before.to.state,
                info: before.info
              }))
            case "reload":
              return zip(reloadCommit(window.navigation, { state: before.to.state, info: before.info }))
            case "traverse":
              return zip(traverseCommit(window.navigation, before.to.key!, { info: before.info }))
          }
        }
      )
    })
  )

function navigateCommit(
  navigation: globalThis.Navigation,
  url: string,
  options?: NavigationNavigateOptions
): Effect.Effect<Destination, NavigationError> {
  return Effect.tryPromise({
    try: () => navigation.navigate(url, options).committed.then((entry) => navigationToDestination(entry, origin)),
    catch: (error) => new NavigationError({ error })
  })
}

function reloadCommit(
  navigation: globalThis.Navigation,
  options?: NavigationReloadOptions
): Effect.Effect<Destination, NavigationError> {
  return Effect.tryPromise({
    try: () => navigation.reload(options).committed.then((entry) => navigationToDestination(entry, origin)),
    catch: (error) => new NavigationError({ error })
  })
}

function traverseCommit(
  navigation: globalThis.Navigation,
  key: string,
  options?: NavigationOptions
): Effect.Effect<Destination, NavigationError> {
  return Effect.tryPromise({
    try: () => navigation.traverseTo(key, options).committed.then((entry) => navigationToDestination(entry, origin)),
    catch: (error) => new NavigationError({ error })
  })
}

function getNavigationState(navigation: globalThis.Navigation, origin: string): NavigationState {
  return {
    entries: navigation.entries().map((entry) => navigationToDestination(entry, origin)),
    index: navigation.currentEntry?.index ?? 0,
    transition: Option.none()
  }
}

function navigationToDestination(entry: NavigationHistoryEntry, origin: string): Destination {
  return {
    id: entry.id,
    key: entry.key,
    url: getUrl(origin, entry.url ?? ""),
    state: entry.getState(),
    sameDocument: entry.sameDocument
  }
}

function getBaseHref(window: Window): string {
  const base = window.document.querySelector("base")
  return base ? base.href : "/"
}

const awaitNavigation = Effect.callback<void>((resume) => {
  const handler = (event: NavigateEvent) => {
    if (event.canIntercept) {
      event.intercept({
        handler: async () => resume(Effect.void),
        focusReset: "after-transition",
        scroll: "after-transition"
      })
    }
  }

  window.navigation.addEventListener("navigate", handler, { once: true })
  return Effect.sync(() => window.navigation.removeEventListener("navigate", handler))
})
