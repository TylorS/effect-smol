import * as Effect from "effect/Effect"
import { pipeArguments } from "effect/interfaces/Pipeable"
import { type Fx, FxTypeId } from "../Fx.js"
import type { Sink } from "../Sink.ts"

export abstract class YieldableFx<A, E, R, B, E2, R2> extends Effect.YieldableClass<B, E2, R2> implements Fx<A, E, R> {
  readonly [FxTypeId]: FxTypeId = FxTypeId

  abstract run<RSink>(sink: Sink<A, E, RSink>): Effect.Effect<unknown, never, R | RSink>

  abstract toEffect(): Effect.Effect<B, E2, R2>

  pipe() {
    return pipeArguments(this, arguments)
  }

  // Memoize the effect
  protected _effect: Effect.Effect<B, E2, R2> | null = null
  asEffect(): Effect.Effect<B, E2, R2> {
    return (this._effect ??= this.toEffect())
  }
}
