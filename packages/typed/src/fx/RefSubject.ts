import type * as Effect from "effect/Effect"
import type { Subject } from "./Subject"

export interface RefSubject<A, E = never, R = never>
  extends Subject<A, E, R>, Effect.Yieldable<RefSubject<A, E, R>, A, E, R>
{
  readonly modifyEffect: <B, E2, R2>(
    f: (a: A) => Effect.Effect<readonly [B, A], E2, R2>
  ) => Effect.Effect<B, E | E2, R | R2>
}
