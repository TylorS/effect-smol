/**
 * Extensions to RefSubject for working with HashMap values
 * @since 1.18.0
 */

import type * as Effect from "../../../Effect.ts"
import { equals } from "../../../Equal.ts"
import { dual, flow } from "../../../Function.ts"
import * as HashMap from "../../../HashMap.ts"
import * as Option from "../../../Option.ts"
import type * as Scope from "../../../Scope.ts"
import type * as Fx from "../Fx/Fx.ts"
import * as RefSubject from "./RefSubject.ts"

/**
 * A RefHashMap is a RefSubject specialized over a HashMap.
 * @since 1.18.0
 * @category models
 */
export interface RefHashMap<in out K, in out V, in out E = never, out R = never>
  extends RefSubject.RefSubject<HashMap.HashMap<K, V>, E, R>
{}

/**
 * Creates a new `RefHashMap` from a HashMap, `Effect`, or `Fx`.
 * @since 1.18.0
 * @category constructors
 */
export function make<K, V, E, R>(
  initial:
    | HashMap.HashMap<K, V>
    | Effect.Effect<HashMap.HashMap<K, V>, E, R>
    | Fx.Fx<HashMap.HashMap<K, V>, E, R>
): Effect.Effect<RefHashMap<K, V, E>, never, R | Scope.Scope> {
  return RefSubject.make(initial, { eq: equals })
}

// ========================================
// Combinators
// ========================================

/**
 * Set a key-value pair in the RefHashMap.
 * @since 1.18.0
 * @category combinators
 */
export const set: {
  <K, V>(key: K, value: V): <E, R>(ref: RefHashMap<K, V, E, R>) => Effect.Effect<HashMap.HashMap<K, V>, E, R>
  <K, V, E, R>(ref: RefHashMap<K, V, E, R>, key: K, value: V): Effect.Effect<HashMap.HashMap<K, V>, E, R>
} = dual(3, function set<K, V, E, R>(ref: RefHashMap<K, V, E, R>, key: K, value: V) {
  return RefSubject.update(ref, HashMap.set(key, value))
})

/**
 * Remove a key from the RefHashMap.
 * @since 1.18.0
 * @category combinators
 */
export const remove: {
  <K>(key: K): <V, E, R>(ref: RefHashMap<K, V, E, R>) => Effect.Effect<HashMap.HashMap<K, V>, E, R>
  <K, V, E, R>(ref: RefHashMap<K, V, E, R>, key: K): Effect.Effect<HashMap.HashMap<K, V>, E, R>
} = dual(2, function remove<K, V, E, R>(ref: RefHashMap<K, V, E, R>, key: K) {
  return RefSubject.update(ref, HashMap.remove(key))
})

/**
 * Modify the value at a key if it exists.
 * @since 1.18.0
 * @category combinators
 */
export const modify: {
  <K, V>(key: K, f: (v: V) => V): <E, R>(ref: RefHashMap<K, V, E, R>) => Effect.Effect<HashMap.HashMap<K, V>, E, R>
  <K, V, E, R>(ref: RefHashMap<K, V, E, R>, key: K, f: (v: V) => V): Effect.Effect<HashMap.HashMap<K, V>, E, R>
} = dual(3, function modify<K, V, E, R>(ref: RefHashMap<K, V, E, R>, key: K, f: (v: V) => V) {
  return RefSubject.update(ref, HashMap.modify(key, f))
})

/**
 * Modify the value at a key using an Option-based update function.
 * @since 1.18.0
 * @category combinators
 */
export const modifyAt: {
  <K, V>(
    key: K,
    f: HashMap.HashMap.UpdateFn<V>
  ): <E, R>(ref: RefHashMap<K, V, E, R>) => Effect.Effect<HashMap.HashMap<K, V>, E, R>
  <K, V, E, R>(
    ref: RefHashMap<K, V, E, R>,
    key: K,
    f: HashMap.HashMap.UpdateFn<V>
  ): Effect.Effect<HashMap.HashMap<K, V>, E, R>
} = dual(3, function modifyAt<K, V, E, R>(ref: RefHashMap<K, V, E, R>, key: K, f: HashMap.HashMap.UpdateFn<V>) {
  return RefSubject.update(ref, HashMap.modifyAt(key, f))
})

/**
 * Set multiple key-value pairs in the RefHashMap.
 * @since 1.18.0
 * @category combinators
 */
export const setMany: {
  <K, V>(
    entries: Iterable<readonly [K, V]>
  ): <E, R>(ref: RefHashMap<K, V, E, R>) => Effect.Effect<HashMap.HashMap<K, V>, E, R>
  <K, V, E, R>(
    ref: RefHashMap<K, V, E, R>,
    entries: Iterable<readonly [K, V]>
  ): Effect.Effect<HashMap.HashMap<K, V>, E, R>
} = dual(2, function setMany<K, V, E, R>(ref: RefHashMap<K, V, E, R>, entries: Iterable<readonly [K, V]>) {
  return RefSubject.update(ref, HashMap.setMany(entries))
})

/**
 * Remove multiple keys from the RefHashMap.
 * @since 1.18.0
 * @category combinators
 */
export const removeMany: {
  <K>(keys: Iterable<K>): <V, E, R>(ref: RefHashMap<K, V, E, R>) => Effect.Effect<HashMap.HashMap<K, V>, E, R>
  <K, V, E, R>(ref: RefHashMap<K, V, E, R>, keys: Iterable<K>): Effect.Effect<HashMap.HashMap<K, V>, E, R>
} = dual(2, function removeMany<K, V, E, R>(ref: RefHashMap<K, V, E, R>, keys: Iterable<K>) {
  return RefSubject.update(ref, HashMap.removeMany(keys))
})

/**
 * Clear all entries from the RefHashMap.
 * @since 1.18.0
 * @category combinators
 */
export const clear = <K, V, E, R>(ref: RefHashMap<K, V, E, R>): Effect.Effect<HashMap.HashMap<K, V>, E, R> =>
  RefSubject.update(ref, () => HashMap.empty())

/**
 * Merge another HashMap into this one.
 * @since 1.18.0
 * @category combinators
 */
export const union: {
  <K, V>(
    that: HashMap.HashMap<K, V>
  ): <E, R>(ref: RefHashMap<K, V, E, R>) => Effect.Effect<HashMap.HashMap<K, V>, E, R>
  <K, V, E, R>(ref: RefHashMap<K, V, E, R>, that: HashMap.HashMap<K, V>): Effect.Effect<HashMap.HashMap<K, V>, E, R>
} = dual(2, function union<K, V, E, R>(ref: RefHashMap<K, V, E, R>, that: HashMap.HashMap<K, V>) {
  return RefSubject.update(ref, HashMap.union(that))
})

/**
 * Filter entries in place.
 * @since 1.18.0
 * @category combinators
 */
export const filter: {
  <K, V>(
    predicate: (value: V, key: K) => boolean
  ): <E, R>(ref: RefHashMap<K, V, E, R>) => Effect.Effect<HashMap.HashMap<K, V>, E, R>
  <K, V, E, R>(
    ref: RefHashMap<K, V, E, R>,
    predicate: (value: V, key: K) => boolean
  ): Effect.Effect<HashMap.HashMap<K, V>, E, R>
} = dual(2, function filter<K, V, E, R>(ref: RefHashMap<K, V, E, R>, predicate: (value: V, key: K) => boolean) {
  return RefSubject.update(ref, HashMap.filter(predicate))
})

/**
 * Map values in place (endomorphic).
 * @since 1.18.0
 * @category combinators
 */
export const map: {
  <K, V>(f: (value: V, key: K) => V): <E, R>(ref: RefHashMap<K, V, E, R>) => Effect.Effect<HashMap.HashMap<K, V>, E, R>
  <K, V, E, R>(ref: RefHashMap<K, V, E, R>, f: (value: V, key: K) => V): Effect.Effect<HashMap.HashMap<K, V>, E, R>
} = dual(2, function map<K, V, E, R>(ref: RefHashMap<K, V, E, R>, f: (value: V, key: K) => V) {
  return RefSubject.update(ref, HashMap.map(f))
})

// ========================================
// Computed
// ========================================

/**
 * Get the current size of the RefHashMap.
 * @since 1.18.0
 * @category computed
 */
export const size = <K, V, E, R>(ref: RefHashMap<K, V, E, R>): RefSubject.Computed<number, E, R> =>
  RefSubject.map(ref, HashMap.size)

/**
 * Check if the RefHashMap is empty.
 * @since 1.18.0
 * @category computed
 */
export const isEmpty = <K, V, E, R>(ref: RefHashMap<K, V, E, R>): RefSubject.Computed<boolean, E, R> =>
  RefSubject.map(ref, HashMap.isEmpty)

/**
 * Check if the RefHashMap is non-empty.
 * @since 1.18.0
 * @category computed
 */
export const isNonEmpty = <K, V, E, R>(ref: RefHashMap<K, V, E, R>): RefSubject.Computed<boolean, E, R> =>
  RefSubject.map(ref, (m) => !HashMap.isEmpty(m))

/**
 * Get all keys from the RefHashMap.
 * @since 1.18.0
 * @category computed
 */
export const keys = <K, V, E, R>(ref: RefHashMap<K, V, E, R>): RefSubject.Computed<Array<K>, E, R> =>
  RefSubject.map(ref, (m) => Array.from(HashMap.keys(m)))

/**
 * Get all values from the RefHashMap.
 * @since 1.18.0
 * @category computed
 */
export const values = <K, V, E, R>(ref: RefHashMap<K, V, E, R>): RefSubject.Computed<Array<V>, E, R> =>
  RefSubject.map(ref, HashMap.toValues)

/**
 * Get all entries from the RefHashMap.
 * @since 1.18.0
 * @category computed
 */
export const entries = <K, V, E, R>(ref: RefHashMap<K, V, E, R>): RefSubject.Computed<Array<[K, V]>, E, R> =>
  RefSubject.map(ref, HashMap.toEntries)

/**
 * Check if a key exists in the RefHashMap.
 * @since 1.18.0
 * @category computed
 */
export const has: {
  <K>(key: K): <V, E, R>(ref: RefHashMap<K, V, E, R>) => RefSubject.Computed<boolean, E, R>
  <K, V, E, R>(ref: RefHashMap<K, V, E, R>, key: K): RefSubject.Computed<boolean, E, R>
} = dual(2, function has<K, V, E, R>(ref: RefHashMap<K, V, E, R>, key: K) {
  return RefSubject.map(ref, HashMap.has(key))
})

/**
 * Map values to a different type.
 * @since 1.18.0
 * @category computed
 */
export const mapValues: {
  <K, V, B>(
    f: (value: V, key: K) => B
  ): <E, R>(ref: RefHashMap<K, V, E, R>) => RefSubject.Computed<HashMap.HashMap<K, B>, E, R>
  <K, V, E, R, B>(
    ref: RefHashMap<K, V, E, R>,
    f: (value: V, key: K) => B
  ): RefSubject.Computed<HashMap.HashMap<K, B>, E, R>
} = dual(2, function mapValues<K, V, E, R, B>(ref: RefHashMap<K, V, E, R>, f: (value: V, key: K) => B) {
  return RefSubject.map(ref, HashMap.map(f))
})

/**
 * Filter entries creating a Computed value.
 * @since 1.18.0
 * @category computed
 */
export const filterValues: {
  <K, V>(
    predicate: (value: V, key: K) => boolean
  ): <E, R>(ref: RefHashMap<K, V, E, R>) => RefSubject.Computed<HashMap.HashMap<K, V>, E, R>
  <K, V, E, R>(
    ref: RefHashMap<K, V, E, R>,
    predicate: (value: V, key: K) => boolean
  ): RefSubject.Computed<HashMap.HashMap<K, V>, E, R>
} = dual(2, function filterValues<K, V, E, R>(ref: RefHashMap<K, V, E, R>, predicate: (value: V, key: K) => boolean) {
  return RefSubject.map(ref, HashMap.filter(predicate))
})

/**
 * Filter and map values.
 * @since 1.18.0
 * @category computed
 */
export const filterMapValues: {
  <K, V, B>(
    f: (value: V, key: K) => Option.Option<B>
  ): <E, R>(ref: RefHashMap<K, V, E, R>) => RefSubject.Computed<HashMap.HashMap<K, B>, E, R>
  <K, V, E, R, B>(
    ref: RefHashMap<K, V, E, R>,
    f: (value: V, key: K) => Option.Option<B>
  ): RefSubject.Computed<HashMap.HashMap<K, B>, E, R>
} = dual(
  2,
  function filterMapValues<K, V, E, R, B>(ref: RefHashMap<K, V, E, R>, f: (value: V, key: K) => Option.Option<B>) {
    return RefSubject.map(ref, HashMap.filterMap(f))
  }
)

/**
 * Reduce the entries to a single value.
 * @since 1.18.0
 * @category computed
 */
export const reduce: {
  <K, V, B>(b: B, f: (b: B, value: V, key: K) => B): <E, R>(ref: RefHashMap<K, V, E, R>) => RefSubject.Computed<B, E, R>
  <K, V, E, R, B>(ref: RefHashMap<K, V, E, R>, b: B, f: (b: B, value: V, key: K) => B): RefSubject.Computed<B, E, R>
} = dual(3, function reduce<K, V, E, R, B>(ref: RefHashMap<K, V, E, R>, b: B, f: (b: B, value: V, key: K) => B) {
  return RefSubject.map(ref, HashMap.reduce(b, f))
})

/**
 * Check if any entry satisfies a predicate.
 * @since 1.18.0
 * @category computed
 */
export const some: {
  <K, V>(
    predicate: (value: V, key: K) => boolean
  ): <E, R>(ref: RefHashMap<K, V, E, R>) => RefSubject.Computed<boolean, E, R>
  <K, V, E, R>(
    ref: RefHashMap<K, V, E, R>,
    predicate: (value: V, key: K) => boolean
  ): RefSubject.Computed<boolean, E, R>
} = dual(2, function some<K, V, E, R>(ref: RefHashMap<K, V, E, R>, predicate: (value: V, key: K) => boolean) {
  return RefSubject.map(ref, HashMap.some(predicate))
})

/**
 * Check if all entries satisfy a predicate.
 * @since 1.18.0
 * @category computed
 */
export const every: {
  <K, V>(
    predicate: (value: V, key: K) => boolean
  ): <E, R>(ref: RefHashMap<K, V, E, R>) => RefSubject.Computed<boolean, E, R>
  <K, V, E, R>(
    ref: RefHashMap<K, V, E, R>,
    predicate: (value: V, key: K) => boolean
  ): RefSubject.Computed<boolean, E, R>
} = dual(2, function every<K, V, E, R>(ref: RefHashMap<K, V, E, R>, predicate: (value: V, key: K) => boolean) {
  return RefSubject.map(ref, HashMap.every(predicate))
})

// ========================================
// Filtered
// ========================================

/**
 * Get the value at a key as a Filtered.
 * @since 1.18.0
 * @category filtered
 */
export const get: {
  <K>(key: K): <V, E, R>(ref: RefHashMap<K, V, E, R>) => RefSubject.Filtered<V, E, R>
  <K, V, E, R>(ref: RefHashMap<K, V, E, R>, key: K): RefSubject.Filtered<V, E, R>
} = dual(2, function get<K, V, E, R>(ref: RefHashMap<K, V, E, R>, key: K) {
  return RefSubject.filterMap(ref, HashMap.get(key))
})

/**
 * Find the first entry satisfying a predicate.
 * @since 1.18.0
 * @category filtered
 */
export const findFirst: {
  <K, V>(
    predicate: (value: V, key: K) => boolean
  ): <E, R>(ref: RefHashMap<K, V, E, R>) => RefSubject.Filtered<[K, V], E, R>
  <K, V, E, R>(ref: RefHashMap<K, V, E, R>, predicate: (value: V, key: K) => boolean): RefSubject.Filtered<[K, V], E, R>
} = dual(2, function findFirst<K, V, E, R>(ref: RefHashMap<K, V, E, R>, predicate: (value: V, key: K) => boolean) {
  return RefSubject.filterMap(ref, flow(HashMap.findFirst(predicate), Option.fromUndefinedOr))
})
