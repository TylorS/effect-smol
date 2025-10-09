import type { Scope } from "effect"
import * as Effect from "effect/Effect"
import type { Fx } from "../Fx.ts"
import { unwrapScoped } from "./unwrapScoped.ts"

export const genScoped = <Yield extends Effect.Yieldable<any, any, any, any>, A, E, R>(
  f: () => Generator<Yield, Fx<A, E, R>, any>
): Fx<A, E | Effect.Yieldable.Error<Yield>, Exclude<R | Effect.Yieldable.Services<Yield>, Scope.Scope>> =>
  unwrapScoped(Effect.gen(f)) as any
