import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import type { Fiber } from "effect/Fiber"
import { identity } from "effect/Function"
import { pipeArguments } from "effect/interfaces/Pipeable"
import * as Scope from "effect/Scope"
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

export const make = <A, E = never, R = never>(
  run: <RSink = never>(sink: Sink<A, E, RSink>) => Effect.Effect<unknown, never, R | RSink>
): Fx<A, E, R> => new Make<A, E, R>(run)

export type Emit<A, E = never> = {
  succeed: (value: A) => Fiber<unknown, never>
  failCause: (cause: Cause.Cause<E>) => Fiber<unknown, never>
  fail: (error: E) => Fiber<unknown, never>
  die: (error: unknown) => Fiber<unknown, never>
  done: () => Fiber<unknown, never>
}

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
