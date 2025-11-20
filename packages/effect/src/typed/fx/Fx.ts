import type * as Effect from "../../Effect.ts"
import { type Pipeable } from "../../interfaces/Pipeable.ts"
import type { Types } from "../../types/index.ts"
import type * as Sink from "./sink/Sink.ts"
import type { FxTypeId } from "./TypeId.ts"

export interface Fx<A, E = never, R = never> extends Pipeable {
  readonly [FxTypeId]: Fx.Variance<A, E, R>
  readonly run: <RSink>(sink: Sink.Sink<A, E, RSink>) => Effect.Effect<unknown, never, R | RSink>
}

export declare namespace Fx {
  export type Any = Fx<any, any, any>

  export interface Variance<A, E, R> {
    readonly _A: Types.Covariant<A>
    readonly _E: Types.Covariant<E>
    readonly _R: Types.Covariant<R>
  }

  export type Success<T> = [T] extends [never] ? never
    : T extends Fx<infer _A, infer _E, infer _R> ? _A
    : never

  export type Error<T> = [T] extends [never] ? never
    : T extends Fx<infer _A, infer _E, infer _R> ? _E
    : never

  export type Services<T> = [T] extends [never] ? never
    : [T] extends [Fx<infer _A, infer _E, infer _R>] ? _R
    : never
}

export type Success<T> = Fx.Success<T>
export type Error<T> = Fx.Error<T>
export type Services<T> = Fx.Services<T>
