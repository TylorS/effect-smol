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

      return yield* makeNavigationCore(
        origin,
        base,
        state,
        (before: BeforeNavigationEvent, runHandlers: (destination: Destination) => Effect.Effect<void>) => {
          switch (before.type) {
            case "push":
            case "replace":
              return navigateCommit(window.navigation, before.to.url.href, {
                history: before.type,
                state: before.to.state,
                info: before.info
              }, runHandlers, origin)
            case "reload":
              return reloadCommit(window.navigation, { state: before.to.state, info: before.info }, runHandlers, origin)
            case "traverse":
              return traverseCommit(window.navigation, before.to.key!, { info: before.info }, runHandlers, origin)
          }
        }
      )
    })
  )

function navigateCommit(
  navigation: globalThis.Navigation,
  url: string,
  options: NavigationNavigateOptions | undefined,
  runHandlers: (destination: Destination) => Effect.Effect<void>,
  origin: string
): Effect.Effect<Destination, NavigationError> {
  return awaitNavigationWithHandlers(
    navigation,
    () => navigation.navigate(url, options),
    runHandlers,
    origin
  )
}

function reloadCommit(
  navigation: globalThis.Navigation,
  options: NavigationReloadOptions | undefined,
  runHandlers: (destination: Destination) => Effect.Effect<void>,
  origin: string
): Effect.Effect<Destination, NavigationError> {
  return awaitNavigationWithHandlers(
    navigation,
    () => navigation.reload(options),
    runHandlers,
    origin
  )
}

function traverseCommit(
  navigation: globalThis.Navigation,
  key: string,
  options: NavigationOptions | undefined,
  runHandlers: (destination: Destination) => Effect.Effect<void>,
  origin: string
): Effect.Effect<Destination, NavigationError> {
  return awaitNavigationWithHandlers(
    navigation,
    () => navigation.traverseTo(key, options),
    runHandlers,
    origin
  )
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

function awaitNavigationWithHandlers(
  navigation: globalThis.Navigation,
  navigateFn: () => NavigationResult,
  runHandlers: (destination: Destination) => Effect.Effect<void>,
  origin: string
): Effect.Effect<Destination, NavigationError> {
  return Effect.callback<Destination, NavigationError>((resume) => {
    let result: NavigationResult | null = null
    let resolved = false

    const resolveOnce = (effect: Effect.Effect<Destination, NavigationError>) => {
      if (!resolved) {
        resolved = true
        resume(effect)
      }
    }

    const handler = (event: NavigateEvent) => {
      if (event.canIntercept && result && !resolved) {
        event.intercept({
          handler: async () => {
            try {
              // Wait for the committed entry to get the destination
              const entry = await result!.committed
              const destination = navigationToDestination(entry, origin)

              // Run handlers inside the intercept handler
              // This ensures everything is rendered before scroll/focus restoration
              await Effect.runPromise(runHandlers(destination))

              resolveOnce(Effect.succeed(destination))
            } catch (error) {
              resolveOnce(Effect.fail(new NavigationError({ error })))
            }
          },
          focusReset: "after-transition",
          scroll: "after-transition"
        })
      }
    }

    navigation.addEventListener("navigate", handler, { once: true })

    // Now call the navigation API (this will trigger the navigate event synchronously)
    result = navigateFn()

    // Fallback: if intercept wasn't called (shouldn't happen for same-document navigations)
    result.finished.then(
      (entry) => {
        const destination = navigationToDestination(entry, origin)
        resolveOnce(Effect.succeed(destination))
      }, (error) => {
        resolveOnce(Effect.fail(new NavigationError({ error })))
      })

    return Effect.sync(() => navigation.removeEventListener("navigate", handler))
  })
}
