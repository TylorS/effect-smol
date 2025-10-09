import { assert, it as effectIt } from "@effect/vitest"
import { type Cause } from "effect"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import * as Fx from "../fx/index.ts"

export type FxTestParams<A, E, R = never, E2 = never> = IsProvided<R> extends true ? {
    readonly actual: Fx.Fx<A, E, R | Scope.Scope>
    readonly expected: ReadonlyArray<A>
    readonly layer?: Layer.Layer<Exclude<R, Scope.Scope>, E2>
  } :
  {
    readonly actual: Fx.Fx<A, E, R | Scope.Scope>
    readonly expected: ReadonlyArray<A>
    readonly layer: Layer.Layer<Exclude<R, Scope.Scope>, E2>
  }

type IsProvided<R> = [R] extends [never] ? true : [R] extends [Scope.Scope] ? true : false

const fx = <A, E, R = never, E2 = never>(name: string, params: FxTestParams<A, E, R, E2>) =>
  effectIt.effect(
    name,
    Effect.fn(function*() {
      const actual = yield* Fx.collectAll(params.actual).pipe(
        Effect.provide((params.layer ?? Layer.empty) as Layer.Layer<R, E2>)
      )
      assert.deepStrictEqual(actual, params.expected)
    })
  )

fx.only = <A, E, R = never, E2 = never>(name: string, params: FxTestParams<A, E, R, E2>) =>
  effectIt.effect.only(
    name,
    Effect.fn(function*() {
      const actual = yield* Fx.collectAll(params.actual).pipe(
        Effect.provide((params.layer ?? Layer.empty) as Layer.Layer<R, E2>)
      )
      assert.deepStrictEqual(actual, params.expected)
    })
  )

const fxLive = <A, E, R = never, E2 = never>(name: string, params: FxTestParams<A, E, R, E2>) =>
  effectIt.live(
    name,
    Effect.fn(function*() {
      const actual = yield* Fx.collectAll(params.actual).pipe(
        Effect.provide((params.layer ?? Layer.empty) as Layer.Layer<R, E2>)
      )
      assert.deepStrictEqual(actual, params.expected)
    })
  )

fxLive.only = <A, E, R = never, E2 = never>(name: string, params: FxTestParams<A, E, R, E2>) =>
  effectIt.live.only(
    name,
    Effect.fn(function*() {
      const actual = yield* Fx.collectAll(params.actual).pipe(
        Effect.provide((params.layer ?? Layer.empty) as Layer.Layer<R, E2>)
      )
      assert.deepStrictEqual(actual, params.expected)
    })
  )

fx.live = fxLive

export type FxErrorTestParams<A, E, R = never, E2 = never> = IsProvided<R> extends true ? {
    readonly actual: Fx.Fx<A, E, R>
    readonly expected: E
    readonly layer?: Layer.Layer<R, E2>
  } :
  {
    readonly actual: Fx.Fx<A, E, R>
    readonly expected: E
    readonly layer: Layer.Layer<R, E2>
  }

const fxError = <A, E, R = never, E2 = never>(name: string, params: FxErrorTestParams<A, E, R, E2>) =>
  effectIt.effect(
    name,
    Effect.fn(function*() {
      const [error] = yield* Fx.collectUpTo(Fx.flip(params.actual), 1).pipe(
        Effect.provide((params.layer ?? Layer.empty) as Layer.Layer<R, E2>)
      )
      assert.deepStrictEqual(error, params.expected)
    })
  )

fxError.only = <A, E, R = never, E2 = never>(name: string, params: FxErrorTestParams<A, E, R, E2>) =>
  effectIt.effect.only(
    name,
    Effect.fn(function*() {
      const [error] = yield* Fx.collectUpTo(Fx.flip(params.actual), 1).pipe(
        Effect.provide((params.layer ?? Layer.empty) as Layer.Layer<R, E2>)
      )
      assert.deepStrictEqual(error, params.expected)
    })
  )

const fxErrorLive = <A, E, R = never, E2 = never>(name: string, params: FxErrorTestParams<A, E, R, E2>) =>
  effectIt.live(
    name,
    Effect.fn(function*() {
      const [error] = yield* Fx.collectUpTo(Fx.flip(params.actual), 1).pipe(
        Effect.provide((params.layer ?? Layer.empty) as Layer.Layer<R, E2>)
      )
      assert.deepStrictEqual(error, params.expected)
    })
  )

fxErrorLive.only = <A, E, R = never, E2 = never>(name: string, params: FxErrorTestParams<A, E, R, E2>) =>
  effectIt.live.only(
    name,
    Effect.fn(function*() {
      const [error] = yield* Fx.collectUpTo(Fx.flip(params.actual), 1).pipe(
        Effect.provide((params.layer ?? Layer.empty) as Layer.Layer<R, E2>)
      )
      assert.deepStrictEqual(error, params.expected)
    })
  )

fxError.live = fxErrorLive

export type FxCauseTestParams<A, E, R = never, E2 = never> = IsProvided<R> extends true ? {
    readonly actual: Fx.Fx<A, E, R>
    readonly expected: Cause.Cause<E>
    readonly layer?: Layer.Layer<R, E2>
  } :
  {
    readonly actual: Fx.Fx<A, E, R>
    readonly expected: Cause.Cause<E>
    readonly layer: Layer.Layer<R, E2>
  }

const fxCause = <A, E, R = never, E2 = never>(name: string, params: FxCauseTestParams<A, E, R, E2>) =>
  effectIt.effect(
    name,
    Effect.fn(function*() {
      const [cause] = yield* Fx.collectUpTo(Fx.causes(params.actual), 1).pipe(
        Effect.provide((params.layer ?? Layer.empty) as Layer.Layer<R, E2>)
      )
      assert.deepStrictEqual(cause, params.expected)
    })
  )

fxCause.only = <A, E, R = never, E2 = never>(name: string, params: FxCauseTestParams<A, E, R, E2>) =>
  effectIt.effect.only(
    name,
    Effect.fn(function*() {
      const [cause] = yield* Fx.collectUpTo(Fx.causes(params.actual), 1).pipe(
        Effect.provide((params.layer ?? Layer.empty) as Layer.Layer<R, E2>)
      )
      assert.deepStrictEqual(cause, params.expected)
    })
  )

const fxCauseLive = <A, E, R = never, E2 = never>(name: string, params: FxCauseTestParams<A, E, R, E2>) =>
  effectIt.live(
    name,
    Effect.fn(function*() {
      const [cause] = yield* Fx.collectUpTo(Fx.causes(params.actual), 1).pipe(
        Effect.provide((params.layer ?? Layer.empty) as Layer.Layer<R, E2>)
      )
      assert.deepStrictEqual(cause, params.expected)
    })
  )

fxCauseLive.only = <A, E, R = never, E2 = never>(name: string, params: FxCauseTestParams<A, E, R, E2>) =>
  effectIt.live.only(
    name,
    Effect.fn(function*() {
      const [cause] = yield* Fx.collectUpTo(Fx.causes(params.actual), 1).pipe(
        Effect.provide((params.layer ?? Layer.empty) as Layer.Layer<R, E2>)
      )
      assert.deepStrictEqual(cause, params.expected)
    })
  )

fxCause.live = fxCauseLive

export * from "@effect/vitest"

export const it = {
  ...effectIt,
  fx,
  fxError,
  fxCause
} as typeof effectIt & {
  fx: typeof fx
  fxError: typeof fxError
  fxCause: typeof fxCause
}
