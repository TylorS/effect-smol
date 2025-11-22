import { hasProperty } from "effect/data/Predicate"
import type { Fx } from "./Fx.ts"

/**
 * The unique type identifier for Fx.
 * @since 1.0.0
 * @category symbol
 */
export const FxTypeId = Symbol.for("@typed/fx/Fx")

/**
 * The unique type identifier type for Fx.
 * @since 1.0.0
 * @category symbol
 */
export type FxTypeId = typeof FxTypeId

/**
 * Checks if a value is an Fx.
 * @since 1.0.0
 * @category guards
 */
export function isFx(u: unknown): u is Fx<any, any, any> {
  return hasProperty(u, FxTypeId)
}
