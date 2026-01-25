import type * as Effect from "../../Effect.ts"
import type * as Stream from "../../Stream.ts"
import type { Fx } from "../fx/Fx.ts"
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
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import { html } from "@typed/template"
 * import { Fx } from "@typed/fx"
 * import * as RefSubject from "@typed/fx/RefSubject"
 *
 * // Primitives
 * const primitive = html`<div>${"Hello"}</div>`
 * const number = html`<div>${42}</div>`
 * const boolean = html`<div>${true}</div>`
 *
 * // Effects
 * const effect = html`<div>${Effect.succeed("Async value")}</div>`
 *
 * // Fx streams (reactive)
 * const count = yield* RefSubject.make(0)
 * const reactive = html`<div>Count: ${count}</div>`
 *
 * // Arrays
 * const items = [1, 2, 3]
 * const list = html`<ul>${items.map((n) => html`<li>${n}</li>`)}</ul>`
 *
 * // Objects (for attributes)
 * const withProps = html`<div .data=${{ foo: "bar" }}></div>`
 * ```
 *
 * @since 1.0.0
 * @category models
 */
export type Renderable<A, E = never, R = never> =
  | A
  | { readonly [key: string]: Renderable<unknown, E, R> } // TODO: How to better handle .data and ...spread attributes???
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

  // Helpers for arbitrary objects

  /**
   * Traverse all keys in an object and extract the services from each value. If
   * the value is a function, extract the services from the return type of the function.
   */
  export type ServicesFromObject<T> = [
    {
      [K in keyof T]: T[K] extends (...args: Array<any>) => any ? Services<ReturnType<T[K]>> : Services<T[K]>
    }[keyof T]
  ] extends [infer U] ? U : never

  /**
   * Traverse all keys in an object and extract the error from each value. If
   * the value is a function, extract the error from the return type of the function.
   */
  export type ErrorFromObject<T> = [
    {
      [K in keyof T]: T[K] extends (...args: Array<any>) => any ? Error<ReturnType<T[K]>> : Error<T[K]>
    }[keyof T]
  ] extends [infer U] ? U : never
}
