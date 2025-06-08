import { assert, describe, it } from "@effect/vitest"
import { Effect, Push } from "effect"

describe("Push", () => {
  it.effect("succeed", Effect.fnUntraced(function* () {
    const push = Push.succeed(1)
    const values = yield* Push.collect(push)
    assert.deepStrictEqual(values, [1])
  }))

  it.effect("sync", Effect.fnUntraced(function* () {
    const push = Push.sync(() => 1)
    const values = yield* Push.collect(push)
    assert.deepStrictEqual(values, [1])
  }))

  it.effect("suspend", Effect.fnUntraced(function* () {
    const push = Push.suspend(() => Push.succeed(1))
    const values = yield* Push.collect(push)
    assert.deepStrictEqual(values, [1])
  }))

  it.effect("fromArray", Effect.fnUntraced(function* () {
    const push = Push.fromArray([1, 2, 3])
    const values = yield* Push.collect(push)
    assert.deepStrictEqual(values, [1, 2, 3])
  }))

  it.effect("flatMap", Effect.fnUntraced(function* () {
    const push = Push.fromArray([1, 2, 3]).pipe(Push.flatMap((a) => Push.succeed(a + 1)))
    const values = yield* Push.collect(push)
    assert.deepStrictEqual(values, [2, 3, 4])
  }))

  it.effect("flatMapConcurrently", Effect.fnUntraced(function* () {
    const push = Push.fromArray([1, 2, 3]).pipe(Push.flatMapConcurrently((a) => Push.succeed(a + 1), { concurrency: 1 }))
    const values = yield* Push.collect(push)
    assert.deepStrictEqual(values, [2, 3, 4])
  }))

  it.live("switchMap", Effect.fnUntraced(function* () {
    const push = Push.fromArray([1, 2, 3]).pipe(Push.switchMap((a) => Push.succeed(a + 1)))
    const values = yield* Push.collect(push)
    assert.deepStrictEqual(values, [4])
  }, Effect.scoped))

  it.live('exhaustMap', Effect.fnUntraced(function* () {
    const push = Push.fromArray([1, 2, 3]).pipe(Push.exhaustMap((a) => Push.succeed(a + 1)))
    const values = yield* Push.collect(push)
    assert.deepStrictEqual(values, [2])
  }, Effect.scoped))
})
