/**
 * Extensions to RefSubject for working with boolean values
 * @since 1.18.0
 */

import * as Boolean_ from "../../../Boolean.ts"
import type * as Effect from "../../../Effect.ts"
import * as Equivalence_ from "../../../Equivalence.ts"
import type { Equivalence } from "../../../Equivalence.ts"
import { dual } from "../../../Function.ts"
import type * as Scope from "../../../Scope.ts"
import type * as Fx from "../Fx/Fx.ts"
import * as RefSubject from "./RefSubject.ts"

/**
 * A RefBoolean is a RefSubject specialized over a boolean value.
 * @since 1.18.0
 * @category models
 */
export interface RefBoolean<in out E = never, out R = never> extends RefSubject.RefSubject<boolean, E, R> {}

/**
 * Creates a new `RefBoolean` from a boolean, `Effect`, or `Fx`.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import * as RefBoolean from "effect/typed/fx/RefSubject/RefBoolean"
 *
 * const program = Effect.gen(function* () {
 *   const value = yield* RefBoolean.make(true)
 *   const current = yield* value
 *   console.log(current) // true
 * })
 * ```
 *
 * @since 1.18.0
 * @category constructors
 */
export function make<E = never, R = never>(
  initial: boolean | Effect.Effect<boolean, E, R> | Fx.Fx<boolean, E, R>,
  eq: Equivalence<boolean> = Equivalence_.strictEqual()
): Effect.Effect<RefBoolean<E>, never, R | Scope.Scope> {
  return RefSubject.make(initial, { eq })
}

/**
 * Toggle the current state of a RefBoolean.
 * @since 1.18.0
 * @category combinators
 */
export const toggle = <E, R>(ref: RefBoolean<E, R>): Effect.Effect<boolean, E, R> =>
  RefSubject.update(ref, Boolean_.not)

/**
 * Set the current state of a RefBoolean to true.
 * @since 1.18.0
 * @category combinators
 */
export const setTrue = <E, R>(ref: RefBoolean<E, R>): Effect.Effect<boolean, E, R> => RefSubject.set(ref, true)

/**
 * Set the current state of a RefBoolean to false.
 * @since 1.18.0
 * @category combinators
 */
export const setFalse = <E, R>(ref: RefBoolean<E, R>): Effect.Effect<boolean, E, R> => RefSubject.set(ref, false)

// ========================================
// Computed
// ========================================

/**
 * Apply AND operation with a boolean to the current state of a RefBoolean.
 * @since 1.18.0
 * @category computed
 */
export const and: {
  (that: boolean): <E, R>(ref: RefBoolean<E, R>) => RefSubject.Computed<boolean, E, R>
  <E, R>(ref: RefBoolean<E, R>, that: boolean): RefSubject.Computed<boolean, E, R>
} = dual(2, function and<E, R>(ref: RefBoolean<E, R>, that: boolean) {
  return RefSubject.map(ref, (self) => Boolean_.and(self, that))
})

/**
 * Apply OR operation with a boolean to the current state of a RefBoolean.
 * @since 1.18.0
 * @category computed
 */
export const or: {
  (that: boolean): <E, R>(ref: RefBoolean<E, R>) => RefSubject.Computed<boolean, E, R>
  <E, R>(ref: RefBoolean<E, R>, that: boolean): RefSubject.Computed<boolean, E, R>
} = dual(2, function or<E, R>(ref: RefBoolean<E, R>, that: boolean) {
  return RefSubject.map(ref, (self) => Boolean_.or(self, that))
})

/**
 * Apply NOT operation to the current state of a RefBoolean.
 * @since 1.18.0
 * @category computed
 */
export const not = <E, R>(ref: RefBoolean<E, R>): RefSubject.Computed<boolean, E, R> =>
  RefSubject.map(ref, Boolean_.not)

/**
 * Apply XOR operation with a boolean to the current state of a RefBoolean.
 * @since 1.18.0
 * @category computed
 */
export const xor: {
  (that: boolean): <E, R>(ref: RefBoolean<E, R>) => RefSubject.Computed<boolean, E, R>
  <E, R>(ref: RefBoolean<E, R>, that: boolean): RefSubject.Computed<boolean, E, R>
} = dual(2, function xor<E, R>(ref: RefBoolean<E, R>, that: boolean) {
  return RefSubject.map(ref, (self) => Boolean_.xor(self, that))
})

/**
 * Apply NAND operation with a boolean to the current state of a RefBoolean.
 * @since 1.18.0
 * @category computed
 */
export const nand: {
  (that: boolean): <E, R>(ref: RefBoolean<E, R>) => RefSubject.Computed<boolean, E, R>
  <E, R>(ref: RefBoolean<E, R>, that: boolean): RefSubject.Computed<boolean, E, R>
} = dual(2, function nand<E, R>(ref: RefBoolean<E, R>, that: boolean) {
  return RefSubject.map(ref, (self) => Boolean_.nand(self, that))
})

/**
 * Apply NOR operation with a boolean to the current state of a RefBoolean.
 * @since 1.18.0
 * @category computed
 */
export const nor: {
  (that: boolean): <E, R>(ref: RefBoolean<E, R>) => RefSubject.Computed<boolean, E, R>
  <E, R>(ref: RefBoolean<E, R>, that: boolean): RefSubject.Computed<boolean, E, R>
} = dual(2, function nor<E, R>(ref: RefBoolean<E, R>, that: boolean) {
  return RefSubject.map(ref, (self) => Boolean_.nor(self, that))
})

/**
 * Apply EQV (XNOR) operation with a boolean to the current state of a RefBoolean.
 * @since 1.18.0
 * @category computed
 */
export const eqv: {
  (that: boolean): <E, R>(ref: RefBoolean<E, R>) => RefSubject.Computed<boolean, E, R>
  <E, R>(ref: RefBoolean<E, R>, that: boolean): RefSubject.Computed<boolean, E, R>
} = dual(2, function eqv<E, R>(ref: RefBoolean<E, R>, that: boolean) {
  return RefSubject.map(ref, (self) => Boolean_.eqv(self, that))
})

/**
 * Apply implication operation with a boolean to the current state of a RefBoolean.
 * @since 1.18.0
 * @category computed
 */
export const implies: {
  (that: boolean): <E, R>(ref: RefBoolean<E, R>) => RefSubject.Computed<boolean, E, R>
  <E, R>(ref: RefBoolean<E, R>, that: boolean): RefSubject.Computed<boolean, E, R>
} = dual(2, function implies<E, R>(ref: RefBoolean<E, R>, that: boolean) {
  return RefSubject.map(ref, (self) => Boolean_.implies(self, that))
})

/**
 * Check if the current state of a RefBoolean is true.
 * @since 1.18.0
 * @category computed
 */
export const isTrue = <E, R>(ref: RefBoolean<E, R>): RefSubject.Computed<boolean, E, R> =>
  RefSubject.map(ref, (self) => self === true)

/**
 * Check if the current state of a RefBoolean is false.
 * @since 1.18.0
 * @category computed
 */
export const isFalse = <E, R>(ref: RefBoolean<E, R>): RefSubject.Computed<boolean, E, R> =>
  RefSubject.map(ref, (self) => self === false)
