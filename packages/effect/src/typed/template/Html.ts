import { none, type Option, some } from "effect/data/Option"
import { isNullish, isObject } from "effect/data/Predicate"
import { map as mapRecord } from "effect/data/Record"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type { Scope } from "effect/Scope"
import * as ServiceMap from "effect/ServiceMap"
import * as Fx from "effect/typed/fx"
import * as RefSubject from "effect/typed/fx/RefSubject"
import {
  addTemplateHash,
  type HtmlChunk,
  type HtmlPartChunk,
  type HtmlSparsePartChunk,
  templateToHtmlChunks
} from "./HtmlChunk.ts"
import { renderToString } from "./internal/encoding.ts"
import { TEXT_START, TYPED_NODE_END, TYPED_NODE_START } from "./internal/meta.ts"
import { takeOneIfNotRenderEvent } from "./internal/takeOneIfNotRenderEvent.ts"
import { parse } from "./Parser.ts"
import type { Renderable } from "./Renderable.ts"
import { HtmlRenderEvent, isHtmlRenderEvent, type RenderEvent } from "./RenderEvent.ts"
import { RenderTemplate } from "./RenderTemplate.ts"

const toHtmlString = (event: RenderEvent | null | undefined): Option<string> => {
  if (event === null || event === undefined) return none()
  const s = event.toString()
  if (s === "") return none()
  return some(s)
}

/**
 * Renders a stream of `RenderEvent`s into a stream of HTML strings.
 *
 * This function transforms the output of a template rendering process (which produces `RenderEvent`s)
 * into a stream of strings suitable for HTML output (e.g., for Server-Side Rendering).
 *
 * @param fx - The `Fx` stream of `RenderEvent`s to render.
 * @returns An `Fx` stream of HTML strings.
 */
export function renderToHtml<E, R>(
  fx: Fx.Fx<RenderEvent | null | undefined, E, R>
): Fx.Fx<string, E, R> {
  return Fx.filterMap(fx, toHtmlString)
}

/**
 * Renders a stream of `RenderEvent`s into a single HTML string.
 *
 * This is a convenience function that collects all events from `renderToHtml` and joins them
 * into a single string. It is an Effect that resolves when the stream completes.
 *
 * @param fx - The `Fx` stream of `RenderEvent`s to render.
 * @returns An `Effect` that resolves to the full HTML string.
 */
export function renderToHtmlString<E, R>(fx: Fx.Fx<RenderEvent | null | undefined, E, R>): Effect.Effect<string, E, R> {
  return fx.pipe(
    renderToHtml,
    Fx.collectAll,
    Effect.map((events) => events.join(""))
  )
}

/**
 * A boolean service that indicates whether the current rendering context is static.
 *
 * If `true`, the HTML renderer will optimize for static output, potentially skipping
 * dynamic placeholder generation or other interactive features not needed for static HTML.
 */
export const StaticRendering = ServiceMap.Reference<boolean>("@typed/template/Html/StaticRendering", {
  defaultValue: () => false
})

type HtmlEntry = ReadonlyArray<HtmlChunk>

/**
 * A Layer that provides the `RenderTemplate` service implemented for HTML string generation.
 *
 * Using this layer enables templates to be rendered as HTML strings (e.g., for SSR)
 * rather than DOM nodes. It sets the `CurrentComputedBehavior` to `"one"`, indicating
 * a single-pass render approach typical for HTML generation.
 */
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
        entry = isStatic ? chunks : addTemplateHash(chunks, template)
        entries.set(templateStrings, entry)
      }
      return entry
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
  Layer.provideMerge(Layer.succeed(RefSubject.CurrentComputedBehavior, "one"))
)

/**
 * A variant of `HtmlRenderTemplate` that enables static rendering optimizations.
 *
 * This layer provides the `RenderTemplate` service for HTML generation but also
 * sets `StaticRendering` to `true`, enabling optimizations for static content.
 */
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

  // Node need to handle all possible value types including arrays
  if (node._tag === "node") {
    return renderNode(renderable, node.index, isStatic, last)
  }

  // Properties is entirely recursive
  if (node._tag === "properties") {
    const setup = (props: unknown) =>
      setupProperties<E, R>(props as Record<string, Renderable<any, E, R>>, isStatic, last, render)
    if (isObject(renderable)) return setup(renderable)
    return Fx.switchMap(liftRenderableToFx<E, R>(renderable, isStatic), (props) => {
      if (isObject(props)) return setup(props)
      return Fx.empty
    })
  }

  // Otherwise we're going to coerce to a string
  return Fx.filterMap(
    liftRenderableToFx<E, R>(renderable, isStatic),
    (value) => {
      const s = render(value)
      return s ? some(HtmlRenderEvent(s, last)) : none()
    }
  )
}

function setupProperties<E, R>(
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
          liftRenderableToFx<E, R>(renderable, isStatic),
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
  let node = liftRenderableToFx<E, R>(renderable, isStatic).pipe(
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
    Fx.delimit(HtmlRenderEvent(TYPED_NODE_START(index), false), HtmlRenderEvent(TYPED_NODE_END(index), true))
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
    ...node.nodes.map((node) => {
      if (node._tag === "text") return Fx.succeed(node.value)
      return liftRenderableToFx<E, R>(values[node.index], isStatic)
    })
  ).pipe(
    Fx.take(1),
    Fx.map((value) => HtmlRenderEvent(render(value), last))
  )
}

function liftRenderableToFx<E, R>(
  renderable: Renderable<any, E, R>,
  isStatic: boolean
): Fx.Fx<any, E, R> {
  switch (typeof renderable) {
    case "undefined":
    case "function":
    case "object": {
      if (isNullish(renderable)) {
        return isStatic ? Fx.empty : Fx.succeed(HtmlRenderEvent(TEXT_START, true))
      } else if (Array.isArray(renderable)) {
        return Fx.mergeOrdered(...renderable.map((r) => liftRenderableToFx<E, R>(r, isStatic)))
      } else if (Fx.isFx(renderable)) {
        return takeOneIfNotRenderEvent(renderable)
      } else if (Effect.isEffect(renderable)) {
        return Fx.unwrap(Effect.map(renderable, (r) => liftRenderableToFx<E, R>(r, isStatic)))
      } else if (isHtmlRenderEvent(renderable)) {
        return Fx.succeed(renderable)
      } else return Fx.take(Fx.struct(mapRecord(renderable, (_) => liftRenderableToFx<E, R>(_, isStatic))), 1)
    }
    default:
      return Fx.succeed(renderable)
  }
}
