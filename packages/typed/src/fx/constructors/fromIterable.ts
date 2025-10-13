import { forEach } from "effect/Effect"
import type { Fx } from "../Fx.ts"
import { make } from "./make.ts"

export const fromIterable = <A>(iterable: Iterable<A>): Fx<A> =>
  /*#__PURE__*/ make<A>((sink) => forEach(iterable, sink.onSuccess, { discard: true }))
