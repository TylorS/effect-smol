import * as Effect from "../../../../Effect.ts"
import * as Fiber from "../../../../Fiber.ts"
import { dual } from "../../../../Function.ts"
import type * as Scope from "../../../../Scope.ts"
import { make as makeSink, type Sink } from "../../Sink/Sink.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"
import { extendScope } from "../internal/scope.ts"
import type { FlatMapLike } from "./flatMap.ts"

/**
 * Maps each element of an Fx to a new Fx, but only runs one inner Fx at a time.
 * If a new element arrives while an inner Fx is running, the new element is buffered (overwriting any previously buffered value).
 * When the current inner Fx completes, the latest buffered Fx is run.
 *
 * This is useful for scenarios where you want to ignore intermediate values but ensure the latest value is eventually processed.
 *
 * @param f - A function that maps an element `A` to a new `Fx<B>`.
 * @returns An `Fx` that emits values from the inner streams.
 * @since 1.0.0
 * @category combinators
 */
export const exhaustLatestMap: FlatMapLike = dual(2, <A, E, R, B, E2, R2>(
  self: Fx<A, E, R>,
  f: (a: A) => Fx<B, E2, R2>
): Fx<B, E | E2, R | R2 | Scope.Scope> => {
  return make<B, E | E2, R | R2 | Scope.Scope>(Effect.fn(function*<RSink>(sink: Sink<B, E | E2, RSink>) {
    let runningFiber: Fiber.Fiber<unknown, never> | undefined = undefined
    let nextEffectToFork: Effect.Effect<unknown, never, R2 | RSink> | undefined = undefined

    const scope = yield* Effect.scope

    const fork = (
      effect: Effect.Effect<unknown, never, R2 | RSink>
    ): Effect.Effect<Fiber.Fiber<unknown, never>, never, RSink | R2> =>
      Effect.forkIn(
        effect.pipe(
          Effect.ensuring(
            Effect.zip(resetRunningFiber, runNext)
          )
        ),
        scope
      )

    const resetRunningFiber: Effect.Effect<void, never, never> = Effect.sync(() => runningFiber = undefined)

    const runNext: Effect.Effect<void, never, R2 | RSink> = Effect.gen(function*() {
      if (nextEffectToFork !== undefined) {
        const eff = nextEffectToFork
        nextEffectToFork = undefined
        yield* exhaustLatestFork(eff)
        // Ensure we don't close the scope until the last fiber completes
        if (runningFiber !== undefined) yield* Fiber.join(runningFiber)
      }
    })

    const exhaustLatestFork = Effect.fn(function*(eff: Effect.Effect<void, never, R2 | RSink>) {
      if (runningFiber === undefined) {
        runningFiber = yield* fork(eff)
      } else {
        nextEffectToFork = eff
      }
    })

    yield* self.run(makeSink(
      sink.onFailure,
      (a) => exhaustLatestFork(f(a).run(sink))
    ))

    if (runningFiber !== undefined) yield* Fiber.join(runningFiber as Fiber.Fiber<void, never>)
  }, extendScope))
})
