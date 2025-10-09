import type { Cause } from "effect/Cause"
import type { Effect } from "effect/Effect"
import {
  callback,
  catchCause,
  failCause,
  matchCauseEffect,
  runForkWith,
  servicesWith,
  sync,
  void as void_1
} from "effect/Effect"
import { interrupt } from "effect/Fiber"
import { dual } from "effect/Function"
import { make } from "../../sink/Sink.ts"
import type { Fx } from "../Fx.ts"

export const observe: {
  <A, E2, R2>(
    f: (value: A) => Effect<unknown, E2, R2>
  ): <E, R>(fx: Fx<A, E, R>) => Effect<unknown, E | E2, R | R2>

  <A, E, R, E2, R2>(
    fx: Fx<A, E, R>,
    f: (value: A) => Effect<unknown, E2, R2>
  ): Effect<unknown, E | E2, R | R2>
} = dual(2, <A, E, R, E2, R2>(
  fx: Fx<A, E, R>,
  f: (value: A) => Effect<unknown, E2, R2>
): Effect<unknown, E | E2, R | R2> =>
  servicesWith((services) =>
    callback<void, E | E2, R | R2>((resume) => {
      const onFailure = (cause: Cause<E | E2>) => sync(() => resume(failCause(cause)))

      return fx.run(make(onFailure, (value: A) => catchCause(f(value), onFailure))).pipe(
        matchCauseEffect(make(onFailure, () => sync(() => resume(void_1)))),
        runForkWith(services),
        interrupt
      )
    })
  ))

export const drain = <A, E, R>(fx: Fx<A, E, R>): Effect<void, E, R> => observe(fx, () => void_1)
