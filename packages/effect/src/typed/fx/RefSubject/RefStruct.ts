/**
 * Extensions to RefSubject for working with struct values
 * @since 1.18.0
 */

import * as Struct from "../../../Struct.ts"
import type * as Effect from "../../../Effect.ts"
import { equals } from "../../../Equal.ts"
import * as Equivalence_ from "../../../Equivalence.ts"
import type { Equivalence } from "../../../Equivalence.ts"
import { dual } from "../../../Function.ts"
import type * as Scope from "../../../Scope.ts"
import type * as Fx from "../Fx/Fx.ts"
import * as RefSubject from "./RefSubject.ts"

/**
 * A RefStruct is a RefSubject specialized over a struct value.
 * @since 1.18.0
 * @category models
 */
export interface RefStruct<in out S extends object, in out E = never, out R = never>
  extends RefSubject.RefSubject<S, E, R> { }

/**
 * Creates a new `RefStruct` from a struct, `Effect`, or `Fx`.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import * as RefStruct from "effect/typed/fx/RefSubject/RefStruct"
 *
 * const program = Effect.gen(function* () {
 *   const value = yield* RefStruct.make({ name: "John", age: 30 })
 *   const current = yield* value
 *   console.log(current) // { name: "John", age: 30 }
 * })
 * ```
 *
 * @since 1.18.0
 * @category constructors
 */
export function make<S extends object, E = never, R = never>(
  initial: S | Effect.Effect<S, E, R> | Fx.Fx<S, E, R>,
  eq: Equivalence<S> = Equivalence_.make((a, b) => equals(a, b))
): Effect.Effect<RefStruct<S, E>, never, R | Scope.Scope> {
  return RefSubject.make(initial, { eq })
}

/**
 * Set a property value in the current state of a RefStruct.
 * @since 1.18.0
 * @category combinators
 */
export const set: {
  <S extends object, K extends keyof S>(
    key: K,
    value: S[K]
  ): <E, R>(ref: RefStruct<S, E, R>) => Effect.Effect<S, E, R>
  <S extends object, K extends keyof S, E, R>(
    ref: RefStruct<S, E, R>,
    key: K,
    value: S[K]
  ): Effect.Effect<S, E, R>
} = dual(3, function set<S extends object, K extends keyof S, E, R>(
  ref: RefStruct<S, E, R>,
  key: K,
  value: S[K]
) {
  return RefSubject.update(ref, (self) => Struct.assign(self, { [key]: value } as unknown as Partial<S>) as S)
})

/**
 * Update a property value in the current state of a RefStruct using a function.
 * @since 1.18.0
 * @category combinators
 */
export const update: {
  <S extends object, K extends keyof S>(
    key: K,
    f: (value: S[K]) => S[K]
  ): <E, R>(ref: RefStruct<S, E, R>) => Effect.Effect<S, E, R>
  <S extends object, K extends keyof S, E, R>(
    ref: RefStruct<S, E, R>,
    key: K,
    f: (value: S[K]) => S[K]
  ): Effect.Effect<S, E, R>
} = dual(3, function update<S extends object, K extends keyof S, E, R>(
  ref: RefStruct<S, E, R>,
  key: K,
  f: (value: S[K]) => S[K]
) {
  return RefSubject.update(ref, (self) => Struct.evolve(self, { [key]: f } as any) as S)
})

/**
 * Merge another struct into the current state of a RefStruct.
 * @since 1.18.0
 * @category combinators
 */
export const merge: {
  <O extends object>(
    that: O
  ): <S extends object, E, R>(ref: RefStruct<S, E, R>) => Effect.Effect<S, E, R>
  <S extends object, O extends object, E, R>(
    ref: RefStruct<S, E, R>,
    that: O
  ): Effect.Effect<S, E, R>
} = dual(2, function merge<S extends object, O extends object, E, R>(ref: RefStruct<S, E, R>, that: O) {
  return RefSubject.update(ref, (self) => Struct.assign(self, that) as S)
})

// ========================================
// Computed
// ========================================

/**
 * Pick properties from the current state of a RefStruct.
 * @since 1.18.0
 * @category computed
 */
export const pick: {
  <S extends object, const Keys extends ReadonlyArray<keyof S>>(
    keys: Keys
  ): <E, R>(ref: RefStruct<S, E, R>) => RefSubject.Computed<Pick<S, Keys[number]>, E, R>
  <S extends object, const Keys extends ReadonlyArray<keyof S>, E, R>(
    ref: RefStruct<S, E, R>,
    keys: Keys
  ): RefSubject.Computed<Pick<S, Keys[number]>, E, R>
} = dual(2, function pick<S extends object, const Keys extends ReadonlyArray<keyof S>, E, R>(
  ref: RefStruct<S, E, R>,
  keys: Keys
) {
  return RefSubject.map(ref, (self) => Struct.pick(self, keys))
})

/**
 * Omit properties from the current state of a RefStruct.
 * @since 1.18.0
 * @category computed
 */
export const omit: {
  <S extends object, const Keys extends ReadonlyArray<keyof S>>(
    keys: Keys
  ): <E, R>(ref: RefStruct<S, E, R>) => RefSubject.Computed<Omit<S, Keys[number]>, E, R>
  <S extends object, const Keys extends ReadonlyArray<keyof S>, E, R>(
    ref: RefStruct<S, E, R>,
    keys: Keys
  ): RefSubject.Computed<Omit<S, Keys[number]>, E, R>
} = dual(2, function omit<S extends object, const Keys extends ReadonlyArray<keyof S>, E, R>(
  ref: RefStruct<S, E, R>,
  keys: Keys
) {
  return RefSubject.map(ref, (self) => Struct.omit(self, keys))
})

/**
 * Get a property value from the current state of a RefStruct.
 * @since 1.18.0
 * @category computed
 */
export const get: {
  <S extends object, const K extends keyof S>(
    key: K
  ): <E, R>(ref: RefStruct<S, E, R>) => RefSubject.Computed<S[K], E, R>
  <S extends object, const K extends keyof S, E, R>(
    ref: RefStruct<S, E, R>,
    key: K
  ): RefSubject.Computed<S[K], E, R>
} = dual(2, function get<S extends object, const K extends keyof S, E, R>(
  ref: RefStruct<S, E, R>,
  key: K
) {
  return RefSubject.map(ref, (self) => Struct.get(self, key))
})

/**
 * Get the keys of the current state of a RefStruct.
 * @since 1.18.0
 * @category computed
 */
export const keys = <S extends object, E, R>(
  ref: RefStruct<S, E, R>
): RefSubject.Computed<Array<(keyof S) & string>, E, R> =>
  RefSubject.map(ref, Struct.keys)

/**
 * Get the values of the current state of a RefStruct.
 * @since 1.18.0
 * @category computed
 */
export const values = <S extends object, E, R>(
  ref: RefStruct<S, E, R>
): RefSubject.Computed<Array<S[keyof S]>, E, R> =>
  RefSubject.map(ref, (self) => Object.values(self) as Array<S[keyof S]>)

/**
 * Get the entries of the current state of a RefStruct.
 * @since 1.18.0
 * @category computed
 */
export const entries = <S extends object, E, R>(
  ref: RefStruct<S, E, R>
): RefSubject.Computed<Array<[keyof S, S[keyof S]]>, E, R> =>
  RefSubject.map(ref, (self) => Object.entries(self) as Array<[keyof S, S[keyof S]]>)

/**
 * Check if the current state of a RefStruct has a property.
 * @since 1.18.0
 * @category computed
 */
export const has: {
  <S extends object, const K extends keyof S>(
    key: K
  ): <E, R>(ref: RefStruct<S, E, R>) => RefSubject.Computed<boolean, E, R>
  <S extends object, const K extends keyof S, E, R>(
    ref: RefStruct<S, E, R>,
    key: K
  ): RefSubject.Computed<boolean, E, R>
} = dual(2, function has<S extends object, const K extends keyof S, E, R>(
  ref: RefStruct<S, E, R>,
  key: K
) {
  return RefSubject.map(ref, (self) => key in self)
})

/**
 * Get the size (number of properties) of the current state of a RefStruct.
 * @since 1.18.0
 * @category computed
 */
export const size = <S extends object, E, R>(ref: RefStruct<S, E, R>): RefSubject.Computed<number, E, R> =>
  RefSubject.map(ref, (self) => Object.keys(self).length)
