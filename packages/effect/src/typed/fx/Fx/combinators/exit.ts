import type * as Exit from "effect/Exit"
import * as sinkCore from "../../Sink/combinators.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"

/**
 * Materializes the success and failure of an Fx into `Exit` values.
 *
 * @param fx - The `Fx` stream.
 * @returns An `Fx` emitting `Exit<A, E>`.
 * @since 1.0.0
 * @category combinators
 */
export const exit = <A, E, R>(fx: Fx<A, E, R>): Fx<Exit.Exit<A, E>, never, R> =>
  make<Exit.Exit<A, E>, never, R>((sink) => fx.run(sinkCore.exit(sink)))
