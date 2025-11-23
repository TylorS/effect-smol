import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { dual } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Scope from "effect/Scope"
import type * as ServiceMap from "effect/ServiceMap"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"

/**
 * Provides context to an Fx from a Layer.
 *
 * The context is provided to the entire Fx stream, including any effects run
 * during its execution. The context is scoped to the lifetime of the stream.
 *
 * @param layer - The Layer to provide.
 * @returns An `Fx` with the required context provided.
 * @since 1.0.0
 * @category combinators
 */
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

export const provideServices: {
  <R2>(
    services: ServiceMap.ServiceMap<R2>
  ): <A, E, R>(fx: Fx<A, E, R>) => Fx<A, E, Exclude<R, R2>>

  <A, E, R, R2>(
    fx: Fx<A, E, R>,
    services: ServiceMap.ServiceMap<R2>
  ): Fx<A, E, Exclude<R, R2>>
} = dual(2, <A, E, R, R2>(
  fx: Fx<A, E, R>,
  services: ServiceMap.ServiceMap<R2>
): Fx<A, E, Exclude<R, R2>> => provide(fx, Layer.succeedServices(services)))
