import { dual } from "../../../Function.ts"
import type { Fx } from "../Fx.ts"
import { slice } from "./slice.ts"

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
