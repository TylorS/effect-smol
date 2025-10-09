import type { Scope } from "effect"
import * as Effect from "effect/Effect"
import * as FiberHandle from "effect/FiberHandle"
import { dual } from "effect/Function"
import { extendScope } from "../../internal/scope.ts"
import { make as makeSink } from "../../sink/Sink.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"
import type { FlatMapLike } from "./flatMap.ts"

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
