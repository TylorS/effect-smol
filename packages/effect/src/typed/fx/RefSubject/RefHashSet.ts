/**
 * Extensions to RefSubject for working with HashSet values
 * @since 1.18.0
 */

import type * as Effect from "../../../Effect.ts"
import { equals } from "../../../Equal.ts"
import { dual } from "../../../Function.ts"
import * as HashSet from "../../../HashSet.ts"
import type * as Scope from "../../../Scope.ts"
import type * as Fx from "../Fx/Fx.ts"
import * as RefSubject from "./RefSubject.ts"

/**
 * A RefHashSet is a RefSubject specialized over a HashSet.
 * @since 1.18.0
 * @category models
 */
export interface RefHashSet<in out V, in out E = never, out R = never>
  extends RefSubject.RefSubject<HashSet.HashSet<V>, E, R>
{}

/**
 * Creates a new `RefHashSet` from a HashSet, `Effect`, or `Fx`.
 * @since 1.18.0
 * @category constructors
 */
export function make<V, E, R>(
  initial: HashSet.HashSet<V> | Effect.Effect<HashSet.HashSet<V>, E, R> | Fx.Fx<HashSet.HashSet<V>, E, R>
): Effect.Effect<RefHashSet<V, E>, never, R | Scope.Scope> {
  return RefSubject.make(initial, { eq: equals })
}

// ========================================
// Combinators
// ========================================

/**
 * Add a value to the RefHashSet.
 * @since 1.18.0
 * @category combinators
 */
export const add: {
  <V>(value: V): <E, R>(ref: RefHashSet<V, E, R>) => Effect.Effect<HashSet.HashSet<V>, E, R>
  <V, E, R>(ref: RefHashSet<V, E, R>, value: V): Effect.Effect<HashSet.HashSet<V>, E, R>
} = dual(2, function add<V, E, R>(ref: RefHashSet<V, E, R>, value: V) {
  return RefSubject.update(ref, HashSet.add(value))
})

/**
 * Remove a value from the RefHashSet.
 * @since 1.18.0
 * @category combinators
 */
export const remove: {
  <V>(value: V): <E, R>(ref: RefHashSet<V, E, R>) => Effect.Effect<HashSet.HashSet<V>, E, R>
  <V, E, R>(ref: RefHashSet<V, E, R>, value: V): Effect.Effect<HashSet.HashSet<V>, E, R>
} = dual(2, function remove<V, E, R>(ref: RefHashSet<V, E, R>, value: V) {
  return RefSubject.update(ref, HashSet.remove(value))
})

/**
 * Clear all values from the RefHashSet.
 * @since 1.18.0
 * @category combinators
 */
export const clear = <V, E, R>(ref: RefHashSet<V, E, R>): Effect.Effect<HashSet.HashSet<V>, E, R> =>
  RefSubject.update(ref, () => HashSet.empty())

/**
 * Compute the union with another HashSet.
 * @since 1.18.0
 * @category combinators
 */
export const union: {
  <V>(that: HashSet.HashSet<V>): <E, R>(ref: RefHashSet<V, E, R>) => Effect.Effect<HashSet.HashSet<V>, E, R>
  <V, E, R>(ref: RefHashSet<V, E, R>, that: HashSet.HashSet<V>): Effect.Effect<HashSet.HashSet<V>, E, R>
} = dual(2, function union<V, E, R>(ref: RefHashSet<V, E, R>, that: HashSet.HashSet<V>) {
  return RefSubject.update(ref, HashSet.union(that))
})

/**
 * Compute the intersection with another HashSet.
 * @since 1.18.0
 * @category combinators
 */
export const intersection: {
  <V>(that: HashSet.HashSet<V>): <E, R>(ref: RefHashSet<V, E, R>) => Effect.Effect<HashSet.HashSet<V>, E, R>
  <V, E, R>(ref: RefHashSet<V, E, R>, that: HashSet.HashSet<V>): Effect.Effect<HashSet.HashSet<V>, E, R>
} = dual(2, function intersection<V, E, R>(ref: RefHashSet<V, E, R>, that: HashSet.HashSet<V>) {
  return RefSubject.update(ref, HashSet.intersection(that))
})

/**
 * Compute the difference with another HashSet.
 * @since 1.18.0
 * @category combinators
 */
export const difference: {
  <V>(that: HashSet.HashSet<V>): <E, R>(ref: RefHashSet<V, E, R>) => Effect.Effect<HashSet.HashSet<V>, E, R>
  <V, E, R>(ref: RefHashSet<V, E, R>, that: HashSet.HashSet<V>): Effect.Effect<HashSet.HashSet<V>, E, R>
} = dual(2, function difference<V, E, R>(ref: RefHashSet<V, E, R>, that: HashSet.HashSet<V>) {
  return RefSubject.update(ref, HashSet.difference(that))
})

/**
 * Filter values in place.
 * @since 1.18.0
 * @category combinators
 */
export const filter: {
  <V>(predicate: (value: V) => boolean): <E, R>(ref: RefHashSet<V, E, R>) => Effect.Effect<HashSet.HashSet<V>, E, R>
  <V, E, R>(ref: RefHashSet<V, E, R>, predicate: (value: V) => boolean): Effect.Effect<HashSet.HashSet<V>, E, R>
} = dual(2, function filter<V, E, R>(ref: RefHashSet<V, E, R>, predicate: (value: V) => boolean) {
  return RefSubject.update(ref, HashSet.filter(predicate))
})

/**
 * Map values in place (endomorphic).
 * @since 1.18.0
 * @category combinators
 */
export const map: {
  <V>(f: (value: V) => V): <E, R>(ref: RefHashSet<V, E, R>) => Effect.Effect<HashSet.HashSet<V>, E, R>
  <V, E, R>(ref: RefHashSet<V, E, R>, f: (value: V) => V): Effect.Effect<HashSet.HashSet<V>, E, R>
} = dual(2, function map<V, E, R>(ref: RefHashSet<V, E, R>, f: (value: V) => V) {
  return RefSubject.update(ref, HashSet.map(f))
})

// ========================================
// Computed
// ========================================

/**
 * Get the current size of the RefHashSet.
 * @since 1.18.0
 * @category computed
 */
export const size = <V, E, R>(ref: RefHashSet<V, E, R>): RefSubject.Computed<number, E, R> =>
  RefSubject.map(ref, HashSet.size)

/**
 * Check if the RefHashSet is empty.
 * @since 1.18.0
 * @category computed
 */
export const isEmpty = <V, E, R>(ref: RefHashSet<V, E, R>): RefSubject.Computed<boolean, E, R> =>
  RefSubject.map(ref, HashSet.isEmpty)

/**
 * Check if the RefHashSet is non-empty.
 * @since 1.18.0
 * @category computed
 */
export const isNonEmpty = <V, E, R>(ref: RefHashSet<V, E, R>): RefSubject.Computed<boolean, E, R> =>
  RefSubject.map(ref, (s) => !HashSet.isEmpty(s))

/**
 * Check if a value exists in the RefHashSet.
 * @since 1.18.0
 * @category computed
 */
export const has: {
  <V>(value: V): <E, R>(ref: RefHashSet<V, E, R>) => RefSubject.Computed<boolean, E, R>
  <V, E, R>(ref: RefHashSet<V, E, R>, value: V): RefSubject.Computed<boolean, E, R>
} = dual(2, function has<V, E, R>(ref: RefHashSet<V, E, R>, value: V) {
  return RefSubject.map(ref, HashSet.has(value))
})

/**
 * Check if any value satisfies a predicate.
 * @since 1.18.0
 * @category computed
 */
export const some: {
  <V>(predicate: (value: V) => boolean): <E, R>(ref: RefHashSet<V, E, R>) => RefSubject.Computed<boolean, E, R>
  <V, E, R>(ref: RefHashSet<V, E, R>, predicate: (value: V) => boolean): RefSubject.Computed<boolean, E, R>
} = dual(2, function some<V, E, R>(ref: RefHashSet<V, E, R>, predicate: (value: V) => boolean) {
  return RefSubject.map(ref, HashSet.some(predicate))
})

/**
 * Check if all values satisfy a predicate.
 * @since 1.18.0
 * @category computed
 */
export const every: {
  <V>(predicate: (value: V) => boolean): <E, R>(ref: RefHashSet<V, E, R>) => RefSubject.Computed<boolean, E, R>
  <V, E, R>(ref: RefHashSet<V, E, R>, predicate: (value: V) => boolean): RefSubject.Computed<boolean, E, R>
} = dual(2, function every<V, E, R>(ref: RefHashSet<V, E, R>, predicate: (value: V) => boolean) {
  return RefSubject.map(ref, HashSet.every(predicate))
})

/**
 * Check if this set is a subset of another.
 * @since 1.18.0
 * @category computed
 */
export const isSubset: {
  <V>(that: HashSet.HashSet<V>): <E, R>(ref: RefHashSet<V, E, R>) => RefSubject.Computed<boolean, E, R>
  <V, E, R>(ref: RefHashSet<V, E, R>, that: HashSet.HashSet<V>): RefSubject.Computed<boolean, E, R>
} = dual(2, function isSubset<V, E, R>(ref: RefHashSet<V, E, R>, that: HashSet.HashSet<V>) {
  return RefSubject.map(ref, HashSet.isSubset(that))
})

/**
 * Map values to a different type.
 * @since 1.18.0
 * @category computed
 */
export const mapValues: {
  <V, B>(f: (value: V) => B): <E, R>(ref: RefHashSet<V, E, R>) => RefSubject.Computed<HashSet.HashSet<B>, E, R>
  <V, E, R, B>(ref: RefHashSet<V, E, R>, f: (value: V) => B): RefSubject.Computed<HashSet.HashSet<B>, E, R>
} = dual(2, function mapValues<V, E, R, B>(ref: RefHashSet<V, E, R>, f: (value: V) => B) {
  return RefSubject.map(ref, HashSet.map(f))
})

/**
 * Filter values creating a Computed value.
 * @since 1.18.0
 * @category computed
 */
export const filterValues: {
  <V>(
    predicate: (value: V) => boolean
  ): <E, R>(ref: RefHashSet<V, E, R>) => RefSubject.Computed<HashSet.HashSet<V>, E, R>
  <V, E, R>(
    ref: RefHashSet<V, E, R>,
    predicate: (value: V) => boolean
  ): RefSubject.Computed<HashSet.HashSet<V>, E, R>
} = dual(2, function filterValues<V, E, R>(ref: RefHashSet<V, E, R>, predicate: (value: V) => boolean) {
  return RefSubject.map(ref, HashSet.filter(predicate))
})

/**
 * Reduce the values to a single value.
 * @since 1.18.0
 * @category computed
 */
export const reduce: {
  <V, B>(b: B, f: (b: B, value: V) => B): <E, R>(ref: RefHashSet<V, E, R>) => RefSubject.Computed<B, E, R>
  <V, E, R, B>(ref: RefHashSet<V, E, R>, b: B, f: (b: B, value: V) => B): RefSubject.Computed<B, E, R>
} = dual(3, function reduce<V, E, R, B>(ref: RefHashSet<V, E, R>, b: B, f: (b: B, value: V) => B) {
  return RefSubject.map(ref, HashSet.reduce(b, f))
})

/**
 * Get all values as an array.
 * @since 1.18.0
 * @category computed
 */
export const values = <V, E, R>(ref: RefHashSet<V, E, R>): RefSubject.Computed<Array<V>, E, R> =>
  RefSubject.map(ref, (s) => Array.from(s))
