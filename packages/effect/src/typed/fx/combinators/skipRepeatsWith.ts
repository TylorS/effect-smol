import type * as Equivalence from "../../../data/Equivalence.ts"
import * as Option from "../../../data/Option.ts"
import * as Effect from "../../../Effect.ts"
import * as Ref from "../../../Ref.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"
import * as sinkCore from "../sink/combinators.ts"
import { make as makeSink } from "../sink/Sink.ts"

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
