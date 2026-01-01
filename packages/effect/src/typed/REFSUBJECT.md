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

const program = Effect.gen(function* () {
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

## Creating RefSubjects

### From a Plain Value

```ts
import { Effect } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function* () {
  const count = yield* RefSubject.make(42)
  const value = yield* count
  console.log(value) // 42
})
```

### From an Effect

```ts
import { Effect } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function* () {
  // Initialize from an async operation
  const user = yield* RefSubject.make(
    Effect.gen(function* () {
      // Simulate API call
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

const program = Effect.gen(function* () {
  // Track the latest value from a stream
  const latest = yield* RefSubject.make(
    Fx.fromIterable([1, 2, 3, 4, 5])
  )

  // Get the latest value
  const value = yield* latest
  console.log(value) // 5 (last emitted value)
})
```

## Basic Operations

### Getting Values

```ts
import { Effect } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function* () {
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

const program = Effect.gen(function* () {
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

const program = Effect.gen(function* () {
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

### Resetting Values

```ts
import { Effect, Option } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function* () {
  const count = yield* RefSubject.make(0)

  yield* RefSubject.set(count, 10)
  const before = yield* count
  console.log(before) // 10

  // Reset to initial value
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

const program = Effect.gen(function* () {
  const count = yield* RefSubject.make(0)

  // Observe changes
  yield* Fx.observe(
    count,
    (value) => Effect.sync(() => console.log("Changed:", value))
  )

  // Updates trigger observations
  yield* RefSubject.set(count, 1)
  // Output: "Changed: 1"

  yield* RefSubject.set(count, 2)
  // Output: "Changed: 2"
})
```

## Transactional Updates

Use `updates` for atomic, serialized operations:

```ts
import { Effect } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function* () {
  const balance = yield* RefSubject.make(100)

  // Atomic transfer operation
  yield* balance.updates((ref) =>
    Effect.gen(function* () {
      const current = yield* ref.get
      if (current >= 50) {
        yield* ref.set(current - 50)
        return "Transfer successful"
      }
      return "Insufficient funds"
    })
  )

  const newBalance = yield* balance
  console.log(newBalance) // 50
})
```

## Derived State with Computed

Create read-only derived values:

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function* () {
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

## Combining Multiple RefSubjects

### Tuples

```ts
import { Effect } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function* () {
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

const program = Effect.gen(function* () {
  const firstName = yield* RefSubject.make("Alice")
  const lastName = yield* RefSubject.make("Smith")
  const age = yield* RefSubject.make(30)

  // Combine into a struct
  const person = RefSubject.struct({
    firstName,
    lastName,
    age
  })

  const fullPerson = yield* person
  console.log(fullPerson)
  // { firstName: "Alice", lastName: "Smith", age: 30 }

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

const program = Effect.gen(function* () {
  const numbers = yield* RefSubject.make([1, 2, 3, 4, 5])

  // Get first even number (may not exist)
  const firstEven = RefSubject.filterMap(numbers, (arr) =>
    Option.fromNullable(arr.find((n) => n % 2 === 0))
  )

  const value = yield* firstEven
  console.log(value) // 2

  // If array becomes empty, Filtered will fail
  yield* RefSubject.set(numbers, [])
  // yield* firstEven would fail with NoSuchElementError
})
```

## Working with Arrays

Use `RefArray` for specialized array operations:

```ts
import { Effect } from "effect"
import * as RefArray from "effect/typed/fx/RefSubject/RefArray"

const program = Effect.gen(function* () {
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

1. **Use RefSubject for mutable state**: When you need to update and observe state
2. **Use Computed for derived values**: When you need read-only computed state
3. **Use Filtered for optional values**: When values may not always exist
4. **Use `updates` for transactions**: When you need atomic operations
5. **Observe changes with Fx.observe**: When you need to react to state changes
6. **Combine with `struct` or `tuple`**: When managing related state
7. **Clean up with `interrupt`**: When done with a RefSubject

## Common Patterns

### Counter Component

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"
import * as RefSubject from "effect/typed/fx/RefSubject"

const Counter = Effect.gen(function* () {
  const count = yield* RefSubject.make(0)

  const increment = () => RefSubject.increment(count)
  const decrement = () => RefSubject.decrement(count)

  return {
    count,
    increment,
    decrement
  }
})
```

### Form State

```ts
import { Effect } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const FormState = Effect.gen(function* () {
  const name = yield* RefSubject.make("")
  const email = yield* RefSubject.make("")
  const age = yield* RefSubject.make(0)

  const form = RefSubject.struct({ name, email, age })

  return { name, email, age, form }
})
```

### Derived Computations

```ts
import { Effect } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function* () {
  const price = yield* RefSubject.make(100)
  const quantity = yield* RefSubject.make(2)

  // Compute total
  const total = RefSubject.map(
    RefSubject.tuple([price, quantity]),
    ([p, q]) => p * q
  )

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

