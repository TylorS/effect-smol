import { hasProperty } from "effect/data/Predicate"
import type { Fx } from "./Fx.ts"

export const FxTypeId = Symbol.for("@typed/fx/Fx")
export type FxTypeId = typeof FxTypeId

export function isFx(u: unknown): u is Fx<any, any, any> {
  return hasProperty(u, FxTypeId)
}
