import { MutableRef } from "effect"
import type * as Equivalence from "effect/data/Equivalence"
import * as Option from "effect/data/Option"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"

export class DeferredRef<E, A> extends Effect.YieldableClass<A, E, never> {
  // Keep track of the latest value emitted by the stream
  public version!: number
  public deferred!: Deferred.Deferred<A, E>

  constructor(
    private id: number | undefined,
    private eq: Equivalence.Equivalence<Exit.Exit<A, E>>,
    readonly current: MutableRef.MutableRef<Option.Option<Exit.Exit<A, E>>>
  ) {
    super()
    this.reset()
  }

  asEffect() {
    return Effect.suspend(() => {
      const current = MutableRef.get(this.current)
      if (Option.isNone(current)) {
        return Deferred.await(this.deferred)
      } else {
        return current.value
      }
    })
  }

  done(exit: Exit.Exit<A, E>): boolean {
    const current = MutableRef.get(this.current)

    MutableRef.set(this.current, Option.some(exit))

    if (Option.isSome(current) && this.eq(current.value, exit)) {
      return false
    }

    Deferred.doneUnsafe(this.deferred, exit)
    this.version += 1

    return true
  }

  reset() {
    MutableRef.set(this.current, Option.none())
    this.version = -1

    if (this.deferred) {
      Deferred.doneUnsafe(this.deferred, Exit.interrupt(this.id))
    }

    this.deferred = Deferred.makeUnsafe()
  }
}

export function make<E, A>(eq: Equivalence.Equivalence<Exit.Exit<A, E>>) {
  return Effect.withFiber((fiber) => Effect.succeed(new DeferredRef(fiber.id, eq, MutableRef.make(Option.none()))))
}

export function unsafeMake<E, A>(
  id: number | undefined,
  eq: Equivalence.Equivalence<Exit.Exit<A, E>>,
  current: MutableRef.MutableRef<Option.Option<Exit.Exit<A, E>>>
) {
  return new DeferredRef(id, eq, current)
}
