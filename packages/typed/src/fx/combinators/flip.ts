import * as sinkCore from "../../sink/combinators.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"

export const flip = <A, E, R>(fx: Fx<A, E, R>): Fx<E, A, R> => make<E, A, R>((sink) => fx.run(sinkCore.flip(sink)))
