import type * as Cause from "effect/Cause"
import type * as Effect from "effect/Effect"
import type * as Ref from "effect/Ref"

/**
 * A Sink is a consumer of values. It consists of two effectful callbacks:
 * one for successful values and one for failures.
 *
 * @since 1.0.0
 * @category models
 */
export interface Sink<A, E = never, R = never> {
  readonly onSuccess: (value: A) => Effect.Effect<unknown, never, R>
  readonly onFailure: (cause: Cause.Cause<E>) => Effect.Effect<unknown, never, R>
}

export declare namespace Sink {
  /**
   * Any Sink type with wildcards.
   * @since 1.0.0
   * @category models
   */
  export type Any = Sink<any, any, any>

  /**
   * Extract the success type from a Sink.
   * @since 1.0.0
   * @category type-level
   */
  export type Success<T> = T extends Sink<infer _A, infer _E, infer _R> ? _A
    : never

  /**
   * Extract the error type from a Sink.
   * @since 1.0.0
   * @category type-level
   */
  export type Error<T> = T extends Sink<infer _A, infer _E, infer _R> ? _E
    : never

  /**
   * Extract the context required by a Sink.
   * @since 1.0.0
   * @category type-level
   */
  export type Context<T> = T extends Sink<infer _A, infer _E, infer _R> ? _R
    : never
}

export type Success<T> = Sink.Success<T>
export type Error<T> = Sink.Error<T>
export type Context<T> = Sink.Context<T>

/**
 * Creates a Sink from success and failure callbacks.
 *
 * @param onFailure - Callback for handling failures.
 * @param onSuccess - Callback for handling successful values.
 * @returns A `Sink`.
 * @since 1.0.0
 * @category constructors
 */
export function make<A, E = never, R = never, R2 = never>(
  onFailure: (cause: Cause.Cause<E>) => Effect.Effect<unknown, never, R>,
  onSuccess: (value: A) => Effect.Effect<unknown, never, R>
): Sink<A, E, R | R2> {
  return {
    onSuccess,
    onFailure
  }
}

export declare namespace Sink {
  /**
   * A Sink that can signal early termination.
   * @since 1.0.0
   * @category models
   */
  export interface WithEarlyExit<A, E, R> extends Sink<A, E, R> {
    readonly earlyExit: Effect.Effect<never>
  }

  /**
   * A Sink that maintains state.
   * @since 1.0.0
   * @category models
   */
  export interface WithState<A, E, R, B> extends WithEarlyExit<A, E, R> {
    readonly state: Ref.Ref<B>
  }

  /**
   * A Sink that maintains state and allows transactional updates via a semaphore.
   * @since 1.0.0
   * @category models
   */
  export interface WithStateSemaphore<A, E, R, B> extends WithEarlyExit<A, E, R> {
    readonly modifyEffect: <C, E2, R2>(
      f: (state: B) => Effect.Effect<readonly [C, B], E2, R2>
    ) => Effect.Effect<C, E | E2, R | R2>

    readonly updateEffect: <E2, R2>(
      f: (state: B) => Effect.Effect<B, E2, R2>
    ) => Effect.Effect<B, E | E2, R | R2>

    readonly get: Effect.Effect<B, E, R>
  }
}
