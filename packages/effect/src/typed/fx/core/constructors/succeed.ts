import type { Fx } from "../Fx.ts"
import { make } from "./make.ts"

export const succeed = <A>(value: A): Fx<A> => /*#__PURE__*/ make<A>((sink) => sink.onSuccess(value))

export const succeedNull = succeed(null)
export { succeedNull as null }
