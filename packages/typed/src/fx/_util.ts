import type { Exit } from "effect"
import { FiberSet, Ref } from "effect"
import * as Equivalence from "effect/data/Equivalence"
import * as Option from "effect/data/Option"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import { equals } from "effect/interfaces/Equal"
import { pipeArguments } from "effect/interfaces/Pipeable"
import * as Scope from "effect/Scope"
import * as SynchronizedRef from "effect/SynchronizedRef"
import type * as Duration from "effect/time/Duration"
import type { Fx } from "./Fx"
import type { Sink } from "./Sink"

export type ExecutionStrategy = "sequential" | "parallel"

export const withScope = <A, E, R>(
  f: (scope: Scope.Closeable) => Effect.Effect<A, E, R>,
  executionStrategy?: ExecutionStrategy
): Effect.Effect<A, E, R | Scope.Scope> =>
  Effect.acquireUseRelease(Effect.scopedWith((scope) => Scope.fork(scope, executionStrategy)), f, Scope.close)

export type Fork = <A, E, R>(
  effect: Effect.Effect<A, E, R>
) => Effect.Effect<Fiber.Fiber<A, E>, never, R>

export const withScopedFork = <A, E, R>(
  f: (fork: Fork, scope: Scope.Closeable) => Effect.Effect<A, E, R>,
  executionStrategy?: ExecutionStrategy
): Effect.Effect<A, E, R | Scope.Scope> =>
  withScope((scope) =>
    f((effect) =>
      Effect.forkIn(effect, scope, {
        startImmediately: true,
        uninterruptible: false
      }), scope), executionStrategy)

export type FxFork = <R>(
  effect: Effect.Effect<void, never, R>
) => Effect.Effect<void, never, R>

export function withSwitchFork<A, E, R>(
  f: (fork: FxFork, scope: Scope.Closeable) => Effect.Effect<A, E, R>
) {
  return withScopedFork(
    (fork, scope) =>
      Effect.flatMap(
        SynchronizedRef.make<Option.Option<Fiber.Fiber<unknown>>>(Option.none()),
        (ref) => runSwitchFork(ref, fork, scope, f)
      ),
    "parallel"
  )
}

function runSwitchFork<A, E, R>(
  ref: SynchronizedRef.SynchronizedRef<Option.Option<Fiber.Fiber<unknown>>>,
  fork: Fork,
  scope: Scope.Closeable,
  f: (fork: FxFork, scope: Scope.Closeable) => Effect.Effect<A, E, R>
) {
  return Effect.flatMap(
    f(
      (effect) =>
        SynchronizedRef.updateEffect(
          ref,
          (fiber) =>
            Option.match(fiber, {
              onNone: () => Effect.asSome(fork(effect)),
              onSome: (fiber) =>
                Effect.flatMap(
                  Fiber.interrupt(fiber),
                  () => Effect.asSome(fork(effect))
                )
            })
        ),
      scope
    ),
    () =>
      Effect.flatMap(
        SynchronizedRef.get(ref),
        Option.match({
          onNone: () => Effect.void,
          onSome: (fiber) => Fiber.join(fiber)
        })
      )
  )
}

export function withExhaustFork<A, E, R>(
  f: (fork: FxFork, scope: Scope.Scope) => Effect.Effect<A, E, R>
) {
  return withScopedFork(
    (fork, scope) =>
      Effect.flatMap(
        Effect.makeSemaphore(1),
        (semaphore) => f((effect) => fork(effect.pipe(semaphore.withPermitsIfAvailable(1))), scope)
      ),
    "parallel"
  )
}

export function withExhaustLatestFork<A, E, R>(
  f: (exhaustLatestFork: FxFork, scope: Scope.Scope) => Effect.Effect<A, E, R>
) {
  return withScopedFork((fork, scope) =>
    Effect.flatMap(
      Effect.zip(
        Ref.make<Fiber.Fiber<void> | void>(undefined),
        Ref.make<Option.Option<Effect.Effect<void, never, any>>>(Option.none())
      ),
      ([ref, nextEffect]) => {
        const reset = Ref.set(ref, undefined)

        // Wait for the current fiber to finish
        const awaitNext = Effect.flatMap(Ref.get(ref), (fiber) => fiber ? Fiber.join(fiber) : Effect.void)

        // Run the next value that's been saved for replay, if it exists
        const runNext: Effect.Effect<void, never, any> = Effect.flatMap(
          Ref.get(nextEffect),
          (next) => {
            if (Option.isNone(next)) {
              return Effect.void
            }

            return Effect.all([
              // Clear the next A to be replayed
              Ref.set(nextEffect, Option.none()),
              // Replay the next A
              exhaustLatestFork(next.value),
              // Ensure we don't close the scope until the last fiber completes
              awaitNext
            ])
          }
        )

        const exhaustLatestFork = <R2>(eff: Effect.Effect<void, never, R2>) =>
          Effect.flatMap(Ref.get(ref), (currentFiber) =>
            currentFiber === undefined
              ? Effect.flatMap(
                fork(
                  Effect.ensuring(
                    eff,
                    Effect.zip(reset, runNext)
                  )
                ),
                (fiber) => Ref.set(ref, fiber)
              ) :
              Ref.set(nextEffect, Option.some(eff)))

        return Effect.zip(f(exhaustLatestFork, scope), awaitNext)
      }
    ), "parallel")
}

export function withUnboundedFork<A, E, R>(
  f: (fork: FxFork, scope: Scope.Scope) => Effect.Effect<A, E, R>
) {
  return withScope((scope) =>
    Effect.flatMap(
      FiberSet.make<void, never>(),
      (set) =>
        Effect.flatMap(
          f((effect) => FiberSet.run(set, effect, { startImmediately: true }), scope),
          () => FiberSet.join(set)
        )
    )
  )
}

export function withBoundedFork<A, E, R>(
  capacity: number,
  f: (fork: FxFork, scope: Scope.Scope) => Effect.Effect<A, E, R>
) {
  return withScope((scope) =>
    Effect.flatMap(
      FiberSet.make<void, never>().pipe(
        Effect.zip(
          Effect.makeSemaphore(capacity)
        )
      ),
      ([set, semaphore]) =>
        Effect.flatMap(
          f((effect) => FiberSet.run(set, effect.pipe(semaphore.withPermits(1)), { startImmediately: true }), scope),
          () => FiberSet.join(set)
        )
    )
  )
}

export function withDebounceFork<A, E, R>(
  f: (fork: FxFork, scope: Scope.Scope) => Effect.Effect<A, E, R>,
  duration: Duration.DurationInput
): Effect.Effect<unknown, E, R | Scope.Scope> {
  return withScopedFork(
    (fork, scope) =>
      Effect.flatMap(
        SynchronizedRef.make(Option.none<Fiber.Fiber<void>>()),
        (ref) =>
          Effect.flatMap(
            f(
              (effect) =>
                SynchronizedRef.updateEffect(
                  ref,
                  Option.match({
                    onNone: () => Effect.asSome(fork(Effect.delay(effect, duration))),
                    onSome: (fiber) =>
                      Fiber.interrupt(fiber).pipe(
                        Effect.flatMap(() => fork(Effect.delay(effect, duration))),
                        Effect.asSome
                      )
                  })
                ),
              scope
            ),
            () =>
              SynchronizedRef.get(ref).pipe(Effect.flatMap(Option.match({
                onNone: () => Effect.void,
                onSome: Fiber.join
              })))
          )
      ),
    "sequential"
  )
}

export function awaitScopeClose(scope: Scope.Scope) {
  return Effect.callback<unknown, never, never>((cb) =>
    Scope.addFinalizerExit(scope, () => Effect.sync(() => cb(Effect.void)))
  )
}

export class RingBuffer<A> {
  constructor(
    readonly capacity: number
  ) {
    this._buffer = Array(this.capacity)
  }

  private _buffer: Array<A>
  private _size = 0

  get size() {
    return this._size
  }

  push(a: A) {
    if (this._size < this.capacity) {
      this._buffer[this._size++] = a
    } else {
      this._buffer.shift()
      this._buffer.push(a)
    }
  }

  forEach<B, E2, R2>(
    f: (a: A, i: number) => Effect.Effect<B, E2, R2>
  ) {
    switch (this._size) {
      case 0:
        return Effect.void
      case 1:
        return f(this._buffer[0], 0)
      case 2:
        return Effect.flatMap(f(this._buffer[0], 0), () => f(this._buffer[1], 1))
      case 3:
        return Effect.flatMap(
          f(this._buffer[0], 0),
          () => Effect.flatMap(f(this._buffer[1], 1), () => f(this._buffer[2], 2))
        )
      default:
        return Effect.forEach(
          Array.from({ length: this._size }, (_, i) => this._buffer[i]),
          f,
          {
            discard: true
          }
        )
    }
  }

  clear() {
    this._buffer = Array(this.capacity)
    this._size = 0
  }
}

export class MulticastEffect<A, E, R> extends Effect.YieldableClass<A, E, R> {
  private _fiber: Fiber.Fiber<A, E> | null = null

  constructor(
    readonly effect: Effect.Effect<A, E, R>
  ) {
    super()
  }

  asEffect() {
    return Effect.suspend(() => {
      if (this._fiber) {
        return Fiber.join(this._fiber)
      } else {
        return Effect.forkDaemon(this.effect).pipe(
          Effect.tap((fiber) => Effect.sync(() => this._fiber = fiber)),
          Effect.flatMap((fiber) =>
            Effect.ensuring(Fiber.join(fiber), Effect.sync(() => this._fiber === fiber ? this._fiber = null : null))
          )
        )
      }
    })
  }

  interrupt() {
    return Effect.withFiber((fiber) => {
      if (this._fiber) {
        const eff = Fiber.interruptAs(this._fiber, fiber.id)
        return Effect.ensuring(eff, Effect.sync(() => this._fiber = null))
      } else {
        return Effect.void
      }
    })
  }
}

export abstract class YieldableFx<A, E, R, B, E2, R2> extends Effect.YieldableClass<B, E2, R2> implements Fx<A, E, R> {
  abstract run<R3>(sink: Sink<A, E, R3>): Effect.Effect<unknown, never, R | R3>

  pipe() {
    return pipeArguments(this, arguments)
  }
}

export const getExitEquivalence = <E, A>(A: Equivalence.Equivalence<A>) =>
  Equivalence.make<Exit.Exit<A, E>>((a, b) => {
    if (a._tag === "Failure") {
      return b._tag === "Failure" && equals(a.cause, b.cause)
    } else {
      return b._tag === "Success" && A(a.value, b.value)
    }
  })
