import * as Effect from "effect/Effect"
import type * as Fiber from "effect/Fiber"
import type { Fx } from "../Fx.ts"
import { drain } from "./observe.ts"

export const fork = <A, E, R>(fx: Fx<A, E, R>, options?: {
  readonly startImmediately?: boolean
  readonly uninterruptible?: boolean
}): Effect.Effect<Fiber.Fiber<unknown, E>, never, R> =>
  Effect.fork(drain(fx), {
    startImmediately: options?.startImmediately ?? true,
    uninterruptible: options?.uninterruptible ?? false
  })
