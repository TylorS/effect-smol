import { none, some } from "../../data/Option.ts"
import { isNullish } from "../../data/Predicate.ts"
import { Effect, Layer, ServiceMap } from "../../index.ts"
import type { Fx } from "../fx/index.ts"
import {
  collectAll,
  continueWith,
  dropAfter,
  empty,
  filter,
  filterMap,
  isFx,
  map,
  mergeAll,
  mergeOrdered,
  succeed,
  take,
  tuple,
  unwrap
} from "../fx/index.ts"
import { CurrentComputedBehavior } from "../fx/ref-subject/RefSubject.ts"
import { type HtmlChunk, type HtmlPartChunk, type HtmlSparsePartChunk, templateToHtmlChunks } from "./HtmlChunk.ts"
import { TEXT_START, TYPED_NODE_END, TYPED_NODE_START } from "./internal/meta.ts"
import { parse } from "./internal/Parser.ts"
import { takeOneIfNotRenderEvent } from "./internal/takeOneIfNotRenderEvent.ts"
import type { Renderable } from "./Renderable.ts"
import { HtmlRenderEvent, isHtmlRenderEvent, type RenderEvent } from "./RenderEvent.ts"
import { RenderTemplate } from "./RenderTemplate.ts"

export function renderToHtml<E, R>(fx: Fx<RenderEvent, E, R>): Fx<string, E, R> {
  return map(fx, (event) => event.toString())
}

export function renderToHtmlString<E, R>(fx: Fx<RenderEvent, E, R>): Effect.Effect<string, E, R> {
  return fx.pipe(
    map((event) => event.toString()),
    collectAll,
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
    const entries = new WeakMap<TemplateStringsArray, ReadonlyArray<HtmlChunk>>()
    const getEntry = (templateStrings: TemplateStringsArray) => {
      let entry = entries.get(templateStrings)
      if (entry === undefined) {
        entry = templateToHtmlChunks(parse(templateStrings), isStatic)
        entries.set(templateStrings, entry)
      }
      return entry
    }

    return <const Values extends ReadonlyArray<Renderable.Any>>(template: TemplateStringsArray, ...values: Values) => {
      const chunks = getEntry(template)

      if (chunks.length === 1 && chunks[0]._tag === "text") {
        return succeed(HtmlRenderEvent(chunks[0].text, true))
      }

      const lastIndex = chunks.length - 1
      return mergeOrdered(
        ...chunks.map((chunk, i) =>
          renderChunk<Renderable.Error<Values[number]>, Renderable.Services<Values[number]>>(
            chunk,
            values,
            isStatic,
            i === lastIndex
          )
        )
      ).pipe(
        dropAfter((x) => x.last),
        filter((x) => x.html.length > 0)
      )
    }
  })
).pipe(
  Layer.provideMerge(Layer.succeed(CurrentComputedBehavior, "one"))
)

export const StaticHtmlRenderTemplate = HtmlRenderTemplate.pipe(
  Layer.provideMerge(Layer.succeed(StaticRendering, true))
)

function renderChunk<E, R>(
  chunk: HtmlChunk,
  values: ReadonlyArray<Renderable.Any>,
  isStatic: boolean,
  last: boolean
): Fx<HtmlRenderEvent, E, R> {
  if (chunk._tag === "text") {
    return succeed(HtmlRenderEvent(chunk.text, last))
  }

  if (chunk._tag === "part") {
    return renderPart<E, R>(chunk, values, isStatic, last).pipe(
      map((x) => HtmlRenderEvent(x.html, x.last && last))
    )
  }

  return renderSparsePart(chunk, values, isStatic, last)
}

function renderPart<E, R>(
  chunk: HtmlPartChunk,
  values: ReadonlyArray<Renderable.Any>,
  isStatic: boolean,
  last: boolean
): Fx<HtmlRenderEvent, E, R> {
  const { node, render } = chunk
  const renderable = values[node.index]

  if (node._tag === "node") {
    return isStatic
      ? renderNode<E, R>(renderable, isStatic)
      : renderNodeWithHtml<E, R>(node.index, renderable)
  }

  if (node._tag === "properties") {
    if (renderable == null) return empty

    return mergeAll(
      ...Object.entries(renderable).map(
        ([key, renderable]) => {
          return filterMap(
            take(liftRenderableToFx<E, R>(renderable, isStatic), 1),
            (value) => {
              const s = render({ [key]: value })
              return s ? some(HtmlRenderEvent(s, last)) : none()
            }
          )
        }
      )
    )
  }

  if (isNullish(renderable)) {
    return succeed(HtmlRenderEvent(render(renderable), last))
  }

  const html = filterMap(
    liftRenderableToFx<E, R>(renderable, isStatic),
    (value) => {
      const s = render(value)
      return s ? some(HtmlRenderEvent(s, last)) : none()
    }
  )

  return html
}

function renderNode<E, R>(
  renderable: Renderable<any, any, any>,
  isStatic: boolean
): Fx<HtmlRenderEvent, E, R> {
  switch (typeof renderable) {
    case "string":
    case "number":
    case "boolean":
    case "bigint":
      return succeed(HtmlRenderEvent(String(renderable), true))
    case "undefined":
    case "object":
      return renderObject(renderable, isStatic)
    default:
      return empty
  }
}

function renderNodeWithHtml<E, R>(
  index: number,
  renderable: Renderable<any, any>
): Fx<HtmlRenderEvent, E, R> {
  let first = true
  return continueWith(
    map(renderNode<E, R>(renderable, false), (x) => {
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
        ? succeed(
          HtmlRenderEvent(
            TYPED_NODE_START(index) + TYPED_NODE_END(index),
            true
          )
        )
        : empty
    }
  )
}

function renderObject<E, R>(
  renderable: object | null | undefined,
  isStatic: boolean
): Fx<HtmlRenderEvent, E, R> {
  if (isNullish(renderable)) {
    return isStatic ? empty : succeed(HtmlRenderEvent(TEXT_START, true))
  } else if (Array.isArray(renderable)) {
    return mergeOrdered(...renderable.map((r) => renderNode<E, R>(r, isStatic)))
  } else if (Effect.isEffect(renderable)) {
    return unwrap(Effect.map(renderable, (r) => renderNode<E, R>(r, isStatic)))
  } else if (isFx(renderable)) {
    return takeOneIfNotRenderEvent(renderable, isStatic)
  } else if (isHtmlRenderEvent(renderable)) {
    return succeed(renderable)
  } else {
    return empty
  }
}

function renderSparsePart<E, R>(
  chunk: HtmlSparsePartChunk,
  values: ReadonlyArray<Renderable.Any>,
  isStatic: boolean,
  last: boolean
): Fx<HtmlRenderEvent, E, R> {
  const { node, render } = chunk
  return tuple(
    ...node.nodes.map((node) => {
      if (node._tag === "text") return succeed(node.value)
      return liftRenderableToFx<E, R>(values[node.index], isStatic)
    })
  ).pipe(
    take(1),
    map((value) => HtmlRenderEvent(render(value), last))
  )
}

function liftRenderableToFx<E, R>(
  renderable: Renderable<any, E, R>,
  isStatic: boolean
): Fx<any, E, R> {
  switch (typeof renderable) {
    case "undefined":
    case "object": {
      if (isNullish(renderable)) {
        return succeed(null)
      } else if (Array.isArray(renderable)) {
        return mergeOrdered(
          ...renderable.map((r) =>
            takeOneIfNotRenderEvent(
              liftRenderableToFx<E, R>(r, isStatic),
              isStatic
            )
          )
        )
      } else if (Effect.isEffect(renderable)) {
        return unwrap(
          Effect.map(renderable, (_) => liftRenderableToFx<E, R>(_, isStatic))
        )
      } else if (isFx(renderable)) {
        return takeOneIfNotRenderEvent(renderable, isStatic)
      } else return succeed(renderable)
    }
    default:
      return succeed(renderable)
  }
}
