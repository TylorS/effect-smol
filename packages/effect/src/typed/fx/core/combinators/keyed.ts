import * as Option from "effect/data/Option"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import { dual, identity } from "effect/Function"
import { pipeArguments } from "effect/interfaces/Pipeable"
import { MaxOpsBeforeYield } from "effect/Scheduler"
import * as Scope from "effect/Scope"
import * as ServiceMap from "effect/ServiceMap"
import * as SynchronizedRef from "effect/SynchronizedRef"
import * as RefSubject from "../../RefSubject/RefSubject.ts"
import * as Sink from "../../Sink/Sink.ts"
import { type Fx } from "../Fx.ts"
import type { Add, Moved, Remove, Update } from "../internal/diff.ts"
import { diffIterator, getKeyMap } from "../internal/diff.ts"
import { withScopedFork } from "../internal/scope.ts"
import { FxTypeId } from "../TypeId.ts"

export interface KeyedOptions<A, B, C, E2, R2> {
  readonly getKey: (a: A) => B
  readonly onValue: (ref: RefSubject.RefSubject<A>, key: B) => Fx<C, E2, R2>
  readonly debounce?: Duration.DurationInput
}

export const keyed: {
  <A, B extends PropertyKey, C, E2, R2>(
    options: KeyedOptions<A, B, C, E2, R2>
  ): <E, R>(fx: Fx<ReadonlyArray<A>, E, R>) => Fx<ReadonlyArray<C>, E | E2, R | R2 | Scope.Scope>
  <A, E, R>(
    fx: Fx<ReadonlyArray<A>, E, R>,
    options: KeyedOptions<A, PropertyKey, A, E, R>
  ): Fx<ReadonlyArray<A>, E, R>
} = dual(2, function keyed<A, E, R, B extends PropertyKey, C, E2, R2>(
  fx: Fx<ReadonlyArray<A>, E, R>,
  options: KeyedOptions<A, B, C, E2, R2>
): Fx<ReadonlyArray<C>, E | E2, R | R2 | Scope.Scope> {
  return new Keyed(fx, options)
})

type StateContext<A, C> = {
  entry: KeyedEntry<A, C>
  output: C
}

const StateContext = ServiceMap.Service<StateContext<any, any>>("@services/StateContext")

const VARIANCE: Fx.Variance<any, any, any> = {
  _A: identity,
  _E: identity,
  _R: identity
}

class Keyed<A, E, R, B extends PropertyKey, C, E2, R2> implements Fx<ReadonlyArray<C>, E | E2, R | R2 | Scope.Scope> {
  readonly [FxTypeId]: Fx.Variance<ReadonlyArray<C>, E | E2, R | R2 | Scope.Scope> = VARIANCE
  readonly fx: Fx<ReadonlyArray<A>, E, R>
  readonly options: KeyedOptions<A, B, C, E2, R2>

  constructor(
    fx: Fx<ReadonlyArray<A>, E, R>,
    options: KeyedOptions<A, B, C, E2, R2>
  ) {
    this.fx = fx
    this.options = options
  }

  run<R3>(sink: Sink.Sink<ReadonlyArray<C>, E | E2, R3>) {
    return Effect.withFiber((fiber) => runKeyed(this.fx, this.options, sink, fiber.id)).pipe(
      Effect.provideService(MaxOpsBeforeYield, Infinity)
    )
  }

  pipe(this: Keyed<A, E, R, B, C, E2, R2>) {
    return pipeArguments(this, arguments)
  }
}

interface KeyedState<A, B extends PropertyKey, C> {
  readonly entries: Map<B, KeyedEntry<A, C>>
  readonly indices: Map<number, B>
  previousValues: ReadonlyArray<A>
}

function emptyKeyedState<A, B extends PropertyKey, C>(): KeyedState<A, B, C> {
  return {
    entries: new Map(),
    indices: new Map(),
    previousValues: []
  }
}

function runKeyed<A, E, R, B extends PropertyKey, C, E2, R2, R3>(
  fx: Fx<ReadonlyArray<A>, E, R>,
  options: KeyedOptions<A, B, C, E2, R2>,
  sink: Sink.Sink<ReadonlyArray<C>, E | E2, R3>,
  id: number
): Effect.Effect<unknown, never, Scope.Scope | R | R2 | R3> {
  return withDebounceFork(
    (forkEmit, parentScope) => {
      const state = emptyKeyedState<A, B, C>()

      let previousKeyMap: Map<PropertyKey, number> = new Map()

      const emit = Effect.suspend(() => sink.onSuccess(getReadyIndices(state)))
      const scheduleNextEmit = forkEmit(emit)

      function diffAndPatch(values: ReadonlyArray<A>) {
        return Effect.gen(function*() {
          const previous = state.previousValues
          state.previousValues = values

          let added = false
          let scheduled = false
          let done = false

          const keyMap = getKeyMap(values, options.getKey)

          // Collect patches to enable intelligent reuse
          const removes: Array<Remove<A, B>> = []
          const adds: Array<Add<A, B>> = []
          const updates: Array<Update<A, B> | Moved<A, B>> = []

          for (
            const patch of diffIterator<A, B>(previous, values, { getKey: options.getKey, previousKeyMap, keyMap })
          ) {
            if (patch._tag === "Remove") {
              removes.push(patch)
            } else if (patch._tag === "Add") {
              adds.push(patch)
              added = true
            } else {
              updates.push(patch)
            }
          }

          // Match removes with adds to reuse entries
          const reusableEntries: Array<{ entry: KeyedEntry<A, C>; removeKey: B }> = Array.from(
            removes,
            (remove) => ({ entry: state.entries.get(remove.key)!, removeKey: remove.key })
          )
          const reusedEntries = new Set<KeyedEntry<A, C>>()

          // Process adds: reuse entries when possible, create new ones otherwise
          let reusableIndex = 0
          for (const add of adds) {
            // Reuse an existing entry
            if (reusableIndex < reusableEntries.length) {
              const { entry: reusableEntry, removeKey } = reusableEntries[reusableIndex++]
              reusedEntries.add(reusableEntry)
              yield* reuseEntryForAdd(
                state,
                values,
                add,
                reusableEntry,
                removeKey
              )
            } else { // Create a new entry
              yield* addValue(
                state,
                values,
                add,
                id,
                parentScope,
                options,
                sink,
                Effect.suspend(() => {
                  if (done === false) {
                    scheduled = true
                    return Effect.void
                  }
                  return scheduleNextEmit
                })
              )
            }
          }

          // Process updates
          for (const update of updates) {
            yield* updateValue(state, values, update)
          }

          // Remove entries that weren't reused
          for (let i = reusedEntries.size; i < removes.length; i++) {
            const remove = removes[i]
            const entry = state.entries.get(remove.key)
            if (entry !== undefined && !reusedEntries.has(entry)) {
              yield* removeValue(state, remove)
            }
          }

          done = true
          previousKeyMap = keyMap

          // Always emit if items were added (they may produce output asynchronously)
          // or if nothing was added (to emit current state)
          if (added || scheduled) {
            yield* scheduleNextEmit
          }
        })
      }

      return fx.run(
        Sink.make<ReadonlyArray<A>, E | E2, R2 | R3 | Scope.Scope>(
          (cause) => sink.onFailure(cause),
          // Use exhaust to ensure only 1 diff is running at a time
          // Skipping an intermediate changes that occur while diffing
          (values) => diffAndPatch(values)
        )
      )
    },
    options.debounce || 1
  )
}

class KeyedEntry<A, C> {
  public value: A
  public index: number
  public output: Option.Option<C>
  public readonly ref: RefSubject.RefSubject<A>
  public readonly interrupt: Effect.Effect<void>

  constructor(
    value: A,
    index: number,
    output: Option.Option<C>,
    ref: RefSubject.RefSubject<A>,
    interrupt: Effect.Effect<void>
  ) {
    this.value = value
    this.index = index
    this.output = output
    this.ref = ref
    this.interrupt = interrupt
  }
}

function getReadyIndices<A, B extends PropertyKey, C>(
  { entries, indices, previousValues }: KeyedState<A, B, C>
): ReadonlyArray<C> {
  const output: Array<C> = []

  for (let i = 0; i < previousValues.length; ++i) {
    const key = indices.get(i)

    if (key === undefined) break

    const entry = entries.get(key)!
    if (Option.isSome(entry.output)) {
      output.push(entry.output.value)
    } else {
      break
    }
  }

  return output
}

function reuseEntryForAdd<A, B extends PropertyKey, C>(
  { entries, indices }: KeyedState<A, B, C>,
  values: ReadonlyArray<A>,
  patch: Add<A, B>,
  reusableEntry: KeyedEntry<A, C>,
  oldKey: B
) {
  return Effect.gen(function*() {
    const value = values[patch.index]

    // Update entry with new value and index
    reusableEntry.value = value
    reusableEntry.index = patch.index
    reusableEntry.output = Option.none()

    // Update the ref with new value
    yield* RefSubject.set(reusableEntry.ref, value)

    if (oldKey !== patch.key) {
      entries.delete(oldKey)
      entries.set(patch.key, reusableEntry)
    }
    // Clean up old index mapping
    for (const [index, key] of indices.entries()) {
      if (key === oldKey) {
        indices.delete(index)
        break
      }
    }
    indices.set(patch.index, patch.key)
  })
}

function addValue<A, B extends PropertyKey, C, R2, E2, E, R3, D>(
  { entries, indices }: KeyedState<A, B, C>,
  values: ReadonlyArray<A>,
  patch: Add<A, B>,
  id: number,
  parentScope: Scope.Scope,
  options: KeyedOptions<A, B, C, E2, R2>,
  sink: Sink.Sink<ReadonlyArray<C>, E | E2, R2 | R3>,
  scheduleNextEmit: Effect.Effect<D, never, R3>
) {
  return Effect.gen(function*() {
    const value = values[patch.index]
    const childScope = yield* Scope.fork(parentScope, "sequential")
    const ref = yield* RefSubject.make(Effect.succeed(value)).pipe(
      Effect.provideService(Scope.Scope, childScope)
    )

    const entry: KeyedEntry<A, C> = new KeyedEntry<A, C>(
      value,
      patch.index,
      Option.none(),
      ref,
      Scope.close(childScope, Exit.interrupt(id))
    )

    entries.set(patch.key, entry)
    indices.set(patch.index, patch.key)

    yield* Effect.forkIn(
      options.onValue(ref, patch.key).run(Sink.make(
        (cause) => sink.onFailure(cause),
        (output) => {
          entry.output = Option.some(output)

          return scheduleNextEmit
        }
      )),
      parentScope
    )
  })
}

function removeValue<A, B extends PropertyKey, C>({ entries, indices }: KeyedState<A, B, C>, patch: Remove<A, B>) {
  const interrupt = entries.get(patch.key)!.interrupt
  entries.delete(patch.key)
  indices.delete(patch.index)
  return interrupt
}

function updateValue<A, B extends PropertyKey, C>(
  { entries, indices }: KeyedState<A, B, C>,
  values: ReadonlyArray<A>,
  patch: Update<A, B> | Moved<A, B>
) {
  const key = patch.key
  const entry = entries.get(key)!

  if (patch._tag === "Moved") {
    const currentKey = indices.get(patch.index)
    if (currentKey === key) {
      indices.delete(patch.index)
    }
    indices.set(patch.to, key)
    entry.value = values[entry.index = patch.to]
  } else {
    entry.value = values[entry.index = patch.index]
  }

  return RefSubject.set(entry.ref, entry.value)
}

function withDebounceFork<A, E, R>(
  f: (
    fork: <R>(effect: Effect.Effect<A, never, R>) => Effect.Effect<void, never, R>,
    scope: Scope.Scope
  ) => Effect.Effect<A, E, R>,
  duration: Duration.DurationInput
): Effect.Effect<unknown, E, R | Scope.Scope> {
  return withScopedFork(
    (fork, scope) =>
      Effect.flatMap(
        SynchronizedRef.make(Option.none<Fiber.Fiber<unknown>>()),
        (ref) =>
          Effect.flatMap(
            f(
              (effect) =>
                SynchronizedRef.updateEffect(
                  ref,
                  Option.match({
                    onNone: () => Effect.asSome(fork(Effect.delay(effect, duration))),
                    onSome: (fiber) =>
                      Fiber.interrupt(fiber).pipe(
                        Effect.flatMap(() => fork(Effect.delay(effect, duration))),
                        Effect.asSome
                      )
                  })
                ),
              scope
            ),
            () =>
              SynchronizedRef.updateEffect(
                ref,
                Option.match({
                  onNone: () => Effect.succeedNone,
                  onSome: (fiber) => Fiber.join(fiber).pipe(Effect.as(Option.none()))
                })
              )
          )
      ),
    "sequential"
  )
}
