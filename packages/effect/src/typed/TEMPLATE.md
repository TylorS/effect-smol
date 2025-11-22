# Template: Building Reactive UIs with Effect

## Introduction

`Template` is Effect's solution for building reactive, type-safe user interfaces. It combines Effect's powerful reactive primitives (`Fx`, `RefSubject`, `Computed`) with HTML template literals to create a seamless developer experience for building web applications.

If you're familiar with React, Vue, or other modern UI frameworks, `Template` provides similar capabilities but with Effect's type safety, error handling, and resource management built-in.

## Understanding the Web Platform

Before diving into templates, it's helpful to understand the fundamental concepts of web development.

### What is HTML?

HTML (HyperText Markup Language) is a text-based format that describes the structure of a web page. Think of it as a blueprint for your content:

```html
<div>
  <h1>Hello, World!</h1>
  <p>This is a paragraph.</p>
</div>
```

Each piece of content is wrapped in **tags** (like `<div>`, `<h1>`, `<p>`) that tell the browser what type of content it is.

### What is the DOM?

The **DOM** (Document Object Model) is the browser's in-memory representation of your HTML. When a browser loads an HTML page, it:

1. **Parses** the HTML text into a tree structure
2. **Creates** JavaScript objects (called "nodes") for each element
3. **Builds** a tree where each node can have children, siblings, and parents
4. **Renders** this tree to the screen

```ts
// When you write HTML:
<div>
  <p>Hello</p>
</div>

// The browser creates a tree structure:
// Document
//   └── div (Element Node)
//       └── p (Element Node)
//           └── "Hello" (Text Node)
```

The DOM is **live** - when you change it with JavaScript, the browser automatically updates what's displayed on screen.

### How Browsers Render Pages

When you write a template, here's what happens behind the scenes:

1. **Parse**: Browser parses HTML into DOM nodes
2. **Style**: Browser calculates CSS styles for each node
3. **Layout**: Browser determines where each element should be positioned
4. **Paint**: Browser draws pixels to the screen
5. **Composite**: Browser layers elements together

This process is called the **rendering pipeline**. It happens continuously as the page changes.

### Why We Need Templates

Writing raw HTML and manually updating the DOM is tedious and error-prone:

```ts
// Without templates - manual DOM manipulation
const div = document.createElement("div")
div.textContent = "Hello"
document.body.appendChild(div)

// Later, to update:
div.textContent = "World" // Easy to forget, easy to break
```

Templates let you:
- **Declare** what you want (not how to build it)
- **Automatically update** when data changes
- **Handle** complex interactions safely
- **Reuse** components easily

## What is Template?

A `Template` is:
- **A reactive HTML template** that updates automatically when state changes
- **An Fx stream** that emits `RenderEvent`s as the template updates
- **Type-safe** with full TypeScript inference for interpolated values
- **Server-side renderable** for SSR with automatic hydration support

### The Template Lifecycle

When you create a template, here's what happens:

1. **Parsing**: The template string is parsed into an Abstract Syntax Tree (AST)
2. **Caching**: The parsed template is cached for reuse
3. **Rendering**: Dynamic values are interpolated and DOM nodes are created
4. **Mounting**: DOM nodes are inserted into the page
5. **Updating**: When state changes, only the changed parts update
6. **Cleanup**: When unmounted, resources are automatically cleaned up

Let's explore each step in detail.

```ts
import { Effect, Layer } from "effect"
import { html } from "effect/typed/template"
import { DomRenderTemplate, render } from "effect/typed/template/Render"
import { Fx } from "effect/typed/fx"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function* () {
  const count = yield* RefSubject.make(0)

  // Create a reactive template
  const template = html`<div>
    <p>Count: ${count}</p>
    <button onclick=${RefSubject.increment(count)}>Increment</button>
  </div>`

  // Render to the DOM
  yield* render(template, document.body).pipe(
    Fx.drainLayer,
    Layer.provide(DomRenderTemplate),
    Layer.launch
  )
})
```

## How Templates Work Internally

### Step 1: Parsing Templates

When you write:

```ts
const template = html`<div>Hello ${name}</div>`
```

The template system:

1. **Splits** the template string into static parts and dynamic parts:
   - Static: `"<div>Hello "` and `"</div>"`
   - Dynamic: `${name}` (at index 0)

2. **Parses** the static HTML into a tree structure (AST):
   ```
   ElementNode("div")
     └── TextNode("Hello")
     └── NodePart(index: 0)  // Placeholder for dynamic content
   ```

3. **Caches** the parsed template so it can be reused efficiently

4. **Tracks** where dynamic values should be inserted

This parsing happens once per unique template string, not every time you render.

### Step 2: Rendering to DOM

When you render a template:

```ts
yield* render(template, document.body)
```

The system:

1. **Clones** the cached DOM fragment (for efficiency)
2. **Resolves** dynamic values (primitives, Effects, RefSubjects)
3. **Inserts** resolved values into the correct positions
4. **Attaches** event listeners
5. **Mounts** the result into the target element

### Step 3: Updating When State Changes

When a `RefSubject` changes:

```ts
yield* RefSubject.set(count, 5)
```

The system:

1. **Detects** which parts of the template depend on `count`
2. **Schedules** an update (using the render queue)
3. **Updates** only the changed DOM nodes (not the whole template)
4. **Preserves** event listeners and component state

This is called **fine-grained updates** - only what changed gets updated.

## Core Concepts

### Templates are Fx Streams

Templates are reactive streams that emit `RenderEvent`s. When you use `html`, you get an `Fx<RenderEvent, E, R>`:

```ts
import { html } from "effect/typed/template"
import { Fx } from "effect/typed/fx"

const template = html`<div>Hello</div>`

// Template is an Fx stream
const events = yield* Fx.first(template)
console.log(events) // RenderEvent containing the rendered DOM
```

### Renderable Values

You can interpolate many types of values into templates:

```ts
import { Effect } from "effect"
import { html } from "effect/typed/template"
import { Fx } from "effect/typed/fx"
import * as RefSubject from "effect/typed/fx/RefSubject"

// Primitives
const static = html`<div>${"Hello"}</div>`

// Effects (async values)
const async = html`<div>${Effect.succeed("Loaded")}</div>`

// RefSubject (reactive state)
const program = Effect.gen(function* () {
  const count = yield* RefSubject.make(0)
  const reactive = html`<div>Count: ${count}</div>`
  // Updates automatically when count changes
})

// Arrays
const items = [1, 2, 3]
const list = html`<ul>${items.map((n) => html`<li>${n}</li>`)}</ul>`
```

## Creating Templates

### Static Templates

The simplest template has no dynamic content:

```ts
import { html } from "effect/typed/template"

const staticTemplate = html`<div>
  <h1>Hello, World!</h1>
  <p>This is a static template.</p>
</div>`
```

### Dynamic Templates

Interpolate values using `${}`:

```ts
import { html } from "effect/typed/template"

const name = "Alice"
const age = 30

const dynamicTemplate = html`<div>
  <p>Name: ${name}</p>
  <p>Age: ${age}</p>
</div>`
```

### Reactive Templates

Use `RefSubject` for reactive state:

```ts
import { Effect } from "effect"
import { html } from "effect/typed/template"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function* () {
  const count = yield* RefSubject.make(0)
  const name = yield* RefSubject.make("Alice")

  // Template automatically updates when state changes
  const template = html`<div>
    <p>Count: ${count}</p>
    <p>Name: ${name}</p>
  </div>`

  // Update state
  yield* RefSubject.set(count, 5)
  yield* RefSubject.set(name, "Bob")
  // Template will reflect these changes automatically
})
```

## Rendering Templates

### Understanding the Render Queue

Before we dive into rendering, it's important to understand **how updates are scheduled**.

#### Why Scheduling Matters

Browsers can only update the screen about 60 times per second (60 FPS). If you update the DOM too frequently or synchronously, you can:

- **Block** the main thread (making the page freeze)
- **Waste** resources updating faster than the screen can display
- **Cause** janky animations and poor user experience

#### The Render Queue System

Template uses a **RenderQueue** to batch and prioritize updates:

```ts
import { RenderQueue, RenderPriority } from "effect/typed/template/RenderQueue"

// High priority: Updates immediately (synchronous)
RenderPriority.Sync  // -1

// Medium priority: Updates before next frame (requestAnimationFrame)
RenderPriority.Raf(5)  // 0-10

// Low priority: Updates when browser is idle (requestIdleCallback)
RenderPriority.Idle(1)  // 11+
```

**How it works:**

1. When state changes, updates are added to the queue with a priority
2. The queue batches multiple updates together
3. Updates are executed in priority order
4. High-priority updates happen immediately
5. Lower-priority updates wait for the browser to be ready

**Default behavior:**

- Most template updates use `RenderPriority.Raf(10)` (medium priority)
- This ensures updates happen smoothly before the next frame
- Critical updates can use `Sync` for immediate updates

#### Render Queue Types

```ts
// Synchronous - immediate execution
const syncQueue = new SyncRenderQueue()

// RequestAnimationFrame - before next repaint
const rafQueue = new RequestAnimationFrameRenderQueue()

// RequestIdleCallback - when browser is idle
const idleQueue = new RequestIdleCallbackRenderQueue()

// Mixed - routes to appropriate queue based on priority
const mixedQueue = new MixedRenderQueue()  // Default
```

The default `MixedRenderQueue` automatically routes updates to the right queue based on their priority.

### DOM Rendering

Render templates to the DOM using `render`:

```ts
import { Effect, Layer } from "effect"
import { html } from "effect/typed/template"
import { DomRenderTemplate, render } from "effect/typed/template/Render"
import { Fx } from "effect/typed/fx"

const program = Effect.gen(function* () {
  const template = html`<div>Hello, World!</div>`

  // Render to document.body
  yield* render(template, document.body).pipe(
    Fx.drainLayer,
    Layer.provide(DomRenderTemplate),
    Layer.launch
  )
})

Effect.runPromise(program)
```

### HTML Rendering (SSR)

Render templates to HTML strings for server-side rendering:

```ts
import { Effect } from "effect"
import { html } from "effect/typed/template"
import { renderToHtmlString, HtmlRenderTemplate } from "effect/typed/template/Html"
import { Fx } from "effect/typed/fx"

const program = Effect.gen(function* () {
  const template = html`<div>
    <h1>Hello</h1>
    <p>World</p>
  </div>`

  // Render to HTML string
  const htmlString = yield* renderToHtmlString(template).pipe(
    Fx.provide(HtmlRenderTemplate)
  )

  console.log(htmlString)
  // "<div><h1>Hello</h1><p>World</p></div>"
})

Effect.runPromise(program)
```

## Event Handling

### Understanding Browser Events

When a user interacts with a webpage (clicks, types, scrolls), the browser fires **events**. These events bubble up through the DOM tree:

```
User clicks button
  ↓
Button element receives click event
  ↓
Event bubbles to parent elements
  ↓
Eventually reaches document root
```

#### Event Lifecycle

1. **Capture phase**: Event travels down from root to target
2. **Target phase**: Event reaches the target element
3. **Bubble phase**: Event travels back up to root

Most event handlers listen during the **bubble phase**.

#### Event Object

Every event is an object with information about what happened:

```ts
// MouseEvent contains:
event.target        // Element that was clicked
event.currentTarget // Element with the listener
event.clientX       // X coordinate of click
event.clientY       // Y coordinate of click
event.button        // Which mouse button
```

### How Template Handles Events

Template uses an **EventSource** to efficiently manage event listeners:

1. **Groups** listeners by event type (click, input, etc.)
2. **Attaches** one listener per event type to parent elements
3. **Delegates** events to the correct handlers
4. **Cleans up** automatically when components unmount

This is called **event delegation** and is more efficient than attaching listeners to every element.

### Basic Event Handlers

Use `EventHandler` to create type-safe event handlers:

```ts
import { Effect } from "effect"
import { html } from "effect/typed/template"
import * as EventHandler from "effect/typed/template/EventHandler"

const handleClick = EventHandler.make((event: MouseEvent) => {
  console.log("Button clicked!", event)
})

const template = html`<button onclick=${handleClick}>Click me</button>`
```

### Event Handlers with Effects

Event handlers can return Effects for async operations:

```ts
import { Effect } from "effect"
import { html } from "effect/typed/template"
import * as EventHandler from "effect/typed/template/EventHandler"

const handleSubmit = EventHandler.make((event: SubmitEvent) =>
  Effect.gen(function* () {
    event.preventDefault()
    const form = event.target as HTMLFormElement
    const data = new FormData(form)
    
    // Perform async operation
    yield* Effect.sync(() => console.log("Submitting:", data))
  })
)

const template = html`<form onsubmit=${handleSubmit}>
  <input name="email" />
  <button type="submit">Submit</button>
</form>`
```

### Event Handler Options

Control event behavior with options:

```ts
import * as EventHandler from "effect/typed/template/EventHandler"

// Prevent default behavior
const preventDefault = EventHandler.make(
  (event: MouseEvent) => console.log("Clicked"),
  { preventDefault: true }
)

// Stop propagation
const stopPropagation = EventHandler.make(
  (event: MouseEvent) => console.log("Clicked"),
  { stopPropagation: true }
)

// Run only once
const once = EventHandler.once(
  EventHandler.make((event: MouseEvent) => console.log("Once"))
)
```

### Using RefSubject Actions

You can use `RefSubject` operations directly as event handlers:

```ts
import { Effect } from "effect"
import { html } from "effect/typed/template"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function* () {
  const count = yield* RefSubject.make(0)

  // Use RefSubject operations as event handlers
  const template = html`<div>
    <button onclick=${RefSubject.increment(count)}>+</button>
    <button onclick=${RefSubject.decrement(count)}>-</button>
    <p>Count: ${count}</p>
  </div>`
})
```

## Rendering Lists

### Why Lists Need Special Handling

Rendering lists efficiently is one of the hardest problems in UI development. Consider:

```ts
// Simple approach - re-render everything
const todos = [todo1, todo2, todo3]
// If todo2 changes, we'd re-render all 3 items ❌

// Better approach - only update what changed
// If todo2 changes, only update todo2 ✅
```

The challenge:
- **Detecting** which items changed
- **Reusing** DOM nodes when possible
- **Preserving** component state
- **Handling** reordering, insertion, deletion

### Understanding Keyed Diffing

**Keyed diffing** uses unique keys to identify list items:

```ts
interface Todo {
  id: string  // Unique key
  text: string
}

const todos = [
  { id: "1", text: "Learn Effect" },
  { id: "2", text: "Build app" }
]

// If we add a new todo with id="3":
// - Items with id "1" and "2" stay mounted
// - Only the new item with id "3" is created
// - No unnecessary re-renders!
```

### Using `many` for Efficient Lists

The `many` function efficiently renders lists with keyed diffing:

```ts
import { Effect } from "effect"
import { html, many } from "effect/typed/template"
import { Fx } from "effect/typed/fx"
import * as RefSubject from "effect/typed/fx/RefSubject"

interface Todo {
  readonly id: string
  readonly text: string
  readonly completed: boolean
}

const program = Effect.gen(function* () {
  const todos = yield* RefSubject.make<Todo[]>([
    { id: "1", text: "Learn Effect", completed: false },
    { id: "2", text: "Build app", completed: false }
  ])

  const todoList = many(
    todos,
    (todo) => todo.id, // Key function
    (todoRef, key) => // Render function receives RefSubject
      html`<li>
        ${RefSubject.map(todoRef, (todo) => todo.text)}
        <button onclick=${RefSubject.update(todoRef, (todo) =>
          ({ ...todo, completed: !todo.completed })
        )}>Toggle</button>
      </li>`
  )

  const template = html`<ul>${todoList}</ul>`
})
```

### Why `many`?

`many` provides:
- **Keyed diffing**: Only updates changed items
- **Component reuse**: Items stay mounted when reordered
- **Granular updates**: Each item receives a `RefSubject` for fine-grained updates
- **Performance**: Minimizes DOM operations

### How `many` Works Internally

When you use `many`:

```ts
many(todos, (todo) => todo.id, (todoRef, key) => html`<li>...</li>`)
```

1. **Tracks** which keys exist in the current list
2. **Compares** to previous list to find:
   - New items (keys that appeared)
   - Removed items (keys that disappeared)
   - Reordered items (keys that moved)
   - Updated items (same key, different data)

3. **For new items**: Creates new DOM nodes and mounts them
4. **For removed items**: Unmounts DOM nodes and cleans up
5. **For reordered items**: Moves DOM nodes to new positions
6. **For updated items**: Updates the `RefSubject`, triggering fine-grained update

This is called the **reconciliation algorithm** - it reconciles the desired state (your list) with the actual DOM.

## Template Attributes

### Standard Attributes

```ts
import { html } from "effect/typed/template"

const template = html`<div
  id="container"
  class="box"
  data-foo="bar"
  style="color: red"
>
  Content
</div>`
```

### Dynamic Attributes

```ts
import { html } from "effect/typed/template"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function* () {
  const className = yield* RefSubject.make("box")
  const isActive = yield* RefSubject.make(true)

  const template = html`<div
    class=${className}
    data-active=${isActive}
  >
    Content
  </div>`
})
```

### Property Binding

Use `.property` to set DOM properties:

```ts
import { html } from "effect/typed/template"

const template = html`<input
  .value=${"Hello"}
  .checked=${true}
/>`
```

### Boolean Attributes

Use `?attribute` for boolean attributes:

```ts
import { html } from "effect/typed/template"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function* () {
  const isDisabled = yield* RefSubject.make(false)

  const template = html`<button ?disabled=${isDisabled}>
    Click me
  </button>`
})
```

### Event Attributes

Use `@event` for event listeners:

```ts
import { html } from "effect/typed/template"
import * as EventHandler from "effect/typed/template/EventHandler"

const handleClick = EventHandler.make((event: MouseEvent) => {
  console.log("Clicked")
})

const template = html`<button @click=${handleClick}>
  Click me
</button>`
```

## Composing Templates

### Template Components

Create reusable template components:

```ts
import { Effect } from "effect"
import { html } from "effect/typed/template"
import { Fx } from "effect/typed/fx"
import * as RefSubject from "effect/typed/fx/RefSubject"

const Button = (label: string, onClick: () => Effect.Effect<void>) =>
  html`<button onclick=${onClick}>${label}</button>`

const Counter = Fx.gen(function* () {
  const count = yield* RefSubject.make(0)

  return html`<div>
    ${Button("Increment", () => RefSubject.increment(count))}
    ${Button("Decrement", () => RefSubject.decrement(count))}
    <p>Count: ${count}</p>
  </div>`
})
```

### Conditional Rendering

Use Effect's control flow for conditionals:

```ts
import { Effect } from "effect"
import { html } from "effect/typed/template"
import { Fx } from "effect/typed/fx"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Fx.gen(function* () {
  const isLoggedIn = yield* RefSubject.make(false)

  return html`<div>
    ${Fx.if(
      isLoggedIn,
      html`<p>Welcome back!</p>`,
      html`<button>Login</button>`
    )}
  </div>`
})
```

## Server-Side Rendering (SSR)

### Rendering to HTML

```ts
import { Effect } from "effect"
import { html } from "effect/typed/template"
import { renderToHtmlString, HtmlRenderTemplate } from "effect/typed/template/Html"
import { Fx } from "effect/typed/fx"

const program = Effect.gen(function* () {
  const template = html`<div>
    <h1>Server Rendered</h1>
    <p>This was rendered on the server</p>
  </div>`

  const htmlString = yield* renderToHtmlString(template).pipe(
    Fx.provide(HtmlRenderTemplate)
  )

  return htmlString
})

// Use in your server route handler
const html = await Effect.runPromise(program)
```

### Understanding Hydration

**Hydration** is the process of "waking up" server-rendered HTML on the client. Here's how it works:

#### The Problem

When you render HTML on the server:
1. Server generates HTML string: `"<div>Hello</div>"`
2. Browser receives HTML and displays it
3. But the HTML is **static** - no event listeners, no reactivity

#### The Solution: Hydration

Hydration connects server-rendered HTML to your reactive template:

1. **Server renders** HTML with special markers (template hash comments)
2. **Browser displays** the HTML immediately (fast initial load)
3. **Client JavaScript loads** and finds the markers
4. **Template system** attaches to existing DOM nodes
5. **Event listeners** are attached
6. **Reactivity** is enabled

#### How Template Hash Comments Work

When rendering for SSR, templates add invisible comments:

```html
<!--t_abc123-->  <!-- Start marker with template hash -->
<div>Hello</div>
<!--/t_abc123-->  <!-- End marker -->
```

These comments:
- Are **invisible** to users
- Help the client find where templates were rendered
- Enable **efficient hydration** (no re-rendering needed)

#### Hydration Process

```ts
// Server renders HTML with hash comments
const serverHtml = await renderToHtmlString(template)
// Result: "<!--t_abc123--><div>Hello</div><!--/t_abc123-->"

// Client receives HTML and displays it immediately
document.body.innerHTML = serverHtml

// Later, client JavaScript runs:
yield* render(template, document.body)
// Template system:
// 1. Finds hash comments in existing DOM
// 2. Matches them to the template
// 3. Attaches to existing nodes (doesn't recreate them)
// 4. Adds event listeners
// 5. Enables reactivity
```

#### Benefits of Hydration

- **Fast initial load**: HTML displays immediately
- **SEO friendly**: Search engines see full content
- **Progressive enhancement**: Works even if JavaScript fails
- **Efficient**: Reuses existing DOM nodes

### Hydration Example

Templates automatically hydrate when rendered on the client:

```ts
import { Effect, Layer } from "effect"
import { html } from "effect/typed/template"
import { DomRenderTemplate, render } from "effect/typed/template/Render"
import { Fx } from "effect/typed/fx"

// Server renders HTML with template hash comments
// Client automatically hydrates and attaches event listeners
const program = Effect.gen(function* () {
  const template = html`<div>
    <button onclick=${handleClick}>Click</button>
  </div>`

  yield* render(template, document.body).pipe(
    Fx.drainLayer,
    Layer.provide(DomRenderTemplate),
    Layer.launch
  )
})
```

## Performance Considerations

### Understanding Browser Performance

Browsers have limited resources. To build fast applications, you need to understand:

#### The Main Thread

JavaScript runs on a **single thread** (the main thread). This means:
- Only one thing can happen at a time
- Long-running code blocks everything else
- The page freezes if you block the thread

#### Frame Budget

Browsers aim for 60 frames per second (FPS). That means:
- Each frame has ~16ms budget
- If your code takes longer, frames are dropped
- Dropped frames = janky, stuttering UI

#### DOM Operations are Expensive

Changing the DOM triggers:
1. **Recalculation** of styles
2. **Relayout** of elements
3. **Repaint** of pixels
4. **Compositing** of layers

These operations are expensive, so we want to minimize them.

### Template Performance Optimizations

Template includes several optimizations:

#### 1. Template Caching

```ts
// First render: parses template
const template1 = html`<div>Hello</div>`

// Second render: reuses parsed template (no parsing!)
const template2 = html`<div>Hello</div>`
```

Templates are cached by their string content, so parsing only happens once.

#### 2. Fragment Cloning

Instead of creating DOM nodes from scratch each time:

```ts
// Template system:
// 1. Creates DOM fragment once
// 2. Caches it
// 3. Clones it for each render (very fast!)
const fragment = buildTemplateFragment(template)
const clone = document.importNode(fragment, true)  // Fast clone
```

#### 3. Fine-Grained Updates

Only the parts that changed are updated:

```ts
const count = yield* RefSubject.make(0)
const template = html`<div>
  <p>Count: ${count}</p>  <!-- Only this updates -->
  <p>Static text</p>      <!-- This never changes -->
</div>`
```

#### 4. Batched Updates

Multiple state changes are batched:

```ts
// These three updates are batched into one DOM update
yield* RefSubject.set(count, 1)
yield* RefSubject.set(name, "Alice")
yield* RefSubject.set(age, 30)
// Only one re-render happens!
```

#### 5. Render Queue Scheduling

Updates are scheduled intelligently:

- **High priority**: Critical updates happen immediately
- **Medium priority**: Updates happen before next frame (smooth)
- **Low priority**: Updates happen when browser is idle

### Performance Best Practices

1. **Use `many` for lists**: Always use `many` - it's optimized for lists
2. **Avoid unnecessary re-renders**: Only update state when needed
3. **Batch updates**: Group related state changes
4. **Use Computed**: Derived values are cached automatically
5. **Profile your app**: Use browser DevTools to find bottlenecks

## Resource Management

### Understanding Scopes

Effect uses **Scopes** to manage resources. A Scope:
- **Tracks** resources (event listeners, timers, etc.)
- **Cleans up** automatically when done
- **Prevents** memory leaks

### How Templates Use Scopes

When you render a template:

```ts
yield* render(template, document.body)
```

Template creates a Scope that tracks:
- Event listeners
- DOM subscriptions
- Effect fibers
- Other resources

When the template is unmounted or the component is destroyed, the Scope automatically cleans up everything.

### Manual Cleanup

You rarely need to manually clean up, but if you do:

```ts
const program = Effect.gen(function* () {
  const scope = yield* Scope.make()
  
  // Render within scope
  yield* render(template, document.body).pipe(
    Effect.provide(Scope.Scope, scope)
  )
  
  // Later, clean up
  yield* Scope.close(scope, Exit.succeed(void 0))
})
```

## Best Practices

1. **Use RefSubject for state**: When you need reactive state, use `RefSubject`
2. **Use Computed for derived values**: When you need derived state, use `RefSubject.map`
3. **Use `many` for lists**: Always use `many` for rendering lists efficiently
4. **Handle events with EventHandler**: Use `EventHandler` for type-safe event handling
5. **Compose templates**: Break templates into reusable components
6. **Use SSR for initial render**: Render on server, hydrate on client
7. **Manage resources**: Templates automatically clean up when unmounted using `Scope`
8. **Understand the render queue**: Know when updates happen and why
9. **Profile performance**: Use browser DevTools to optimize
10. **Batch updates**: Group related state changes together

## Common Patterns

### Counter Component

```ts
import { Effect, Layer } from "effect"
import { html } from "effect/typed/template"
import { DomRenderTemplate, render } from "effect/typed/template/Render"
import { Fx } from "effect/typed/fx"
import * as RefSubject from "effect/typed/fx/RefSubject"

const Counter = Fx.gen(function* () {
  const count = yield* RefSubject.make(0)

  return html`<div>
    <button onclick=${RefSubject.increment(count)}>+</button>
    <button onclick=${RefSubject.decrement(count)}>-</button>
    <p>Count: ${count}</p>
  </div>`
})

const program = Effect.gen(function* () {
  const counter = yield* Counter

  yield* render(counter, document.body).pipe(
    Fx.drainLayer,
    Layer.provide(DomRenderTemplate),
    Layer.launch
  )
})

Effect.runPromise(program)
```

### Form Component

```ts
import { Effect } from "effect"
import { html } from "effect/typed/template"
import { Fx } from "effect/typed/fx"
import * as RefSubject from "effect/typed/fx/RefSubject"
import * as EventHandler from "effect/typed/template/EventHandler"

const Form = Fx.gen(function* () {
  const name = yield* RefSubject.make("")
  const email = yield* RefSubject.make("")

  const handleSubmit = EventHandler.make((event: SubmitEvent) =>
    Effect.gen(function* () {
      const n = yield* name
      const e = yield* email
      yield* Effect.sync(() => console.log("Submit:", { name: n, email: e }))
    }),
    { preventDefault: true }
  )

  return html`<form onsubmit=${handleSubmit}>
    <input
      .value=${name}
      oninput=${EventHandler.make((ev: InputEvent & { target: HTMLInputElement }) =>
        RefSubject.set(name, ev.target.value)
      )}
      placeholder="Name"
    />
    <input
      .value=${email}
      oninput=${EventHandler.make((ev: InputEvent & { target: HTMLInputElement }) =>
        RefSubject.set(email, ev.target.value)
      )}
      placeholder="Email"
    />
    <button type="submit">Submit</button>
  </form>`
})
```

### Todo List

```ts
import { Effect } from "effect"
import { html, many } from "effect/typed/template"
import { Fx } from "effect/typed/fx"
import * as RefSubject from "effect/typed/fx/RefSubject"
import * as EventHandler from "effect/typed/template/EventHandler"

interface Todo {
  readonly id: string
  readonly text: string
  readonly completed: boolean
}

const TodoApp = Fx.gen(function* () {
  const todos = yield* RefSubject.make<Todo[]>([])
  const newTodoText = yield* RefSubject.make("")

  const addTodo = EventHandler.make(() =>
    Effect.gen(function* () {
      const text = yield* newTodoText
      if (text.trim()) {
        yield* RefSubject.update(todos, (list) => [
          ...list,
          { id: Date.now().toString(), text, completed: false }
        ])
        yield* RefSubject.set(newTodoText, "")
      }
    })
  )

  const todoList = many(
    todos,
    (todo) => todo.id,
    (todoRef) =>
      html`<li>
        ${RefSubject.map(todoRef, (todo) => html`
          <input
            type="checkbox"
            .checked=${todo.completed}
            onchange=${RefSubject.update(todoRef, (t) => ({ ...t, completed: !t.completed }))}
          />
          <span>${todo.text}</span>
        `)}
      </li>`
  )

  return html`<div>
    <input
      .value=${newTodoText}
      oninput=${EventHandler.make((ev: InputEvent & { target: HTMLInputElement }) =>
        RefSubject.set(newTodoText, ev.target.value)
      )}
      onkeydown=${EventHandler.make((ev: KeyboardEvent & { target: HTMLInputElement }) =>
        ev.key === "Enter" ? addTodo.handler(ev as any) : Effect.void
      )}
      placeholder="New todo"
    />
    <ul>${todoList}</ul>
  </div>`
})
```

## Advanced Topics

### Understanding Template Parsing

When you write a template:

```ts
html`<div class=${className}>Hello ${name}</div>`
```

The parser:

1. **Tokenizes** the HTML string into tokens (tags, attributes, text)
2. **Builds** an Abstract Syntax Tree (AST) representing the structure
3. **Identifies** dynamic parts (interpolations like `${className}`)
4. **Maps** each dynamic part to its location in the tree
5. **Generates** a hash for caching

The AST looks like:

```
Template
├── nodes: [
│     ElementNode("div")
│       ├── attributes: [
│       │     AttributeNode("class"),
│       │     AttrPartNode("class", index: 0)  // Dynamic!
│       │   ]
│       ├── children: [
│       │     TextNode("Hello "),
│       │     TextPartNode(index: 1)  // Dynamic!
│       │   ]
│   ]
├── parts: [
│     [AttrPartNode("class", 0), [0, 0]],  // Path to attribute
│     [TextPartNode(1), [0, 1]]            // Path to text node
│   ]
└── hash: "abc123..."  // For caching
```

### Understanding Render Events

Templates emit `RenderEvent`s - these represent updates to the rendered output:

```ts
// DomRenderEvent: Contains actual DOM nodes
DomRenderEvent(document.createElement("div"))

// HtmlRenderEvent: Contains HTML strings (for SSR)
HtmlRenderEvent("<div>Hello</div>", true)
```

The renderer subscribes to these events and updates the DOM accordingly.

### Understanding Wire

`Wire` is an internal concept that represents a persistent DocumentFragment:

```ts
// Normal DocumentFragment: empties when appended
const fragment = document.createDocumentFragment()
fragment.appendChild(div)
parent.appendChild(fragment)  // fragment is now empty!

// Wire: maintains references
const wire = persistent(document, hash, fragment)
parent.appendChild(wire.valueOf())  // wire still has children!
```

Wires allow templates to:
- Move DOM nodes around without losing references
- Update efficiently
- Support hydration

### Understanding Hydration Context

When hydrating, the system needs to know:
- **Where** to attach (which DOM node)
- **What** template was used (template hash)
- **Which** parts are dynamic (for `many` lists)

This information is passed through `HydrateContext`:

```ts
interface HydrateContext {
  where: HydrationNode      // Where to attach
  manyKey?: string          // Key for list items
  hydrate: boolean          // Whether we're hydrating
}
```

## Debugging Templates

### Using Browser DevTools

1. **Elements Panel**: Inspect the rendered DOM
2. **Console**: Check for template hash comments
3. **Performance Panel**: Profile rendering performance
4. **Network Panel**: Check SSR HTML

### Common Issues

#### Template Not Updating

```ts
// ❌ Wrong: Creating new RefSubject each render
const template = html`<div>${yield* RefSubject.make(0)}</div>`

// ✅ Right: Create RefSubject once
const count = yield* RefSubject.make(0)
const template = html`<div>${count}</div>`
```

#### Event Listeners Not Working

```ts
// ❌ Wrong: Not using EventHandler
const template = html`<button onclick=${() => console.log("click")}>Click</button>`

// ✅ Right: Use EventHandler
const handler = EventHandler.make(() => console.log("click"))
const template = html`<button onclick=${handler}>Click</button>`
```

#### List Not Updating Efficiently

```ts
// ❌ Wrong: Not using many
const list = html`<ul>${todos.map(todo => html`<li>${todo.text}</li>`)}</ul>`

// ✅ Right: Use many
const list = many(todos, t => t.id, (ref, key) => html`<li>${RefSubject.map(ref, (t) => t.text)}</li>`)
```

## Next Steps

- Learn about **Fx** for reactive streams
- Explore **RefSubject** for reactive state management
- See **Computed** for derived reactive values
- Check out **EventHandler** for advanced event handling patterns
- Read about **many** for efficient list rendering
- Study browser **performance** and **rendering** concepts
- Learn about **SSR** and **hydration** patterns

