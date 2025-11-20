import * as Effect from "effect/Effect"
import type { Fx } from "effect/typed/fx"
import { make, Sink } from "effect/typed/fx"
import type { HtmlRenderEvent } from "../RenderEvent.ts"
import { isHtmlRenderEvent } from "../RenderEvent.ts"

export function takeOneIfNotRenderEvent<A, E, R>(
  fx: Fx<A, E, R>
): Fx<A | HtmlRenderEvent, E, R> {
  return make<A | HtmlRenderEvent, E, R>((sink) =>
    Sink.withEarlyExit(sink, (sink) =>
      fx.run(
        Sink.make(sink.onFailure, (event) => {
          if (isHtmlRenderEvent(event) && !event.last) {
            return sink.onSuccess(event)
          }
          return Effect.flatMap(sink.onSuccess(event), () => sink.earlyExit)
        })
      ))
  )
}
