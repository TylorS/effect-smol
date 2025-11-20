import type { Effect, RunOptions } from "../../../Effect.ts"
import { fork as effectFork, runFork as effectRunFork } from "../../../Effect.ts"
import type { Fiber } from "../../../Fiber.ts"
import type { Fx } from "../Fx.ts"
import { drain } from "./observe.ts"

export const fork = <A, E, R>(fx: Fx<A, E, R>, options?: {
  readonly startImmediately?: boolean
  readonly uninterruptible?: boolean
}): Effect<Fiber<unknown, E>, never, R> =>
  effectFork(drain(fx), {
    startImmediately: options?.startImmediately ?? true,
    uninterruptible: options?.uninterruptible ?? false
  })

export const runFork = <A, E>(fx: Fx<A, E>, options?: RunOptions): Fiber<void, E> => effectRunFork(drain(fx), options)
