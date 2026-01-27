/**
 * Extensions to RefSubject for working with Result values
 * @since 1.18.0
 */

import * as Result from "../../../Result.ts"
import type * as Effect from "../../../Effect.ts"
import * as Equivalence_ from "../../../Equivalence.ts"
import type { Equivalence } from "../../../Equivalence.ts"
import { dual } from "../../../Function.ts"
import type * as Scope from "../../../Scope.ts"
import type * as Fx from "../Fx/Fx.ts"
import * as RefSubject from "./RefSubject.ts"

/**
 * A RefResult is a RefSubject specialized over a Result value.
 * @since 1.18.0
 * @category models
 */
export interface RefResult<in out A, in out E, in out Err = never, out R = never>
  extends RefSubject.RefSubject<Result.Result<A, E>, Err, R> { }

/**
 * Creates a new `RefResult` from a Result, `Effect`, or `Fx`.
 *
 * @example
 * ```ts
 * import { Effect, Result } from "effect"
 * import * as RefResult from "effect/typed/fx/RefSubject/RefResult"
 *
 * const program = Effect.gen(function* () {
 *   const value = yield* RefResult.make(Result.succeed(42))
 *   const current = yield* value
 *   console.log(current) // { _tag: "Success", success: 42 }
 * })
 * ```
 *
 * @since 1.18.0
 * @category constructors
 */
export function make<A, E, Err = never, R = never>(
  initial:
    | Result.Result<A, E>
    | Effect.Effect<Result.Result<A, E>, Err, R>
    | Fx.Fx<Result.Result<A, E>, Err, R>,
  successEq: Equivalence<A> = Equivalence_.strictEqual(),
  failureEq: Equivalence<E> = Equivalence_.strictEqual()
): Effect.Effect<RefResult<A, E, Err, R>, never, R | Scope.Scope> {
  return RefSubject.make(initial, { eq: Result.makeEquivalence(successEq, failureEq) })
}

/**
 * Set the current state of a RefResult to Success(value).
 * @since 1.18.0
 * @category combinators
 */
export const setSuccess: {
  <A>(value: A): <E, R>(ref: RefResult<A, E, R>) => Effect.Effect<Result.Result<A, E>, E, R>
  <A, E, R>(ref: RefResult<A, E, R>, value: A): Effect.Effect<Result.Result<A, E>, E, R>
} = dual(2, function setSuccess<A, E, R>(ref: RefResult<A, E, R>, value: A) {
  return RefSubject.set(ref, Result.succeed(value))
})

/**
 * Set the current state of a RefResult to Failure(error).
 * @since 1.18.0
 * @category combinators
 */
export const setFailure: {
  <E>(error: E): <A, R>(ref: RefResult<A, E, R>) => Effect.Effect<Result.Result<A, E>, E, R>
  <A, E, R>(ref: RefResult<A, E, R>, error: E): Effect.Effect<Result.Result<A, E>, E, R>
} = dual(2, function setFailure<A, E, R>(ref: RefResult<A, E, R>, error: E) {
  return RefSubject.set(ref, Result.fail(error))
})

// ========================================
// Computed
// ========================================

/**
 * Map the success value of a RefResult.
 * @since 1.18.0
 * @category computed
 */
export const map: {
  <A, B>(f: (a: A) => B): <E, R>(ref: RefResult<A, E, R>) => RefSubject.Computed<Result.Result<B, E>, E, R>
  <A, E, R, B>(ref: RefResult<A, E, R>, f: (a: A) => B): RefSubject.Computed<Result.Result<B, E>, E, R>
} = dual(2, function map<A, E, R, B>(ref: RefResult<A, E, R>, f: (a: A) => B) {
  return RefSubject.map(ref, (self) => Result.map(self, f))
})

/**
 * Map the error value of a RefResult.
 * @since 1.18.0
 * @category computed
 */
export const mapError: {
  <E, E2>(f: (e: E) => E2): <A, R>(ref: RefResult<A, E, R>) => RefSubject.Computed<Result.Result<A, E2>, E, R>
  <A, E, R, E2>(ref: RefResult<A, E, R>, f: (e: E) => E2): RefSubject.Computed<Result.Result<A, E2>, E, R>
} = dual(2, function mapError<A, E, R, E2>(ref: RefResult<A, E, R>, f: (e: E) => E2) {
  return RefSubject.map(ref, (self) => Result.mapError(self, f))
})

/**
 * FlatMap the success value of a RefResult.
 * @since 1.18.0
 * @category computed
 */
export const flatMap: {
  <A, B, E2>(
    f: (a: A) => Result.Result<B, E2>
  ): <E, R>(ref: RefResult<A, E, R>) => RefSubject.Computed<Result.Result<B, E | E2>, E, R>
  <A, E, R, B, E2>(
    ref: RefResult<A, E, R>,
    f: (a: A) => Result.Result<B, E2>
  ): RefSubject.Computed<Result.Result<B, E | E2>, E, R>
} = dual(2, function flatMap<A, E, R, B, E2>(ref: RefResult<A, E, R>, f: (a: A) => Result.Result<B, E2>) {
  return RefSubject.map(ref, (self) => Result.flatMap(self, f))
})

/**
 * Check if the current state of a RefResult is Success.
 * @since 1.18.0
 * @category computed
 */
export const isSuccess = <A, E, Err, R>(ref: RefResult<A, E, Err, R>): RefSubject.Computed<boolean, Err, R> =>
  RefSubject.map(ref, Result.isSuccess)

/**
 * Check if the current state of a RefResult is Failure.
 * @since 1.18.0
 * @category computed
 */
export const isFailure = <A, E, Err, R>(ref: RefResult<A, E, Err, R>): RefSubject.Computed<boolean, Err, R> =>
  RefSubject.map(ref, Result.isFailure)

/**
 * Match on the Result value.
 * @since 1.18.0
 * @category computed
 */
export const match: {
  <A, E, B>(options: {
    readonly onSuccess: (a: A) => B
    readonly onFailure: (e: E) => B
  }): <R>(ref: RefResult<A, E, R>) => RefSubject.Computed<B, E, R>
  <A, E, R, B>(
    ref: RefResult<A, E, R>,
    options: {
      readonly onSuccess: (a: A) => B
      readonly onFailure: (e: E) => B
    }
  ): RefSubject.Computed<B, E, R>
} = dual(2, function match<A, E, R, B>(
  ref: RefResult<A, E, R>,
  options: {
    readonly onSuccess: (a: A) => B
    readonly onFailure: (e: E) => B
  }
) {
  return RefSubject.map(ref, (self) => Result.match(self, options))
})

// ========================================
// Filtered
// ========================================

/**
 * Get the success value from the Result as a Filtered (fails if Failure).
 * @since 1.18.0
 * @category filtered
 */
export const getSuccess = <A, E, Err, R>(ref: RefResult<A, E, Err, R>): RefSubject.Filtered<A, Err, R> =>
  RefSubject.filterMap(ref, Result.getSuccess)

/**
 * Get the failure value from the Result as a Filtered (fails if Success).
 * @since 1.18.0
 * @category filtered
 */
export const getFailure = <A, E, Err, R>(ref: RefResult<A, E, Err, R>): RefSubject.Filtered<E, Err, R> =>
  RefSubject.filterMap(ref, Result.getFailure)
