import type * as Effect from "effect/Effect"
import { type Pipeable } from "effect/interfaces/Pipeable"
import type { Types } from "effect/types"
import type * as Sink from "../Sink/Sink.ts"
import type { FxTypeId } from "./TypeId.ts"

/**
 * `Fx` is a reactive stream of values that supports concurrency, error handling,
 * and context management, fully integrated with the Effect ecosystem.
 *
 * Conceptually, an `Fx<A, E, R>` is a push-based stream that:
 * - Emits values of type `A`
 * - Can fail with an error of type `E`
 * - Requires a context/environment of type `R`
 *
 * Unlike a standard `Effect` which produces a single value, `Fx` can produce
 * 0, 1, or many values over time. It is similar to RxJS Observables or
 * AsyncIterables, but built on top of Effect's fiber-based concurrency model.
 *
 * @since 1.0.0
 * @category models
 */
export interface Fx<A, E = never, R = never> extends Pipeable {
  readonly [FxTypeId]: Fx.Variance<A, E, R>
  /**
   * Runs the Fx stream by providing a Sink to consume the values.
   * The result is an Effect that runs the stream process.
   */
  readonly run: <RSink>(sink: Sink.Sink<A, E, RSink>) => Effect.Effect<unknown, never, R | RSink>
}

export declare namespace Fx {
  /**
   * Any Fx type with wildcards.
   * @since 1.0.0
   * @category models
   */
  export type Any = Fx<any, any, any>

  /**
   * Variance markers for Fx types.
   * @since 1.0.0
   * @category models
   */
  export interface Variance<A, E, R> {
    readonly _A: Types.Covariant<A>
    readonly _E: Types.Covariant<E>
    readonly _R: Types.Covariant<R>
  }

  /**
   * Extract the success type from an Fx.
   * @since 1.0.0
   * @category type-level
   */
  export type Success<T> = [T] extends [never] ? never
    : T extends Fx<infer _A, infer _E, infer _R> ? _A
    : never

  /**
   * Extract the error type from an Fx.
   * @since 1.0.0
   * @category type-level
   */
  export type Error<T> = [T] extends [never] ? never
    : T extends Fx<infer _A, infer _E, infer _R> ? _E
    : never

  /**
   * Extract the required services from an Fx.
   * @since 1.0.0
   * @category type-level
   */
  export type Services<T> = [T] extends [never] ? never
    : [T] extends [Fx<infer _A, infer _E, infer _R>] ? _R
    : never
}

/**
 * Extract the success type from an Fx.
 * @since 1.0.0
 * @category type-level
 */
export type Success<T> = Fx.Success<T>

/**
 * Extract the error type from an Fx.
 * @since 1.0.0
 * @category type-level
 */
export type Error<T> = Fx.Error<T>

/**
 * Extract the required services from an Fx.
 * @since 1.0.0
 * @category type-level
 */
export type Services<T> = Fx.Services<T>
