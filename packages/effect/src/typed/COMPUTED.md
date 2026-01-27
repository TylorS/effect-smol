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
- **Version tracked** for efficient change detection

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

## Type Hierarchy

Computed is part of a type hierarchy:

```
Versioned (base: version tracking + Fx + Effect)
    ↓
Computed (read-only derived values)
    ↓
Filtered (computed that may not have a value)
```

- **Versioned**: Foundation providing version tracking, Fx subscription, and Effect sampling
- **Computed**: Read-only derived value that emits updates when source changes
- **Filtered**: Computed that may not always have a value (wraps Option)
- **RefSubject**: Extends Computed with mutation capabilities

### Type Preservation

When combining different types, the result type follows these rules:

- `RefSubject + RefSubject` = `RefSubject` (can still mutate combined value)
- `RefSubject + Computed` = `Computed` (read-only view)
- `Computed + Filtered` = `Filtered` (may not have value)
- Any + `Filtered` = `Filtered`

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

### From Service Pattern

Use Computed with RefSubject.Service:

```ts
import { Effect, Layer } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

class TodoList extends RefSubject.Service<TodoList, Todo[]>()("TodoList") {}
const TodoListLive = TodoList.make([])

// Derived computations from services
const ActiveTodos = RefSubject.map(TodoList, (todos) => todos.filter((t) => !t.completed))
const CompletedCount = RefSubject.map(TodoList, (todos) => todos.filter((t) => t.completed).length)
const AllCompleted = RefSubject.map(TodoList, (todos) => todos.length > 0 && todos.every((t) => t.completed))
```

## Version Tracking

Computed values track versions for efficient change detection:

```ts
import { Effect } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function*() {
  const count = yield* RefSubject.make(0)
  const doubled = RefSubject.map(count, (n) => n * 2)

  // Get the current version
  const version1 = yield* doubled.version
  console.log(version1) // 1

  yield* RefSubject.set(count, 5)

  // Version increments on change
  const version2 = yield* doubled.version
  console.log(version2) // 2
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

  // Or convert back to Computed<Option<A>>
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
  yield* Fx.observe(doubled, (value) => Effect.log(`Doubled: ${value}`))

  yield* RefSubject.set(count, 5) // Output: "Doubled: 10"
  yield* RefSubject.set(count, 10) // Output: "Doubled: 20"
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

  // Each property is a Computed that only updates
  // when that specific value changes
  const currentName = yield* name
  console.log(currentName) // "Alice"

  // Great for fine-grained reactivity
  // Only the `name` computed updates, not `age` or `address`
  yield* RefSubject.update(user, (u) => ({ ...u, name: "Bob" }))
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
  const result = count.pipe(
    RefSubject.map((n) => n * 2),
    RefSubject.map((n) => n + 1),
    RefSubject.map((n) => n * 3)
  )

  const value = yield* result
  console.log(value) // 33 ((5 * 2 + 1) * 3)
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

  // Safe access via asComputed()
  const maybeStatus = yield* canVote.asComputed()
  console.log(Option.isNone(maybeStatus)) // true
})
```

## Working with Option Values

Use `compact` to unwrap `Option` values:

```ts
import { Effect, Option } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

const program = Effect.gen(function*() {
  const maybeValue = yield* RefSubject.make(Option.some(42))

  // Compact unwraps the Option into a Filtered
  const value = RefSubject.compact(maybeValue)

  const unwrapped = yield* value
  console.log(unwrapped) // 42

  // If Option becomes None, Filtered will fail
  yield* RefSubject.set(maybeValue, Option.none())
  // yield* value would fail with NoSuchElementError
})
```

## Best Practices

1. **Use Computed for derived values**: Never store computed data in RefSubjects
2. **Prefer pure transformations**: Use `map` for pure functions when possible
3. **Use `mapEffect` for async**: When transformations require Effects
4. **Chain with pipe**: For better readability with multiple transformations
5. **Use Filtered for optional values**: When values may not always exist
6. **Use `proxy` for nested access**: Get fine-grained reactivity without manual mapping
7. **Combine sources with `struct`/`tuple`**: When deriving from multiple refs

## Common Patterns

### Form Validation

```ts
import { Effect } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

class Email extends RefSubject.Service<Email, string>()("Email") {}
class Password extends RefSubject.Service<Password, string>()("Password") {}

const EmailLive = Email.make("")
const PasswordLive = Password.make("")

// Derived validations
const IsValidEmail = RefSubject.map(Email, (e) => e.includes("@") && e.includes("."))
const IsValidPassword = RefSubject.map(Password, (p) => p.length >= 8)

// Combined validation
const IsFormValid = RefSubject.map(
  RefSubject.struct({ email: IsValidEmail, password: IsValidPassword }),
  ({ email, password }) => email && password
)
```

### Search Results

```ts
import { Effect, Option } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

class Query extends RefSubject.Service<Query, string>()("Query") {}
class Items extends RefSubject.Service<Items, string[]>()("Items") {}

// Filtered search results - only emit when query is non-empty
const Results = RefSubject.filterMap(
  RefSubject.struct({ query: Query, items: Items }),
  ({ query, items }) => {
    if (query.length === 0) return Option.none()
    const filtered = items.filter((item) => item.toLowerCase().includes(query.toLowerCase()))
    return Option.some(filtered)
  }
)
```

### Shopping Cart

```ts
import { Effect } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
}

class CartItems extends RefSubject.Service<CartItems, CartItem[]>()("CartItems") {}
class TaxRate extends RefSubject.Service<TaxRate, number>()("TaxRate") {}

// Derived computations
const Subtotal = RefSubject.map(CartItems, (items) => items.reduce((sum, item) => sum + item.price * item.quantity, 0))

const TaxAmount = RefSubject.map(
  RefSubject.struct({ subtotal: Subtotal, rate: TaxRate }),
  ({ subtotal, rate }) => subtotal * rate
)

const Total = RefSubject.map(
  RefSubject.struct({ subtotal: Subtotal, tax: TaxAmount }),
  ({ subtotal, tax }) => subtotal + tax
)

const ItemCount = RefSubject.map(CartItems, (items) => items.reduce((sum, item) => sum + item.quantity, 0))

const IsEmpty = RefSubject.map(CartItems, (items) => items.length === 0)
```

### Todo List Filters

```ts
import { Effect, Option } from "effect"
import * as RefSubject from "effect/typed/fx/RefSubject"

interface Todo {
  id: string
  text: string
  completed: boolean
}

type FilterState = "all" | "active" | "completed"

class TodoList extends RefSubject.Service<TodoList, Todo[]>()("TodoList") {}
class FilterState extends RefSubject.Service<FilterState, FilterState>()("FilterState") {}

// Filtered todos based on current filter
const FilteredTodos = RefSubject.map(
  RefSubject.struct({ todos: TodoList, filter: FilterState }),
  ({ todos, filter }) => {
    switch (filter) {
      case "active":
        return todos.filter((t) => !t.completed)
      case "completed":
        return todos.filter((t) => t.completed)
      default:
        return todos
    }
  }
)

// Counts
const ActiveCount = RefSubject.map(TodoList, (todos) => todos.filter((t) => !t.completed).length)
const CompletedCount = RefSubject.map(TodoList, (todos) => todos.filter((t) => t.completed).length)
const AllCompleted = RefSubject.map(TodoList, (todos) => todos.length > 0 && todos.every((t) => t.completed))
const SomeCompleted = RefSubject.map(TodoList, (todos) => todos.some((t) => t.completed))
```

## Performance Considerations

1. **Computed values are memoized**: They only recompute when dependencies change
2. **Version tracking prevents unnecessary updates**: Changes are detected efficiently
3. **Use `proxy` for nested objects**: Avoids recomputing unchanged properties
4. **Prefer pure functions**: Pure transformations are more efficient
5. **Combine related computations**: Use `struct` to compute multiple values together
6. **Consider granularity**: Fine-grained computed values enable precise updates

## Next Steps

- Learn about **RefSubject** for mutable reactive state
- Explore **Filtered** for optional computed values
- See how **Versioned** enables optimistic UI updates
- Check out **Subject** for sharing streams
