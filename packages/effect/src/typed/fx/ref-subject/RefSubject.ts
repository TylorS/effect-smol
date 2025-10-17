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
import * as Layer from "../../../Layer.js"
import * as MutableRef from "../../../MutableRef.ts"
import { sum } from "../../../Number.ts"
import * as Scope from "../../../Scope.ts"
import * as ServiceMap from "../../../ServiceMap.ts"
import type { Bounds } from "../combinators/slice.ts"
import * as Fx from "../index.ts"
import * as DeferredRef from "../internal/DeferredRef.ts"
import { getExitEquivalence } from "../internal/equivalence.ts"
import type { UnionToTuple } from "../internal/UnionToTuple.ts"
import { YieldableFx } from "../internal/yieldable.ts"
import * as Sink from "../sink/Sink.ts"
import * as Subject from "../subject/Subject.ts"
import * as Versioned from "../versioned/Versioned.ts"

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

export declare namespace Computed {
  export type Any =
    | Computed<any, any, any>
    | Computed<never, any, any>
    | Computed<any, never, any>
    | Computed<never, never, any>
}

export interface Filtered<out A, out E = never, out R = never>
  extends Versioned.Versioned<R, E, A, E, R | Scope.Scope, A, E | Cause.NoSuchElementError, R>
{
  readonly [FilteredTypeId]: FilteredTypeId

  asComputed(): Computed<Option.Option<A>, E, R>
}

export declare namespace Filtered {
  export type Any =
    | Filtered<any, any, any>
    | Filtered<never, any, any>
    | Filtered<any, never, any>
    | Filtered<never, never, any>
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
    ) => Layer.Layer<Self, never, R>

    readonly layer: <E2, R2>(
      make: Effect.Effect<RefSubject<A, E>, E2, R2 | Scope.Scope>
    ) => Layer.Layer<Self, E2, R2>
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

export function make<A, E = never, R = never>(
  effect: A | Effect.Effect<A, E, R> | Fx.Fx<A, E, R>,
  options?: RefSubjectOptions<A>
): Effect.Effect<RefSubject<A, E>, never, R | Scope.Scope> {
  if (Fx.isFx(effect)) {
    return fromFx(effect, options)
  } else if (Effect.isEffect(effect)) {
    return fromEffect(effect, options)
  } else {
    return fromEffect<A, E, R>(Effect.succeed(effect), options)
  }
}

export function fromEffect<A, E, R>(
  effect: Effect.Effect<A, E, R>,
  options?: RefSubjectOptions<A>
): Effect.Effect<RefSubject<A, E>, never, R | Scope.Scope> {
  return Effect.map(makeCore(effect, options), (core) => new RefSubjectImpl(core))
}

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

export const set: {
  <A>(value: A): <E, R>(ref: RefSubject<A, E, R>) => Effect.Effect<A, E, R>
  <A, E, R>(ref: RefSubject<A, E, R>, a: A): Effect.Effect<A, E, R>
} = dual(2, function set<A, E, R>(ref: RefSubject<A, E, R>, a: A): Effect.Effect<A, E, R> {
  return ref.updates((ref) => ref.set(a))
})

export function reset<A, E, R>(ref: RefSubject<A, E, R>): Effect.Effect<Option.Option<A>, E, R> {
  return ref.updates((ref) => ref.delete)
}

export {
  /**
   * @since 1.20.0
   */
  reset as delete
}

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

export const update: {
  <A>(f: (value: A) => A): <E, R>(ref: RefSubject<A, E, R>) => Effect.Effect<A, E, R>
  <A, E, R>(ref: RefSubject<A, E, R>, f: (value: A) => A): Effect.Effect<A, E, R>
} = dual(2, function update<A, E, R>(ref: RefSubject<A, E, R>, f: (value: A) => A) {
  return updateEffect(ref, (value) => Effect.succeed(f(value)))
})

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

export function increment<E, R>(ref: RefSubject<number, E, R>): Effect.Effect<number, E, R> {
  return update(ref, (value) => value + 1)
}

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

      /// Computed
      static readonly [ComputedTypeId]: ComputedTypeId = ComputedTypeId
      static readonly version = Effect.flatMap(service.asEffect(), (ref) => ref.version)

      // RefSubject
      static readonly [RefSubjectTypeId]: RefSubjectTypeId = RefSubjectTypeId
      static readonly updates = <B, E2, R2>(f: (ref: GetSetDelete<A, E, never>) => Effect.Effect<B, E2, R2>) =>
        Effect.flatMap(service.asEffect(), (ref) => ref.updates(f))

      // Subject
      static readonly onSuccess = (value: A) => Effect.flatMap(service.asEffect(), (ref) => ref.onSuccess(value))
      static readonly onFailure = (cause: Cause.Cause<E>) =>
        Effect.flatMap(service.asEffect(), (ref) => ref.onFailure(cause))
      static readonly subscriberCount = Effect.flatMap(service.asEffect(), (ref) => ref.subscriberCount)
      static readonly interrupt = Effect.flatMap(service.asEffect(), (ref) => ref.interrupt)

      // Fx
      static readonly [Fx.FxTypeId]: Fx.Fx.Variance<A, E, Self> = Variance
      static readonly run = <RSink>(sink: Sink.Sink<A, E, RSink>) =>
        Effect.flatMap(service.asEffect(), (ref) => ref.run(sink))

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
 * Extract all values from an object using a Proxy
 *
 * @since 2.0.0
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
