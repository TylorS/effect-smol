# Fx: Reactive Streams in Effect

## Introduction

`Fx` is Effect's reactive stream primitive, designed for building reactive applications with full type safety and Effect's powerful concurrency and error handling capabilities. If you're familiar with Effect, `Fx` extends those patterns to handle streams of values over time.

## What is Fx?

An `Fx<A, E, R>` is a push-based stream that:
- **Emits values** of type `A` over time
- **Can fail** with an error of type `E`
- **Requires context** of type `R` (services, dependencies)

Think of `Fx` as Effect's answer to RxJS Observables or AsyncIterables, but built on Effect's fiber-based concurrency model with full type safety and resource management.

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

### From Values

```ts
import { Fx } from "effect/typed/fx"

// Single value
const single = Fx.succeed(42)

// Empty stream
const empty = Fx.empty

// Failed stream
const failed = Fx.fail("Something went wrong")
```

### From Effects

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"

// Convert an Effect to an Fx
const fromEffect = Fx.fromEffect(
  Effect.succeed("Hello")
)
```

### From Iterables

```ts
import { Fx } from "effect/typed/fx"

// From an array
const fromArray = Fx.fromIterable([1, 2, 3])

// From a generator
function* numbers() {
  yield 1
  yield 2
  yield 3
}
const fromGenerator = Fx.fromIterable(numbers())
```

### Periodic Streams

```ts
import { Duration } from "effect"
import { Fx } from "effect/typed/fx"

// Emit void every second
const periodic = Fx.periodic("1 seconds")

// Emit a value at a specific time
const delayed = Fx.at("5 seconds", "Hello")
```

### Custom Streams

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"
import * as Sink from "effect/typed/fx/Sink"

// Create a custom stream
const custom = Fx.make((sink) =>
  Effect.gen(function* () {
    // Emit values
    yield* sink.onSuccess(1)
    yield* sink.onSuccess(2)
    yield* sink.onSuccess(3)
  })
)
```

## Consuming Fx Streams

### Observing Values

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"

const program = Effect.gen(function* () {
  const stream = Fx.fromIterable([1, 2, 3])

  // Observe each value
  yield* Fx.observe(
    stream,
    (value) => Effect.sync(() => console.log(value))
  )
  // Output: 1, 2, 3
})
```

### Collecting Values

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"

const program = Effect.gen(function* () {
  const stream = Fx.fromIterable([1, 2, 3])

  // Collect all values into an array
  const values = yield* Fx.collectAll(stream)
  console.log(values) // [1, 2, 3]

  // Collect up to N values
  const firstTwo = yield* Fx.collectUpTo(stream, 2)
  console.log(firstTwo) // [1, 2]
})
```

### Getting the First Value

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"

const program = Effect.gen(function* () {
  const stream = Fx.fromIterable([1, 2, 3])

  // Get the first value
  const first = yield* Fx.first(stream)
  console.log(first) // 1
})
```

### Running to Promise

```ts
import { Fx } from "effect/typed/fx"

// Run an Fx to completion, returning a Promise
const promise = Fx.runPromise(
  Fx.fromIterable([1, 2, 3])
)

promise.then(() => {
  console.log("Completed!")
})
```

## Transforming Streams

### Mapping Values

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"

const program = Effect.gen(function* () {
  const numbers = Fx.fromIterable([1, 2, 3])

  // Transform each value
  const doubled = Fx.map(numbers, (n) => n * 2)

  yield* Fx.observe(doubled, (value) =>
    Effect.sync(() => console.log(value))
  )
  // Output: 2, 4, 6
})
```

### Filtering Values

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"

const program = Effect.gen(function* () {
  const numbers = Fx.fromIterable([1, 2, 3, 4, 5])

  // Keep only even numbers
  const evens = Fx.filter(numbers, (n) => n % 2 === 0)

  yield* Fx.observe(evens, (value) =>
    Effect.sync(() => console.log(value))
  )
  // Output: 2, 4
})
```

### Taking and Skipping

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"

const program = Effect.gen(function* () {
  const numbers = Fx.fromIterable([1, 2, 3, 4, 5])

  // Take first 3 values
  const firstThree = Fx.take(numbers, 3)
  yield* Fx.observe(firstThree, (value) =>
    Effect.sync(() => console.log(value))
  )
  // Output: 1, 2, 3

  // Skip first 2 values
  const afterTwo = Fx.skip(numbers, 2)
  yield* Fx.observe(afterTwo, (value) =>
    Effect.sync(() => console.log(value))
  )
  // Output: 3, 4, 5
})
```

## Composing Streams

### FlatMap: Transforming to New Streams

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"

const program = Effect.gen(function* () {
  const numbers = Fx.fromIterable([1, 2, 3])

  // Transform each value into a new stream
  const expanded = Fx.flatMap(numbers, (n) =>
    Fx.fromIterable([n, n * 2, n * 3])
  )

  yield* Fx.observe(expanded, (value) =>
    Effect.sync(() => console.log(value))
  )
  // Output: 1, 2, 3, 2, 4, 6, 3, 6, 9
})
```

### SwitchMap: Latest Stream Only

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"

const program = Effect.gen(function* () {
  const triggers = Fx.fromIterable([1, 2, 3])

  // Switch to latest stream, canceling previous ones
  const switched = Fx.switchMap(triggers, (n) =>
    Fx.fromIterable([`A${n}`, `B${n}`, `C${n}`])
  )

  yield* Fx.observe(switched, (value) =>
    Effect.sync(() => console.log(value))
  )
  // Only values from the last trigger are emitted
})
```

### Merging Multiple Streams

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"

const program = Effect.gen(function* () {
  const stream1 = Fx.fromIterable([1, 2, 3])
  const stream2 = Fx.fromIterable([4, 5, 6])

  // Merge streams concurrently
  const merged = Fx.mergeAll([stream1, stream2])

  yield* Fx.observe(merged, (value) =>
    Effect.sync(() => console.log(value))
  )
  // Values from both streams interleaved
})
```

## Generator Syntax

`Fx.gen` provides a convenient way to run some Effect that produces an Fx:

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"

const program = Fx.gen(function* () {
  const a = yield* someEffectA()
  const b = yield* someEffectB()
  const c = yield* someEffectC()

  return Fx.succeed(a + b + c)
})
```

## Error Handling

Fx streams handle errors just like Effect:

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"

const program = Effect.gen(function* () {
  const stream = Fx.fromIterable([1, 2, 3]).pipe(
    Fx.mapEffect((n) =>
      n === 2 ? Effect.fail("Error at 2") : Effect.succeed(n)
    ),
    Fx.catchAll((error) => Fx.succeed(`Recovered: ${error}`))
  )

  yield* Fx.observe(stream, (value) =>
    Effect.sync(() => console.log(value))
  )
  // Output: 1, "Recovered: Error at 2"
})
```

## Context and Dependencies

Fx streams can require services, just like Effect:

```ts
import { Effect, ServiceMap } from "effect"
import { Fx } from "effect/typed/fx"

class Database extends ServiceMap.Service<Database, { readonly query: (sql: string) => Effect.Effect<string[]> }>()("Database") {}

const program = Effect.gen(function* () {
  const stream = Fx.fromEffect(
    Effect.flatMap(Database, (db) => db.query("SELECT * FROM users"))
  )

  // Stream requires Database service
  yield* Fx.observe(stream, (users) =>
    Effect.sync(() => console.log(users))
  )
})
```

## Best Practices

1. **Use `Fx.observe` for side effects**: When you need to perform side effects for each value
2. **Use `Fx.collectAll` for small streams**: When you need all values at once
3. **Use `Fx.first` for single values**: When you only need the first emitted value
4. **Prefer `Fx.switchMap` over `Fx.flatMap`**: When you want to cancel previous streams
5. **Handle errors explicitly**: Use `Fx.catchAll` or `Fx.catchSome` for error recovery
6. **Manage resources**: Use `Fx.genScoped` for streams that need resource cleanup

## Next Steps

- Learn about **RefSubject** for reactive state management
- Explore **Computed** for derived reactive values
- See **Subject** for sharing streams across multiple subscribers
- Check out **Versioned** for optimistic UI updates

