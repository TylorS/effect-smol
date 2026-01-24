# Fx: Reactive Streams in Effect

## Introduction

`Fx` is Effect's reactive stream primitive, designed for building reactive applications with full type safety and Effect's powerful concurrency and error handling capabilities. If you're familiar with Effect, `Fx` extends those patterns to handle streams of values over time.

While Effect's `Stream` is a **pull-based** stream (great for data processing, I/O, and backpressure), `Fx` is a **push-based** stream (perfect for events, UI interactions, and real-time updates).

## Push vs. Pull: Why Fx?

Understanding the difference between "Push" and "Pull" is key to knowing when to use `Fx` vs `Stream`.

### Pull-Based (Stream)

- **Consumer drives**: The consumer asks for the next value ("pulls").
- **Backpressure**: Built-in. If the consumer is slow, the producer pauses.
- **Use cases**: Reading files, processing large datasets, database queries.

### Push-Based (Fx)

- **Producer drives**: The producer emits values as they happen ("pushes").
- **No Backpressure**: Values are emitted regardless of whether the consumer is ready. Strategies like buffering or dropping are used if needed.
- **Use cases**: User events (clicks, keystrokes), WebSocket messages, timers, state changes.

`Fx` is designed to model the "live" nature of applications where events happen spontaneously.

## What is Fx?

An `Fx<A, E, R>` is a push-based stream that:

- **Emits values** of type `A` over time
- **Can fail** with an error of type `E`
- **Requires context** of type `R` (services, dependencies)

Think of `Fx` as Effect's answer to RxJS Observables, but built on Effect's fiber-based concurrency model with full type safety and resource management.

## Core Concepts

### Fx vs Effect

The key difference between `Fx` and `Effect`:

- **Effect**: Produces a single value (or fails)
- **Fx**: Can produce 0, 1, or many values over time

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"

// Effect: produces one value
const singleValue = Effect.succeed(42)

// Fx: can produce multiple values
const stream = Fx.fromIterable([1, 2, 3, 4, 5])
```

### Sink: The Consumer Protocol

`Fx` uses a `Sink` protocol to consume values. A `Sink<A, E, R>` has two methods:

- `onSuccess(value: A)`: Called for each emitted value
- `onFailure(cause: Cause<E>)`: Called when the stream fails

```ts
import { Fx } from "effect/typed/fx"
import * as Sink from "effect/typed/fx/Sink"

const sink = Sink.make(
  (cause) => Effect.sync(() => console.error("Error:", cause)),
  (value) => Effect.sync(() => console.log("Value:", value))
)

// Run an Fx with a sink
yield* Fx.fromIterable([1, 2, 3]).run(sink)
// Output: "Value: 1", "Value: 2", "Value: 3"
```

## Creating Fx Streams

### From Values & Data

```ts
import { Fx } from "effect/typed/fx"

// Single value
const single = Fx.succeed(42)

// Empty stream (completes immediately)
const empty = Fx.empty

// Null value (useful for conditional branches)
const nothing = Fx.null

// Failed stream
const failed = Fx.fail("Something went wrong")

// Failed with a Cause
const failedCause = Fx.failCause(Cause.die("defect"))

// Defect (unexpected error)
const defect = Fx.die(new Error("unexpected"))

// From an array or iterable
const fromArray = Fx.fromIterable([1, 2, 3])

// Never completes (runs forever)
const forever = Fx.never
```

### From Effects

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"

// Convert an Effect to an Fx (emits once)
const fromEffect = Fx.fromEffect(Effect.succeed("Hello"))

// From any Yieldable (Effect, Promise, etc.)
const fromYieldable = Fx.fromYieldable(someEffect)
```

### From Time & Scheduling

```ts
import { Schedule } from "effect"
import { Fx } from "effect/typed/fx"

// Emit void every second
const periodic = Fx.periodic("1 seconds")

// Emit a value after a delay
const delayed = Fx.at("5 seconds", "Hello")

// From a Schedule (emits each schedule output)
const fromSchedule = Fx.fromSchedule(Schedule.spaced("1 second"))
```

### From Callbacks & DOM Events

Use `Fx.callback` to integrate with callback-based APIs like DOM events:

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"

// Listen to hash changes
const hashChanges = Fx.callback<string>((emit) => {
  const handler = () => emit.succeed(location.hash)
  handler() // Emit initial value
  window.addEventListener("hashchange", handler)
  // Return cleanup effect
  return Effect.sync(() => window.removeEventListener("hashchange", handler))
})

// Listen to clicks
const clicks = Fx.callback<MouseEvent>((emit) => {
  const handler = (e: MouseEvent) => emit.succeed(e)
  document.addEventListener("click", handler)
  return Effect.sync(() => document.removeEventListener("click", handler))
})
```

### Advanced Constructors

```ts
import { Fx } from "effect/typed/fx"

// Low-level: create from a Sink function
const custom = Fx.make((sink) =>
  Effect.gen(function*() {
    yield* sink.onSuccess(1)
    yield* sink.onSuccess(2)
    yield* sink.onSuccess(3)
  })
)

// Lazy construction (deferred until run)
const lazy = Fx.suspend(() => Fx.succeed(Date.now()))

// Interrupted stream
const interrupted = Fx.interrupt(FiberId.none)
```

## Transforming Streams

### Mapping & Filtering

```ts
import { Effect, Option } from "effect"
import { Fx } from "effect/typed/fx"

const numbers = Fx.fromIterable([1, 2, 3, 4, 5])

// Transform values
const doubled = Fx.map(numbers, (n) => n * 2)

// Filter values
const evens = Fx.filter(numbers, (n) => n % 2 === 0)

// Filter with Effect
const validatedEvens = Fx.filterEffect(numbers, (n) => Effect.succeed(n % 2 === 0))

// Filter and map together
const evenDoubled = Fx.filterMap(numbers, (n) => n % 2 === 0 ? Option.some(n * 2) : Option.none())

// Effectful side effects without changing values
const logged = Fx.tap(numbers, (n) => Effect.log(`Saw: ${n}`))

// Effectful transformation
const fetched = Fx.mapEffect(numbers, (n) => fetchData(n))

// Unwrap Option values (skip None)
const options = Fx.fromIterable([Option.some(1), Option.none(), Option.some(3)])
const compacted = Fx.compact(options) // Fx<1, 3>
```

### Limiting & Slicing

```ts
import { Fx } from "effect/typed/fx"

const numbers = Fx.fromIterable([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

// Take first N values
const firstThree = Fx.take(numbers, 3) // 1, 2, 3

// Skip first N values
const skipThree = Fx.skip(numbers, 3) // 4, 5, 6, 7, 8, 9, 10

// Slice a range
const middle = Fx.slice(numbers, 2, 5) // 3, 4, 5, 6, 7

// Take until condition is met (exclusive)
const untilFive = Fx.takeUntil(numbers, (n) => n >= 5) // 1, 2, 3, 4

// Take until condition is met (inclusive)
const untilFive = Fx.dropAfter(numbers, (n) => n >= 5) // 1, 2, 3, 4, 5
```

### Deduplication

```ts
import { Fx } from "effect/typed/fx"

const values = Fx.fromIterable([1, 1, 2, 2, 2, 3, 1])

// Skip consecutive repeats
const unique = Fx.skipRepeats(values) // 1, 2, 3, 1

// Skip repeats with custom equality
const customUnique = Fx.skipRepeatsWith(values, (a, b) => a === b)
```

### Flattening & Composition

The way you flatten streams determines how they handle concurrency:

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"

const triggers = Fx.fromIterable([1, 2, 3])

// flatMap: Runs all inner streams concurrently without limit
const merged = Fx.flatMap(triggers, (n) => Fx.fromEffect(longRunningTask(n)))

// switchMap: Switches to the latest stream, cancelling the previous
// Perfect for "latest state" or autocomplete
const switched = Fx.switchMap(triggers, (query) => Fx.fromEffect(search(query)))

// flatMapConcurrently: Controls concurrency with a limit
const limited = Fx.flatMapConcurrently(
  triggers,
  (n) => Fx.fromEffect(longRunningTask(n)),
  { concurrency: 5 }
)

// exhaustMap: Ignores new values while processing current
// Perfect for preventing double-submits
const exhausted = Fx.exhaustMap(triggers, (n) => Fx.fromEffect(submitForm(n)))

// exhaustLatestMap: Like exhaustMap but queues the latest value
const exhaustLatest = Fx.exhaustLatestMap(triggers, (n) => Fx.fromEffect(submitForm(n)))
```

### Merging Multiple Streams

```ts
import { Fx } from "effect/typed/fx"

const stream1 = Fx.fromIterable([1, 2, 3])
const stream2 = Fx.fromIterable([4, 5, 6])
const stream3 = Fx.fromIterable([7, 8, 9])

// Merge all streams concurrently
const merged = Fx.mergeAll([stream1, stream2, stream3])

// Merge in order (complete one before starting next, but runs concurrently)
const ordered = Fx.mergeOrdered([stream1, stream2, stream3])

// Combine into tuple (emits when all have emitted at least once)
const tupled = Fx.tuple([stream1, stream2, stream3])

// Continue with another stream after completion
const continued = Fx.continueWith(stream1, () => stream2)
```

## Conditional Streams

### Fx.if - Conditional Stream Selection

Switch between streams based on a boolean condition:

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function*() {
  const isLoggedIn = yield* RefSubject.make(false)

  // Switch between different streams based on condition
  const view = Fx.if(isLoggedIn, {
    onTrue: Fx.succeed("Welcome back!"),
    onFalse: Fx.succeed("Please log in")
  })

  // Use Fx.null for empty branches
  const maybeNotification = Fx.if(hasNotifications, {
    onTrue: notificationStream,
    onFalse: Fx.null
  })
})
```

### Fx.when - Conditional Values

Emit different values based on a boolean stream:

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function*() {
  const isActive = yield* RefSubject.make(false)

  // Emit different values based on condition
  const className = Fx.when(isActive, {
    onTrue: "active",
    onFalse: "inactive"
  })

  const buttonText = Fx.when(isLoading, {
    onTrue: "Loading...",
    onFalse: "Submit"
  })
})
```

## List Rendering with keyed

`Fx.keyed` efficiently renders lists with automatic diffing and updates:

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"
import * as RefSubject from "effect/typed/fx/RefSubject"

interface Todo {
  readonly id: string
  readonly text: string
  readonly completed: boolean
}

const program = Effect.gen(function*() {
  const todos = yield* RefSubject.make<Todo[]>([
    { id: "1", text: "Learn Effect", completed: false },
    { id: "2", text: "Build app", completed: false }
  ])

  // Render list with keyed diffing
  const todoList = Fx.keyed(
    todos,
    (todo) => todo.id, // Key function for identity
    (ref, key) => {
      const { text, completed } = RefSubject.proxy(ref)
      // Each item receives its own RefSubject
      // Only re-renders when that specific item changes
      const text = RefSubject.map(todoRef, (t) => t.text)
      const completed = RefSubject.map(todoRef, (t) => t.completed)
      return { key, text, completed }
    }
  )
})
```

Benefits of `Fx.keyed`:

- **Efficient updates**: Only changed items re-render
- **Stable identity**: Items maintain state across reorders
- **Fine-grained reactivity**: Each item gets its own `RefSubject`

## Running Fx Streams

### Observing Values

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"

const stream = Fx.fromIterable([1, 2, 3])

// Observe each value with an Effect
yield* Fx.observe(stream, (value) => Effect.log(`Got: ${value}`))

// Observe with void callback
yield* Fx.observe(stream, (value) => console.log(value))
```

### Draining Streams

```ts
import { Effect, Layer } from "effect"
import { Fx } from "effect/typed/fx"

const stream = Fx.fromIterable([1, 2, 3])

// Drain: run to completion, ignore values
yield* Fx.drain(stream)

// DrainLayer: run as a Layer (great for app startup)
const app = Fx.drainLayer(myAppStream).pipe(
  Layer.provide(dependencies),
  Layer.launch
)
```

### Collecting Values

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"

const stream = Fx.fromIterable([1, 2, 3])

// Collect all values into an array
const all = yield* Fx.collectAll(stream) // [1, 2, 3]

// Collect up to N values
const firstTwo = yield* Fx.collectUpTo(stream, 2) // [1, 2]

// Get just the first value
const first = yield* Fx.first(stream) // Option.some(1)
```

### Forking to Background

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"

const stream = Fx.periodic("1 second")

// Fork to background fiber
const fiber = yield* Fx.fork(stream)

// Later: interrupt the fiber
yield* Fiber.interrupt(fiber)

// Fork and collect in background
const collectFiber = yield* Fx.collectAllFork(stream)
```

### Running as Promise

```ts
import { Fx } from "effect/typed/fx"

const stream = Fx.fromIterable([1, 2, 3])

// Run and get Promise
await Fx.runPromise(stream)

// Run and get Promise<Exit>
const exit = await Fx.runPromiseExit(stream)
```

### Running with Layers

```ts
import { Effect, Layer } from "effect"
import { Fx } from "effect/typed/fx"

// Observe as a Layer
const observeLayer = Fx.observeLayer(stream, (value) => Effect.log(`Value: ${value}`))

// Drain as a Layer
const drainLayer = Fx.drainLayer(stream)

// Use in application
const app = drainLayer.pipe(
  Layer.provide(dependencies),
  Layer.launch,
  Effect.runPromise
)
```

## Error Handling

Fx provides robust error handling matching Effect's model.

### Catching Errors

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"

const stream = Fx.fromIterable([1, 2, 3]).pipe(
  Fx.mapEffect((n) => (n === 2 ? Effect.fail("Error at 2") : Effect.succeed(n)))
)

// Catch all errors
const recovered = Fx.catchAll(stream, (error) => Fx.succeed(`Recovered from: ${error}`))

// Catch specific tagged errors
const catchTagged = Fx.catchTag(stream, "NetworkError", (e) => Fx.succeed("Network failed, using cached data"))

// Catch any cause (including defects and interrupts)
const catchAnyCause = Fx.catchCause(stream, (cause) => Fx.succeed("Something went wrong"))
```

### Lifecycle Hooks

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"

const stream = Fx.fromIterable([1, 2, 3])

// Run effect on error
const withErrorLog = Fx.onError(stream, (cause) => Effect.log(`Stream failed: ${cause}`))

// Run effect on interrupt
const withInterruptLog = Fx.onInterrupt(stream, (fiberId) => Effect.log(`Stream interrupted by: ${fiberId}`))

// Run effect on any exit
const withExitLog = Fx.onExit(stream, (exit) => Effect.log(`Stream exited: ${exit}`))

// Ensure cleanup runs
const withCleanup = Fx.ensuring(stream, Effect.log("Cleanup complete"))
```

### Converting to Exit

```ts
import { Fx } from "effect/typed/fx"

const stream = Fx.fromIterable([1, 2, 3])

// Convert each value to Exit (never fails)
const exits = Fx.exit(stream) // Fx<Exit<number, E>>
```

## Resource Management

Fx leverages Effect's `Scope` to safely manage resources. When a stream starts, it can acquire resources, and when it ends, those resources are automatically released.

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"

// Using Fx.callback for resource management
const socketStream = Fx.callback<string>((emit) => {
  const socket = new WebSocket("ws://api.example.com")

  socket.onmessage = (event) => emit.succeed(event.data)
  socket.onerror = () => emit.fail(new Error("Socket error"))
  socket.onclose = () => emit.done()

  // Cleanup when stream ends
  return Effect.sync(() => socket.close())
})

// Using Fx.make with acquireRelease
const managedSocket = Fx.make((sink) =>
  Effect.gen(function*() {
    const socket = yield* Effect.acquireRelease(
      Effect.sync(() => new WebSocket("ws://api.example.com")),
      (ws) => Effect.sync(() => ws.close())
    )

    yield* Effect.async<never, never, never>((resume) => {
      socket.onmessage = (event) => {
        Effect.runFork(sink.onSuccess(event.data))
      }
      socket.onerror = (error) => {
        Effect.runFork(sink.onFailure(Cause.fail(error)))
      }
    })
  })
)
```

## Generator Syntax

`Fx.gen` creates an Fx from a generator that can yield Effects. The generator runs once to set up the stream.

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"
import * as RefSubject from "effect/typed/fx/RefSubject"

// Create a stream with local state
const Counter = Fx.gen(function*() {
  // Yield Effects to set up state
  const count = yield* RefSubject.make(0)
  const name = yield* Effect.succeed("Counter")

  // Return an Fx as the result
  return RefSubject.map(count, (n) => `${name}: ${n}`)
})

// Fx.genScoped for streams that need scoped resources
const WithResource = Fx.genScoped(function*() {
  // Acquire a scoped resource
  const connection = yield* acquireConnection

  // Return stream using the resource
  return Fx.fromEffect(connection.query("SELECT *"))
})
```

Key points about `Fx.gen`:

- The generator runs **once** during setup
- You can `yield*` any Effect to get its value
- The return value must be an `Fx`
- Use `Fx.genScoped` when you need scoped resources

## Fx.Service Pattern

Define Fx streams as injectable services for dependency injection:

```ts
import { Effect, Layer } from "effect"
import { Fx } from "effect/typed/fx"

// Define a service that provides an Fx stream
class Ticker extends Fx.Service<Ticker, number, never>()("Ticker") {}

// Create implementation layer
const TickerLive = Ticker.make(
  Fx.periodic("1 second").pipe(
    Fx.map((_, index) => index)
  )
)

// Use the service
const program = Effect.gen(function*() {
  yield* Fx.observe(Ticker, (tick) => Effect.log(`Tick: ${tick}`))
})

// Provide the layer
const main = program.pipe(Effect.provide(TickerLive))
```

Services can also be created from Effects:

```ts
class UserStream extends Fx.Service<UserStream, User, ApiError>()("UserStream") {}

const UserStreamLive = UserStream.make(
  Effect.gen(function*() {
    const api = yield* ApiClient
    return Fx.fromEffect(api.subscribeToUsers())
  })
)
```

## Context and Dependencies

Fx streams can require services, just like Effect:

```ts
import { Effect, Layer } from "effect"
import { Fx } from "effect/typed/fx"

class Database extends Effect.Service<Database>()("Database", {
  effect: Effect.succeed({
    query: (sql: string) => Effect.succeed(["row1", "row2"])
  })
}) {}

const userStream = Fx.fromEffect(
  Effect.gen(function*() {
    const db = yield* Database
    return yield* db.query("SELECT * FROM users")
  })
)

// Provide layer
const provided = Fx.provide(userStream, Database.Default)
```

## Interoperability

### Fx to Stream

Convert an `Fx` to a `Stream`. Events are buffered if the consumer is slower than the producer.

```ts
import { Stream } from "effect"
import { Fx } from "effect/typed/fx"

const fx = Fx.periodic("1 second")
const stream = Fx.toStream(fx) // Stream<void>
```

### Stream to Fx

Convert a `Stream` to an `Fx`.

```ts
import { Stream } from "effect"
import { Fx } from "effect/typed/fx"

const stream = Stream.make(1, 2, 3)
const fx = Fx.fromStream(stream) // Fx<number>
```

## Next Steps

- Learn about **RefSubject** for reactive state management
- Explore **Computed** for derived reactive values
- See **Subject** for sharing streams across multiple subscribers
- Check out **Versioned** for optimistic UI updates
