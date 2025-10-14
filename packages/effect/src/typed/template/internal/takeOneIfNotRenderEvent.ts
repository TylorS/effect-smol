import { isNullish } from "../../../data/Predicate.ts"
import * as Effect from "../../../Effect.ts"
import * as Fx from "../../fx/index.ts"
import * as Sink from "../../fx/sink/index.ts"
import { HtmlRenderEvent, isHtmlRenderEvent } from "../RenderEvent.ts"
import { TEXT_START } from "./meta.ts"

export function takeOneIfNotRenderEvent<A, E, R>(
  fx: Fx.Fx<A, E, R>,
  isStatic: boolean
): Fx.Fx<HtmlRenderEvent, E, R> {
  return Fx.make<HtmlRenderEvent, E, R>((sink) =>
    Sink.withEarlyExit(sink, (sink) =>
      fx.run(
        Sink.make(sink.onFailure, (event) => {
          if (isHtmlRenderEvent(event)) {
            return sink.onSuccess(event)
          }

          if (isNullish(event)) {
            return sink.earlyExit
          }

          return Effect.flatMap(
            sink.onSuccess(
              HtmlRenderEvent(
                (isStatic ? "" : TEXT_START) + String(event),
                true
              )
            ),
            () => sink.earlyExit
          )
        })
      ))
  )
}
