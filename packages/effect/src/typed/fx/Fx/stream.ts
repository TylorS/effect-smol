import type * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Queue from "effect/Queue"
import * as Stream from "effect/stream/Stream"
import * as Sink from "../Sink/Sink.ts"
import { make } from "./constructors/make.ts"
import type * as Fx from "./Fx.ts"

export type ToStreamOptions = Parameters<typeof Stream.callback<unknown, unknown, unknown>>[1]

export const toStream = <A, E, R>(fx: Fx.Fx<A, E, R>, options?: ToStreamOptions | undefined): Stream.Stream<A, E, R> =>
  Stream.callback<A, E, R>(
    (queue) =>
      fx.run(Sink.make(
        (cause) => Queue.failCause(queue, cause),
        (value) => Queue.offer(queue, value)
      )),
    options
  )

export type FromStreamOptions = Parameters<typeof Stream.mapEffect<unknown, unknown, unknown, unknown>>[1]

export const fromStream = <A, E, R>(
  stream: Stream.Stream<A, E, R>,
  options?: FromStreamOptions | undefined
): Fx.Fx<A, E, R> =>
  make<A, E, R>(
    <RSink = never>(sink: Sink.Sink<A, E, RSink>): Effect.Effect<unknown, never, R | RSink> =>
      pipe(
        stream,
        Stream.mapEffect(sink.onSuccess, options),
        Stream.catchCause((cause) => Stream.fromEffect(sink.onFailure(cause))),
        Stream.runDrain
      )
  )
