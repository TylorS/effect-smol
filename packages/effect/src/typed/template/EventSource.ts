import * as Effect from "../../Effect.ts"
import * as Fiber from "../../Fiber.ts"
import * as Scope from "../../Scope.ts"
import type { EventHandler } from "./EventHandler.ts"
import { getElements, type Rendered } from "./Wire.ts"

type EventName = string

type Handler<Ev extends Event> = EventHandler<Ev>

/**
 * An interface for managing event listeners on DOM nodes.
 *
 * It abstracts the process of adding and removing event listeners, ensuring that they are
 * properly cleaned up when the scope is closed or the element is removed.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import { makeEventSource } from "@typed/template/EventSource"
 * import * as EventHandler from "@typed/template/EventHandler"
 * import { Scope } from "effect"
 *
 * const program = Effect.gen(function* () {
 *   const eventSource = makeEventSource()
 *   const button = document.createElement("button")
 *
 *   // Add event listener
 *   const handler = EventHandler.make((event: MouseEvent) => {
 *     console.log("Button clicked")
 *   })
 *
 *   const disposable = eventSource.addEventListener(button, "click", handler)
 *
 *   // Setup listeners for rendered content
 *   yield* eventSource.setup(button, yield* Scope.make())
 *
 *   // Cleanup
 *   disposable[Symbol.dispose]()
 * })
 * ```
 *
 * @since 1.0.0
 * @category models
 */
export interface EventSource {
  /**
   * Adds an event listener to a target.
   */
  readonly addEventListener: <Ev extends Event>(
    element: EventTarget,
    event: EventName,
    handler: Handler<Ev>
  ) => Disposable

  /**
   * Sets up event listeners for a rendered template within a scope.
   */
  readonly setup: (rendered: Rendered, scope: Scope.Scope) => Effect.Effect<void>
}

type Entry = readonly [Element, Handler<any>]
type Run = <E, A>(effect: Effect.Effect<A, E>) => Fiber.Fiber<A, E>

const disposable = (f: () => void): Disposable => ({ [Symbol.dispose]: f })
const dispose = (d: Disposable): void => d[Symbol.dispose]()

/**
 * Creates a new `EventSource`.
 *
 * The created `EventSource` can efficiently manage multiple event listeners,
 * grouping them by event type and handling setup/teardown lifecycles.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import { makeEventSource } from "@typed/template/EventSource"
 * import * as EventHandler from "@typed/template/EventHandler"
 *
 * const program = Effect.gen(function* () {
 *   const eventSource = makeEventSource()
 *   const element = document.createElement("div")
 *
 *   // Add multiple event listeners
 *   eventSource.addEventListener(element, "click", EventHandler.make(() => console.log("clicked")))
 *   eventSource.addEventListener(element, "mouseover", EventHandler.make(() => console.log("hovered")))
 *
 *   // Setup all listeners
 *   yield* eventSource.setup(element, yield* Scope.make())
 * })
 * ```
 *
 * @since 1.0.0
 * @category constructors
 */
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
            Effect.forEach(handlers, ([el, { handler }]) => {
              const match = ev.target === el || el.contains(ev.target as Node)
              return match
                ? handler(proxyCurrentTarget(ev, el))
                : Effect.void
            })
          )
        element.addEventListener(event, listener, getDerivedAddEventListenerOptions(handlers))
        disposables.push(disposable(() => element.removeEventListener(event, listener)))
      }
    }

    return disposables
  }

  function setup(rendered: Rendered, scope: Scope.Scope) {
    if (listeners.size === 0) return Effect.void

    const elements = getElements(rendered)
    if (elements.length === 0) return Effect.void

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

function proxyCurrentTarget<E extends Event>(event: E, currentTarget: Element): E {
  return new Proxy(event, {
    get(target: E, property: string | symbol) {
      if (property === "currentTarget") return currentTarget
      const value = target[property as keyof E]
      if (typeof value === "function") return value.bind(event)
      return value
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
