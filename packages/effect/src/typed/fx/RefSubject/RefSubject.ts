import type * as Cause from "../../../Cause.ts"
import * as Array from "../../../collections/Array.ts"
import type { Equivalence } from "../../../data/Equivalence.ts"
import * as Option from "../../../data/Option.ts"
import * as Effect from "../../../Effect.ts"
import * as Exit from "../../../Exit.ts"
import * as Fiber from "../../../Fiber.ts"
import { dual, identity } from "../../../Function.ts"
import { equals } from "../../../interfaces/Equal.ts"
import { pipeArguments } from "../../../interfaces/Pipeable.ts"
import * as Layer from "../../../Layer.ts"
import * as MutableRef from "../../../MutableRef.ts"
import { sum } from "../../../Number.ts"
import * as Scope from "../../../Scope.ts"
import * as ServiceMap from "../../../ServiceMap.ts"
import type { Bounds } from "../Fx/combinators/slice.ts"
import * as Fx from "../Fx/index.ts"
import * as DeferredRef from "../Fx/internal/DeferredRef.ts"
import { getExitEquivalence } from "../Fx/internal/equivalence.ts"
import type { UnionToTuple } from "../Fx/internal/UnionToTuple.ts"
import { YieldableFx } from "../Fx/internal/yieldable.ts"
import { FxTypeId, isFx } from "../Fx/TypeId.ts"
import * as Sink from "../Sink/Sink.ts"
import * as Subject from "../Subject/Subject.ts"
import * as Versioned from "../Versioned/Versioned.ts"

export const RefSubjectTypeId = Symbol.for("@typed/fx/RefSubject")
export type RefSubjectTypeId = typeof RefSubjectTypeId

export const ComputedTypeId = Symbol.for("@typed/fx/Computed")
export type ComputedTypeId = typeof ComputedTypeId

export const FilteredTypeId = Symbol.for("@typed/fx/Filtered")
export type FilteredTypeId = typeof FilteredTypeId

/**
 * A `Computed` is a read-only view of a value that can change over time.
 * It is an `Fx` that emits the current value and subsequent updates.
 * It is also an `Effect` that samples the current value.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import * as RefSubject from "../../../typed/fx/RefSubject.ts"
 * import { Fx } from "../../../typed/fx.ts"
 *
 * // Create a RefSubject and derive a Computed from it
 * const program = Effect.gen(function* () {
 *   const count = yield* RefSubject.make(0)
 *
 *   // Create a computed that doubles the count
 *   const doubled = RefSubject.map(count, (n) => n * 2)
 *
 *   // Sample the computed value
 *   const value = yield* doubled
 *   console.log(value) // 0
 *
 *   // Update the source
 *   yield* RefSubject.set(count, 5)
 *
 *   // The computed automatically reflects the change
 *   const newValue = yield* doubled
 *   console.log(newValue) // 10
 * })
 * ```
 *
 * @since 1.0.0
 * @category models
 */
export interface Computed<out A, out E = never, out R = never>
  extends Versioned.Versioned<R, E, A, E, R | Scope.Scope, A, E, R>
{
  readonly [ComputedTypeId]: ComputedTypeId
}

export declare namespace Computed {
  export type Any =
    | Computed<any, any, any>
    | Computed<never, any, any>
    | Computed<any, never, any>
    | Computed<never, never, any>
}

/**
 * A `Filtered` is a `Computed` that may not always have a value.
 * It is essentially a `Computed<Option<A>>` with helper methods.
 *
 * @example
 * ```ts
 * import { Effect, Option } from "effect"
 * import * as RefSubject from "../../../typed/fx/RefSubject.ts"
 *
 * // Create a RefSubject and filter it
 * const program = Effect.gen(function* () {
 *   const numbers = yield* RefSubject.make([1, 2, 3, 4, 5])
 *
 *   // Get the first even number (filtered)
 *   const firstEven = RefSubject.filterMap(
 *     numbers,
 *     (arr) => Option.fromNullable(arr.find((n) => n % 2 === 0))
 *   )
 *
 *   // Try to get the value (may fail with NoSuchElementError)
 *   const value = yield* firstEven
 *   console.log(value) // 2
 *
 *   // Or convert back to Option
 *   const option = firstEven.asComputed()
 *   const maybeValue = yield* option
 *   console.log(Option.isSome(maybeValue)) // true
 * })
 * ```
 *
 * @since 1.0.0
 * @category models
 */
export interface Filtered<out A, out E = never, out R = never>
  extends Versioned.Versioned<R, E, A, E, R | Scope.Scope, A, E | Cause.NoSuchElementError, R>
{
  readonly [FilteredTypeId]: FilteredTypeId

  /**
   * Converts the Filtered back to a Computed of Option.
   *
   * @example
   * ```ts
   * import { Effect, Option } from "effect"
   * import * as RefSubject from "../../../typed/fx/RefSubject.ts"
   *
   * const program = Effect.gen(function* () {
   *   const filtered = RefSubject.filterMap(
   *     yield* RefSubject.make([1, 2, 3]),
   *     (arr) => Option.fromNullable(arr.find((n) => n > 5))
   *   )
   *
   *   // Convert to Computed<Option<number>>
   *   const computed = filtered.asComputed()
   *   const option = yield* computed
   *   console.log(Option.isNone(option)) // true (no number > 5)
   * })
   * ```
   */
  asComputed(): Computed<Option.Option<A>, E, R>
}

export declare namespace Filtered {
  export type Any =
    | Filtered<any, any, any>
    | Filtered<never, any, any>
    | Filtered<any, never, any>
    | Filtered<never, never, any>
}

/**
 * Interface for basic RefSubject operations: get, set, delete.
 * @since 1.0.0
 * @category models
 */
export interface GetSetDelete<A, E, R> {
  readonly get: Effect.Effect<A, E, R>
  readonly set: (a: A) => Effect.Effect<A, E, R>
  readonly delete: Effect.Effect<Option.Option<A>, E, R>
}

/**
 * A `RefSubject` is a mutable reference that can be observed as an Fx.
 * It combines the capabilities of a `Ref` (get/set/update) with a `Subject` (subscribe).
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import * as RefSubject from "../../../typed/fx/RefSubject.ts"
 * import { Fx } from "../../../typed/fx.ts"
 *
 * // Create a RefSubject with an initial value
 * const program = Effect.gen(function* () {
 *   const count = yield* RefSubject.make(0)
 *
 *   // Get the current value
 *   const current = yield* count
 *   console.log(current) // 0
 *
 *   // Update the value
 *   yield* RefSubject.set(count, 5)
 *   const updated = yield* count
 *   console.log(updated) // 5
 *
 *   // Use as an Fx to observe changes
 *   yield* Fx.observe(
 *     count,
 *     (value) => Effect.sync(() => console.log("Count changed:", value))
 *   )
 *
 *   // Increment
 *   yield* RefSubject.increment(count)
 *   // Output: "Count changed: 6"
 * })
 * ```
 *
 * @since 1.0.0
 * @category models
 */
export interface RefSubject<A, E = never, R = never> extends Computed<A, E, R>, Subject.Subject<A, E, R> {
  readonly [RefSubjectTypeId]: RefSubjectTypeId

  /**
   * Runs an effect that can modify the RefSubject transactionally.
   * All operations within the transaction are atomic and serialized.
   *
   * @example
   * ```ts
   * import { Effect } from "effect"
   * import * as RefSubject from "../../../typed/fx/RefSubject.ts"
   *
   * const program = Effect.gen(function* () {
   *   const balance = yield* RefSubject.make(100)
   *
   *   // Transfer money atomically
   *   yield* balance.updates((ref) =>
   *     Effect.gen(function* () {
   *       const current = yield* ref.get
   *       if (current >= 50) {
   *         yield* ref.set(current - 50)
   *         return "Transfer successful"
   *       }
   *       return "Insufficient funds"
   *     })
   *   )
   * })
   * ```
   */
  readonly updates: <B, E2, R2>(
    f: (ref: GetSetDelete<A, E, R>) => Effect.Effect<B, E2, R2>
  ) => Effect.Effect<B, E | E2, R | R2>

  /**
   * Interrupts the RefSubject, stopping all subscriptions and cleaning up resources.
   *
   * @example
   * ```ts
   * import { Effect } from "effect"
   * import * as RefSubject from "../../../typed/fx/RefSubject.ts"
   *
   * const program = Effect.gen(function* () {
   *   const ref = yield* RefSubject.make(0)
   *
   *   // Later, clean up
   *   yield* ref.interrupt
   * })
   * ```
   */
  readonly interrupt: Effect.Effect<void, never, R>
}

export declare namespace RefSubject {
  export type Any =
    | RefSubject<any, any, any>
    | RefSubject<any, any>
    | RefSubject<any, never, any>
    | RefSubject<any>

  export interface Service<Self, Id extends string, A, E> extends RefSubject<A, E, Self> {
    readonly id: Id

    readonly service: ServiceMap.Service<Self, RefSubject<A, E>>

    readonly make: <R = never>(
      value: A | Effect.Effect<A, E, R> | Fx.Fx<A, E, R>,
      options?: RefSubjectOptions<A> & { readonly skip?: number; readonly take?: number }
    ) => Layer.Layer<Self, never, Exclude<R, Scope.Scope>>

    readonly layer: <E2, R2>(
      make: Effect.Effect<RefSubject<A, E>, E2, R2 | Scope.Scope>
    ) => Layer.Layer<Self, E2, Exclude<R2, Scope.Scope>>
  }

  export interface Class<Self, Id extends string, A, E> extends RefSubject.Service<Self, Id, A, E> {
    new(): RefSubject.Service<Self, Id, A, E>
  }
}
export const CurrentComputedBehavior = ServiceMap.Reference("@typed/fx/CurrentComputedBehavior", {
  defaultValue: (): "one" | "multiple" => "multiple"
})

const checkIsMultiple = (ctx: ServiceMap.ServiceMap<any>): ctx is ServiceMap.ServiceMap<"multiple"> =>
  ServiceMap.getReferenceUnsafe(ctx, CurrentComputedBehavior) === "multiple"

class ComputedImpl<R0, E0, A, E, R, E2, R2, C, E3, R3> extends Versioned.VersionedTransform<
  R0,
  E0,
  A,
  E,
  R,
  A,
  E2,
  R2,
  C,
  E0 | E | E2 | E3,
  R0 | Exclude<R, Scope.Scope> | R2 | R3 | Scope.Scope,
  C,
  E0 | E | E2 | E3,
  R0 | Exclude<R, Scope.Scope> | R2 | R3
> implements Computed<C, E0 | E | E2 | E3, R0 | Exclude<R, Scope.Scope> | R2 | R3> {
  readonly [ComputedTypeId]: ComputedTypeId = ComputedTypeId
  private _computed: Fx.Fx<C, E0 | E | E2 | E3, R0 | R | Scope.Scope | R2 | R3>

  override input: Versioned.Versioned<R0, E0, A, E, R, A, E2, R2>
  readonly f: (a: A) => Effect.Effect<C, E3, R3>

  constructor(
    input: Versioned.Versioned<R0, E0, A, E, R, A, E2, R2>,
    f: (a: A) => Effect.Effect<C, E3, R3>
  ) {
    super(
      input,
      (fx) => Fx.mapEffect(fx, f) as any,
      Effect.flatMap(f)
    )

    this.input = input
    this.f = f

    this._computed = Subject.hold(Fx.unwrap(
      Effect.map(Effect.services(), (ctx) => {
        if (checkIsMultiple(ctx)) {
          return Fx.fromYieldable(input).pipe(
            Fx.continueWith(() => input),
            Fx.skipRepeats,
            Fx.mapEffect(f)
          )
        }

        return Fx.fromEffect(Effect.flatMap(input.asEffect(), f))
      })
    ))
  }

  override run<RSink>(sink: Sink.Sink<C, E0 | E | E2 | E3, RSink>) {
    return this._computed.run(sink) as any
  }

  toPull() {
    return this.asEffect()
  }
}

export function makeComputed<R0, E0, A, E, R, E2, R2, C, E3, R3>(
  input: Versioned.Versioned<R0, E0, A, E, R, A, E2, R2>,
  f: (a: A) => Effect.Effect<C, E3, R3>
): Computed<C, E0 | E | E2 | E3, R0 | R2 | R3 | Exclude<R, Scope.Scope>> {
  return new ComputedImpl(input, f)
}

export function makeFiltered<R0, E0, A, E, R, E2, R2, C, E3, R3>(
  input: Versioned.Versioned<R0, E0, A, E, R, A, E2, R2>,
  f: (a: A) => Effect.Effect<Option.Option<C>, E3, R3>
): Filtered<C, E0 | E | E2 | E3, R0 | Exclude<R, Scope.Scope> | R2 | R3> {
  return new FilteredImpl(input, f)
}

class FilteredImpl<R0, E0, A, E, R, E2, R2, C, E3, R3> extends Versioned.VersionedTransform<
  R0,
  E0,
  A,
  E,
  R,
  A,
  E2,
  R2,
  C,
  E0 | E | E2 | E3,
  R0 | Exclude<R, Scope.Scope> | R2 | R3 | Scope.Scope,
  C,
  E0 | E | E2 | E3 | Cause.NoSuchElementError,
  R0 | Exclude<R, Scope.Scope> | R2 | R3
> implements Filtered<C, E0 | E | E2 | E3, R0 | Exclude<R, Scope.Scope> | R2 | R3> {
  readonly [FilteredTypeId]: FilteredTypeId = FilteredTypeId
  private _computed: Fx.Fx<C, E0 | E | E2 | E3, R0 | R | Scope.Scope | R2 | R3>

  override input: Versioned.Versioned<R0, E0, A, E, R, A, E2, R2>
  readonly f: (a: A) => Effect.Effect<Option.Option<C>, E3, R3>

  constructor(
    input: Versioned.Versioned<R0, E0, A, E, R, A, E2, R2>,
    f: (a: A) => Effect.Effect<Option.Option<C>, E3, R3>
  ) {
    super(
      input,
      (fx) => Fx.filterMapEffect(fx, f) as any,
      (effect) =>
        Effect.flatMap(
          Effect.flatMap(
            effect,
            f
          ),
          (option) => option.asEffect()
        )
    )

    this.input = input
    this.f = f

    this._computed = Subject.hold(Fx.unwrap(
      Effect.map(Effect.services(), (ctx) => {
        if (checkIsMultiple(ctx)) {
          return Fx.fromYieldable(input).pipe(
            Fx.continueWith(() => input),
            Fx.skipRepeats,
            Fx.filterMapEffect(f)
          )
        }

        return Fx.compact(Fx.fromEffect(Effect.flatMap(input.asEffect(), f)))
      })
    ))
  }

  override run<RSink>(sink: Sink.Sink<C, E0 | E | E2 | E3, RSink>) {
    return this._computed.run(sink) as any
  }

  asComputed(): Computed<Option.Option<C>, E0 | E | E2 | E3, R0 | R2 | R3 | Exclude<R, Scope.Scope>> {
    return new ComputedImpl(this.input, this.f)
  }
}

class RefSubjectCore<A, E, R, R2> {
  readonly initial: Effect.Effect<A, E, R>
  readonly subject: Subject.HoldSubjectImpl<A, E>
  readonly services: ServiceMap.ServiceMap<R2>
  readonly scope: Scope.Closeable
  readonly deferredRef: DeferredRef.DeferredRef<E, A>
  readonly semaphore: Effect.Semaphore
  constructor(
    initial: Effect.Effect<A, E, R>,
    subject: Subject.HoldSubjectImpl<A, E>,
    services: ServiceMap.ServiceMap<R2>,
    scope: Scope.Closeable,
    deferredRef: DeferredRef.DeferredRef<E, A>,
    semaphore: Effect.Semaphore
  ) {
    this.initial = initial
    this.subject = subject
    this.services = services
    this.scope = scope
    this.deferredRef = deferredRef
    this.semaphore = semaphore
  }

  public _fiber: Fiber.Fiber<A, E> | undefined = undefined
}

export interface RefSubjectOptions<A> {
  readonly eq?: Equivalence<A>
}

function getSetDelete<A, E, R, R2>(ref: RefSubjectCore<A, E, R, R2>): GetSetDelete<A, E, Exclude<R, R2>> {
  return {
    get: getOrInitializeCore(ref, false),
    set: (a) => setCore(ref, a),
    delete: deleteCore(ref)
  }
}
class RefSubjectImpl<A, E, R, R2> extends YieldableFx<A, E, Exclude<R, R2> | Scope.Scope, A, E, Exclude<R, R2>>
  implements RefSubject<A, E, Exclude<R, R2>>
{
  readonly [ComputedTypeId]: ComputedTypeId = ComputedTypeId
  readonly [RefSubjectTypeId]: RefSubjectTypeId = RefSubjectTypeId

  readonly version: Effect.Effect<number>
  readonly interrupt: Effect.Effect<void, never, Exclude<R, R2>>
  readonly subscriberCount: Effect.Effect<number, never, Exclude<R, R2>>

  readonly getSetDelete: GetSetDelete<A, E, Exclude<R, R2>>

  readonly core: RefSubjectCore<A, E, R, R2>

  constructor(
    core: RefSubjectCore<A, E, R, R2>
  ) {
    super()

    this.core = core
    this.version = Effect.sync(() => core.deferredRef.version)
    this.interrupt = Effect.provide(interruptCore(core), core.services)
    this.subscriberCount = Effect.provide(core.subject.subscriberCount, core.services)
    this.getSetDelete = getSetDelete(core)

    this.updates = this.updates.bind(this)
    this.onSuccess = this.onSuccess.bind(this)
    this.onFailure = this.onFailure.bind(this)
  }

  run<R3>(sink: Sink.Sink<A, E, R3>): Effect.Effect<unknown, never, Exclude<R, R2> | R3 | Scope.Scope> {
    return Effect.matchCauseEffect(getOrInitializeCore(this.core, true), {
      onFailure: (cause) => sink.onFailure(cause),
      onSuccess: () => Effect.provide(this.core.subject.run(sink), this.core.services)
    })
  }

  updates<R3, E3, B>(
    run: (ref: GetSetDelete<A, E, Exclude<R, R2>>) => Effect.Effect<B, E3, R3>
  ) {
    return this.core.semaphore.withPermits(1)(run(this.getSetDelete))
  }

  onSuccess(value: A): Effect.Effect<unknown, never, Exclude<R, R2>> {
    return setCore(this.core, value)
  }

  onFailure(cause: Cause.Cause<E>): Effect.Effect<unknown, never, Exclude<R, R2>> {
    return onFailureCore(this.core, cause)
  }

  toEffect(): Effect.Effect<A, E, Exclude<R, R2>> {
    return getOrInitializeCore(this.core, true)
  }

  toPull() {
    return this.asEffect()
  }
}

/**
 * Creates a new `RefSubject` from a value, `Effect`, or `Fx`.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import * as RefSubject from "../../../typed/fx/RefSubject.ts"
 * import { Fx } from "../../../typed/fx.ts"
 *
 * // From a plain value
 * const program1 = Effect.gen(function* () {
 *   const ref = yield* RefSubject.make(42)
 *   const value = yield* ref
 *   console.log(value) // 42
 * })
 *
 * // From an Effect
 * const program2 = Effect.gen(function* () {
 *   const ref = yield* RefSubject.make(
 *     Effect.succeed("Hello")
 *   )
 *   const value = yield* ref
 *   console.log(value) // "Hello"
 * })
 *
 * // From an Fx (tracks the latest value)
 * const program3 = Effect.gen(function* () {
 *   const ref = yield* RefSubject.make(
 *     Fx.fromIterable([1, 2, 3])
 *   )
 *   const value = yield* ref
 *   console.log(value) // 3 (latest value)
 * })
 * ```
 *
 * @since 1.0.0
 * @category constructors
 */
export function make<A, E = never, R = never>(
  effect: A | Effect.Effect<A, E, R> | Fx.Fx<A, E, R>,
  options?: RefSubjectOptions<A>
): Effect.Effect<RefSubject<A, E>, never, R | Scope.Scope> {
  if (isFx(effect)) {
    return fromFx(effect, options)
  } else if (Effect.isEffect(effect)) {
    return fromEffect(effect, options)
  } else {
    return fromEffect<A, E, R>(Effect.succeed(effect), options)
  }
}

/**
 * Creates a `RefSubject` from an `Effect`.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import * as RefSubject from "../../../typed/fx/RefSubject.ts"
 *
 * const program = Effect.gen(function* () {
 *   const ref = yield* RefSubject.fromEffect(
 *     Effect.succeed("Initial value")
 *   )
 *
 *   const value = yield* ref
 *   console.log(value) // "Initial value"
 * })
 * ```
 *
 * @since 1.0.0
 * @category constructors
 */
export function fromEffect<A, E, R>(
  effect: Effect.Effect<A, E, R>,
  options?: RefSubjectOptions<A>
): Effect.Effect<RefSubject<A, E>, never, R | Scope.Scope> {
  return Effect.map(makeCore(effect, options), (core) => new RefSubjectImpl(core))
}

/**
 * Creates a `RefSubject` from an `Fx`, tracking the latest emitted value.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import * as RefSubject from "../../../typed/fx/RefSubject.ts"
 * import { Fx } from "../../../typed/fx.ts"
 *
 * const program = Effect.gen(function* () {
 *   // Create an Fx that emits multiple values
 *   const numbers = Fx.fromIterable([1, 2, 3, 4, 5])
 *
 *   // Create a RefSubject that tracks the latest value
 *   const ref = yield* RefSubject.fromFx(numbers)
 *
 *   // Get the latest value
 *   const latest = yield* ref
 *   console.log(latest) // 5
 * })
 * ```
 *
 * @since 1.0.0
 * @category constructors
 */
export function fromFx<A, E, R>(
  fx: Fx.Fx<A, E, R>,
  options?: RefSubjectOptions<A>
): Effect.Effect<RefSubject<A, E>, never, R | Scope.Scope> {
  return Effect.gen(function*() {
    const core = yield* makeDeferredCore<A, E, R>(options)
    const ref = new RefSubjectImpl(core)
    yield* Effect.forkIn(
      fx.run(Sink.make(
        (cause) => onFailureCore(core, cause),
        (value) => setCore(core, value)
      )),
      core.scope,
      { startImmediately: true }
    )
    return ref
  })
}

function makeCore<A, E, R>(
  initial: Effect.Effect<A, E, R>,
  options?: RefSubjectOptions<A>,
  deferredRef?: DeferredRef.DeferredRef<E, A>
) {
  return Effect.gen(function*() {
    const services = yield* Effect.services<R | Scope.Scope>()
    const scope = yield* Scope.fork(ServiceMap.get(services, Scope.Scope))
    const id = yield* Effect.withFiber((fiber) => Effect.succeed(fiber.id))
    const subject = new Subject.HoldSubjectImpl<A, E>()
    const core = new RefSubjectCore(
      initial,
      subject,
      services,
      scope,
      deferredRef ?? DeferredRef.unsafeMake(id, getExitEquivalence(options?.eq ?? equals), subject.lastValue),
      Effect.makeSemaphoreUnsafe(1)
    )
    yield* Scope.addFinalizer(scope, core.subject.interrupt)
    return core
  })
}

function makeDeferredCore<A, E = never, R = never>(
  options?: RefSubjectOptions<A>
) {
  return Effect.gen(function*() {
    const deferredRef = yield* DeferredRef.make<E, A>(getExitEquivalence(options?.eq ?? equals))
    return yield* makeCore<A, E, R>(deferredRef.asEffect(), options, deferredRef)
  })
}

function getOrInitializeCore<A, E, R, R2>(
  core: RefSubjectCore<A, E, R, R2>,
  lockInitialize: boolean
): Effect.Effect<A, E, Exclude<R, R2>> {
  return Effect.suspend(() => {
    if (core._fiber === undefined && Option.isNone(MutableRef.get(core.deferredRef.current))) {
      return initializeCoreAndTap(core, lockInitialize)
    } else {
      return core.deferredRef.asEffect()
    }
  })
}

function initializeCoreEffect<A, E, R, R2>(
  core: RefSubjectCore<A, E, R, R2>,
  lock: boolean
): Effect.Effect<Fiber.Fiber<A, E>, never, Exclude<R, R2>> {
  const initialize = Effect.onExit(
    Effect.provide(core.initial, core.services),
    (exit) =>
      Effect.sync(() => {
        core._fiber = undefined
        core.deferredRef.done(exit)
      })
  )

  return Effect.flatMap(
    Effect.forkIn(
      lock ? core.semaphore.withPermits(1)(initialize) : initialize,
      core.scope
    ),
    (fiber) => Effect.sync(() => core._fiber = fiber)
  )
}

function initializeCoreAndTap<A, E, R, R2>(
  core: RefSubjectCore<A, E, R, R2>,
  lock: boolean
): Effect.Effect<A, E, Exclude<R, R2>> {
  return Effect.flatMapEager(
    initializeCoreEffect(core, lock),
    () => tapEventCore(core, core.deferredRef.asEffect())
  )
}

function setCore<A, E, R, R2>(core: RefSubjectCore<A, E, R, R2>, a: A): Effect.Effect<A, never, Exclude<R, R2>> {
  return Effect.suspend(() => {
    const exit = Exit.succeed(a)

    if (core.deferredRef.done(exit)) {
      // If the value changed, send an event
      return Effect.as(sendEvent(core, exit), a)
    } else {
      // Otherwise, just return the current value
      return Effect.succeed(a)
    }
  })
}

function onFailureCore<A, E, R, R2>(core: RefSubjectCore<A, E, R, R2>, cause: Cause.Cause<E>) {
  const exit = Exit.failCause(cause)

  return Effect.suspend(() => {
    if (core.deferredRef.done(exit)) {
      return sendEvent(core, exit)
    } else {
      return Effect.void
    }
  })
}

function interruptCore<A, E, R, R2>(core: RefSubjectCore<A, E, R, R2>): Effect.Effect<void, never, R> {
  return Effect.withFiber((fiber) => {
    core.deferredRef.reset()

    const closeScope = Scope.close(core.scope, Exit.interrupt(fiber.id))
    const interruptFiber = core._fiber ? Fiber.interrupt(core._fiber) : Effect.void
    const interruptSubject = core.subject.interrupt

    return Effect.all([closeScope, interruptFiber, interruptSubject], { discard: true })
  })
}

function deleteCore<A, E, R, R2>(
  core: RefSubjectCore<A, E, R, R2>
): Effect.Effect<Option.Option<A>, E, Exclude<R, R2>> {
  return Effect.suspend(() => {
    const current = MutableRef.get(core.deferredRef.current)
    core.deferredRef.reset()

    if (Option.isNone(current)) {
      return Effect.succeed(Option.none())
    }

    return core.subject.subscriberCount.pipe(
      Effect.flatMap(
        (count: number) => count > 0 && !core._fiber ? initializeCoreEffect(core, false) : Effect.void
      ),
      Effect.flatMap(() => Effect.asSome(current.value))
    )
  })
}

function tapEventCore<A, E, R, R2, R3>(
  core: RefSubjectCore<A, E, R, R2>,
  effect: Effect.Effect<A, E, R3>
) {
  return effect.pipe(
    Effect.onExit((exit) => sendEvent(core, exit))
  )
}

function sendEvent<A, E, R, R2>(
  core: RefSubjectCore<A, E, R, R2>,
  exit: Exit.Exit<A, E>
): Effect.Effect<unknown, never, Exclude<R, R2>> {
  if (Exit.isSuccess(exit)) {
    return core.subject.onSuccess(exit.value)
  } else {
    return core.subject.onFailure(exit.cause)
  }
}

/**
 * Sets the value of a `RefSubject`.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import * as RefSubject from "../../../typed/fx/RefSubject.ts"
 *
 * const program = Effect.gen(function* () {
 *   const count = yield* RefSubject.make(0)
 *
 *   // Set the value
 *   yield* RefSubject.set(count, 10)
 *   const value = yield* count
 *   console.log(value) // 10
 *
 *   // Can also use pipe syntax
 *   yield* count.pipe(RefSubject.set(20))
 *   const newValue = yield* count
 *   console.log(newValue) // 20
 * })
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export const set: {
  <A>(value: A): <E, R>(ref: RefSubject<A, E, R>) => Effect.Effect<A, E, R>
  <A, E, R>(ref: RefSubject<A, E, R>, a: A): Effect.Effect<A, E, R>
} = dual(2, function set<A, E, R>(ref: RefSubject<A, E, R>, a: A): Effect.Effect<A, E, R> {
  return ref.updates((ref) => ref.set(a))
})

/**
 * Resets a `RefSubject` to its initial value, returning the previous value if it existed.
 *
 * @example
 * ```ts
 * import { Effect, Option } from "effect"
 * import * as RefSubject from "../../../typed/fx/RefSubject.ts"
 *
 * const program = Effect.gen(function* () {
 *   const count = yield* RefSubject.make(0)
 *
 *   yield* RefSubject.set(count, 5)
 *   const before = yield* count
 *   console.log(before) // 5
 *
 *   // Reset to initial value
 *   const previous = yield* RefSubject.reset(count)
 *   console.log(Option.isSome(previous)) // true
 *   console.log(previous.value) // 5
 *
 *   const after = yield* count
 *   console.log(after) // 0
 * })
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export function reset<A, E, R>(ref: RefSubject<A, E, R>): Effect.Effect<Option.Option<A>, E, R> {
  return ref.updates((ref) => ref.delete)
}

export {
  /**
   * Deletes the current value of a `RefSubject`, resetting it to its initial state.
   *
   * @example
   * ```ts
   * import { Effect, Option } from "effect"
   * import * as RefSubject from "../../../typed/fx/RefSubject.ts"
   *
   * const program = Effect.gen(function* () {
   *   const ref = yield* RefSubject.make(10)
   *   yield* RefSubject.set(ref, 20)
   *
   *   // Delete the current value
   *   const deleted = yield* RefSubject.delete(ref)
   *   console.log(Option.isSome(deleted)) // true
   *   console.log(deleted.value) // 20
   *
   *   // Value is reset to initial
   *   const current = yield* ref
   *   console.log(current) // 10
   * })
   * ```
   *
   * @since 1.20.0
   * @category combinators
   */
  reset as delete
}

/**
 * Updates a `RefSubject` using an `Effect`ful function.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import * as RefSubject from "../../../typed/fx/RefSubject.ts"
 *
 * const program = Effect.gen(function* () {
 *   const count = yield* RefSubject.make(5)
 *
 *   // Update with an async operation
 *   yield* RefSubject.updateEffect(count, (value) =>
 *     Effect.succeed(value * 2)
 *   )
 *
 *   const result = yield* count
 *   console.log(result) // 10
 * })
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export const updateEffect: {
  <A, E2, R2>(
    f: (value: A) => Effect.Effect<A, E2, R2>
  ): <E, R>(ref: RefSubject<A, E, R>) => Effect.Effect<A, E | E2, R | R2>
  <A, E, R, E2, R2>(
    ref: RefSubject<A, E, R>,
    f: (value: A) => Effect.Effect<A, E2, R2>
  ): Effect.Effect<A, E | E2, R | R2>
} = dual(2, function updateEffect<A, E, R, E2, R2>(
  ref: RefSubject<A, E, R>,
  f: (value: A) => Effect.Effect<A, E2, R2>
) {
  return ref.updates((ref) => Effect.flatMap(Effect.flatMap(ref.get, f), ref.set))
})

/**
 * Updates a `RefSubject` using a pure function.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import * as RefSubject from "../../../typed/fx/RefSubject.ts"
 *
 * const program = Effect.gen(function* () {
 *   const count = yield* RefSubject.make(5)
 *
 *   // Increment by 1
 *   yield* RefSubject.update(count, (n) => n + 1)
 *   const value = yield* count
 *   console.log(value) // 6
 *
 *   // Can also use pipe syntax
 *   yield* count.pipe(RefSubject.update((n) => n * 2))
 *   const doubled = yield* count
 *   console.log(doubled) // 12
 * })
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export const update: {
  <A>(f: (value: A) => A): <E, R>(ref: RefSubject<A, E, R>) => Effect.Effect<A, E, R>
  <A, E, R>(ref: RefSubject<A, E, R>, f: (value: A) => A): Effect.Effect<A, E, R>
} = dual(2, function update<A, E, R>(ref: RefSubject<A, E, R>, f: (value: A) => A) {
  return updateEffect(ref, (value) => Effect.succeed(f(value)))
})

/**
 * Modifies a `RefSubject` using an `Effect`ful function that returns both a result and a new value.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import * as RefSubject from "../../../typed/fx/RefSubject.ts"
 *
 * const program = Effect.gen(function* () {
 *   const count = yield* RefSubject.make(5)
 *
 *   // Get the old value and set a new one, returning the old value
 *   const oldValue = yield* RefSubject.modifyEffect(count, (value) =>
 *     Effect.succeed([value, value + 10] as const)
 *   )
 *
 *   console.log(oldValue) // 5
 *   const newValue = yield* count
 *   console.log(newValue) // 15
 * })
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export const modifyEffect: {
  <A, B, E2, R2>(
    f: (value: A) => Effect.Effect<readonly [B, A], E2, R2>
  ): <E, R>(ref: RefSubject<A, E, R>) => Effect.Effect<B, E | E2, R | R2>
  <A, E, R, B, E2, R2>(
    ref: RefSubject<A, E, R>,
    f: (value: A) => Effect.Effect<readonly [B, A], E2, R2>
  ): Effect.Effect<B, E | E2, R | R2>
} = dual(2, function modifyEffect<A, E, R, B, E2, R2>(
  ref: RefSubject<A, E, R>,
  f: (value: A) => Effect.Effect<readonly [B, A], E2, R2>
) {
  return ref.updates(
    (ref) =>
      Effect.flatMap(
        ref.get,
        (value) => Effect.flatMap(f(value), ([b, a]) => Effect.flatMap(ref.set(a), () => Effect.succeed(b)))
      )
  )
})

/**
 * Modifies a `RefSubject` using a pure function that returns both a result and a new value.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import * as RefSubject from "../../../typed/fx/RefSubject.ts"
 *
 * const program = Effect.gen(function* () {
 *   const count = yield* RefSubject.make(5)
 *
 *   // Get the old value and increment, returning the old value
 *   const oldValue = yield* RefSubject.modify(count, (value) => [value, value + 1] as const)
 *
 *   console.log(oldValue) // 5
 *   const newValue = yield* count
 *   console.log(newValue) // 6
 * })
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export const modify: {
  <A, B>(f: (value: A) => readonly [B, A]): <E, R>(ref: RefSubject<A, E, R>) => Effect.Effect<B, E, R>
  <A, E, R, B>(ref: RefSubject<A, E, R>, f: (value: A) => readonly [B, A]): Effect.Effect<B, E, R>
} = dual(2, function modify<A, E, R, B>(ref: RefSubject<A, E, R>, f: (value: A) => readonly [B, A]) {
  return modifyEffect(ref, (value) => Effect.succeed(f(value)))
})

/**
 * Checks if a value is a `RefSubject`.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import * as RefSubject from "../../../typed/fx/RefSubject.ts"
 *
 * const program = Effect.gen(function* () {
 *   const ref = yield* RefSubject.make(42)
 *   const isRef = RefSubject.isRefSubject(ref)
 *   console.log(isRef) // true
 *
 *   const notRef = { value: 42 }
 *   const isNotRef = RefSubject.isRefSubject(notRef)
 *   console.log(isNotRef) // false
 * })
 * ```
 *
 * @since 1.0.0
 * @category guards
 */
export function isRefSubject(value: any): value is RefSubject<any, any, any> {
  return value && typeof value === "object" && value[RefSubjectTypeId] === RefSubjectTypeId
}

const isRefSubjectDataFirst = (args: IArguments) => isRefSubject(args[0])

/**
 * Runs an effect that can modify a `RefSubject` transactionally, with optional interrupt handling.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import * as RefSubject from "../../../typed/fx/RefSubject.ts"
 *
 * const program = Effect.gen(function* () {
 *   const balance = yield* RefSubject.make(100)
 *
 *   // Transfer money atomically with interrupt handling
 *   yield* RefSubject.runUpdates(
 *     balance,
 *     (ref) =>
 *       Effect.gen(function* () {
 *         const current = yield* ref.get
 *         if (current >= 50) {
 *           yield* ref.set(current - 50)
 *           return "Transfer successful"
 *         }
 *         return "Insufficient funds"
 *       }),
 *     {
 *       onInterrupt: (value) => Effect.sync(() => console.log(`Interrupted at balance: ${value}`)),
 *       value: "initial"
 *     }
 *   )
 * })
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export const runUpdates: {
  <A, E, R, B, E2, R2, R3 = never, E3 = never, C = never>(
    f: (ref: GetSetDelete<A, E, R>) => Effect.Effect<B, E2, R2>,
    options?:
      | { readonly onInterrupt: (value: A) => Effect.Effect<C, E3, R3>; readonly value?: "initial" | "current" }
      | undefined
  ): (ref: RefSubject<A, E, R>) => Effect.Effect<B, E | E2 | E3, R | R2 | R3>

  <A, E, R, B, E2, R2, R3 = never, E3 = never, C = never>(
    ref: RefSubject<A, E, R>,
    f: (ref: GetSetDelete<A, E, R>) => Effect.Effect<B, E2, R2>,
    options?:
      | { readonly onInterrupt: (value: A) => Effect.Effect<C, E3, R3>; readonly value?: "initial" | "current" }
      | undefined
  ): Effect.Effect<B, E | E2 | E3, R | R2 | R3>
} = dual(
  isRefSubjectDataFirst,
  function runUpdates<A, E, R, B, E2, R2, R3 = never, E3 = never, C = never>(
    ref: RefSubject<A, E, R>,
    f: (ref: GetSetDelete<A, E, R>) => Effect.Effect<B, E2, R2>,
    options?: {
      readonly onInterrupt: (value: A) => Effect.Effect<C, E3, R3>
      readonly value?: "initial" | "current"
    }
  ) {
    if (options === undefined) {
      return ref.updates(f)
    } else if (options.value === "initial") {
      return ref.updates((ref) =>
        Effect.flatMap(
          ref.get,
          (initial) =>
            f(ref).pipe(
              Effect.onInterrupt(() => options.onInterrupt(initial))
            )
        )
      )
    } else {
      return ref.updates((ref) =>
        f(ref).pipe(
          Effect.onInterrupt(() => Effect.flatMap(ref.get, options.onInterrupt))
        )
      )
    }
  }
)

/**
 * Increments a numeric `RefSubject` by 1.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import * as RefSubject from "../../../typed/fx/RefSubject.ts"
 *
 * const program = Effect.gen(function* () {
 *   const count = yield* RefSubject.make(0)
 *
 *   yield* RefSubject.increment(count)
 *   const value = yield* count
 *   console.log(value) // 1
 *
 *   yield* RefSubject.increment(count)
 *   const newValue = yield* count
 *   console.log(newValue) // 2
 * })
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export function increment<E, R>(ref: RefSubject<number, E, R>): Effect.Effect<number, E, R> {
  return update(ref, (value) => value + 1)
}

/**
 * Decrements a numeric `RefSubject` by 1.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import * as RefSubject from "../../../typed/fx/RefSubject.ts"
 *
 * const program = Effect.gen(function* () {
 *   const count = yield* RefSubject.make(10)
 *
 *   yield* RefSubject.decrement(count)
 *   const value = yield* count
 *   console.log(value) // 9
 *
 *   yield* RefSubject.decrement(count)
 *   const newValue = yield* count
 *   console.log(newValue) // 8
 * })
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export function decrement<E, R>(ref: RefSubject<number, E, R>): Effect.Effect<number, E, R> {
  return update(ref, (value) => value - 1)
}

const Variance: Fx.Fx.Variance<any, any, any> = {
  _A: identity,
  _E: identity,
  _R: identity
}

export function Service<Self, A, E = never>() {
  return <const Id extends string>(id: Id): RefSubject.Class<Self, Id, A, E> => {
    const service = ServiceMap.Service<Self, RefSubject<A, E>>(id)

    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
    return class RefSubjectService {
      /// Service

      static readonly id = id
      static readonly service = service

      static readonly layer = <E2, R2>(
        make: Effect.Effect<RefSubject<A, E>, E2, R2 | Scope.Scope>
      ) => Layer.effect(service, make)

      static readonly make = <R = never>(
        value: A | Effect.Effect<A, E, R> | Fx.Fx<A, E, R>,
        options?: RefSubjectOptions<A> & Partial<Bounds>
      ): Layer.Layer<Self, never, R> => {
        const bounds = getDefaultBounds(options)
        return make(value, options).pipe(
          Effect.map((ref) => bounds ? slice(ref, bounds.skip, bounds.take) : ref),
          this.layer
        )
      }

      // Fx
      static readonly [FxTypeId]: Fx.Fx.Variance<A, E, Self> = Variance
      static readonly run = <RSink>(sink: Sink.Sink<A, E, RSink>) =>
        Effect.flatMap(service.asEffect(), (ref) => ref.run(sink))

      // Sink
      static readonly onSuccess = (value: A) => Effect.flatMap(service.asEffect(), (ref) => ref.onSuccess(value))
      static readonly onFailure = (cause: Cause.Cause<E>) =>
        Effect.flatMap(service.asEffect(), (ref) => ref.onFailure(cause))

      /// Computed
      static readonly [ComputedTypeId]: ComputedTypeId = ComputedTypeId
      static readonly version = Effect.flatMap(service.asEffect(), (ref) => ref.version)

      // Subject
      static readonly subscriberCount = Effect.flatMap(service.asEffect(), (ref) => ref.subscriberCount)
      static readonly interrupt = Effect.flatMap(service.asEffect(), (ref) => ref.interrupt)

      // RefSubject
      static readonly [RefSubjectTypeId]: RefSubjectTypeId = RefSubjectTypeId
      static readonly updates = <B, E2, R2>(f: (ref: GetSetDelete<A, E, never>) => Effect.Effect<B, E2, R2>) =>
        Effect.flatMap(service.asEffect(), (ref) => ref.updates(f))

      // Yieldable
      static readonly asEffect = () => Effect.flatMap(service.asEffect(), Effect.fromYieldable)
      static readonly [Symbol.iterator] = function*() {
        const ref = yield* service
        return yield* ref
      }
      static readonly pipe: RefSubject.Service<Self, Id, A, E>["pipe"] = function pipe(
        this: RefSubject.Service<Self, Id, A, E>
      ) {
        return pipeArguments(this, arguments)
      }

      constructor() {
        return RefSubjectService
      }
    } as unknown as RefSubject.Class<Self, Id, A, E>
  }
}

function getDefaultBounds(options?: Partial<Bounds>): Bounds | undefined {
  if (options === undefined || (options.skip === undefined && options.take === undefined)) {
    return { skip: 0, take: Infinity }
  }

  return { skip: options.skip ?? 0, take: options.take ?? Infinity }
}

/**
 * Extract all values from an object using a Proxy.
 * Allows accessing nested properties of a `Computed` or `Filtered` object/array as individual computed values.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import * as RefSubject from "../../../typed/fx/RefSubject.ts"
 *
 * const program = Effect.gen(function* () {
 *   const user = yield* RefSubject.make({ name: "Alice", age: 30 })
 *
 *   // Create a proxy to access nested properties
 *   const proxied = RefSubject.proxy(user)
 *
 *   // Access individual properties as Computed values
 *   const name = yield* proxied.name
 *   console.log(name) // "Alice"
 *
 *   const age = yield* proxied.age
 *   console.log(age) // 30
 *
 *   // Update the source
 *   yield* RefSubject.set(user, { name: "Bob", age: 25 })
 *
 *   // Proxied values automatically update
 *   const newName = yield* proxied.name
 *   console.log(newName) // "Bob"
 * })
 * ```
 *
 * @since 2.0.0
 * @category combinators
 */
export const proxy: {
  <A extends ReadonlyArray<any> | Readonly<Record<PropertyKey, any>>, E, R>(
    source: Computed<A, E, R>
  ): { readonly [K in keyof A]: Computed<A[K], E, R> }

  <A extends ReadonlyArray<any> | Readonly<Record<PropertyKey, any>>, E, R>(
    source: Filtered<A, E, R>
  ): { readonly [K in keyof A]: Filtered<A[K], E, R> }
} = <
  A extends Readonly<Record<PropertyKey, any>> | ReadonlyArray<any>,
  E,
  R
>(
  source: Computed<A, E, R> | Filtered<A, E, R>
): any => {
  const target: any = {}
  return new Proxy(target, {
    get(self, prop) {
      if (prop in self) return self[prop]
      return self[prop] = map(source, (a) => a[prop as keyof A])
    }
  })
}

export type Services<T> = T extends RefSubject<infer _A, infer _E, infer R> ? R :
  T extends Computed<infer _A, infer _E, infer R> ? R :
  T extends Filtered<infer _A, infer _E, infer R> ? R :
  never

export type Error<T> = T extends RefSubject<infer _A, infer E, infer _R> ? E :
  T extends Computed<infer _A, infer E, infer _R> ? E :
  T extends Filtered<infer _A, infer E, infer _R> ? E :
  never

export type Success<T> = T extends RefSubject<infer A, infer _E, infer _R> ? A :
  T extends Computed<infer A, infer _E, infer _R> ? A :
  T extends Filtered<infer A, infer _E, infer _R> ? A :
  never

export type Identifier<T> = T extends RefSubject.Service<infer R, infer _Id, infer _A, infer _E> ? R : never

/**
 * Transforms a `RefSubject`, `Computed`, or `Filtered` using an `Effect`ful function.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import * as RefSubject from "../../../typed/fx/RefSubject.ts"
 *
 * const program = Effect.gen(function* () {
 *   const count = yield* RefSubject.make(5)
 *
 *   // Transform with an async operation
 *   const doubled = RefSubject.mapEffect(count, (n) =>
 *     Effect.succeed(n * 2)
 *   )
 *
 *   const value = yield* doubled
 *   console.log(value) // 10
 *
 *   // Update source
 *   yield* RefSubject.set(count, 7)
 *
 *   // Computed automatically updates
 *   const newValue = yield* doubled
 *   console.log(newValue) // 14
 * })
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export const mapEffect: {
  <T extends RefSubject.Any | Computed.Any | Filtered.Any, B, E2, R2>(
    f: (a: Success<T>) => Effect.Effect<B, E2, R2>
  ): (
    ref: T
  ) => T extends Filtered.Any ? Filtered<B, Error<T> | E2, Services<T> | R2>
    : Computed<B, Error<T> | E2, Services<T> | R2>

  <A, E, R, B, E2, R2>(
    ref: RefSubject<A, E, R> | Computed<A, E, R>,
    f: (a: A) => Effect.Effect<B, E2, R2>
  ): Computed<B, E | E2, R | R2>

  <A, E, R, B, E2, R2>(
    ref: Filtered<A, E, R>,
    f: (a: A) => Effect.Effect<B, E2, R2>
  ): Filtered<B, E | E2, R | R2>

  <R0, E0, A, E, R, E2, R2, C, E3, R3>(
    versioned: Versioned.Versioned<R0, E0, A, E, R, A, E2, R2>,
    f: (a: A) => Effect.Effect<C, E3, R3>
  ): Computed<C, E0 | E | E2 | E3, R0 | R2 | R3 | Exclude<R, Scope.Scope>>
} = dual(2, function mapEffect<R0, E0, A, E, R, E2, R2, C, E3, R3>(
  versioned: Versioned.Versioned<R0, E0, A, E, R, A, E2, R2>,
  f: (a: A) => Effect.Effect<C, E3, R3>
):
  | Computed<C, E0 | E | E2 | E3, R0 | Exclude<R, Scope.Scope> | R2 | R3 | R2 | R3>
  | Filtered<C, E0 | E | E2 | E3, R0 | Exclude<R, Scope.Scope> | R2 | R3 | R2 | R3>
{
  return FilteredTypeId in versioned
    ? new FilteredImpl(versioned, (a) => Effect.asSome(f(a)))
    : new ComputedImpl(versioned, f)
})

/**
 * Transforms a `RefSubject`, `Computed`, or `Filtered` using a pure function.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import * as RefSubject from "../../../typed/fx/RefSubject.ts"
 *
 * const program = Effect.gen(function* () {
 *   const count = yield* RefSubject.make(5)
 *
 *   // Create a computed that doubles the count
 *   const doubled = RefSubject.map(count, (n) => n * 2)
 *
 *   const value = yield* doubled
 *   console.log(value) // 10
 *
 *   // Update source
 *   yield* RefSubject.set(count, 7)
 *
 *   // Computed automatically updates
 *   const newValue = yield* doubled
 *   console.log(newValue) // 14
 * })
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export const map: {
  <T extends RefSubject.Any | Computed.Any | Filtered.Any, B>(f: (a: Success<T>) => B): (
    ref: T
  ) => T extends Filtered.Any ? Filtered<B, Error<T>, Services<T>>
    : Computed<B, Error<T>, Services<T>>

  <A, E, R, B>(ref: RefSubject<A, E, R> | Computed<A, E, R>, f: (a: A) => B): Computed<B, E, R>
  <A, E, R, B>(filtered: Filtered<A, E, R>, f: (a: A) => B): Filtered<B, E, R>

  <R0, E0, A, E, R, B, E2, R2>(
    versioned: Versioned.Versioned<R0, E0, A, E, R, A, E2, R2>,
    f: (a: A) => B
  ):
    | Computed<B, E0 | E | E2, R0 | R2 | Exclude<R, Scope.Scope>>
    | Filtered<B, E0 | E | E2, R0 | R2 | Exclude<R, Scope.Scope>>
} = dual(2, function map<R0, E0, A, E, R, B, E2, R2>(
  versioned: Versioned.Versioned<R0, E0, A, E, R, A, E2, R2>,
  f: (a: A) => B
):
  | Computed<B, E0 | E | E2, R0 | Exclude<R, Scope.Scope> | R2>
  | Filtered<B, E0 | E | E2, R0 | Exclude<R, Scope.Scope> | R2>
{
  return mapEffect(versioned, (a) => Effect.succeed(f(a)))
})

/**
 * Filters and transforms a `RefSubject`, `Computed`, or `Filtered` using an `Effect`ful function that returns an `Option`.
 *
 * @example
 * ```ts
 * import { Effect, Option } from "effect"
 * import * as RefSubject from "../../../typed/fx/RefSubject.ts"
 *
 * const program = Effect.gen(function* () {
 *   const numbers = yield* RefSubject.make([1, 2, 3, 4, 5])
 *
 *   // Find the first even number
 *   const firstEven = RefSubject.filterMapEffect(numbers, (arr) =>
 *     Effect.succeed(Option.fromNullable(arr.find((n) => n % 2 === 0)))
 *   )
 *
 *   const value = yield* firstEven
 *   console.log(value) // 2
 * })
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export const filterMapEffect: {
  <A, B, E2, R2>(
    f: (a: A) => Effect.Effect<Option.Option<B>, E2, R2>
  ): {
    <E, R>(ref: RefSubject<A, E, R> | Computed<A, E, R>): Filtered<B, E | E2, R | R2>
    <E, R>(ref: Filtered<A, E, R>): Filtered<B, E | E2, R | R2>
    <R0, E0, B, E, R, E2, R2>(
      versioned: Versioned.Versioned<R0, E0, A, E, R, A, E2, R2>,
      f: (a: A) => Effect.Effect<Option.Option<B>, E2, R2>
    ): Filtered<B, E0 | E | E2, R0 | R2>
  }

  <A, E, R, B, E2, R2>(
    ref: RefSubject<A, E, R> | Computed<A, E, R> | Filtered<A, E, R>,
    f: (a: A) => Effect.Effect<Option.Option<B>, E2, R2>
  ): Filtered<B, E | E2, R | R2>
  <R0, E0, A, E, R, B, E2, R2, R3, E3>(
    versioned: Versioned.Versioned<R0, E0, A, E, R, A, E2, R2>,
    f: (a: A) => Effect.Effect<Option.Option<B>, E3, R3>
  ): Filtered<B, E0 | E | E2 | E3, R0 | R2 | R3 | Exclude<R, Scope.Scope>>
} = dual(2, function filterMapEffect<R0, E0, A, E, R, B, E2, R2, R3, E3>(
  versioned: Versioned.Versioned<R0, E0, A, E, R, A, E2, R2>,
  f: (a: A) => Effect.Effect<Option.Option<B>, E3, R3>
): Filtered<B, E0 | E | E2 | E3, R0 | Exclude<R, Scope.Scope> | R2 | R3 | R2 | R3> {
  return new FilteredImpl(versioned, f)
})

/**
 * Filters and transforms a `RefSubject`, `Computed`, or `Filtered` using a pure function that returns an `Option`.
 *
 * @example
 * ```ts
 * import { Effect, Option } from "effect"
 * import * as RefSubject from "../../../typed/fx/RefSubject.ts"
 *
 * const program = Effect.gen(function* () {
 *   const numbers = yield* RefSubject.make([1, 2, 3, 4, 5])
 *
 *   // Get the first even number
 *   const firstEven = RefSubject.filterMap(numbers, (arr) =>
 *     Option.fromNullable(arr.find((n) => n % 2 === 0))
 *   )
 *
 *   const value = yield* firstEven
 *   console.log(value) // 2
 * })
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export const filterMap: {
  <A, B>(f: (a: A) => Option.Option<B>): {
    <E, R>(ref: RefSubject<A, E, R> | Computed<A, E, R> | Filtered<A, E, R>): Filtered<B, E, R>
    <R0, E0, B, E, R, E2, R2>(
      versioned: Versioned.Versioned<R0, E0, A, E, R, A, E2, R2>,
      f: (a: A) => Option.Option<B>
    ): Filtered<B, E0 | E | E2, R0 | R2>
  }

  <R0, E0, A, E, R, B, E2, R2>(
    versioned: Versioned.Versioned<R0, E0, A, E, R, A, E2, R2>,
    f: (a: A) => Option.Option<B>
  ): Filtered<B, E0 | E | E2, R0 | R2 | Exclude<R, Scope.Scope>>

  <A, E, R, B>(
    ref: RefSubject<A, E, R> | Computed<A, E, R> | Filtered<A, E, R>,
    f: (a: A) => Option.Option<B>
  ): Filtered<B, E, R>
} = dual(2, function filterMap<R0, E0, A, E, R, B, E2, R2>(
  versioned: Versioned.Versioned<R0, E0, A, E, R, A, E2, R2>,
  f: (a: A) => Option.Option<B>
): Filtered<B, E0 | E | E2, R0 | Exclude<R, Scope.Scope> | R2 | R2> {
  return new FilteredImpl(versioned, (a) => Effect.succeed(f(a)))
})

/**
 * Converts a `Computed` or `Filtered` of `Option<A>` into a `Filtered<A>`, filtering out `None` values.
 *
 * @example
 * ```ts
 * import { Effect, Option } from "effect"
 * import * as RefSubject from "../../../typed/fx/RefSubject.ts"
 *
 * const program = Effect.gen(function* () {
 *   const maybeValue = yield* RefSubject.make(Option.some(42))
 *
 *   // Compact the Option
 *   const filtered = RefSubject.compact(maybeValue)
 *
 *   const value = yield* filtered
 *   console.log(value) // 42
 *
 *   // If the Option becomes None, the Filtered will fail
 *   yield* RefSubject.set(maybeValue, Option.none())
 *   // yield* filtered would fail with NoSuchElementError
 * })
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export const compact: {
  <A, E, R>(ref: Computed<Option.Option<A>, E, R>): Filtered<A>
  <A, E, R>(ref: Filtered<Option.Option<A>, E, R>): Filtered<A>

  <R0, E0, A, E, R, E2, R2>(
    versioned: Versioned.Versioned<R0, E0, Option.Option<A>, E, R, Option.Option<A>, E2, R2>
  ): Filtered<
    A,
    E0 | E | Exclude<E, Cause.NoSuchElementError> | Exclude<E2, Cause.NoSuchElementError>,
    R0 | R2 | Exclude<R, Scope.Scope>
  >
} = function compact<R0, E0, A, E, R, E2, R2>(
  versioned: Versioned.Versioned<R0, E0, Option.Option<A>, E, R, Option.Option<A>, E2, R2>
): any {
  return new FilteredImpl(versioned, Effect.succeed)
}

class RefSubjectSimpleTransform<A, E, R, R2, R3> extends YieldableFx<A, E, R | R2 | Scope.Scope, A, E, R | R3>
  implements RefSubject<A, E, R | R2 | R3>
{
  readonly [ComputedTypeId]: ComputedTypeId = ComputedTypeId
  readonly [RefSubjectTypeId]: RefSubjectTypeId = RefSubjectTypeId

  readonly version: Effect.Effect<number, E, R>
  readonly interrupt: Effect.Effect<void, never, R>
  readonly subscriberCount: Effect.Effect<number, never, R>
  private _fx: Fx.Fx<A, E, Scope.Scope | R | R2>

  readonly ref: RefSubject<A, E, R>
  readonly transformFx: (fx: Fx.Fx<A, E, Scope.Scope | R>) => Fx.Fx<A, E, Scope.Scope | R | R2>
  readonly transformEffect: (effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R | R3>

  constructor(
    ref: RefSubject<A, E, R>,
    transformFx: (fx: Fx.Fx<A, E, Scope.Scope | R>) => Fx.Fx<A, E, Scope.Scope | R | R2>,
    transformEffect: (effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R | R3>
  ) {
    super()

    this.ref = ref
    this.transformFx = transformFx
    this.transformEffect = transformEffect
    this.version = ref.version
    this.interrupt = ref.interrupt
    this.subscriberCount = ref.subscriberCount

    this._fx = transformFx(ref)
  }

  run<R4>(sink: Sink.Sink<A, E, R4>) {
    return this._fx.run(sink)
  }

  toEffect(): Effect.Effect<A, E, R | R3> {
    return this.transformEffect(this.ref.asEffect())
  }

  updates<E2, R2, C>(
    run: (ref: GetSetDelete<A, E, R>) => Effect.Effect<C, E2, R2>
  ): Effect.Effect<C, E | E2, R | R2> {
    return this.ref.updates(run)
  }

  onFailure(cause: Cause.Cause<E>): Effect.Effect<unknown, never, R> {
    return this.ref.onFailure(cause)
  }

  onSuccess(value: A): Effect.Effect<unknown, never, R> {
    return this.ref.onSuccess(value)
  }
}

export const slice: {
  (skip: number, take: number): <A, E, R>(ref: RefSubject<A, E, R>) => RefSubject<A, E, R>
  <A, E, R>(ref: RefSubject<A, E, R>, skip: number, take: number): RefSubject<A, E, R>
} = dual(
  3,
  function slice<A, E, R>(ref: RefSubject<A, E, R>, skip: number, take: number): RefSubject<A, E, R> {
    return new RefSubjectSimpleTransform(ref, (_) => Fx.slice(_, { skip, take }), identity)
  }
)

type RefKind = "r" | "c" | "f"

const join = (a: RefKind, b: RefKind) => {
  if (a === "r") return b
  if (b === "r") return a
  if (a === "f") return a
  if (b === "f") return b
  return "c"
}

function getRefKind<
  const Refs extends ReadonlyArray<RefSubject<any, any, any> | Computed<any, any, any> | Filtered<any, any, any>>
>(refs: Refs): RefKind {
  let kind: RefKind = "r"

  for (const ref of refs) {
    if (FilteredTypeId in ref) {
      kind = "f"
      break
    } else if (!(RefSubjectTypeId in ref)) {
      kind = join(kind, "c")
    }
  }

  return kind
}

type StructFrom<
  Refs extends Readonly<Record<string, RefSubject.Any | Computed.Any | Filtered.Any>>
> = {
  "c": [ComputedStructFrom<Refs>] extends [Computed<infer A, infer E, infer R>] ? Computed<A, E, R> : never
  "f": [FilteredStructFrom<Refs>] extends [Filtered<infer A, infer E, infer R>] ? Filtered<A, E, R> : never
  "r": [RefSubjectStructFrom<Refs>] extends [RefSubject<infer A, infer E, infer R>] ? RefSubject<A, E, R> : never
}[GetStructKind<Refs>]

type GetStructKind<
  Refs extends Readonly<Record<string, RefSubject.Any | Computed.Any | Filtered.Any>>
> = MergeKinds<
  UnionToTuple<
    {
      [K in keyof Refs]: MatchKind<Refs[K]>
    }[keyof Refs]
  >
>

type Ref = RefSubject.Any | Computed.Any | Filtered.Any

type MatchKind<T extends Ref> = [T] extends [Filtered.Any] ? "f"
  : [T] extends [RefSubject.Any] ? "r"
  : "c"

type MergeKind<A extends RefKind, B extends RefKind> = A extends "f" ? A
  : B extends "f" ? B
  : A extends "r" ? B
  : B extends "r" ? A
  : "c"

type MergeKinds<Kinds extends ReadonlyArray<any>> = Kinds extends
  readonly [infer Head extends RefKind, ...infer Tail extends ReadonlyArray<RefKind>] ?
  MergeKind<Head, MergeKinds<Tail>>
  : "r"

type FilteredStructFrom<
  Refs extends Readonly<Record<string, RefSubject.Any | Computed.Any | Filtered.Any>>
> = Filtered<
  {
    readonly [K in keyof Refs]: Effect.Success<Refs[K]>
  },
  Fx.Error<Refs[keyof Refs]>,
  Effect.Services<Refs[keyof Refs]>
>

type ComputedStructFrom<
  Refs extends Readonly<Record<string, RefSubject.Any | Computed.Any | Filtered.Any>>
> = Computed<
  {
    readonly [K in keyof Refs]: Effect.Success<Refs[K]>
  },
  Effect.Error<Refs[keyof Refs]>,
  Effect.Services<Refs[keyof Refs]>
>

type RefSubjectStructFrom<
  Refs extends Readonly<Record<string, RefSubject.Any | Computed.Any | Filtered.Any>>
> = RefSubject<
  {
    readonly [K in keyof Refs]: Effect.Success<Refs[K]>
  },
  Effect.Error<Refs[keyof Refs]>,
  Effect.Services<Refs[keyof Refs]>
>

type TupleFrom<
  Refs extends ReadonlyArray<RefSubject<any, any, any> | Computed<any, any, any> | Filtered<any, any, any>>
> = {
  "c": [ComputedTupleFrom<Refs>] extends [Computed<infer A, infer E, infer R>] ? Computed<A, E, R> : never
  "f": [FilteredTupleFrom<Refs>] extends [Filtered<infer A, infer E, infer R>] ? Filtered<A, E, R> : never
  "r": [RefSubjectTupleFrom<Refs>] extends [RefSubject<infer A, infer E, infer R>] ? RefSubject<A, E, R> : never
}[GetTupleKind<Refs>]

type GetTupleKind<Refs extends ReadonlyArray<Ref>, Kind extends RefKind = "r"> = Refs extends
  readonly [infer Head extends Ref, ...infer Tail extends ReadonlyArray<Ref>] ?
  GetTupleKind<Tail, MergeKind<Kind, MatchKind<Head>>>
  : Kind

type FilteredTupleFrom<
  Refs extends ReadonlyArray<RefSubject<any, any, any> | Computed<any, any, any> | Filtered<any, any, any>>
> = Filtered<
  {
    readonly [K in keyof Refs]: Effect.Success<Refs[K]>
  },
  Fx.Error<Refs[number]>,
  Effect.Services<Refs[number]>
>

type ComputedTupleFrom<
  Refs extends ReadonlyArray<RefSubject<any, any, any> | Computed<any, any, any> | Filtered<any, any, any>>
> = Computed<
  {
    readonly [K in keyof Refs]: Effect.Success<Refs[K]>
  },
  Effect.Error<Refs[number]>,
  Effect.Services<Refs[number]>
>

type RefSubjectTupleFrom<
  Refs extends ReadonlyArray<RefSubject<any, any, any> | Computed<any, any, any> | Filtered<any, any, any>>
> = RefSubject<
  {
    readonly [K in keyof Refs]: Effect.Success<Refs[K]>
  },
  Effect.Error<Refs[number]>,
  Effect.Services<Refs[number]>
>

/**
 * Combines multiple `RefSubject`, `Computed`, or `Filtered` instances into a single struct.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import * as RefSubject from "../../../typed/fx/RefSubject.ts"
 *
 * const program = Effect.gen(function* () {
 *   const firstName = yield* RefSubject.make("Alice")
 *   const lastName = yield* RefSubject.make("Smith")
 *   const age = yield* RefSubject.make(30)
 *
 *   // Combine into a struct
 *   const person = RefSubject.struct({
 *     firstName,
 *     lastName,
 *     age
 *   })
 *
 *   const fullPerson = yield* person
 *   console.log(fullPerson) // { firstName: "Alice", lastName: "Smith", age: 30 }
 *
 *   // Update one field
 *   yield* RefSubject.set(firstName, "Bob")
 *
 *   // Struct automatically updates
 *   const updated = yield* person
 *   console.log(updated.firstName) // "Bob"
 * })
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export function struct<
  const Refs extends Readonly<Record<string, RefSubject.Any | Computed.Any | Filtered.Any>>
>(refs: Refs): StructFrom<Refs> {
  const kind = getRefKind(Object.values(refs))
  switch (kind) {
    case "r":
      return makeStructRef(refs as any) as StructFrom<Refs>
    case "c":
      return makeStructComputed(refs as any) as StructFrom<Refs>
    case "f":
      return makeStructFiltered(refs as any) as any as StructFrom<Refs>
  }
}
/**
 * Combines multiple `RefSubject`, `Computed`, or `Filtered` instances into a single tuple.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import * as RefSubject from "../../../typed/fx/RefSubject.ts"
 *
 * const program = Effect.gen(function* () {
 *   const x = yield* RefSubject.make(10)
 *   const y = yield* RefSubject.make(20)
 *   const z = yield* RefSubject.make(30)
 *
 *   // Combine into a tuple
 *   const point = RefSubject.tuple([x, y, z])
 *
 *   const coords = yield* point
 *   console.log(coords) // [10, 20, 30]
 *
 *   // Update one value
 *   yield* RefSubject.set(x, 15)
 *
 *   // Tuple automatically updates
 *   const updated = yield* point
 *   console.log(updated) // [15, 20, 30]
 * })
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export function tuple<
  const Refs extends ReadonlyArray<Ref>
>(refs: Refs): TupleFrom<Refs> {
  const kind = getRefKind(refs)
  switch (kind) {
    case "r":
      return makeTupleRef(refs as any) as TupleFrom<Refs>
    case "c":
      return makeTupleComputed(refs as any) as TupleFrom<Refs>
    case "f":
      return makeTupleFiltered(refs as any) as any as TupleFrom<Refs>
  }
}

function makeTupleRef<
  const Refs extends ReadonlyArray<RefSubject<any, any, any>>
>(refs: Refs): RefSubjectTupleFrom<Refs> {
  return new RefSubjectTuple(refs)
}

const UNBOUNDED = { concurrency: "unbounded" } as const

class RefSubjectTuple<
  const Refs extends ReadonlyArray<RefSubject<any, any, any>>
> extends YieldableFx<
  {
    readonly [K in keyof Refs]: Effect.Success<Refs[K]>
  },
  Effect.Error<Refs[number]>,
  Effect.Services<Refs[number]>,
  {
    readonly [K in keyof Refs]: Effect.Success<Refs[K]>
  },
  Effect.Error<Refs[number]>,
  Effect.Services<Refs[number]>
> implements RefSubjectTupleFrom<Refs> {
  readonly [ComputedTypeId]: ComputedTypeId = ComputedTypeId
  readonly [RefSubjectTypeId]: RefSubjectTypeId = RefSubjectTypeId

  readonly version: Effect.Effect<number, Effect.Error<Refs[number]>, Effect.Services<Refs[number]>>
  readonly interrupt: Effect.Effect<void, never, Effect.Services<Refs[number]>>
  readonly subscriberCount: Effect.Effect<number, never, Effect.Services<Refs[number]>>

  private versioned: Versioned.Versioned<
    Effect.Services<Refs[number]>,
    Effect.Error<Refs[number]>,
    { readonly [K in keyof Refs]: Effect.Success<Refs[K]> },
    Effect.Error<Refs[number]>,
    Effect.Services<Refs[number]>,
    { readonly [K in keyof Refs]: Effect.Success<Refs[K]> },
    Effect.Error<Refs[number]>,
    Effect.Services<Refs[number]>
  >

  private getSetDelete: GetSetDelete<
    { readonly [K in keyof Refs]: Effect.Success<Refs[K]> },
    Effect.Error<Refs[number]>,
    Effect.Services<Refs[number]>
  >

  readonly refs: Refs

  constructor(
    refs: Refs
  ) {
    super()

    this.refs = refs
    this.versioned = Versioned.hold(Versioned.tuple(refs)) as any
    this.version = this.versioned.version
    this.interrupt = Effect.all(refs.map((r) => r.interrupt), UNBOUNDED)
    this.subscriberCount = Effect.map(
      Effect.all(refs.map((r) => r.subscriberCount), UNBOUNDED),
      Array.reduce(0, sum)
    )

    this.getSetDelete = {
      get: this.versioned.asEffect(),
      set: (a) => Effect.all(refs.map((r, i) => set(r, a[i])), UNBOUNDED) as any,
      delete: Effect.map(Effect.all(refs.map((r) => reset(r)), UNBOUNDED), Option.all) as any
    }

    this.updates = this.updates.bind(this)
    this.onFailure = this.onFailure.bind(this)
    this.onSuccess = this.onSuccess.bind(this)
  }

  run<R2 = never>(
    sink: Sink.Sink<
      {
        readonly [K in keyof Refs]: Effect.Success<Refs[K]>
      },
      Effect.Error<Refs[number]>,
      R2
    >
  ): Effect.Effect<unknown, never, Effect.Services<Refs[number]> | R2> {
    return this.versioned.run(sink)
  }

  override toEffect(): Effect.Effect<
    { readonly [K in keyof Refs]: Effect.Success<Refs[K]> },
    Effect.Error<Refs[number]>,
    Effect.Services<Refs[number]>
  > {
    return this.versioned.asEffect()
  }

  updates<E2, R2, C>(
    run: (
      ref: GetSetDelete<
        {
          readonly [K in keyof Refs]: Effect.Success<Refs[K]>
        },
        Effect.Error<Refs[number]>,
        Effect.Services<Refs[number]>
      >
    ) => Effect.Effect<C, E2, R2>
  ) {
    return run(this.getSetDelete)
  }

  onFailure(
    cause: Cause.Cause<Effect.Error<Refs[number]>>
  ): Effect.Effect<unknown, never, Effect.Services<Refs[number]>> {
    return Effect.all(this.refs.map((ref) => ref.onFailure(cause)))
  }

  onSuccess(
    value: { readonly [K in keyof Refs]: Effect.Success<Refs[K]> }
  ): Effect.Effect<unknown, never, Effect.Services<Refs[number]>> {
    return Effect.catchCause(this.getSetDelete.set(value), (c) => this.onFailure(c))
  }
}

function makeTupleComputed<
  const Refs extends ReadonlyArray<Computed<any, any, any>>
>(refs: Refs): ComputedTupleFrom<Refs> {
  return new ComputedImpl(Versioned.tuple(refs) as any, Effect.succeed) as any
}

function makeTupleFiltered<
  const Refs extends ReadonlyArray<Computed<any, any, any> | Filtered<any, any, any>>
>(refs: Refs): FilteredTupleFrom<Refs> {
  return new FilteredImpl(Versioned.tuple(refs) as any, Effect.succeedSome) as any
}

function makeStructRef<
  const Refs extends Readonly<Record<string, RefSubject.Any>>
>(refs: Refs): RefSubjectStructFrom<Refs> {
  return new RefSubjectStruct(refs) as any
}

class RefSubjectStruct<
  const Refs extends Readonly<Record<string, RefSubject.Any>>
> extends YieldableFx<
  {
    readonly [K in keyof Refs]: Success<Refs[K]>
  },
  Error<Refs[keyof Refs]>,
  Services<Refs[keyof Refs]> | Scope.Scope,
  {
    readonly [K in keyof Refs]: Success<Refs[K]>
  },
  Error<Refs[keyof Refs]>,
  Services<Refs[keyof Refs]>
> implements
  RefSubject<
    {
      readonly [K in keyof Refs]: Success<Refs[K]>
    },
    Error<Refs[keyof Refs]>,
    Services<Refs[keyof Refs]>
  >
{
  readonly [ComputedTypeId]: ComputedTypeId = ComputedTypeId
  readonly [RefSubjectTypeId]: RefSubjectTypeId = RefSubjectTypeId

  readonly version: Effect.Effect<
    number,
    Error<Refs[keyof Refs]>,
    Services<Refs[keyof Refs]>
  >
  readonly interrupt: Effect.Effect<void, never, Services<Refs[keyof Refs]>>
  readonly subscriberCount: Effect.Effect<number, never, Services<Refs[keyof Refs]>>

  private versioned: Versioned.Versioned<
    Services<Refs[keyof Refs]>,
    Error<Refs[keyof Refs]>,
    { readonly [K in keyof Refs]: Success<Refs[K]> },
    Error<Refs[keyof Refs]>,
    Services<Refs[keyof Refs]>,
    { readonly [K in keyof Refs]: Success<Refs[K]> },
    Error<Refs[keyof Refs]>,
    Services<Refs[keyof Refs]>
  >

  private getSetDelete: GetSetDelete<
    { readonly [K in keyof Refs]: Success<Refs[K]> },
    Error<Refs[keyof Refs]>,
    Services<Refs[keyof Refs]>
  >

  readonly refs: Refs

  constructor(
    refs: Refs
  ) {
    super()

    this.refs = refs
    this.versioned = Versioned.hold(Versioned.struct(refs)) as any
    this.version = this.versioned.version
    this.interrupt = Effect.all(Object.values(refs).map((r) => r.interrupt), UNBOUNDED)
    this.subscriberCount = Effect.map(
      Effect.all(Object.values(refs).map((r) => r.subscriberCount), UNBOUNDED),
      Array.reduce(0, sum)
    )

    this.getSetDelete = {
      get: this.versioned.asEffect(),
      set: (a) => Effect.all(Object.keys(refs).map((k) => set(refs[k] as any, a[k])), UNBOUNDED) as any,
      delete: Effect.map(Effect.all(Object.values(refs).map((r) => reset(r as any)), UNBOUNDED), Option.all) as any
    }

    this.updates = this.updates.bind(this)
    this.onFailure = this.onFailure.bind(this)
    this.onSuccess = this.onSuccess.bind(this)
  }

  run<R3 = never>(
    sink: Sink.Sink<{ readonly [K in keyof Refs]: Success<Refs[K]> }, Error<Refs[keyof Refs]>, R3>
  ): Effect.Effect<unknown, never, Services<Refs[keyof Refs]> | Scope.Scope | R3> {
    return this.versioned.run(sink as any) as any
  }

  toEffect() {
    return this.versioned.asEffect()
  }

  updates<E2, R2, C>(
    run: (
      ref: GetSetDelete<
        {
          readonly [K in keyof Refs]: Success<Refs[K]>
        },
        Error<Refs[keyof Refs]>,
        Services<Refs[keyof Refs]>
      >
    ) => Effect.Effect<C, E2, R2>
  ) {
    return run(this.getSetDelete)
  }

  onFailure(
    cause: Cause.Cause<Error<Refs[keyof Refs]>>
  ): Effect.Effect<unknown, never, Services<Refs[keyof Refs]>> {
    return Effect.all(Object.values(this.refs).map((ref) => ref.onFailure(cause as any)))
  }

  onSuccess(
    value: { readonly [K in keyof Refs]: Success<Refs[K]> }
  ): Effect.Effect<unknown, never, Services<Refs[keyof Refs]>> {
    return Effect.catchCause(this.getSetDelete.set(value), (c) => this.onFailure(c))
  }
}

function makeStructComputed<
  const Refs extends Readonly<Record<string, Computed<any, any, any>>>
>(refs: Refs): ComputedStructFrom<Refs> {
  return new ComputedImpl(Versioned.struct(refs) as any, Effect.succeed) as any
}

function makeStructFiltered<
  const Refs extends Readonly<Record<string, Computed<any, any, any> | Filtered<any, any, any>>>
>(refs: Refs): FilteredStructFrom<Refs> {
  return new FilteredImpl(Versioned.struct(refs) as any, Effect.succeedSome) as any
}
