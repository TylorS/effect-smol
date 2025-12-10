import * as Effect from "../../../Effect.ts"
import type { Fx } from "../../fx/Fx.ts"
import { make } from "../../fx/Fx.ts"
import { make as makeSink, withEarlyExit } from "../../fx/Sink/index.ts"
import type { HtmlRenderEvent } from "../RenderEvent.ts"
import { isHtmlRenderEvent } from "../RenderEvent.ts"

export function takeOneIfNotRenderEvent<A, E, R>(
  fx: Fx<A, E, R>
): Fx<A | HtmlRenderEvent, E, R> {
  return make<A | HtmlRenderEvent, E, R>((sink) =>
    withEarlyExit(sink, (sink) =>
      fx.run(
        makeSink(sink.onFailure, (event) => {
          if (isHtmlRenderEvent(event) && !event.last) return sink.onSuccess(event)
          return Effect.flatMap(sink.onSuccess(event), () => sink.earlyExit)
        })
      ))
  )
}
