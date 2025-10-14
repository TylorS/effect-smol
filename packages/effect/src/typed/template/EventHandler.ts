import type * as Effect from "../../Effect.ts"

export const EventHandlerTypeId = Symbol.for("@typed/template/EventHandler")
export type EventHandlerTypeId = typeof EventHandlerTypeId

export interface EventHandler<Ev extends Event = Event, E = never, R = never> {
  readonly [EventHandlerTypeId]: EventHandlerTypeId
  readonly handler: (event: Ev) => Effect.Effect<unknown, E, R>
  readonly options: (AddEventListenerOptions & EventOptions) | undefined
}

export type Context<T> = T extends EventHandler<infer _Ev, infer _E, infer R> ? R : never
export type Error<T> = T extends EventHandler<infer _Ev, infer E, infer _R> ? E : never
export type EventOf<T> = T extends EventHandler<infer Ev, infer _E, infer _R> ? Ev : never

export type EventOptions = {
  readonly preventDefault?: boolean
  readonly stopPropagation?: boolean
  readonly stopImmediatePropagation?: boolean
}

export function make<Ev extends Event, E = never, R = never>(
  handler: (event: Ev) => Effect.Effect<unknown, E, R>,
  options?: AddEventListenerOptions & EventOptions
): EventHandler<Ev, E, R> {
  return {
    [EventHandlerTypeId]: EventHandlerTypeId,
    handler: (ev: Ev) => {
      if (options) handleEventOptions(options, ev)
      return handler(ev)
    },
    options
  }
}

export function handleEventOptions<Ev extends Event>(
  eventOptions: EventOptions,
  ev: Ev
): boolean {
  if (eventOptions.preventDefault) ev.preventDefault()
  if (eventOptions.stopPropagation) ev.stopPropagation()
  if (eventOptions.stopImmediatePropagation) ev.stopImmediatePropagation()

  return true
}
