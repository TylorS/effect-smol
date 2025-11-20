import type * as Cause from "effect/Cause"
import type { Fx } from "../Fx.ts"
import { make } from "./make.ts"

export const failCause = <E>(cause: Cause.Cause<E>): Fx<never, E, never> =>
  /*#__PURE__*/ make<never, E, never>((sink) => sink.onFailure(cause))
