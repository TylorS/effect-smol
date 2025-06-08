import { assert, describe, it } from "@effect/vitest"
import { Effect, FiberHandle } from 'effect'

describe("FiberHandle", () => {
  it.live("drop", Effect.fnUntraced(function* () {
    const handle = yield* FiberHandle.make<void>()
    const run = yield* handle.pipe(FiberHandle.run("drop"))

    const values: number[] = []

    yield* Effect.all([
      run(Effect.sync(() => {
        values.push(1)
      })),
      run(Effect.sync(() => {
        values.push(2)
      }))
    ], { concurrency: "unbounded" })

    yield* FiberHandle.await(handle)

    assert.deepStrictEqual(values, [2])
  }, Effect.scoped))

  it.live("slide", Effect.fnUntraced(function* () {
    const handle = yield* FiberHandle.make<void>()
    const run = yield* handle.pipe(FiberHandle.run("slide"))

    const values: number[] = []

    yield* Effect.all([
      run(Effect.sync(() => {
        values.push(1)
      })),
      run(Effect.sync(() => {
        values.push(2)
      }))
    ], { concurrency: "unbounded" })

    yield* FiberHandle.await(handle)

    assert.deepStrictEqual(values, [1])
  }, Effect.scoped))

  it.live("slide-buffer", Effect.fnUntraced(function* () {
    const handle = yield* FiberHandle.make<void>()
    const run = yield* handle.pipe(FiberHandle.run("slide-buffer"))

    const values: number[] = []

    yield* Effect.all([
      run(Effect.sync(() => {
        values.push(1)
      })),
      run(Effect.sync(() => {
        values.push(2)
      })),
      run(Effect.sync(() => {
        values.push(3)
      }))
    ], { concurrency: "unbounded" })

    yield* FiberHandle.await(handle)

    assert.deepStrictEqual(values, [1, 3])
  }, Effect.scoped))
})
