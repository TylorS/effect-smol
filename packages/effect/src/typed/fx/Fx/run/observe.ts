import type { Cause } from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import { dual } from "effect/Function"
import * as Layer from "effect/Layer"
import type { Scope } from "effect/Scope"
import { make } from "../../Sink/Sink.ts"
import type { Fx } from "../Fx.ts"

/**
 * Observes the values of an `Fx` stream using a callback function.
 * The callback can return `void` or an `Effect` which will be executed for each value.
 *
 * @param fx - The `Fx` stream to observe.
 * @param f - The function to call for each emitted value.
 * @returns An `Effect` that completes when the stream ends.
 * @since 1.0.0
 * @category runners
 */
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
        return Effect.isEffect(result) ? Effect.catchCause(result, onFailure) : Effect.void
      }
      const onDone = () => Effect.sync(() => resume(Effect.void))

      return fx.run(make(onFailure, onSuccess)).pipe(
        Effect.matchCauseEffect(make(onFailure, onDone)),
        Effect.runForkWith(services),
        Fiber.interrupt // Interrupt fiber when callback is interrupted
      )
    })
  ))

/**
 * Runs an `Fx` stream to completion, discarding all values.
 * Useful when the side effects of the stream are all that matter.
 *
 * @param fx - The `Fx` stream to drain.
 * @returns An `Effect` that completes when the stream ends.
 * @since 1.0.0
 * @category runners
 */
export const drain = <A, E, R>(fx: Fx<A, E, R>): Effect.Effect<void, E, R> => observe(fx, () => Effect.void)

/**
 * Runs an `Fx` stream as a Layer.
 * The stream is forked in the background when the layer is acquired.
 *
 * @param fx - The `Fx` stream to run.
 * @returns A `Layer` that manages the background execution of the stream.
 * @since 1.0.0
 * @category runners
 */
export const drainLayer = <A, E, R>(fx: Fx<A, E, R>): Layer.Layer<never, E, Exclude<R, Scope>> =>
  Layer.effectDiscard(Effect.fork(drain(fx)))

/**
 * Observes the values of an `Fx` stream using a callback function and returns a `Layer`.
 * The callback can return `void` or an `Effect` which will be executed for each value.
 *
 * @param fx - The `Fx` stream to observe.
 * @param f - The function to call for each emitted value.
 * @returns A `Layer` that manages the background execution of the stream.
 * @since 1.0.0
 * @category runners
 */
export const observeLayer: {
  <A, E2 = never, R2 = never>(
    f: (value: A) => void | Effect.Effect<unknown, E2, R2>
  ): <E, R>(fx: Fx<A, E, R>) => Layer.Layer<never, E | E2, R | R2>

  <A, E, R, E2 = never, R2 = never>(
    fx: Fx<A, E, R>,
    f: (value: A) => void | Effect.Effect<unknown, E2, R2>
  ): Layer.Layer<never, E | E2, R | R2>
} = dual(2, <A, E, R, E2 = never, R2 = never>(
  fx: Fx<A, E, R>,
  f: (value: A) => void | Effect.Effect<unknown, E2, R2>
): Layer.Layer<never, E | E2, R | R2> => Layer.effectDiscard(observe(fx, f)))
