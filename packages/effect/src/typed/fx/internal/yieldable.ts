import * as Effect from "../../../Effect.ts"
import { identity } from "../../../Function.ts"
import { pipeArguments } from "../../../interfaces/Pipeable.ts"
import type * as Fx from "../Fx.ts"
import type { Sink } from "../sink/Sink.ts"
import { FxTypeId } from "../TypeId.ts"

const VARIANCE = {
  _A: identity,
  _E: identity,
  _R: identity
}

export abstract class YieldableFx<A, E, R, B, E2, R2> extends Effect.YieldableClass<B, E2, R2>
  implements Fx.Fx<A, E, R>
{
  readonly [FxTypeId] = VARIANCE
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
