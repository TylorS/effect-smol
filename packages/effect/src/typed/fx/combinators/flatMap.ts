import * as Effect from "../../../Effect.ts"
import * as FiberSet from "../../../FiberSet.ts"
import { dual } from "../../../Function.ts"
import type * as Scope from "../../../Scope.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"
import { extendScope } from "../internal/scope.ts"
import { make as makeSink } from "../sink/Sink.ts"

export type FlatMapLike<Args extends ReadonlyArray<any> = []> = {
  <A, B, E2, R2>(
    f: (a: A) => Fx<B, E2, R2>,
    ...args: Args
  ): <E, R>(self: Fx<A, E, R>) => Fx<B, E | E2, R | R2 | Scope.Scope>

  <A, E, R, B, E2, R2>(
    self: Fx<A, E, R>,
    f: (a: A) => Fx<B, E2, R2>,
    ...args: Args
  ): Fx<B, E | E2, R | R2 | Scope.Scope>
}

export const flatMap: FlatMapLike = dual(2, <A, E, R, B, E2, R2>(
  self: Fx<A, E, R>,
  f: (a: A) => Fx<B, E2, R2>
): Fx<B, E | E2, R | R2 | Scope.Scope> =>
  make<B, E | E2, R | R2 | Scope.Scope>(Effect.fn(function*(sink) {
    const set = yield* FiberSet.make<void, never>()
    yield* self.run(makeSink(
      sink.onFailure,
      (a) => FiberSet.run(set, f(a).run(sink))
    ))
    yield* FiberSet.awaitEmpty(set)
  }, extendScope)))
