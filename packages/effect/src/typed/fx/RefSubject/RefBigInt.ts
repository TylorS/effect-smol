/**
 * Extensions to RefSubject for working with BigInt values
 * @since 1.18.0
 */

import * as BigInt_ from "../../../BigInt.ts"
import type * as Effect from "../../../Effect.ts"
import * as Equivalence_ from "../../../Equivalence.ts"
import type { Equivalence } from "../../../Equivalence.ts"
import { dual } from "../../../Function.ts"
import type * as Scope from "../../../Scope.ts"
import type * as Fx from "../Fx/Fx.ts"
import * as RefSubject from "./RefSubject.ts"

/**
 * A RefBigInt is a RefSubject specialized over a BigInt value.
 * @since 1.18.0
 * @category models
 */
export interface RefBigInt<in out E = never, out R = never> extends RefSubject.RefSubject<bigint, E, R> {}

/**
 * Creates a new `RefBigInt` from a BigInt, `Effect`, or `Fx`.
 *
 * @example
 * ```ts
 * import { Effect, BigInt } from "effect"
 * import * as RefBigInt from "effect/typed/fx/RefSubject/RefBigInt"
 *
 * const program = Effect.gen(function* () {
 *   const value = yield* RefBigInt.make(BigInt.BigInt(123))
 *   const current = yield* value
 *   console.log(current) // 123n
 * })
 * ```
 *
 * @since 1.18.0
 * @category constructors
 */
export function make<E = never, R = never>(
  initial: bigint | Effect.Effect<bigint, E, R> | Fx.Fx<bigint, E, R>,
  eq: Equivalence<bigint> = Equivalence_.strictEqual()
): Effect.Effect<RefBigInt<E>, never, R | Scope.Scope> {
  return RefSubject.make(initial, { eq })
}

// ========================================
// Computed
// ========================================

/**
 * Add a BigInt to the current state of a RefBigInt.
 * @since 1.18.0
 * @category computed
 */
export const add: {
  (that: bigint): <E, R>(ref: RefBigInt<E, R>) => RefSubject.Computed<bigint, E, R>
  <E, R>(ref: RefBigInt<E, R>, that: bigint): RefSubject.Computed<bigint, E, R>
} = dual(2, function add<E, R>(ref: RefBigInt<E, R>, that: bigint) {
  return RefSubject.map(ref, (self) => BigInt_.sum(self, that))
})

/**
 * Subtract a BigInt from the current state of a RefBigInt.
 * @since 1.18.0
 * @category computed
 */
export const subtract: {
  (that: bigint): <E, R>(ref: RefBigInt<E, R>) => RefSubject.Computed<bigint, E, R>
  <E, R>(ref: RefBigInt<E, R>, that: bigint): RefSubject.Computed<bigint, E, R>
} = dual(2, function subtract<E, R>(ref: RefBigInt<E, R>, that: bigint) {
  return RefSubject.map(ref, (self) => BigInt_.subtract(self, that))
})

/**
 * Multiply the current state of a RefBigInt by a BigInt.
 * @since 1.18.0
 * @category computed
 */
export const multiply: {
  (that: bigint): <E, R>(ref: RefBigInt<E, R>) => RefSubject.Computed<bigint, E, R>
  <E, R>(ref: RefBigInt<E, R>, that: bigint): RefSubject.Computed<bigint, E, R>
} = dual(2, function multiply<E, R>(ref: RefBigInt<E, R>, that: bigint) {
  return RefSubject.map(ref, (self) => BigInt_.multiply(self, that))
})

/**
 * Divide the current state of a RefBigInt by a BigInt.
 * @since 1.18.0
 * @category computed
 */
export const divide: {
  (that: bigint): <E, R>(ref: RefBigInt<E, R>) => RefSubject.Computed<bigint | undefined, E, R>
  <E, R>(ref: RefBigInt<E, R>, that: bigint): RefSubject.Computed<bigint | undefined, E, R>
} = dual(2, function divide<E, R>(ref: RefBigInt<E, R>, that: bigint) {
  return RefSubject.map(ref, (self) => BigInt_.divide(self, that))
})

/**
 * Get the remainder of dividing the current state of a RefBigInt by a BigInt.
 * @since 1.18.0
 * @category computed
 */
export const mod: {
  (that: bigint): <E, R>(ref: RefBigInt<E, R>) => RefSubject.Computed<bigint, E, R>
  <E, R>(ref: RefBigInt<E, R>, that: bigint): RefSubject.Computed<bigint, E, R>
} = dual(2, function mod<E, R>(ref: RefBigInt<E, R>, that: bigint) {
  return RefSubject.map(ref, (self) => BigInt_.remainder(self, that))
})

/**
 * Get the absolute value of the current state of a RefBigInt.
 * @since 1.18.0
 * @category computed
 */
export const abs = <E, R>(ref: RefBigInt<E, R>): RefSubject.Computed<bigint, E, R> => RefSubject.map(ref, BigInt_.abs)

/**
 * Negate the current state of a RefBigInt.
 * @since 1.18.0
 * @category computed
 */
export const negate = <E, R>(ref: RefBigInt<E, R>): RefSubject.Computed<bigint, E, R> =>
  RefSubject.map(ref, (self) => -self)

/**
 * Check if the current state of a RefBigInt is zero.
 * @since 1.18.0
 * @category computed
 */
export const isZero = <E, R>(ref: RefBigInt<E, R>): RefSubject.Computed<boolean, E, R> =>
  RefSubject.map(ref, (self) => self === BigInt_.BigInt(0))

/**
 * Check if the current state of a RefBigInt is negative.
 * @since 1.18.0
 * @category computed
 */
export const isNegative = <E, R>(ref: RefBigInt<E, R>): RefSubject.Computed<boolean, E, R> =>
  RefSubject.map(ref, (self) => self < BigInt_.BigInt(0))

/**
 * Check if the current state of a RefBigInt is positive.
 * @since 1.18.0
 * @category computed
 */
export const isPositive = <E, R>(ref: RefBigInt<E, R>): RefSubject.Computed<boolean, E, R> =>
  RefSubject.map(ref, (self) => self > BigInt_.BigInt(0))

/**
 * Check if the current state of a RefBigInt is less than a BigInt.
 * @since 1.18.0
 * @category computed
 */
export const isLessThan: {
  (that: bigint): <E, R>(ref: RefBigInt<E, R>) => RefSubject.Computed<boolean, E, R>
  <E, R>(ref: RefBigInt<E, R>, that: bigint): RefSubject.Computed<boolean, E, R>
} = dual(2, function isLessThan<E, R>(ref: RefBigInt<E, R>, that: bigint) {
  return RefSubject.map(ref, (self) => BigInt_.isLessThan(self, that))
})

/**
 * Check if the current state of a RefBigInt is greater than a BigInt.
 * @since 1.18.0
 * @category computed
 */
export const isGreaterThan: {
  (that: bigint): <E, R>(ref: RefBigInt<E, R>) => RefSubject.Computed<boolean, E, R>
  <E, R>(ref: RefBigInt<E, R>, that: bigint): RefSubject.Computed<boolean, E, R>
} = dual(2, function isGreaterThan<E, R>(ref: RefBigInt<E, R>, that: bigint) {
  return RefSubject.map(ref, (self) => BigInt_.isGreaterThan(self, that))
})

/**
 * Check if the current state of a RefBigInt equals a BigInt.
 * @since 1.18.0
 * @category computed
 */
export const equals: {
  (that: bigint): <E, R>(ref: RefBigInt<E, R>) => RefSubject.Computed<boolean, E, R>
  <E, R>(ref: RefBigInt<E, R>, that: bigint): RefSubject.Computed<boolean, E, R>
} = dual(2, function equals<E, R>(ref: RefBigInt<E, R>, that: bigint) {
  return RefSubject.map(ref, (self) => self === that)
})
