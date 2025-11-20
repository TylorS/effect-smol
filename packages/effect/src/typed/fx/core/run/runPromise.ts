import type { RunOptions } from "effect/Effect"
import * as Effect from "effect/Effect"
import type * as Exit from "effect/Exit"
import type { Fx } from "../Fx.ts"
import { drain } from "./observe.ts"

export const runPromiseExit = <A, E>(
  fx: Fx<A, E>,
  options?: RunOptions
): Promise<Exit.Exit<void, E>> => Effect.runPromiseExit(drain(fx), options)

export const runPromise = <A, E>(
  fx: Fx<A, E>,
  options?: RunOptions
): Promise<unknown> => Effect.runPromise(drain(fx), options)
