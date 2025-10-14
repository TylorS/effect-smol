import type * as Effect from "../../Effect.ts"
import type { Stream } from "../../stream/index.ts"
import type { Fx } from "../fx/Fx.ts"
import type { RenderEvent } from "./RenderEvent.ts"

export type Renderable<A extends Renderable.Primitive, E = never, R = never> =
  | A
  | { readonly [key: string]: unknown } // TODO: How to better handle .data and ...spread attributes???
  | ReadonlyArray<Renderable<A, E, R>>
  | Effect.Effect<A, E, R>
  | Stream.Stream<A, E, R>
  | Fx<A, E, R>

export declare namespace Renderable {
  export type Any = Renderable<any, any, any>

  export type Primitive =
    | string
    | number
    | boolean
    | bigint
    | null
    | undefined
    | void
    | RenderEvent

  export type Services<T> = [T] extends [never] ? never
    : [T] extends [Effect.Effect<infer _A, infer _E, infer _R>] ? _R
    : [T] extends [Stream.Stream<infer _A, infer _E, infer _R>] ? _R
    : [T] extends [Fx<infer _A, infer _E, infer _R>] ? _R
    : T extends ReadonlyArray<infer _A2> ? Services<_A2>
    : never
  export type Error<T> = [T] extends [never] ? never
    : [T] extends [Effect.Effect<infer _A, infer _E, infer _R>] ? _E
    : [T] extends [Stream.Stream<infer _A, infer _E, infer _R>] ? _E
    : [T] extends [Fx<infer _A, infer _E, infer _R>] ? _E
    : T extends ReadonlyArray<infer _A2> ? Error<_A2>
    : never
  export type Success<T> = [T] extends [never] ? never
    : [T] extends [Effect.Effect<infer _A, infer _E, infer _R>] ? _A
    : [T] extends [Stream.Stream<infer _A, infer _E, infer _R>] ? _A
    : [T] extends [Fx<infer _A, infer _E, infer _R>] ? _A
    : T extends ReadonlyArray<infer _A2> ? Success<_A2>
    : never
}
