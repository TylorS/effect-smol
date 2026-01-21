import * as Effect from "../../../../Effect.ts"
import * as Exit from "../../../../Exit.ts"
import { dual } from "../../../../Function.ts"
import * as Option from "../../../../Option.ts"
import * as Ref from "../../../../Ref.ts"
import { make as makeSink } from "../../Sink/Sink.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"

const toFinalizer = <A, E, XE, XR>(
  f: (exit: Exit.Exit<A, E>) => void | Effect.Effect<void, XE, XR>
) =>
(exit: Exit.Exit<A, E>): Effect.Effect<void, XE, XR> => {
  const x = f(exit)
  return Effect.isEffect(x) ? x : Effect.void
}

/**
 * Adds an `Effect.onExit`-style finalizer to an `Fx`.
 *
 * The finalizer is run when the `Fx` terminates (success, failure, or interruption).
 *
 * @since 1.0.0
 * @category combinators
 */
export const onExit: {
  <A, E, XE = never, XR = never>(
    f: (exit: Exit.Exit<void, E>) => void | Effect.Effect<void, XE, XR>
  ): <R>(self: Fx<A, E, R>) => Fx<A, E | XE, R | XR>

  <A, E, R, XE = never, XR = never>(
    self: Fx<A, E, R>,
    f: (exit: Exit.Exit<void, E>) => void | Effect.Effect<void, XE, XR>
  ): Fx<A, E | XE, R | XR>
} = dual(2, <A, E, R, XE, XR>(
  self: Fx<A, E, R>,
  f: (exit: Exit.Exit<void, E>) => void | Effect.Effect<void, XE, XR>
): Fx<A, E | XE, R | XR> =>
  make<A, E | XE, R | XR>(
    Effect.fnUntraced(function*(sink) {
      const finalizer = toFinalizer(f)
      const observed = yield* Ref.make(Option.none<Exit.Exit<void, E>>())

      const recordExit = (exit: Exit.Exit<void, E>) =>
        Ref.modify(observed, (current) =>
          Option.isNone(current)
            ? [true, Option.some(exit)] as const
            : [false, current] as const).pipe(Effect.asVoid)

      const runFinalizer = (exit: Exit.Exit<void, E>, allowReportFailure: boolean) =>
        Effect.matchCauseEffect(
          finalizer(exit),
          {
            onFailure: (cause) => allowReportFailure ? sink.onFailure(cause) : Effect.void,
            onSuccess: () => Effect.void
          }
        )

      return yield* self.run(makeSink(
        (cause) => Effect.flatMap(recordExit(Exit.failCause(cause)), () => sink.onFailure(cause)),
        sink.onSuccess
      )).pipe(
        Effect.onExit((runExit) =>
          Effect.flatMap(Ref.get(observed), (maybe) =>
            Option.match(maybe, {
              onSome: (exit) => runFinalizer(exit, false),
              onNone: () =>
                Exit.match(runExit, {
                  onFailure: (cause) => runFinalizer(Exit.failCause(cause), false),
                  onSuccess: () => runFinalizer(Exit.succeed<void>(undefined), true)
                })
            }))
        )
      )
    })
  ))
