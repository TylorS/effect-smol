import * as Effect from "../../../../Effect.ts"
import * as FiberSet from "../../../../FiberSet.ts"
import { dual } from "../../../../Function.ts"
import type * as Scope from "../../../../Scope.ts"
import { make as makeSink } from "../../Sink/Sink.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"
import { extendScope } from "../internal/scope.ts"
import type { FlatMapLike } from "./flatMap.ts"

/**
 * Maps each element of an Fx to a new Fx, running them concurrently with a limit.
 *
 * @param f - A function that maps an element `A` to a new `Fx<B>`.
 * @param concurrency - The maximum number of concurrent inner streams.
 * @returns An `Fx` that emits values from the inner streams.
 * @since 1.0.0
 * @category combinators
 */
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
