/**
 * @since 1.0.0
 */

import * as RefSubject from "../fx/RefSubject/RefSubject.ts"

import * as Deferred from "../../Deferred.ts"
import * as Effect from "../../Effect.ts"
import * as Option from "../../Option.ts"

import type * as Scope from "../../Scope.ts"
import { type BeforeNavigationEvent, CancelNavigation, type Destination, RedirectError } from "./model.ts"
import { Navigation } from "./Navigation.ts"

/**
 * @since 1.0.0
 */
export interface BlockNavigation extends RefSubject.Filtered<Blocking> {
  readonly isBlocking: RefSubject.Computed<boolean>
}

/**
 * @since 1.0.0
 */
export interface Blocking extends BeforeNavigationEvent {
  readonly cancel: Effect.Effect<Destination>
  readonly confirm: Effect.Effect<Destination>
  readonly redirect: (urlOrPath: string | URL, options?: NavigationNavigateOptions) => Effect.Effect<Destination>
}

type InternalBlockState = Unblocked | Blocked

type Unblocked = {
  readonly _tag: "Unblocked"
}
const Unblocked: Unblocked = { _tag: "Unblocked" }

type Blocked = {
  readonly _tag: "Blocked"
  readonly event: BeforeNavigationEvent
  readonly deferred: Deferred.Deferred<void, RedirectError | CancelNavigation>
}

const Blocked = (event: BeforeNavigationEvent) =>
  Effect.map(
    Deferred.make<void, RedirectError | CancelNavigation>(),
    (deferred): Blocked => ({ _tag: "Blocked", deferred, event })
  )

/**
 * @since 1.0.0
 */
export interface UseBlockNavigationParams<R = never> {
  readonly shouldBlock?: (event: BeforeNavigationEvent) => Effect.Effect<boolean, RedirectError | CancelNavigation, R>
}

/**
 * @since 1.0.0
 */
export const useBlockNavigation = <R = never>(
  params: UseBlockNavigationParams<R> = {}
): Effect.Effect<BlockNavigation, never, Navigation | R | Scope.Scope> =>
  Effect.gen(function*() {
    const navigation = yield* Navigation
    const blockState = yield* RefSubject.make<InternalBlockState>(Unblocked)

    yield* navigation.onBeforeNavigation<R, never>((event) =>
      RefSubject.modifyEffect(blockState, (state) =>
        Effect.gen(function*() {
          // Can't block twice
          if (state._tag === "Blocked") return [Option.none(), state] as const

          if (params.shouldBlock && !(yield* params.shouldBlock(event))) {
            return [Option.none(), state] as const
          }

          const updated = yield* Blocked(event)

          return [
            Option.some(Deferred.await(updated.deferred)),
            updated
          ] as const
        }))
    )

    const blockNavigation: BlockNavigation = Object.assign(
      RefSubject.filterMap(blockState, (s) => {
        return s._tag === "Blocked" ? Option.some(blockedToBlocking(navigation, s)) : Option.none()
      }),
      {
        isBlocking: RefSubject.map(blockState, (s) => s._tag === "Blocked")
      }
    )

    return blockNavigation
  })

function blockedToBlocking(navigation: Navigation["Service"], state: Blocked): Blocking {
  return {
    ...state.event,
    cancel: Effect.flatMap(
      Deferred.fail(state.deferred, new CancelNavigation({})),
      () => navigation.currentEntry.asEffect()
    ),
    confirm: Effect.flatMap(Deferred.succeed(state.deferred, undefined), () => navigation.currentEntry.asEffect()),
    redirect: (url, options) =>
      Effect.flatMap(
        Deferred.fail(state.deferred, new RedirectError({ url, options })),
        () => navigation.currentEntry.asEffect()
      )
  }
}
