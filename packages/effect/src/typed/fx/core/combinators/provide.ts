import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { dual } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Scope from "effect/Scope"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"

export const provide: {
  <R2, E2 = never, R3 = never>(
    layer: Layer.Layer<R2, E2, R3>
  ): <A, E, R>(fx: Fx<A, E, R>) => Fx<A, E | E2, Exclude<R, R2> | R3>

  <A, E, R, R2, E2 = never, R3 = never>(
    fx: Fx<A, E, R>,
    layer: Layer.Layer<R2, E2, R3>
  ): Fx<A, E | E2, Exclude<R, R2> | R3>
} = dual(2, <A, E, R, R2, E2 = never, R3 = never>(
  fx: Fx<A, E, R>,
  layer: Layer.Layer<R2, E2, R3>
): Fx<A, E | E2, Exclude<R, R2> | R3> =>
  make<A, E | E2, Exclude<R, R2> | R3>(
    Effect.fnUntraced(function*(sink) {
      const scope = yield* Scope.make()
      const servicesExit = yield* layer.pipe(
        Layer.buildWithScope(scope),
        Effect.exit
      )

      if (Exit.isFailure(servicesExit)) {
        yield* Scope.close(scope, servicesExit)
        return yield* sink.onFailure(servicesExit.cause)
      }

      return yield* fx.run(sink).pipe(
        Effect.provideServices(servicesExit.value),
        Effect.onExit((exit) => Scope.close(scope, exit))
      )
    })
  ))
