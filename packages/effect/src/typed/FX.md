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

// Empty stream
const empty = Fx.empty

// Failed stream
const failed = Fx.fail("Something went wrong")

// From an array
const fromArray = Fx.fromIterable([1, 2, 3])
```

### From Effects

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"

// Convert an Effect to an Fx (emits once)
const fromEffect = Fx.fromEffect(
  Effect.succeed("Hello")
)
```

### From Time & Scheduling

```ts
import { Duration } from "effect"
import { Fx } from "effect/typed/fx"

// Emit void every second
const periodic = Fx.periodic("1 seconds")

// Emit a value after a delay
const delayed = Fx.at("5 seconds", "Hello")
```

## Transforming Streams

### Mapping & Filtering

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"

const program = Effect.gen(function*() {
  const numbers = Fx.fromIterable([1, 2, 3, 4, 5])

  // Transform values
  const doubled = Fx.map(numbers, (n) => n * 2)

  // Filter values
  const evens = Fx.filter(doubled, (n) => n % 2 === 0)

  // Effectful transformation
  const logged = Fx.tap(evens, (n) => Effect.log(`Saw even number: ${n}`))
})
```

### Flattening & Composition

The way you flatten streams determines how they handle concurrency:

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"

const triggers = Fx.fromIterable([1, 2, 3])
// flatMap: Runs all inner streams concurrently without limit
// All inner streams start immediately and run in parallel
const merged = Fx.flatMap(triggers, (n) => Fx.fromEffect(longRunningTask(n)))

// switchMap: Switches to the latest stream, cancelling the previous one
// Perfect for "latest state" or "autocomplete"
const switched = Fx.switchMap(triggers, (query) => Fx.fromEffect(searchApi(query)))

// flatMapConcurrently: Controls concurrency with a semaphore
// Limits how many inner streams can run at once
const mergedConcurrently = Fx.flatMapConcurrently(triggers, (n) => Fx.fromEffect(longRunningTask(n)), { concurrency: 5 })
```

## Resource Management

Fx leverages Effect's `Scope` to safely manage resources. When a stream starts, it can acquire resources (like event listeners or sockets), and when it ends (completes, fails, or is interrupted), those resources are automatically released.

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"

// A stream that manages a WebSocket connection
const socketStream = Fx.make((sink) =>
  Effect.gen(function*() {
    // Acquire the socket
    const socket = yield* Effect.acquireRelease(
      Effect.sync(() => new WebSocket("ws://api.example.com")),
      (ws) => Effect.sync(() => ws.close())
    )

    // Listen for messages
    yield* Effect.async<never, never, never>((resume) => {
      socket.onmessage = (event) => {
        // Emit to sink
        Effect.runFork(sink.onSuccess(event.data))
      }
      socket.onerror = (error) => {
        // Fail stream
        Effect.runFork(sink.onFailure(Cause.fail(error)))
      }
    })
  })
)

// When this stream is run, the socket opens.
// When the consumer stops listening (unsubscribes), the socket closes.
```

## Error Handling

Fx provides robust error handling capabilities matching Effect's model.

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"

const stream = Fx.fromIterable([1, 2, 3]).pipe(
  Fx.mapEffect((n) => n === 2 ? Effect.fail("Error at 2") : Effect.succeed(n)),
  // Recover from specific errors
  Fx.catchTag("MyError", (e) => Fx.succeed(0)),
  // Recover from all errors
  Fx.catchAll((e) => Fx.succeed(`Recovered: ${e}`)),
  // Retry on failure
  Fx.retry({ times: 3, schedule: Schedule.exponential("100 millis") })
)
```

## Concurrency & Scheduling

Since Fx is push-based, controlling the _rate_ of events is often necessary.

```ts
import { Fx } from "effect/typed/fx"

const events = Fx.fromIterable([1, 2, 3])

// Debounce: Wait for silence before emitting
// Good for search inputs
const debounced = Fx.debounce(events, "500 millis")

// Throttle: Emit at most once per window
// Good for scroll events
const throttled = Fx.throttle(events, "100 millis")
```

## Interoperability

### Fx to Stream

You can convert an `Fx` to a `Stream`. Note that this buffers events if the `Stream` consumer is slower than the `Fx` producer.

```ts
import { Stream } from "effect/stream"
import { Fx } from "effect/typed/fx"

const fx = Fx.periodic("1 seconds")
const stream = Fx.toStream(fx) // Stream<void>
```

### Stream to Fx

You can convert a `Stream` to an `Fx`.

```ts
import { Stream } from "effect/stream"
import { Fx } from "effect/typed/fx"

const stream = Stream.make(1, 2, 3)
const fx = Fx.fromStream(stream) // Fx<number>
```

## Generator Syntax

`Fx.gen` provides a convenient way to work with Fx using generator syntax, similar to `Effect.gen`.

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"

const program = Fx.gen(function*() {
  const a = yield* someFx
  const b = yield* anotherFx

  // If 'a' emits multiple times, this block re-runs?
  // NO: Fx.gen is for *creating* a stream, not consuming it like async/await.
  // It's primarily used for *composition* of Effects into an Fx.

  const user = yield* Effect.succeed({ name: "Alice" })
  return Fx.succeed(user)
})
```

## Context and Dependencies

Fx streams can require services, just like Effect:

```ts
import { Effect, ServiceMap } from "effect"
import { Fx } from "effect/typed/fx"

class Database
  extends ServiceMap.Service<Database, { readonly query: (sql: string) => Effect.Effect<string[]> }>()("Database")
{}

const program = Effect.gen(function*() {
  const stream = Fx.fromEffect(
    Effect.flatMap(Database, (db) => db.query("SELECT * FROM users"))
  )

  // Stream requires Database service
  yield* Fx.observe(stream, (users) => Effect.sync(() => console.log(users)))
})
```

## Next Steps

- Learn about **RefSubject** for reactive state management
- Explore **Computed** for derived reactive values
- See **Subject** for sharing streams across multiple subscribers
- Check out **Versioned** for optimistic UI updates
