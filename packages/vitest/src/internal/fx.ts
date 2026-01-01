import type * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import { Fx } from "effect/typed/fx"

import type * as V from "vitest"
import { assert } from "vitest"
import { effect as effectIt, live as liveIt } from "./internal.ts"

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

const runTestFx = <A, E, R = never, E2 = never>(params: FxTestParams<A, E, R, E2>) =>
  Effect.fn(function*() {
    const actual = yield* Fx.collectAll(params.actual).pipe(
      Effect.provide((params.layer ?? Layer.empty) as Layer.Layer<R, E2>)
    )
    assert.deepStrictEqual(actual, params.expected)
  })

export const fx = <A, E, R = never, E2 = never>(
  name: string,
  params: FxTestParams<A, E, R, E2>,
  timeout?: number | V.TestOptions
) => effectIt(name, runTestFx(params), timeout)

fx.only = <A, E, R = never, E2 = never>(
  name: string,
  params: FxTestParams<A, E, R, E2>,
  timeout?: number | V.TestOptions
) => effectIt.only(name, runTestFx(params), timeout)

fx.skip = <A, E, R = never, E2 = never>(
  name: string,
  params: FxTestParams<A, E, R, E2>,
  timeout?: number | V.TestOptions
) => effectIt.skip(name, runTestFx(params), timeout)

fx.skipIf = (condition: () => boolean) =>
<A, E, R = never, E2 = never>(
  name: string,
  params: FxTestParams<A, E, R, E2>,
  timeout?: number | V.TestOptions
) => effectIt.skipIf(condition)(name, runTestFx(params), timeout)

fx.runIf = (condition: () => boolean) =>
<A, E, R = never, E2 = never>(
  name: string,
  params: FxTestParams<A, E, R, E2>,
  timeout?: number | V.TestOptions
) => effectIt.runIf(condition)(name, runTestFx(params), timeout)

const fxLive = <A, E, R = never, E2 = never>(name: string, params: FxTestParams<A, E, R, E2>) =>
  liveIt(name, runTestFx(params))

fxLive.only = <A, E, R = never, E2 = never>(name: string, params: FxTestParams<A, E, R, E2>) =>
  liveIt.only(name, runTestFx(params))

fxLive.skip = <A, E, R = never, E2 = never>(name: string, params: FxTestParams<A, E, R, E2>) =>
  liveIt.skip(name, runTestFx(params))

fxLive.skipIf = (condition: () => boolean) =>
<A, E, R = never, E2 = never>(
  name: string,
  params: FxTestParams<A, E, R, E2>,
  timeout?: number | V.TestOptions
) => liveIt.skipIf(condition)(name, runTestFx(params), timeout)

fxLive.runIf = (condition: () => boolean) =>
<A, E, R = never, E2 = never>(
  name: string,
  params: FxTestParams<A, E, R, E2>,
  timeout?: number | V.TestOptions
) => liveIt.runIf(condition)(name, runTestFx(params), timeout)

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

const runFxError = <A, E, R = never, E2 = never>(params: FxErrorTestParams<A, E, R, E2>) =>
  Effect.fn(function*() {
    const [error] = yield* Fx.collectUpTo(Fx.flip(params.actual), 1).pipe(
      Effect.provide((params.layer ?? Layer.empty) as Layer.Layer<R, E2>)
    )
    assert.deepStrictEqual(error, params.expected)
  })

export const fxError = <A, E, R = never, E2 = never>(
  name: string,
  params: FxErrorTestParams<A, E, R, E2>,
  timeout?: number | V.TestOptions
) =>
  effectIt(
    name,
    runFxError(params),
    timeout
  )

fxError.only = <A, E, R = never, E2 = never>(name: string, params: FxErrorTestParams<A, E, R, E2>) =>
  effectIt.only(name, runFxError(params))

fxError.skip = <A, E, R = never, E2 = never>(name: string, params: FxErrorTestParams<A, E, R, E2>) =>
  effectIt.skip(name, runFxError(params))

fxError.skipIf = (condition: () => boolean) =>
<A, E, R = never, E2 = never>(
  name: string,
  params: FxErrorTestParams<A, E, R, E2>,
  timeout?: number | V.TestOptions
) => effectIt.skipIf(condition)(name, runFxError(params), timeout)

fxError.runIf = (condition: () => boolean) =>
<A, E, R = never, E2 = never>(
  name: string,
  params: FxErrorTestParams<A, E, R, E2>,
  timeout?: number | V.TestOptions
) => effectIt.runIf(condition)(name, runFxError(params), timeout)

const fxErrorLive = <A, E, R = never, E2 = never>(name: string, params: FxErrorTestParams<A, E, R, E2>) =>
  liveIt(name, runFxError(params))

fxErrorLive.only = <A, E, R = never, E2 = never>(name: string, params: FxErrorTestParams<A, E, R, E2>) =>
  liveIt.only(name, runFxError(params))

fxErrorLive.skip = <A, E, R = never, E2 = never>(name: string, params: FxErrorTestParams<A, E, R, E2>) =>
  liveIt.skip(name, runFxError(params))

fxErrorLive.skipIf = (condition: () => boolean) =>
<A, E, R = never, E2 = never>(
  name: string,
  params: FxErrorTestParams<A, E, R, E2>,
  timeout?: number | V.TestOptions
) => liveIt.skipIf(condition)(name, runFxError(params), timeout)

fxErrorLive.runIf = (condition: () => boolean) =>
<A, E, R = never, E2 = never>(
  name: string,
  params: FxErrorTestParams<A, E, R, E2>,
  timeout?: number | V.TestOptions
) => liveIt.runIf(condition)(name, runFxError(params), timeout)

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

const runFxCause = <A, E, R = never, E2 = never>(params: FxCauseTestParams<A, E, R, E2>) =>
  Effect.fn(function*() {
    const [cause] = yield* Fx.collectUpTo(Fx.causes(params.actual), 1).pipe(
      Effect.provide((params.layer ?? Layer.empty) as Layer.Layer<R, E2>)
    )
    assert.deepStrictEqual(cause, params.expected as any)
  })

export const fxCause = <A, E, R = never, E2 = never>(
  name: string,
  params: FxCauseTestParams<A, E, R, E2>,
  timeout?: number | V.TestOptions
) =>
  effectIt(
    name,
    runFxCause(params),
    timeout
  )

fxCause.only = <A, E, R = never, E2 = never>(name: string, params: FxCauseTestParams<A, E, R, E2>) =>
  effectIt.only(name, runFxCause(params))

fxCause.skip = <A, E, R = never, E2 = never>(name: string, params: FxCauseTestParams<A, E, R, E2>) =>
  effectIt.skip(name, runFxCause(params))

fxCause.skipIf = (condition: () => boolean) =>
<A, E, R = never, E2 = never>(
  name: string,
  params: FxCauseTestParams<A, E, R, E2>,
  timeout?: number | V.TestOptions
) => effectIt.skipIf(condition)(name, runFxCause(params), timeout)

fxCause.runIf = (condition: () => boolean) =>
<A, E, R = never, E2 = never>(
  name: string,
  params: FxCauseTestParams<A, E, R, E2>,
  timeout?: number | V.TestOptions
) => effectIt.runIf(condition)(name, runFxCause(params), timeout)

const fxCauseLive = <A, E, R = never, E2 = never>(name: string, params: FxCauseTestParams<A, E, R, E2>) =>
  liveIt(name, runFxCause(params))

fxCauseLive.only = <A, E, R = never, E2 = never>(name: string, params: FxCauseTestParams<A, E, R, E2>) =>
  liveIt.only(name, runFxCause(params))

fxCauseLive.skip = <A, E, R = never, E2 = never>(name: string, params: FxCauseTestParams<A, E, R, E2>) =>
  liveIt.skip(name, runFxCause(params))

fxCauseLive.skipIf = (condition: () => boolean) =>
<A, E, R = never, E2 = never>(
  name: string,
  params: FxCauseTestParams<A, E, R, E2>,
  timeout?: number | V.TestOptions
) => liveIt.skipIf(condition)(name, runFxCause(params), timeout)

fxCauseLive.runIf = (condition: () => boolean) =>
<A, E, R = never, E2 = never>(
  name: string,
  params: FxCauseTestParams<A, E, R, E2>,
  timeout?: number | V.TestOptions
) => liveIt.runIf(condition)(name, runFxCause(params), timeout)

fxCause.live = fxCauseLive
