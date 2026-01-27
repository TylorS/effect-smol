/**
 * Extensions to RefSubject for working with HashRing values
 * @since 1.18.0
 */

import type * as Effect from "../../../Effect.ts"
import { equals } from "../../../Equal.ts"
import { dual } from "../../../Function.ts"
import * as HashRing from "../../../HashRing.ts"
import * as Option from "../../../Option.ts"
import type * as PrimaryKey from "../../../PrimaryKey.ts"
import type * as Scope from "../../../Scope.ts"
import type * as Fx from "../Fx/Fx.ts"
import * as RefSubject from "./RefSubject.ts"

/**
 * A RefHashRing is a RefSubject specialized over a HashRing.
 * @since 1.18.0
 * @category models
 */
export interface RefHashRing<in out A extends PrimaryKey.PrimaryKey, in out E = never, out R = never>
  extends RefSubject.RefSubject<HashRing.HashRing<A>, E, R>
{}

/**
 * Creates a new `RefHashRing` from a HashRing, `Effect`, or `Fx`.
 * @since 1.18.0
 * @category constructors
 */
export function make<A extends PrimaryKey.PrimaryKey, E, R>(
  initial:
    | HashRing.HashRing<A>
    | Effect.Effect<HashRing.HashRing<A>, E, R>
    | Fx.Fx<HashRing.HashRing<A>, E, R>
): Effect.Effect<RefHashRing<A, E>, never, R | Scope.Scope> {
  return RefSubject.make(initial, { eq: equals })
}

/**
 * Creates a new empty RefHashRing.
 * @since 1.18.0
 * @category constructors
 */
export function empty<A extends PrimaryKey.PrimaryKey, E, R>(options?: {
  readonly baseWeight?: number
}): Effect.Effect<RefHashRing<A, E>, never, R | Scope.Scope> {
  return RefSubject.make(HashRing.make<A>(options), { eq: equals })
}

// Helper to copy a HashRing before mutation
function copyRing<A extends PrimaryKey.PrimaryKey>(ring: HashRing.HashRing<A>): HashRing.HashRing<A> {
  const newRing = HashRing.make<A>({ baseWeight: ring.baseWeight })
  return HashRing.addMany(newRing, ring)
}

// ========================================
// Combinators
// ========================================

/**
 * Add a node to the HashRing.
 * @since 1.18.0
 * @category combinators
 */
export const add: {
  <A extends PrimaryKey.PrimaryKey>(
    node: A,
    options?: { readonly weight?: number }
  ): <E, R>(ref: RefHashRing<A, E, R>) => Effect.Effect<HashRing.HashRing<A>, E, R>
  <A extends PrimaryKey.PrimaryKey, E, R>(
    ref: RefHashRing<A, E, R>,
    node: A,
    options?: { readonly weight?: number }
  ): Effect.Effect<HashRing.HashRing<A>, E, R>
} = dual(
  (args) => RefSubject.isRefSubject(args[0]),
  function add<A extends PrimaryKey.PrimaryKey, E, R>(
    ref: RefHashRing<A, E, R>,
    node: A,
    options?: { readonly weight?: number }
  ) {
    return RefSubject.update(ref, (ring) => HashRing.add(copyRing(ring), node, options))
  }
)

/**
 * Add multiple nodes to the HashRing.
 * @since 1.18.0
 * @category combinators
 */
export const addMany: {
  <A extends PrimaryKey.PrimaryKey>(
    nodes: Iterable<A>,
    options?: { readonly weight?: number }
  ): <E, R>(ref: RefHashRing<A, E, R>) => Effect.Effect<HashRing.HashRing<A>, E, R>
  <A extends PrimaryKey.PrimaryKey, E, R>(
    ref: RefHashRing<A, E, R>,
    nodes: Iterable<A>,
    options?: { readonly weight?: number }
  ): Effect.Effect<HashRing.HashRing<A>, E, R>
} = dual(
  (args) => RefSubject.isRefSubject(args[0]),
  function addMany<A extends PrimaryKey.PrimaryKey, E, R>(
    ref: RefHashRing<A, E, R>,
    nodes: Iterable<A>,
    options?: { readonly weight?: number }
  ) {
    return RefSubject.update(ref, (ring) => HashRing.addMany(copyRing(ring), nodes, options))
  }
)

/**
 * Remove a node from the HashRing.
 * @since 1.18.0
 * @category combinators
 */
export const remove: {
  <A extends PrimaryKey.PrimaryKey>(
    node: A
  ): <E, R>(ref: RefHashRing<A, E, R>) => Effect.Effect<HashRing.HashRing<A>, E, R>
  <A extends PrimaryKey.PrimaryKey, E, R>(
    ref: RefHashRing<A, E, R>,
    node: A
  ): Effect.Effect<HashRing.HashRing<A>, E, R>
} = dual(2, function remove<A extends PrimaryKey.PrimaryKey, E, R>(ref: RefHashRing<A, E, R>, node: A) {
  return RefSubject.update(ref, (ring) => HashRing.remove(copyRing(ring), node))
})

// ========================================
// Computed
// ========================================

/**
 * Check if a node exists in the HashRing.
 * @since 1.18.0
 * @category computed
 */
export const has: {
  <A extends PrimaryKey.PrimaryKey>(
    node: A
  ): <E, R>(ref: RefHashRing<A, E, R>) => RefSubject.Computed<boolean, E, R>
  <A extends PrimaryKey.PrimaryKey, E, R>(
    ref: RefHashRing<A, E, R>,
    node: A
  ): RefSubject.Computed<boolean, E, R>
} = dual(2, function has<A extends PrimaryKey.PrimaryKey, E, R>(ref: RefHashRing<A, E, R>, node: A) {
  return RefSubject.map(ref, HashRing.has(node))
})

/**
 * Get the number of nodes in the HashRing.
 * @since 1.18.0
 * @category computed
 */
export const size = <A extends PrimaryKey.PrimaryKey, E, R>(
  ref: RefHashRing<A, E, R>
): RefSubject.Computed<number, E, R> => RefSubject.map(ref, (ring) => ring.nodes.size)

/**
 * Check if the HashRing is empty.
 * @since 1.18.0
 * @category computed
 */
export const isEmpty = <A extends PrimaryKey.PrimaryKey, E, R>(
  ref: RefHashRing<A, E, R>
): RefSubject.Computed<boolean, E, R> => RefSubject.map(ref, (ring) => ring.nodes.size === 0)

/**
 * Get the node which should handle a given input string as a Computed.
 * Returns undefined if the ring is empty.
 * @since 1.18.0
 * @category computed
 */
export const getNode: {
  (input: string): <A extends PrimaryKey.PrimaryKey, E, R>(
    ref: RefHashRing<A, E, R>
  ) => RefSubject.Computed<A | undefined, E, R>
  <A extends PrimaryKey.PrimaryKey, E, R>(
    ref: RefHashRing<A, E, R>,
    input: string
  ): RefSubject.Computed<A | undefined, E, R>
} = dual(2, function getNode<A extends PrimaryKey.PrimaryKey, E, R>(ref: RefHashRing<A, E, R>, input: string) {
  return RefSubject.map(ref, (ring) => HashRing.get(ring, input))
})

/**
 * Get shard distribution across nodes.
 * @since 1.18.0
 * @category computed
 */
export const getShards: {
  (count: number): <A extends PrimaryKey.PrimaryKey, E, R>(
    ref: RefHashRing<A, E, R>
  ) => RefSubject.Computed<Array<A> | undefined, E, R>
  <A extends PrimaryKey.PrimaryKey, E, R>(
    ref: RefHashRing<A, E, R>,
    count: number
  ): RefSubject.Computed<Array<A> | undefined, E, R>
} = dual(2, function getShards<A extends PrimaryKey.PrimaryKey, E, R>(ref: RefHashRing<A, E, R>, count: number) {
  return RefSubject.map(ref, (ring) => HashRing.getShards(ring, count))
})

/**
 * Get all nodes as an array.
 * @since 1.18.0
 * @category computed
 */
export const values = <A extends PrimaryKey.PrimaryKey, E, R>(
  ref: RefHashRing<A, E, R>
): RefSubject.Computed<Array<A>, E, R> => RefSubject.map(ref, (ring) => Array.from(ring))

// ========================================
// Filtered
// ========================================

/**
 * Get the node which should handle a given input string as a Filtered.
 * Fails if the ring is empty.
 * @since 1.18.0
 * @category filtered
 */
export const get: {
  (input: string): <A extends PrimaryKey.PrimaryKey, E, R>(
    ref: RefHashRing<A, E, R>
  ) => RefSubject.Filtered<A, E, R>
  <A extends PrimaryKey.PrimaryKey, E, R>(
    ref: RefHashRing<A, E, R>,
    input: string
  ): RefSubject.Filtered<A, E, R>
} = dual(2, function get<A extends PrimaryKey.PrimaryKey, E, R>(ref: RefHashRing<A, E, R>, input: string) {
  return RefSubject.filterMap(ref, (ring) => Option.fromUndefinedOr(HashRing.get(ring, input)))
})
