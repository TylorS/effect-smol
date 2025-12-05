import * as Effect from "../../../../Effect.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"

/**
 * Merges multiple Fx streams into a single Fx that emits values from all input streams concurrently.
 *
 * @param fx - The Fx streams to merge.
 * @returns An `Fx` that emits values from all input streams.
 * @since 1.0.0
 * @category combinators
 */
export const mergeAll = <FX extends ReadonlyArray<Fx<any, any, any>>>(
  ...fx: FX
): Fx<Fx.Success<FX[number]>, Fx.Error<FX[number]>, Fx.Services<FX[number]>> =>
  make<Fx.Success<FX[number]>, Fx.Error<FX[number]>, Fx.Services<FX[number]>>((sink) =>
    Effect.forEach(fx, (fx) => fx.run(sink), { concurrency: fx.length, discard: true })
  )
