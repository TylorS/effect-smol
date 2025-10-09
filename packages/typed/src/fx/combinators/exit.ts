import type * as Exit from "effect/Exit"
import * as sinkCore from "../../sink/combinators.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"

export const exit = <A, E, R>(fx: Fx<A, E, R>): Fx<Exit.Exit<A, E>, never, R> =>
  make<Exit.Exit<A, E>, never, R>((sink) => fx.run(sinkCore.exit(sink)))
