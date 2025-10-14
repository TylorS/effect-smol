import * as Effect from "../../../Effect.ts"
import type { Fx } from "../Fx.ts"
import { unwrap } from "./unwrap.ts"

export const gen = <Yield extends Effect.Yieldable<any, any, any, any>, A, E, R>(
  f: () => Generator<Yield, Fx<A, E, R>, any>
): Fx<A, E | Effect.Yieldable.Error<Yield>, R | Effect.Yieldable.Services<Yield>> => unwrap(Effect.gen(f)) as any
