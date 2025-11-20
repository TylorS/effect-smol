import * as Effect from "effect/Effect"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"

export const mergeAll = <FX extends ReadonlyArray<Fx<any, any, any>>>(
  ...fx: FX
): Fx<Fx.Success<FX[number]>, Fx.Error<FX[number]>, Fx.Services<FX[number]>> =>
  make<Fx.Success<FX[number]>, Fx.Error<FX[number]>, Fx.Services<FX[number]>>((sink) =>
    Effect.forEach(fx, (fx) => fx.run(sink), { concurrency: fx.length, discard: true })
  )
