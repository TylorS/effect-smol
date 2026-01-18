# Computed: Derived Reactive Values

## Introduction

`Computed` is Effect's solution for creating read-only derived reactive values. It's similar to computed properties in Vue or derived state in MobX, but built on Effect's type-safe reactive primitives.

If you understand `RefSubject` for mutable state, `Computed` is for values that are derived from other reactive sources and automatically update when their dependencies change.

## What is Computed?

A `Computed<A, E, R>` is:

- **A read-only view** of a value that changes over time
- **An Fx** that emits the current value and subsequent updates
- **An Effect** that samples the current value
- **Automatically updates** when its dependencies change

```ts
import { Effect } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function*() {
  const count = yield* RefSubject.make(5)

  // Create a computed that doubles the count
  const doubled = RefSubject.map(count, (n) => n * 2)

  // Sample the computed value
  const value = yield* doubled
  console.log(value) // 10

  // Update the source
  yield* RefSubject.set(count, 7)

  // The computed automatically reflects the change
  const newValue = yield* doubled
  console.log(newValue) // 14
})
```

## Creating Computed Values

### From RefSubject

The most common way to create a `Computed` is by transforming a `RefSubject`:

```ts
import { Effect } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function*() {
  const count = yield* RefSubject.make(10)

  // Map creates a Computed
  const doubled = RefSubject.map(count, (n) => n * 2)
  const squared = RefSubject.map(count, (n) => n * n)

  const d = yield* doubled
  const s = yield* squared
  console.log(d) // 20
  console.log(s) // 100
})
```

### With Effectful Transformations

Use `mapEffect` when the transformation requires an Effect:

```ts
import { Effect } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function*() {
  const userId = yield* RefSubject.make(1)

  // Transform with async operation
  const user = RefSubject.mapEffect(userId, (id) =>
    Effect.gen(function*() {
      // Simulate API call
      yield* Effect.sleep("100 millis")
      return { id, name: `User ${id}` }
    }))

  const data = yield* user
  console.log(data) // { id: 1, name: "User 1" }
})
```

### From Multiple Sources

Combine multiple reactive sources:

```ts
import { Effect } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function*() {
  const price = yield* RefSubject.make(100)
  const quantity = yield* RefSubject.make(2)
  const discount = yield* RefSubject.make(0.1)

  // Compute total from multiple sources
  const total = RefSubject.map(
    RefSubject.struct({ price, quantity, discount }),
    ({ price, quantity, discount }) => price * quantity * (1 - discount)
  )

  const value = yield* total
  console.log(value) // 180 (100 * 2 * 0.9)
})
```

## Filtered Values

`Filtered` is a special type of `Computed` that may not always have a value:

```ts
import { Effect, Option } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function*() {
  const numbers = yield* RefSubject.make([1, 2, 3, 4, 5])

  // Find first even number (may not exist)
  const firstEven = RefSubject.filterMap(numbers, (arr) => Option.fromNullable(arr.find((n) => n % 2 === 0)))

  // Try to get the value (may fail with NoSuchElementError)
  const value = yield* firstEven
  console.log(value) // 2

  // Or convert back to Option
  const option = firstEven.asComputed()
  const maybeValue = yield* option
  console.log(Option.isSome(maybeValue)) // true
})
```

## Observing Computed Values

Since `Computed` is an `Fx`, you can observe changes:

```ts
import { Effect } from "effect"
import { Fx } from "effect/typed/fx"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function*() {
  const count = yield* RefSubject.make(0)
  const doubled = RefSubject.map(count, (n) => n * 2)

  // Observe computed value changes
  yield* Fx.observe(
    doubled,
    (value) => Effect.sync(() => console.log("Doubled:", value))
  )

  // Update source
  yield* RefSubject.set(count, 5)
  // Output: "Doubled: 10"

  yield* RefSubject.set(count, 10)
  // Output: "Doubled: 20"
})
```

## Chaining Computations

Computed values can be chained:

```ts
import { Effect } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function*() {
  const count = yield* RefSubject.make(5)

  // Chain multiple transformations
  const result = RefSubject.map(
    RefSubject.map(
      RefSubject.map(count, (n) => n * 2),
      (n) => n + 1
    ),
    (n) => n * 3
  )

  const value = yield* result
  console.log(value) // 33 ((5 * 2 + 1) * 3)

  // Or use pipe for better readability
  const piped = count.pipe(
    RefSubject.map((n) => n * 2),
    RefSubject.map((n) => n + 1),
    RefSubject.map((n) => n * 3)
  )

  const pipedValue = yield* piped
  console.log(pipedValue) // 33
})
```

## Conditional Computations

Use `filterMap` for conditional computations:

```ts
import { Effect, Option } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function*() {
  const age = yield* RefSubject.make(25)

  // Only compute if age >= 18
  const canVote = RefSubject.filterMap(age, (a) => a >= 18 ? Option.some("Can vote") : Option.none())

  const status = yield* canVote
  console.log(status) // "Can vote"

  // Update age
  yield* RefSubject.set(age, 16)

  // Filtered will fail (age < 18)
  // yield* canVote would fail with NoSuchElementError
})
```

## Working with Option Values

Use `compact` to unwrap `Option` values:

```ts
import { Effect, Option } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function*() {
  const maybeValue = yield* RefSubject.make(Option.some(42))

  // Compact unwraps the Option
  const value = RefSubject.compact(maybeValue)

  const unwrapped = yield* value
  console.log(unwrapped) // 42

  // If Option becomes None, Filtered will fail
  yield* RefSubject.set(maybeValue, Option.none())
  // yield* value would fail with NoSuchElementError
})
```

## Proxy Access

Use `proxy` to access nested properties:

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
  const proxied = RefSubject.proxy(user)

  // Access individual properties as Computed values
  const name = yield* proxied.name
  console.log(name) // "Alice"

  const age = yield* proxied.age
  console.log(age) // 30

  // Update the source
  yield* RefSubject.set(user, { name: "Bob", age: 25, address: { city: "Boston", zip: "02101" } })

  // Proxied values automatically update
  const newName = yield* proxied.name
  console.log(newName) // "Bob"
})
```

## Best Practices

1. **Use Computed for derived values**: When values are computed from other reactive sources
2. **Prefer pure transformations**: Use `map` for pure functions when possible
3. **Use `mapEffect` for async**: When transformations require Effects
4. **Chain with pipe**: For better readability with multiple transformations
5. **Use Filtered for optional values**: When values may not always exist
6. **Observe changes**: Use `Fx.observe` to react to computed value changes
7. **Combine sources**: Use `struct` or `tuple` to combine multiple reactive sources

## Common Patterns

### Form Validation

```ts
import { Effect, Option } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const FormValidation = Effect.gen(function*() {
  const email = yield* RefSubject.make("")
  const password = yield* RefSubject.make("")

  // Validate email
  const isValidEmail = RefSubject.map(
    email,
    (e) => e.includes("@") && e.includes(".")
  )

  // Validate password length
  const isValidPassword = RefSubject.map(
    password,
    (p) => p.length >= 8
  )

  // Combined validation
  const isFormValid = RefSubject.map(
    RefSubject.struct({ isValidEmail, isValidPassword }),
    ({ isValidEmail, isValidPassword }) => isValidEmail && isValidPassword
  )

  return { email, password, isFormValid }
})
```

### Search Results

```ts
import { Effect, Option } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const Search = Effect.gen(function*() {
  const query = yield* RefSubject.make("")
  const items = yield* RefSubject.make([
    "apple",
    "banana",
    "cherry",
    "date"
  ])

  // Filtered search results
  const results = RefSubject.filterMap(
    RefSubject.struct({ query, items }),
    ({ query, items }) => {
      if (query.length === 0) return Option.none()
      const filtered = items.filter((item) => item.includes(query.toLowerCase()))
      return Option.some(filtered)
    }
  )

  return { query, items, results }
})
```

### Price Calculations

```ts
import { Effect } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const Pricing = Effect.gen(function*() {
  const basePrice = yield* RefSubject.make(100)
  const quantity = yield* RefSubject.make(2)
  const taxRate = yield* RefSubject.make(0.1)
  const discount = yield* RefSubject.make(0.05)

  // Compute subtotal
  const subtotal = RefSubject.map(
    RefSubject.struct({ basePrice, quantity }),
    ({ basePrice, quantity }) => basePrice * quantity
  )

  // Compute discount amount
  const discountAmount = RefSubject.map(
    RefSubject.struct({ subtotal, discount }),
    ({ subtotal, discount }) => subtotal * discount
  )

  // Compute final total
  const total = RefSubject.map(
    RefSubject.struct({ subtotal, discountAmount, taxRate }),
    ({ subtotal, discountAmount, taxRate }) => (subtotal - discountAmount) * (1 + taxRate)
  )

  return {
    basePrice,
    quantity,
    taxRate,
    discount,
    subtotal,
    discountAmount,
    total
  }
})
```

## Performance Considerations

1. **Computed values are memoized**: They only recompute when dependencies change
2. **Use `skipRepeats`**: To avoid unnecessary updates when values don't change
3. **Prefer pure functions**: Pure transformations are more efficient
4. **Combine related computations**: Use `struct` to compute multiple values together

## Next Steps

- Learn about **RefSubject** for mutable reactive state
- Explore **Filtered** for optional computed values
- See how **Versioned** enables optimistic UI updates
- Check out **Subject** for sharing streams
