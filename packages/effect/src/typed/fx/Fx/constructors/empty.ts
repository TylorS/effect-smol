import { void as void_ } from "../../../../Effect.ts"
import type { Fx } from "../Fx.ts"
import { make } from "./make.ts"

/**
 * An Fx that emits no values and completes immediately.
 * @since 1.0.0
 * @category constructors
 */
export const empty: Fx<never, never, never> = make<never, never, never>(() => void_)
