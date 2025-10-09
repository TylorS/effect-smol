import type { Sink } from "@typed/sink"
import type { Effect } from "effect/Effect"
import { pipeArguments } from "effect/interfaces/Pipeable"
import type { Fx } from "../Fx.ts"
import { FxTypeId } from "../TypeId.ts"

class Make<A, E, R> implements Fx<A, E, R> {
  readonly [FxTypeId]: FxTypeId = FxTypeId
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
