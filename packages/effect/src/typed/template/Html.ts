import { none, type Option, some } from "../../data/Option.ts"
import { isNullish, isObject } from "../../data/Predicate.ts"
import { map as mapRecord } from "../../data/Record.ts"
import { Effect, Layer, ServiceMap } from "../../index.ts"
import type { Scope } from "../../Scope.ts"
import { delimit } from "../fx/combinators/continueWith.ts"
import * as Fx from "../fx/index.ts"
import { CurrentComputedBehavior } from "../fx/ref-subject/RefSubject.ts"
import {
  addTemplateHash,
  type HtmlChunk,
  type HtmlPartChunk,
  type HtmlSparsePartChunk,
  templateToHtmlChunks
} from "./HtmlChunk.ts"
import { renderToString } from "./internal/encoding.ts"
import { TEXT_START, TYPED_NODE_END, TYPED_NODE_START } from "./internal/meta.ts"
import { parse } from "./internal/Parser.ts"
import { takeOneIfNotRenderEvent } from "./internal/takeOneIfNotRenderEvent.ts"
import type { Renderable } from "./Renderable.ts"
import { HtmlRenderEvent, isHtmlRenderEvent, type RenderEvent } from "./RenderEvent.ts"
import { RenderTemplate } from "./RenderTemplate.ts"
import type { Template } from "./Template.ts"

const toHtmlString = (event: RenderEvent | null | undefined): Option<string> => {
  if (event === null || event === undefined) return none()
  const s = event.toString()
  if (s === "") return none()
  return some(s)
}

export function renderToHtml<E, R>(
  fx: Fx.Fx<RenderEvent | null | undefined, E, R>
): Fx.Fx<string, E, R> {
  return Fx.filterMap(fx, toHtmlString)
}

export function renderToHtmlString<E, R>(fx: Fx.Fx<RenderEvent | null | undefined, E, R>): Effect.Effect<string, E, R> {
  return fx.pipe(
    renderToHtml,
    Fx.collectAll,
    Effect.map((events) => events.join(""))
  )
}

export const StaticRendering = ServiceMap.Reference<boolean>("@typed/template/Html/StaticRendering", {
  defaultValue: () => false
})

type HtmlEntry = {
  template: Template
  chunks: ReadonlyArray<HtmlChunk>
}

export const HtmlRenderTemplate = Layer.effect(
  RenderTemplate,
  Effect.gen(function*() {
    const isStatic = yield* StaticRendering
    const entries = new WeakMap<TemplateStringsArray, HtmlEntry>()
    const getChunks = (templateStrings: TemplateStringsArray) => {
      let entry = entries.get(templateStrings)
      if (entry === undefined) {
        const template = parse(templateStrings)
        const chunks = templateToHtmlChunks(template)
        const chunksWithHash = isStatic ? chunks : addTemplateHash(chunks, template)
        entry = {
          template,
          chunks: chunksWithHash
        }
        entries.set(templateStrings, entry)
      }
      return entry.chunks
    }

    return <const Values extends ArrayLike<Renderable.Any>>(template: TemplateStringsArray, values: Values) =>
      Fx.mergeOrdered(
        ...getChunks(template).map((chunk, i, chunks) =>
          renderChunk<Renderable.Error<Values[number]>, Renderable.Services<Values[number]>>(
            chunk,
            values,
            isStatic,
            i === chunks.length - 1
          )
        )
      )
  })
).pipe(
  Layer.provideMerge(Layer.succeed(CurrentComputedBehavior, "one"))
)

export const StaticHtmlRenderTemplate = HtmlRenderTemplate.pipe(
  Layer.provideMerge(Layer.succeed(StaticRendering, true))
)

function renderChunk<E, R>(
  chunk: HtmlChunk,
  values: ArrayLike<Renderable.Any>,
  isStatic: boolean,
  last: boolean
): Fx.Fx<HtmlRenderEvent, E, R | Scope> {
  if (chunk._tag === "text") {
    return Fx.succeed(HtmlRenderEvent(chunk.text, last))
  }

  if (chunk._tag === "part") {
    return renderPart<E, R>(chunk, values, isStatic, last)
  }

  return renderSparsePart(chunk, values, isStatic, last)
}

function renderPart<E, R>(
  chunk: HtmlPartChunk,
  values: ArrayLike<Renderable.Any>,
  isStatic: boolean,
  last: boolean
): Fx.Fx<HtmlRenderEvent, E, R | Scope> {
  const { node, render } = chunk
  const renderable = values[node.index]

  // We don't render ref and event nodes via HTML
  if (node._tag === "ref" || node._tag === "event") return Fx.empty

  if (node._tag === "node") {
    return renderNode(renderable, node.index, isStatic, last)
  }

  if (node._tag === "properties") {
    const setupIfObject = (props: unknown) => {
      if (isObject(props)) {
        return renderProperties<E, R>(props as Record<string, Renderable<any, E, R>>, isStatic, last, render)
      }
      return Fx.empty
    }
    if (isObject(renderable)) {
      return setupIfObject(renderable)
    }
    if (Effect.isEffect(renderable)) {
      return Fx.unwrap(Effect.map(renderable, setupIfObject))
    }
    return liftRenderableToFx<E, R>(renderable, isStatic, last).pipe(
      Fx.switchMap(setupIfObject)
    )
  }

  return Fx.filterMap(
    liftRenderableToFx<E, R>(renderable, isStatic, last),
    (value) => {
      const s = render(value)
      return s ? some(HtmlRenderEvent(s, last)) : none()
    }
  )
}

function renderProperties<E, R>(
  renderable: Record<string, Renderable<any, E, R>>,
  isStatic: boolean,
  last: boolean,
  render: (u: Record<string, unknown>) => string
) {
  const entries = Object.entries(renderable)
  const length = entries.length
  const lastIndex = length - 1

  // Order here doesn't matter ??
  return Fx.mergeAll(
    ...entries.map(
      ([key, renderable], i) => {
        return Fx.filterMap(
          liftRenderableToFx<E, R>(renderable, isStatic, last && i === lastIndex),
          (value) => {
            const s = render({ [key]: value })
            return s ? some(HtmlRenderEvent(s, last && i === lastIndex)) : none()
          }
        )
      }
    )
  )
}

function renderNode<E, R>(
  renderable: Renderable<any, E, R>,
  index: number,
  isStatic: boolean,
  last: boolean
) {
  let node = liftRenderableToFx<E, R>(renderable, isStatic, last).pipe(
    Fx.map((x) => isHtmlRenderEvent(x) ? x : HtmlRenderEvent(renderToString(x, ""), last))
  )
  if (!isStatic) {
    node = addNodePlaceholders<E, R>(node, index)
  }
  return node.pipe(
    Fx.map((x) => HtmlRenderEvent(x.html, x.last && last))
  )
}

function addNodePlaceholders<E, R>(
  fx: Fx.Fx<HtmlRenderEvent, E, R>,
  index: number
): Fx.Fx<HtmlRenderEvent, E, R> {
  return fx.pipe(
    Fx.map((event) => isHtmlRenderEvent(event) ? HtmlRenderEvent(event.html, false) : event),
    delimit(HtmlRenderEvent(TYPED_NODE_START(index), false), HtmlRenderEvent(TYPED_NODE_END(index), true))
  )
}

function renderSparsePart<E, R>(
  chunk: HtmlSparsePartChunk,
  values: ArrayLike<Renderable.Any>,
  isStatic: boolean,
  last: boolean
): Fx.Fx<HtmlRenderEvent, E, R> {
  const { node, render } = chunk
  return Fx.tuple(
    ...node.nodes.map((node, i, nodes) => {
      if (node._tag === "text") return Fx.succeed(node.value)
      return liftRenderableToFx<E, R>(values[node.index], isStatic, i === nodes.length - 1)
    })
  ).pipe(
    Fx.take(1),
    Fx.map((value) => HtmlRenderEvent(render(value), last))
  )
}

function liftRenderableToFx<E, R>(
  renderable: Renderable<any, E, R>,
  isStatic: boolean,
  last: boolean
): Fx.Fx<any, E, R> {
  switch (typeof renderable) {
    case "undefined":
    case "function":
    case "object": {
      if (isNullish(renderable)) {
        return isStatic ? Fx.empty : Fx.succeed(HtmlRenderEvent(TEXT_START, true))
      } else if (Array.isArray(renderable)) {
        return Fx.mergeOrdered(
          ...renderable.map((r, i, rr) => liftRenderableToFx<E, R>(r, isStatic, i === rr.length - 1))
        )
      } else if (Fx.isFx(renderable)) {
        return takeOneIfNotRenderEvent(renderable)
      } else if (Effect.isEffect(renderable)) {
        return Fx.unwrap(
          Effect.map(renderable, (_) => liftRenderableToFx<E, R>(_, isStatic, last))
        )
      } else if (isHtmlRenderEvent(renderable)) {
        return Fx.succeed(renderable)
      } else return Fx.take(Fx.struct(mapRecord(renderable, (_) => liftRenderableToFx<E, R>(_, isStatic, last))), 1)
    }
    default:
      return Fx.succeed(renderable)
  }
}
