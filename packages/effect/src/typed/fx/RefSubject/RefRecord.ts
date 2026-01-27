/**
 * Extensions to RefSubject for working with Record values
 * @since 1.18.0
 */

import type * as Effect from "../../../Effect.ts"
import { equals } from "../../../Equal.ts"
import { dual } from "../../../Function.ts"
import * as Option from "../../../Option.ts"
import * as Record from "../../../Record.ts"
import type * as Scope from "../../../Scope.ts"
import type * as Fx from "../Fx/Fx.ts"
import * as RefSubject from "./RefSubject.ts"

/**
 * A RefRecord is a RefSubject specialized over a Record.
 * @since 1.18.0
 * @category models
 */
export interface RefRecord<in out K extends string, in out V, in out E = never, out R = never>
  extends RefSubject.RefSubject<Record.ReadonlyRecord<K, V>, E, R>
{}

/**
 * Creates a new `RefRecord` from a Record, `Effect`, or `Fx`.
 * @since 1.18.0
 * @category constructors
 */
export function make<K extends string, V, E, R>(
  initial:
    | Record.ReadonlyRecord<K, V>
    | Effect.Effect<Record.ReadonlyRecord<K, V>, E, R>
    | Fx.Fx<Record.ReadonlyRecord<K, V>, E, R>
): Effect.Effect<RefRecord<K, V, E>, never, R | Scope.Scope> {
  return RefSubject.make(initial, { eq: equals })
}

// ========================================
// Combinators
// ========================================

/**
 * Set a key-value pair in the Record.
 * @since 1.18.0
 * @category combinators
 */
export const set: {
  <K extends string, V>(
    key: K,
    value: V
  ): <E, R>(ref: RefRecord<K, V, E, R>) => Effect.Effect<Record.ReadonlyRecord<K, V>, E, R>
  <K extends string, V, E, R>(
    ref: RefRecord<K, V, E, R>,
    key: K,
    value: V
  ): Effect.Effect<Record.ReadonlyRecord<K, V>, E, R>
} = dual(3, function set<K extends string, V, E, R>(ref: RefRecord<K, V, E, R>, key: K, value: V) {
  return RefSubject.update(ref, Record.set(key, value))
})

/**
 * Remove a key from the Record.
 * @since 1.18.0
 * @category combinators
 */
export const remove: {
  <K extends string>(key: K): <V, E, R>(ref: RefRecord<K, V, E, R>) => Effect.Effect<Record.ReadonlyRecord<K, V>, E, R>
  <K extends string, V, E, R>(ref: RefRecord<K, V, E, R>, key: K): Effect.Effect<Record.ReadonlyRecord<K, V>, E, R>
} = dual(2, function remove<K extends string, V, E, R>(ref: RefRecord<K, V, E, R>, key: K) {
  return RefSubject.update(ref, (r) => Record.remove(r, key) as Record.ReadonlyRecord<K, V>)
})

/**
 * Modify the value at a key if it exists.
 * @since 1.18.0
 * @category combinators
 */
export const modify: {
  <K extends string, V>(
    key: K,
    f: (v: V) => V
  ): <E, R>(ref: RefRecord<K, V, E, R>) => Effect.Effect<Record.ReadonlyRecord<K, V>, E, R>
  <K extends string, V, E, R>(
    ref: RefRecord<K, V, E, R>,
    key: K,
    f: (v: V) => V
  ): Effect.Effect<Record.ReadonlyRecord<K, V>, E, R>
} = dual(3, function modify<K extends string, V, E, R>(ref: RefRecord<K, V, E, R>, key: K, f: (v: V) => V) {
  return RefSubject.update(ref, (r) => Record.modify(r, key, f) ?? r)
})

/**
 * Replace the value at a key if it exists.
 * @since 1.18.0
 * @category combinators
 */
export const replace: {
  <K extends string, V>(
    key: K,
    value: V
  ): <E, R>(ref: RefRecord<K, V, E, R>) => Effect.Effect<Record.ReadonlyRecord<K, V>, E, R>
  <K extends string, V, E, R>(
    ref: RefRecord<K, V, E, R>,
    key: K,
    value: V
  ): Effect.Effect<Record.ReadonlyRecord<K, V>, E, R>
} = dual(3, function replace<K extends string, V, E, R>(ref: RefRecord<K, V, E, R>, key: K, value: V) {
  return RefSubject.update(ref, (r) => Record.replace(r, key, value) ?? r)
})

/**
 * Clear all entries from the Record.
 * @since 1.18.0
 * @category combinators
 */
export const clear = <K extends string, V, E, R>(
  ref: RefRecord<K, V, E, R>
): Effect.Effect<Record.ReadonlyRecord<K, V>, E, R> =>
  RefSubject.update(ref, () => Record.empty() as Record.ReadonlyRecord<K, V>)

/**
 * Union with another record.
 * @since 1.18.0
 * @category combinators
 */
export const union: {
  <K extends string, V>(
    that: Record.ReadonlyRecord<K, V>,
    combine?: (selfValue: V, thatValue: V) => V
  ): <E, R>(ref: RefRecord<K, V, E, R>) => Effect.Effect<Record.ReadonlyRecord<K, V>, E, R>
  <K extends string, V, E, R>(
    ref: RefRecord<K, V, E, R>,
    that: Record.ReadonlyRecord<K, V>,
    combine?: (selfValue: V, thatValue: V) => V
  ): Effect.Effect<Record.ReadonlyRecord<K, V>, E, R>
} = dual(
  (args) => RefSubject.isRefSubject(args[0]),
  function union<K extends string, V, E, R>(
    ref: RefRecord<K, V, E, R>,
    that: Record.ReadonlyRecord<K, V>,
    combine?: (selfValue: V, thatValue: V) => V
  ) {
    return RefSubject.update(ref, (r) => Record.union(r, that, combine ?? ((_, b) => b)) as Record.ReadonlyRecord<K, V>)
  }
)

/**
 * Intersection with another record.
 * @since 1.18.0
 * @category combinators
 */
export const intersection: {
  <K extends string, V>(
    that: Record.ReadonlyRecord<K, V>,
    combine?: (selfValue: V, thatValue: V) => V
  ): <E, R>(ref: RefRecord<K, V, E, R>) => Effect.Effect<Record.ReadonlyRecord<K, V>, E, R>
  <K extends string, V, E, R>(
    ref: RefRecord<K, V, E, R>,
    that: Record.ReadonlyRecord<K, V>,
    combine?: (selfValue: V, thatValue: V) => V
  ): Effect.Effect<Record.ReadonlyRecord<K, V>, E, R>
} = dual(
  (args) => RefSubject.isRefSubject(args[0]),
  function intersection<K extends string, V, E, R>(
    ref: RefRecord<K, V, E, R>,
    that: Record.ReadonlyRecord<K, V>,
    combine?: (selfValue: V, thatValue: V) => V
  ) {
    return RefSubject.update(
      ref,
      (r) => Record.intersection(r, that, combine ?? ((_, b) => b)) as Record.ReadonlyRecord<K, V>
    )
  }
)

/**
 * Difference with another record.
 * @since 1.18.0
 * @category combinators
 */
export const difference: {
  <K extends string, V>(
    that: Record.ReadonlyRecord<K, V>
  ): <E, R>(ref: RefRecord<K, V, E, R>) => Effect.Effect<Record.ReadonlyRecord<K, V>, E, R>
  <K extends string, V, E, R>(
    ref: RefRecord<K, V, E, R>,
    that: Record.ReadonlyRecord<K, V>
  ): Effect.Effect<Record.ReadonlyRecord<K, V>, E, R>
} = dual(2, function difference<K extends string, V, E, R>(
  ref: RefRecord<K, V, E, R>,
  that: Record.ReadonlyRecord<K, V>
) {
  return RefSubject.update(ref, (r) => Record.difference(r, that) as Record.ReadonlyRecord<K, V>)
})

/**
 * Filter entries in place.
 * @since 1.18.0
 * @category combinators
 */
export const filter: {
  <K extends string, V>(
    predicate: (value: V, key: K) => boolean
  ): <E, R>(ref: RefRecord<K, V, E, R>) => Effect.Effect<Record.ReadonlyRecord<K, V>, E, R>
  <K extends string, V, E, R>(
    ref: RefRecord<K, V, E, R>,
    predicate: (value: V, key: K) => boolean
  ): Effect.Effect<Record.ReadonlyRecord<K, V>, E, R>
} = dual(2, function filter<K extends string, V, E, R>(
  ref: RefRecord<K, V, E, R>,
  predicate: (value: V, key: K) => boolean
) {
  return RefSubject.update(ref, (r) => Record.filter(r, predicate) as Record.ReadonlyRecord<K, V>)
})

/**
 * Map values in place (endomorphic).
 * @since 1.18.0
 * @category combinators
 */
export const map: {
  <K extends string, V>(
    f: (value: V, key: K) => V
  ): <E, R>(ref: RefRecord<K, V, E, R>) => Effect.Effect<Record.ReadonlyRecord<K, V>, E, R>
  <K extends string, V, E, R>(
    ref: RefRecord<K, V, E, R>,
    f: (value: V, key: K) => V
  ): Effect.Effect<Record.ReadonlyRecord<K, V>, E, R>
} = dual(2, function map<K extends string, V, E, R>(ref: RefRecord<K, V, E, R>, f: (value: V, key: K) => V) {
  return RefSubject.update(ref, (r) => Record.map(r, f) as Record.ReadonlyRecord<K, V>)
})

// ========================================
// Computed
// ========================================

/**
 * Get the current size of the Record.
 * @since 1.18.0
 * @category computed
 */
export const size = <K extends string, V, E, R>(ref: RefRecord<K, V, E, R>): RefSubject.Computed<number, E, R> =>
  RefSubject.map(ref, Record.size)

/**
 * Check if the Record is empty.
 * @since 1.18.0
 * @category computed
 */
export const isEmpty = <K extends string, V, E, R>(ref: RefRecord<K, V, E, R>): RefSubject.Computed<boolean, E, R> =>
  RefSubject.map(ref, Record.isEmptyRecord)

/**
 * Check if the Record is non-empty.
 * @since 1.18.0
 * @category computed
 */
export const isNonEmpty = <K extends string, V, E, R>(ref: RefRecord<K, V, E, R>): RefSubject.Computed<boolean, E, R> =>
  RefSubject.map(ref, (r) => !Record.isEmptyRecord(r))

/**
 * Check if a key exists in the Record.
 * @since 1.18.0
 * @category computed
 */
export const has: {
  <K extends string>(key: K): <V, E, R>(ref: RefRecord<K, V, E, R>) => RefSubject.Computed<boolean, E, R>
  <K extends string, V, E, R>(ref: RefRecord<K, V, E, R>, key: K): RefSubject.Computed<boolean, E, R>
} = dual(2, function has<K extends string, V, E, R>(ref: RefRecord<K, V, E, R>, key: K) {
  return RefSubject.map(ref, Record.has(key))
})

/**
 * Get all keys from the Record.
 * @since 1.18.0
 * @category computed
 */
export const keys = <K extends string, V, E, R>(ref: RefRecord<K, V, E, R>): RefSubject.Computed<Array<K>, E, R> =>
  RefSubject.map(ref, Record.keys) as RefSubject.Computed<Array<K>, E, R>

/**
 * Get all values from the Record.
 * @since 1.18.0
 * @category computed
 */
export const values = <K extends string, V, E, R>(ref: RefRecord<K, V, E, R>): RefSubject.Computed<Array<V>, E, R> =>
  RefSubject.map(ref, Record.values)

/**
 * Get all entries from the Record.
 * @since 1.18.0
 * @category computed
 */
export const entries = <K extends string, V, E, R>(
  ref: RefRecord<K, V, E, R>
): RefSubject.Computed<Array<[K, V]>, E, R> => RefSubject.map(ref, Record.toEntries)

/**
 * Map values to a different type.
 * @since 1.18.0
 * @category computed
 */
export const mapValues: {
  <K extends string, V, B>(
    f: (value: V, key: K) => B
  ): <E, R>(ref: RefRecord<K, V, E, R>) => RefSubject.Computed<Record.ReadonlyRecord<K, B>, E, R>
  <K extends string, V, E, R, B>(
    ref: RefRecord<K, V, E, R>,
    f: (value: V, key: K) => B
  ): RefSubject.Computed<Record.ReadonlyRecord<K, B>, E, R>
} = dual(2, function mapValues<K extends string, V, E, R, B>(ref: RefRecord<K, V, E, R>, f: (value: V, key: K) => B) {
  return RefSubject.map(ref, (r) => Record.map(r, f) as Record.ReadonlyRecord<K, B>)
})

/**
 * Map keys to different keys.
 * @since 1.18.0
 * @category computed
 */
export const mapKeys: {
  <K extends string, K2 extends string>(
    f: (key: K) => K2
  ): <V, E, R>(ref: RefRecord<K, V, E, R>) => RefSubject.Computed<Record.ReadonlyRecord<K2, V>, E, R>
  <K extends string, V, E, R, K2 extends string>(
    ref: RefRecord<K, V, E, R>,
    f: (key: K) => K2
  ): RefSubject.Computed<Record.ReadonlyRecord<K2, V>, E, R>
} = dual(
  2,
  function mapKeys<K extends string, V, E, R, K2 extends string>(ref: RefRecord<K, V, E, R>, f: (key: K) => K2) {
    return RefSubject.map(ref, (r) => Record.mapKeys(r, f) as Record.ReadonlyRecord<K2, V>)
  }
)

/**
 * Map entries to new key-value pairs.
 * @since 1.18.0
 * @category computed
 */
export const mapEntries: {
  <K extends string, V, K2 extends string, B>(
    f: (value: V, key: K) => [K2, B]
  ): <E, R>(ref: RefRecord<K, V, E, R>) => RefSubject.Computed<Record.ReadonlyRecord<K2, B>, E, R>
  <K extends string, V, E, R, K2 extends string, B>(
    ref: RefRecord<K, V, E, R>,
    f: (value: V, key: K) => [K2, B]
  ): RefSubject.Computed<Record.ReadonlyRecord<K2, B>, E, R>
} = dual(
  2,
  function mapEntries<K extends string, V, E, R, K2 extends string, B>(
    ref: RefRecord<K, V, E, R>,
    f: (value: V, key: K) => [K2, B]
  ) {
    return RefSubject.map(ref, (r) => Record.mapEntries(r, f) as Record.ReadonlyRecord<K2, B>)
  }
)

/**
 * Filter entries creating a Computed value.
 * @since 1.18.0
 * @category computed
 */
export const filterValues: {
  <K extends string, V>(
    predicate: (value: V, key: K) => boolean
  ): <E, R>(ref: RefRecord<K, V, E, R>) => RefSubject.Computed<Record.ReadonlyRecord<K, V>, E, R>
  <K extends string, V, E, R>(
    ref: RefRecord<K, V, E, R>,
    predicate: (value: V, key: K) => boolean
  ): RefSubject.Computed<Record.ReadonlyRecord<K, V>, E, R>
} = dual(2, function filterValues<K extends string, V, E, R>(
  ref: RefRecord<K, V, E, R>,
  predicate: (value: V, key: K) => boolean
) {
  return RefSubject.map(ref, (r) => Record.filter(r, predicate) as Record.ReadonlyRecord<K, V>)
})

/**
 * Filter and map values.
 * @since 1.18.0
 * @category computed
 */
export const filterMapValues: {
  <K extends string, V, B>(
    f: (value: V, key: K) => Option.Option<B>
  ): <E, R>(ref: RefRecord<K, V, E, R>) => RefSubject.Computed<Record.ReadonlyRecord<K, B>, E, R>
  <K extends string, V, E, R, B>(
    ref: RefRecord<K, V, E, R>,
    f: (value: V, key: K) => Option.Option<B>
  ): RefSubject.Computed<Record.ReadonlyRecord<K, B>, E, R>
} = dual(
  2,
  function filterMapValues<K extends string, V, E, R, B>(
    ref: RefRecord<K, V, E, R>,
    f: (value: V, key: K) => Option.Option<B>
  ) {
    return RefSubject.map(ref, (r) => Record.filterMap(r, f) as Record.ReadonlyRecord<K, B>)
  }
)

/**
 * Partition entries.
 * @since 1.18.0
 * @category computed
 */
export const partition: {
  <K extends string, V>(
    predicate: (value: V, key: K) => boolean
  ): <E, R>(ref: RefRecord<K, V, E, R>) => RefSubject.Computed<
    [Record.ReadonlyRecord<K, V>, Record.ReadonlyRecord<K, V>],
    E,
    R
  >
  <K extends string, V, E, R>(
    ref: RefRecord<K, V, E, R>,
    predicate: (value: V, key: K) => boolean
  ): RefSubject.Computed<[Record.ReadonlyRecord<K, V>, Record.ReadonlyRecord<K, V>], E, R>
} = dual(2, function partition<K extends string, V, E, R>(
  ref: RefRecord<K, V, E, R>,
  predicate: (value: V, key: K) => boolean
) {
  return RefSubject.map(
    ref,
    (r) => Record.partition(r, predicate) as [Record.ReadonlyRecord<K, V>, Record.ReadonlyRecord<K, V>]
  )
})

/**
 * Check if any entry satisfies a predicate.
 * @since 1.18.0
 * @category computed
 */
export const some: {
  <K extends string, V>(
    predicate: (value: V, key: K) => boolean
  ): <E, R>(ref: RefRecord<K, V, E, R>) => RefSubject.Computed<boolean, E, R>
  <K extends string, V, E, R>(
    ref: RefRecord<K, V, E, R>,
    predicate: (value: V, key: K) => boolean
  ): RefSubject.Computed<boolean, E, R>
} = dual(
  2,
  function some<K extends string, V, E, R>(ref: RefRecord<K, V, E, R>, predicate: (value: V, key: K) => boolean) {
    return RefSubject.map(ref, Record.some(predicate))
  }
)

/**
 * Check if all entries satisfy a predicate.
 * @since 1.18.0
 * @category computed
 */
export const every: {
  <K extends string, V>(
    predicate: (value: V, key: K) => boolean
  ): <E, R>(ref: RefRecord<K, V, E, R>) => RefSubject.Computed<boolean, E, R>
  <K extends string, V, E, R>(
    ref: RefRecord<K, V, E, R>,
    predicate: (value: V, key: K) => boolean
  ): RefSubject.Computed<boolean, E, R>
} = dual(
  2,
  function every<K extends string, V, E, R>(ref: RefRecord<K, V, E, R>, predicate: (value: V, key: K) => boolean) {
    return RefSubject.map(ref, Record.every(predicate))
  }
)

/**
 * Reduce the entries to a single value.
 * @since 1.18.0
 * @category computed
 */
export const reduce: {
  <K extends string, V, B>(
    b: B,
    f: (b: B, value: V, key: K) => B
  ): <E, R>(ref: RefRecord<K, V, E, R>) => RefSubject.Computed<B, E, R>
  <K extends string, V, E, R, B>(
    ref: RefRecord<K, V, E, R>,
    b: B,
    f: (b: B, value: V, key: K) => B
  ): RefSubject.Computed<B, E, R>
} = dual(3, function reduce<K extends string, V, E, R, B>(
  ref: RefRecord<K, V, E, R>,
  b: B,
  f: (b: B, value: V, key: K) => B
) {
  return RefSubject.map(ref, Record.reduce(b, f))
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
  <K extends string>(key: K): <V, E, R>(ref: RefRecord<K, V, E, R>) => RefSubject.Filtered<V, E, R>
  <K extends string, V, E, R>(ref: RefRecord<K, V, E, R>, key: K): RefSubject.Filtered<V, E, R>
} = dual(2, function get<K extends string, V, E, R>(ref: RefRecord<K, V, E, R>, key: K) {
  return RefSubject.filterMap(ref, Record.get(key))
})

/**
 * Find the first entry satisfying a predicate.
 * @since 1.18.0
 * @category filtered
 */
export const findFirst: {
  <K extends string, V>(
    predicate: (value: V, key: K) => boolean
  ): <E, R>(ref: RefRecord<K, V, E, R>) => RefSubject.Filtered<[K, V], E, R>
  <K extends string, V, E, R>(
    ref: RefRecord<K, V, E, R>,
    predicate: (value: V, key: K) => boolean
  ): RefSubject.Filtered<[K, V], E, R>
} = dual(2, function findFirst<K extends string, V, E, R>(
  ref: RefRecord<K, V, E, R>,
  predicate: (value: V, key: K) => boolean
) {
  return RefSubject.filterMap(ref, (r) => Option.fromNullishOr(Record.findFirst(r, predicate)))
})

/**
 * Pop a value at a key as a Filtered.
 * @since 1.18.0
 * @category filtered
 */
export const pop: {
  <K extends string>(
    key: K
  ): <V, E, R>(ref: RefRecord<K, V, E, R>) => RefSubject.Filtered<[V, Record.ReadonlyRecord<K, V>], E, R>
  <K extends string, V, E, R>(
    ref: RefRecord<K, V, E, R>,
    key: K
  ): RefSubject.Filtered<[V, Record.ReadonlyRecord<K, V>], E, R>
} = dual(2, function pop<K extends string, V, E, R>(ref: RefRecord<K, V, E, R>, key: K) {
  return RefSubject.filterMap(ref, (r) => {
    const result = Record.pop(r, key)
    if (result === undefined) return Option.none()
    return Option.some([result[0], result[1] as Record.ReadonlyRecord<K, V>])
  })
})
