import * as Effect from "effect/Effect"
import * as FiberHandle from "effect/FiberHandle"
import { dual } from "effect/Function"
import type * as Scope from "effect/Scope"
import { make as makeSink } from "../../Sink/Sink.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"
import { extendScope } from "../internal/scope.ts"
import type { FlatMapLike } from "./flatMap.ts"

/**
 * Maps each element of an Fx to a new Fx, and switches to the latest inner Fx.
 *
 * When a new element is emitted, the previous inner Fx is cancelled.
 *
 * @param f - A function that maps an element `A` to a new `Fx<B>`.
 * @returns An `Fx` that emits values from the latest inner stream.
 * @since 1.0.0
 * @category combinators
 */
export const switchMap: FlatMapLike = dual(2, <A, E, R, B, E2, R2>(
  self: Fx<A, E, R>,
  f: (a: A) => Fx<B, E2, R2>
): Fx<B, E | E2, R | R2 | Scope.Scope> =>
  make<B, E | E2, R | R2 | Scope.Scope>(Effect.fn(function*(sink) {
    const handle = yield* FiberHandle.make<void, never>()
    yield* self.run(makeSink(
      sink.onFailure,
      (a) => FiberHandle.run(handle, f(a).run(sink))
    ))
    yield* FiberHandle.awaitEmpty(handle)
  }, extendScope)))
