import { dual } from "../../../../Function.ts"
import type { Fx } from "../Fx.ts"
import { slice } from "./slice.ts"

/**
 * Skips the first `n` elements of an Fx.
 *
 * @param n - The number of elements to skip.
 * @returns An `Fx` that emits values after the first `n` elements.
 * @since 1.0.0
 * @category combinators
 */
export const skip: {
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
): Fx<A, E, R> => slice(fx, { skip: n, take: Infinity }))
