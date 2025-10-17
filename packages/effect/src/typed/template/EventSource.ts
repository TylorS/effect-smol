import * as Effect from "../../Effect.ts"
import * as Fiber from "../../Fiber.ts"
import * as Scope from "../../Scope.ts"
import type { EventHandler } from "./EventHandler.js"
import { getElements, type PersistentDocumentFragment } from "./PersistentDocumentFragment.ts"

type EventName = string

type Handler<Ev extends Event> = EventHandler<Ev>
type Rendered = Node | Array<Node> | PersistentDocumentFragment

export interface EventSource {
  readonly addEventListener: <Ev extends Event>(
    element: EventTarget,
    event: EventName,
    handler: Handler<Ev>
  ) => Disposable

  readonly setup: (rendered: EventTarget, scope: Scope.Scope) => Effect.Effect<void>
}

type Entry = readonly [Element, Handler<any>]
type Run = <E, A>(effect: Effect.Effect<A, E>) => Fiber.Fiber<A, E>

const disposable = (f: () => void): Disposable => ({
  [Symbol.dispose]: f
})

const dispose = (d: Disposable): void => d[Symbol.dispose]()

export function makeEventSource(): EventSource {
  const listeners = new Map<
    EventName,
    readonly [normal: Set<Entry>, once: Set<Entry>]
  >()

  function addEventListener(
    element: EventTarget,
    event: EventName,
    handler: Handler<any>
  ): Disposable {
    const sets = listeners.get(event)
    const entry: Entry = [element as Element, handler]
    const isOnce = handler.options?.once === true
    const normal: Set<Entry> = sets?.[0] ?? new Set<Entry>()
    const once: Set<Entry> = sets?.[1] ?? new Set<Entry>()
    if (sets === undefined) {
      listeners.set(event, [normal, once])
    }
    if (isOnce) {
      once.add(entry)
      return disposable(() => once.delete(entry))
    } else {
      normal.add(entry)
      return disposable(() => normal.delete(entry))
    }
  }

  function setupListeners(
    element: Element,
    run: Run
  ) {
    const disposables: Array<Disposable> = []

    for (const [event, sets] of listeners) {
      for (const handlers of sets) {
        if (handlers.size === 0) continue
        const listener = (ev: Event) =>
          run(
            Effect.forEach(handlers, ([el, { handler }]) =>
              ev.target === el || el.contains(ev.target as Node)
                ? handler(proxyCurrentTarget(ev, el))
                : Effect.void)
          )
        element.addEventListener(event, listener, getDerivedAddEventListenerOptions(handlers))
        disposables.push(disposable(() => element.removeEventListener(event, listener)))
      }
    }

    return disposables
  }

  function setup(rendered: EventTarget, scope: Scope.Scope) {
    const elements = getElements(rendered as Rendered)

    if (elements.length === 0 || listeners.size === 0) {
      return Effect.void
    }

    const disposables: Array<Disposable> = []
    const fibers = new Map<symbol, Fiber.Fiber<any, any>>()
    const run: Run = <E, A>(effect: Effect.Effect<A, E>) => {
      const id = Symbol()
      const fiber = Effect.runFork(Effect.onExit(effect, () => Effect.sync(() => fibers.delete(id))))
      fibers.set(id, fiber)
      return fiber
    }

    if (listeners.size > 0) {
      for (const element of elements) {
        // eslint-disable-next-line no-restricted-syntax
        disposables.push(...setupListeners(element, run))
      }
    }

    return Scope.addFinalizer(
      scope,
      Effect.suspend(() => {
        disposables.forEach(dispose)
        if (fibers.size === 0) return Effect.void
        return Fiber.interruptAll(fibers.values())
      })
    )
  }

  return {
    addEventListener,
    setup
  }
}

const EVENT_PROPERTY_TO_REPLACE = "currentTarget"

function proxyCurrentTarget<E extends Event>(event: E, currentTarget: Element): E {
  return new Proxy(event, {
    get(target: E, property: string | symbol) {
      return property === EVENT_PROPERTY_TO_REPLACE ? currentTarget : target[property as keyof E]
    }
  })
}

function getDerivedAddEventListenerOptions(entries: Set<Entry>): AddEventListenerOptions {
  const hs = Array.from(entries)
  return {
    once: hs.every((h) => h[1].options?.once === true),
    passive: hs.every((h) => h[1].options?.passive === true)
  }
}
