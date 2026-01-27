/**
 * Extensions to RefSubject for working with Iterable values
 * @since 1.18.0
 */

import type * as Effect from "../../../Effect.ts"
import { equals } from "../../../Equal.ts"
import { dual } from "../../../Function.ts"
import * as Iterable from "../../../Iterable.ts"
import type * as Option from "../../../Option.ts"
import type * as Scope from "../../../Scope.ts"
import type * as Fx from "../Fx/Fx.ts"
import * as RefSubject from "./RefSubject.ts"

/**
 * A RefIterable is a RefSubject specialized over an Iterable of values.
 * @since 1.18.0
 * @category models
 */
export interface RefIterable<in out A, in out E = never, out R = never>
  extends RefSubject.RefSubject<Iterable<A>, E, R>
{}

/**
 * Creates a new `RefIterable` from an Iterable, `Effect`, or `Fx`.
 * @since 1.18.0
 * @category constructors
 */
export function make<A, E, R>(
  initial: Iterable<A> | Effect.Effect<Iterable<A>, E, R> | Fx.Fx<Iterable<A>, E, R>
): Effect.Effect<RefIterable<A, E>, never, R | Scope.Scope> {
  return RefSubject.make(initial, { eq: equals })
}

// ========================================
// Combinators
// ========================================

/**
 * Prepend a value to the current state of a RefIterable.
 * @since 1.18.0
 * @category combinators
 */
export const prepend: {
  <A>(value: A): <E, R>(ref: RefIterable<A, E, R>) => Effect.Effect<Iterable<A>, E, R>
  <A, E, R>(ref: RefIterable<A, E, R>, value: A): Effect.Effect<Iterable<A>, E, R>
} = dual(2, function prepend<A, E, R>(ref: RefIterable<A, E, R>, value: A) {
  return RefSubject.update(ref, Iterable.prepend(value))
})

/**
 * Prepend an iterable of values to the current state of a RefIterable.
 * @since 1.18.0
 * @category combinators
 */
export const prependAll: {
  <A>(value: Iterable<A>): <E, R>(ref: RefIterable<A, E, R>) => Effect.Effect<Iterable<A>, E, R>
  <A, E, R>(ref: RefIterable<A, E, R>, value: Iterable<A>): Effect.Effect<Iterable<A>, E, R>
} = dual(2, function prependAll<A, E, R>(ref: RefIterable<A, E, R>, value: Iterable<A>) {
  return RefSubject.update(ref, Iterable.prependAll(value))
})

/**
 * Append a value to the current state of a RefIterable.
 * @since 1.18.0
 * @category combinators
 */
export const append: {
  <A>(value: A): <E, R>(ref: RefIterable<A, E, R>) => Effect.Effect<Iterable<A>, E, R>
  <A, E, R>(ref: RefIterable<A, E, R>, value: A): Effect.Effect<Iterable<A>, E, R>
} = dual(2, function append<A, E, R>(ref: RefIterable<A, E, R>, value: A) {
  return RefSubject.update(ref, Iterable.append(value))
})

/**
 * Append an iterable of values to the current state of a RefIterable.
 * @since 1.18.0
 * @category combinators
 */
export const appendAll: {
  <A>(value: Iterable<A>): <E, R>(ref: RefIterable<A, E, R>) => Effect.Effect<Iterable<A>, E, R>
  <A, E, R>(ref: RefIterable<A, E, R>, value: Iterable<A>): Effect.Effect<Iterable<A>, E, R>
} = dual(2, function appendAll<A, E, R>(ref: RefIterable<A, E, R>, value: Iterable<A>) {
  return RefSubject.update(ref, Iterable.appendAll(value))
})

/**
 * Drop the first `n` values from a RefIterable.
 * @since 1.18.0
 * @category combinators
 */
export const drop: {
  (n: number): <A, E, R>(ref: RefIterable<A, E, R>) => Effect.Effect<Iterable<A>, E, R>
  <A, E, R>(ref: RefIterable<A, E, R>, n: number): Effect.Effect<Iterable<A>, E, R>
} = dual(2, function drop<A, E, R>(ref: RefIterable<A, E, R>, n: number) {
  return RefSubject.update(ref, Iterable.drop(n))
})

/**
 * Take the first `n` values from a RefIterable.
 * @since 1.18.0
 * @category combinators
 */
export const take: {
  (n: number): <A, E, R>(ref: RefIterable<A, E, R>) => Effect.Effect<Iterable<A>, E, R>
  <A, E, R>(ref: RefIterable<A, E, R>, n: number): Effect.Effect<Iterable<A>, E, R>
} = dual(2, function take<A, E, R>(ref: RefIterable<A, E, R>, n: number) {
  return RefSubject.update(ref, Iterable.take(n))
})

/**
 * Take values from a RefIterable while a predicate is true.
 * @since 1.18.0
 * @category combinators
 */
export const takeWhile: {
  <A>(predicate: (a: A) => boolean): <E, R>(ref: RefIterable<A, E, R>) => Effect.Effect<Iterable<A>, E, R>
  <A, E, R>(ref: RefIterable<A, E, R>, predicate: (a: A) => boolean): Effect.Effect<Iterable<A>, E, R>
} = dual(2, function takeWhile<A, E, R>(ref: RefIterable<A, E, R>, predicate: (a: A) => boolean) {
  return RefSubject.update(ref, Iterable.takeWhile(predicate))
})

/**
 * Filter the values of a RefIterable (mutating).
 * @since 1.18.0
 * @category combinators
 */
export const filter: {
  <A>(predicate: (a: A) => boolean): <E, R>(ref: RefIterable<A, E, R>) => Effect.Effect<Iterable<A>, E, R>
  <A, E, R>(ref: RefIterable<A, E, R>, predicate: (a: A) => boolean): Effect.Effect<Iterable<A>, E, R>
} = dual(2, function filter<A, E, R>(ref: RefIterable<A, E, R>, predicate: (a: A) => boolean) {
  return RefSubject.update(ref, Iterable.filter(predicate))
})

/**
 * Map (Endomorphic) the values of a RefIterable.
 * @since 1.18.0
 * @category combinators
 */
export const map: {
  <A>(f: (a: A, index: number) => A): <E, R>(ref: RefIterable<A, E, R>) => Effect.Effect<Iterable<A>, E, R>
  <A, E, R>(ref: RefIterable<A, E, R>, f: (a: A, index: number) => A): Effect.Effect<Iterable<A>, E, R>
} = dual(2, function map<A, E, R>(ref: RefIterable<A, E, R>, f: (a: A, index: number) => A) {
  return RefSubject.update(ref, Iterable.map(f))
})

/**
 * Remove adjacent duplicate values from a RefIterable.
 * @since 1.18.0
 * @category combinators
 */
export const dedupeAdjacent = <A, E, R>(ref: RefIterable<A, E, R>): Effect.Effect<Iterable<A>, E, R> =>
  RefSubject.update(ref, Iterable.dedupeAdjacent)

/**
 * Intersperse a separator between elements.
 * @since 1.18.0
 * @category combinators
 */
export const intersperse: {
  <A>(middle: A): <E, R>(ref: RefIterable<A, E, R>) => Effect.Effect<Iterable<A>, E, R>
  <A, E, R>(ref: RefIterable<A, E, R>, middle: A): Effect.Effect<Iterable<A>, E, R>
} = dual(2, function intersperse<A, E, R>(ref: RefIterable<A, E, R>, middle: A) {
  return RefSubject.update(ref, Iterable.intersperse(middle))
})

/**
 * Repeat the iterable n times.
 * @since 1.18.0
 * @category combinators
 */
export const repeat: {
  (n: number): <A, E, R>(ref: RefIterable<A, E, R>) => Effect.Effect<Iterable<A>, E, R>
  <A, E, R>(ref: RefIterable<A, E, R>, n: number): Effect.Effect<Iterable<A>, E, R>
} = dual(2, function repeat<A, E, R>(ref: RefIterable<A, E, R>, n: number) {
  return RefSubject.update(ref, Iterable.repeat(n))
})

/**
 * FlatMap (endomorphic).
 * @since 1.18.0
 * @category combinators
 */
export const flatMap: {
  <A>(f: (a: A, index: number) => Iterable<A>): <E, R>(ref: RefIterable<A, E, R>) => Effect.Effect<Iterable<A>, E, R>
  <A, E, R>(ref: RefIterable<A, E, R>, f: (a: A, index: number) => Iterable<A>): Effect.Effect<Iterable<A>, E, R>
} = dual(2, function flatMap<A, E, R>(ref: RefIterable<A, E, R>, f: (a: A, index: number) => Iterable<A>) {
  return RefSubject.update(ref, Iterable.flatMap(f))
})

/**
 * Filter and map values in place.
 * @since 1.18.0
 * @category combinators
 */
export const filterMap: {
  <A>(
    f: (a: A, index: number) => Option.Option<A>
  ): <E, R>(ref: RefIterable<A, E, R>) => Effect.Effect<Iterable<A>, E, R>
  <A, E, R>(
    ref: RefIterable<A, E, R>,
    f: (a: A, index: number) => Option.Option<A>
  ): Effect.Effect<Iterable<A>, E, R>
} = dual(2, function filterMap<A, E, R>(ref: RefIterable<A, E, R>, f: (a: A, index: number) => Option.Option<A>) {
  return RefSubject.update(ref, Iterable.filterMap(f))
})

/**
 * Extract Some values from Option iterable.
 * @since 1.18.0
 * @category combinators
 */
export const getSomes = <A, E, R>(
  ref: RefIterable<Option.Option<A>, E, R>
): Effect.Effect<Iterable<Option.Option<A>>, E, R> =>
  RefSubject.update(ref, (iter) => Iterable.getSomes(iter) as Iterable<Option.Option<A>>)

// ========================================
// Computed
// ========================================

/**
 * Check if a RefIterable is empty.
 * @since 1.18.0
 * @category computed
 */
export const isEmpty = <A, E, R>(ref: RefIterable<A, E, R>): RefSubject.Computed<boolean, E, R> =>
  RefSubject.map(ref, Iterable.isEmpty)

/**
 * Get the current size of a RefIterable.
 * @since 1.18.0
 * @category computed
 */
export const size = <A, E, R>(ref: RefIterable<A, E, R>): RefSubject.Computed<number, E, R> =>
  RefSubject.map(ref, Iterable.size)

/**
 * Map the values of a RefIterable to a different type.
 * @since 1.18.0
 * @category computed
 */
export const mapValues: {
  <A, B>(f: (a: A, index: number) => B): <E, R>(ref: RefIterable<A, E, R>) => RefSubject.Computed<Iterable<B>, E, R>
  <A, E, R, B>(ref: RefIterable<A, E, R>, f: (a: A, index: number) => B): RefSubject.Computed<Iterable<B>, E, R>
} = dual(2, function mapValues<A, E, R, B>(ref: RefIterable<A, E, R>, f: (a: A, index: number) => B) {
  return RefSubject.map(ref, Iterable.map(f))
})

/**
 * Filter the values of a RefIterable creating a Computed value.
 * @since 1.18.0
 * @category computed
 */
export const filterValues: {
  <A>(predicate: (a: A) => boolean): <E, R>(ref: RefIterable<A, E, R>) => RefSubject.Computed<Iterable<A>, E, R>
  <A, E, R>(ref: RefIterable<A, E, R>, predicate: (a: A) => boolean): RefSubject.Computed<Iterable<A>, E, R>
} = dual(2, function filterValues<A, E, R>(ref: RefIterable<A, E, R>, predicate: (a: A) => boolean) {
  return RefSubject.map(ref, Iterable.filter(predicate))
})

/**
 * Group the values of a RefIterable by a key.
 * @since 1.18.0
 * @category computed
 */
export const groupBy: {
  <A>(f: (a: A) => string): <E, R>(ref: RefIterable<A, E, R>) => RefSubject.Computed<Record<string, Array<A>>, E, R>
  <A, E, R>(ref: RefIterable<A, E, R>, f: (a: A) => string): RefSubject.Computed<Record<string, Array<A>>, E, R>
} = dual(2, function groupBy<A, E, R>(ref: RefIterable<A, E, R>, f: (a: A) => string) {
  return RefSubject.map(ref, Iterable.groupBy(f))
})

/**
 * Reduce the values of a RefIterable to a single value.
 * @since 1.18.0
 * @category computed
 */
export const reduce: {
  <A, B>(b: B, f: (b: B, a: A, index: number) => B): <E, R>(ref: RefIterable<A, E, R>) => RefSubject.Computed<B, E, R>
  <A, E, R, B>(ref: RefIterable<A, E, R>, b: B, f: (b: B, a: A, index: number) => B): RefSubject.Computed<B, E, R>
} = dual(3, function reduce<A, E, R, B>(ref: RefIterable<A, E, R>, b: B, f: (b: B, a: A, index: number) => B) {
  return RefSubject.map(ref, Iterable.reduce(b, f))
})

/**
 * Check if any value satisfies a predicate.
 * @since 1.18.0
 * @category computed
 */
export const some: {
  <A>(predicate: (a: A) => boolean): <E, R>(ref: RefIterable<A, E, R>) => RefSubject.Computed<boolean, E, R>
  <A, E, R>(ref: RefIterable<A, E, R>, predicate: (a: A) => boolean): RefSubject.Computed<boolean, E, R>
} = dual(2, function some<A, E, R>(ref: RefIterable<A, E, R>, predicate: (a: A) => boolean) {
  return RefSubject.map(ref, Iterable.some(predicate))
})

/**
 * Check if a RefIterable contains a value.
 * @since 1.18.0
 * @category computed
 */
export const contains: {
  <A>(value: A): <E, R>(ref: RefIterable<A, E, R>) => RefSubject.Computed<boolean, E, R>
  <A, E, R>(ref: RefIterable<A, E, R>, value: A): RefSubject.Computed<boolean, E, R>
} = dual(2, function contains<A, E, R>(ref: RefIterable<A, E, R>, value: A) {
  return RefSubject.map(ref, Iterable.contains(value))
})

/**
 * Count elements satisfying a predicate.
 * @since 1.18.0
 * @category computed
 */
export const countBy: {
  <A>(predicate: (a: A) => boolean): <E, R>(ref: RefIterable<A, E, R>) => RefSubject.Computed<number, E, R>
  <A, E, R>(ref: RefIterable<A, E, R>, predicate: (a: A) => boolean): RefSubject.Computed<number, E, R>
} = dual(2, function countBy<A, E, R>(ref: RefIterable<A, E, R>, predicate: (a: A) => boolean) {
  return RefSubject.map(ref, Iterable.countBy(predicate))
})

/**
 * Convert to array.
 * @since 1.18.0
 * @category computed
 */
export const toArray = <A, E, R>(ref: RefIterable<A, E, R>): RefSubject.Computed<Array<A>, E, R> =>
  RefSubject.map(ref, (iter) => Array.from(iter))

// ========================================
// Filtered
// ========================================

/**
 * Get the first element of a RefIterable as a Filtered.
 * @since 1.18.0
 * @category filtered
 */
export const head = <A, E, R>(ref: RefIterable<A, E, R>): RefSubject.Filtered<A, E, R> =>
  RefSubject.filterMap(ref, Iterable.head)

/**
 * Find the first value satisfying a predicate.
 * @since 1.18.0
 * @category filtered
 */
export const findFirst: {
  <A>(predicate: (a: A) => boolean): <E, R>(ref: RefIterable<A, E, R>) => RefSubject.Filtered<A, E, R>
  <A, E, R>(ref: RefIterable<A, E, R>, predicate: (a: A) => boolean): RefSubject.Filtered<A, E, R>
} = dual(2, function findFirst<A, E, R>(ref: RefIterable<A, E, R>, predicate: (a: A) => boolean) {
  return RefSubject.filterMap(ref, Iterable.findFirst(predicate))
})

/**
 * Find the last value satisfying a predicate.
 * @since 1.18.0
 * @category filtered
 */
export const findLast: {
  <A>(predicate: (a: A) => boolean): <E, R>(ref: RefIterable<A, E, R>) => RefSubject.Filtered<A, E, R>
  <A, E, R>(ref: RefIterable<A, E, R>, predicate: (a: A) => boolean): RefSubject.Filtered<A, E, R>
} = dual(2, function findLast<A, E, R>(ref: RefIterable<A, E, R>, predicate: (a: A) => boolean) {
  return RefSubject.filterMap(ref, Iterable.findLast(predicate))
})
