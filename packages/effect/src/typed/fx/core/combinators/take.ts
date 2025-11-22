import { dual } from "effect/Function"
import type { Fx } from "../Fx.ts"
import { slice } from "./slice.ts"

/**
 * Takes the first `n` elements from an Fx and then completes.
 *
 * @param n - The number of elements to take.
 * @returns An `Fx` that emits at most `n` elements.
 * @since 1.0.0
 * @category combinators
 */
export const take: {
  (
    n: number
  ): <A, E, R>(fx: Fx<A, E, R>) => Fx<A, E, R>

  <A, E, R>(
    fx: Fx<A, E, R>,
    n: number
  ): Fx<A, E, R>
} = dual(2, <A, E, R>(
  fx: Fx<A, E, R>,
  n: number
): Fx<A, E, R> => slice(fx, { skip: 0, take: n }))
