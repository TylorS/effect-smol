/**
 * @since 1.0.0
 */
import type * as Duration from "effect/Duration"
import type * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import type * as Schema from "effect/schema/Schema"
import type * as Scope from "effect/Scope"
import type * as FC from "effect/testing/FastCheck"
import * as V from "vitest"
import {
  fx,
  fxCause,
  type FxCauseTestParams,
  fxError,
  type FxErrorTestParams,
  type FxTestParams
} from "./internal/fx.ts"
import * as internal from "./internal/internal.ts"

/**
 * @since 1.0.0
 */
export * from "vitest"

/**
 * @since 1.0.0
 */
export type API = V.TestAPI<{}>

/**
 * @since 1.0.0
 */
export namespace Vitest {
  /**
   * @since 1.0.0
   */
  export interface TestFunction<A, E, R, TestArgs extends Array<any>> {
    (...args: TestArgs): Effect.Effect<A, E, R>
  }

  /**
   * @since 1.0.0
   */
  export interface Test<R> {
    <A, E>(
      name: string,
      self: TestFunction<A, E, R, [V.TestContext]>,
      timeout?: number | V.TestOptions
    ): void
  }

  /**
   * @since 1.0.0
   */
  export type Arbitraries =
    | Array<Schema.Schema<any> | FC.Arbitrary<any>>
    | { [K in string]: Schema.Schema<any> | FC.Arbitrary<any> }

  export type FxTest = <A, E, R = never, E2 = never>(
    name: string,
    params: FxTestParams<A, E, R, E2>,
    timeout?: number | V.TestOptions
  ) => void

  export type FxTesterNoLive = FxTest & {
    only: FxTest
    skip: FxTest
    skipIf: (condition: () => boolean) => FxTest
    runIf: (condition: () => boolean) => FxTest
  }

  export type FxTester = FxTesterNoLive & {
    live: FxTesterNoLive
  }

  export type FxCauseTest = <A, E, R = never, E2 = never>(
    name: string,
    params: FxCauseTestParams<A, E, R, E2>,
    timeout?: number | V.TestOptions
  ) => void

  export type FxCauseTesterNoLive = FxCauseTest & {
    only: FxCauseTest
    skip: FxCauseTest
    skipIf: (condition: () => boolean) => FxCauseTest
    runIf: (condition: () => boolean) => FxCauseTest
  }

  export type FxCauseTester = FxCauseTesterNoLive & {
    live: FxCauseTesterNoLive
  }

  export type FxErrorTest = <A, E, R = never, E2 = never>(
    name: string,
    params: FxErrorTestParams<A, E, R, E2>,
    timeout?: number | V.TestOptions
  ) => void

  export type FxErrorTesterNoLive = FxErrorTest & {
    only: FxErrorTest
    skip: FxErrorTest
    skipIf: (condition: () => boolean) => FxErrorTest
    runIf: (condition: () => boolean) => FxErrorTest
  }

  export type FxErrorTester = FxErrorTesterNoLive & {
    live: FxErrorTesterNoLive
  }

  /**
   * @since 1.0.0
   */
  export interface Tester<R> extends Vitest.Test<R> {
    skip: Vitest.Test<R>
    skipIf: (condition: unknown) => Vitest.Test<R>
    runIf: (condition: unknown) => Vitest.Test<R>
    only: Vitest.Test<R>
    each: <T>(
      cases: ReadonlyArray<T>
    ) => <A, E>(name: string, self: TestFunction<A, E, R, [T, V.TestContext]>, timeout?: number | V.TestOptions) => void
    fails: Vitest.Test<R>

    /**
     * @since 1.0.0
     */
    prop: <const Arbs extends Arbitraries, A, E>(
      name: string,
      arbitraries: Arbs,
      self: TestFunction<
        A,
        E,
        R,
        [
          {
            [K in keyof Arbs]: Arbs[K] extends FC.Arbitrary<infer T> ? T
              : Arbs[K] extends Schema.Schema<infer T> ? T
              : never
          },
          V.TestContext
        ]
      >,
      timeout?:
        | number
        | V.TestOptions & {
          fastCheck?: FC.Parameters<
            {
              [K in keyof Arbs]: Arbs[K] extends FC.Arbitrary<infer T> ? T : Arbs[K] extends Schema.Schema<infer T> ? T
              : never
            }
          >
        }
    ) => void
  }

  /**
   * @since 1.0.0
   */
  export interface MethodsNonLive<R = never> extends API {
    readonly effect: Vitest.Tester<R | Scope.Scope>
    readonly flakyTest: <A, E, R2>(
      self: Effect.Effect<A, E, R2 | Scope.Scope>,
      timeout?: Duration.DurationInput
    ) => Effect.Effect<A, never, R2>
    readonly layer: <R2, E>(layer: Layer.Layer<R2, E, R>, options?: {
      readonly timeout?: Duration.DurationInput
    }) => {
      (f: (it: Vitest.MethodsNonLive<R | R2>) => void): void
      (
        name: string,
        f: (it: Vitest.MethodsNonLive<R | R2>) => void
      ): void
    }

    /**
     * @since 1.0.0
     */
    readonly prop: <const Arbs extends Arbitraries>(
      name: string,
      arbitraries: Arbs,
      self: (
        properties: {
          [K in keyof Arbs]: Arbs[K] extends FC.Arbitrary<infer T> ? T : Arbs[K] extends Schema.Schema<infer T> ? T
          : never
        },
        ctx: V.TestContext
      ) => void,
      timeout?:
        | number
        | V.TestOptions & {
          fastCheck?: FC.Parameters<
            {
              [K in keyof Arbs]: Arbs[K] extends FC.Arbitrary<infer T> ? T : Arbs[K] extends Schema.Schema<infer T> ? T
              : never
            }
          >
        }
    ) => void

    readonly fx: FxTester
    readonly fxCause: FxCauseTester
    readonly fxError: FxErrorTester
  }

  /**
   * @since 1.0.0
   */
  export interface Methods<R = never> extends MethodsNonLive<R> {
    readonly live: Vitest.Tester<Scope.Scope | R>
  }
}

/**
 * @since 1.0.0
 */
export const addEqualityTesters: () => void = internal.addEqualityTesters

/**
 * @since 1.0.0
 */
export const effect: Vitest.Tester<Scope.Scope> = internal.effect

/**
 * @since 1.0.0
 */
export const live: Vitest.Tester<Scope.Scope> = internal.live

/**
 * Share a `Layer` between multiple tests, optionally wrapping
 * the tests in a `describe` block if a name is provided.
 *
 * @since 1.0.0
 *
 * ```ts
 * import { expect, layer } from "@effect/vitest"
 * import { Effect, Layer } from "effect"
 * import { ServiceMap } from "effect"
 *
 * class Foo extends ServiceMap.Service("Foo")<Foo, "foo">() {
 *   static Live = Layer.succeed(Foo, "foo")
 * }
 *
 * class Bar extends ServiceMap.Service("Bar")<Bar, "bar">() {
 *   static Live = Layer.effect(
 *     Bar,
 *     Effect.map(Foo, () => "bar" as const)
 *   )
 * }
 *
 * layer(Foo.Live)("layer", (it) => {
 *   it.effect("adds context", () =>
 *     Effect.gen(function* () {
 *       const foo = yield* Foo
 *       expect(foo).toEqual("foo")
 *     })
 *   )
 *
 *   it.layer(Bar.Live)("nested", (it) => {
 *     it.effect("adds context", () =>
 *       Effect.gen(function* () {
 *         const foo = yield* Foo
 *         const bar = yield* Bar
 *         expect(foo).toEqual("foo")
 *         expect(bar).toEqual("bar")
 *       })
 *     )
 *   })
 * })
 * ```
 */
export const layer: <R, E>(
  layer_: Layer.Layer<R, E>,
  options?: {
    readonly memoMap?: Layer.MemoMap
    readonly timeout?: Duration.DurationInput
    readonly excludeTestServices?: boolean
  }
) => {
  (f: (it: Vitest.MethodsNonLive<R>) => void): void
  (name: string, f: (it: Vitest.MethodsNonLive<R>) => void): void
} = internal.layer

/**
 * @since 1.0.0
 */
export const flakyTest: <A, E, R>(
  self: Effect.Effect<A, E, R | Scope.Scope>,
  timeout?: Duration.DurationInput
) => Effect.Effect<A, never, R> = internal.flakyTest

/**
 * @since 1.0.0
 */
export const prop: Vitest.Methods["prop"] = internal.prop

/**
 * @since 1.0.0
 */

/** @ignored */
const methods = { effect, live, flakyTest, layer, prop, fx, fxCause, fxError } as const

/**
 * @since 1.0.0
 */
export const it: Vitest.Methods = Object.assign(V.it, methods)

/**
 * @since 1.0.0
 */
export const makeMethods: (it: V.TestAPI) => Vitest.Methods = internal.makeMethods

/**
 * @since 1.0.0
 */
export const describeWrapped: (name: string, f: (it: Vitest.Methods) => void) => V.SuiteCollector =
  internal.describeWrapped
