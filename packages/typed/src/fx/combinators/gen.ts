import type { Scope } from "effect"
import * as Effect from "effect/Effect"
import { unwrap } from "../combinators/unwrap.ts"
import { unwrapScoped } from "../combinators/unwrapScoped.ts"
import type { Fx } from "../Fx.ts"

export const gen = <Yield extends Effect.Yieldable<any, any, any, any>, A, E, R>(
  f: () => Generator<Yield, Fx<A, E, R>, any>
): Fx<A, E | Effect.Yieldable.Error<Yield>, R | Effect.Yieldable.Services<Yield>> => unwrap(Effect.gen(f)) as any

export const genScoped = <Yield extends Effect.Yieldable<any, any, any, any>, A, E, R>(
  f: () => Generator<Yield, Fx<A, E, R>, any>
): Fx<A, E | Effect.Yieldable.Error<Yield>, Exclude<R | Effect.Yieldable.Services<Yield>, Scope.Scope>> =>
  unwrapScoped(Effect.gen(f)) as any
