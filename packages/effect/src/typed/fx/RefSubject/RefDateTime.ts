/**
 * Extensions to RefSubject for working with DateTime values
 * @since 1.18.0
 */

import * as DateTime from "../../../DateTime.ts"
import type * as Duration from "../../../Duration.ts"
import type * as Effect from "../../../Effect.ts"
import { dual } from "../../../Function.ts"
import type * as Scope from "../../../Scope.ts"
import type * as Fx from "../Fx/Fx.ts"
import * as RefSubject from "./RefSubject.ts"

/**
 * A RefDateTime is a RefSubject specialized over a DateTime value.
 * @since 1.18.0
 * @category models
 */
export interface RefDateTime<in out E = never, out R = never> extends RefSubject.RefSubject<DateTime.DateTime, E, R> {}

/**
 * Creates a new `RefDateTime` from a DateTime, `Effect`, or `Fx`.
 *
 * @example
 * ```ts
 * import { Effect, DateTime } from "effect"
 * import * as RefDateTime from "effect/typed/fx/RefSubject/RefDateTime"
 *
 * const program = Effect.gen(function* () {
 *   const value = yield* RefDateTime.make(DateTime.nowUnsafe())
 *   const current = yield* value
 *   console.log(current) // DateTime(...)
 * })
 * ```
 *
 * @since 1.18.0
 * @category constructors
 */
export function make<E = never, R = never>(
  initial:
    | DateTime.DateTime
    | Effect.Effect<DateTime.DateTime, E, R>
    | Fx.Fx<DateTime.DateTime, E, R>
): Effect.Effect<RefDateTime<E>, never, R | Scope.Scope> {
  return RefSubject.make(initial, { eq: DateTime.Equivalence })
}

// ========================================
// Computed
// ========================================

/**
 * Add a Duration to the current state of a RefDateTime.
 * @since 1.18.0
 * @category computed
 */
export const add: {
  (
    parts: Partial<{
      readonly millis?: number
      readonly seconds?: number
      readonly minutes?: number
      readonly hours?: number
      readonly days?: number
      readonly weeks?: number
      readonly months?: number
      readonly years?: number
    }>
  ): <E, R>(ref: RefDateTime<E, R>) => RefSubject.Computed<DateTime.DateTime, E, R>
  <E, R>(
    ref: RefDateTime<E, R>,
    parts: Partial<{
      readonly millis?: number
      readonly seconds?: number
      readonly minutes?: number
      readonly hours?: number
      readonly days?: number
      readonly weeks?: number
      readonly months?: number
      readonly years?: number
    }>
  ): RefSubject.Computed<DateTime.DateTime, E, R>
} = dual(2, function add<E, R>(
  ref: RefDateTime<E, R>,
  parts: Partial<{
    readonly millis?: number
    readonly seconds?: number
    readonly minutes?: number
    readonly hours?: number
    readonly days?: number
    readonly weeks?: number
    readonly months?: number
    readonly years?: number
  }>
) {
  return RefSubject.map(ref, (self) => DateTime.add(self, parts))
})

/**
 * Add a Duration to the current state of a RefDateTime.
 * @since 1.18.0
 * @category computed
 */
export const addDuration: {
  (duration: Duration.DurationInput): <E, R>(ref: RefDateTime<E, R>) => RefSubject.Computed<DateTime.DateTime, E, R>
  <E, R>(ref: RefDateTime<E, R>, duration: Duration.DurationInput): RefSubject.Computed<DateTime.DateTime, E, R>
} = dual(2, function addDuration<E, R>(ref: RefDateTime<E, R>, duration: Duration.DurationInput) {
  return RefSubject.map(ref, (self) => DateTime.addDuration(self, duration))
})

/**
 * Subtract a Duration from the current state of a RefDateTime.
 * @since 1.18.0
 * @category computed
 */
export const subtract: {
  (
    parts: Partial<{
      readonly millis?: number
      readonly seconds?: number
      readonly minutes?: number
      readonly hours?: number
      readonly days?: number
      readonly weeks?: number
      readonly months?: number
      readonly years?: number
    }>
  ): <E, R>(ref: RefDateTime<E, R>) => RefSubject.Computed<DateTime.DateTime, E, R>
  <E, R>(
    ref: RefDateTime<E, R>,
    parts: Partial<{
      readonly millis?: number
      readonly seconds?: number
      readonly minutes?: number
      readonly hours?: number
      readonly days?: number
      readonly weeks?: number
      readonly months?: number
      readonly years?: number
    }>
  ): RefSubject.Computed<DateTime.DateTime, E, R>
} = dual(2, function subtract<E, R>(
  ref: RefDateTime<E, R>,
  parts: Partial<{
    readonly millis?: number
    readonly seconds?: number
    readonly minutes?: number
    readonly hours?: number
    readonly days?: number
    readonly weeks?: number
    readonly months?: number
    readonly years?: number
  }>
) {
  return RefSubject.map(ref, (self) => DateTime.subtract(self, parts))
})

/**
 * Subtract a Duration from the current state of a RefDateTime.
 * @since 1.18.0
 * @category computed
 */
export const subtractDuration: {
  (duration: Duration.DurationInput): <E, R>(ref: RefDateTime<E, R>) => RefSubject.Computed<DateTime.DateTime, E, R>
  <E, R>(ref: RefDateTime<E, R>, duration: Duration.DurationInput): RefSubject.Computed<DateTime.DateTime, E, R>
} = dual(2, function subtractDuration<E, R>(ref: RefDateTime<E, R>, duration: Duration.DurationInput) {
  return RefSubject.map(ref, (self) => DateTime.subtractDuration(self, duration))
})

/**
 * Get the epoch milliseconds of the current state of a RefDateTime.
 * @since 1.18.0
 * @category computed
 */
export const epochMillis = <E, R>(ref: RefDateTime<E, R>): RefSubject.Computed<number, E, R> =>
  RefSubject.map(ref, (self) => self.epochMillis)

/**
 * Format the current state of a RefDateTime.
 * @since 1.18.0
 * @category computed
 */
export const format: {
  (
    options?: Intl.DateTimeFormatOptions & {
      readonly locale?: string | undefined
    }
  ): <E, R>(ref: RefDateTime<E, R>) => RefSubject.Computed<string, E, R>
  <E, R>(
    ref: RefDateTime<E, R>,
    options?: Intl.DateTimeFormatOptions & {
      readonly locale?: string | undefined
    }
  ): RefSubject.Computed<string, E, R>
} = dual(2, function format<E, R>(
  ref: RefDateTime<E, R>,
  options?: Intl.DateTimeFormatOptions & {
    readonly locale?: string | undefined
  }
) {
  return RefSubject.map(ref, (self) => DateTime.format(self, options))
})

/**
 * Check if the current state of a RefDateTime is before another DateTime.
 * @since 1.18.0
 * @category computed
 */
export const isBefore: {
  (that: DateTime.DateTime): <E, R>(ref: RefDateTime<E, R>) => RefSubject.Computed<boolean, E, R>
  <E, R>(ref: RefDateTime<E, R>, that: DateTime.DateTime): RefSubject.Computed<boolean, E, R>
} = dual(2, function isBefore<E, R>(ref: RefDateTime<E, R>, that: DateTime.DateTime) {
  return RefSubject.map(ref, (self) => DateTime.isLessThan(self, that))
})

/**
 * Check if the current state of a RefDateTime is after another DateTime.
 * @since 1.18.0
 * @category computed
 */
export const isAfter: {
  (that: DateTime.DateTime): <E, R>(ref: RefDateTime<E, R>) => RefSubject.Computed<boolean, E, R>
  <E, R>(ref: RefDateTime<E, R>, that: DateTime.DateTime): RefSubject.Computed<boolean, E, R>
} = dual(2, function isAfter<E, R>(ref: RefDateTime<E, R>, that: DateTime.DateTime) {
  return RefSubject.map(ref, (self) => DateTime.isGreaterThan(self, that))
})

/**
 * Check if the current state of a RefDateTime equals another DateTime.
 * @since 1.18.0
 * @category computed
 */
export const isEqual: {
  (that: DateTime.DateTime): <E, R>(ref: RefDateTime<E, R>) => RefSubject.Computed<boolean, E, R>
  <E, R>(ref: RefDateTime<E, R>, that: DateTime.DateTime): RefSubject.Computed<boolean, E, R>
} = dual(2, function isEqual<E, R>(ref: RefDateTime<E, R>, that: DateTime.DateTime) {
  return RefSubject.map(ref, (self) => DateTime.Equivalence(self, that))
})
