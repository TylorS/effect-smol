/**
 * Extensions to RefSubject for working with Trie values
 * @since 1.18.0
 */

import type * as Effect from "../../../Effect.ts"
import { equals } from "../../../Equal.ts"
import { dual } from "../../../Function.ts"
import type * as Option from "../../../Option.ts"
import type * as Scope from "../../../Scope.ts"
import * as Trie from "../../../Trie.ts"
import type * as Fx from "../Fx/Fx.ts"
import * as RefSubject from "./RefSubject.ts"

/**
 * A RefTrie is a RefSubject specialized over a Trie.
 * @since 1.18.0
 * @category models
 */
export interface RefTrie<in out V, in out E = never, out R = never> extends RefSubject.RefSubject<Trie.Trie<V>, E, R> {}

/**
 * Creates a new `RefTrie` from a Trie, `Effect`, or `Fx`.
 * @since 1.18.0
 * @category constructors
 */
export function make<V, E, R>(
  initial: Trie.Trie<V> | Effect.Effect<Trie.Trie<V>, E, R> | Fx.Fx<Trie.Trie<V>, E, R>
): Effect.Effect<RefTrie<V, E>, never, R | Scope.Scope> {
  return RefSubject.make(initial, { eq: equals })
}

// ========================================
// Combinators
// ========================================

/**
 * Insert a key-value pair into the Trie.
 * @since 1.18.0
 * @category combinators
 */
export const insert: {
  <V>(key: string, value: V): <E, R>(ref: RefTrie<V, E, R>) => Effect.Effect<Trie.Trie<V>, E, R>
  <V, E, R>(ref: RefTrie<V, E, R>, key: string, value: V): Effect.Effect<Trie.Trie<V>, E, R>
} = dual(3, function insert<V, E, R>(ref: RefTrie<V, E, R>, key: string, value: V) {
  return RefSubject.update(ref, Trie.insert(key, value))
})

/**
 * Insert multiple key-value pairs into the Trie.
 * @since 1.18.0
 * @category combinators
 */
export const insertMany: {
  <V>(
    entries: Iterable<[string, V]>
  ): <E, R>(ref: RefTrie<V, E, R>) => Effect.Effect<Trie.Trie<V>, E, R>
  <V, E, R>(ref: RefTrie<V, E, R>, entries: Iterable<[string, V]>): Effect.Effect<Trie.Trie<V>, E, R>
} = dual(2, function insertMany<V, E, R>(ref: RefTrie<V, E, R>, entries: Iterable<[string, V]>) {
  return RefSubject.update(ref, Trie.insertMany(entries))
})

/**
 * Remove a key from the Trie.
 * @since 1.18.0
 * @category combinators
 */
export const remove: {
  (key: string): <V, E, R>(ref: RefTrie<V, E, R>) => Effect.Effect<Trie.Trie<V>, E, R>
  <V, E, R>(ref: RefTrie<V, E, R>, key: string): Effect.Effect<Trie.Trie<V>, E, R>
} = dual(2, function remove<V, E, R>(ref: RefTrie<V, E, R>, key: string) {
  return RefSubject.update(ref, Trie.remove(key))
})

/**
 * Remove multiple keys from the Trie.
 * @since 1.18.0
 * @category combinators
 */
export const removeMany: {
  (keys: Iterable<string>): <V, E, R>(ref: RefTrie<V, E, R>) => Effect.Effect<Trie.Trie<V>, E, R>
  <V, E, R>(ref: RefTrie<V, E, R>, keys: Iterable<string>): Effect.Effect<Trie.Trie<V>, E, R>
} = dual(2, function removeMany<V, E, R>(ref: RefTrie<V, E, R>, keys: Iterable<string>) {
  return RefSubject.update(ref, Trie.removeMany(keys))
})

/**
 * Modify the value at a key if it exists.
 * @since 1.18.0
 * @category combinators
 */
export const modify: {
  <V>(key: string, f: (v: V) => V): <E, R>(ref: RefTrie<V, E, R>) => Effect.Effect<Trie.Trie<V>, E, R>
  <V, E, R>(ref: RefTrie<V, E, R>, key: string, f: (v: V) => V): Effect.Effect<Trie.Trie<V>, E, R>
} = dual(3, function modify<V, E, R>(ref: RefTrie<V, E, R>, key: string, f: (v: V) => V) {
  return RefSubject.update(ref, Trie.modify(key, f))
})

/**
 * Clear all entries from the Trie.
 * @since 1.18.0
 * @category combinators
 */
export const clear = <V, E, R>(ref: RefTrie<V, E, R>): Effect.Effect<Trie.Trie<V>, E, R> =>
  RefSubject.update(ref, () => Trie.empty())

/**
 * Map values in place (endomorphic).
 * @since 1.18.0
 * @category combinators
 */
export const map: {
  <V>(f: (value: V, key: string) => V): <E, R>(ref: RefTrie<V, E, R>) => Effect.Effect<Trie.Trie<V>, E, R>
  <V, E, R>(ref: RefTrie<V, E, R>, f: (value: V, key: string) => V): Effect.Effect<Trie.Trie<V>, E, R>
} = dual(2, function map<V, E, R>(ref: RefTrie<V, E, R>, f: (value: V, key: string) => V) {
  return RefSubject.update(ref, Trie.map(f))
})

/**
 * Filter entries in place.
 * @since 1.18.0
 * @category combinators
 */
export const filter: {
  <V>(predicate: (value: V, key: string) => boolean): <E, R>(ref: RefTrie<V, E, R>) => Effect.Effect<Trie.Trie<V>, E, R>
  <V, E, R>(ref: RefTrie<V, E, R>, predicate: (value: V, key: string) => boolean): Effect.Effect<Trie.Trie<V>, E, R>
} = dual(2, function filter<V, E, R>(ref: RefTrie<V, E, R>, predicate: (value: V, key: string) => boolean) {
  return RefSubject.update(ref, Trie.filter(predicate))
})

/**
 * Filter and map entries in place.
 * @since 1.18.0
 * @category combinators
 */
export const filterMap: {
  <V>(
    f: (value: V, key: string) => Option.Option<V>
  ): <E, R>(ref: RefTrie<V, E, R>) => Effect.Effect<Trie.Trie<V>, E, R>
  <V, E, R>(
    ref: RefTrie<V, E, R>,
    f: (value: V, key: string) => Option.Option<V>
  ): Effect.Effect<Trie.Trie<V>, E, R>
} = dual(2, function filterMap<V, E, R>(ref: RefTrie<V, E, R>, f: (value: V, key: string) => Option.Option<V>) {
  return RefSubject.update(ref, Trie.filterMap(f))
})

// ========================================
// Computed
// ========================================

/**
 * Compact Option values.
 * @since 1.18.0
 * @category computed
 */
export const compact = <V, E, R>(
  ref: RefTrie<Option.Option<V>, E, R>
) => RefSubject.map(ref, Trie.compact)

/**
 * Get the current size of the Trie.
 * @since 1.18.0
 * @category computed
 */
export const size = <V, E, R>(ref: RefTrie<V, E, R>): RefSubject.Computed<number, E, R> =>
  RefSubject.map(ref, Trie.size)

/**
 * Check if the Trie is empty.
 * @since 1.18.0
 * @category computed
 */
export const isEmpty = <V, E, R>(ref: RefTrie<V, E, R>): RefSubject.Computed<boolean, E, R> =>
  RefSubject.map(ref, Trie.isEmpty)

/**
 * Check if the Trie is non-empty.
 * @since 1.18.0
 * @category computed
 */
export const isNonEmpty = <V, E, R>(ref: RefTrie<V, E, R>): RefSubject.Computed<boolean, E, R> =>
  RefSubject.map(ref, (t) => !Trie.isEmpty(t))

/**
 * Check if a key exists in the Trie.
 * @since 1.18.0
 * @category computed
 */
export const has: {
  (key: string): <V, E, R>(ref: RefTrie<V, E, R>) => RefSubject.Computed<boolean, E, R>
  <V, E, R>(ref: RefTrie<V, E, R>, key: string): RefSubject.Computed<boolean, E, R>
} = dual(2, function has<V, E, R>(ref: RefTrie<V, E, R>, key: string) {
  return RefSubject.map(ref, Trie.has(key))
})

/**
 * Get all keys from the Trie.
 * @since 1.18.0
 * @category computed
 */
export const keys = <V, E, R>(ref: RefTrie<V, E, R>): RefSubject.Computed<Array<string>, E, R> =>
  RefSubject.map(ref, (t) => Array.from(Trie.keys(t)))

/**
 * Get all values from the Trie.
 * @since 1.18.0
 * @category computed
 */
export const values = <V, E, R>(ref: RefTrie<V, E, R>): RefSubject.Computed<Array<V>, E, R> =>
  RefSubject.map(ref, (t) => Array.from(Trie.values(t)))

/**
 * Get all entries from the Trie.
 * @since 1.18.0
 * @category computed
 */
export const entries = <V, E, R>(ref: RefTrie<V, E, R>): RefSubject.Computed<Array<[string, V]>, E, R> =>
  RefSubject.map(ref, Trie.toEntries)

/**
 * Get all keys with a given prefix.
 * @since 1.18.0
 * @category computed
 */
export const keysWithPrefix: {
  (prefix: string): <V, E, R>(ref: RefTrie<V, E, R>) => RefSubject.Computed<Array<string>, E, R>
  <V, E, R>(ref: RefTrie<V, E, R>, prefix: string): RefSubject.Computed<Array<string>, E, R>
} = dual(2, function keysWithPrefix<V, E, R>(ref: RefTrie<V, E, R>, prefix: string) {
  return RefSubject.map(ref, (t) => Array.from(Trie.keysWithPrefix(t, prefix)))
})

/**
 * Get all values with a given prefix.
 * @since 1.18.0
 * @category computed
 */
export const valuesWithPrefix: {
  (prefix: string): <V, E, R>(ref: RefTrie<V, E, R>) => RefSubject.Computed<Array<V>, E, R>
  <V, E, R>(ref: RefTrie<V, E, R>, prefix: string): RefSubject.Computed<Array<V>, E, R>
} = dual(2, function valuesWithPrefix<V, E, R>(ref: RefTrie<V, E, R>, prefix: string) {
  return RefSubject.map(ref, (t) => Array.from(Trie.valuesWithPrefix(t, prefix)))
})

/**
 * Get all entries with a given prefix.
 * @since 1.18.0
 * @category computed
 */
export const entriesWithPrefix: {
  (prefix: string): <V, E, R>(ref: RefTrie<V, E, R>) => RefSubject.Computed<Array<[string, V]>, E, R>
  <V, E, R>(ref: RefTrie<V, E, R>, prefix: string): RefSubject.Computed<Array<[string, V]>, E, R>
} = dual(2, function entriesWithPrefix<V, E, R>(ref: RefTrie<V, E, R>, prefix: string) {
  return RefSubject.map(ref, Trie.toEntriesWithPrefix(prefix))
})

/**
 * Get the longest prefix of a key that exists in the Trie.
 * @since 1.18.0
 * @category computed
 */
export const longestPrefixOf: {
  (key: string): <V, E, R>(ref: RefTrie<V, E, R>) => RefSubject.Computed<[string, V] | undefined, E, R>
  <V, E, R>(ref: RefTrie<V, E, R>, key: string): RefSubject.Computed<[string, V] | undefined, E, R>
} = dual(2, function longestPrefixOf<V, E, R>(ref: RefTrie<V, E, R>, key: string) {
  return RefSubject.map(ref, Trie.longestPrefixOf(key))
})

/**
 * Map values to a different type.
 * @since 1.18.0
 * @category computed
 */
export const mapValues: {
  <V, B>(f: (value: V, key: string) => B): <E, R>(ref: RefTrie<V, E, R>) => RefSubject.Computed<Trie.Trie<B>, E, R>
  <V, E, R, B>(ref: RefTrie<V, E, R>, f: (value: V, key: string) => B): RefSubject.Computed<Trie.Trie<B>, E, R>
} = dual(2, function mapValues<V, E, R, B>(ref: RefTrie<V, E, R>, f: (value: V, key: string) => B) {
  return RefSubject.map(ref, Trie.map(f))
})

/**
 * Reduce the entries to a single value.
 * @since 1.18.0
 * @category computed
 */
export const reduce: {
  <V, B>(b: B, f: (b: B, value: V, key: string) => B): <E, R>(ref: RefTrie<V, E, R>) => RefSubject.Computed<B, E, R>
  <V, E, R, B>(ref: RefTrie<V, E, R>, b: B, f: (b: B, value: V, key: string) => B): RefSubject.Computed<B, E, R>
} = dual(3, function reduce<V, E, R, B>(ref: RefTrie<V, E, R>, b: B, f: (b: B, value: V, key: string) => B) {
  return RefSubject.map(ref, Trie.reduce(b, f))
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
  (key: string): <V, E, R>(ref: RefTrie<V, E, R>) => RefSubject.Filtered<V, E, R>
  <V, E, R>(ref: RefTrie<V, E, R>, key: string): RefSubject.Filtered<V, E, R>
} = dual(2, function get<V, E, R>(ref: RefTrie<V, E, R>, key: string) {
  return RefSubject.filterMap(ref, Trie.get(key))
})
