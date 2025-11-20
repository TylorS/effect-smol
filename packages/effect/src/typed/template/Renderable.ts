import type * as Effect from "effect/Effect"
import type { Stream } from "effect/stream"
import type { Fx } from "effect/typed/fx"
import type { RenderEvent } from "./RenderEvent.ts"

export type Renderable<A, E = never, R = never> =
  | A
  | { readonly [key: string]: unknown } // TODO: How to better handle .data and ...spread attributes???
  | ReadonlyArray<Renderable<A, E, R>>
  | Effect.Effect<A, E, R>
  | Stream.Stream<A, E, R>
  | Fx<A, E, R>

export declare namespace Renderable {
  export type Any =
    | Renderable<any, any, any>
    | Renderable<any, never, never>
    | Renderable<never, any, any>
    | Renderable<never, never, any>

  export type Primitive =
    | string
    | number
    | boolean
    | bigint
    | null
    | undefined
    | void
    | RenderEvent

  export type Services<T> =
    | Fx.Services<T>
    | (T extends Stream.Stream<any, any, any> ? Stream.Services<T> : never)
    | Effect.Services<T>

  export type Error<T> =
    | Fx.Error<T>
    | (T extends Stream.Stream<any, any, any> ? Stream.Error<T> : never)
    | Effect.Error<T>

  export type Success<T> =
    | Fx.Success<T>
    | (T extends Stream.Stream<any, any, any> ? Stream.Success<T> : never)
    | Effect.Success<T>
}
