import * as Effect from "./Effect.js"
import { dual, identity } from "./Function.js"
import type { Pipeable } from "./Pipeable.js"
import { pipeArguments } from "./Pipeable.js"
import * as Ref from "./Ref.js"
import type { Covariant } from "./Types.js"

export const TypeId = Symbol.for("effect/SynchronizedRef")
export type TypeId = typeof TypeId

export interface SynchronizedRef<A> extends Pipeable {
  readonly [TypeId]: SynchronizedRef.Variance<A>
  readonly ref: Ref.Ref<A>
  readonly semaphore: Effect.Semaphore
}

export namespace SynchronizedRef {
  export type Variance<A> = {
    readonly _A: Covariant<A>
  }
}

const _variance: SynchronizedRef.Variance<any> = {
  _A: identity
}

class SynchronizedRefImpl<A> implements SynchronizedRef<A> {
  readonly [TypeId]: SynchronizedRef.Variance<A> = _variance

  constructor(readonly ref: Ref.Ref<A>, readonly semaphore: Effect.Semaphore) {}

  pipe() {
    return pipeArguments(this, arguments)
  }
}

export const make = <A>(initialValue: A): Effect.Effect<SynchronizedRef<A>> =>
  Effect.gen(function*() {
    const ref = yield* Ref.make(initialValue)
    const semaphore = yield* Effect.makeSemaphore(1)
    return new SynchronizedRefImpl(ref, semaphore)
  })

export const unsafeMake = <A>(initialValue: A): SynchronizedRef<A> => {
  const ref = Ref.unsafeMake(initialValue)
  const semaphore = Effect.unsafeMakeSemaphore(1)
  return new SynchronizedRefImpl(ref, semaphore)
}

export const get = <A>(self: SynchronizedRef<A>): Effect.Effect<A> => Ref.get(self.ref)

export const modifyEffect: {
  <A, B, E, R>(f: (a: A) => Effect.Effect<readonly [B, A], E, R>): (self: SynchronizedRef<A>) => Effect.Effect<B, E, R>
  <A, B, E, R>(self: SynchronizedRef<A>, f: (a: A) => Effect.Effect<readonly [B, A], E, R>): Effect.Effect<B, E, R>
} = dual(
  2,
  function<A, B, E, R>(
    self: SynchronizedRef<A>,
    f: (a: A) => Effect.Effect<readonly [B, A], E, R>
  ): Effect.Effect<B, E, R> {
    return Effect.gen(function*() {
      const current = yield* Ref.get(self.ref)
      const [b, a] = yield* f(current)
      yield* Ref.set(self.ref, a)
      return b
    }).pipe(
      self.semaphore.withPermits(1)
    )
  }
)

export const updateEffect: {
  <A, E, R>(f: (a: A) => Effect.Effect<A, E, R>): (self: SynchronizedRef<A>) => Effect.Effect<A, E, R>
  <A, E, R>(self: SynchronizedRef<A>, f: (a: A) => Effect.Effect<A, E, R>): Effect.Effect<A, E, R>
} = dual(2, function<A, E, R>(self: SynchronizedRef<A>, f: (a: A) => Effect.Effect<A, E, R>): Effect.Effect<A, E, R> {
  return Effect.gen(function*() {
    const current = yield* Ref.get(self.ref)
    const a = yield* f(current)
    return yield* Ref.setAndGet(self.ref, a)
  }).pipe(
    self.semaphore.withPermits(1)
  )
})

export const update: {
  <A>(f: (a: A) => A): (self: SynchronizedRef<A>) => Effect.Effect<A>
  <A>(self: SynchronizedRef<A>, f: (a: A) => A): Effect.Effect<A>
} = dual(2, function<A>(self: SynchronizedRef<A>, f: (a: A) => A): Effect.Effect<A> {
  return Effect.gen(function*() {
    const current = yield* Ref.get(self.ref)
    const b = f(current)
    return yield* Ref.setAndGet(self.ref, b)
  }).pipe(
    self.semaphore.withPermits(1)
  )
})
