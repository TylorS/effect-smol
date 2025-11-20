import * as Effect from "../../../Effect.ts"
import type * as Fiber from "../../../Fiber.ts"
import { dual } from "../../../Function.ts"
import { take } from "../combinators/take.ts"
import type { Fx } from "../Fx.ts"
import { observe } from "./observe.ts"

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

export const collectAllFork = <A, E = never, R = never>(
  fx: Fx<A, E, R>
): Effect.Effect<Fiber.Fiber<ReadonlyArray<A>, E>, never, R> =>
  Effect.fork(collectAll(fx), {
    startImmediately: true,
    uninterruptible: false
  })

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

export const collectUpToFork = <A, E = never, R = never>(
  fx: Fx<A, E, R>,
  upTo: number
): Effect.Effect<Fiber.Fiber<ReadonlyArray<A>, E>, never, R> =>
  Effect.fork(collectUpTo(fx, upTo), {
    startImmediately: true,
    uninterruptible: false
  })
