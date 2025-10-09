import type * as Option from "effect/data/Option"
import * as sinkCore from "../../sink/combinators.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"

export const compact = <A, E, R>(
  self: Fx<Option.Option<A>, E, R>
): Fx<A, E, R> => make<A, E, R>((sink) => self.run(sinkCore.compact(sink)))
