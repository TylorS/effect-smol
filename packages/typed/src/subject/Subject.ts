import { type Cause, Exit, type ServiceMap } from "effect"
import * as Option from "effect/data/Option"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import { dual } from "effect/Function"
import { pipeArguments } from "effect/interfaces/Pipeable"
import * as MutableRef from "effect/MutableRef"
import * as Scope from "effect/Scope"
import type { Fx } from "../fx/Fx.ts"
import { FxTypeId } from "../fx/TypeId.ts"
import { RingBuffer } from "../internal/ring-buffer.ts"
import { awaitScopeClose, withExtendedScope } from "../internal/scope.ts"
import type { Sink } from "../sink/Sink.ts"

export interface Subject<A, E = never, R = never> extends Fx<A, E, R | Scope.Scope>, Sink<A, E, R> {
  readonly subscriberCount: Effect.Effect<number, never, R>
  readonly interrupt: Effect.Effect<void, never, R>
}

export function share<A, E, R, R2>(
  fx: Fx<A, E, R>,
  subject: Subject<A, E, R2>
): Fx<A, E, R | R2 | Scope.Scope> {
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

export class Share<A, E, R, R2> implements Fx<A, E, R | R2 | Scope.Scope> {
  readonly [FxTypeId]: FxTypeId = FxTypeId

  _FxFiber: MutableRef.MutableRef<Option.Option<Fiber.Fiber<unknown>>> = MutableRef.make(Option.none())
  _RefCount = new RefCounter()

  readonly i0: Fx<A, E, R>
  readonly i1: Subject<A, E, R2>

  constructor(
    i0: Fx<A, E, R>,
    i1: Subject<A, E, R2>
  ) {
    this.i0 = i0
    this.i1 = i1
  }

  pipe() {
    return pipeArguments(this, arguments)
  }

  run<R3>(sink: Sink<A, E, R3>): Effect.Effect<unknown, never, R | R2 | R3 | Scope.Scope> {
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

export function multicast<A, E, R>(
  fx: Fx<A, E, R>
): Fx<A, E, R | Scope.Scope> {
  return new Share(fx, unsafeMake<A, E>(0))
}

export function hold<A, E, R>(
  fx: Fx<A, E, R>
): Fx<A, E, R | Scope.Scope> {
  return new Share(fx, unsafeMake<A, E>(1))
}

export const replay: {
  (capacity: number): <A, E, R>(fx: Fx<A, E, R>) => Fx<A, E, R>
  <A, E, R>(fx: Fx<A, E, R>, capacity: number): Fx<A, E, R>
} = dual(2, function replay<A, E, R>(
  fx: Fx<A, E, R>,
  capacity: number
): Fx<A, E, R | Scope.Scope> {
  return new Share(fx, unsafeMake<A, E>(capacity))
})

const DISCARD = { discard: true } as const

/**
 * @internal
 */
export class SubjectImpl<A, E> implements Subject<A, E> {
  readonly [FxTypeId]: FxTypeId = FxTypeId
  protected sinks: Set<readonly [Sink<A, E, any>, ServiceMap.ServiceMap<any>, Scope.Closeable]> = new Set()

  constructor() {
    this.onFailure = this.onFailure.bind(this)
    this.onSuccess = this.onSuccess.bind(this)
  }

  pipe() {
    return pipeArguments(this, arguments)
  }

  run<R2>(sink: Sink<A, E, R2>): Effect.Effect<unknown, never, R2 | Scope.Scope> {
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
    sink: Sink<A, E, R>,
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
  sink: Sink<A, E, any>,
  ctx: ServiceMap.ServiceMap<any>,
  a: A
): Effect.Effect<void, never, never> {
  return Effect.provide(Effect.catchCause(sink.onSuccess(a), sink.onFailure), ctx)
}

function runSinkCause<A, E>(
  sink: Sink<A, E, any>,
  ctx: ServiceMap.ServiceMap<any>,
  scope: Scope.Closeable,
  cause: Cause.Cause<E>
) {
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

  override run<R2>(sink: Sink<A, E, R2>): Effect.Effect<unknown, never, R2 | Scope.Scope> {
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

  override run<R2>(sink: Sink<A, E, R2>): Effect.Effect<unknown, never, R2 | Scope.Scope> {
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

export function make<A, E = never>(replay?: number): Effect.Effect<Subject<A, E>, never, Scope.Scope> {
  return Effect.acquireRelease(Effect.sync(() => unsafeMake(replay)), (subject) => subject.interrupt)
}
