import type * as Cause from "effect/Cause"
import { hasProperty } from "effect/data/Predicate"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import { type Pipeable, pipeArguments } from "effect/interfaces/Pipeable"
import type * as ServiceMap from "effect/ServiceMap"

export const EventHandlerTypeId = Symbol.for("@typed/template/EventHandler")
export type EventHandlerTypeId = typeof EventHandlerTypeId

/**
 * Represents a DOM event handler that returns an Effect.
 *
 * It encapsulates the event handler logic and any options (like `preventDefault`, `once`, etc.)
 * that should be applied when the event is triggered.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import * as EventHandler from "effect/typed/template/EventHandler"
 * import { html } from "effect/typed/template"
 *
 * // Simple event handler
 * const handleClick = EventHandler.make((event: MouseEvent) => {
 *   console.log("Clicked!", event)
 * })
 *
 * // Event handler with Effect
 * const handleSubmit = EventHandler.make((event: SubmitEvent) =>
 *   Effect.gen(function* () {
 *     event.preventDefault()
 *     yield* Effect.sync(() => console.log("Form submitted"))
 *   })
 * )
 *
 * // Use in template
 * const template = html`<button onclick=${handleClick}>Click me</button>`
 * ```
 *
 * @since 1.0.0
 * @category models
 */
export interface EventHandler<Ev extends Event = Event, E = never, R = never> extends Pipeable {
  readonly [EventHandlerTypeId]: EventHandlerTypeId
  readonly handler: (event: Ev) => Effect.Effect<unknown, E, R>
  readonly options: (AddEventListenerOptions & EventOptions) | undefined
}

export type Context<T> = T extends EventHandler<infer _Ev, infer _E, infer R> ? R : never
export type Error<T> = T extends EventHandler<infer _Ev, infer E, infer _R> ? E : never
export type EventOf<T> = T extends EventHandler<infer Ev, infer _E, infer _R> ? Ev : never

/**
 * Options for configuring event handling behavior.
 */
export type EventOptions = {
  readonly preventDefault?: boolean
  readonly stopPropagation?: boolean
  readonly stopImmediatePropagation?: boolean
}

/**
 * Creates a new `EventHandler`.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import * as EventHandler from "effect/typed/template/EventHandler"
 * import { html } from "effect/typed/template"
 *
 * // Simple handler
 * const clickHandler = EventHandler.make((event) => {
 *   console.log("Button clicked")
 * })
 *
 * // Handler with Effect
 * const submitHandler = EventHandler.make((event) =>
 *   Effect.gen(function* () {
 *     const form = event.target as HTMLFormElement
 *     const data = new FormData(form)
 *     yield* Effect.sync(() => console.log("Submitting:", data))
 *   })
 * )
 *
 * // Handler with options
 * const preventDefaultHandler = EventHandler.make(
 *   (event) => console.log("Prevented default"),
 *   { preventDefault: true }
 * )
 *
 * const template = html`<button onclick=${clickHandler}>Click</button>`
 * ```
 *
 * @param handler - The function to execute when the event occurs. Can return void or an Effect.
 * @param options - Optional configuration for the event listener.
 * @since 1.0.0
 * @category constructors
 */
export function make<Ev extends Event, E = never, R = never>(
  handler: (event: Ev) => void | Effect.Effect<unknown, E, R>,
  options?: AddEventListenerOptions & EventOptions
): EventHandler<Ev, E, R> {
  return {
    [EventHandlerTypeId]: EventHandlerTypeId,
    handler: (ev: Ev) => {
      if (options) handleEventOptions(options, ev)
      const result = handler(ev)
      if (Effect.isEffect(result)) return result
      return Effect.void
    },
    options,
    pipe(this: EventHandler<Ev, E, R>) {
      return pipeArguments(this, arguments)
    }
  }
}

/**
 * Provides services to the `EventHandler`.
 *
 * This allows you to inject dependencies into the effect returned by the event handler.
 *
 * @example
 * ```ts
 * import { Effect, Context } from "effect"
 * import * as EventHandler from "effect/typed/template/EventHandler"
 *
 * interface Database {
 *   readonly save: (data: string) => Effect.Effect<void>
 * }
 * const Database = Context.GenericTag<Database>("Database")
 *
 * const handler = EventHandler.make((event) =>
 *   Effect.flatMap(Database, (db) => db.save("data"))
 * )
 *
 * // Provide services
 * const provided = EventHandler.provide(handler, Database.of({ save: (d) => Effect.sync(() => console.log(d)) }))
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export const provide: {
  <R2 = never>(
    services: ServiceMap.ServiceMap<R2>
  ): <Ev extends Event, E = never, R = never>(handler: EventHandler<Ev, E, R>) => EventHandler<Ev, E, Exclude<R, R2>>

  <Ev extends Event, E = never, R = never, R2 = never>(
    handler: EventHandler<Ev, E, R>,
    services: ServiceMap.ServiceMap<R2>
  ): EventHandler<Ev, E, Exclude<R, R2>>
} = dual(2, <Ev extends Event, E = never, R = never, R2 = never>(
  handler: EventHandler<Ev, E, R>,
  services: ServiceMap.ServiceMap<R2>
): EventHandler<Ev, E, Exclude<R, R2>> => {
  return make((ev) => handler.handler(ev).pipe(Effect.provideServices(services)), handler.options)
})

/**
 * Recovers from errors in the `EventHandler`.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import * as EventHandler from "effect/typed/template/EventHandler"
 *
 * const handler = EventHandler.make((event) =>
 *   Effect.fail("Something went wrong")
 * )
 *
 * // Recover from errors
 * const recovered = EventHandler.catchCause(handler, (cause) =>
 *   Effect.sync(() => console.error("Error:", cause))
 * )
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export const catchCause: {
  <E, E2 = never, R2 = never>(
    f: (cause: Cause.Cause<E>) => Effect.Effect<unknown, E2, R2>
  ): <Ev extends Event, R = never>(handler: EventHandler<Ev, E, R>) => EventHandler<Ev, E2, R | R2>

  <Ev extends Event, E = never, R = never, E2 = never, R2 = never>(
    handler: EventHandler<Ev, E, R>,
    f: (cause: Cause.Cause<E>) => Effect.Effect<unknown, E2, R2>
  ): EventHandler<Ev, E2, R | R2>
} = dual(2, <Ev extends Event, E = never, R = never, E2 = never, R2 = never>(
  handler: EventHandler<Ev, E, R>,
  f: (cause: Cause.Cause<E>) => Effect.Effect<unknown, E2, R2>
): EventHandler<Ev, E2, R | R2> => {
  return make((ev) => handler.handler(ev).pipe(Effect.catchCause(f)), handler.options)
})

/**
 * Helper to ensure a value is an `EventHandler`.
 *
 * If the input is already an `EventHandler`, it is returned as is.
 * If it is an `Effect`, it is wrapped in an `EventHandler` that ignores the event argument.
 */
export function fromEffectOrEventHandler<Ev extends Event, E = never, R = never>(
  handler: Effect.Effect<unknown, E, R> | EventHandler<Ev, E, R>
): EventHandler<Ev, E, R> {
  if (isEventHandler(handler)) return handler
  return make(() => handler as Effect.Effect<unknown, E, R>)
}

/**
 * Checks if a value is an `EventHandler`.
 *
 * @example
 * ```ts
 * import * as EventHandler from "effect/typed/template/EventHandler"
 *
 * const handler = EventHandler.make((event) => console.log("Click"))
 * const isHandler = EventHandler.isEventHandler(handler)
 * console.log(isHandler) // true
 *
 * const notHandler = (event: Event) => console.log("Click")
 * const isNotHandler = EventHandler.isEventHandler(notHandler)
 * console.log(isNotHandler) // false
 * ```
 *
 * @since 1.0.0
 * @category guards
 */
export function isEventHandler<Ev extends Event, E = never, R = never>(
  handler: unknown
): handler is EventHandler<Ev, E, R> {
  return hasProperty(handler, EventHandlerTypeId)
}

/**
 * Applies event options to a native DOM event.
 */
export function handleEventOptions<Ev extends Event>(
  eventOptions: EventOptions,
  ev: Ev
): boolean {
  if (eventOptions.preventDefault) ev.preventDefault()
  if (eventOptions.stopPropagation) ev.stopPropagation()
  if (eventOptions.stopImmediatePropagation) ev.stopImmediatePropagation()

  return true
}

/**
 * Modifies an `EventHandler` to call `preventDefault()` on the event.
 *
 * @example
 * ```ts
 * import * as EventHandler from "effect/typed/template/EventHandler"
 * import { html } from "effect/typed/template"
 *
 * const handler = EventHandler.make((event) => {
 *   console.log("Form submit prevented")
 * })
 *
 * const preventDefaultHandler = EventHandler.preventDefault(handler)
 *
 * const template = html`<form onsubmit=${preventDefaultHandler}>...</form>`
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export function preventDefault<Ev extends Event, E = never, R = never>(
  handler: EventHandler<Ev, E, R>
): EventHandler<Ev, E, R> {
  return make(handler.handler, { ...handler.options, preventDefault: true })
}

/**
 * Modifies an `EventHandler` to call `stopPropagation()` on the event.
 *
 * @example
 * ```ts
 * import * as EventHandler from "effect/typed/template/EventHandler"
 *
 * const handler = EventHandler.make((event) => {
 *   console.log("Event stopped")
 * })
 *
 * const stopPropHandler = EventHandler.stopPropagation(handler)
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export function stopPropagation<Ev extends Event, E = never, R = never>(
  handler: EventHandler<Ev, E, R>
): EventHandler<Ev, E, R> {
  return make(handler.handler, { ...handler.options, stopPropagation: true })
}

/**
 * Modifies an `EventHandler` to call `stopImmediatePropagation()` on the event.
 *
 * @example
 * ```ts
 * import * as EventHandler from "effect/typed/template/EventHandler"
 *
 * const handler = EventHandler.make((event) => {
 *   console.log("Immediate propagation stopped")
 * })
 *
 * const stopImmediateHandler = EventHandler.stopImmediatePropagation(handler)
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export function stopImmediatePropagation<Ev extends Event, E = never, R = never>(
  handler: EventHandler<Ev, E, R>
): EventHandler<Ev, E, R> {
  return make(handler.handler, { ...handler.options, stopImmediatePropagation: true })
}

/**
 * Modifies an `EventHandler` to run only once.
 *
 * @example
 * ```ts
 * import * as EventHandler from "effect/typed/template/EventHandler"
 *
 * const handler = EventHandler.make((event) => {
 *   console.log("This will only run once")
 * })
 *
 * const onceHandler = EventHandler.once(handler)
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export function once<Ev extends Event, E = never, R = never>(
  handler: EventHandler<Ev, E, R>
): EventHandler<Ev, E, R> {
  return make(handler.handler, { ...handler.options, once: true, passive: false })
}

/**
 * Modifies an `EventHandler` to be passive (improves scrolling performance).
 *
 * @example
 * ```ts
 * import * as EventHandler from "effect/typed/template/EventHandler"
 *
 * const handler = EventHandler.make((event) => {
 *   // Passive handlers can't call preventDefault
 *   console.log("Scroll event")
 * })
 *
 * const passiveHandler = EventHandler.passive(handler)
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export function passive<Ev extends Event, E = never, R = never>(
  handler: EventHandler<Ev, E, R>
): EventHandler<Ev, E, R> {
  return make(handler.handler, { ...handler.options, passive: true, once: false })
}
