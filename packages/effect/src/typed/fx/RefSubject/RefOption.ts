/**
 * Extensions to RefSubject for working with Option values
 * @since 1.18.0
 */

import type * as Effect from "../../../Effect.ts"
import * as Equivalence_ from "../../../Equivalence.ts"
import type { Equivalence } from "../../../Equivalence.ts"
import { dual } from "../../../Function.ts"
import * as Option from "../../../Option.ts"
import type * as Scope from "../../../Scope.ts"
import type * as Fx from "../Fx/Fx.ts"
import * as RefSubject from "./RefSubject.ts"

/**
 * A RefOption is a RefSubject specialized over an Option value.
 * @since 1.18.0
 * @category models
 */
export interface RefOption<in out A, in out E = never, out R = never>
  extends RefSubject.RefSubject<Option.Option<A>, E, R>
{}

/**
 * Creates a new `RefOption` from an Option, `Effect`, or `Fx`.
 *
 * @example
 * ```ts
 * import { Effect, Option } from "effect"
 * import * as RefOption from "effect/typed/fx/RefSubject/RefOption"
 *
 * const program = Effect.gen(function* () {
 *   const value = yield* RefOption.make(Option.some(42))
 *   const current = yield* value
 *   console.log(current) // { _tag: "Some", value: 42 }
 * })
 * ```
 *
 * @since 1.18.0
 * @category constructors
 */
export function make<A, E = never, R = never>(
  initial:
    | Option.Option<A>
    | Effect.Effect<Option.Option<A>, E, R>
    | Fx.Fx<Option.Option<A>, E, R>,
  eq: Equivalence<A> = Equivalence_.strictEqual()
): Effect.Effect<RefOption<A, E>, never, R | Scope.Scope> {
  return RefSubject.make(initial, { eq: Option.makeEquivalence(eq) })
}

/**
 * Set the current state of a RefOption to Some(value).
 * @since 1.18.0
 * @category combinators
 */
export const setSome: {
  <A>(value: A): <E, R>(ref: RefOption<A, E, R>) => Effect.Effect<Option.Option<A>, E, R>
  <A, E, R>(ref: RefOption<A, E, R>, value: A): Effect.Effect<Option.Option<A>, E, R>
} = dual(2, function setSome<A, E, R>(ref: RefOption<A, E, R>, value: A) {
  return RefSubject.set(ref, Option.some(value))
})

/**
 * Set the current state of a RefOption to None.
 * @since 1.18.0
 * @category combinators
 */
export const setNone = <A, E, R>(ref: RefOption<A, E, R>): Effect.Effect<Option.Option<A>, E, R> =>
  RefSubject.set(ref, Option.none())

// ========================================
// Computed
// ========================================

/**
 * Map the value inside the Option of a RefOption.
 * @since 1.18.0
 * @category computed
 */
export const map: {
  <A, B>(f: (a: A) => B): <E, R>(ref: RefOption<A, E, R>) => RefSubject.Computed<Option.Option<B>, E, R>
  <A, E, R, B>(ref: RefOption<A, E, R>, f: (a: A) => B): RefSubject.Computed<Option.Option<B>, E, R>
} = dual(2, function map<A, E, R, B>(ref: RefOption<A, E, R>, f: (a: A) => B) {
  return RefSubject.map(ref, (self) => Option.map(self, f))
})

/**
 * FlatMap the value inside the Option of a RefOption.
 * @since 1.18.0
 * @category computed
 */
export const flatMap: {
  <A, B>(f: (a: A) => Option.Option<B>): <E, R>(ref: RefOption<A, E, R>) => RefSubject.Computed<Option.Option<B>, E, R>
  <A, E, R, B>(ref: RefOption<A, E, R>, f: (a: A) => Option.Option<B>): RefSubject.Computed<Option.Option<B>, E, R>
} = dual(2, function flatMap<A, E, R, B>(ref: RefOption<A, E, R>, f: (a: A) => Option.Option<B>) {
  return RefSubject.map(ref, (self) => Option.flatMap(self, f))
})

/**
 * Filter the value inside the Option of a RefOption.
 * @since 1.18.0
 * @category computed
 */
export const filter: {
  <A>(predicate: (a: A) => boolean): <E, R>(ref: RefOption<A, E, R>) => RefSubject.Computed<Option.Option<A>, E, R>
  <A, E, R>(ref: RefOption<A, E, R>, predicate: (a: A) => boolean): RefSubject.Computed<Option.Option<A>, E, R>
} = dual(2, function filter<A, E, R>(ref: RefOption<A, E, R>, predicate: (a: A) => boolean) {
  return RefSubject.map(ref, (self) => Option.filter(self, predicate))
})

/**
 * Get the value from the Option or use a fallback value.
 * @since 1.18.0
 * @category computed
 */
export const getOrElse: {
  <A>(fallback: () => A): <E, R>(ref: RefOption<A, E, R>) => RefSubject.Computed<A, E, R>
  <A, E, R>(ref: RefOption<A, E, R>, fallback: () => A): RefSubject.Computed<A, E, R>
} = dual(2, function getOrElse<A, E, R>(ref: RefOption<A, E, R>, fallback: () => A) {
  return RefSubject.map(ref, (self) => Option.getOrElse(self, fallback))
})

/**
 * Check if the current state of a RefOption is Some.
 * @since 1.18.0
 * @category computed
 */
export const isSome = <A, E, R>(ref: RefOption<A, E, R>): RefSubject.Computed<boolean, E, R> =>
  RefSubject.map(ref, Option.isSome)

/**
 * Check if the current state of a RefOption is None.
 * @since 1.18.0
 * @category computed
 */
export const isNone = <A, E, R>(ref: RefOption<A, E, R>): RefSubject.Computed<boolean, E, R> =>
  RefSubject.map(ref, Option.isNone)

/**
 * Check if the current state of a RefOption contains a value.
 * @since 1.18.0
 * @category computed
 */
export const contains: {
  <A>(value: A): <E, R>(ref: RefOption<A, E, R>) => RefSubject.Computed<boolean, E, R>
  <A, E, R>(ref: RefOption<A, E, R>, value: A): RefSubject.Computed<boolean, E, R>
} = dual(2, function contains<A, E, R>(ref: RefOption<A, E, R>, value: A) {
  return RefSubject.map(ref, (self) => Option.contains(self, value))
})

/**
 * Check if the value inside the Option satisfies a predicate.
 * @since 1.18.0
 * @category computed
 */
export const exists: {
  <A>(predicate: (a: A) => boolean): <E, R>(ref: RefOption<A, E, R>) => RefSubject.Computed<boolean, E, R>
  <A, E, R>(ref: RefOption<A, E, R>, predicate: (a: A) => boolean): RefSubject.Computed<boolean, E, R>
} = dual(2, function exists<A, E, R>(ref: RefOption<A, E, R>, predicate: (a: A) => boolean) {
  return RefSubject.map(ref, (self) => Option.exists(self, predicate))
})

// ========================================
// Filtered
// ========================================

/**
 * Get the value from the Option as a Filtered (fails if None).
 * @since 1.18.0
 * @category filtered
 */
export const getValue = <A, E, R>(ref: RefOption<A, E, R>): RefSubject.Filtered<A, E, R> => RefSubject.compact(ref)
