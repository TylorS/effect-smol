# RefSubject: Reactive State Management

## Introduction

`RefSubject` is Typed's solution for reactive state management. It combines the capabilities of a `Ref` (mutable state) with a `Subject` (observable streams), giving you a powerful primitive for building reactive applications.

If you're familiar with React's `useState` or MobX observables, `RefSubject` provides similar capabilities but with Effect's type safety, error handling, and resource management.

## What is RefSubject?

A `RefSubject<A, E, R>` is:

- **A mutable reference** that holds a value of type `A`
- **An observable stream** that emits updates when the value changes
- **An Effect** that can sample the current value
- **Type-safe** with error handling (`E`) and context requirements (`R`)

```ts
import { Effect } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function*() {
  // Create a RefSubject with initial value
  const count = yield* RefSubject.make(0)

  // Get current value (as Effect)
  const current = yield* count
  console.log(current) // 0

  // Update the value
  yield* RefSubject.set(count, 5)

  // Value automatically updates
  const updated = yield* count
  console.log(updated) // 5
})
```

## Type Hierarchy

RefSubject is part of a type hierarchy that provides different levels of capability:

```
Versioned (base: version tracking + Fx + Effect)
    ↓
Computed (read-only derived values)
    ↓
RefSubject (mutable + observable + computed)
```

- **Versioned**: The foundation - combines an Fx stream with an Effect for sampling, plus version tracking
- **Computed**: Read-only view of a changing value, created by transforming a RefSubject
- **Filtered**: Like Computed but may not always have a value (wraps Option)
- **RefSubject**: Full mutable reference with get/set/update capabilities

## Creating RefSubjects

### From a Plain Value

```ts
import { Effect } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function*() {
  const count = yield* RefSubject.make(42)
  const value = yield* count
  console.log(value) // 42
})
```

### From an Effect

```ts
import { Effect } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function*() {
  // Initialize from an async operation
  const user = yield* RefSubject.make(
    Effect.gen(function*() {
      yield* Effect.sleep("100 millis")
      return { name: "Alice", age: 30 }
    })
  )

  const data = yield* user
  console.log(data) // { name: "Alice", age: 30 }
})
```

### From an Fx Stream

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function*() {
  // Track the latest value from a stream
  const latest = yield* RefSubject.make(Fx.fromIterable([1, 2, 3, 4, 5]))

  // Get the latest value
  const value = yield* latest
  console.log(value) // 5 (last emitted value)
})
```

### With Custom Equality

Use the `eq` option for custom equality checking:

```ts
import { Effect } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function*() {
  // Only emit when id changes, ignore other property changes
  const user = yield* RefSubject.make(
    { id: 1, name: "Alice", lastSeen: new Date() },
    { eq: (a, b) => a.id === b.id }
  )

  // This won't trigger subscribers (same id)
  yield* RefSubject.set(user, { id: 1, name: "Alice", lastSeen: new Date() })
})
```

## Basic Operations

### Getting Values

```ts
import { Effect } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function*() {
  const count = yield* RefSubject.make(10)

  // Sample the current value
  const current = yield* count
  console.log(current) // 10
})
```

### Setting Values

```ts
import { Effect } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function*() {
  const count = yield* RefSubject.make(0)

  // Set a new value
  yield* RefSubject.set(count, 42)
  const value = yield* count
  console.log(value) // 42

  // Can also use pipe syntax
  yield* count.pipe(RefSubject.set(100))
  const newValue = yield* count
  console.log(newValue) // 100
})
```

### Updating Values

```ts
import { Effect } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function*() {
  const count = yield* RefSubject.make(5)

  // Update using a function
  yield* RefSubject.update(count, (n) => n + 1)
  const value = yield* count
  console.log(value) // 6

  // Increment helper
  yield* RefSubject.increment(count)
  const incremented = yield* count
  console.log(incremented) // 7

  // Decrement helper
  yield* RefSubject.decrement(count)
  const decremented = yield* count
  console.log(decremented) // 6
})
```

### Updating with Effects

```ts
import { Effect } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function*() {
  const count = yield* RefSubject.make(5)

  // Update with an async operation
  yield* RefSubject.updateEffect(count, (value) =>
    Effect.gen(function*() {
      yield* Effect.sleep("100 millis")
      return value * 2
    }))

  const result = yield* count
  console.log(result) // 10
})
```

### Modifying Values (Get + Set)

```ts
import { Effect } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function*() {
  const count = yield* RefSubject.make(5)

  // Get the old value and set a new one, returning the old
  const oldValue = yield* RefSubject.modify(count, (value) => [value, value + 10] as const)

  console.log(oldValue) // 5
  const newValue = yield* count
  console.log(newValue) // 15
})
```

### Resetting Values

```ts
import { Effect, Option } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function*() {
  const count = yield* RefSubject.make(0)

  yield* RefSubject.set(count, 10)
  const before = yield* count
  console.log(before) // 10

  // Reset to initial value (also available as RefSubject.delete)
  const previous = yield* RefSubject.reset(count)
  console.log(Option.isSome(previous)) // true
  console.log(previous.value) // 10

  const after = yield* count
  console.log(after) // 0 (back to initial)
})
```

## Observing Changes

RefSubject is also an `Fx`, so you can observe changes:

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function*() {
  const count = yield* RefSubject.make(0)

  // Observe changes
  yield* Fx.observe(count, (value) => Effect.log(`Changed: ${value}`))

  // Updates trigger observations
  yield* RefSubject.set(count, 1) // Output: "Changed: 1"
  yield* RefSubject.set(count, 2) // Output: "Changed: 2"
})
```

## Transactional Updates

Use `updates` for atomic, serialized operations:

```ts
import { Effect } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function*() {
  const balance = yield* RefSubject.make(100)

  // Atomic transfer operation
  const result = yield* balance.updates((ref) =>
    Effect.gen(function*() {
      const current = yield* ref.get
      if (current >= 50) {
        yield* ref.set(current - 50)
        return "Transfer successful"
      }
      return "Insufficient funds"
    })
  )

  console.log(result) // "Transfer successful"
  const newBalance = yield* balance
  console.log(newBalance) // 50
})
```

### With Interrupt Handling

Use `runUpdates` for updates with interrupt handling:

```ts
import { Effect } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function*() {
  const balance = yield* RefSubject.make(100)

  yield* RefSubject.runUpdates(
    balance,
    (ref) =>
      Effect.gen(function*() {
        const current = yield* ref.get
        yield* Effect.sleep("1 second") // Long operation
        yield* ref.set(current - 50)
        return "Done"
      }),
    {
      onInterrupt: (value) => Effect.log(`Interrupted at balance: ${value}`),
      value: "current" // or "initial" to use initial value on interrupt
    }
  )
})
```

## RefSubject.Service Pattern

Define RefSubjects as injectable services for dependency injection. This is the recommended pattern for shared application state.

### Defining a Service

```ts
import { Effect, Layer } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

// Define a service class
class Counter extends RefSubject.Service<Counter, number, never>()("Counter") {}

// Create implementation layer from value, effect, stream, or fx
const CounterLive = Counter.make(0)
// const CounterLive = Counter.make(Effect.succeed(0))
// const CounterLive = Counter.make(Stream.succeed(0))
// const CounterLive = Counter.make(Fx.succeed(0))

// Use the service
const program = Effect.gen(function*() {
  // Get current value
  const count = yield* Counter
  console.log(count) // 0

  // Set value
  yield* RefSubject.set(Counter, 5)

  // Update value
  yield* RefSubject.increment(Counter)

  const final = yield* Counter
  console.log(final) // 6
})

// Provide the layer
const main = program.pipe(Effect.provide(CounterLive))
```

### Service with Initial Effect

```ts
import { Effect, Layer } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

interface User {
  readonly id: string
  readonly name: string
}

class CurrentUser extends RefSubject.Service<CurrentUser, User, never>()("CurrentUser") {}

// Initialize from an Effect
const CurrentUserLive = CurrentUser.make(
  Effect.gen(function*() {
    // Simulate fetching current user
    yield* Effect.sleep("100 millis")
    return { id: "1", name: "Alice" }
  })
)
```

### Service from Fx Stream

```ts
import { Effect, Layer } from "effect"
import { Fx } from "effect/typed/fx"
import * as RefSubject from "effect/typed/fx/RefSubject"

class Ticker extends RefSubject.Service<Ticker, number, never>()("Ticker") {}

// Track latest value from a stream
const TickerLive = Ticker.make(
  Fx.periodic("1 second").pipe(Fx.map((_, i) => i))
)
```

### Using Services in Templates

```ts
import { Effect, Layer } from "effect"
import { Fx } from "effect/typed/fx"
import * as RefSubject from "effect/typed/fx/RefSubject"
import { html } from "effect/typed/template"

// Define state services
class TodoText extends RefSubject.Service<TodoText, string, never>()("TodoText") {}
class TodoList extends RefSubject.Service<TodoList, Todo[], never>()("TodoList") {}

// Use directly in templates
const TodoInput = html`
  <input
    .value=${TodoText}
    oninput=${(e) => RefSubject.set(TodoText, e.target.value)}
  />
`

// Observe in templates
const TodoCount = RefSubject.map(TodoList, (list) => list.length)
const CountDisplay = html`<span>Total: ${TodoCount}</span>`
```

## Derived State with Computed

Create read-only derived values:

```ts
import { Effect } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function*() {
  const count = yield* RefSubject.make(5)

  // Create a computed that doubles the count
  const doubled = RefSubject.map(count, (n) => n * 2)

  const value = yield* doubled
  console.log(value) // 10

  // Update source
  yield* RefSubject.set(count, 7)

  // Computed automatically updates
  const newValue = yield* doubled
  console.log(newValue) // 14
})
```

## Proxy Access

Use `proxy` to access nested properties as individual Computed values:

```ts
import { Effect } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function*() {
  const user = yield* RefSubject.make({
    name: "Alice",
    age: 30,
    address: { city: "New York", zip: "10001" }
  })

  // Create a proxy to access nested properties
  const { name, age, address } = RefSubject.proxy(user)

  // Access individual properties as Computed values
  const currentName = yield* name
  console.log(currentName) // "Alice"

  // Each property only updates when that specific value changes
  // Great for fine-grained reactivity in templates
})
```

## Combining Multiple RefSubjects

### Tuples

```ts
import { Effect } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function*() {
  const x = yield* RefSubject.make(10)
  const y = yield* RefSubject.make(20)
  const z = yield* RefSubject.make(30)

  // Combine into a tuple
  const point = RefSubject.tuple([x, y, z])

  const coords = yield* point
  console.log(coords) // [10, 20, 30]

  // Update one value
  yield* RefSubject.set(x, 15)

  // Tuple automatically updates
  const updated = yield* point
  console.log(updated) // [15, 20, 30]
})
```

### Structs

```ts
import { Effect } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function*() {
  const firstName = yield* RefSubject.make("Alice")
  const lastName = yield* RefSubject.make("Smith")
  const age = yield* RefSubject.make(30)

  // Combine into a struct
  const person = RefSubject.struct({ firstName, lastName, age })

  const fullPerson = yield* person
  console.log(fullPerson) // { firstName: "Alice", lastName: "Smith", age: 30 }

  // Update one field
  yield* RefSubject.set(firstName, "Bob")

  // Struct automatically updates
  const updated = yield* person
  console.log(updated.firstName) // "Bob"
})
```

## Filtered Values

Use `Filtered` for values that may not always exist:

```ts
import { Effect, Option } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function*() {
  const numbers = yield* RefSubject.make([1, 2, 3, 4, 5])

  // Get first even number (may not exist)
  const firstEven = RefSubject.filterMap(numbers, (arr) => Option.fromNullable(arr.find((n) => n % 2 === 0)))

  const value = yield* firstEven
  console.log(value) // 2

  // If array becomes empty, Filtered will fail
  yield* RefSubject.set(numbers, [])
  // yield* firstEven would fail with NoSuchElementError

  // Convert to Option instead
  const maybeEven = firstEven.asComputed()
  const option = yield* maybeEven
  console.log(Option.isNone(option)) // true
})
```

## Slicing Emissions

Limit which emissions are observed:

```ts
import { Effect } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function*() {
  const count = yield* RefSubject.make(0)

  // Skip first 2 emissions, take next 3
  const sliced = RefSubject.slice(count, 2, 3)

  // Can also use with Service pattern
  class Counter extends RefSubject.Service<Counter, number>()("Counter") {}
  const CounterLive = Counter.make(0, { skip: 1, take: 10 })
})
```

## Type Guards

```ts
import * as RefSubject from "effect/typed/fx/RefSubject"

const maybeRef = getSomeValue()

if (RefSubject.isRefSubject(maybeRef)) {
  // TypeScript knows maybeRef is RefSubject<any, any, any>
  yield* RefSubject.set(maybeRef, newValue)
}
```

## Type Helpers

Extract types from RefSubject, Computed, or Filtered:

```ts
import * as RefSubject from "effect/typed/fx/RefSubject"

type MyRef = RefSubject.RefSubject<string, Error, MyService>

type Value = RefSubject.Success<MyRef> // string
type Err = RefSubject.Error<MyRef> // Error
type Deps = RefSubject.Services<MyRef> // MyService
```

## Working with Arrays

Use `RefArray` for specialized array operations:

```ts
import { Effect } from "effect"
import * as RefArray from "effect/typed/fx/RefSubject/RefArray"

const program = Effect.gen(function*() {
  const items = yield* RefArray.make([1, 2, 3])

  // Append a value
  yield* RefArray.append(items, 4)
  const values = yield* items
  console.log(values) // [1, 2, 3, 4]

  // Prepend a value
  yield* RefArray.prepend(items, 0)
  const prepended = yield* items
  console.log(prepended) // [0, 1, 2, 3, 4]

  // Get first element (Filtered)
  const first = RefArray.head(items)
  const firstValue = yield* first
  console.log(firstValue) // 0

  // Get last element (Filtered)
  const last = RefArray.last(items)
  const lastValue = yield* last
  console.log(lastValue) // 4
})
```

## Best Practices

1. **Use RefSubject.Service for shared state**: Define global state as services for easy testing and DI
2. **Use Computed for derived values**: Don't store computed data in RefSubjects
3. **Use Filtered for optional values**: When values may not always exist
4. **Use `updates` for transactions**: When you need atomic operations
5. **Use `proxy` for nested access**: Get fine-grained reactivity for object properties
6. **Combine with `struct` or `tuple`**: When managing related state
7. **Use custom equality**: Prevent unnecessary updates with the `eq` option

## Common Patterns

### Counter Component

```ts
import { Effect } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

class Count extends RefSubject.Service<Count, number>()("Count") {}
const CountLive = Count.make(0)

const increment = RefSubject.increment(Count)
const decrement = RefSubject.decrement(Count)
```

### Form State

```ts
import { Effect, Layer } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

class FormState extends RefSubject.Service<FormState, {
  name: string
  email: string
  age: number
}>()("FormState") {}

const FormStateLive = FormState.make({ name: "", email: "", age: 0 })

// Access individual fields via proxy
const { name, email, age } = RefSubject.proxy(FormState)
```

### Derived Computations

```ts
import { Effect } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function*() {
  const price = yield* RefSubject.make(100)
  const quantity = yield* RefSubject.make(2)

  // Compute total
  const total = RefSubject.map(RefSubject.tuple([price, quantity]), ([p, q]) => p * q)

  const value = yield* total
  console.log(value) // 200

  // Update price
  yield* RefSubject.set(price, 150)

  // Total automatically updates
  const newTotal = yield* total
  console.log(newTotal) // 300
})
```

## Next Steps

- Learn about **Computed** for read-only derived values
- Explore **Filtered** for optional values
- See how **Versioned** enables optimistic UI updates
- Check out **Subject** for sharing streams
