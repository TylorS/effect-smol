/**
 * Extensions to RefSubject for working with BigDecimal values
 * @since 1.18.0
 */

import * as BigDecimal from "../../../BigDecimal.ts"
import type * as Effect from "../../../Effect.ts"
import { dual } from "../../../Function.ts"
import type * as Scope from "../../../Scope.ts"
import type * as Fx from "../Fx/Fx.ts"
import * as RefSubject from "./RefSubject.ts"

/**
 * A RefBigDecimal is a RefSubject specialized over a BigDecimal value.
 * @since 1.18.0
 * @category models
 */
export interface RefBigDecimal<in out E = never, out R = never>
  extends RefSubject.RefSubject<BigDecimal.BigDecimal, E, R> { }

/**
 * Creates a new `RefBigDecimal` from a BigDecimal, `Effect`, or `Fx`.
 *
 * @example
 * ```ts
 * import { Effect, BigDecimal } from "effect"
 * import * as RefBigDecimal from "effect/typed/fx/RefSubject/RefBigDecimal"
 *
 * const program = Effect.gen(function* () {
 *   const value = yield* RefBigDecimal.make(BigDecimal.fromStringUnsafe("123.45"))
 *   const current = yield* value
 *   console.log(current) // BigDecimal(123.45)
 * })
 * ```
 *
 * @since 1.18.0
 * @category constructors
 */
export function make<E = never, R = never>(
  initial:
    | BigDecimal.BigDecimal
    | Effect.Effect<BigDecimal.BigDecimal, E, R>
    | Fx.Fx<BigDecimal.BigDecimal, E, R>
): Effect.Effect<RefBigDecimal<E>, never, R | Scope.Scope> {
  return RefSubject.make(initial, { eq: BigDecimal.Equivalence })
}

// ========================================
// Computed
// ========================================

/**
 * Add a BigDecimal to the current state of a RefBigDecimal.
 * @since 1.18.0
 * @category computed
 */
export const add: {
  (that: BigDecimal.BigDecimal): <E, R>(ref: RefBigDecimal<E, R>) => RefSubject.Computed<BigDecimal.BigDecimal, E, R>
  <E, R>(ref: RefBigDecimal<E, R>, that: BigDecimal.BigDecimal): RefSubject.Computed<BigDecimal.BigDecimal, E, R>
} = dual(2, function add<E, R>(ref: RefBigDecimal<E, R>, that: BigDecimal.BigDecimal) {
  return RefSubject.map(ref, (self) => BigDecimal.sum(self, that))
})

/**
 * Subtract a BigDecimal from the current state of a RefBigDecimal.
 * @since 1.18.0
 * @category computed
 */
export const subtract: {
  (that: BigDecimal.BigDecimal): <E, R>(ref: RefBigDecimal<E, R>) => RefSubject.Computed<BigDecimal.BigDecimal, E, R>
  <E, R>(ref: RefBigDecimal<E, R>, that: BigDecimal.BigDecimal): RefSubject.Computed<BigDecimal.BigDecimal, E, R>
} = dual(2, function subtract<E, R>(ref: RefBigDecimal<E, R>, that: BigDecimal.BigDecimal) {
  return RefSubject.map(ref, (self) => BigDecimal.subtract(self, that))
})

/**
 * Multiply the current state of a RefBigDecimal by a BigDecimal.
 * @since 1.18.0
 * @category computed
 */
export const multiply: {
  (that: BigDecimal.BigDecimal): <E, R>(ref: RefBigDecimal<E, R>) => RefSubject.Computed<BigDecimal.BigDecimal, E, R>
  <E, R>(ref: RefBigDecimal<E, R>, that: BigDecimal.BigDecimal): RefSubject.Computed<BigDecimal.BigDecimal, E, R>
} = dual(2, function multiply<E, R>(ref: RefBigDecimal<E, R>, that: BigDecimal.BigDecimal) {
  return RefSubject.map(ref, (self) => BigDecimal.multiply(self, that))
})

/**
 * Divide the current state of a RefBigDecimal by a BigDecimal.
 * @since 1.18.0
 * @category computed
 */
export const divide: {
  (that: BigDecimal.BigDecimal): <E, R>(ref: RefBigDecimal<E, R>) => RefSubject.Computed<BigDecimal.BigDecimal | undefined, E, R>
  <E, R>(ref: RefBigDecimal<E, R>, that: BigDecimal.BigDecimal): RefSubject.Computed<BigDecimal.BigDecimal | undefined, E, R>
} = dual(2, function divide<E, R>(ref: RefBigDecimal<E, R>, that: BigDecimal.BigDecimal) {
  return RefSubject.map(ref, (self) => BigDecimal.divide(self, that))
})

/**
 * Get the absolute value of the current state of a RefBigDecimal.
 * @since 1.18.0
 * @category computed
 */
export const abs = <E, R>(ref: RefBigDecimal<E, R>): RefSubject.Computed<BigDecimal.BigDecimal, E, R> =>
  RefSubject.map(ref, BigDecimal.abs)

/**
 * Negate the current state of a RefBigDecimal.
 * @since 1.18.0
 * @category computed
 */
export const negate = <E, R>(ref: RefBigDecimal<E, R>): RefSubject.Computed<BigDecimal.BigDecimal, E, R> =>
  RefSubject.map(ref, BigDecimal.negate)

/**
 * Round the current state of a RefBigDecimal.
 * @since 1.18.0
 * @category computed
 */
export const round: {
  (options?: { scale?: number; mode?: BigDecimal.RoundingMode }): <E, R>(
    ref: RefBigDecimal<E, R>
  ) => RefSubject.Computed<BigDecimal.BigDecimal, E, R>
  <E, R>(
    ref: RefBigDecimal<E, R>,
    options?: { scale?: number; mode?: BigDecimal.RoundingMode }
  ): RefSubject.Computed<BigDecimal.BigDecimal, E, R>
} = dual(2, function round<E, R>(
  ref: RefBigDecimal<E, R>,
  options?: { scale?: number; mode?: BigDecimal.RoundingMode }
) {
  return RefSubject.map(ref, (self) => BigDecimal.round(self, options))
})

/**
 * Truncate the current state of a RefBigDecimal.
 * @since 1.18.0
 * @category computed
 */
export const truncate: {
  (scale?: number): <E, R>(ref: RefBigDecimal<E, R>) => RefSubject.Computed<BigDecimal.BigDecimal, E, R>
  <E, R>(ref: RefBigDecimal<E, R>, scale?: number): RefSubject.Computed<BigDecimal.BigDecimal, E, R>
} = dual(2, function truncate<E, R>(ref: RefBigDecimal<E, R>, scale?: number) {
  return RefSubject.map(ref, (self) => BigDecimal.truncate(self, scale))
})

/**
 * Calculate the ceiling of the current state of a RefBigDecimal.
 * @since 1.18.0
 * @category computed
 */
export const ceil: {
  (scale?: number): <E, R>(ref: RefBigDecimal<E, R>) => RefSubject.Computed<BigDecimal.BigDecimal, E, R>
  <E, R>(ref: RefBigDecimal<E, R>, scale?: number): RefSubject.Computed<BigDecimal.BigDecimal, E, R>
} = dual(2, function ceil<E, R>(ref: RefBigDecimal<E, R>, scale?: number) {
  return RefSubject.map(ref, (self) => BigDecimal.ceil(self, scale))
})

/**
 * Calculate the floor of the current state of a RefBigDecimal.
 * @since 1.18.0
 * @category computed
 */
export const floor: {
  (scale?: number): <E, R>(ref: RefBigDecimal<E, R>) => RefSubject.Computed<BigDecimal.BigDecimal, E, R>
  <E, R>(ref: RefBigDecimal<E, R>, scale?: number): RefSubject.Computed<BigDecimal.BigDecimal, E, R>
} = dual(2, function floor<E, R>(ref: RefBigDecimal<E, R>, scale?: number) {
  return RefSubject.map(ref, (self) => BigDecimal.floor(self, scale))
})

/**
 * Check if the current state of a RefBigDecimal is zero.
 * @since 1.18.0
 * @category computed
 */
export const isZero = <E, R>(ref: RefBigDecimal<E, R>): RefSubject.Computed<boolean, E, R> =>
  RefSubject.map(ref, BigDecimal.isZero)

/**
 * Check if the current state of a RefBigDecimal is negative.
 * @since 1.18.0
 * @category computed
 */
export const isNegative = <E, R>(ref: RefBigDecimal<E, R>): RefSubject.Computed<boolean, E, R> =>
  RefSubject.map(ref, BigDecimal.isNegative)

/**
 * Check if the current state of a RefBigDecimal is positive.
 * @since 1.18.0
 * @category computed
 */
export const isPositive = <E, R>(ref: RefBigDecimal<E, R>): RefSubject.Computed<boolean, E, R> =>
  RefSubject.map(ref, BigDecimal.isPositive)

/**
 * Check if the current state of a RefBigDecimal is an integer.
 * @since 1.18.0
 * @category computed
 */
export const isInteger = <E, R>(ref: RefBigDecimal<E, R>): RefSubject.Computed<boolean, E, R> =>
  RefSubject.map(ref, BigDecimal.isInteger)

/**
 * Get the sign of the current state of a RefBigDecimal.
 * @since 1.18.0
 * @category computed
 */
export const sign = <E, R>(ref: RefBigDecimal<E, R>): RefSubject.Computed<number, E, R> =>
  RefSubject.map(ref, BigDecimal.sign)

/**
 * Check if the current state of a RefBigDecimal is less than a BigDecimal.
 * @since 1.18.0
 * @category computed
 */
export const isLessThan: {
  (that: BigDecimal.BigDecimal): <E, R>(ref: RefBigDecimal<E, R>) => RefSubject.Computed<boolean, E, R>
  <E, R>(ref: RefBigDecimal<E, R>, that: BigDecimal.BigDecimal): RefSubject.Computed<boolean, E, R>
} = dual(2, function isLessThan<E, R>(ref: RefBigDecimal<E, R>, that: BigDecimal.BigDecimal) {
  return RefSubject.map(ref, (self) => BigDecimal.isLessThan(self, that))
})

/**
 * Check if the current state of a RefBigDecimal is greater than a BigDecimal.
 * @since 1.18.0
 * @category computed
 */
export const isGreaterThan: {
  (that: BigDecimal.BigDecimal): <E, R>(ref: RefBigDecimal<E, R>) => RefSubject.Computed<boolean, E, R>
  <E, R>(ref: RefBigDecimal<E, R>, that: BigDecimal.BigDecimal): RefSubject.Computed<boolean, E, R>
} = dual(2, function isGreaterThan<E, R>(ref: RefBigDecimal<E, R>, that: BigDecimal.BigDecimal) {
  return RefSubject.map(ref, (self) => BigDecimal.isGreaterThan(self, that))
})

/**
 * Check if the current state of a RefBigDecimal equals a BigDecimal.
 * @since 1.18.0
 * @category computed
 */
export const equals: {
  (that: BigDecimal.BigDecimal): <E, R>(ref: RefBigDecimal<E, R>) => RefSubject.Computed<boolean, E, R>
  <E, R>(ref: RefBigDecimal<E, R>, that: BigDecimal.BigDecimal): RefSubject.Computed<boolean, E, R>
} = dual(2, function equals<E, R>(ref: RefBigDecimal<E, R>, that: BigDecimal.BigDecimal) {
  return RefSubject.map(ref, (self) => BigDecimal.equals(self, that))
})
