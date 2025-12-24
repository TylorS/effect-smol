import type * as Equivalence from "../../../../data/Equivalence.ts"
import * as Option from "../../../../data/Option.ts"
import * as Deferred from "../../../../Deferred.ts"
import * as Effect from "../../../../Effect.ts"
import * as Exit from "../../../../Exit.ts"
import * as MutableRef from "../../../../MutableRef.ts"

/**
 * This is the core piece of state for {@link RefSubject}. It presents an Yieldable/Effect interface
 * which supports retrieving the latest Exit<A, E> or waiting for an initial Exit<A, E> to be set otherwise.
 *
 * It utilizes a Equivalence to determine if the latest Exit<A, E> is the same as the current Exit<A, E> through the
 * done method.
 *
 * @internal
 */
export class DeferredRef<E, A> extends Effect.YieldableClass<A, E, never> {
  public version!: number
  public deferred!: Deferred.Deferred<A, E>

  readonly fiberId: number | undefined
  readonly eq: Equivalence.Equivalence<Exit.Exit<A, E>>
  readonly current: MutableRef.MutableRef<Option.Option<Exit.Exit<A, E>>>

  constructor(
    fiberId: number | undefined,
    eq: Equivalence.Equivalence<Exit.Exit<A, E>>,
    current: MutableRef.MutableRef<Option.Option<Exit.Exit<A, E>>>
  ) {
    super()
    this.fiberId = fiberId
    this.eq = eq
    this.current = current
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
      Deferred.doneUnsafe(this.deferred, Exit.interrupt(this.fiberId))
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
