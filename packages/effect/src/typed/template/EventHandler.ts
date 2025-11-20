import type * as Cause from "effect/Cause"
import { hasProperty } from "effect/data/Predicate"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import { type Pipeable, pipeArguments } from "effect/interfaces/Pipeable"
import type * as ServiceMap from "effect/ServiceMap"

export const EventHandlerTypeId = Symbol.for("@typed/template/EventHandler")
export type EventHandlerTypeId = typeof EventHandlerTypeId

export interface EventHandler<Ev extends Event = Event, E = never, R = never> extends Pipeable {
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

export function fromEffectOrEventHandler<Ev extends Event, E = never, R = never>(
  handler: Effect.Effect<unknown, E, R> | EventHandler<Ev, E, R>
): EventHandler<Ev, E, R> {
  if (isEventHandler(handler)) {
    return handler
  }
  return make(() => handler as Effect.Effect<unknown, E, R>)
}

export function isEventHandler<Ev extends Event, E = never, R = never>(
  handler: unknown
): handler is EventHandler<Ev, E, R> {
  return hasProperty(handler, EventHandlerTypeId)
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
