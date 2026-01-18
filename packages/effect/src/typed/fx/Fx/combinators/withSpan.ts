import { Effect } from "../../../../index.ts"
import type { SpanOptionsNoTrace } from "../../../../Tracer.ts"
import { make as makeSink, type Sink } from "../../Sink.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"

export const withSpan = <A, E, R>(fx: Fx<A, E, R>, name: string, options?: SpanOptionsNoTrace): Fx<A, E, R> => {
  return make<A, E, R>(<RSink>(sink: Sink<A, E, RSink>) =>
    Effect.withSpan(
      fx.run(makeSink(
        (cause) => Effect.withSpan(sink.onFailure(cause), `onFailure(${name})`, options),
        (value) => Effect.withSpan(sink.onSuccess(value), `onSuccess(${name})`, options)
      )),
      `Fx(${name})`,
      options
    )
  )
}
