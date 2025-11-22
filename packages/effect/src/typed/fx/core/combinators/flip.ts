import * as sinkCore from "../../Sink/combinators.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"

/**
 * Flips the error and success channels of an Fx.
 *
 * @param fx - The `Fx` stream.
 * @returns An `Fx` where errors are successes and successes are errors.
 * @since 1.0.0
 * @category combinators
 */
export const flip = <A, E, R>(fx: Fx<A, E, R>): Fx<E, A, R> => make<E, A, R>((sink) => fx.run(sinkCore.flip(sink)))
