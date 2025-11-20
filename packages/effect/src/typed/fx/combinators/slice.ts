import { dual } from "../../../Function.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"
import * as sinkCore from "../sink/combinators.ts"

export interface Bounds {
  readonly skip: number
  readonly take: number
}

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
