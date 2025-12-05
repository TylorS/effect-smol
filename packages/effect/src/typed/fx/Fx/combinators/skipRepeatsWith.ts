import type * as Equivalence from "../../../../data/Equivalence.ts"
import * as Option from "../../../../data/Option.ts"
import * as Effect from "../../../../Effect.ts"
import * as Ref from "../../../../Ref.ts"
import * as sinkCore from "../../Sink/combinators.ts"
import { make as makeSink } from "../../Sink/Sink.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"

/**
 * Drops elements that are equal to the previous element using a custom equivalence function.
 *
 * @param Eq - The equivalence function to use.
 * @returns An `Fx` with consecutive duplicates removed.
 * @since 1.0.0
 * @category combinators
 */
export const skipRepeatsWith = <A>(Eq: Equivalence.Equivalence<A>) => <E, R>(fx: Fx<A, E, R>): Fx<A, E, R> =>
  make<A, E, R>((sink) =>
    sinkCore.withState(
      sink,
      Option.none<A>(),
      (sink) =>
        fx.run(makeSink(sink.onFailure, (a2) =>
          Effect.flatten(Ref.modify(
            sink.state,
            Option.match({
              onNone: () => [sink.onSuccess(a2), Option.some(a2)],
              onSome: (a) => Eq(a, a2) ? [Effect.void, Option.some(a)] : [sink.onSuccess(a2), Option.some(a2)]
            })
          ))))
    )
  )
