import * as Cause from "../../Cause.js"
import { getOrUndefined, isNone, isOption } from "../../data/Option.ts"
import { isFunction, isNullish, isObject } from "../../data/Predicate.ts"
import { map as mapRecord } from "../../data/Record.ts"
import * as Effect from "../../Effect.ts"
import { constVoid, dual, flow, identity } from "../../Function.ts"
import * as Layer from "../../Layer.ts"
import * as Scope from "../../Scope.js"
import * as ServiceMap from "../../ServiceMap.ts"
import * as Fx from "../fx/index.ts"
import { type IndexRefCounter, makeRefCounter } from "../fx/internal/IndexRefCounter.ts"
import * as Sink from "../fx/sink/index.ts"
import { CouldNotFindCommentError, isHydrationError } from "./errors.ts"
import * as EventHandler from "./EventHandler.ts"
import { type EventSource, makeEventSource } from "./EventSource.ts"
import { HydrateContext, makeHydrateContext } from "./HydrateContext.ts"
import { buildTemplateFragment } from "./internal/buildTemplateFragement.ts"
import {
  findHoleComment,
  getClassList,
  makeAttributeValueUpdater,
  makeBooleanUpdater,
  makeClassListUpdater,
  makeDatasetUpdater,
  makeNodeUpdater,
  makeTextContentUpdater
} from "./internal/dom.ts"
import { renderToString } from "./internal/encoding.ts"
import type { HydrationHole, HydrationNode, HydrationTemplate } from "./internal/hydration.ts"
import {
  findHydratePath,
  findHydrationHole,
  findHydrationTemplateByHash,
  getChildNodes,
  getRendered
} from "./internal/hydration.ts"
import { keyToPartType } from "./internal/keyToPartType.ts"
import { findPath } from "./internal/ParentChildNodes.ts"
import { parse } from "./internal/Parser.ts"
import type { Renderable } from "./Renderable.ts"
import { DomRenderEvent, type RenderEvent } from "./RenderEvent.ts"
import * as RQ from "./RenderQueue.ts"
import { RenderTemplate } from "./RenderTemplate.ts"
import * as Template from "./Template.ts"
import { getAllSiblingsBetween, isText, persistent, type Rendered } from "./Wire.ts"

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
      const templateCache = new WeakMap<TemplateStringsArray, Template.Template>()
      const getTemplate = (templateStrings: TemplateStringsArray) => {
        let template = templateCache.get(templateStrings)
        if (template === undefined) {
          template = parse(templateStrings)
          templateCache.set(templateStrings, template)
        }
        return template
      }
      const entries = new WeakMap<TemplateStringsArray, {
        template: Template.Template
        fragment: DocumentFragment
      }>()
      const getEntry = (templateStrings: TemplateStringsArray) => {
        let entry = entries.get(templateStrings)
        if (entry === undefined) {
          const template = getTemplate(templateStrings)
          const fragment = buildTemplateFragment(document, template)
          entry = { template, fragment }
          entries.set(templateStrings, entry)
        }
        return entry
      }

      return <const Values extends ArrayLike<Renderable.Any>>(
        templateStrings: TemplateStringsArray,
        values: Values
      ): Fx.Fx<RenderEvent, Renderable.Error<Values[number]>, Renderable.Services<Values[number]> | Scope.Scope> =>
        Fx.make<RenderEvent, Renderable.Error<Values[number]>, Renderable.Services<Values[number]> | Scope.Scope>(
          function render<RSink = never>(
            sink: Sink.Sink<RenderEvent, Renderable.Error<Values[number]>, RSink>
          ): Effect.Effect<
            unknown,
            never,
            Renderable.Services<Values[number]> | Scope.Scope | RSink
          > {
            return Effect.gen(
              function*() {
                const entry = getEntry(templateStrings)
                const template = entry.template
                const fragment = document.importNode(entry.fragment, true)
                const ctx = yield* makeTemplateContext<Values, RSink>(document, values, sink.onFailure)

                return yield* Effect.gen(function*() {
                  const hydration = attemptHydration(ctx, template.hash)

                  let effects: Array<Effect.Effect<void, any, any>>
                  let rendered: Rendered | undefined

                  if (hydration) {
                    const { hydrateCtx, where } = hydration
                    effects = setupHydrationParts(template.parts, {
                      ...ctx,
                      hydrateContext: hydrateCtx,
                      where,
                      makeHydrateContext: (where: HydrationNode): HydrateContext => ({
                        where,
                        hydrate: true
                      })
                    })

                    rendered = getRendered(where)
                  } else {
                    effects = setupRenderParts(
                      template.parts.map(([part, path]) => [part, findPath(fragment, path)]),
                      ctx
                    )
                  }

                  if (effects.length > 0) {
                    yield* Effect.all(effects.map(flow(Effect.catchCause(ctx.onCause), Effect.forkIn(ctx.scope))))

                    if (ctx.expected > 0 && ctx.refCounter.expect(ctx.expected)) {
                      yield* ctx.refCounter.wait
                    }
                  }

                  if (rendered === undefined) {
                    // If we have more than one child, we need to wrap them in a PersistentDocumentFragment
                    // so they can be diffed within other templates more than once.
                    rendered = persistent(document, template.hash, fragment)
                  }

                  // Setup our event listeners for our rendered content.
                  yield* ctx.eventSource.setup(rendered, ctx.scope)

                  // If we're hydrating, we need to mark this part of the stack as hydrated
                  if (hydration !== undefined) {
                    hydration.hydrateCtx.hydrate = false
                  }

                  // Emit just once
                  yield* sink.onSuccess(DomRenderEvent(rendered))

                  // Ensure our templates last forever in the DOM environment
                  // so event listeners are kept attached to the current Scope.
                  return yield* Effect.never.pipe(
                    // Close our scope whenever the current Fiber is interrupted
                    Effect.onExit((exit) => Scope.close(ctx.scope, exit))
                  )
                }).pipe(
                  Effect.catchDefect((defect) => {
                    // If we are hydrating and we have a hydration error, we need to re-render the template without hydration
                    if (ctx.hydrateContext && ctx.hydrateContext.hydrate && isHydrationError(defect)) {
                      ctx.hydrateContext.hydrate = false
                      return render(sink)
                    }
                    return sink.onFailure(Cause.die(defect))
                  })
                )
              }
            )
          }
        )
    })
  ),
  {
    using: (document: Document) => DomRenderTemplate.pipe(Layer.provide(Layer.succeed(RenderDocument, document)))
  } as const
)

export type ToRendered<T extends RenderEvent | null> = Rendered | (T extends null ? null : never)

export const render: {
  (where: HTMLElement): <A extends RenderEvent | null, E, R>(
    fx: Fx.Fx<A, E, R>
  ) => Fx.Fx<ToRendered<A>, E, R>
  <A extends RenderEvent | null, E, R>(
    fx: Fx.Fx<A, E, R>,
    where: HTMLElement
  ): Fx.Fx<ToRendered<A>, E, R>
} = dual(2, function render<T extends RenderEvent | null, R, E>(
  rendered: Fx.Fx<T, E, R>,
  rootElement: HTMLElement
): Fx.Fx<ToRendered<T>, E, R> {
  return Fx.provide(
    Fx.mapEffect(rendered, (what) => attachRoot(rootElement, what)),
    Layer.syncServices(() => makeHydrateContext(rootElement))
  )
})

const renderCache = new WeakMap<HTMLElement, Rendered>()
function attachRoot<A extends RenderEvent | null>(
  where: HTMLElement,
  what: A // TODO: Should we support HTML RenderEvents here too?,
): Effect.Effect<ToRendered<A>> {
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
  parts: ReadonlyArray<
    readonly [part: Template.PartNode | Template.SparsePartNode, node: Node]
  >,
  ctx: TemplateContext
): Array<Effect.Effect<unknown>> {
  const effects: Array<Effect.Effect<unknown>> = []
  for (const [part, node] of parts) {
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
      return renderValue(
        ctx,
        part.index,
        makeNodeUpdater(ctx.document, findHoleComment(node as HTMLElement | SVGElement, part.index))
      )
    }
    case "attr": {
      const element = node as HTMLElement | SVGElement
      const setAttr = makeAttributeValueUpdater(
        element,
        element.getAttributeNode(part.name) ?? ctx.document.createAttribute(part.name)
      )
      return renderValue(
        ctx,
        part.index,
        (value) => setAttr(renderToString(value, ""))
      )
    }
    case "boolean-part": {
      const updater = makeBooleanUpdater(node as HTMLElement | SVGElement, part.name)
      return renderValue(ctx, part.index, (value) => updater(!!value))
    }
    case "className-part": {
      const updater = makeClassListUpdater(node as HTMLElement | SVGElement)
      return renderValue(ctx, part.index, (value) => updater(getClassList(value)))
    }
    case "comment-part":
      return renderValue(ctx, part.index, makeTextContentUpdater(node as Comment))
    case "data":
      return setupDataset<E, R>(node as HTMLElement | SVGElement, ctx, part.index)
    case "event":
      return setupEventHandler(node as Element, ctx, part.index, part.name)
    case "property":
      return renderValue(ctx, part.index, setupPropertSetter(node as HTMLElement | SVGElement, part.name))
    case "properties":
      return setupProperties<E, R>(node as HTMLElement | SVGElement, ctx, part.index)
    case "ref":
      return setupRef<R>(node as HTMLElement | SVGElement, ctx, part.index)
    case "sparse-attr": {
      const element = node as HTMLElement | SVGElement
      const attr = element.getAttributeNode(part.name) ?? ctx.document.createAttribute(part.name)
      return renderSparseTextContent(
        element,
        part.nodes,
        ++ctx.dynamicIndex,
        ctx,
        makeAttributeValueUpdater(element, attr)
      )
    }
    case "sparse-class-name": {
      const updater = makeClassListUpdater(node as HTMLElement | SVGElement)
      return renderSparsePart(
        part.nodes,
        ++ctx.dynamicIndex,
        ctx,
        (classNames) => updater(getClassList(classNames)),
        (value) => value
      )
    }
    case "sparse-comment":
      return renderSparseTextContent(node as Comment, part.nodes, ++ctx.dynamicIndex, ctx)
    case "text-part":
      return renderValue(ctx, part.index, makeTextContentUpdater(node as HTMLElement | SVGElement))
    case "sparse-text":
      return renderSparseTextContent(node as HTMLElement | SVGElement, part.nodes, ++ctx.dynamicIndex, ctx)
  }
}

type HydrateTemplateContext<R = never> = TemplateContext<R> & {
  where: HydrationNode
  makeHydrateContext: (where: HydrationNode) => HydrateContext
}

function setupHydrationParts<E, R>(
  parts: Template.Template["parts"],
  ctx: HydrateTemplateContext<R>
): Array<Effect.Effect<unknown, E, R>> {
  const effects: Array<Effect.Effect<unknown, E, R>> = []
  for (const [part, path] of parts) {
    const effect = setupHydrationPart<E, R>(part, path, ctx)
    if (effect !== undefined) {
      effects.push(effect)
    }
  }

  return effects
}

function setupHydrationPart<E, R>(
  part: Template.PartNode | Template.SparsePartNode,
  path: ReadonlyArray<number>,
  ctx: HydrateTemplateContext<R>
): Effect.Effect<unknown, E, R> | void {
  switch (part._tag) {
    case "node": {
      const hole = findHydrationHole(getChildNodes(ctx.where), part.index)
      if (hole === null) throw new CouldNotFindCommentError(part.index)
      return setupHydratedNodePart(part, hole, ctx)
    }
    default:
      return setupRenderPart(part, findHydratePath(ctx.where, path), ctx)
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
  ).pipe(
    Fx.observe((values) => withCurrentRenderPriority(f, index, ctx, () => f(values)))
  )
}

function renderSparseTextContent<E, R>(
  node: Node,
  nodes: Template.SparsePartNode["nodes"],
  index: number,
  ctx: TemplateContext<R>,
  onTextContent: (value: string) => void = makeTextContentUpdater(node)
): Effect.Effect<unknown, E, R> {
  return renderSparsePart(
    nodes,
    index,
    ctx,
    (texts) => onTextContent(texts.join("")),
    (value) => renderToString(value, "")
  )
}

function renderValue<E, R, X>(
  ctx: TemplateContext,
  index: number,
  f: (value: unknown) => X
): void | X | Effect.Effect<unknown, E, R> {
  return matchRenderable(ctx.values[index], {
    Primitive: f,
    Effect: (effect) => {
      ctx.expected++
      return effect.pipe(Effect.tap((value) => withCurrentRenderPriority(f, index, ctx, () => f(value))))
    },
    Fx: (fx) => {
      ctx.expected++
      return fx.run(Sink.make(ctx.onCause, (value) => withCurrentRenderPriority(f, index, ctx, () => f(value))))
    }
  })
}

function matchRenderable<X, A, B, C>(
  renderable: Renderable.Any,
  matches: {
    Primitive: (value: X) => A
    Effect: (effect: Effect.Effect<X>) => B
    Fx: (fx: Fx.Fx<X>) => C
  }
): A | B | C | void {
  if (isNullish(renderable)) return
  else if (Fx.isFx(renderable)) {
    return matches.Fx(renderable as any)
  } else if (Effect.isEffect(renderable)) {
    return matches.Effect(renderable as any)
  } else if (Array.isArray(renderable)) {
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
    ctx.expected += effects.length
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

export type TemplateContext<R = never> = {
  readonly document: Document
  readonly renderQueue: RQ.RenderQueue
  readonly disposables: Set<Disposable>
  readonly eventSource: EventSource
  readonly refCounter: IndexRefCounter
  readonly scope: Scope.Closeable
  readonly values: ArrayLike<Renderable<any, any, any>>
  readonly services: ServiceMap.ServiceMap<R | Scope.Scope>
  readonly onCause: (cause: Cause.Cause<any>) => Effect.Effect<unknown>

  /**
   * @internal
   */
  expected: number
  /**
   * @internal
   */
  dynamicIndex: number

  readonly hydrateContext: HydrateContext | undefined
}

const makeTemplateContext = Effect.fn(
  function*<Values extends ArrayLike<Renderable.Any>, RSink = never>(
    document: Document,
    values: Values,
    onCause: (cause: Cause.Cause<Renderable.Error<Values[number]>>) => Effect.Effect<unknown, never, RSink>
  ) {
    const renderQueue: RQ.RenderQueue = yield* RenderQueue
    const services: ServiceMap.ServiceMap<Renderable.Services<Values[number]> | RSink | Scope.Scope> = yield* Effect
      .services<Renderable.Services<Values[number]> | RSink | Scope.Scope>()
    const refCounter: IndexRefCounter = yield* makeRefCounter
    const scope: Scope.Closeable = yield* Scope.fork(ServiceMap.get(services, Scope.Scope))
    const eventSource: EventSource = makeEventSource()
    const servicesWithScope = ServiceMap.add(services, Scope.Scope, scope)
    const hydrateContext = ServiceMap.getOption(services, HydrateContext)
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
      hydrateContext: getOrUndefined(hydrateContext)
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

export function attemptHydration(
  ctx: TemplateContext,
  hash: string
): { readonly where: HydrationTemplate; readonly hydrateCtx: HydrateContext } | undefined {
  if (ctx.hydrateContext && ctx.hydrateContext.hydrate) {
    const where = findHydrationTemplateByHash(ctx.hydrateContext, hash)
    if (where === null) {
      ctx.hydrateContext.hydrate = false
      return
    } else {
      return { where, hydrateCtx: ctx.hydrateContext }
    }
  }
}

function setupEventHandler(element: Element, ctx: TemplateContext, index: number, name: string) {
  const value = ctx.values[index]
  if (isNullish(value)) return
  ctx.eventSource.addEventListener(
    element,
    name,
    EventHandler.fromEffectOrEventHandler(value).pipe(
      EventHandler.provide(ctx.services),
      EventHandler.catchCause(ctx.onCause)
    )
  )
}

function setupDataset<E, R>(
  element: HTMLElement | SVGElement,
  ctx: TemplateContext<R>,
  index: number
): Effect.Effect<unknown, E, R> | void {
  const value = ctx.values[index]
  if (isNullish(value)) return
  // Special case to convert sync object to data-* attributes
  if (isObject(value)) {
    const effects: Array<Effect.Effect<unknown, E, R>> = []
    for (const [k, v] of Object.entries(value)) {
      const index = ctx.dynamicIndex++
      const part = makePropertiesPart(["attr", `data-${k}`], index)
      const effect = setupRenderPart<E, R>(part, element, { ...ctx, values: makeArrayLike(index, v) })
      if (effect !== undefined) {
        effects.push(effect)
      }
    }

    ctx.expected += effects.length

    return Effect.all(effects, { concurrency: "unbounded" })
  }
  return renderValue(ctx, index, makeDatasetUpdater(element))
}

function setupProperties<E, R>(element: HTMLElement | SVGElement, ctx: TemplateContext<R>, index: number) {
  const setupIfObject = (props: unknown) => {
    if (isObject(props)) {
      return setupRenderProperties<E, R>(
        props as Record<string, unknown>,
        element,
        ctx
      )
    }
  }

  return matchRenderable(ctx.values[index], {
    Primitive: setupIfObject,
    Effect: Effect.tap(setupIfObject),
    Fx: flow(
      Fx.switchMapEffect((props) => setupIfObject(props) || Effect.void),
      Fx.drain,
      Effect.provideService(Scope.Scope, ctx.scope)
    )
  })
}

function setupRef<R>(element: HTMLElement | SVGElement, ctx: TemplateContext<R>, index: number) {
  const renderable = ctx.values[index]
  if (isNullish(renderable)) return
  if (isFunction(renderable)) {
    return matchRenderable(renderable(element), { Primitive: constVoid, Effect: identity, Fx: Fx.drain })
  }
  throw new Error("Invalid value provided to ref part")
}

function setupPropertSetter(element: Element, name: string) {
  return (value: unknown) => {
    ;(element as any)[name] = value
  }
}

function setupHydratedNodePart<E, R>(
  part: Template.NodePart,
  hole: HydrationHole,
  ctx: HydrateTemplateContext<R>
): Effect.Effect<unknown, E, R> | void {
  const nestedCtx = ctx.makeHydrateContext(hole)
  const previousNodes = getAllSiblingsBetween(hole.startComment, hole.endComment)
  const text = previousNodes.length === 3 && isText(previousNodes[1])
    ? previousNodes[1]
    : null

  const effect = renderValue<E, R, void>(
    ctx,
    part.index,
    makeNodeUpdater(
      ctx.document,
      hole.endComment,
      text,
      text === null ? previousNodes : [hole.startComment, text, hole.endComment]
    )
  )
  if (effect === undefined) return
  return Effect.provideService(effect, HydrateContext, nestedCtx)
}
