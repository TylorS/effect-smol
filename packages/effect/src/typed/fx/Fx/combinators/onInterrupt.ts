import * as Cause from "../../../../Cause.ts"
import * as Effect from "../../../../Effect.ts"
import { dual } from "../../../../Function.ts"
import * as Option from "../../../../Option.ts"
import * as Ref from "../../../../Ref.ts"
import { make as makeSink } from "../../Sink/Sink.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"

const toFinalizer = <XE, XR>(
  f:
    | Effect.Effect<void, XE, XR>
    | ((interruptors: ReadonlySet<number>) => Effect.Effect<void, XE, XR>)
) => (interruptors: ReadonlySet<number>) =>
    typeof f === "function" ? f(interruptors) : f

/**
 * Adds an `Effect.onInterrupt`-style finalizer to an `Fx`.
 *
 * The finalizer is run only when the stream is interrupted (either via an
 * interrupt cause or by interrupting the running fiber).
 *
 * @since 1.0.0
 * @category combinators
 */
export const onInterrupt: {
  <XE, XR>(
    finalizer:
      | Effect.Effect<void, XE, XR>
      | ((interruptors: ReadonlySet<number>) => Effect.Effect<void, XE, XR>)
  ): <A, E, R>(self: Fx<A, E, R>) => Fx<A, E | XE, R | XR>

  <A, E, R, XE, XR>(
    self: Fx<A, E, R>,
    finalizer:
      | Effect.Effect<void, XE, XR>
      | ((interruptors: ReadonlySet<number>) => Effect.Effect<void, XE, XR>)
  ): Fx<A, E | XE, R | XR>
} = dual(2, <A, E, R, XE, XR>(
  self: Fx<A, E, R>,
  finalizer_:
    | Effect.Effect<void, XE, XR>
    | ((interruptors: ReadonlySet<number>) => Effect.Effect<void, XE, XR>)
): Fx<A, E | XE, R | XR> =>
  make<A, E | XE, R | XR>(
    Effect.fnUntraced(function* (sink) {
      const finalizer = toFinalizer(finalizer_)
      const interrupted = yield* Ref.make(Option.none<ReadonlySet<number>>())

      const record = (ids: ReadonlySet<number>) =>
        Ref.modify(interrupted, (current) =>
          Option.isNone(current)
            ? [true, Option.some(ids)] as const
            : [false, current] as const)

      const runFinalizer = (ids: ReadonlySet<number>) =>
        Effect.flatMap(record(ids), (first) =>
          first
            ? Effect.matchCauseEffect(finalizer(ids), {
              onFailure: () => Effect.void,
              onSuccess: () => Effect.void
            })
            : Effect.void)

      return yield* self.run(makeSink(
        (cause) =>
          Cause.isInterruptedOnly(cause)
            ? Effect.matchCauseEffect(finalizer(Cause.interruptors(cause)), {
              onFailure: (cause2) => sink.onFailure(Cause.merge(cause, cause2)),
              onSuccess: () => sink.onFailure(cause)
            })
            : sink.onFailure(cause),
        sink.onSuccess
      )).pipe(
        Effect.onInterrupt((ids) => runFinalizer(ids))
      )
    })
  ))

