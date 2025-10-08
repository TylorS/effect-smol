import { Fiber, MutableRef } from "effect"
import type * as Cause from "effect/Cause"
import type { Equivalence } from "effect/data/Equivalence"
import * as Option from "effect/data/Option"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { dual } from "effect/Function"
import { equals } from "effect/interfaces/Equal"
import * as Scope from "effect/Scope"
import * as ServiceMap from "effect/ServiceMap"
import { getExitEquivalence, YieldableFx } from "./_util.js"
import * as DeferredRef from "./DeferredRef.js"
import * as Fx from "./Fx.js"
import type * as Sink from "./Sink.js"
import * as Subject from "./Subject.js"
import * as Versioned from "./Versioned.js"

export const RefSubjectTypeId = Symbol.for("@typed/fx/RefSubject")
export type RefSubjectTypeId = typeof RefSubjectTypeId

export const ComputedTypeId = Symbol.for("@typed/fx/Computed")
export type ComputedTypeId = typeof ComputedTypeId

export const FilteredTypeId = Symbol.for("@typed/fx/Filtered")
export type FilteredTypeId = typeof FilteredTypeId

export interface Computed<out A, out E = never, out R = never>
  extends Versioned.Versioned<R, E, A, E, R | Scope.Scope, A, E, R>
{
  readonly [ComputedTypeId]: ComputedTypeId
}

export interface Filtered<out A, out E = never, out R = never>
  extends Versioned.Versioned<R, E, A, E, R | Scope.Scope, A, E | Cause.NoSuchElementError, R>
{
  readonly [FilteredTypeId]: FilteredTypeId

  asComputed(): Computed<Option.Option<A>, E, R>
}

export interface GetSetDelete<A, E, R> {
  readonly get: Effect.Effect<A, E, R>
  readonly set: (a: A) => Effect.Effect<A, E, R>
  readonly delete: Effect.Effect<Option.Option<A>, E, R>
}

export interface RefSubject<A, E = never, R = never> extends Computed<A, E, R>, Subject.Subject<A, E, R> {
  readonly [RefSubjectTypeId]: RefSubjectTypeId

  readonly updates: <B, E2, R2>(
    f: (ref: GetSetDelete<A, E, R>) => Effect.Effect<B, E2, R2>
  ) => Effect.Effect<B, E | E2, R | R2>
}

export const CurrentComputedBehavior = ServiceMap.Reference("@typed/fx/CurrentComputedBehavior", {
  defaultValue: (): "one" | "multiple" => "multiple"
})

const checkIsMultiple = (ctx: ServiceMap.ServiceMap<any>): ctx is ServiceMap.ServiceMap<"multiple"> => {
  return ServiceMap.getReferenceUnsafe(ctx, CurrentComputedBehavior) === "multiple"
}

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
      (fx) => Fx.mapEffect(fx, f),
      Effect.flatMap(f)
    )

    this.input = input
    this.f = f

    this._computed = Subject.hold(Fx.unwrap(
      Effect.map(Effect.services(), (ctx) => {
        if (checkIsMultiple(ctx)) {
          return Fx.fromYieldable(input).pipe(
            Fx.continueWith(() => input),
            // Fx.skipRepeats,
            Fx.mapEffect(f)
            // Fx.skipRepeats
          )
        }

        return Fx.fromEffect(Effect.flatMap(input.asEffect(), f))
      })
    ))
  }

  override run<RSink>(sink: Sink.Sink<C, E0 | E | E2 | E3, RSink>) {
    return this._computed.run(sink) as any
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
      (fx) => Fx.filterMapEffect(fx, f),
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
            Fx.filterMapEffect(f),
            Fx.skipRepeats
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

/**
 * @since 1.20.0
 */
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
}

export function make<A, E, R>(
  effect: Effect.Effect<A, E, R>,
  options?: RefSubjectOptions<A>
): Effect.Effect<RefSubject<A, E>, never, R | Scope.Scope> {
  return Effect.map(makeCore(effect, options), (core) => new RefSubjectImpl(core))
}

function makeCore<A, E, R>(
  initial: Effect.Effect<A, E, R>,
  options?: RefSubjectOptions<A>
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
      DeferredRef.unsafeMake(id, getExitEquivalence(options?.eq ?? equals), subject.lastValue),
      Effect.makeSemaphoreUnsafe(1)
    )
    yield* Scope.addFinalizer(scope, core.subject.interrupt)
    return core
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
  const exit = Exit.succeed(a)

  return Effect.suspend(() => {
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
 * @since 1.20.0
 */
export const set: {
  <A>(value: A): <E, R>(ref: RefSubject<A, E, R>) => Effect.Effect<A, E, R>
  <A, E, R>(ref: RefSubject<A, E, R>, a: A): Effect.Effect<A, E, R>
} = dual(2, function set<A, E, R>(ref: RefSubject<A, E, R>, a: A): Effect.Effect<A, E, R> {
  return ref.updates((ref) => ref.set(a))
})

/**
 * @since 1.20.0
 */
export function reset<A, E, R>(ref: RefSubject<A, E, R>): Effect.Effect<Option.Option<A>, E, R> {
  return ref.updates((ref) => ref.delete)
}

/**
 * @since 1.20.0
 */
export {
  /**
   * @since 1.20.0
   */
  reset as delete
}

/**
 * @since 1.20.0
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
 * @since 1.20.0
 */
export const update: {
  <A>(f: (value: A) => A): <E, R>(ref: RefSubject<A, E, R>) => Effect.Effect<A, E, R>
  <A, E, R>(ref: RefSubject<A, E, R>, f: (value: A) => A): Effect.Effect<A, E, R>
} = dual(2, function update<A, E, R>(ref: RefSubject<A, E, R>, f: (value: A) => A) {
  return updateEffect(ref, (value) => Effect.succeed(f(value)))
})

/**
 * @since 1.20.0
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
 * @since 1.20.0
 */
export const modify: {
  <A, B>(f: (value: A) => readonly [B, A]): <E, R>(ref: RefSubject<A, E, R>) => Effect.Effect<B, E, R>
  <A, E, R, B>(ref: RefSubject<A, E, R>, f: (value: A) => readonly [B, A]): Effect.Effect<B, E, R>
} = dual(2, function modify<A, E, R, B>(ref: RefSubject<A, E, R>, f: (value: A) => readonly [B, A]) {
  return modifyEffect(ref, (value) => Effect.succeed(f(value)))
})

export function isRefSubject(value: any): value is RefSubject<any, any, any> {
  return value && typeof value === "object" && value[RefSubjectTypeId] === RefSubjectTypeId
}

const isRefSubjectDataFirst = (args: IArguments) => isRefSubject(args[0])

/**
 * @since 1.20.0
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
