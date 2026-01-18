/**
 * Push is a type of Fx that can be used to push values to a sink.
 */

import type * as Cause from "../../../Cause.ts"
import * as Effect from "../../../Effect.ts"
import { dual, identity } from "../../../Function.ts"
import * as Layer from "../../../Layer.ts"
import type * as Option from "../../../Option.ts"
import { pipeArguments } from "../../../Pipeable.ts"
import type * as Scope from "../../../Scope.ts"
import * as ServiceMap from "../../../ServiceMap.ts"
import * as Fx from "../Fx.ts"
import { FxTypeId } from "../Fx/TypeId.ts"
import * as Sink from "../Sink.ts"

/**
 * Push is an abstract type which represents a Type which is both an Fx and a Sink. The type parameters
 * are decoupled from one another and allow mapping over the input and output of the Push separately for
 * more complex use cases.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import * as Push from "@typed/fx/Push"
 * import { Fx } from "@typed/fx"
 * import * as Sink from "@typed/fx/Sink"
 *
 * const program = Effect.gen(function* () {
 *   // Create a Push that accepts numbers and emits strings
 *   const push = Push.make(
 *     Sink.make(
 *       (cause) => Effect.sync(() => console.log("Error:", cause)),
 *       (value) => Effect.sync(() => console.log("Received:", value))
 *     ),
 *     Fx.succeed("Hello")
 *   )
 *
 *   // Push a value to the sink
 *   yield* push.onSuccess(42)
 *   // Output: "Received: 42"
 *
 *   // Observe the Fx output
 *   yield* Fx.observe(push, (value) =>
 *     Effect.sync(() => console.log("Emitted:", value))
 *   )
 *   // Output: "Emitted: Hello"
 * })
 * ```
 *
 * @since 1.0.0
 * @category models
 */
export interface Push<in A, in E, out R, out B, out E2, out R2> extends Sink.Sink<A, E, R>, Fx.Fx<B, E2, R2> {}

export namespace Push {
  export type Any = Push<any, any, any, any, any, any>

  export interface Service<Self, Id extends string, A, E, B, E2> extends Push<A, E, Self, B, E2, Self> {
    readonly id: Id
    readonly service: ServiceMap.Service<Self, Push<A, E, never, B, E2, never>>
    readonly make: <R = never, R2 = never>(
      sink: Sink.Sink<A, E, R>,
      fx: Fx.Fx<B, E2, R2>
    ) => Layer.Layer<Self, never, Exclude<R | R2, Scope.Scope>>
  }

  export interface Class<Self, Id extends string, A, E, B, E2> extends Service<Self, Id, A, E, B, E2> {
    new(): Service<Self, Id, A, E, B, E2>
  }
}

/**
 * Creates a `Push` from a `Sink` and an `Fx`.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import * as Push from "@typed/fx/Push"
 * import { Fx } from "@typed/fx"
 * import * as Sink from "@typed/fx/Sink"
 *
 * const program = Effect.gen(function* () {
 *   const sink = Sink.make(
 *     (cause) => Effect.sync(() => console.log("Failed:", cause)),
 *     (value) => Effect.sync(() => console.log("Success:", value))
 *   )
 *
 *   const fx = Fx.succeed("Output")
 *
 *   const push = Push.make(sink, fx)
 *
 *   // Push a value
 *   yield* push.onSuccess(42)
 *   // Output: "Success: 42"
 *
 *   // Observe the Fx
 *   yield* Fx.observe(push, (value) =>
 *     Effect.sync(() => console.log("Emitted:", value))
 *   )
 *   // Output: "Emitted: Output"
 * })
 * ```
 *
 * @since 1.0.0
 * @category constructors
 */
export const make: {
  <B, E2, R2>(fx: Fx.Fx<B, E2, R2>): <A, E, R>(sink: Sink.Sink<A, E, R>) => Push<A, E, R, B, E2, R2>
  <A, E, R, B, E2, R2>(sink: Sink.Sink<A, E, R>, fx: Fx.Fx<B, E2, R2>): Push<A, E, R, B, E2, R2>
} = dual(2, function make<A, E, R, B, E2, R2>(
  sink: Sink.Sink<A, E, R>,
  fx: Fx.Fx<B, E2, R2>
): Push<A, E, R, B, E2, R2> {
  return new PushImpl(sink, fx)
})

const VARIANCE = {
  _A: identity,
  _E: identity,
  _R: identity
}

class PushImpl<A, E, R, B, E2, R2> implements Push<A, E, R, B, E2, R2> {
  readonly [FxTypeId]: typeof VARIANCE = VARIANCE
  readonly sink: Sink.Sink<A, E, R>
  readonly fx: Fx.Fx<B, E2, R2>

  constructor(sink: Sink.Sink<A, E, R>, fx: Fx.Fx<B, E2, R2>) {
    this.sink = sink
    this.fx = fx

    this.onFailure = this.onFailure.bind(this)
    this.onSuccess = this.onSuccess.bind(this)
  }

  run<R3>(sink: Sink.Sink<B, E2, R3>): Effect.Effect<unknown, never, R2 | R3> {
    return this.fx.run(sink)
  }

  onFailure(cause: Cause.Cause<E>): Effect.Effect<unknown, never, R> {
    return this.sink.onFailure(cause)
  }

  onSuccess(value: A): Effect.Effect<unknown, never, R> {
    return this.sink.onSuccess(value)
  }

  pipe() {
    return pipeArguments(this, arguments)
  }
}

/**
 * Maps over the input (Sink) side of a `Push`.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import * as Push from "@typed/fx/Push"
 * import { Fx } from "@typed/fx"
 * import * as Sink from "@typed/fx/Sink"
 *
 * const program = Effect.gen(function* () {
 *   const push = Push.make(
 *     Sink.make(
 *       (cause) => Effect.void,
 *       (value) => Effect.sync(() => console.log("Number:", value))
 *     ),
 *     Fx.succeed("Output")
 *   )
 *
 *   // Map input from string to number
 *   const mapped = Push.mapInput(push, (str: string) => parseInt(str))
 *
 *   // Push a string, which gets converted to a number
 *   yield* mapped.onSuccess("42")
 *   // Output: "Number: 42"
 * })
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export const mapInput: {
  <P extends Push.Any, C>(
    f: (c: C) => Sink.Success<P>
  ): (
    push: P
  ) => Push<Sink.Context<P>, Sink.Error<P>, C, Fx.Fx.Services<P>, Fx.Fx.Error<P>, Fx.Fx.Success<P>>

  <P extends Push.Any, C>(
    push: P,
    f: (c: C) => Sink.Sink.Success<P>
  ): Push<Sink.Sink.Context<P>, Sink.Sink.Error<P>, C, Fx.Fx.Services<P>, Fx.Fx.Error<P>, Fx.Fx.Success<P>>
} = dual(2, function mapInput<P extends Push.Any, C>(
  push: P,
  f: (c: C) => Sink.Success<P>
): Push<Sink.Context<P>, Sink.Error<P>, C, Fx.Fx.Services<P>, Fx.Fx.Error<P>, Fx.Fx.Success<P>> {
  return make(
    Sink.map(push, f),
    push
  )
})

export const mapInputEffect: {
  <C, R3, E, A>(
    f: (c: C) => Effect.Effect<A, E, R3>
  ): <R, B, E2, R2>(push: Push<A, E, R, B, E2, R2>) => Push<C, E, R | R3, B, E2, R2>

  <A, E, R, B, E2, R2, R3, C>(
    push: Push<A, E, R, B, E2, R2>,
    f: (c: C) => Effect.Effect<A, E, R3>
  ): Push<C, E, R | R3, B, E2, R2>
} = dual(2, function mapInputEffect<A, E, R, B, E2, R2, R3, C>(
  push: Push<A, E, R, B, E2, R2>,
  f: (c: C) => Effect.Effect<A, E, R3>
): Push<C, E, R | R3, B, E2, R2> {
  return make(
    Sink.mapEffect(push, f),
    push
  )
})

export const filterInput: {
  <A>(f: (a: A) => boolean): <P extends Push.Any>(
    push: P
  ) => Push<Sink.Context<P>, Sink.Error<P>, A, Fx.Fx.Services<P>, Fx.Fx.Error<P>, Fx.Fx.Success<P>>
  <A, E, R, B, E2, R2>(push: Push<A, E, R, B, E2, R2>, f: (a: A) => boolean): Push<A, E, R, B, E2, R2>
} = dual(2, function filterInput<A, E, R, B, E2, R2>(
  push: Push<A, E, R, B, E2, R2>,
  f: (a: A) => boolean
): Push<A, E, R, B, E2, R2> {
  return make(
    Sink.filter(push, f),
    push
  )
})

export const filterInputEffect: {
  <A, R3, E>(f: (a: A) => Effect.Effect<boolean, E, R3>): <R, B, E2, R2>(
    push: Push<A, E, R, B, E2, R2>
  ) => Push<A, E, R | R3, B, E2, R2>

  <A, E, R, B, E2, R2, R3>(
    push: Push<A, E, R, B, E2, R2>,
    f: (a: A) => Effect.Effect<boolean, E, R3>
  ): Push<A, E, R | R3, B, E2, R2>
} = dual(2, function filterInputEffect<A, E, R, B, E2, R2, R3>(
  push: Push<A, E, R, B, E2, R2>,
  f: (a: A) => Effect.Effect<boolean, E, R3>
): Push<A, E, R | R3, B, E2, R2> {
  return make(
    Sink.filterEffect<A, E, R | R3>(push, f),
    push
  )
})

export const filterMapInput: {
  <C, A>(f: (c: C) => Option.Option<A>): <P extends Push.Any>(
    push: P
  ) => Push<C, Sink.Error<P>, Sink.Context<P>, Fx.Fx.Success<P>, Fx.Fx.Error<P>, Fx.Fx.Services<P>>
  <A, E, R, B, E2, R2, C>(push: Push<A, E, R, B, E2, R2>, f: (c: C) => Option.Option<A>): Push<C, E, R, B, E2, R2>
} = dual(2, function filterMapInput<A, E, R, B, E2, R2, C>(
  push: Push<A, E, R, B, E2, R2>,
  f: (c: C) => Option.Option<A>
): Push<C, E, R, B, E2, R2> {
  return make(
    Sink.filterMap(push, f),
    push
  )
})

export const filterMapInputEffect: {
  <C, R3, E, A>(f: (c: C) => Effect.Effect<Option.Option<A>, E, R3>): <R, B, E2, R2>(
    push: Push<A, E, R, B, E2, R2>
  ) => Push<C, E, R | R3, B, E2, R2>
  <A, E, R, B, E2, R2, R3, C>(
    push: Push<A, E, R, B, E2, R2>,
    f: (c: C) => Effect.Effect<Option.Option<A>, E, R3>
  ): Push<C, E, R | R3, B, E2, R2>
} = dual(2, function filterMapInputEffect<A, E, R, B, E2, R2, R3, C>(
  push: Push<A, E, R, B, E2, R2>,
  f: (c: C) => Effect.Effect<Option.Option<A>, E, R3>
): Push<C, E, R | R3, B, E2, R2> {
  return make(
    Sink.filterMapEffect(push, f),
    push
  )
})

/**
 * Maps over the output (Fx) side of a `Push`.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import * as Push from "@typed/fx/Push"
 * import { Fx } from "@typed/fx"
 * import * as Sink from "@typed/fx/Sink"
 *
 * const program = Effect.gen(function* () {
 *   const push = Push.make(
 *     Sink.make(
 *       (cause) => Effect.void,
 *       (value) => Effect.void
 *     ),
 *     Fx.succeed(42)
 *   )
 *
 *   // Map output from number to string
 *   const mapped = Push.map(push, (n) => `Number: ${n}`)
 *
 *   // Observe the mapped output
 *   yield* Fx.observe(mapped, (value) =>
 *     Effect.sync(() => console.log(value))
 *   )
 *   // Output: "Number: 42"
 * })
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export const map: {
  <B, C>(f: (b: B) => C): <A, E, R, E2, R2>(push: Push<A, E, R, B, E2, R2>) => Push<A, E, R, C, E2, R2>
  <A, E, R, B, E2, R2, C>(push: Push<A, E, R, B, E2, R2>, f: (b: B) => C): Push<A, E, R, C, E2, R2>
} = dual(2, function map<A, E, R, B, E2, R2, C>(
  push: Push<A, E, R, B, E2, R2>,
  f: (b: B) => C
): Push<A, E, R, C, E2, R2> {
  return make(
    push,
    Fx.map(push, f)
  )
})

export const mapEffect: {
  <B, C, E3, R3>(f: (b: B) => Effect.Effect<C, E3, R3>): <A, E, R, E2, R2>(
    push: Push<A, E, R, B, E2, R2>
  ) => Push<A, E, R, C, E2 | E3, R2 | R3>
  <A, E, R, B, E2, R2, C, E3, R3>(
    push: Push<A, E, R, B, E2, R2>,
    f: (b: B) => Effect.Effect<C, E3, R3>
  ): Push<A, E, R, C, E2 | E3, R2 | R3>
} = dual(2, function mapEffect<A, E, R, B, E2, R2, C, E3, R3>(
  push: Push<A, E, R, B, E2, R2>,
  f: (b: B) => Effect.Effect<C, E3, R3>
): Push<A, E, R, C, E2 | E3, R2 | R3> {
  return make(
    push,
    Fx.mapEffect(push, f)
  )
})

export const filter: {
  <B>(f: (b: B) => boolean): <A, E, R, E2, R2>(push: Push<A, E, R, B, E2, R2>) => Push<A, E, R, B, E2, R2>
  <A, E, R, B, E2, R2>(push: Push<A, E, R, B, E2, R2>, f: (b: B) => boolean): Push<A, E, R, B, E2, R2>
} = dual(2, function filter<A, E, R, B, E2, R2>(
  push: Push<A, E, R, B, E2, R2>,
  f: (b: B) => boolean
): Push<A, E, R, B, E2, R2> {
  return make(
    push,
    Fx.filter(push, f)
  )
})

export const filterEffect: {
  <B, R3, E3>(f: (b: B) => Effect.Effect<boolean, E3, R3>): <A, E, R, E2, R2>(
    push: Push<A, E, R, B, E2, R2>
  ) => Push<A, E, R, B, E2 | E3, R2 | R3>
  <A, E, R, B, E2, R2, R3, E3>(
    push: Push<A, E, R, B, E2, R2>,
    f: (b: B) => Effect.Effect<boolean, E3, R3>
  ): Push<A, E, R, B, E2 | E3, R2 | R3>
} = dual(2, function filterEffect<A, E, R, B, E2, R2, R3, E3>(
  push: Push<A, E, R, B, E2, R2>,
  f: (b: B) => Effect.Effect<boolean, E3, R3>
): Push<A, E, R, B, E2 | E3, R2 | R3> {
  return make(
    push,
    Fx.filterEffect(push, f)
  )
})

export const filterMap: {
  <B, C>(f: (b: B) => Option.Option<C>): <A, E, R, E2, R2>(
    push: Push<A, E, R, B, E2, R2>
  ) => Push<A, E, R, C, E2, R2>
  <A, E, R, B, E2, R2, C>(push: Push<A, E, R, B, E2, R2>, f: (b: B) => Option.Option<C>): Push<A, E, R, C, E2, R2>
} = dual(2, function filterMap<A, E, R, B, E2, R2, C>(
  push: Push<A, E, R, B, E2, R2>,
  f: (b: B) => Option.Option<C>
): Push<A, E, R, C, E2, R2> {
  return make(
    push,
    Fx.filterMap(push, f)
  )
})

export const filterMapEffect: {
  <B, C, E3, R3>(f: (b: B) => Effect.Effect<Option.Option<C>, E3, R3>): <A, E, R, E2, R2>(
    push: Push<A, E, R, B, E2, R2>
  ) => Push<A, E, R, C, E2 | E3, R2 | R3>
  <A, E, R, B, E2, R2, C, E3, R3>(
    push: Push<A, E, R, B, E2, R2>,
    f: (b: B) => Effect.Effect<Option.Option<C>, E3, R3>
  ): Push<A, E, R, C, E2 | E3, R2 | R3>
} = dual(2, function filterMapEffect<A, E, R, B, E2, R2, C, E3, R3>(
  push: Push<A, E, R, B, E2, R2>,
  f: (b: B) => Effect.Effect<Option.Option<C>, E3, R3>
): Push<A, E, R, C, E2 | E3, R2 | R3> {
  return make(
    push,
    Fx.filterMapEffect(push, f)
  )
})

/**
 * Transforms each output value into a new `Fx`, switching to the latest inner `Fx` when a new value arrives.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import * as Push from "@typed/fx/Push"
 * import { Fx } from "@typed/fx"
 * import * as Sink from "@typed/fx/Sink"
 *
 * const program = Effect.gen(function* () {
 *   const push = Push.make(
 *     Sink.make(
 *       (cause) => Effect.void,
 *       (value) => Effect.void
 *     ),
 *     Fx.succeed(1)
 *   )
 *
 *   // Switch to a new Fx for each value
 *   const switched = Push.switchMap(push, (n) =>
 *     Fx.fromIterable([n, n * 2, n * 3])
 *   )
 *
 *   // Only the latest Fx's values are emitted
 *   yield* Fx.observe(switched, (value) =>
 *     Effect.sync(() => console.log(value))
 *   )
 * })
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export const switchMap: {
  <B, C, E3, R3>(f: (b: B) => Fx.Fx<C, E3, R3>): <A, E, R, E2, R2>(
    push: Push<A, E, R, B, E2, R2>
  ) => Push<A, E, R, Scope.Scope | C, E2 | E3, R2 | R3>
  <A, E, R, B, E2, R2, C, E3, R3>(
    push: Push<A, E, R, B, E2, R2>,
    f: (b: B) => Fx.Fx<C, E3, R3>
  ): Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope>
} = dual(2, function switchMap<A, E, R, B, E2, R2, C, E3, R3>(
  push: Push<A, E, R, B, E2, R2>,
  f: (b: B) => Fx.Fx<C, E3, R3>
): Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope> {
  return make(
    push,
    Fx.switchMap(push, f)
  )
})

export const switchMapEffect: {
  <B, C, E3, R3>(f: (b: B) => Effect.Effect<C, E3, R3>): <A, E, R, E2, R2>(
    push: Push<A, E, R, B, E2, R2>
  ) => Push<A, E, R, Scope.Scope | C, E2 | E3, R2 | R3>
  <A, E, R, B, E2, R2, C, E3, R3>(
    push: Push<A, E, R, B, E2, R2>,
    f: (b: B) => Effect.Effect<C, E3, R3>
  ): Push<A, E, R, Scope.Scope | C, E2 | E3, R2 | R3>
} = dual(2, function switchMapEffect<A, E, R, B, E2, R2, C, E3, R3>(
  push: Push<A, E, R, B, E2, R2>,
  f: (b: B) => Effect.Effect<C, E3, R3>
): Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope> {
  return make(
    push,
    Fx.switchMapEffect(push, f)
  )
})

/**
 * Transforms each output value into a new `Fx` and merges all inner `Fx` values concurrently.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import * as Push from "@typed/fx/Push"
 * import { Fx } from "@typed/fx"
 * import * as Sink from "@typed/fx/Sink"
 *
 * const program = Effect.gen(function* () {
 *   const push = Push.make(
 *     Sink.make(
 *       (cause) => Effect.void,
 *       (value) => Effect.void
 *     ),
 *     Fx.succeed(1)
 *   )
 *
 *   // FlatMap merges all inner Fx values
 *   const flattened = Push.flatMap(push, (n) =>
 *     Fx.fromIterable([n, n * 2, n * 3])
 *   )
 *
 *   // All values from all inner Fx are emitted
 *   yield* Fx.observe(flattened, (value) =>
 *     Effect.sync(() => console.log(value))
 *   )
 * })
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export const flatMap: {
  <B, C, E3, R3>(f: (b: B) => Fx.Fx<C, E3, R3>): <A, E, R, E2, R2>(
    push: Push<A, E, R, B, E2, R2>
  ) => Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope>
  <A, E, R, B, E2, R2, C, E3, R3>(
    push: Push<A, E, R, B, E2, R2>,
    f: (b: B) => Fx.Fx<C, E3, R3>
  ): Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope>
} = dual(2, function flatMap<A, E, R, B, E2, R2, C, E3, R3>(
  push: Push<A, E, R, B, E2, R2>,
  f: (b: B) => Fx.Fx<C, E3, R3>
): Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope> {
  return make(
    push,
    Fx.flatMap(push, f)
  )
})

export const flatMapEffect: {
  <B, C, E3, R3>(f: (b: B) => Effect.Effect<C, E3, R3>): <A, E, R, E2, R2>(
    push: Push<A, E, R, B, E2, R2>
  ) => Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope>
  <A, E, R, B, E2, R2, C, E3, R3>(
    push: Push<A, E, R, B, E2, R2>,
    f: (b: B) => Effect.Effect<C, E3, R3>
  ): Push<A, E, R, Scope.Scope | C, E2 | E3, R2 | R3>
} = dual(2, function flatMapEffect<A, E, R, B, E2, R2, C, E3, R3>(
  push: Push<A, E, R, B, E2, R2>,
  f: (b: B) => Effect.Effect<C, E3, R3>
): Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope> {
  return make(
    push,
    Fx.flatMapEffect(push, f)
  )
})

export const exhaustMap: {
  <B, C, E3, R3>(f: (b: B) => Fx.Fx<C, E3, R3>): <A, E, R, E2, R2>(
    push: Push<A, E, R, B, E2, R2>
  ) => Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope>
  <A, E, R, B, E2, R2, C, E3, R3>(
    push: Push<A, E, R, B, E2, R2>,
    f: (b: B) => Fx.Fx<C, E3, R3>
  ): Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope>
} = dual(2, function exhaustMap<A, E, R, B, E2, R2, C, E3, R3>(
  push: Push<A, E, R, B, E2, R2>,
  f: (b: B) => Fx.Fx<C, E3, R3>
): Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope> {
  return make(
    push,
    Fx.exhaustMap(push, f)
  )
})

export const exhaustMapEffect: {
  <B, C, E3, R3>(f: (b: B) => Effect.Effect<C, E3, R3>): <A, E, R, E2, R2>(
    push: Push<A, E, R, B, E2, R2>
  ) => Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope>
  <A, E, R, B, E2, R2, C, E3, R3>(
    push: Push<A, E, R, B, E2, R2>,
    f: (b: B) => Effect.Effect<C, E3, R3>
  ): Push<A, E, R, Scope.Scope | C, E2 | E3, R2 | R3>
} = dual(2, function exhaustMapEffect<A, E, R, B, E2, R2, C, E3, R3>(
  push: Push<A, E, R, B, E2, R2>,
  f: (b: B) => Effect.Effect<C, E3, R3>
): Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope> {
  return make(
    push,
    Fx.exhaustMapEffect(push, f)
  )
})

export const exhaustLatestMap: {
  <B, C, E3, R3>(f: (b: B) => Fx.Fx<C, E3, R3>): <A, E, R, E2, R2>(
    push: Push<A, E, R, B, E2, R2>
  ) => Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope>
  <A, E, R, B, E2, R2, C, E3, R3>(
    push: Push<A, E, R, B, E2, R2>,
    f: (b: B) => Fx.Fx<C, E3, R3>
  ): Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope>
} = dual(2, function exhaustLatestMap<A, E, R, B, E2, R2, C, E3, R3>(
  push: Push<A, E, R, B, E2, R2>,
  f: (b: B) => Fx.Fx<C, E3, R3>
): Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope> {
  return make(
    push,
    Fx.exhaustLatestMap(push, f)
  )
})

export const exhaustLatestMapEffect: {
  <B, C, E3, R3>(f: (b: B) => Effect.Effect<C, E3, R3>): <A, E, R, E2, R2>(
    push: Push<A, E, R, B, E2, R2>
  ) => Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope>
  <A, E, R, B, E2, R2, C, E3, R3>(
    push: Push<A, E, R, B, E2, R2>,
    f: (b: B) => Effect.Effect<C, E3, R3>
  ): Push<A, E, R, Scope.Scope | C, E2 | E3, R2 | R3>
} = dual(2, function exhaustLatestMapEffect<A, E, R, B, E2, R2, C, E3, R3>(
  push: Push<A, E, R, B, E2, R2>,
  f: (b: B) => Effect.Effect<C, E3, R3>
): Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope> {
  return make(
    push,
    Fx.exhaustLatestMapEffect(push, f)
  )
})

export function Service<Self, A, E = never, B = never, E2 = never>() {
  return <const Id extends string>(id: Id): Push.Class<Self, Id, A, E, B, E2> => {
    const service = ServiceMap.Service<Self, Push<A, E, never, B, E2, never>>(id)

    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
    return class PushService {
      static readonly id = id
      static readonly service = service

      static readonly make = <R = never, R2 = never>(
        sink: Sink.Sink<A, E, R>,
        fx: Fx.Fx<B, E2, R2>
      ): Layer.Layer<Self, never, Exclude<R | R2, Scope.Scope>> =>
        Layer.effect(
          service,
          Effect.services<R | R2>().pipe(
            Effect.map((services) =>
              make(
                Sink.make(
                  (cause) => Effect.provideServices(sink.onFailure(cause), services),
                  (value) => Effect.provideServices(sink.onSuccess(value), services)
                ),
                Fx.make(<RSink>(sink: Sink.Sink<B, E2, RSink>) =>
                  Effect.services<RSink>().pipe(
                    Effect.flatMap((services2) =>
                      Effect.provideServices(fx.run(sink), ServiceMap.merge(services, services2))
                    )
                  )
                )
              )
            )
          )
        )

      static readonly [FxTypeId] = VARIANCE
      static readonly pipe = function(this: any) {
        return pipeArguments(this, arguments)
      }

      // Fx methods
      static readonly run = <R3>(sink: Sink.Sink<B, E2, R3>) =>
        Effect.flatMap(service.asEffect(), (push) => push.run(sink))

      // Sink methods
      static readonly onSuccess = (value: A) => Effect.flatMap(service.asEffect(), (push) => push.onSuccess(value))
      static readonly onFailure = (cause: Cause.Cause<E>) =>
        Effect.flatMap(service.asEffect(), (push) => push.onFailure(cause))

      constructor() {
        return PushService
      }
    } as unknown as Push.Class<Self, Id, A, E, B, E2>
  }
}
