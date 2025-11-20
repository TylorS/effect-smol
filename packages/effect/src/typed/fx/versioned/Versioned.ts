/**
 * Versioned is a special Fx which is also an Effect, and keeps track of a version number of the
 * current value it holds. The Fx portion is used to subscribe to changes, the Effect portion to
 * sample the current value. The version can be utilized to avoid computing work related to this value.
 * @since 1.0.0
 */

import * as Option from "effect/data/Option"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { dual, flow } from "effect/Function"
import type { Layer } from "effect/Layer"
import { sum } from "effect/Number"
import type * as Scope from "effect/Scope"
import * as FxCombinators from "../core/combinators/index.ts"
import * as FxCtor from "../core/constructors/index.ts"
import type * as Fx from "../core/Fx.ts"
import { MulticastEffect } from "../core/internal/multicast.ts"
import { YieldableFx } from "../core/internal/yieldable.ts"
import type { Sink } from "../Sink/Sink.ts"
import * as Subject from "../Subject/Subject.ts"

// TODO: dualize
// TODO: context abstraction
// TODO: More operators

export interface Versioned<out R1, out E1, out A2, out E2, out R2, out A3, out E3, out R3>
  extends Fx.Fx<A2, E2, R2>, Effect.Yieldable<Versioned<R1, E1, A2, E2, R2, A3, E3, R3>, A3, E3, R3>
{
  readonly version: Effect.Effect<number, E1, R1>
  readonly interrupt: Effect.Effect<void, never, R2>
}

export namespace Versioned {
  export type Unify<T> = T extends
    Versioned<infer R1, infer E1, infer R2, infer E2, infer A2, infer R3, infer E3, infer A3> | infer _
    ? Versioned<R1, E1, A2, E2, R2, A3, E3, R3>
    : never

  export type VersionContext<T> = T extends Versioned<infer R, any, any, any, any, any, any, any> ? R : never

  export type VersionError<T> = T extends Versioned<any, infer E, any, any, any, any, any, any> ? E : never
}

export function make<R1, E1, A2, E2, R2, A3, E3, R3>(
  version: Effect.Effect<number, E1, R1>,
  fx: Fx.Fx<A2, E2, R2>,
  effect: Effect.Yieldable<any, A3, E3, R3>
): Versioned<R1, E1, A2, E2, R2, A3, E3, R3> {
  return new VersionedImpl(version, fx, effect.asEffect())
}

class VersionedImpl<R1, E1, A2, E2, R2, A3, E3, R3> extends YieldableFx<A2, E2, R2, A3, E3, R3>
  implements Versioned<R1, E1, A2, E2, R2, A3, E3, R3>
{
  readonly version: Effect.Effect<number, E1, R1>
  readonly fx: Fx.Fx<A2, E2, R2>
  readonly effect: MulticastEffect<A3, E3, R3>

  constructor(
    version: Effect.Effect<number, E1, R1>,
    fx: Fx.Fx<A2, E2, R2>,
    effect: Effect.Effect<A3, E3, R3>
  ) {
    super()
    this.version = version
    this.fx = fx
    this.effect = new MulticastEffect(effect)
  }

  run<R3>(sink: Sink<A2, E2, R3>): Effect.Effect<unknown, never, R2 | R3> {
    return this.fx.run(sink)
  }

  toEffect(): Effect.Effect<A3, E3, R3> {
    return this.effect.asEffect()
  }

  interrupt = Effect.suspend(() => this.effect.interrupt())
}

export function transform<R0, E0, A, E, R, B, E2, R2, C, E3, R3, D, E4, R4>(
  input: Versioned<R0, E0, A, E, R, B, E2, R2>,
  transformFx: (fx: Fx.Fx<A, E, R>) => Fx.Fx<C, E3, R3>,
  transformGet: (effect: Effect.Effect<B, E2, R2>) => Effect.Effect<D, E4, R4>
): Versioned<never, never, C, E3, R3, D, E0 | E4, R0 | R4> {
  if (isVersionedTransform(input)) {
    return new VersionedTransform(
      input.input,
      flow(input._transformFx, transformFx),
      flow(input._transformEffect, transformGet)
    )
  } else {
    return new VersionedTransform(input, transformFx, transformGet)
  }
}

/**
 * @internal
 */
export class VersionedTransform<R0, E0, A, E, R, B, E2, R2, C, E3, R3, D, E4, R4>
  extends YieldableFx<C, E3, R3, D, E0 | E4, R0 | R4>
  implements Versioned<never, never, C, E3, R3, D, E0 | E4, R0 | R4>
{
  public _version = -1
  public _currentValue: Option.Option<Exit.Exit<D, E0 | E4>> = Option.none()
  public _fx: Fx.Fx<C, E3, R3>

  readonly input: Versioned<R0, E0, A, E, R, B, E2, R2>
  readonly _transformFx: (fx: Fx.Fx<A, E, R>) => Fx.Fx<C, E3, R3>
  readonly _transformEffect: (effect: Effect.Effect<B, E2, R2>) => Effect.Effect<D, E4, R4>

  constructor(
    input: Versioned<R0, E0, A, E, R, B, E2, R2>,
    _transformFx: (fx: Fx.Fx<A, E, R>) => Fx.Fx<C, E3, R3>,
    _transformEffect: (effect: Effect.Effect<B, E2, R2>) => Effect.Effect<D, E4, R4>
  ) {
    super()

    this.input = input
    this._transformFx = _transformFx
    this._transformEffect = _transformEffect
    this._fx = _transformFx(this.input)
  }

  readonly version = Effect.sync(() => this._version)

  run<R5>(sink: Sink<C, E3, R5>): Effect.Effect<unknown, never, R3 | R5> {
    return this._fx.run(sink)
  }

  toEffect(): Effect.Effect<D, E0 | E4, R0 | R4> {
    const transformed = this._transformEffect(this.input as any as Effect.Effect<B, E2, R2>)
    const update = (v: number) =>
      Effect.tapCause(
        Effect.tap(
          transformed,
          (value) =>
            Effect.sync(() => {
              this._currentValue = Option.some(Exit.succeed(value))
              this._version = v
            })
        ),
        (cause) =>
          Effect.sync(() => {
            this._currentValue = Option.some(Exit.failCause(cause))
            this._version = v
          })
      )

    const multicastEffect = new MulticastEffect(Effect.flatMap(this.input.version, (version) => {
      if (version === this._version && Option.isSome(this._currentValue)) {
        return this._currentValue.value
      }

      return update(version)
    }))

    return multicastEffect.asEffect()
  }

  interrupt: Effect.Effect<void, never, never> = Effect.suspend(() => {
    if (!this._effect) return Effect.void
    const me = this._effect as unknown as MulticastEffect<D, E0 | E4, R0 | R4>
    return me.interrupt()
  })
}

function isVersionedTransform(
  u: unknown
): u is VersionedTransform<any, any, any, any, any, any, any, any, any, any, any, any, any, any> {
  return u instanceof VersionedTransform
}

/**
 * Transform a Versioned's output value as both an Fx and Effect.
 * @since 1.18.0
 * @category combinators
 */
export const map: {
  <A, E, R, C, B, D>(
    options: {
      onFx: (a: A) => C
      onEffect: (b: B) => D
    }
  ): <R0, E0, R2, E2>(
    versioned: Versioned<R0, E0, A, E, R, B, E2, R2>
  ) => Versioned<never, never, C, E, R, D, E0 | E2, R0 | R2>

  <R0, E0, A, E, R, B, E2, R2, C, D>(
    versioned: Versioned<R0, E0, A, E, R, B, E2, R2>,
    options: {
      onFx: (a: A) => C
      onEffect: (b: B) => D
    }
  ): Versioned<never, never, C, E, R, D, E0 | E2, R0 | R2>
} = dual(2, function map<R0, E0, A, E, R, B, E2, R2, C, D>(
  versioned: Versioned<R0, E0, A, E, R, B, E2, R2>,
  options: {
    onFx: (a: A) => C
    onEffect: (b: B) => D
  }
): Versioned<never, never, C, E, R, D, E0 | E2, R0 | R2> {
  return transform(versioned, (fx) => FxCombinators.map(fx, options.onFx), Effect.map(options.onEffect))
})

/**
 * Transform a Versioned's output value as both an Fx and Effect using an Effect.
 * @since 1.18.0
 * @category combinators
 */
export const mapEffect: {
  <A, C, E3, R3, B, D, E4, R4>(
    options: { onFx: (a: A) => Effect.Effect<C, E3, R3>; onEffect: (b: B) => Effect.Effect<D, E4, R4> }
  ): <R0, E0, R, E, R2, E2>(
    versioned: Versioned<R0, E0, A, E, R, B, E2, R2>
  ) => Versioned<never, never, C, E | E3, R | R3, D, E0 | E2 | E4, R0 | R2 | R4>

  <R0, E0, A, E, R, B, E2, R2, C, E3, R3, D, E4, R4>(
    versioned: Versioned<R0, E0, A, E, R, B, E2, R2>,
    options: { onFx: (a: A) => Effect.Effect<C, E3, R3>; onEffect: (b: B) => Effect.Effect<D, E4, R4> }
  ): Versioned<never, never, C, E | E3, R | R3, D, E0 | E2 | E4, R0 | R2 | R4>
} = dual(2, function mapEffect<R0, E0, A, E, R, B, E2, R2, C, E3, R3, D, E4, R4>(
  versioned: Versioned<R0, E0, A, E, R, B, E2, R2>,
  options: {
    onFx: (a: A) => Effect.Effect<C, E3, R3>
    onEffect: (b: B) => Effect.Effect<D, E4, R4>
  }
): Versioned<never, never, C, E | E3, R | R3, D, E0 | E2 | E4, R0 | R2 | R4> {
  return transform(versioned, (fx) => FxCombinators.mapEffect(fx, options.onFx), Effect.flatMap(options.onEffect))
})

/**
 * @since 1.0.0
 */
export function tuple<const VS extends ReadonlyArray<Versioned<any, any, any, any, any, any, any, any>>>(
  versioneds: VS
): Versioned<
  Versioned.VersionContext<VS[number]>,
  Versioned.VersionError<VS[number]>,
  { readonly [K in keyof VS]: Effect.Success<VS[K]> },
  Fx.Error<VS[number]>,
  Fx.Services<VS[number]>,
  { readonly [K in keyof VS]: Fx.Success<VS[K]> },
  Effect.Error<VS[number]>,
  Effect.Services<VS[number]>
> {
  return make(
    Effect.map(Effect.all(versioneds.map((v) => v.version)), (versions) => versions.reduce(sum, 0)),
    FxCombinators.tuple(...versioneds),
    Effect.all(versioneds.map((v) => v.asEffect()), { concurrency: "unbounded" })
  ) as any
}

/**
 * @since 1.0.0
 */
export function struct<const VS extends Readonly<Record<string, Versioned<any, any, any, any, any, any, any, any>>>>(
  versioneds: VS
): Versioned<
  Versioned.VersionContext<VS[keyof VS]>,
  Versioned.VersionError<VS[keyof VS]>,
  { readonly [K in keyof VS]: Fx.Success<VS[K]> },
  Fx.Error<VS[keyof VS]>,
  Fx.Services<VS[keyof VS]>,
  { readonly [K in keyof VS]: Effect.Success<VS[K]> },
  Effect.Error<VS[keyof VS]>,
  Effect.Services<VS[keyof VS]>
> {
  return make(
    Effect.map(Effect.all(Object.values(versioneds).map((v) => v.version)), (versions) => versions.reduce(sum, 0)),
    FxCombinators.struct(versioneds),
    Effect.all(mapRecord(versioneds, (v) => v.asEffect()), { concurrency: "unbounded" }) as any
  )
}

/**
 * @since 1.0.0
 */
export const provide = <R0, E0, A, E, R, B, E2, R2, R3 = never, S = never>(
  versioned: Versioned<R0, E0, A, E, R, B, E2, R2>,
  layer: Layer<S, never, R3>
): Versioned<R3 | Exclude<R0, S>, E0, A, E, R3 | Exclude<R, S>, B, E2, R3 | Exclude<R2, S>> => {
  return make(
    Effect.provide(versioned.version, layer),
    FxCombinators.provide(versioned, layer),
    Effect.provide(versioned.asEffect(), layer)
  )
}

function mapRecord<K extends string, V, R>(record: Record<K, V>, f: (v: V, k: K) => R): Record<K, R> {
  return Object.fromEntries(Object.entries<V>(record).map(([k, v]) => [k, f(v, k as K)])) as Record<K, R>
}

export function of<A>(value: A): Versioned<never, never, A, never, never, A, never, never> {
  return make(Effect.succeed(1), FxCtor.succeed(value), Effect.succeed(value))
}

export function hold<R0, E0, A, E, R, B, E2, R2>(
  versioned: Versioned<R0, E0, A, E, R, B, E2, R2>
): Versioned<R0, E0, A, E, R | Scope.Scope, B, E2, R2> {
  return make(
    versioned.version,
    Subject.hold(versioned),
    versioned
  )
}

export function multicast<R0, E0, A, E, R, B, E2, R2>(
  versioned: Versioned<R0, E0, A, E, R, B, E2, R2>
): Versioned<R0, E0, A, E, R | Scope.Scope, B, E2, R2> {
  return make(
    versioned.version,
    Subject.multicast(versioned),
    versioned
  )
}

export function replay<R0, E0, A, E, R, B, E2, R2>(
  versioned: Versioned<R0, E0, A, E, R, B, E2, R2>,
  bufferSize: number
): Versioned<R0, E0, A, E, R | Scope.Scope, B, E2, R2> {
  return make(
    versioned.version,
    Subject.replay(versioned, bufferSize),
    versioned
  )
}
