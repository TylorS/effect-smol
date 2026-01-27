/**
 * Extensions to RefSubject for working with string values
 * @since 1.18.0
 */

import * as String_ from "../../../String.ts"
import type * as Effect from "../../../Effect.ts"
import * as Equivalence_ from "../../../Equivalence.ts"
import type { Equivalence } from "../../../Equivalence.ts"
import { dual } from "../../../Function.ts"
import type * as Scope from "../../../Scope.ts"
import type * as Fx from "../Fx/Fx.ts"
import * as RefSubject from "./RefSubject.ts"

const isRefStringDataFirst = (args: IArguments) =>
  RefSubject.isRefSubject(args[0])

/**
 * A RefString is a RefSubject specialized over a string value.
 * @since 1.18.0
 * @category models
 */
export interface RefString<in out E = never, out R = never>
  extends RefSubject.RefSubject<string, E, R> { }

/**
 * Creates a new `RefString` from a string, `Effect`, or `Fx`.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import * as RefString from "effect/typed/fx/RefSubject/RefString"
 *
 * const program = Effect.gen(function* () {
 *   const value = yield* RefString.make("hello")
 *   const current = yield* value
 *   console.log(current) // "hello"
 * })
 * ```
 *
 * @since 1.18.0
 * @category constructors
 */
export function make<E = never, R = never>(
  initial: string | Effect.Effect<string, E, R> | Fx.Fx<string, E, R>,
  eq: Equivalence<string> = Equivalence_.strictEqual()
): Effect.Effect<RefString<E>, never, R | Scope.Scope> {
  return RefSubject.make(initial, { eq })
}

// ========================================
// Computed
// ========================================

/**
 * Concatenate a string to the current state of a RefString.
 * @since 1.18.0
 * @category computed
 */
export const concat: {
  (that: string): <E, R>(ref: RefString<E, R>) => RefSubject.Computed<string, E, R>
  <E, R>(ref: RefString<E, R>, that: string): RefSubject.Computed<string, E, R>
} = dual(2, function concat<E, R>(ref: RefString<E, R>, that: string) {
  return RefSubject.map(ref, (self) => String_.concat(self, that))
})

/**
 * Convert the current state of a RefString to uppercase.
 * @since 1.18.0
 * @category computed
 */
export const toUpperCase = <E, R>(ref: RefString<E, R>): RefSubject.Computed<string, E, R> =>
  RefSubject.map(ref, String_.toUpperCase)

/**
 * Convert the current state of a RefString to lowercase.
 * @since 1.18.0
 * @category computed
 */
export const toLowerCase = <E, R>(ref: RefString<E, R>): RefSubject.Computed<string, E, R> =>
  RefSubject.map(ref, String_.toLowerCase)

/**
 * Trim whitespace from both ends of the current state of a RefString.
 * @since 1.18.0
 * @category computed
 */
export const trim = <E, R>(ref: RefString<E, R>): RefSubject.Computed<string, E, R> =>
  RefSubject.map(ref, String_.trim)

/**
 * Trim whitespace from the start of the current state of a RefString.
 * @since 1.18.0
 * @category computed
 */
export const trimStart = <E, R>(ref: RefString<E, R>): RefSubject.Computed<string, E, R> =>
  RefSubject.map(ref, String_.trimStart)

/**
 * Trim whitespace from the end of the current state of a RefString.
 * @since 1.18.0
 * @category computed
 */
export const trimEnd = <E, R>(ref: RefString<E, R>): RefSubject.Computed<string, E, R> =>
  RefSubject.map(ref, String_.trimEnd)

/**
 * Replace the first occurrence of a substring or pattern in the current state of a RefString.
 * @since 1.18.0
 * @category computed
 */
export const replace: {
  (
    searchValue: string | RegExp,
    replaceValue: string
  ): <E, R>(ref: RefString<E, R>) => RefSubject.Computed<string, E, R>
  <E, R>(
    ref: RefString<E, R>,
    searchValue: string | RegExp,
    replaceValue: string
  ): RefSubject.Computed<string, E, R>
} = dual(3, function replace<E, R>(ref: RefString<E, R>, searchValue: string | RegExp, replaceValue: string) {
  return RefSubject.map(ref, String_.replace(searchValue, replaceValue))
})

/**
 * Replace all occurrences of a substring or pattern in the current state of a RefString.
 * @since 1.18.0
 * @category computed
 */
export const replaceAll: {
  (
    searchValue: string | RegExp,
    replaceValue: string
  ): <E, R>(ref: RefString<E, R>) => RefSubject.Computed<string, E, R>
  <E, R>(
    ref: RefString<E, R>,
    searchValue: string | RegExp,
    replaceValue: string
  ): RefSubject.Computed<string, E, R>
} = dual(3, function replaceAll<E, R>(ref: RefString<E, R>, searchValue: string | RegExp, replaceValue: string) {
  return RefSubject.map(ref, String_.replaceAll(searchValue, replaceValue))
})

/**
 * Check if the current state of a RefString is empty.
 * @since 1.18.0
 * @category computed
 */
export const isEmpty = <E, R>(ref: RefString<E, R>): RefSubject.Computed<boolean, E, R> =>
  RefSubject.map(ref, String_.isEmpty)

/**
 * Check if the current state of a RefString is non-empty.
 * @since 1.18.0
 * @category computed
 */
export const isNonEmpty = <E, R>(ref: RefString<E, R>): RefSubject.Computed<boolean, E, R> =>
  RefSubject.map(ref, String_.isNonEmpty)

/**
 * Get the length of the current state of a RefString.
 * @since 1.18.0
 * @category computed
 */
export const length = <E, R>(ref: RefString<E, R>): RefSubject.Computed<number, E, R> =>
  RefSubject.map(ref, String_.length)

/**
 * Check if the current state of a RefString starts with a substring.
 * @since 1.18.0
 * @category computed
 */
export const startsWith: {
  (searchString: string, position?: number): <E, R>(ref: RefString<E, R>) => RefSubject.Computed<boolean, E, R>
  <E, R>(ref: RefString<E, R>, searchString: string, position?: number): RefSubject.Computed<boolean, E, R>
} = dual(
  isRefStringDataFirst,
  function startsWith<E, R>(ref: RefString<E, R>, searchString: string, position?: number) {
    return RefSubject.map(ref, String_.startsWith(searchString, position))
  }
)

/**
 * Check if the current state of a RefString ends with a substring.
 * @since 1.18.0
 * @category computed
 */
export const endsWith: {
  (searchString: string, position?: number): <E, R>(ref: RefString<E, R>) => RefSubject.Computed<boolean, E, R>
  <E, R>(ref: RefString<E, R>, searchString: string, position?: number): RefSubject.Computed<boolean, E, R>
} = dual(
  isRefStringDataFirst,
  function endsWith<E, R>(ref: RefString<E, R>, searchString: string, position?: number) {
    return RefSubject.map(ref, String_.endsWith(searchString, position))
  }
)

/**
 * Check if the current state of a RefString includes a substring.
 * @since 1.18.0
 * @category computed
 */
export const includes: {
  (searchString: string, position?: number): <E, R>(ref: RefString<E, R>) => RefSubject.Computed<boolean, E, R>
  <E, R>(ref: RefString<E, R>, searchString: string, position?: number): RefSubject.Computed<boolean, E, R>
} = dual(
  isRefStringDataFirst,
  function includes<E, R>(ref: RefString<E, R>, searchString: string, position?: number) {
    return RefSubject.map(ref, String_.includes(searchString, position))
  }
)

/**
 * Extract a section of the current state of a RefString.
 * @since 1.18.0
 * @category computed
 */
export const slice: {
  (start?: number, end?: number): <E, R>(ref: RefString<E, R>) => RefSubject.Computed<string, E, R>
  <E, R>(ref: RefString<E, R>, start?: number, end?: number): RefSubject.Computed<string, E, R>
} = dual(
  isRefStringDataFirst,
  function slice<E, R>(ref: RefString<E, R>, start?: number, end?: number) {
    return RefSubject.map(ref, String_.slice(start, end))
  }
)
