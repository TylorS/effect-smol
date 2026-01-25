/**
 * Extensions to RefSubject for working with Chunk values
 * @since 1.18.0
 */

import * as Chunk from "../../../Chunk.ts"
import type * as Effect from "../../../Effect.ts"
import { equals } from "../../../Equal.ts"
import type { Equivalence } from "../../../Equivalence.ts"
import { dual } from "../../../Function.ts"
import type * as Order from "../../../Order.ts"
import type * as Scope from "../../../Scope.ts"
import type * as Fx from "../Fx/Fx.ts"
import * as RefSubject from "./RefSubject.ts"

/**
 * A RefChunk is a RefSubject specialized over a Chunk of values.
 * @since 1.18.0
 * @category models
 */
export interface RefChunk<in out A, in out E = never, out R = never>
  extends RefSubject.RefSubject<Chunk.Chunk<A>, E, R>
{}

/**
 * Creates a new `RefChunk` from a Chunk, `Effect`, or `Fx`.
 * @since 1.18.0
 * @category constructors
 */
export function make<A, E, R>(
  initial: Chunk.Chunk<A> | Effect.Effect<Chunk.Chunk<A>, E, R> | Fx.Fx<Chunk.Chunk<A>, E, R>,
  eq: Equivalence<A> = equals
): Effect.Effect<RefChunk<A, E>, never, R | Scope.Scope> {
  return RefSubject.make(initial, { eq: Chunk.makeEquivalence(eq) })
}

/**
 * Prepend a value to the current state of a RefChunk.
 * @since 1.18.0
 * @category combinators
 */
export const prepend: {
  <A>(value: A): <E, R>(ref: RefChunk<A, E, R>) => Effect.Effect<Chunk.Chunk<A>, E, R>
  <A, E, R>(ref: RefChunk<A, E, R>, value: A): Effect.Effect<Chunk.Chunk<A>, E, R>
} = dual(2, function prepend<A, E, R>(ref: RefChunk<A, E, R>, value: A) {
  return RefSubject.update(ref, Chunk.prepend(value))
})

/**
 * Prepend an iterable of values to the current state of a RefChunk.
 * @since 1.18.0
 * @category combinators
 */
export const prependAll: {
  <A>(value: Iterable<A>): <E, R>(ref: RefChunk<A, E, R>) => Effect.Effect<Chunk.Chunk<A>, E, R>
  <A, E, R>(ref: RefChunk<A, E, R>, value: Iterable<A>): Effect.Effect<Chunk.Chunk<A>, E, R>
} = dual(2, function prependAll<A, E, R>(ref: RefChunk<A, E, R>, value: Iterable<A>) {
  return RefSubject.update(ref, Chunk.prependAll(Chunk.fromIterable(value)))
})

/**
 * Append a value to the current state of a RefChunk.
 * @since 1.18.0
 * @category combinators
 */
export const append: {
  <A>(value: A): <E, R>(ref: RefChunk<A, E, R>) => Effect.Effect<Chunk.Chunk<A>, E, R>
  <A, E, R>(ref: RefChunk<A, E, R>, value: A): Effect.Effect<Chunk.Chunk<A>, E, R>
} = dual(2, function append<A, E, R>(ref: RefChunk<A, E, R>, value: A) {
  return RefSubject.update(ref, Chunk.append(value))
})

/**
 * Append an iterable of values to the current state of a RefChunk.
 * @since 1.18.0
 * @category combinators
 */
export const appendAll: {
  <A>(value: Iterable<A>): <E, R>(ref: RefChunk<A, E, R>) => Effect.Effect<Chunk.Chunk<A>, E, R>
  <A, E, R>(ref: RefChunk<A, E, R>, value: Iterable<A>): Effect.Effect<Chunk.Chunk<A>, E, R>
} = dual(2, function appendAll<A, E, R>(ref: RefChunk<A, E, R>, value: Iterable<A>) {
  return RefSubject.update(ref, Chunk.appendAll(Chunk.fromIterable(value)))
})

/**
 * Drop the first `n` values from a RefChunk.
 * @since 1.18.0
 * @category combinators
 */
export const drop: {
  (n: number): <A, E, R>(ref: RefChunk<A, E, R>) => Effect.Effect<Chunk.Chunk<A>, E, R>
  <A, E, R>(ref: RefChunk<A, E, R>, n: number): Effect.Effect<Chunk.Chunk<A>, E, R>
} = dual(2, function drop<A, E, R>(ref: RefChunk<A, E, R>, n: number) {
  return RefSubject.update(ref, Chunk.drop(n))
})

/**
 * Drop the last `n` values from a RefChunk.
 * @since 1.18.0
 * @category combinators
 */
export const dropRight: {
  (n: number): <A, E, R>(ref: RefChunk<A, E, R>) => Effect.Effect<Chunk.Chunk<A>, E, R>
  <A, E, R>(ref: RefChunk<A, E, R>, n: number): Effect.Effect<Chunk.Chunk<A>, E, R>
} = dual(2, function dropRight<A, E, R>(ref: RefChunk<A, E, R>, n: number) {
  return RefSubject.update(ref, Chunk.dropRight(n))
})

/**
 * Drop values from a RefChunk while a predicate is true.
 * @since 1.18.0
 * @category combinators
 */
export const dropWhile: {
  <A>(predicate: (a: A) => boolean): <E, R>(ref: RefChunk<A, E, R>) => Effect.Effect<Chunk.Chunk<A>, E, R>
  <A, E, R>(ref: RefChunk<A, E, R>, predicate: (a: A) => boolean): Effect.Effect<Chunk.Chunk<A>, E, R>
} = dual(2, function dropWhile<A, E, R>(ref: RefChunk<A, E, R>, predicate: (a: A) => boolean) {
  return RefSubject.update(ref, Chunk.dropWhile(predicate))
})

/**
 * Take the first `n` values from a RefChunk.
 * @since 1.18.0
 * @category combinators
 */
export const take: {
  (n: number): <A, E, R>(ref: RefChunk<A, E, R>) => Effect.Effect<Chunk.Chunk<A>, E, R>
  <A, E, R>(ref: RefChunk<A, E, R>, n: number): Effect.Effect<Chunk.Chunk<A>, E, R>
} = dual(2, function take<A, E, R>(ref: RefChunk<A, E, R>, n: number) {
  return RefSubject.update(ref, Chunk.take(n))
})

/**
 * Take the last `n` values from a RefChunk.
 * @since 1.18.0
 * @category combinators
 */
export const takeRight: {
  (n: number): <A, E, R>(ref: RefChunk<A, E, R>) => Effect.Effect<Chunk.Chunk<A>, E, R>
  <A, E, R>(ref: RefChunk<A, E, R>, n: number): Effect.Effect<Chunk.Chunk<A>, E, R>
} = dual(2, function takeRight<A, E, R>(ref: RefChunk<A, E, R>, n: number) {
  return RefSubject.update(ref, Chunk.takeRight(n))
})

/**
 * Take values from a RefChunk while a predicate is true.
 * @since 1.18.0
 * @category combinators
 */
export const takeWhile: {
  <A>(predicate: (a: A) => boolean): <E, R>(ref: RefChunk<A, E, R>) => Effect.Effect<Chunk.Chunk<A>, E, R>
  <A, E, R>(ref: RefChunk<A, E, R>, predicate: (a: A) => boolean): Effect.Effect<Chunk.Chunk<A>, E, R>
} = dual(2, function takeWhile<A, E, R>(ref: RefChunk<A, E, R>, predicate: (a: A) => boolean) {
  return RefSubject.update(ref, Chunk.takeWhile(predicate))
})

/**
 * Modify the value at a particular index of a RefChunk.
 * @since 1.18.0
 * @category combinators
 */
export const modifyAt: {
  <A>(index: number, f: (a: A) => A): <E, R>(ref: RefChunk<A, E, R>) => Effect.Effect<Chunk.Chunk<A>, E, R>
  <A, E, R>(ref: RefChunk<A, E, R>, index: number, f: (a: A) => A): Effect.Effect<Chunk.Chunk<A>, E, R>
} = dual(3, function modifyAt<A, E, R>(ref: RefChunk<A, E, R>, index: number, f: (a: A) => A) {
  return RefSubject.update(ref, (chunk) => Chunk.modify(chunk, index, f) ?? chunk)
})

/**
 * Replace a value at a particular index of a RefChunk.
 * @since 1.18.0
 * @category combinators
 */
export const replaceAt: {
  <A>(index: number, a: A): <E, R>(ref: RefChunk<A, E, R>) => Effect.Effect<Chunk.Chunk<A>, E, R>
  <A, E, R>(ref: RefChunk<A, E, R>, index: number, a: A): Effect.Effect<Chunk.Chunk<A>, E, R>
} = dual(3, function replaceAt<A, E, R>(ref: RefChunk<A, E, R>, index: number, a: A) {
  return RefSubject.update(ref, (chunk) => Chunk.replace(chunk, index, a) ?? chunk)
})

/**
 * Remove a value at a particular index of a RefChunk.
 * @since 1.18.0
 * @category combinators
 */
export const remove: {
  (index: number): <A, E, R>(ref: RefChunk<A, E, R>) => Effect.Effect<Chunk.Chunk<A>, E, R>
  <A, E, R>(ref: RefChunk<A, E, R>, index: number): Effect.Effect<Chunk.Chunk<A>, E, R>
} = dual(2, function remove<A, E, R>(ref: RefChunk<A, E, R>, index: number) {
  return RefSubject.update(ref, Chunk.remove(index))
})

/**
 * Filter the values of a RefChunk (mutating).
 * @since 1.18.0
 * @category combinators
 */
export const filter: {
  <A>(predicate: (a: A) => boolean): <E, R>(ref: RefChunk<A, E, R>) => Effect.Effect<Chunk.Chunk<A>, E, R>
  <A, E, R>(ref: RefChunk<A, E, R>, predicate: (a: A) => boolean): Effect.Effect<Chunk.Chunk<A>, E, R>
} = dual(2, function filter<A, E, R>(ref: RefChunk<A, E, R>, predicate: (a: A) => boolean) {
  return RefSubject.update(ref, Chunk.filter(predicate))
})

/**
 * Map (Endomorphic) the values of a RefChunk.
 * @since 1.18.0
 * @category combinators
 */
export const map: {
  <A>(f: (a: A, index: number) => A): <E, R>(ref: RefChunk<A, E, R>) => Effect.Effect<Chunk.Chunk<A>, E, R>
  <A, E, R>(ref: RefChunk<A, E, R>, f: (a: A, index: number) => A): Effect.Effect<Chunk.Chunk<A>, E, R>
} = dual(2, function map<A, E, R>(ref: RefChunk<A, E, R>, f: (a: A, index: number) => A) {
  return RefSubject.update(ref, Chunk.map(f))
})

/**
 * Remove duplicate values from a RefChunk.
 * @since 1.18.0
 * @category combinators
 */
export const dedupe = <A, E, R>(ref: RefChunk<A, E, R>): Effect.Effect<Chunk.Chunk<A>, E, R> =>
  RefSubject.update(ref, Chunk.dedupe)

/**
 * Remove adjacent duplicate values from a RefChunk.
 * @since 1.18.0
 * @category combinators
 */
export const dedupeAdjacent = <A, E, R>(ref: RefChunk<A, E, R>): Effect.Effect<Chunk.Chunk<A>, E, R> =>
  RefSubject.update(ref, Chunk.dedupeAdjacent)

/**
 * Reverse the values of a RefChunk.
 * @since 1.18.0
 * @category combinators
 */
export const reverse = <A, E, R>(ref: RefChunk<A, E, R>): Effect.Effect<Chunk.Chunk<A>, E, R> =>
  RefSubject.update(ref, Chunk.reverse)

/**
 * Sort the values of a RefChunk using a provided Order.
 * @since 1.18.0
 * @category combinators
 */
export const sort: {
  <A>(order: Order.Order<A>): <E, R>(ref: RefChunk<A, E, R>) => Effect.Effect<Chunk.Chunk<A>, E, R>
  <A, E, R>(ref: RefChunk<A, E, R>, order: Order.Order<A>): Effect.Effect<Chunk.Chunk<A>, E, R>
} = dual(2, function sort<A, E, R>(ref: RefChunk<A, E, R>, order: Order.Order<A>) {
  return RefSubject.update(ref, Chunk.sort(order))
})

// ========================================
// Computed
// ========================================

/**
 * Check if a RefChunk is empty.
 * @since 1.18.0
 * @category computed
 */
export const isEmpty = <A, E, R>(ref: RefChunk<A, E, R>): RefSubject.Computed<boolean, E, R> =>
  RefSubject.map(ref, Chunk.isEmpty)

/**
 * Check if a RefChunk is non-empty.
 * @since 1.18.0
 * @category computed
 */
export const isNonEmpty = <A, E, R>(ref: RefChunk<A, E, R>): RefSubject.Computed<boolean, E, R> =>
  RefSubject.map(ref, Chunk.isNonEmpty)

/**
 * Get the current size of a RefChunk.
 * @since 1.18.0
 * @category computed
 */
export const size = <A, E, R>(ref: RefChunk<A, E, R>): RefSubject.Computed<number, E, R> =>
  RefSubject.map(ref, Chunk.size)

/**
 * Map the values of a RefChunk to a different type.
 * @since 1.18.0
 * @category computed
 */
export const mapValues: {
  <A, B>(f: (a: A, index: number) => B): <E, R>(ref: RefChunk<A, E, R>) => RefSubject.Computed<Chunk.Chunk<B>, E, R>
  <A, E, R, B>(ref: RefChunk<A, E, R>, f: (a: A, index: number) => B): RefSubject.Computed<Chunk.Chunk<B>, E, R>
} = dual(2, function mapValues<A, E, R, B>(ref: RefChunk<A, E, R>, f: (a: A, index: number) => B) {
  return RefSubject.map(ref, Chunk.map(f))
})

/**
 * Filter the values of a RefChunk creating a Computed value.
 * @since 1.18.0
 * @category computed
 */
export const filterValues: {
  <A>(predicate: (a: A) => boolean): <E, R>(ref: RefChunk<A, E, R>) => RefSubject.Computed<Chunk.Chunk<A>, E, R>
  <A, E, R>(ref: RefChunk<A, E, R>, predicate: (a: A) => boolean): RefSubject.Computed<Chunk.Chunk<A>, E, R>
} = dual(2, function filterValues<A, E, R>(ref: RefChunk<A, E, R>, predicate: (a: A) => boolean) {
  return RefSubject.map(ref, Chunk.filter(predicate))
})

/**
 * Partition the values of a RefChunk using a predicate.
 * @since 1.18.0
 * @category computed
 */
export const partition: {
  <A>(predicate: (a: A) => boolean): <E, R>(
    ref: RefChunk<A, E, R>
  ) => RefSubject.Computed<[Chunk.Chunk<A>, Chunk.Chunk<A>], E, R>
  <A, E, R>(
    ref: RefChunk<A, E, R>,
    predicate: (a: A) => boolean
  ): RefSubject.Computed<[Chunk.Chunk<A>, Chunk.Chunk<A>], E, R>
} = dual(2, function partition<A, E, R>(ref: RefChunk<A, E, R>, predicate: (a: A) => boolean) {
  return RefSubject.map(ref, Chunk.partition(predicate))
})

/**
 * Reduce the values of a RefChunk to a single value.
 * @since 1.18.0
 * @category computed
 */
export const reduce: {
  <A, B>(b: B, f: (b: B, a: A, index: number) => B): <E, R>(ref: RefChunk<A, E, R>) => RefSubject.Computed<B, E, R>
  <A, E, R, B>(ref: RefChunk<A, E, R>, b: B, f: (b: B, a: A, index: number) => B): RefSubject.Computed<B, E, R>
} = dual(3, function reduce<A, E, R, B>(ref: RefChunk<A, E, R>, b: B, f: (b: B, a: A, index: number) => B) {
  return RefSubject.map(ref, Chunk.reduce(b, f))
})

/**
 * Reduce the values of a RefChunk in reverse order.
 * @since 1.18.0
 * @category computed
 */
export const reduceRight: {
  <A, B>(b: B, f: (b: B, a: A, index: number) => B): <E, R>(ref: RefChunk<A, E, R>) => RefSubject.Computed<B, E, R>
  <A, E, R, B>(ref: RefChunk<A, E, R>, b: B, f: (b: B, a: A, index: number) => B): RefSubject.Computed<B, E, R>
} = dual(3, function reduceRight<A, E, R, B>(ref: RefChunk<A, E, R>, b: B, f: (b: B, a: A, index: number) => B) {
  return RefSubject.map(ref, Chunk.reduceRight(b, f))
})

/**
 * Check if any value satisfies a predicate.
 * @since 1.18.0
 * @category computed
 */
export const some: {
  <A>(predicate: (a: A) => boolean): <E, R>(ref: RefChunk<A, E, R>) => RefSubject.Computed<boolean, E, R>
  <A, E, R>(ref: RefChunk<A, E, R>, predicate: (a: A) => boolean): RefSubject.Computed<boolean, E, R>
} = dual(2, function some<A, E, R>(ref: RefChunk<A, E, R>, predicate: (a: A) => boolean) {
  return RefSubject.map(ref, Chunk.some(predicate))
})

/**
 * Check if all values satisfy a predicate.
 * @since 1.18.0
 * @category computed
 */
export const every: {
  <A>(predicate: (a: A) => boolean): <E, R>(ref: RefChunk<A, E, R>) => RefSubject.Computed<boolean, E, R>
  <A, E, R>(ref: RefChunk<A, E, R>, predicate: (a: A) => boolean): RefSubject.Computed<boolean, E, R>
} = dual(2, function every<A, E, R>(ref: RefChunk<A, E, R>, predicate: (a: A) => boolean) {
  return RefSubject.map(ref, Chunk.every(predicate))
})

/**
 * Check if a RefChunk contains a value.
 * @since 1.18.0
 * @category computed
 */
export const contains: {
  <A>(value: A): <E, R>(ref: RefChunk<A, E, R>) => RefSubject.Computed<boolean, E, R>
  <A, E, R>(ref: RefChunk<A, E, R>, value: A): RefSubject.Computed<boolean, E, R>
} = dual(2, function contains<A, E, R>(ref: RefChunk<A, E, R>, value: A) {
  return RefSubject.map(ref, Chunk.contains(value))
})

// ========================================
// Filtered
// ========================================

/**
 * Get a value at a particular index of a RefChunk.
 * @since 1.18.0
 * @category filtered
 */
export const getIndex: {
  (index: number): <A, E, R>(ref: RefChunk<A, E, R>) => RefSubject.Filtered<A, E, R>
  <A, E, R>(ref: RefChunk<A, E, R>, index: number): RefSubject.Filtered<A, E, R>
} = dual(2, function getIndex<A, E, R>(ref: RefChunk<A, E, R>, index: number) {
  return RefSubject.filterMap(ref, Chunk.get(index))
})

/**
 * Get the first element of a RefChunk as a Filtered.
 * @since 1.18.0
 * @category filtered
 */
export const head = <A, E, R>(ref: RefChunk<A, E, R>): RefSubject.Filtered<A, E, R> =>
  RefSubject.filterMap(ref, Chunk.head)

/**
 * Get the last element of a RefChunk as a Filtered.
 * @since 1.18.0
 * @category filtered
 */
export const last = <A, E, R>(ref: RefChunk<A, E, R>): RefSubject.Filtered<A, E, R> =>
  RefSubject.filterMap(ref, Chunk.last)

/**
 * Find the first value satisfying a predicate.
 * @since 1.18.0
 * @category filtered
 */
export const findFirst: {
  <A>(predicate: (a: A) => boolean): <E, R>(ref: RefChunk<A, E, R>) => RefSubject.Filtered<A, E, R>
  <A, E, R>(ref: RefChunk<A, E, R>, predicate: (a: A) => boolean): RefSubject.Filtered<A, E, R>
} = dual(2, function findFirst<A, E, R>(ref: RefChunk<A, E, R>, predicate: (a: A) => boolean) {
  return RefSubject.filterMap(ref, Chunk.findFirst(predicate))
})

/**
 * Find the last value satisfying a predicate.
 * @since 1.18.0
 * @category filtered
 */
export const findLast: {
  <A>(predicate: (a: A) => boolean): <E, R>(ref: RefChunk<A, E, R>) => RefSubject.Filtered<A, E, R>
  <A, E, R>(ref: RefChunk<A, E, R>, predicate: (a: A) => boolean): RefSubject.Filtered<A, E, R>
} = dual(2, function findLast<A, E, R>(ref: RefChunk<A, E, R>, predicate: (a: A) => boolean) {
  return RefSubject.filterMap(ref, Chunk.findLast(predicate))
})
