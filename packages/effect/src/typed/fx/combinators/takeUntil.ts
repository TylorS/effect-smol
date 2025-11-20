import { dual } from "../../../Function.ts"
import { make as makeFx } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"
import * as combinators from "../sink/combinators.ts"
import { make as makeSink } from "../sink/Sink.ts"

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

export const dropAfter: {
  <A>(predicate: (a: A) => boolean): <E, R>(fx: Fx<A, E, R>) => Fx<A, E, R>
  <A, E, R>(fx: Fx<A, E, R>, predicate: (a: A) => boolean): Fx<A, E, R>
} = dual(
  2,
  <A, E, R>(fx: Fx<A, E, R>, predicate: (a: A) => boolean): Fx<A, E, R> =>
    makeFx<A, E, R>((sink) => combinators.dropAfter(sink, predicate, (sink) => fx.run(sink)))
)
