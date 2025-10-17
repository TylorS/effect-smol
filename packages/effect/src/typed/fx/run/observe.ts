import type { Cause } from "../../../Cause.ts"
import * as Effect from "../../../Effect.ts"
import * as Fiber from "../../../Fiber.ts"
import { dual } from "../../../Function.ts"
import { Layer } from "../../../index.js"
import type { Scope } from "../../../Scope.ts"
import type { Fx } from "../Fx.ts"
import { make } from "../sink/Sink.ts"

export const observe: {
  <A, E2 = never, R2 = never>(
    f: (value: A) => void | Effect.Effect<unknown, E2, R2>
  ): <E, R>(fx: Fx<A, E, R>) => Effect.Effect<unknown, E | E2, R | R2>

  <A, E, R, E2 = never, R2 = never>(
    fx: Fx<A, E, R>,
    f: (value: A) => void | Effect.Effect<unknown, E2, R2>
  ): Effect.Effect<unknown, E | E2, R | R2>
} = dual(2, <A, E, R, E2 = never, R2 = never>(
  fx: Fx<A, E, R>,
  f: (value: A) => void | Effect.Effect<unknown, E2, R2>
): Effect.Effect<unknown, E | E2, R | R2> =>
  Effect.servicesWith((services) =>
    Effect.callback<void, E | E2, R | R2>((resume) => {
      const onFailure = (cause: Cause<E | E2>) => Effect.sync(() => resume(Effect.failCause(cause)))
      const onSuccess = (value: A) => {
        const result = f(value)
        if (Effect.isEffect(result)) {
          return Effect.catchCause(result, onFailure)
        }
        return Effect.void
      }
      const onDone = () => Effect.sync(() => resume(Effect.void))

      return fx.run(make(onFailure, onSuccess)).pipe(
        Effect.matchCauseEffect(make(onFailure, onDone)),
        Effect.runForkWith(services),
        Fiber.interrupt // Interrupt fiber when callback is interrupted
      )
    })
  ))

export const drain = <A, E, R>(fx: Fx<A, E, R>): Effect.Effect<void, E, R> => observe(fx, () => Effect.void)

export const drainLayer = <A, E, R>(fx: Fx<A, E, R>): Layer.Layer<never, E, Exclude<R, Scope>> =>
  Layer.effectDiscard(Effect.fork(drain(fx)))
