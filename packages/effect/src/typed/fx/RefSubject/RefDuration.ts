/**
 * Extensions to RefSubject for working with Duration values
 * @since 1.18.0
 */

import * as Duration from "../../../Duration.ts"
import type * as Effect from "../../../Effect.ts"
import { dual } from "../../../Function.ts"
import type * as Scope from "../../../Scope.ts"
import type * as Fx from "../Fx/Fx.ts"
import * as RefSubject from "./RefSubject.ts"

/**
 * A RefDuration is a RefSubject specialized over a Duration value.
 * @since 1.18.0
 * @category models
 */
export interface RefDuration<in out E = never, out R = never> extends RefSubject.RefSubject<Duration.Duration, E, R> {}

/**
 * Creates a new `RefDuration` from a Duration, `Effect`, or `Fx`.
 *
 * @example
 * ```ts
 * import { Effect, Duration } from "effect"
 * import * as RefDuration from "effect/typed/fx/RefSubject/RefDuration"
 *
 * const program = Effect.gen(function* () {
 *   const value = yield* RefDuration.make(Duration.seconds(5))
 *   const current = yield* value
 *   console.log(current) // Duration(...)
 * })
 * ```
 *
 * @since 1.18.0
 * @category constructors
 */
export function make<E = never, R = never>(
  initial:
    | Duration.Duration
    | Effect.Effect<Duration.Duration, E, R>
    | Fx.Fx<Duration.Duration, E, R>
): Effect.Effect<RefDuration<E>, never, R | Scope.Scope> {
  return RefSubject.make(initial, { eq: Duration.Equivalence })
}

// ========================================
// Computed
// ========================================

/**
 * Add a Duration to the current state of a RefDuration.
 * @since 1.18.0
 * @category computed
 */
export const add: {
  (that: Duration.Duration): <E, R>(ref: RefDuration<E, R>) => RefSubject.Computed<Duration.Duration, E, R>
  <E, R>(ref: RefDuration<E, R>, that: Duration.Duration): RefSubject.Computed<Duration.Duration, E, R>
} = dual(2, function add<E, R>(ref: RefDuration<E, R>, that: Duration.Duration) {
  return RefSubject.map(ref, (self) => Duration.sum(self, that))
})

/**
 * Subtract a Duration from the current state of a RefDuration.
 * @since 1.18.0
 * @category computed
 */
export const subtract: {
  (that: Duration.Duration): <E, R>(ref: RefDuration<E, R>) => RefSubject.Computed<Duration.Duration, E, R>
  <E, R>(ref: RefDuration<E, R>, that: Duration.Duration): RefSubject.Computed<Duration.Duration, E, R>
} = dual(2, function subtract<E, R>(ref: RefDuration<E, R>, that: Duration.Duration) {
  return RefSubject.map(ref, (self) => Duration.subtract(self, that))
})

/**
 * Multiply the current state of a RefDuration by a number.
 * @since 1.18.0
 * @category computed
 */
export const multiply: {
  (that: number): <E, R>(ref: RefDuration<E, R>) => RefSubject.Computed<Duration.Duration, E, R>
  <E, R>(ref: RefDuration<E, R>, that: number): RefSubject.Computed<Duration.Duration, E, R>
} = dual(2, function multiply<E, R>(ref: RefDuration<E, R>, that: number) {
  return RefSubject.map(ref, (self) => Duration.times(self, that))
})

/**
 * Divide the current state of a RefDuration by a number.
 * @since 1.18.0
 * @category computed
 */
export const divide: {
  (that: number): <E, R>(ref: RefDuration<E, R>) => RefSubject.Computed<Duration.Duration | undefined, E, R>
  <E, R>(ref: RefDuration<E, R>, that: number): RefSubject.Computed<Duration.Duration | undefined, E, R>
} = dual(2, function divide<E, R>(ref: RefDuration<E, R>, that: number) {
  return RefSubject.map(ref, (self) => Duration.divide(self, that))
})

/**
 * Check if the current state of a RefDuration is zero.
 * @since 1.18.0
 * @category computed
 */
export const isZero = <E, R>(ref: RefDuration<E, R>): RefSubject.Computed<boolean, E, R> =>
  RefSubject.map(ref, Duration.isZero)

/**
 * Check if the current state of a RefDuration is less than a Duration.
 * @since 1.18.0
 * @category computed
 */
export const isLessThan: {
  (that: Duration.Duration): <E, R>(ref: RefDuration<E, R>) => RefSubject.Computed<boolean, E, R>
  <E, R>(ref: RefDuration<E, R>, that: Duration.Duration): RefSubject.Computed<boolean, E, R>
} = dual(2, function isLessThan<E, R>(ref: RefDuration<E, R>, that: Duration.Duration) {
  return RefSubject.map(ref, (self) => Duration.isLessThan(self, that))
})

/**
 * Check if the current state of a RefDuration is greater than a Duration.
 * @since 1.18.0
 * @category computed
 */
export const isGreaterThan: {
  (that: Duration.Duration): <E, R>(ref: RefDuration<E, R>) => RefSubject.Computed<boolean, E, R>
  <E, R>(ref: RefDuration<E, R>, that: Duration.Duration): RefSubject.Computed<boolean, E, R>
} = dual(2, function isGreaterThan<E, R>(ref: RefDuration<E, R>, that: Duration.Duration) {
  return RefSubject.map(ref, (self) => Duration.isGreaterThan(self, that))
})

/**
 * Get the milliseconds value of the current state of a RefDuration.
 * @since 1.18.0
 * @category computed
 */
export const millis = <E, R>(ref: RefDuration<E, R>): RefSubject.Computed<number, E, R> =>
  RefSubject.map(ref, Duration.toMillis)

/**
 * Get the seconds value of the current state of a RefDuration.
 * @since 1.18.0
 * @category computed
 */
export const seconds = <E, R>(ref: RefDuration<E, R>): RefSubject.Computed<number, E, R> =>
  RefSubject.map(ref, Duration.toSeconds)

/**
 * Get the minutes value of the current state of a RefDuration.
 * @since 1.18.0
 * @category computed
 */
export const minutes = <E, R>(ref: RefDuration<E, R>): RefSubject.Computed<number, E, R> =>
  RefSubject.map(ref, Duration.toMinutes)

/**
 * Get the hours value of the current state of a RefDuration.
 * @since 1.18.0
 * @category computed
 */
export const hours = <E, R>(ref: RefDuration<E, R>): RefSubject.Computed<number, E, R> =>
  RefSubject.map(ref, Duration.toHours)

/**
 * Get the days value of the current state of a RefDuration.
 * @since 1.18.0
 * @category computed
 */
export const days = <E, R>(ref: RefDuration<E, R>): RefSubject.Computed<number, E, R> =>
  RefSubject.map(ref, Duration.toDays)
