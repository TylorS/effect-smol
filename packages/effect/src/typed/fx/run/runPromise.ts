import type { RunOptions } from "../../../Effect.ts"
import * as Effect from "../../../Effect.ts"
import type * as Exit from "../../../Exit.ts"
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
