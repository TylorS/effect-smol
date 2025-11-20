import * as Effect from "../../../Effect.ts"
import * as FiberSet from "../../../FiberSet.ts"
import { dual } from "../../../Function.ts"
import type * as Scope from "../../../Scope.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"
import { extendScope } from "../internal/scope.ts"
import { make as makeSink } from "../sink/Sink.ts"
import type { FlatMapLike } from "./flatMap.ts"

export const flatMapConcurrently: FlatMapLike<[concurrency: number]> = dual(3, <A, E, R, B, E2, R2>(
  self: Fx<A, E, R>,
  f: (a: A) => Fx<B, E2, R2>,
  concurrency: number
): Fx<B, E | E2, R | R2 | Scope.Scope> =>
  make<B, E | E2, R | R2 | Scope.Scope>(Effect.fn(function*(sink) {
    const semaphore = yield* Effect.makeSemaphore(concurrency)
    const lock = semaphore.withPermits(1)
    const set = yield* FiberSet.make<void, never>()
    yield* self.run(makeSink(
      sink.onFailure,
      (a) => FiberSet.run(set, lock(f(a).run(sink)))
    ))
    yield* FiberSet.awaitEmpty(set)
  }, extendScope)))
