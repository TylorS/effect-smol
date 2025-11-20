import * as Effect from "../../../Effect.ts"
import * as Fx from "../../fx/index.ts"
import * as Sink from "../../fx/sink/index.ts"
import type { HtmlRenderEvent } from "../RenderEvent.ts"
import { isHtmlRenderEvent } from "../RenderEvent.ts"

export function takeOneIfNotRenderEvent<A, E, R>(
  fx: Fx.Fx<A, E, R>
): Fx.Fx<A | HtmlRenderEvent, E, R> {
  return Fx.make<A | HtmlRenderEvent, E, R>((sink) =>
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
