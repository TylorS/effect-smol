/**
 * Extensions to RefSubject for working with tuple values
 * @since 1.18.0
 */

import * as Tuple from "../../../Tuple.ts"
import type * as Effect from "../../../Effect.ts"
import { equals } from "../../../Equal.ts"
import * as Equivalence_ from "../../../Equivalence.ts"
import type { Equivalence } from "../../../Equivalence.ts"
import { dual } from "../../../Function.ts"
import type * as Scope from "../../../Scope.ts"
import type * as Fx from "../Fx/Fx.ts"
import * as RefSubject from "./RefSubject.ts"

/**
 * A RefTuple is a RefSubject specialized over a tuple value.
 * @since 1.18.0
 * @category models
 */
export interface RefTuple<in out T extends ReadonlyArray<unknown>, in out E = never, out R = never>
  extends RefSubject.RefSubject<T, E, R> { }

/**
 * Creates a new `RefTuple` from a tuple, `Effect`, or `Fx`.
 *
 * @example
 * ```ts
 * import { Effect, Tuple } from "effect"
 * import * as RefTuple from "effect/typed/fx/RefSubject/RefTuple"
 *
 * const program = Effect.gen(function* () {
 *   const value = yield* RefTuple.make(Tuple.make(1, "hello", true))
 *   const current = yield* value
 *   console.log(current) // [1, "hello", true]
 * })
 * ```
 *
 * @since 1.18.0
 * @category constructors
 */
export function make<T extends ReadonlyArray<unknown>, E = never, R = never>(
  initial: T | Effect.Effect<T, E, R> | Fx.Fx<T, E, R>,
  eq: Equivalence<T> = Equivalence_.make((a, b) => equals(a, b))
): Effect.Effect<RefTuple<T, E>, never, R | Scope.Scope> {
  return RefSubject.make(initial, { eq })
}

/**
 * Set the value at a specific index in the current state of a RefTuple.
 * @since 1.18.0
 * @category combinators
 */
export const setAt: {
  <T extends ReadonlyArray<unknown>, I extends number>(
    index: I,
    value: T[I]
  ): <E, R>(ref: RefTuple<T, E, R>) => Effect.Effect<T, E, R>
  <T extends ReadonlyArray<unknown>, I extends number, E, R>(
    ref: RefTuple<T, E, R>,
    index: I,
    value: T[I]
  ): Effect.Effect<T, E, R>
} = dual(3, function setAt<T extends ReadonlyArray<unknown>, I extends number, E, R>(
  ref: RefTuple<T, E, R>,
  index: I,
  value: T[I]
) {
  return RefSubject.update(ref, (self) => {
    const result = [...self] as unknown as T
    result[index] = value
    return result
  })
})

/**
 * Update the value at a specific index in the current state of a RefTuple using a function.
 * @since 1.18.0
 * @category combinators
 */
export const updateAt: {
  <T extends ReadonlyArray<unknown>, I extends number>(
    index: I,
    f: (value: T[I]) => T[I]
  ): <E, R>(ref: RefTuple<T, E, R>) => Effect.Effect<T, E, R>
  <T extends ReadonlyArray<unknown>, I extends number, E, R>(
    ref: RefTuple<T, E, R>,
    index: I,
    f: (value: T[I]) => T[I]
  ): Effect.Effect<T, E, R>
} = dual(3, function updateAt<T extends ReadonlyArray<unknown>, I extends number, E, R>(
  ref: RefTuple<T, E, R>,
  index: I,
  f: (value: T[I]) => T[I]
) {
  return RefSubject.update(ref, (self) => Tuple.evolve(self, { [index]: f } as any) as T)
})

// ========================================
// Computed
// ========================================

/**
 * Append an element to the end of the current state of a RefTuple.
 * @since 1.18.0
 * @category computed
 */
export const appendElement: {
  <E>(
    element: E
  ): <T extends ReadonlyArray<unknown>, Err, R>(ref: RefTuple<T, Err, R>) => RefSubject.Computed<[...T, E], Err, R>
  <T extends ReadonlyArray<unknown>, E, Err, R>(
    ref: RefTuple<T, Err, R>,
    element: E
  ): RefSubject.Computed<[...T, E], Err, R>
} = dual(2, function appendElement<T extends ReadonlyArray<unknown>, E, Err, R>(
  ref: RefTuple<T, Err, R>,
  element: E
) {
  return RefSubject.map(ref, (self) => Tuple.appendElement(self, element))
})

/**
 * Prepend an element to the beginning of the current state of a RefTuple.
 * @since 1.18.0
 * @category computed
 */
export const prependElement: {
  <E>(
    element: E
  ): <T extends ReadonlyArray<unknown>, Err, R>(ref: RefTuple<T, Err, R>) => RefSubject.Computed<[E, ...T], Err, R>
  <T extends ReadonlyArray<unknown>, E, Err, R>(
    ref: RefTuple<T, Err, R>,
    element: E
  ): RefSubject.Computed<[E, ...T], Err, R>
} = dual(2, function prependElement<T extends ReadonlyArray<unknown>, E, Err, R>(
  ref: RefTuple<T, Err, R>,
  element: E
) {
  return RefSubject.map(ref, (self) => [element, ...self] as [E, ...T])
})

/**
 * Get the element at a specific index from the current state of a RefTuple.
 * @since 1.18.0
 * @category computed
 */
type Indices<T extends ReadonlyArray<unknown>> = Exclude<Partial<T>["length"], T["length"]>

export const get: {
  <T extends ReadonlyArray<unknown>, I extends Indices<T> & keyof T>(
    index: I
  ): <E, R>(ref: RefTuple<T, E, R>) => RefSubject.Computed<T[I], E, R>
  <T extends ReadonlyArray<unknown>, I extends Indices<T> & keyof T, E, R>(
    ref: RefTuple<T, E, R>,
    index: I
  ): RefSubject.Computed<T[I], E, R>
} = dual(2, function get<T extends ReadonlyArray<unknown>, I extends Indices<T> & keyof T, E, R>(
  ref: RefTuple<T, E, R>,
  index: I
) {
  return RefSubject.map(ref, (self) => Tuple.get(self, index))
})

/**
 * Get the length of the current state of a RefTuple.
 * @since 1.18.0
 * @category computed
 */
export const length = <T extends ReadonlyArray<unknown>, E, R>(
  ref: RefTuple<T, E, R>
): RefSubject.Computed<number, E, R> => RefSubject.map(ref, (self) => self.length)

/**
 * Pick elements at specific indices from the current state of a RefTuple.
 * @since 1.18.0
 * @category computed
 */
export const pick: {
  <T extends ReadonlyArray<unknown>, const I extends ReadonlyArray<Indices<T>>>(
    indices: I
  ): <E, R>(ref: RefTuple<T, E, R>) => RefSubject.Computed<Array<T[number]>, E, R>
  <T extends ReadonlyArray<unknown>, const I extends ReadonlyArray<Indices<T>>, E, R>(
    ref: RefTuple<T, E, R>,
    indices: I
  ): RefSubject.Computed<Array<T[number]>, E, R>
} = dual(2, function pick<T extends ReadonlyArray<unknown>, const I extends ReadonlyArray<Indices<T>>, E, R>(
  ref: RefTuple<T, E, R>,
  indices: I
) {
  return RefSubject.map(ref, (self) => Tuple.pick(self, indices))
})

/**
 * Omit elements at specific indices from the current state of a RefTuple.
 * @since 1.18.0
 * @category computed
 */
export const omit: {
  <T extends ReadonlyArray<unknown>, const I extends ReadonlyArray<Indices<T>>>(
    indices: I
  ): <E, R>(ref: RefTuple<T, E, R>) => RefSubject.Computed<Array<T[number]>, E, R>
  <T extends ReadonlyArray<unknown>, const I extends ReadonlyArray<Indices<T>>, E, R>(
    ref: RefTuple<T, E, R>,
    indices: I
  ): RefSubject.Computed<Array<T[number]>, E, R>
} = dual(2, function omit<T extends ReadonlyArray<unknown>, const I extends ReadonlyArray<Indices<T>>, E, R>(
  ref: RefTuple<T, E, R>,
  indices: I
) {
  return RefSubject.map(ref, (self) => Tuple.omit(self, indices))
})
