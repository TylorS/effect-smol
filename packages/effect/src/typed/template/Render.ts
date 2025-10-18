import type { Cause } from "../../Cause.ts"
import { isNone, isOption } from "../../data/Option.ts"
import { isFunction, isNullish, isObject } from "../../data/Predicate.ts"
import { map as mapRecord } from "../../data/Record.ts"
import * as Effect from "../../Effect.ts"
import { constVoid, dual, flow, identity } from "../../Function.ts"
import * as Layer from "../../Layer.ts"
import * as Scope from "../../Scope.js"
import * as ServiceMap from "../../ServiceMap.ts"
import * as Fx from "../fx/index.js"
import { type IndexRefCounter, makeRefCounter } from "../fx/internal/IndexRefCounter.ts"
import type * as Sink from "../fx/sink/index.ts"
import * as EventHandler from "./EventHandler.js"
import { type EventSource, makeEventSource } from "./EventSource.ts"
import { buildTemplateFragment } from "./internal/buildTemplateFragement.ts"
import {
  findHoleComment,
  makeAttributeValueUpdater,
  makeBooleanUpdater,
  makeClassListUpdater,
  makeDatasetUpdater,
  makeNodeUpdater,
  makeTextContentUpdater
} from "./internal/dom.ts"
import { renderToString } from "./internal/encoding.ts"
import { keyToPartType } from "./internal/keyToPartType.ts"
import { findPath } from "./internal/ParentChildNodes.ts"
import { parse } from "./internal/Parser.ts"
import { PersistentDocumentFragment } from "./PersistentDocumentFragment.ts"
import type { Renderable } from "./Renderable.ts"
import { DomRenderEvent, type RenderEvent } from "./RenderEvent.ts"
import * as RQ from "./RenderQueue.js"
import { RenderTemplate } from "./RenderTemplate.ts"
import * as Template from "./Template.js"

// Can be utilized to override the document for rendering
export const RenderDocument = ServiceMap.Reference<Document>("RenderDocument", {
  defaultValue: () => document
})

export const RenderQueue = ServiceMap.Reference<RQ.RenderQueue>("RenderQueue", {
  defaultValue: () => new RQ.MixedRenderQueue()
})

export const CurrentRenderPriority = ServiceMap.Reference<number>("CurrentRenderPriority", {
  defaultValue: () => RQ.RenderPriority.Raf(0)
})

export const DomRenderTemplate = Object.assign(
  Layer.effect(
    RenderTemplate,
    Effect.gen(function*() {
      const document = yield* RenderDocument
      const entries = new WeakMap<TemplateStringsArray, { template: Template.Template; dom: DocumentFragment }>()
      const getEntry = (templateStrings: TemplateStringsArray) => {
        let entry = entries.get(templateStrings)
        if (entry === undefined) {
          const template = parse(templateStrings)
          entry = { template, dom: buildTemplateFragment(document, template) }
          entries.set(templateStrings, entry)
        }

        const firstChild = document.createComment(`t_${entry.template.hash}`)
        const content = document.importNode(entry.dom, true) as DocumentFragment
        const lastChild = document.createComment(`/t_${entry.template.hash}`)

        return {
          template: entry.template,
          firstChild,
          content,
          lastChild
        } as const
      }

      return <const Values extends ArrayLike<Renderable.Any>>(
        templateStrings: TemplateStringsArray,
        values: Values
      ): Fx.Fx<RenderEvent, Renderable.Error<Values[number]>, Renderable.Services<Values[number]> | Scope.Scope> =>
        Fx.make<RenderEvent, Renderable.Error<Values[number]>, Renderable.Services<Values[number]> | Scope.Scope>(
          Effect.fn(
            function*<RSink = never>(
              sink: Sink.Sink<RenderEvent, Renderable.Error<Values[number]>, RSink>
            ): Generator<
              Effect.Effect<unknown, never, Scope.Scope | Renderable.Services<Values[number]> | RSink>,
              never,
              any
            > {
              const { content, firstChild, lastChild, template } = getEntry(templateStrings)
              const ctx = yield* makeTemplateContext<Values, RSink>(document, values, sink.onFailure)
              const effects = setupRenderParts(template.parts, content, ctx)

              if (effects.length > 0) {
                yield* Effect.forEach(effects, flow(Effect.catchCause(ctx.onCause), Effect.forkIn(ctx.scope)))
              }

              if (ctx.expected > 0 && ctx.refCounter.expect(ctx.expected)) {
                yield* ctx.refCounter.wait
              }

              const rendered = content.childNodes.length > 1
                ? new PersistentDocumentFragment(firstChild, content, lastChild)
                : content.childNodes[0] as Node

              // Setup our event listeners for our rendered content.
              yield* ctx.eventSource.setup(rendered as EventTarget, ctx.scope)

              // Emit just once
              yield* sink.onSuccess(DomRenderEvent(rendered))

              // Ensure our templates last forever in the DOM environment
              // so event listeners are kept attached to the current Scope.
              return yield* Effect.never.pipe(
                // Close our scope whenever the current Fiber is interrupted
                Effect.onExit((exit) => Scope.close(ctx.scope, exit))
              )
            }
          )
        )
    })
  ),
  {
    using: (document: Document) => DomRenderTemplate.pipe(Layer.provide(Layer.succeed(RenderDocument, document)))
  } as const
)

export type Rendered = Node | Array<Node> | PersistentDocumentFragment

export const render: {
  (where: HTMLElement): <A extends RenderEvent | null, E, R>(
    fx: Fx.Fx<A, E, R>
  ) => Fx.Fx<Rendered | (A extends null ? null : never), E, R>
  <A extends RenderEvent | null, E, R>(
    fx: Fx.Fx<A, E, R>,
    where: HTMLElement
  ): Fx.Fx<Rendered | (A extends null ? null : never), E, R>
} = dual(2, function render<A extends RenderEvent | null, E, R>(
  fx: Fx.Fx<A, E, R>,
  where: HTMLElement
): Fx.Fx<Rendered | (A extends null ? null : never), E, R> {
  return Fx.mapEffect(fx, (event) => attachRoot(where, event))
})

const renderCache = new WeakMap<HTMLElement, Rendered>()

function attachRoot<A extends RenderEvent | null>(
  where: HTMLElement,
  what: A // TODO: Should we support HTML RenderEvents here too?,
): Effect.Effect<Rendered | (A extends null ? null : never)> {
  return Effect.sync(() => {
    const rendered = what?.valueOf() as Rendered
    const previous = renderCache.get(where)
    if (rendered !== previous) {
      if (previous && !rendered) removeChildren(where, previous)
      renderCache.set(where, rendered || null)
      if (rendered) replaceChildren(where, rendered)
      return rendered
    }

    return previous
  })
}

function removeChildren(where: HTMLElement, previous: Rendered) {
  for (const node of getNodesFromRendered(previous)) {
    where.removeChild(node)
  }
}

function replaceChildren(where: HTMLElement, wire: Rendered) {
  where.replaceChildren(...getNodesFromRendered(wire))
}

function getNodesFromRendered(rendered: Rendered): Array<globalThis.Node> {
  const value = rendered.valueOf() as globalThis.Node | Array<globalThis.Node>
  return Array.isArray(value) ? value : [value]
}

function setupRenderParts(
  parts: Template.Template["parts"],
  content: DocumentFragment,
  ctx: TemplateContext
): Array<Effect.Effect<unknown>> {
  const effects: Array<Effect.Effect<unknown>> = []
  for (const [part, path] of parts) {
    const node = findPath(content, path)
    const effect = setupRenderPart(part, node, ctx)
    if (effect !== undefined) {
      effects.push(effect)
    }
  }

  return effects
}

const withCurrentRenderPriority = (
  key: unknown,
  index: number,
  ctx: TemplateContext,
  f: () => void
) => {
  return Effect.tap(
    Effect.service(CurrentRenderPriority),
    (priority) => {
      const dispose = addDisposable(
        ctx,
        ctx.renderQueue.add(
          key,
          () => {
            f()
            ctx.refCounter.release(index)
          },
          () => {
            dispose()
          },
          priority
        )
      )
    }
  )
}

function setupRenderPart<E = never, R = never>(
  part: Template.PartNode | Template.SparsePartNode,
  node: Node,
  ctx: TemplateContext<R>
): Effect.Effect<unknown, E, R> | void {
  switch (part._tag) {
    case "node": {
      const element = node as HTMLElement | SVGElement
      const comment = findHoleComment(element, part.index)
      return renderValue(
        ctx,
        part.index,
        makeNodeUpdater(ctx.document, element, comment)
      )
    }
    case "attr": {
      const element = node as HTMLElement | SVGElement
      const attr = element.getAttributeNode(part.name) ?? ctx.document.createAttribute(part.name)
      return renderValue(ctx, part.index, makeAttributeValueUpdater(element, attr))
    }
    case "boolean-part": {
      return renderValue(ctx, part.index, makeBooleanUpdater(node as HTMLElement | SVGElement, part.name))
    }
    case "className-part": {
      return renderValue(ctx, part.index, makeClassListUpdater(node as HTMLElement | SVGElement))
    }
    case "comment-part": {
      return renderValue(ctx, part.index, makeTextContentUpdater(node as Comment))
    }
    case "data": {
      const value = ctx.values[part.index]
      if (isNullish(value)) return
      // Special case to convert sync object to data-* attributes
      if (isObject(value)) {
        const effects: Array<Effect.Effect<unknown, E, R>> = []
        for (const [k, v] of Object.entries(value)) {
          const index = ctx.dynamicIndex++
          const part = makePropertiesPart(["attr", `data-${k}`], index)
          const effect = setupRenderPart(part, node, { ...ctx, values: makeArrayLike(index, v) })
          if (effect !== undefined) {
            ctx.expected++
            effects.push(effect)
          }
        }
        return Effect.all(effects, { concurrency: "unbounded" })
      }
      return renderValue(ctx, part.index, makeDatasetUpdater(node as HTMLElement | SVGElement))
    }
    case "event": {
      const element = node as Element
      const value = ctx.values[part.index]
      if (isNullish(value)) return
      ctx.eventSource.addEventListener(
        element,
        part.name,
        EventHandler.fromEffectOrEventHandler(value).pipe(
          EventHandler.provide(ctx.services),
          EventHandler.catchCause(ctx.onCause)
        )
      )
      return
    }
    case "property": {
      const element = node as HTMLElement | SVGElement
      return renderValue(
        ctx,
        part.index,
        (value: unknown) => {
          ;(element as any)[part.name] = value
        }
      )
    }
    case "properties": {
      const element = node as HTMLElement | SVGElement
      const properties = ctx.values[part.index]

      const setupIfObject = (props: unknown) => {
        if (isObject(props)) {
          return setupRenderProperties<E, R>(
            props as Record<string, unknown>,
            element,
            ctx
          )
        }
      }

      return matchRenderable(properties, ctx, {
        Primitive: setupIfObject,
        Effect: Effect.tap(setupIfObject),
        Fx: flow(
          Fx.switchMapEffect((props) => setupIfObject(props) || Effect.void),
          Fx.drain,
          Effect.provideService(Scope.Scope, ctx.scope)
        )
      })
    }
    case "ref": {
      const element = node as HTMLElement | SVGElement
      const renderable = ctx.values[part.index]
      if (isNullish(renderable)) return
      if (isFunction(renderable)) {
        return matchRenderable(renderable(element), ctx, {
          Primitive: constVoid,
          Effect: identity,
          Fx: Fx.drain
        })
      }

      throw new Error("Invalid value provided to ref part")
    }
    case "sparse-attr": {
      const element = node as HTMLElement | SVGElement
      const attr = element.getAttributeNode(part.name) ?? ctx.document.createAttribute(part.name)
      const setAttr = makeAttributeValueUpdater(element, attr)
      const index = ++ctx.dynamicIndex
      return renderSparsePart(
        part.nodes,
        index,
        ctx,
        (texts) => setAttr(texts.join("")),
        (value) => renderToString(value, "")
      )
    }
    case "sparse-class-name": {
      return renderSparsePart(
        part.nodes,
        ++ctx.dynamicIndex,
        ctx,
        makeClassListUpdater(node as HTMLElement | SVGElement),
        identity
      )
    }
    case "sparse-comment": {
      const comment = node as Comment
      const setCommentText = makeTextContentUpdater(comment)
      return renderSparsePart(
        part.nodes,
        ++ctx.dynamicIndex,
        ctx,
        (texts) => setCommentText(texts.join("")),
        (value) => renderToString(value, "")
      )
    }
    case "text-part": {
      return renderValue(
        ctx,
        part.index,
        makeTextContentUpdater(node as HTMLElement | SVGElement)
      )
    }
    case "sparse-text": {
      const element = node as HTMLElement | SVGElement
      const index = ++ctx.dynamicIndex
      const setTextContent = makeTextContentUpdater(element)
      return renderSparsePart(
        part.nodes,
        index,
        ctx,
        (texts) => setTextContent(texts.join("")),
        (value) => renderToString(value, "")
      )
    }
  }
}

function renderSparsePart<E, R, T = unknown>(
  parts: Template.SparsePartNode["nodes"],
  index: number,
  ctx: TemplateContext<R>,
  f: (value: ReadonlyArray<string | NoInfer<T>>) => void,
  transformValue: (value: unknown) => T
): Effect.Effect<unknown, E, R> {
  ctx.expected++
  return Fx.tuple(
    ...parts.map((node) => {
      if (node._tag === "text") return Fx.succeed(node.value)
      return Fx.map(liftRenderableToFx<E, R>(ctx.values[node.index]), transformValue)
    })
  ).pipe(Fx.observe((values) => withCurrentRenderPriority(f, index, ctx, () => f(values))))
}

function renderValue<E, R, X>(
  ctx: TemplateContext,
  index: number,
  f: (value: unknown) => X
): void | X | Effect.Effect<unknown, E, R> {
  return matchRenderable(ctx.values[index], ctx, {
    Primitive: f,
    Effect: Effect.tap((value) => withCurrentRenderPriority(value, index, ctx, () => f(value))),
    Fx: Fx.observe((value) => withCurrentRenderPriority(value, index, ctx, () => f(value)))
  })
}

function matchRenderable<X, A, B, C>(
  renderable: Renderable.Any,
  ctx: TemplateContext,
  matches: {
    Primitive: (value: X) => A
    Effect: (effect: Effect.Effect<X>) => B
    Fx: (fx: Fx.Fx<X>) => C
  }
): A | B | C | void {
  if (isNullish(renderable)) return
  else if (Fx.isFx(renderable)) {
    ctx.expected++
    return matches.Fx(renderable as any)
  } else if (Effect.isEffect(renderable)) {
    ctx.expected++
    return matches.Effect(renderable as any)
  } else if (Array.isArray(renderable)) {
    ctx.expected++
    return matches.Fx(liftRenderableToFx(renderable))
  } else {
    return matches.Primitive(renderable)
  }
}

function setupRenderProperties<E = never, R = never>(
  properties: Record<string, unknown>,
  element: HTMLElement | SVGElement,
  ctx: TemplateContext<R>
): Effect.Effect<unknown, E, R> | void {
  const effects: Array<Effect.Effect<unknown, E, R>> = []
  for (const [key, value] of Object.entries(properties)) {
    const index = ctx.dynamicIndex++
    const part = makePropertiesPart(keyToPartType(key), index)
    const effect = setupRenderPart(part, element, { ...ctx, values: makeArrayLike(index, value) })
    if (effect !== undefined) {
      effects.push(effect)
    }
  }
  if (effects.length > 0) {
    return Effect.all(effects, { concurrency: "unbounded" })
  }
}

type PartType = ReturnType<typeof keyToPartType>

function makePropertiesPart([partType, partName]: PartType, index: number) {
  switch (partType) {
    case "attr":
      return new Template.AttrPartNode(partName, index)
    case "boolean":
      return new Template.BooleanPartNode(partName, index)
    case "class":
      return new Template.ClassNamePartNode(index)
    case "data":
      return new Template.DataPartNode(index)
    case "event":
      return new Template.EventPartNode(partName, index)
    case "property":
      return new Template.PropertyPartNode(partName, index)
    case "properties":
      return new Template.PropertiesPartNode(index)
    case "ref":
      return new Template.RefPartNode(index)
    default:
      throw new Error(`Unknown part type: ${partType}`)
  }
}

type TemplateContext<R = never> = {
  readonly document: Document
  readonly renderQueue: RQ.RenderQueue
  readonly disposables: Set<Disposable>
  readonly eventSource: EventSource
  readonly refCounter: IndexRefCounter
  readonly scope: Scope.Closeable
  readonly values: ArrayLike<Renderable<any, any, any>>
  readonly services: ServiceMap.ServiceMap<R>
  readonly onCause: (cause: Cause<any>) => Effect.Effect<unknown>

  /**
   * @internal
   */
  expected: number
  /**
   * @internal
   */
  dynamicIndex: number

  /**
   * @internal
   */
  manyKey: string | undefined
  // TODO: Add back hydration support
  // readonly hydrateContext: Option.Option<HydrateContext>
}

const makeTemplateContext = Effect.fn(
  function*<Values extends ArrayLike<Renderable.Any>, RSink = never>(
    document: Document,
    values: Values,
    onCause: (cause: Cause<Renderable.Error<Values[number]>>) => Effect.Effect<unknown, never, RSink>
  ) {
    const renderQueue: RQ.RenderQueue = yield* RenderQueue
    const services: ServiceMap.ServiceMap<Renderable.Services<Values[number]> | RSink | Scope.Scope> = yield* Effect
      .services<Renderable.Services<Values[number]> | RSink | Scope.Scope>()
    const refCounter: IndexRefCounter = yield* makeRefCounter
    const scope: Scope.Closeable = yield* Scope.fork(ServiceMap.get(services, Scope.Scope))
    const eventSource: EventSource = makeEventSource()
    const servicesWithScope = ServiceMap.add(services, Scope.Scope, scope)
    const ctx: TemplateContext<Renderable.Services<Values[number]> | RSink | Scope.Scope> = {
      services: ServiceMap.add(services, Scope.Scope, scope),
      document,
      renderQueue,
      disposables: new Set(),
      eventSource,
      refCounter,
      scope,
      values,
      onCause: flow(onCause, Effect.provideServices(servicesWithScope)),
      expected: 0,
      dynamicIndex: values.length,
      manyKey: undefined
    }

    yield* Scope.addFinalizer(scope, Effect.sync(() => ctx.disposables.forEach(dispose)))

    return ctx
  }
)

function liftRenderableToFx<E = never, R = never>(
  renderable: Renderable<any, E, R>
): Fx.Fx<any, E, R> {
  switch (typeof renderable) {
    case "undefined":
    case "function":
    case "object": {
      if (isNullish(renderable)) {
        return Fx.null
      } else if (Array.isArray(renderable)) {
        return Fx.tuple(...renderable.map(liftRenderableToFx<E, R>))
      } else if (isOption(renderable)) {
        return isNone(renderable) ? Fx.null : liftRenderableToFx(renderable.value)
      } else if (Effect.isEffect(renderable)) {
        return Fx.unwrap(
          Effect.map(renderable, liftRenderableToFx<E, R>)
        )
      } else if (Fx.isFx(renderable)) {
        return renderable
      } else {
        return Fx.struct(mapRecord(renderable, liftRenderableToFx))
      }
    }
    default:
      return Fx.succeed(renderable)
  }
}

function addDisposable(ctx: TemplateContext, disposable: Disposable) {
  ctx.disposables.add(disposable)
  return () => ctx.disposables.delete(disposable)
}

function dispose(disposable: Disposable) {
  disposable[Symbol.dispose]()
}

function makeArrayLike<A>(index: number, value: A): ArrayLike<A> {
  return {
    length: index + 1,
    [index]: value
  }
}
