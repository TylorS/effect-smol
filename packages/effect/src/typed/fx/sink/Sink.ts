import type * as Cause from "effect/Cause"
import type * as Effect from "effect/Effect"
import type * as Ref from "effect/Ref"

export interface Sink<A, E = never, R = never> {
  readonly onSuccess: (value: A) => Effect.Effect<unknown, never, R>
  readonly onFailure: (cause: Cause.Cause<E>) => Effect.Effect<unknown, never, R>
}

export declare namespace Sink {
  export type Any = Sink<any, any, any>

  export type Success<T> = T extends Sink<infer _A, infer _E, infer _R> ? _A
    : never

  export type Error<T> = T extends Sink<infer _A, infer _E, infer _R> ? _E
    : never

  export type Context<T> = T extends Sink<infer _A, infer _E, infer _R> ? _R
    : never
}

export type Success<T> = Sink.Success<T>
export type Error<T> = Sink.Error<T>
export type Context<T> = Sink.Context<T>

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
  export interface WithEarlyExit<A, E, R> extends Sink<A, E, R> {
    readonly earlyExit: Effect.Effect<never>
  }

  export interface WithState<A, E, R, B> extends WithEarlyExit<A, E, R> {
    readonly state: Ref.Ref<B>
  }

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
