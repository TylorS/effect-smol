import * as Effect from "../../../../Effect.ts"
import type * as Fiber from "../../../../Fiber.ts"
import { dual } from "../../../../Function.ts"
import { take } from "../combinators/take.ts"
import type { Fx } from "../Fx.ts"
import { observe } from "./observe.ts"

/**
 * Collects all values emitted by an `Fx` into an array.
 *
 * @param fx - The `Fx` to collect values from.
 * @returns An `Effect` that produces an array of all values when the `Fx` completes.
 * @since 1.0.0
 * @category runners
 */
export const collectAll = <A, E = never, R = never>(
  fx: Fx<A, E, R>
): Effect.Effect<ReadonlyArray<A>, E, R> =>
  Effect.suspend(() => {
    const values: Array<A> = []

    return fx.pipe(
      observe((value) => Effect.sync(() => values.push(value))),
      (_) => Effect.map(_.asEffect(), () => values)
    )
  })

/**
 * Forks the collection of all values from an `Fx`.
 *
 * @param fx - The `Fx` to collect values from.
 * @returns An `Effect` that produces a `Fiber` which computes the array of values.
 * @since 1.0.0
 * @category runners
 */
export const collectAllFork = <A, E = never, R = never>(
  fx: Fx<A, E, R>
): Effect.Effect<Fiber.Fiber<ReadonlyArray<A>, E>, never, R> =>
  Effect.forkChild(collectAll(fx), {
    startImmediately: true,
    uninterruptible: false
  })

/**
 * Collects the first `n` values emitted by an `Fx` into an array.
 *
 * @param fx - The `Fx` to collect values from.
 * @param upTo - The maximum number of values to collect.
 * @returns An `Effect` that produces an array of up to `n` values.
 * @since 1.0.0
 * @category runners
 */
export const collectUpTo: {
  (
    upTo: number
  ): <A, E, R>(fx: Fx<A, E, R>) => Effect.Effect<ReadonlyArray<A>, E, R>

  <A, E, R>(
    fx: Fx<A, E, R>,
    upTo: number
  ): Effect.Effect<ReadonlyArray<A>, E, R>
} = dual(
  2,
  <A, E, R>(fx: Fx<A, E, R>, upTo: number): Effect.Effect<ReadonlyArray<A>, E, R> =>
    fx.pipe(
      take(upTo),
      collectAll
    )
)

/**
 * Forks the collection of up to `n` values from an `Fx`.
 *
 * @param fx - The `Fx` to collect values from.
 * @param upTo - The maximum number of values to collect.
 * @returns An `Effect` that produces a `Fiber` which computes the array of values.
 * @since 1.0.0
 * @category runners
 */
export const collectUpToFork = <A, E = never, R = never>(
  fx: Fx<A, E, R>,
  upTo: number
): Effect.Effect<Fiber.Fiber<ReadonlyArray<A>, E>, never, R> =>
  Effect.forkChild(collectUpTo(fx, upTo), {
    startImmediately: true,
    uninterruptible: false
  })
