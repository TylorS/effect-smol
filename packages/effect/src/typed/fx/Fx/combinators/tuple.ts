import * as Effect from "effect/Effect"
import * as Sink from "../../Sink/index.ts"
import { make } from "../constructors/make.ts"
import { succeed } from "../constructors/succeed.ts"
import type { Fx } from "../Fx.ts"
import { map } from "./map.ts"

/**
 * Combines multiple Fx streams into a single Fx that emits a tuple of the latest values from each stream.
 * The resulting Fx waits for all input streams to emit at least once before emitting the first tuple.
 * Afterwards, it emits a new tuple whenever any input stream emits a new value.
 *
 * @param fxs - The Fx streams to combine.
 * @returns An `Fx` emitting tuples of values.
 * @since 1.0.0
 * @category combinators
 */
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

/**
 * Combines a record of Fx streams into a single Fx that emits a record of the latest values.
 * Similar to `tuple`, but for objects.
 *
 * @param fxs - A record of Fx streams.
 * @returns An `Fx` emitting records of values.
 * @since 1.0.0
 * @category combinators
 */
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
