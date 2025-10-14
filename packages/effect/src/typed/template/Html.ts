import * as Option from "../../data/Option.ts"
import { isNullish } from "../../data/Predicate.ts"
import { Effect, Layer, ServiceMap } from "../../index.ts"
import * as Fx from "../fx/index.ts"
import type { HtmlEntry } from "./Entry.ts"
import { type HtmlChunk, type HtmlPartChunk, type HtmlSparsePartChunk, templateToHtmlChunks } from "./HtmlChunk.ts"
import { TEXT_START, TYPED_NODE_END, TYPED_NODE_START } from "./internal/meta.ts"
import { parse } from "./internal/Parser.ts"
import { takeOneIfNotRenderEvent } from "./internal/takeOneIfNotRenderEvent.ts"
import type { Renderable } from "./Renderable.ts"
import { HtmlRenderEvent, isHtmlRenderEvent, type RenderEvent } from "./RenderEvent.ts"
import { RenderTemplate } from "./RenderTemplate.ts"

export function renderToHtml<E, R>(fx: Fx.Fx<RenderEvent, E, R>): Fx.Fx<string, E, R> {
  return Fx.map(fx, (event) => event.toString())
}

export function renderToHtmlString<E, R>(fx: Fx.Fx<RenderEvent, E, R>): Effect.Effect<string, E, R> {
  return fx.pipe(
    Fx.map((event) => event.toString()),
    Fx.collectAll,
    Effect.map((events) => events.join(""))
  )
}

export const StaticRendering = ServiceMap.Reference<boolean>("@typed/template/Html/StaticRendering", {
  defaultValue: () => false
})

export const HtmlRenderTemplate = Layer.effect(
  RenderTemplate,
  Effect.gen(function*() {
    const isStatic = yield* StaticRendering
    const entries = new WeakMap<TemplateStringsArray, HtmlEntry>()
    const getEntry = (templateStrings: TemplateStringsArray) => {
      let entry = entries.get(templateStrings)
      if (entry === undefined) {
        const template = parse(templateStrings)
        const chunks = templateToHtmlChunks(template, isStatic)
        entry = { template, chunks }
      }
      return entry
    }

    return <const Values extends ReadonlyArray<Renderable.Any>>(template: TemplateStringsArray, ...values: Values) => {
      const { chunks } = getEntry(template)

      if (chunks.length === 1 && chunks[0]._tag === "text") {
        return Fx.succeed(HtmlRenderEvent(chunks[0].text, true))
      }

      const lastIndex = chunks.length - 1
      return Fx.mergeOrdered(
        ...chunks.map((chunk, i) =>
          renderChunk<Renderable.Error<Values[number]>, Renderable.Services<Values[number]>>(
            chunk,
            values,
            isStatic,
            i === lastIndex
          )
        )
      ).pipe(
        Fx.dropAfter((x) => x.last),
        Fx.filter((x) => x.html.length > 0)
      )
    }
  })
)

export const StaticHtmlRenderTemplate = HtmlRenderTemplate.pipe(
  Layer.provide(Layer.succeed(StaticRendering, true))
)

function renderChunk<E, R>(
  chunk: HtmlChunk,
  values: ReadonlyArray<Renderable.Any>,
  isStatic: boolean,
  last: boolean
): Fx.Fx<HtmlRenderEvent, E, R> {
  if (chunk._tag === "text") {
    return Fx.succeed(HtmlRenderEvent(chunk.text, last))
  }

  if (chunk._tag === "part") {
    return renderPart<E, R>(chunk, values, isStatic, last).pipe(
      Fx.map((x) => HtmlRenderEvent(x.html, x.last && last))
    )
  }

  return renderSparsePart(chunk, values, isStatic, last)
}

function renderPart<E, R>(
  chunk: HtmlPartChunk,
  values: ReadonlyArray<Renderable.Any>,
  isStatic: boolean,
  last: boolean
): Fx.Fx<HtmlRenderEvent, E, R> {
  const { node, render } = chunk
  const renderable = values[node.index]

  if (node._tag === "node") {
    return isStatic
      ? renderNode<E, R>(renderable, isStatic)
      : renderNodeWithHtml<E, R>(node.index, renderable)
  }

  if (node._tag === "properties") {
    if (renderable == null) return Fx.empty

    return Fx.mergeAll(
      ...Object.entries(renderable as Record<string, Renderable<any, any>>).map(
        ([key, renderable]) => {
          return Fx.filterMap(
            Fx.take(unwrapRenderableForHtml<E, R>(renderable, isStatic), 1),
            (value) => {
              const s = render({ [key]: value })
              return s ? Option.some(HtmlRenderEvent(s, last)) : Option.none()
            }
          )
        }
      )
    )
  }

  if (isNullish(renderable)) {
    return Fx.succeed(HtmlRenderEvent(render(renderable), last))
  }

  const html = Fx.filterMap(
    unwrapRenderableForHtml<E, R>(renderable, isStatic),
    (value) => {
      const s = render(value)
      return s ? Option.some(HtmlRenderEvent(s, last)) : Option.none()
    }
  )

  return html
}

function renderNode<E, R>(
  renderable: Renderable<any, any, any>,
  isStatic: boolean
): Fx.Fx<HtmlRenderEvent, E, R> {
  switch (typeof renderable) {
    case "string":
    case "number":
    case "boolean":
    case "bigint":
      return Fx.succeed(HtmlRenderEvent(String(renderable), true))
    case "undefined":
    case "object":
      return renderObject(renderable, isStatic)
    default:
      return Fx.empty
  }
}

function renderNodeWithHtml<E, R>(
  index: number,
  renderable: Renderable<any, any>
): Fx.Fx<HtmlRenderEvent, E, R> {
  let first = true
  return Fx.continueWith(
    Fx.map(renderNode<E, R>(renderable, false), (x) => {
      if (x.last) {
        const y = HtmlRenderEvent(
          (first ? TYPED_NODE_START(index) : "") +
            x.html +
            TYPED_NODE_END(index),
          true
        )
        first = false
        return y
      } else {
        if (first) {
          first = false
          return HtmlRenderEvent(
            TYPED_NODE_START(index) + x.html,
            false
          )
        }
        return x
      }
    }),
    () => {
      return first
        ? Fx.succeed(
          HtmlRenderEvent(
            TYPED_NODE_START(index) + TYPED_NODE_END(index),
            true
          )
        )
        : Fx.empty
    }
  )
}

function renderObject<E, R>(
  renderable: object | null | undefined,
  isStatic: boolean
): Fx.Fx<HtmlRenderEvent, E, R> {
  if (isNullish(renderable)) {
    return isStatic ? Fx.empty : Fx.succeed(HtmlRenderEvent(TEXT_START, true))
  } else if (Array.isArray(renderable)) {
    return Fx.mergeOrdered(...renderable.map((r) => renderNode<E, R>(r, isStatic)))
  } else if (Effect.isEffect(renderable)) {
    return Fx.unwrap(Effect.map(renderable, (r) => renderNode<E, R>(r, isStatic)))
  } else if (Fx.isFx(renderable)) {
    return takeOneIfNotRenderEvent(renderable, isStatic)
  } else if (isHtmlRenderEvent(renderable)) {
    return Fx.succeed(renderable)
  } else {
    return Fx.empty
  }
}

function renderSparsePart(
  chunk: HtmlSparsePartChunk,
  values: ReadonlyArray<Renderable.Any>,
  isStatic: boolean,
  last: boolean
): Fx.Fx<HtmlRenderEvent, never, never> {
  const { node, render } = chunk
  return Fx.tuple(
    ...node.nodes.map((node) => {
      if (node._tag === "text") return Fx.succeed(node.value)
      return unwrapRenderableForHtml<never, never>(values[node.index], isStatic)
    })
  ).pipe(
    Fx.take(1),
    Fx.map((value) => HtmlRenderEvent(render(value), last))
  )
}

function unwrapRenderableForHtml<E, R>(
  renderable: Renderable<any, any, any>,
  isStatic: boolean
): Fx.Fx<any, E, R> {
  switch (typeof renderable) {
    case "undefined":
    case "object": {
      if (isNullish(renderable)) {
        return Fx.succeed(null)
      } else if (Array.isArray(renderable)) {
        return Fx.mergeOrdered(
          ...renderable.map((r) =>
            takeOneIfNotRenderEvent(
              unwrapRenderableForHtml<E, R>(r, isStatic),
              isStatic
            )
          )
        )
      } else if (Effect.isEffect(renderable)) {
        return Fx.unwrap(
          Effect.map(renderable, (_) => unwrapRenderableForHtml<E, R>(_, isStatic))
        )
      } else if (Fx.isFx(renderable)) {
        return takeOneIfNotRenderEvent(renderable, isStatic)
      } else return Fx.succeed(renderable)
    }
    default:
      return Fx.succeed(renderable)
  }
}
