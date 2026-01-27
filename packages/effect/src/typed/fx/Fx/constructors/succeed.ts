import type { Fx } from "../Fx.ts"
import { make } from "./make.ts"

/**
 * Creates an Fx that emits a single value and then completes.
 *
 * @param value - The value to emit.
 * @returns An `Fx` that emits the value.
 * @since 1.0.0
 * @category constructors
 */
export const succeed = <A>(value: A): Fx<A> => /*#__PURE__*/ make<A>((sink) => sink.onSuccess(value))

/**
 * An Fx that emits `null` and then completes.
 * @since 1.0.0
 * @category constructors
 */
export const succeedNull = succeed<null>(null)
export { succeedNull as null }

/**
 * An Fx that emits `undefined` and then completes.
 * @since 1.0.0
 * @category constructors
 */
export const succeedUndefined = succeed<undefined>(undefined)
export { succeedUndefined as undefined }

/**
 * An Fx that emits `void` and then completes.
 * @since 1.0.0
 * @category constructors
 */
export const succeedVoid = succeed<void>(void 0)
export { succeedVoid as void }
