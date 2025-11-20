import { Effect } from "../../../index.ts"
import { make } from "../constructors/make.ts"
import { succeed } from "../constructors/succeed.ts"
import type { Fx } from "../Fx.ts"
import * as Sink from "../sink/index.ts"
import { map } from "./map.ts"

export function tuple<FX extends ReadonlyArray<Fx<any, any, any>>>(
  ...fxs: FX
): Fx<{ readonly [K in keyof FX]: Fx.Success<FX[K]> }, Fx.Error<FX[number]>, Fx.Services<FX[number]>> {
  if (fxs.length === 0) return succeed([] as { readonly [K in keyof FX]: Fx.Success<FX[K]> })
  if (fxs.length === 1) return fxs[0]

  return make(Effect.fn(function*(sink) {
    const values = new Map<number, Fx.Success<FX[number]>>()

    return yield* Effect.forEach(fxs, (fx, i) =>
      fx.run(Sink.make(
        sink.onFailure,
        Effect.fn(function*(value) {
          values.set(i, value)
          if (values.size === fxs.length) {
            yield* sink.onSuccess(
              Array.from({ length: fxs.length }, (_, i) => values.get(i) as Fx.Success<FX[number]>) as {
                readonly [K in keyof FX]: Fx.Success<FX[K]>
              }
            )
          }
        })
      )), { concurrency: "unbounded", discard: true })
  }))
}

export function struct<FXS extends Readonly<Record<string, Fx<any, any, any>>>>(
  fxs: FXS
): Fx<{ readonly [K in keyof FXS]: Fx.Success<FXS[K]> }, Fx.Error<FXS[keyof FXS]>, Fx.Services<FXS[keyof FXS]>> {
  return map(
    tuple(
      ...Object.entries(fxs).map(([key, fx]) => map(fx, (value) => [key, value] as const))
    ),
    Object.fromEntries as (
      entries: ReadonlyArray<readonly [string, any]>
    ) => { readonly [K in keyof FXS]: Fx.Success<FXS[K]> }
  )
}
