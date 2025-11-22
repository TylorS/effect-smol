import { dual } from "effect/Function"
import * as sinkCore from "../../Sink/combinators.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"

/**
 * Defines the bounds for slicing an Fx stream.
 * @since 1.0.0
 * @category models
 */
export interface Bounds {
  readonly skip: number
  readonly take: number
}

/**
 * Slices an Fx by skipping a number of elements and then taking a number of elements.
 *
 * @param bounds - The `Bounds` specifying how many elements to skip and take.
 * @returns An `Fx` representing the slice.
 * @since 1.0.0
 * @category combinators
 */
export const slice: {
  (
    bounds: Bounds
  ): <A, E, R>(fx: Fx<A, E, R>) => Fx<A, E, R>

  <A, E, R>(
    fx: Fx<A, E, R>,
    bounds: Bounds
  ): Fx<A, E, R>
} = dual(2, <A, E, R>(
  fx: Fx<A, E, R>,
  bounds: Bounds
): Fx<A, E, R> => make<A, E, R>((sink) => sinkCore.slice(sink, bounds, (sink) => fx.run(sink))))
