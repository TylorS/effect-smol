# Typed: Reactive Applications with Effect

Welcome to **Typed**, a set of libraries for building reactive applications using Effect. 

If you are a TypeScript developer looking to build robust, type-safe, and reactive applications (web, backend, or CLI), you are in the right place.

## The Learning Path

We have designed a progressive learning path to take you from basic concepts to building full reactive UIs.

### 1. The Foundation: [Fx](FX.md)

Everything in Typed starts with **Fx**. 

If you know `Promise` or `Effect`, you know how to handle *one* value. **Fx** is how you handle *streams* of values over time.

- **What it is**: A type-safe reactive stream (like RxJS Observables but simpler).
- **Why learn it**: It's the backbone of all reactivity in Typed.
- **Key concepts**: Emitting values, transforming streams (`map`, `filter`), and handling errors.

[👉 Start Learning Fx](FX.md)

### 2. Mutable State: [RefSubject](REFSUBJECT.md)

Once you can handle streams, you need to manage state. **RefSubject** is your reactive variable.

- **What it is**: A mutable value that emits updates when it changes.
- **Like**: React's `useState` + Observables.
- **Use for**: User input, app state, configuration.

[👉 Start Learning RefSubject](REFSUBJECT.md)

### 3. Derived State: [Computed](COMPUTED.md)

Efficient apps don't recompute everything constantly. **Computed** allows you to derive values that automatically update only when needed.

- **What it is**: A read-only value derived from other reactive sources.
- **Like**: React's `useMemo` or MobX computed values.
- **Use for**: Filtering lists, calculating totals, transforming state for UI.

[👉 Start Learning Computed](COMPUTED.md)

### 4. Building UIs: [Template](TEMPLATE.md)

Finally, bring it all together to build user interfaces. **Template** uses Fx, RefSubject, and Computed to render HTML.

- **What it is**: A reactive HTML template system.
- **Like**: React (JSX) or lit-html.
- **Use for**: Building web applications with fine-grained reactivity.

[👉 Start Learning Template](TEMPLATE.md)

## Why Typed?

Typed is built on **Effect**, which provides:

- **Type Safety**: End-to-end type inference.
- **Error Handling**: Errors are values, not exceptions.
- **Concurrency**: Built-in fiber-based concurrency model.
- **Resource Management**: Automatic cleanup of event listeners and subscriptions.

## Quick Example

Here is a glimpse of how these pieces fit together:

```ts
import { Effect, Layer } from "effect"
import { html } from "effect/typed/template"
import { render, DomRenderTemplate } from "effect/typed/template/Render"
import * as RefSubject from "effect/typed/fx/RefSubject"

// 1. Define State (RefSubject)
const program = Effect.gen(function* () {
  const count = yield* RefSubject.make(0)

  // 2. Derive State (Computed)
  const double = RefSubject.map(count, (n) => n * 2)

  // 3. Define UI (Template)
  const template = html`
    <div>
      <h1>Count: ${count}</h1>
      <h2>Double: ${double}</h2>
      <button onclick=${RefSubject.increment(count)}>Increment</button>
    </div>
  `

  // 4. Render
  yield* render(template, document.body).pipe(
    Layer.provide(DomRenderTemplate),
    Layer.launch
  )
})

Effect.runPromise(program)
```

## Next Steps

Start with the [Fx Guide](FX.md) to understand the core reactive primitive, then move through the sections to build your mastery.

