import type { Cause } from "effect/Cause"
import type { RunOptions } from "effect/Effect"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { make } from "../../sink/Sink.ts"
import type { Fx } from "../Fx.ts"

export const runPromiseExit = <A, E>(
  fx: Fx<A, E>,
  options?: RunOptions
): Promise<Exit.Exit<void, E>> =>
  new Promise((resolve) => {
    const effect = fx.run(make(
      onFailure,
      () => Effect.void
    )).pipe(
      Effect.matchCause({
        onFailure,
        onSuccess
      })
    )

    const fiber = Effect.runFork(effect, options)

    function onFailure(cause: Cause<E>) {
      return Effect.sync(() => {
        resolve(Exit.failCause(cause))
        onComplete()
      })
    }

    function onSuccess() {
      return Effect.sync(() => {
        resolve(Exit.void)
        onComplete()
      })
    }

    function onComplete() {
      return fiber.interruptUnsafe()
    }
  })

export const runPromise = <A, E>(
  fx: Fx<A, E>,
  options?: RunOptions
): Promise<unknown> =>
  runPromiseExit(fx, options).then(Exit.match({
    onFailure: Promise.reject,
    onSuccess: Promise.resolve<void>
  }))
