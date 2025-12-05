import type * as Cause from "../../../Cause.ts"
import type { Effect } from "../../../Effect.ts"
import { flatMap, map, provide, services } from "../../../Effect.ts"
import type { Layer } from "../../../Layer.ts"
import { effect } from "../../../Layer.ts"
import type { Ref } from "../../../Ref.ts"
import type { Scope } from "../../../Scope.ts"
import * as ServiceMap from "../../../ServiceMap.ts"

/**
 * A Sink is a consumer of values. It consists of two effectful callbacks:
 * one for successful values and one for failures.
 *
 * @since 1.0.0
 * @category models
 */
export interface Sink<A, E = never, R = never> {
  readonly onSuccess: (value: A) => Effect<unknown, never, R>
  readonly onFailure: (cause: Cause.Cause<E>) => Effect<unknown, never, R>
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

  export interface Service<Self, Id extends string, A, E> extends Sink<A, E, Self> {
    readonly id: Id
    readonly service: ServiceMap.Service<Self, Sink<A, E>>
    readonly make: <R = never>(
      onFailure: (cause: Cause.Cause<E>) => Effect<unknown, never, R>,
      onSuccess: (value: A) => Effect<unknown, never, R>
    ) => Layer<Self, never, Exclude<R, Scope>>
  }

  export interface Class<Self, Id extends string, A, E> extends Service<Self, Id, A, E> {
    new(): Service<Self, Id, A, E>
  }
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
  onFailure: (cause: Cause.Cause<E>) => Effect<unknown, never, R>,
  onSuccess: (value: A) => Effect<unknown, never, R>
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
    readonly earlyExit: Effect<never>
  }

  /**
   * A Sink that maintains state.
   * @since 1.0.0
   * @category models
   */
  export interface WithState<A, E, R, B> extends WithEarlyExit<A, E, R> {
    readonly state: Ref<B>
  }

  /**
   * A Sink that maintains state and allows transactional updates via a semaphore.
   * @since 1.0.0
   * @category models
   */
  export interface WithStateSemaphore<A, E, R, B> extends WithEarlyExit<A, E, R> {
    readonly modifyEffect: <C, E2, R2>(
      f: (state: B) => Effect<readonly [C, B], E2, R2>
    ) => Effect<C, E | E2, R | R2>

    readonly updateEffect: <E2, R2>(
      f: (state: B) => Effect<B, E2, R2>
    ) => Effect<B, E | E2, R | R2>

    readonly get: Effect<B, E, R>
  }
}

export function Service<Self, A, E = never>() {
  return <const Id extends string>(id: Id): Sink.Class<Self, Id, A, E> => {
    const service = ServiceMap.Service<Self, Sink<A, E>>(id)

    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
    return class SinkService {
      static readonly id = id
      static readonly service = service

      static readonly make = <R = never, R2 = never>(
        onFailure: (cause: Cause.Cause<E>) => Effect<unknown, never, R>,
        onSuccess: (value: A) => Effect<unknown, never, R2>
      ): Layer<Self, never, Exclude<R | R2, Scope>> =>
        effect(
          service,
          map(services<R | R2>(), (context) =>
            make(
              (cause) => provide(onFailure(cause), context),
              (value) => provide(onSuccess(value), context)
            ))
        )

      static readonly onSuccess = (value: A) => flatMap(service.asEffect(), (sink) => sink.onSuccess(value))

      static readonly onFailure = (cause: Cause.Cause<E>) =>
        flatMap(service.asEffect(), (sink) => sink.onFailure(cause))

      constructor() {
        return SinkService
      }
    } as unknown as Sink.Class<Self, Id, A, E>
  }
}
