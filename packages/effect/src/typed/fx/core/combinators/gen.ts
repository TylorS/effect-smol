import * as Effect from "effect/Effect"
import type { Fx } from "../Fx.ts"
import { unwrap } from "./unwrap.ts"

export const gen = <Yield extends Effect.Yieldable<any, any, any, any>, Return extends Fx.Any>(
  f: () => Generator<Yield, Return, any>
): Fx<
  Fx.Success<Return>,
  Fx.Error<Return> | Effect.Yieldable.Error<Yield>,
  Fx.Services<Return> | Effect.Yieldable.Services<Yield>
> => unwrap(Effect.gen(f)) as any
