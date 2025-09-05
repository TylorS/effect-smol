import { flow } from "effect"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import { type Pipeable, pipeArguments } from "effect/interfaces/Pipeable"
import type * as Sink from "./Sink.js"

export abstract class Fx<A, E = never, R = never> implements Pipeable {
  abstract run<RSink>(sink: Sink.Sink<A, E, RSink>): Effect.Effect<unknown, never, R | RSink>

  pipe() {
    return pipeArguments(this, arguments)
  }
}

class Make<A, E, R> extends Fx<A, E, R> {
  readonly run: <RSink>(sink: Sink.Sink<A, E, RSink>) => Effect.Effect<unknown, never, R | RSink>

  constructor(run: <RSink>(sink: Sink.Sink<A, E, RSink>) => Effect.Effect<unknown, never, R | RSink>) {
    super()
    this.run = run
  }
}

export const make = <A, E = never, R = never>(
  run: <RSink = never>(sink: Sink.Sink<A, E, RSink>) => Effect.Effect<unknown, never, R | RSink>
) => new Make<A, E, R>(run)

export const succeed = <A>(value: A) => make<A>((sink) => sink.onSuccess(value))

export const failCause = <E>(cause: Cause.Cause<E>) => make<never, E, never>((sink) => sink.onFailure(cause))
export const fail = flow(Cause.fail, failCause)
export const die = flow(Cause.die, failCause)
export const fromFailures = flow(Cause.fromFailures, failCause)
export const interrupt = flow(Cause.interrupt, failCause)

export const fromEffect = <A, E = never, R = never>(
  effect: Effect.Effect<A, E, R>
): Fx<A, E, R> => make<A, E, R>((sink) => Effect.matchCauseEffect(effect, sink))

export const fromYieldable = <A, E = never, R = never>(
  yieldable: Effect.Yieldable<any, A, E, R>
): Fx<A, E, R> => make<A, E, R>((sink) => Effect.matchCauseEffect(yieldable.asEffect(), sink))

// export const flatMap = Function.dual(2, <A, E, R, B, E2, R2>(
//   self: Fx<A, E, R>,
//   f: (a: A) => Effect.Effect<B, E2, R2>
// ): Fx<B, E | E2, R | R2 | Scope.Scope> =>
//   make<B, E | E2, R | R2 | Scope.Scope>(<RSink>(sink: Sink.Sink<B, E | E2, RSink>) =>
//     withScopedFork((fork) =>
//       self.run<R | R2 | Scope.Scope | RSink>(Sink.make(
//         sink.onFailure,
//         (a) => fork(f(a))
//       ))
//     )
//   ))
