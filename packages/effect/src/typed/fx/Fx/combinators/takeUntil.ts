import { dual } from "effect/Function"
import * as combinators from "../../Sink/combinators.ts"
import { make as makeSink } from "../../Sink/Sink.ts"
import { make as makeFx } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"

/**
 * Takes elements from an Fx until a predicate returns true.
 * The element that satisfies the predicate is included in the output.
 *
 * @param predicate - The predicate function.
 * @returns An `Fx` that completes when the predicate matches.
 * @since 1.0.0
 * @category combinators
 */
export const takeUntil: {
  <A>(predicate: (a: A) => boolean): <E, R>(fx: Fx<A, E, R>) => Fx<A, E, R>
  <A, E, R>(fx: Fx<A, E, R>, predicate: (a: A) => boolean): Fx<A, E, R>
} = dual(2, <A, E, R>(fx: Fx<A, E, R>, predicate: (a: A) => boolean): Fx<A, E, R> => {
  return makeFx<A, E, R>((sink) =>
    combinators.withEarlyExit(sink, (sink) =>
      fx.run(makeSink(
        sink.onFailure,
        (a) => {
          if (predicate(a)) {
            return sink.earlyExit
          }
          return sink.onSuccess(a)
        }
      )))
  )
})

/**
 * Drops elements from an Fx after a predicate returns true.
 *
 * @param predicate - The predicate function.
 * @returns An `Fx` that stops emitting when the predicate matches.
 * @since 1.0.0
 * @category combinators
 */
export const dropAfter: {
  <A>(predicate: (a: A) => boolean): <E, R>(fx: Fx<A, E, R>) => Fx<A, E, R>
  <A, E, R>(fx: Fx<A, E, R>, predicate: (a: A) => boolean): Fx<A, E, R>
} = dual(
  2,
  <A, E, R>(fx: Fx<A, E, R>, predicate: (a: A) => boolean): Fx<A, E, R> =>
    makeFx<A, E, R>((sink) => combinators.dropAfter(sink, predicate, (sink) => fx.run(sink)))
)
