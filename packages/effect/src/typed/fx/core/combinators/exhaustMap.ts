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
 * Maps each element of an Fx to a new Fx, ignoring new elements until the current inner Fx completes.
 *
 * @param f - A function that maps an element `A` to a new `Fx<B>`.
 * @returns An `Fx` that emits values from the active inner stream.
 * @since 1.0.0
 * @category combinators
 */
export const exhaustMap: FlatMapLike = dual(2, <A, E, R, B, E2, R2>(
  self: Fx<A, E, R>,
  f: (a: A) => Fx<B, E2, R2>
): Fx<B, E | E2, R | R2 | Scope.Scope> =>
  make<B, E | E2, R | R2 | Scope.Scope>(Effect.fn(function*(sink) {
    const handle = yield* FiberHandle.make<void, never>()
    yield* self.run(makeSink(
      sink.onFailure,
      (a) => FiberHandle.run(handle, f(a).run(sink), { onlyIfMissing: true })
    ))
    yield* FiberHandle.awaitEmpty(handle)
  }, extendScope)))
