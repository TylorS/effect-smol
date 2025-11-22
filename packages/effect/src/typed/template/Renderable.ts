import type * as Effect from "effect/Effect"
import type { Stream } from "effect/stream"
import type { Fx } from "effect/typed/fx"
import type { RenderEvent } from "./RenderEvent.ts"

/**
 * Represents any value that can be rendered into a template.
 *
 * This includes:
 * - Primitives (string, number, boolean, null, undefined)
 * - Arrays of Renderables
 * - Effects that produce a Renderable
 * - Streams (Fx or Stream) that emit Renderables
 * - Objects (typically for setting properties or attributes)
 */
export type Renderable<A, E = never, R = never> =
  | A
  | { readonly [key: string]: unknown } // TODO: How to better handle .data and ...spread attributes???
  | ReadonlyArray<Renderable<A, E, R>>
  | Effect.Effect<A, E, R>
  | Stream.Stream<A, E, R>
  | Fx<A, E, R>

export declare namespace Renderable {
  /**
   * A type alias for any Renderable value with any error/context.
   */
  export type Any =
    | Renderable<any, any, any>
    | Renderable<any, never, never>
    | Renderable<never, any, any>
    | Renderable<never, never, any>

  /**
   * The basic primitive types that can be rendered directly.
   */
  export type Primitive =
    | string
    | number
    | boolean
    | bigint
    | null
    | undefined
    | void
    | RenderEvent

  /**
   * Extracts the required services from a Renderable type.
   */
  export type Services<T> =
    | Fx.Services<T>
    | (T extends Stream.Stream<any, any, any> ? Stream.Services<T> : never)
    | Effect.Services<T>

  /**
   * Extracts the error type from a Renderable type.
   */
  export type Error<T> =
    | Fx.Error<T>
    | (T extends Stream.Stream<any, any, any> ? Stream.Error<T> : never)
    | Effect.Error<T>

  /**
   * Extracts the success type from a Renderable type.
   */
  export type Success<T> =
    | Fx.Success<T>
    | (T extends Stream.Stream<any, any, any> ? Stream.Success<T> : never)
    | Effect.Success<T>
}
