import type { Effect } from "../../../Effect.ts"
import { identity } from "../../../Function.ts"
import { pipeArguments } from "../../../interfaces/Pipeable.ts"
import type { Fx } from "../Fx.ts"
import type { Sink } from "../sink/Sink.ts"
import { FxTypeId } from "../TypeId.ts"

const VARIANCE: Fx.Variance<any, any, any> = {
  _A: identity,
  _E: identity,
  _R: identity
}

class Make<A, E, R> implements Fx<A, E, R> {
  readonly [FxTypeId]: Fx.Variance<A, E, R> = VARIANCE
  readonly run: <RSink>(sink: Sink<A, E, RSink>) => Effect<unknown, never, R | RSink>

  /*#__PURE__*/ constructor(run: <RSink>(sink: Sink<A, E, RSink>) => Effect<unknown, never, R | RSink>) {
    this.run = run
  }

  pipe(this: Fx<A, E, R>) {
    return /*#__PURE__*/ pipeArguments(this, arguments)
  }
}

export const make = <A, E = never, R = never>(
  run: <RSink = never>(sink: Sink<A, E, RSink>) => Effect<unknown, never, R | RSink>
): Fx<A, E, R> => /*#__PURE__*/ new Make<A, E, R>(run)
