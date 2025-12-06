import type * as Cause from "../../../Cause.ts"
import * as Option from "../../../data/Option.ts"
import * as Effect from "../../../Effect.ts"
import * as Exit from "../../../Exit.ts"
import * as Fiber from "../../../Fiber.ts"
import { dual, identity } from "../../../Function.ts"
import { pipeArguments } from "../../../interfaces/Pipeable.ts"
import * as Layer from "../../../Layer.ts"
import * as MutableRef from "../../../MutableRef.ts"
import * as Scope from "../../../Scope.ts"
import * as ServiceMap from "../../../ServiceMap.ts"
import type * as Fx from "../Fx/index.ts"
import { RingBuffer } from "../Fx/internal/ring-buffer.ts"
import { awaitScopeClose, withExtendedScope } from "../Fx/internal/scope.ts"
import { FxTypeId } from "../Fx/TypeId.ts"
import type * as Sink from "../Sink/Sink.ts"

/**
 * A `Subject` is an `Fx` that allows for imperative pushing of values.
 * It also acts as a `Sink`, meaning you can `run` another `Fx` into it.
 *
 * @since 1.0.0
 * @category models
 */
export interface Subject<A, E = never, R = never> extends Fx.Fx<A, E, R | Scope.Scope>, Sink.Sink<A, E, R> {
  /**
   * The number of current subscribers to this Subject.
   */
  readonly subscriberCount: Effect.Effect<number, never, R>
  /**
   * Interrupts all subscribers and clears the subject.
   */
  readonly interrupt: Effect.Effect<void, never, R>
}

export declare namespace Subject {
  export interface Service<Self, Id extends string, A, E> extends Subject<A, E, Self> {
    readonly id: Id
    readonly service: ServiceMap.Service<Self, Subject<A, E>>
    readonly make: (replay?: number) => Layer.Layer<Self, never, Scope.Scope>
  }

  export interface Class<Self, Id extends string, A, E> extends Service<Self, Id, A, E> {
    new(): Service<Self, Id, A, E>
  }
}

/**
 * Shares the execution of an Fx among multiple subscribers using a Subject.
 * The source Fx is started when the first subscriber arrives and stopped when the last one leaves.
 *
 * @param fx - The source Fx.
 * @param subject - The subject to use for multicasting.
 * @returns A shared `Fx`.
 * @since 1.0.0
 * @category combinators
 */
export function share<A, E, R, R2>(
  fx: Fx.Fx<A, E, R>,
  subject: Subject<A, E, R2>
): Fx.Fx<A, E, R | R2 | Scope.Scope> {
  return new Share(fx, subject)
}

class RefCounter {
  _RefCount: MutableRef.MutableRef<number> = MutableRef.make(0)

  increment() {
    return MutableRef.updateAndGet(this._RefCount, (n) => n + 1)
  }

  decrement() {
    return MutableRef.updateAndGet(this._RefCount, (n) => Math.max(0, n - 1))
  }
}

const VARIANCE: Fx.Fx.Variance<any, any, any> = {
  _A: identity,
  _E: identity,
  _R: identity
}

export class Share<A, E, R, R2> implements Fx.Fx<A, E, R | R2 | Scope.Scope> {
  readonly [FxTypeId]: Fx.Fx.Variance<A, E, R | R2 | Scope.Scope> = VARIANCE

  _FxFiber: MutableRef.MutableRef<Option.Option<Fiber.Fiber<unknown>>> = MutableRef.make(Option.none())
  _RefCount = new RefCounter()

  readonly i0: Fx.Fx<A, E, R>
  readonly i1: Subject<A, E, R2>

  constructor(
    i0: Fx.Fx<A, E, R>,
    i1: Subject<A, E, R2>
  ) {
    this.i0 = i0
    this.i1 = i1
  }

  pipe() {
    return pipeArguments(this, arguments)
  }

  run<R3>(sink: Sink.Sink<A, E, R3>): Effect.Effect<unknown, never, R | R2 | R3 | Scope.Scope> {
    return Effect.flatMap(
      this.initialize(),
      () => Effect.onExit(this.i1.run(sink), () => this._RefCount.decrement() === 0 ? this.interrupt() : Effect.void)
    )
  }

  private initialize(): Effect.Effect<unknown, never, R | R2> {
    return Effect.suspend((): Effect.Effect<unknown, never, R | R2> => {
      if (this._RefCount.increment() === 1) {
        return this.i0.run(this.i1).pipe(
          Effect.ensuring(
            Effect.suspend(() => {
              MutableRef.set(this._FxFiber, Option.none())
              return this.i1.interrupt
            })
          ),
          Effect.interruptible,
          Effect.forkDetach,
          Effect.tap((fiber) => Effect.sync(() => MutableRef.set(this._FxFiber, Option.some(fiber))))
        )
      } else {
        return Effect.void
      }
    })
  }

  private interrupt(): Effect.Effect<void, never, R | R2> {
    return Option.match(MutableRef.getAndSet(this._FxFiber, Option.none()), {
      onNone: () => Effect.void,
      onSome: Fiber.interrupt
    })
  }
}

/**
 * Multicasts an Fx to multiple subscribers.
 * The source Fx is shared, so side effects only happen once per active session (ref count > 0).
 *
 * @param fx - The source Fx.
 * @returns A multicasted `Fx`.
 * @since 1.0.0
 * @category combinators
 */
export function multicast<A, E, R>(
  fx: Fx.Fx<A, E, R>
): Fx.Fx<A, E, R | Scope.Scope> {
  return new Share(fx, unsafeMake<A, E>(0))
}

/**
 * Holds the latest value emitted by the Fx and replays it to new subscribers.
 *
 * @param fx - The source Fx.
 * @returns A shared `Fx` that replays the latest value.
 * @since 1.0.0
 * @category combinators
 */
export function hold<A, E, R>(
  fx: Fx.Fx<A, E, R>
): Fx.Fx<A, E, R | Scope.Scope> {
  return new Share(fx, unsafeMake<A, E>(1))
}

/**
 * Replays the last `capacity` values emitted by the Fx to new subscribers.
 *
 * @param capacity - The number of values to buffer and replay.
 * @param fx - The source Fx.
 * @returns A shared `Fx` that replays values.
 * @since 1.0.0
 * @category combinators
 */
export const replay: {
  (capacity: number): <A, E, R>(fx: Fx.Fx<A, E, R>) => Fx.Fx<A, E, R>
  <A, E, R>(fx: Fx.Fx<A, E, R>, capacity: number): Fx.Fx<A, E, R>
} = dual(2, function replay<A, E, R>(
  fx: Fx.Fx<A, E, R>,
  capacity: number
): Fx.Fx<A, E, R | Scope.Scope> {
  return new Share(fx, unsafeMake<A, E>(capacity))
})

const DISCARD = { discard: true } as const

/**
 * @internal
 */
export class SubjectImpl<A, E> implements Subject<A, E> {
  readonly [FxTypeId]: Fx.Fx.Variance<A, E, Scope.Scope> = VARIANCE
  protected sinks: Set<readonly [Sink.Sink<A, E, any>, ServiceMap.ServiceMap<any>, Scope.Closeable]> = new Set()

  constructor() {
    this.onFailure = this.onFailure.bind(this)
    this.onSuccess = this.onSuccess.bind(this)
  }

  pipe() {
    return pipeArguments(this, arguments)
  }

  run<R2>(sink: Sink.Sink<A, E, R2>): Effect.Effect<unknown, never, R2 | Scope.Scope> {
    return this.addSink(sink, awaitScopeClose)
  }

  onFailure(cause: Cause.Cause<E>) {
    return this.onCause(cause)
  }

  onSuccess(a: A) {
    return this.onEvent(a)
  }

  protected interruptScopes = Effect.withFiber((fiber) =>
    Effect.forEach(Array.from(this.sinks), ([, , scope]) => Scope.close(scope, Exit.interrupt(fiber.id)), DISCARD)
  )

  readonly interrupt = this.interruptScopes

  protected addSink<R, B, R2>(
    sink: Sink.Sink<A, E, R>,
    f: (scope: Scope.Scope) => Effect.Effect<B, never, R2>
  ): Effect.Effect<B, never, R2 | Scope.Scope> {
    return withExtendedScope(
      (innerScope) =>
        Effect.servicesWith((ctx) => {
          const entry = [sink, ctx, innerScope] as const
          this.sinks.add(entry)
          const remove = Effect.sync(() => this.sinks.delete(entry))

          return Effect.flatMap(
            Scope.addFinalizer(innerScope, remove),
            () => f(innerScope)
          )
        }),
      "sequential"
    )
  }

  readonly subscriberCount: Effect.Effect<number> = Effect.sync(() => this.sinks.size)

  protected onEvent(a: A): Effect.Effect<void, never, never> {
    if (this.sinks.size === 0) return Effect.void
    else if (this.sinks.size === 1) {
      const [sink, ctx] = this.sinks.values().next().value!
      return runSinkEvent(sink, ctx, a)
    } else {
      return Effect.forEach(
        this.sinks,
        ([sink, ctx]) => runSinkEvent(sink, ctx, a),
        DISCARD
      )
    }
  }

  protected onCause(cause: Cause.Cause<E>) {
    if (this.sinks.size === 0) return Effect.void
    else if (this.sinks.size === 1) {
      const [sink, ctx, scope] = this.sinks.values().next().value!
      return runSinkCause(sink, ctx, scope, cause)
    } else {
      return Effect.forEach(
        this.sinks,
        ([sink, ctx, scope]) => runSinkCause(sink, ctx, scope, cause),
        DISCARD
      )
    }
  }
}

function runSinkEvent<A, E>(
  sink: Sink.Sink<A, E, any>,
  ctx: ServiceMap.ServiceMap<any>,
  a: A
): Effect.Effect<void, never, never> {
  return Effect.provide(Effect.catchCause(sink.onSuccess(a), sink.onFailure), ctx)
}

function runSinkCause<A, E>(
  sink: Sink.Sink<A, E, any>,
  ctx: ServiceMap.ServiceMap<any>,
  scope: Scope.Closeable,
  cause: Cause.Cause<E>
): Effect.Effect<void, never, never> {
  return Effect.provide(
    Effect.catchCause(sink.onFailure(cause), (error) => Scope.close(scope, Exit.failCause(error))),
    ctx
  )
}

/**
 * @internal
 */
export class HoldSubjectImpl<A, E> extends SubjectImpl<A, E> implements Subject<A, E> {
  readonly lastValue: MutableRef.MutableRef<Option.Option<Exit.Exit<A, E>>> = MutableRef.make(Option.none())

  override onSuccess = (a: A): Effect.Effect<void, never, never> =>
    Effect.suspend(() => {
      // Keep track of the last value emitted by the subject
      MutableRef.set(this.lastValue, Option.some(Exit.succeed(a)))

      return this.onEvent(a)
    })

  override onFailure = (cause: Cause.Cause<E>): Effect.Effect<void, never, never> => {
    return Effect.suspend(() => {
      // Keep track of the last value emitted by the subject
      MutableRef.set(this.lastValue, Option.some(Exit.failCause(cause)))

      return this.onCause(cause)
    })
  }

  override run<R2>(sink: Sink.Sink<A, E, R2>): Effect.Effect<unknown, never, R2 | Scope.Scope> {
    return this.addSink(sink, (scope) =>
      Option.match(MutableRef.get(this.lastValue), {
        onNone: () => awaitScopeClose(scope),
        // If we have a previous value, emit it first
        onSome: (exit) => Effect.flatMap(Exit.match(exit, sink), () => awaitScopeClose(scope))
      }))
  }

  override readonly interrupt = Effect.tap(
    this.interruptScopes,
    () => MutableRef.set(this.lastValue, Option.none())
  )
}

/**
 * @internal
 */
export class ReplaySubjectImpl<A, E> extends SubjectImpl<A, E> {
  readonly buffer: RingBuffer<Exit.Exit<A, E>>

  constructor(buffer: RingBuffer<Exit.Exit<A, E>>) {
    super()
    this.buffer = buffer
  }

  override onSuccess = (a: A): Effect.Effect<void, never, never> =>
    Effect.suspend(() => {
      // Keep track of the last value emitted by the subject
      this.buffer.push(Exit.succeed(a))
      return this.onEvent(a)
    })

  override onFailure = (cause: Cause.Cause<E>): Effect.Effect<void, never, never> =>
    Effect.suspend(() => {
      this.buffer.push(Exit.failCause(cause))
      return this.onCause(cause)
    })

  override run<R2>(sink: Sink.Sink<A, E, R2>): Effect.Effect<unknown, never, R2 | Scope.Scope> {
    return this.addSink(
      sink,
      (scope) => Effect.flatMap(this.buffer.forEach(Exit.match(sink)), () => awaitScopeClose(scope))
    )
  }

  override readonly interrupt = Effect.tap(
    this.interruptScopes,
    () => this.buffer.clear()
  )
}

/**
 * Creates a `Subject` that replays the last `replay` values. You will need to manually call `interrupt` on the subject to clear resources.
 * @param replay - The number of values to replay.
 * @returns A `Subject` that replays the last `replay` values.
 */
export function unsafeMake<A, E = never>(replay: number = 0): Subject<A, E> {
  replay = Math.max(0, replay)

  if (replay === 0) {
    return new SubjectImpl<A, E>()
  } else if (replay === 1) {
    return new HoldSubjectImpl<A, E>()
  } else {
    return new ReplaySubjectImpl<A, E>(new RingBuffer(replay))
  }
}

/**
 * Create a Subject which utilizes a Scope to manage the lifecycle of the subject's resources.
 */
export function make<A, E = never>(replay?: number): Effect.Effect<Subject<A, E>, never, Scope.Scope> {
  return Effect.acquireRelease(Effect.sync(() => unsafeMake(replay)), (subject) => subject.interrupt)
}

export function Service<Self, A, E = never>() {
  return <const Id extends string>(id: Id): Subject.Class<Self, Id, A, E> => {
    const service = ServiceMap.Service<Self, Subject<A, E>>(id)

    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
    return class SubjectService {
      static readonly id = id
      static readonly service = service

      static readonly make = (replay?: number): Layer.Layer<Self, never, Scope.Scope> =>
        Layer.effect(
          service,
          make<A, E>(replay)
        )

      static readonly [FxTypeId] = VARIANCE
      static readonly pipe = function(this: any) {
        return pipeArguments(this, arguments)
      }

      // Fx
      static readonly run = <RSink>(sink: Sink.Sink<A, E, RSink>) =>
        Effect.flatMap(service.asEffect(), (subject) => subject.run(sink))

      // Sink
      static readonly onSuccess = (value: A) =>
        Effect.flatMap(service.asEffect(), (subject) => subject.onSuccess(value))
      static readonly onFailure = (cause: Cause.Cause<E>) =>
        Effect.flatMap(service.asEffect(), (subject) => subject.onFailure(cause))

      // Subject
      static readonly subscriberCount = Effect.flatMap(service.asEffect(), (subject) => subject.subscriberCount)
      static readonly interrupt = Effect.flatMap(service.asEffect(), (subject) => subject.interrupt)

      constructor() {
        return SubjectService
      }
    } as unknown as Subject.Class<Self, Id, A, E>
  }
}
