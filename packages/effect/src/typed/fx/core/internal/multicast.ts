import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"

export class MulticastEffect<A, E, R> extends Effect.YieldableClass<A, E, R> {
  private _fiber: Fiber.Fiber<A, E> | null = null

  readonly effect: Effect.Effect<A, E, R>

  constructor(
    effect: Effect.Effect<A, E, R>
  ) {
    super()
    this.effect = effect
  }

  asEffect() {
    return Effect.suspend(() => {
      if (this._fiber) {
        return Fiber.join(this._fiber)
      } else {
        return Effect.forkDetach(this.effect).pipe(
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

export const makeMulticastEffect = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.acquireRelease(
    Effect.sync(() => new MulticastEffect(effect)),
    (multicastEffect) => multicastEffect.interrupt()
  )
