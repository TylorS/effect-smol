/// <reference types="./udomdiff.d.ts" />

import udomdiff from "udomdiff"
import type { Cause } from "../../Cause.ts"
import { isFunction, isNullish, isObject } from "../../data/Predicate.ts"
import * as Effect from "../../Effect.ts"
import { constVoid, dual, flow, identity } from "../../Function.ts"
import * as Layer from "../../Layer.ts"
import * as Scope from "../../Scope.js"
import * as ServiceMap from "../../ServiceMap.ts"
import * as Fx from "../fx/index.js"
import { type IndexRefCounter, makeRefCounter } from "../fx/internal/IndexRefCounter.ts"
import type * as Sink from "../fx/sink/index.ts"
import { CouldNotFindCommentError } from "./errors.ts"
import * as EventHandler from "./EventHandler.js"
import { type EventSource, makeEventSource } from "./EventSource.ts"
import { buildTemplateFragment } from "./internal/buildTemplateFragement.ts"
import { renderToString } from "./internal/encoding.ts"
import { keyToPartType } from "./internal/keyToPartType.ts"
import { findPath } from "./internal/ParentChildNodes.ts"
import { parse } from "./internal/Parser.ts"
import { diffable, PersistentDocumentFragment } from "./PersistentDocumentFragment.ts"
import type { Renderable } from "./Renderable.ts"
import { DomRenderEvent, isRenderEvent, type RenderEvent } from "./RenderEvent.ts"
import * as RQ from "./RenderQueue.js"
import { RenderTemplate } from "./RenderTemplate.ts"
import * as Template from "./Template.js"

// Can be utilized to override the document for rendering
export const RenderDocument = ServiceMap.Reference<Document>("RenderDocument", { defaultValue: () => document })

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

        const firstChild = document.createComment(`t${entry.template.hash}`)
        const content = document.importNode(entry.dom, true) as DocumentFragment
        const lastChild = document.createComment(`/t${entry.template.hash}`)

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
    case "attr": {
      const element = node as HTMLElement | SVGElement
      const attr = element.getAttributeNode(part.name) ?? ctx.document.createAttribute(part.name)
      const setAttr = makeAttributeValueSetter(element, attr)
      return renderValue(
        ctx,
        part.index,
        (value: unknown) => setAttr(renderToString(value, ""))
      )
    }
    case "boolean-part": {
      const element = node as HTMLElement | SVGElement
      return renderValue(
        ctx,
        part.index,
        (value: unknown) => element.toggleAttribute(part.name, !!value)
      )
    }
    case "className-part": {
      return renderValue(
        ctx,
        part.index,
        makeClassListSetter(node as HTMLElement | SVGElement)
      )
    }
    case "comment-part": {
      return renderValue(
        ctx,
        part.index,
        (value: unknown) => {
          ;(node as Comment).textContent = renderToString(value, "")
        }
      )
    }
    case "data": {
      return renderValue(
        ctx,
        part.index,
        makeDatasetSetter(node as HTMLElement | SVGElement)
      )
    }
    case "event": {
      const element = node as Element
      const value = ctx.values[part.index]
      if (isNullish(value)) return

      const eventHandler = EventHandler.fromEffectOrEventHandler(value).pipe(
        EventHandler.provide(ctx.services),
        EventHandler.catchCause(ctx.onCause)
      )

      ctx.eventSource.addEventListener(
        element,
        part.name,
        eventHandler
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
          return setupRenderProperties<E, R>(props as Record<string, unknown>, element, ctx)
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
      const setAttr = makeAttributeValueSetter(element, attr)
      const index = ++ctx.spreadIndex
      return Fx.tuple(
        ...part.nodes.map((node) => {
          if (node._tag === "text") return Fx.succeed(node.value)
          return liftRenderableToFx<E, R>(ctx.values[node.index]).pipe(Fx.map((_) => renderToString(_, "")))
        })
      ).pipe(
        Fx.observe((texts) => withCurrentRenderPriority(attr, index, ctx, () => setAttr(texts.join(""))))
      )
    }
    case "sparse-class-name": {
      const element = node as HTMLElement | SVGElement
      const setClassList = makeClassListSetter(element)
      const index = ++ctx.spreadIndex
      return Fx.tuple(
        ...part.nodes.map((node) => {
          if (node._tag === "text") return Fx.succeed(node.value)
          return liftRenderableToFx<E, R>(ctx.values[node.index])
        })
      ).pipe(
        Fx.observe((values) => withCurrentRenderPriority(setClassList, index, ctx, () => setClassList(values)))
      )
    }
    case "sparse-comment": {
      const comment = node as Comment
      const setCommentText = (value: unknown) => {
        comment.textContent = renderToString(value, "")
      }
      const index = ++ctx.spreadIndex
      return Fx.tuple(
        ...part.nodes.map((node) => {
          if (node._tag === "text") return Fx.succeed(node.value)
          return liftRenderableToFx<E, R>(ctx.values[node.index]).pipe(Fx.map((_) => renderToString(_, "")))
        })
      ).pipe(
        Fx.observe((texts) =>
          withCurrentRenderPriority(setCommentText, index, ctx, () => setCommentText(texts.join("")))
        )
      )
    }

    case "node": {
      const element = node as HTMLElement | SVGElement
      const comment = findHoleComment(element, part.index)

      let text: Text | null = null
      let nodes: Array<Node> = []

      const updateCommentText = (value: unknown) => {
        if (text === null) {
          text = ctx.document.createTextNode("")
          element.insertBefore(text, comment)
        }

        text.textContent = renderToString(value, "")
      }

      const updateNodes = (updatedNodes: Array<Node>) => {
        nodes = diffChildren(comment, nodes, updatedNodes, document)
      }

      return renderValue(
        ctx,
        part.index,
        (value: unknown) => {
          matchNodeValue(value, updateCommentText, updateNodes)
        }
      )
    }
    case "text-part": {
      const element = node as HTMLElement | SVGElement
      const setTextContent = (value: unknown) => {
        element.textContent = renderToString(value, "")
      }
      return renderValue(
        ctx,
        part.index,
        setTextContent
      )
    }
    case "sparse-text": {
      const element = node as HTMLElement | SVGElement
      const index = ++ctx.spreadIndex
      const setTextContent = (value: unknown) => {
        element.textContent = renderToString(value, "")
      }
      return Fx.tuple(
        ...part.nodes.map((node) => {
          if (node._tag === "text") return Fx.succeed(node.value)
          return liftRenderableToFx<E, R>(ctx.values[node.index]).pipe(Fx.map((_) => renderToString(_, "")))
        })
      ).pipe(
        Fx.observe((texts) =>
          withCurrentRenderPriority(setTextContent, index, ctx, () => setTextContent(texts.join("")))
        )
      )
    }
  }
}

function getClassList(value: unknown): ReadonlyArray<string> {
  if (isNullish(value)) {
    return []
  }
  if (Array.isArray(value)) {
    return value.flatMap(getClassList)
  }
  return splitClassNames(renderToString(value, ""))
}

const SPACE_REGEXP = /\s+/g

function splitClassNames(value: string) {
  return value.split(SPACE_REGEXP).flatMap((a) => {
    const trimmed = a.trim()
    return trimmed.length > 0 ? [trimmed] : []
  })
}

function renderValue<E, R>(
  ctx: TemplateContext,
  index: number,
  f: (value: unknown) => void
): void | Effect.Effect<unknown, E, R> {
  return matchRenderable(ctx.values[index], ctx, {
    Primitive: (value) => {
      f(value)
    },
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
    return matches.Fx(liftRenderableToFx(renderable))
  } else {
    return matches.Primitive(renderable)
  }
}

function makeAttributeValueSetter(element: HTMLElement | SVGElement, attr: Attr) {
  let isSet = false
  const setValue = (value: string | null | undefined) => {
    if (isNullish(value)) {
      element.removeAttribute(attr.name)
      isSet = false
    } else {
      attr.value = value
      if (isSet === false) {
        element.setAttributeNode(attr)
        isSet = true
      }
    }
  }

  return setValue
}

function makeClassListSetter(element: HTMLElement | SVGElement) {
  // We do double-bookeeping such that we don't assume we know everything about the classList
  // Other DOM-based libraries might have additional classes in the classList, so we need to allow them to exist
  // outside of our control.
  let classList: ReadonlyArray<string> = Array.from(element.classList)
  return (value: unknown) => {
    const classNames = getClassList(value)
    const { added, removed } = diffStrings(classList, classNames)
    if (added.length > 0) {
      element.classList.add(...added)
    }
    if (removed.length > 0) {
      element.classList.remove(...removed)
    }
    classList = classNames
  }
}

function makeDatasetSetter(element: HTMLElement | SVGElement) {
  // We do double-bookeeping such that we don't assume we know everything about the dataset
  // Other DOM-based libraries might have additional keys in the dataset, so we need to allow them to exist
  // outside of our control.
  const previous = { ...element.dataset }
  return (value: unknown) => {
    const diff = diffDataSet(previous, value as Record<string, string | undefined>)
    if (diff) {
      const { added, removed } = diff
      removed.forEach((k) => {
        delete element.dataset[k]
        delete previous[k]
      })
      added.forEach(([k, v]) => {
        element.dataset[k] = v
        previous[k] = v
      })
    }
  }
}

function setupRenderProperties<E = never, R = never>(
  properties: Record<string, unknown>,
  element: HTMLElement | SVGElement,
  ctx: TemplateContext<R>
): Effect.Effect<unknown, E, R> | void {
  const effects: Array<Effect.Effect<unknown, E, R>> = []
  for (const [key, value] of Object.entries(properties)) {
    const index = ctx.spreadIndex++
    const part = makePropertiesPart(keyToPartType(key), index)
    const effect = setupRenderPart(part, element, { ...ctx, values: { [index]: value, length: index + 1 } })
    if (effect !== undefined) {
      effects.push(effect)
    }
  }
  if (effects.length > 0) {
    return Effect.all(effects, { concurrency: "unbounded" })
  }
}

function diffStrings(
  previous: ReadonlyArray<string> | null | undefined,
  current: ReadonlyArray<string> | null | undefined
): { added: ReadonlyArray<string>; removed: ReadonlyArray<string>; unchanged: ReadonlyArray<string> } {
  if (previous == null || previous.length === 0) {
    return {
      added: current || [],
      removed: [],
      unchanged: []
    }
  } else if (current == null || current.length === 0) {
    return {
      added: [],
      removed: previous,
      unchanged: []
    }
  } else {
    const added = current.filter((c) => !previous.includes(c))
    const removed: Array<string> = []
    const unchanged: Array<string> = []

    for (let i = 0; i < previous.length; ++i) {
      if (current.includes(previous[i])) {
        unchanged.push(previous[i])
      } else {
        removed.push(previous[i])
      }
    }

    return {
      added,
      removed,
      unchanged
    }
  }
}

function diffDataSet(
  a: Record<string, string | undefined> | null | undefined,
  b: Record<string, string | undefined> | null | undefined
):
  | { added: Array<readonly [string, string | undefined]>; removed: ReadonlyArray<string> }
  | null
{
  if (!a) return b ? { added: Object.entries(b), removed: [] } : null
  if (!b) return { added: [], removed: Object.keys(a) }

  const { added, removed, unchanged } = diffStrings(Object.keys(a), Object.keys(b))

  return {
    added: added.concat(unchanged).map((k) => [k, b[k]] as const),
    removed
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
  readonly parentScope: Scope.Scope
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
  spreadIndex: number

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
    const parentScope: Scope.Scope = ServiceMap.get(services, Scope.Scope)
    const scope: Scope.Closeable = yield* Scope.fork(parentScope)
    const eventSource: EventSource = makeEventSource()
    const ctx: TemplateContext<Renderable.Services<Values[number]> | RSink | Scope.Scope> = {
      services,
      document,
      renderQueue,
      disposables: new Set(),
      eventSource,
      parentScope,
      refCounter,
      scope,
      values,
      onCause: flow(onCause, Effect.provideService(Scope.Scope, scope), Effect.provideServices(services)),
      expected: 0,
      spreadIndex: values.length,
      manyKey: undefined
    }

    yield* Scope.addFinalizer(scope, Effect.sync(() => ctx.disposables.forEach(dispose)))

    return ctx
  }
)

function findHoleComment(parent: Element, index: number) {
  const childNodes = parent.childNodes

  for (let i = 0; i < childNodes.length; ++i) {
    const node = childNodes[i]

    if (node.nodeType === 8 && node.nodeValue === `/n_${index}`) {
      return node as Comment
    }
  }

  throw new CouldNotFindCommentError(index)
}

function liftRenderableToFx<E = never, R = never>(
  renderable: Renderable<any, E, R>
): Fx.Fx<any, E, R> {
  switch (typeof renderable) {
    case "undefined":
    case "object": {
      if (isNullish(renderable)) {
        return Fx.succeed(null)
      } else if (Array.isArray(renderable)) {
        return Fx.tuple(...renderable.map(liftRenderableToFx<E, R>))
      } else if (Effect.isEffect(renderable)) {
        return Fx.unwrap(
          Effect.map(renderable, liftRenderableToFx<E, R>)
        )
      } else if (Fx.isFx(renderable)) {
        return renderable
      } else return Fx.succeed(renderable)
    }
    default:
      return Fx.succeed(renderable)
  }
}

function matchNodeValue<A, B>(value: unknown, onText: (text: string) => A, onNodes: (nodes: Array<Node>) => B): A | B {
  switch (typeof value) {
    // primitives are handled as text content
    case "string":
    case "symbol":
    case "number":
    case "bigint":
    case "boolean":
      return onText(String(value))
    case "undefined":
    case "object": {
      if (!value) {
        return onNodes([])
      } else if (Array.isArray(value)) {
        // arrays can be used to cleanup, if empty
        if (value.length === 0) return onNodes([])
        // or diffed, if these contains nodes or "wires"
        else if (value.some((x) => typeof x === "object")) {
          return onNodes(value.flatMap(renderEventToArray))
        } // in all other cases the content is stringified as is
        else return onText(String(value))
      } else {
        return onNodes(renderEventToArray(value))
      }
    }
    case "function":
      return onNodes([])
  }
}

function renderEventToArray(x: unknown): Array<Node> {
  if (x === null || x === undefined) return []
  if (isRenderEvent(x)) {
    const value = x.valueOf()
    return Array.isArray(value) ? value : [value as Node]
  }

  return [x as Node]
}

function diffChildren(
  comment: Comment,
  currentNodes: Array<Node>,
  nextNodes: Array<Node>,
  document: Document
) {
  return udomdiff(
    comment.parentNode!,
    currentNodes,
    nextNodes,
    diffable(document),
    comment
  )
}

function addDisposable(ctx: TemplateContext, disposable: Disposable) {
  ctx.disposables.add(disposable)
  return () => ctx.disposables.delete(disposable)
}

function dispose(disposable: Disposable) {
  disposable[Symbol.dispose]()
}
