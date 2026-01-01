import type { Cause } from "../../../../Cause.ts"
import type { Effect } from "../../../../Effect.ts"
import {
  callback,
  catchCause,
  failCause,
  forkChild,
  isEffect,
  matchCauseEffect,
  runForkWith,
  servicesWith,
  sync,
  void as void_
} from "../../../../Effect.ts"
import { interrupt } from "../../../../Fiber.ts"
import { dual } from "../../../../Function.ts"
import type { Layer } from "../../../../Layer.ts"
import { effectDiscard } from "../../../../Layer.ts"
import type { Scope } from "../../../../Scope.ts"
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
    f: (value: A) => void | Effect<unknown, E2, R2>
  ): <E, R>(fx: Fx<A, E, R>) => Effect<unknown, E | E2, R | R2>

  <A, E, R, E2 = never, R2 = never>(
    fx: Fx<A, E, R>,
    f: (value: A) => void | Effect<unknown, E2, R2>
  ): Effect<unknown, E | E2, R | R2>
} = dual(2, <A, E, R, E2 = never, R2 = never>(
  fx: Fx<A, E, R>,
  f: (value: A) => void | Effect<unknown, E2, R2>
): Effect<unknown, E | E2, R | R2> =>
  servicesWith((services) =>
    callback<void, E | E2, R | R2>((resume) => {
      const onFailure = (cause: Cause<E | E2>) => sync(() => resume(failCause(cause)))
      const onSuccess = (value: A) => {
        const result = f(value)
        return isEffect(result) ? catchCause(result, onFailure) : void_
      }
      const onDone = () => sync(() => resume(void_))

      return fx.run(make(onFailure, onSuccess)).pipe(
        matchCauseEffect(make(onFailure, onDone)),
        runForkWith(services),
        interrupt // Interrupt fiber when callback is interrupted
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
export const drain = <A, E, R>(fx: Fx<A, E, R>): Effect<void, E, R> => observe(fx, () => void_)

/**
 * Runs an `Fx` stream as a Layer.
 * The stream is forked in the background when the layer is acquired.
 *
 * @param fx - The `Fx` stream to run.
 * @returns A `Layer` that manages the background execution of the stream.
 * @since 1.0.0
 * @category runners
 */
export const drainLayer = <A, E, R>(fx: Fx<A, E, R>): Layer<never, E, Exclude<R, Scope>> =>
  effectDiscard(forkChild(drain(fx)))

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
    f: (value: A) => void | Effect<unknown, E2, R2>
  ): <E, R>(fx: Fx<A, E, R>) => Layer<never, E | E2, R | R2>

  <A, E, R, E2 = never, R2 = never>(
    fx: Fx<A, E, R>,
    f: (value: A) => void | Effect<unknown, E2, R2>
  ): Layer<never, E | E2, R | R2>
} = dual(2, <A, E, R, E2 = never, R2 = never>(
  fx: Fx<A, E, R>,
  f: (value: A) => void | Effect<unknown, E2, R2>
): Layer<never, E | E2, R | R2> => effectDiscard(observe(fx, f)))
