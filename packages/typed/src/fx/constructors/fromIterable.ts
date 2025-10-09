import { forEach } from "effect/Effect"
import type { Fx } from "../Fx.ts"
import { make } from "./make.ts"

export const fromIterable = <A>(iterable: Iterable<A>): Fx<A, never, never> =>
  /*#__PURE__*/ make<A, never, never>((sink) => forEach(iterable, sink.onSuccess))
