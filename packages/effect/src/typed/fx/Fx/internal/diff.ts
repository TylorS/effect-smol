import type * as Equivalence from "../../../../data/Equivalence.ts"
import { identity } from "../../../../Function.ts"
import * as Equal from "../../../../interfaces/Equal.ts"

export type DiffResult<A, B> = ReadonlyArray<Diff<A, B>>

export type Diff<A, B> = Add<A, B> | Remove<A, B> | Update<A, B> | Moved<A, B>

export interface Add<A, B> {
  readonly _tag: "Add"
  readonly index: number
  readonly value: A
  readonly key: B
}

export const add = <A, B>(value: A, index: number, key: B): Add<A, B> => ({ _tag: "Add", index, value, key })

export interface Remove<A, B> {
  readonly _tag: "Remove"
  readonly index: number
  readonly value: A
  readonly key: B
}

export const remove = <A, B>(value: A, index: number, key: B): Remove<A, B> => ({ _tag: "Remove", index, value, key })

export interface Update<A, B> {
  readonly _tag: "Update"
  readonly index: number
  readonly value: A
  readonly key: B
}

export const update = <A, B>(value: A, index: number, key: B): Update<A, B> => ({ _tag: "Update", index, value, key })

export interface Moved<A, B> {
  readonly _tag: "Moved"
  readonly index: number
  readonly to: number
  readonly value: A
  readonly key: B
}

export const moved = <A, B>(value: A, from: number, to: number, key: B): Moved<A, B> => ({
  _tag: "Moved",
  index: from,
  to,
  value,
  key
})

export type DiffOptions<A, B extends PropertyKey> = {
  readonly getKey: (a: A) => B
  readonly eq?: Equivalence.Equivalence<A>
  readonly previousKeyMap?: Map<PropertyKey, number> | undefined
  readonly keyMap?: Map<PropertyKey, number> | undefined
}

export function diff<A extends PropertyKey>(
  oldValue: ReadonlyArray<A>,
  newValue: ReadonlyArray<A>,
  options?: Omit<DiffOptions<A, A>, "getKey">
): DiffResult<A, A>

export function diff<A, B extends PropertyKey>(
  oldValue: ReadonlyArray<A>,
  newValue: ReadonlyArray<A>,
  options: DiffOptions<A, B>
): DiffResult<A, B>

export function diff<A, B extends PropertyKey>(
  a: ReadonlyArray<A>,
  b: ReadonlyArray<A>,
  options: Partial<DiffOptions<A, B>> = {}
): DiffResult<A, B> {
  const getKey = options.getKey ?? identity as NonNullable<typeof options.getKey>

  // Fast-path for empty arrays.
  if (a.length === 0) return b.map((value, i) => add(value, i, getKey(value)))
  if (b.length === 0) return a.map((value, i) => remove(value, i, getKey(value)))

  const eq = options.eq ?? Equal.equals
  const diff: Array<Diff<A, B>> = []
  const oldKeyMap = options.previousKeyMap ?? getKeyMap(a, getKey)
  const keyMap = options.keyMap ?? getKeyMap(b, getKey)

  for (let i = 0; i < a.length; ++i) {
    const aValue = a[i]
    const key = getKey(aValue)
    const bIndex = keyMap.get(key)
    if (bIndex === undefined) {
      diff.push(remove(aValue, i, key))
    }
  }

  for (let i = 0; i < b.length; ++i) {
    const bValue = b[i]
    const key = getKey(bValue)
    const aIndex = oldKeyMap.get(key)
    if (aIndex === undefined) {
      diff.push(add(bValue, i, key))
    } else {
      if (aIndex !== i) {
        diff.push(moved(bValue, aIndex, i, key))
      } else if (!eq(a[aIndex], bValue)) {
        diff.push(update(bValue, i, key))
      }
    }
  }

  return diff.sort(sortDiff)
}

export function diffIterator<A extends PropertyKey>(
  oldValue: ReadonlyArray<A>,
  newValue: ReadonlyArray<A>,
  options?: Omit<DiffOptions<A, A>, "getKey">
): Generator<Diff<A, A>>

export function diffIterator<A, B extends PropertyKey>(
  oldValue: ReadonlyArray<A>,
  newValue: ReadonlyArray<A>,
  options: DiffOptions<A, B>
): Generator<Diff<A, B>>

export function* diffIterator<A, B extends PropertyKey>(
  a: ReadonlyArray<A>,
  b: ReadonlyArray<A>,
  options: Partial<DiffOptions<A, B>> = {}
): Generator<Diff<A, B>> {
  const { eq = Object.is, getKey = identity as any } = options
  const oldKeyMap = options.previousKeyMap ?? getKeyMap(a, getKey)
  const keyMap = options.keyMap ?? getKeyMap(b, getKey)

  for (let i = 0; i < a.length; ++i) {
    const aValue = a[i]
    const key = getKey(aValue)
    const bIndex = keyMap.get(key)
    if (bIndex === undefined) {
      yield remove(aValue, i, key)
    }
  }

  for (let i = 0; i < b.length; ++i) {
    const bValue = b[i]
    const key = getKey(bValue)
    const aIndex = oldKeyMap.get(key)
    if (aIndex === undefined) {
      yield add(bValue, i, key)
    } else {
      if (aIndex !== i) {
        yield moved(bValue, aIndex, i, key)
      } else if (!eq(a[aIndex], bValue)) {
        yield update(bValue, i, key)
      }
    }
  }
}

function sortDiff<A, B>(a: Diff<A, B>, b: Diff<A, B>): number {
  if (a._tag === "Remove" && b._tag !== "Remove") return -1
  if (b._tag === "Remove") return 1
  return a.index - b.index
}

const keysMaps = new WeakMap<any, Map<PropertyKey, number>>()

export function getKeyMap<A>(a: ReadonlyArray<A>, getKey: (a: A) => PropertyKey): Map<PropertyKey, number> {
  let keyMap = keysMaps.get(a)
  if (keyMap === undefined) {
    keyMap = new Map()
    keysMaps.set(a, keyMap)
    const len = a.length
    for (let i = 0; i < len; ++i) {
      keyMap.set(getKey(a[i]), i)
    }
  }
  return keyMap
}
