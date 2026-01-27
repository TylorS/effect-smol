/**
 * Extensions to RefSubject for working with Cause values
 * @since 1.18.0
 */

import * as Cause from "../../../Cause.ts"
import type * as Effect from "../../../Effect.ts"
import { equals } from "../../../Equal.ts"
import * as Equivalence_ from "../../../Equivalence.ts"
import type { Equivalence } from "../../../Equivalence.ts"
import { dual } from "../../../Function.ts"
import type * as Scope from "../../../Scope.ts"
import type * as Fx from "../Fx/Fx.ts"
import * as RefSubject from "./RefSubject.ts"

/**
 * A RefCause is a RefSubject specialized over a Cause value.
 * @since 1.18.0
 * @category models
 */
export interface RefCause<in out E, in out Err = never, out R = never>
  extends RefSubject.RefSubject<Cause.Cause<E>, Err, R> { }

/**
 * Creates a new `RefCause` from a Cause, `Effect`, or `Fx`.
 *
 * @example
 * ```ts
 * import { Effect, Cause } from "effect"
 * import * as RefCause from "effect/typed/fx/RefSubject/RefCause"
 *
 * const program = Effect.gen(function* () {
 *   const value = yield* RefCause.make(Cause.fail("error"))
 *   const current = yield* value
 *   console.log(current) // Cause(...)
 * })
 * ```
 *
 * @since 1.18.0
 * @category constructors
 */
export function make<E = never, Err = never, R = never>(
  initial:
    | Cause.Cause<E>
    | Effect.Effect<Cause.Cause<E>, Err, R>
    | Fx.Fx<Cause.Cause<E>, Err, R>,
  eq: Equivalence<E> = Equivalence_.strictEqual()
): Effect.Effect<RefCause<E, Err>, never, R | Scope.Scope> {
  return RefSubject.make(initial, { eq: Equivalence_.make((a, b) => equals(a, b)) })
}

/**
 * Set the current state of a RefCause to a Fail cause.
 * @since 1.18.0
 * @category combinators
 */
export const setFail: {
  <E>(error: E): <Err, R>(ref: RefCause<E, Err, R>) => Effect.Effect<Cause.Cause<E>, Err, R>
  <E, Err, R>(ref: RefCause<E, Err, R>, error: E): Effect.Effect<Cause.Cause<E>, Err, R>
} = dual(2, function setFail<E, Err, R>(ref: RefCause<E, Err, R>, error: E) {
  return RefSubject.set(ref, Cause.fail(error))
})

/**
 * Set the current state of a RefCause to a Die cause.
 * @since 1.18.0
 * @category combinators
 */
export const setDie: {
  (defect: unknown): <E, Err, R>(ref: RefCause<E, Err, R>) => Effect.Effect<Cause.Cause<E>, Err, R>
  <E, Err, R>(ref: RefCause<E, Err, R>, defect: unknown): Effect.Effect<Cause.Cause<E>, Err, R>
} = dual(2, function setDie<E, Err, R>(ref: RefCause<E, Err, R>, defect: unknown) {
  return RefSubject.set(ref, Cause.die(defect))
})

/**
 * Set the current state of a RefCause to an Interrupt cause.
 * @since 1.18.0
 * @category combinators
 */
export const setInterrupt: {
  (fiberId?: number): <E, Err, R>(ref: RefCause<E, Err, R>) => Effect.Effect<Cause.Cause<E>, Err, R>
  <E, Err, R>(ref: RefCause<E, Err, R>, fiberId?: number): Effect.Effect<Cause.Cause<E>, Err, R>
} = dual(2, function setInterrupt<E, Err, R>(ref: RefCause<E, Err, R>, fiberId?: number) {
  return RefSubject.set(ref, Cause.interrupt(fiberId))
})

// ========================================
// Computed
// ========================================

/**
 * Check if the current state of a RefCause has a Fail.
 * @since 1.18.0
 * @category computed
 */
export const hasFail = <E, Err, R>(ref: RefCause<E, Err, R>): RefSubject.Computed<boolean, Err, R> =>
  RefSubject.map(ref, Cause.hasFail)

/**
 * Check if the current state of a RefCause has a Die.
 * @since 1.18.0
 * @category computed
 */
export const hasDie = <E, Err, R>(ref: RefCause<E, Err, R>): RefSubject.Computed<boolean, Err, R> =>
  RefSubject.map(ref, Cause.hasDie)

/**
 * Check if the current state of a RefCause has an Interrupt.
 * @since 1.18.0
 * @category computed
 */
export const hasInterrupt = <E, Err, R>(ref: RefCause<E, Err, R>): RefSubject.Computed<boolean, Err, R> =>
  RefSubject.map(ref, Cause.hasInterrupt)

/**
 * Check if the current state of a RefCause is empty.
 * @since 1.18.0
 * @category computed
 */
export const isEmpty = <E, Err, R>(ref: RefCause<E, Err, R>): RefSubject.Computed<boolean, Err, R> =>
  RefSubject.map(ref, (self) => self.failures.length === 0)

/**
 * Get the size (number of failures) of the current state of a RefCause.
 * @since 1.18.0
 * @category computed
 */
export const size = <E, Err, R>(ref: RefCause<E, Err, R>): RefSubject.Computed<number, Err, R> =>
  RefSubject.map(ref, (self) => self.failures.length)

/**
 * Get the failures array of the current state of a RefCause.
 * @since 1.18.0
 * @category computed
 */
export const failures = <E, Err, R>(
  ref: RefCause<E, Err, R>
): RefSubject.Computed<ReadonlyArray<Cause.Failure<E>>, Err, R> =>
  RefSubject.map(ref, (self) => self.failures)
