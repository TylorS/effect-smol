import udomdiff from "udomdiff"
import type { Cause } from "../../Cause.ts"
import { isNullish } from "../../data/Predicate.ts"
import * as Effect from "../../Effect.ts"
import { dual, flow } from "../../Function.ts"
import * as Layer from "../../Layer.ts"
import * as Scope from "../../Scope.js"
import * as ServiceMap from "../../ServiceMap.ts"
import * as Fx from "../fx/index.js"
import { type IndexRefCounter, makeRefCounter } from "../fx/internal/IndexRefCounter.ts"
import { CouldNotFindCommentError } from "./errors.ts"
import type { EventHandler } from "./EventHandler.ts"
import { type EventSource, makeEventSource } from "./EventSource.ts"
import { buildTemplateFragment } from "./internal/buildTemplateFragement.ts"
import { renderToString } from "./internal/encoding.ts"
import { findPath, type ParentChildNodes } from "./internal/ParentChildNodes.ts"
import { parse } from "./internal/Parser.ts"
import { diffable, PersistentDocumentFragment } from "./PersistentDocumentFragment.ts"
import type { Renderable } from "./Renderable.ts"
import { DomRenderEvent, isRenderEvent, type RenderEvent } from "./RenderEvent.ts"
import { RenderTemplate } from "./RenderTemplate.ts"
import type * as Template from "./Template.ts"

// Can be utilized to override the document for rendering
export const RenderDocument = ServiceMap.Reference<Document>("RenderDocument", { defaultValue: () => document })

export const DomRenderTemplate = Object.assign(
  Layer.effect(
    RenderTemplate,
    Effect.gen(function*() {
      const document = yield* RenderDocument
      const entries = new WeakMap<TemplateStringsArray, { template: Template.Template; fragment: DocumentFragment }>()
      const getEntry = (templateStrings: TemplateStringsArray) => {
        let entry = entries.get(templateStrings)
        if (entry === undefined) {
          const template = parse(templateStrings)
          entry = { template, fragment: buildTemplateFragment(document, template) }
          entries.set(templateStrings, entry)
        }

        const firstChild = document.createComment(`t${entry.template.hash}`)
        const content = entry.fragment.cloneNode(true) as DocumentFragment
        const lastChild = document.createComment(`/t${entry.template.hash}`)

        return {
          template: entry.template,
          firstChild,
          content,
          lastChild
        } as const
      }

      // TODO: Use a render queue?? Use a fiber to dequeue?

      return <const Values extends ReadonlyArray<Renderable.Any>>(
        templateStrings: TemplateStringsArray,
        ...values: Values
      ): Fx.Fx<RenderEvent, Renderable.Error<Values[number]>, Renderable.Services<Values[number]> | Scope.Scope> =>
        Fx.make(Effect.fn(function*(sink) {
          const { content, firstChild, lastChild, template } = getEntry(templateStrings)
          const ctx = yield* makeTemplateContext(document, values, sink.onFailure)
          const effects = setupRenderParts(template.parts, content, ctx)

          if (effects.length > 0) {
            yield* Effect.forEach(effects, flow(Effect.catchCause(ctx.onCause), Effect.forkIn(ctx.scope)))
          }

          if (ctx.expected > 0 && (yield* ctx.refCounter.expect(ctx.expected))) {
            yield* ctx.refCounter.wait
          }

          const rendered = content.childNodes.length > 1
            ? new PersistentDocumentFragment(firstChild, content, lastChild)
            : content.childNodes[0] as Node

          // Setup our event listeners for our rendered content.
          yield* ctx.eventSource.setup(rendered, ctx.scope)

          // Emit just once
          yield* sink.onSuccess(DomRenderEvent(rendered))

          // Ensure our templates last forever in the DOM environment
          // so event listeners are kept attached to the current Scope.
          return yield* Effect.never.pipe(
            // Close our scope whenever the current Fiber is interrupted
            Effect.onExit((exit) => Scope.close(ctx.scope, exit))
          )
        }))
    })
  ),
  {
    using: (document: Document) => DomRenderTemplate.pipe(Layer.provide(Layer.succeed(RenderDocument, document)))
  }
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
    const effect = setupRenderPart(part, content, path, ctx)
    if (effect !== undefined) {
      effects.push(effect)
    }
  }

  return effects
}

function setupRenderPart<E = never, R = never>(
  part: Template.PartNode | Template.SparsePartNode,
  content: ParentChildNodes,
  path: ReadonlyArray<number>,
  ctx: TemplateContext
): Effect.Effect<unknown, E, R> | void {
  const node = findPath(content, path)

  switch (part._tag) {
    case "attr": {
      const element = node as HTMLElement | SVGElement
      const attr = element.getAttributeNode(part.name) ?? ctx.document.createAttribute(part.name)
      const setAttr = makeAttributeValueSetter(element, attr)
      return renderValue(ctx.values[part.index], (value: unknown) => setAttr(renderToString(value, "")))
    }
    case "boolean-part": {
      const element = node as HTMLElement | SVGElement
      return renderValue(ctx.values[part.index], (value: unknown) => element.toggleAttribute(part.name, !!value))
    }
    case "className-part": {
      const element = node as HTMLElement | SVGElement

      const update = makeClassListSetter(element)
      return renderValue(ctx.values[part.index], (value: unknown) => {
        update(value)
      })
    }
    case "comment-part": {
      const comment = node as Comment
      return renderValue(ctx.values[part.index], (value: unknown) => {
        comment.textContent = renderToString(value, "")
      })
    }
    case "data": {
      const element = node as HTMLElement | SVGElement
      return renderValue(ctx.values[part.index], (value: unknown) => {
        const diff = diffDataSet(element.dataset, value as Record<string, string | undefined>)
        if (diff) {
          const { added, removed } = diff
          removed.forEach((k) => delete element.dataset[k])
          added.forEach(([k, v]) => element.dataset[k] = v)
        }
      })
    }
    case "event": {
      return ctx.eventSource.addEventListener(node as Element, part.name, ctx.values[part.index] as EventHandler)
    }
    case "property": {
      const element = node as HTMLElement | SVGElement
      return renderValue(ctx.values[part.index], (value: unknown) => {
        ;(element as any)[part.name] = value
      })
    }
    case "properties": {
      return // TODO: Implement this
    }
    case "ref": {
      return // TODO: Implement this
    }
    case "sparse-attr": {
      const element = node as HTMLElement | SVGElement
      const attr = element.getAttributeNode(part.name) ?? ctx.document.createAttribute(part.name)
      const setAttr = makeAttributeValueSetter(element, attr)
      return Fx.tuple(
        ...part.nodes.map((node) => {
          if (node._tag === "text") return Fx.succeed(node.value)
          return liftRenderableToFx<E, R>(ctx.values[node.index]).pipe(Fx.map((_) => renderToString(_, "")))
        })
      ).pipe(
        Fx.observe((texts) => Effect.sync(() => setAttr(texts.join(""))))
      )
    }
    case "sparse-class-name": {
      const element = node as HTMLElement | SVGElement

      let classList: ReadonlyArray<string> = Array.from(element.classList)
      const update = (value: unknown) => {
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

      return Fx.tuple(
        ...part.nodes.map((node) => {
          if (node._tag === "text") return Fx.succeed(node.value)
          return liftRenderableToFx<E, R>(ctx.values[node.index]).pipe(Fx.map(update))
        })
      ).pipe(Fx.observe((texts) => Effect.sync(() => update(texts.join(" ")))))
    }
    case "sparse-comment": {
      const comment = node as Comment
      return Fx.tuple(
        ...part.nodes.map((node) => {
          if (node._tag === "text") return Fx.succeed(node.value)
          return liftRenderableToFx<E, R>(ctx.values[node.index]).pipe(Fx.map((_) => renderToString(_, "")))
        })
      ).pipe(
        Fx.observe((texts) =>
          Effect.sync(() => {
            comment.textContent = texts.join("")
          })
        )
      )
    }

    case "node": {
      const element = node as HTMLElement | SVGElement
      const comment = findHoleComment(element, part.index)

      let text: Text | null = null
      let nodes: Array<Node> = []

      return renderValue(ctx.values[part.index], (value: unknown) => {
        matchNodeValue(value, (content) => {
          if (text === null) {
            text = ctx.document.createTextNode("")
          }

          text.textContent = content
        }, (updatedNodes) => {
          nodes = diffChildren(comment, nodes, updatedNodes, document)
        })
      })
    }
    case "text-part": {
      const element = node as HTMLElement | SVGElement
      return renderValue(ctx.values[part.index], (value: unknown) => {
        element.textContent = renderToString(value, "")
      })
    }
    case "sparse-text": {
      const element = node as HTMLElement | SVGElement
      return Fx.tuple(
        ...part.nodes.map((node) => {
          if (node._tag === "text") return Fx.succeed(node.value)
          return liftRenderableToFx<E, R>(ctx.values[node.index]).pipe(Fx.map((_) => renderToString(_, "")))
        })
      ).pipe(
        Fx.observe((texts) =>
          Effect.sync(() => {
            element.textContent = texts.join("")
          })
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
  renderable: Renderable.Any,
  f: (value: unknown) => unknown
): void | Effect.Effect<unknown, E, R> {
  return matchRenderable(renderable, {
    Primitive: (value) => {
      f(value)
    },
    Effect: (effect) => Effect.tap(effect, f),
    Fx: (fx) =>
      Fx.observe(fx, (value) => {
        f(value)
      })
  })
}

function matchRenderable<X, A, B, C>(
  renderable: Renderable.Any,
  matches: {
    Primitive: (value: X) => A
    Effect: (effect: Effect.Effect<X>) => B
    Fx: (fx: Fx.Fx<X>) => C
  }
): A | B | C {
  if (Fx.isFx(renderable)) {
    return matches.Fx(renderable as any)
  } else if (Effect.isEffect(renderable)) {
    return matches.Effect(renderable as any)
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

type TemplateContext = {
  readonly document: Document
  readonly eventSource: EventSource
  readonly parentScope: Scope.Scope
  readonly refCounter: IndexRefCounter
  readonly scope: Scope.Closeable
  readonly values: ReadonlyArray<Renderable<any, any>>
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

function makeTemplateContext<Values extends ReadonlyArray<Renderable.Any>, RSink = never>(
  document: Document,
  values: Values,
  onCause: (cause: Cause<Renderable.Error<Values[number]>>) => Effect.Effect<unknown, never, RSink>
) {
  return Effect.gen(function*() {
    const services = yield* Effect.services<Renderable.Services<Values[number]> | RSink | Scope.Scope>()
    const refCounter = yield* makeRefCounter
    const parentScope = ServiceMap.get(services, Scope.Scope)
    const scope = yield* Scope.fork(parentScope)
    const eventSource = makeEventSource()
    const ctx: TemplateContext = {
      document,
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
    return ctx
  })
}

function findHoleComment(parent: Element, index: number) {
  const childNodes = parent.childNodes

  for (let i = 0; i < childNodes.length; ++i) {
    const node = childNodes[i]

    if (node.nodeType === 8 && node.nodeValue === `hole${index}`) {
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
