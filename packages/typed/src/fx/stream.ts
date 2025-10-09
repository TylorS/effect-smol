import { pipe } from "effect"
import type * as Effect from "effect/Effect"
import * as Queue from "effect/Queue"
import * as Stream from "effect/stream/Stream"
import * as Sink from "../sink/Sink.ts"
import { make } from "./constructors/make.ts"
import type * as Fx from "./Fx.ts"

export const toStream = <A, E, R>(fx: Fx.Fx<A, E, R>): Stream.Stream<A, E, R> =>
  Stream.callback<A, E, R>((queue) =>
    fx.run(Sink.make(
      (cause) => Queue.failCause(queue, cause),
      (value) => Queue.offer(queue, value)
    ))
  )

export const fromStream = <A, E, R>(stream: Stream.Stream<A, E, R>): Fx.Fx<A, E, R> =>
  make<A, E, R>(
    <RSink = never>(sink: Sink.Sink<A, E, RSink>): Effect.Effect<unknown, never, R | RSink> =>
      pipe(
        stream,
        Stream.mapEffect(sink.onSuccess),
        Stream.catchCause((cause) => Stream.fromEffect(sink.onFailure(cause))),
        Stream.runDrain
      )
  )
