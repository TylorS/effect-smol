import * as Cause from "../../../../Cause.ts"
import * as Effect from "../../../../Effect.ts"
import type { Fiber } from "../../../../Fiber.ts"
import { identity } from "../../../../Function.ts"
import { pipeArguments } from "../../../../interfaces/Pipeable.ts"
import * as Scope from "../../../../Scope.ts"
import { withEarlyExit } from "../../Sink/combinators.ts"
import type { Sink } from "../../Sink/Sink.ts"
import type { Fx } from "../Fx.ts"
import { FxTypeId } from "../TypeId.ts"

const VARIANCE: Fx.Variance<any, any, any> = {
  _A: identity,
  _E: identity,
  _R: identity
}

class Make<A, E, R> implements Fx<A, E, R> {
  readonly [FxTypeId]: Fx.Variance<A, E, R> = VARIANCE
  readonly run: <RSink>(sink: Sink<A, E, RSink>) => Effect.Effect<unknown, never, R | RSink>

  constructor(run: <RSink>(sink: Sink<A, E, RSink>) => Effect.Effect<unknown, never, R | RSink>) {
    this.run = run
  }

  pipe(this: Fx<A, E, R>) {
    return pipeArguments(this, arguments)
  }
}

/**
 * Creates an Fx from a function that provides values to a Sink.
 *
 * This is the lowest-level constructor for Fx, giving you full control over
 * the stream's behavior.
 *
 * @param run - A function that takes a `Sink` and returns an `Effect` that drives the stream.
 * @returns An `Fx` instance.
 * @since 1.0.0
 * @category constructors
 */
export const make = <A, E = never, R = never>(
  run: <RSink = never>(sink: Sink<A, E, RSink>) => Effect.Effect<unknown, never, R | RSink>
): Fx<A, E, R> => new Make<A, E, R>(run)

/**
 * Interface for emitting values, errors, or completion signals in a callback-based Fx.
 * @since 1.0.0
 * @category models
 */
export type Emit<A, E = never> = {
  succeed: (value: A) => Fiber<unknown, never>
  failCause: (cause: Cause.Cause<E>) => Fiber<unknown, never>
  fail: (error: E) => Fiber<unknown, never>
  die: (error: unknown) => Fiber<unknown, never>
  done: () => Fiber<unknown, never>
}

/**
 * Creates an Fx from a callback-based source.
 *
 * @param run - A function that receives an `Emit` object to push values/errors.
 *              It can return a cleanup effect.
 * @returns An `Fx` adapted from the callback.
 * @since 1.0.0
 * @category constructors
 */
export const callback = <A, E = never, R = never>(
  run: (emit: Emit<A, E>) => void | Effect.Effect<unknown, never, R>
): Fx<A, E, R> =>
  make<A, E, R>((sink) =>
    Effect.acquireUseRelease(
      Scope.make(),
      (scope) =>
        withEarlyExit(
          sink,
          Effect.fn(function*<RSink = never>(sink: Sink.WithEarlyExit<A, E, RSink>) {
            const services = yield* Effect.services<R | RSink>()
            const runFork = Effect.runForkWith(services)
            const controller = new AbortController()
            yield* Scope.addFinalizer(scope, Effect.sync(() => controller.abort()))

            const runEffect = <A, E>(effect: Effect.Effect<A, E, RSink>) =>
              runFork(effect, { signal: controller.signal })
            const emit: Emit<A, E> = {
              succeed: (value) => runEffect(sink.onSuccess(value)),
              failCause: (cause) => runEffect(sink.onFailure(cause)),
              fail: (error) => runEffect(sink.onFailure(Cause.fail(error))),
              die: (error) => runEffect(sink.onFailure(Cause.die(error))),
              done: () => runEffect(sink.earlyExit)
            }

            const effect = run(emit)
            if (effect) yield* Scope.addFinalizer(scope, Effect.provideServices(effect, services))
            return yield* Effect.never
          })
        ),
      Scope.close
    )
  )
