import * as Option from "effect/data/Option"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import { flow } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Fx from "effect/typed/fx"
import * as KeyValueStore from "effect/unstable/persistence/KeyValueStore"
import * as App from "./application"
import * as Domain from "./domain"

const TODOS_STORAGE_KEY = `@typed/todomvc/todos`

export const layerKeyValueStore = KeyValueStore.layerStorage(() => localStorage)
export const getTodos = Effect.gen(function*() {
  const kv = KeyValueStore.toSchemaStore(yield* KeyValueStore.KeyValueStore, Domain.TodoList)
  const todos = yield* kv.get(TODOS_STORAGE_KEY)
  return Option.getOrElse(todos, (): Domain.TodoList => [])
}).pipe(Effect.catchCause(() => Effect.succeed([])))

export const writeTodosToKeyValueStore = (todos: Domain.TodoList) =>
  Effect.gen(function*() {
    const kv = KeyValueStore.toSchemaStore(yield* KeyValueStore.KeyValueStore, Domain.TodoList)
    yield* kv.set(TODOS_STORAGE_KEY, todos)
  })

const writeTodos = Fx.tapEffect(
  App.TodoList,
  flow(writeTodosToKeyValueStore, Effect.catchCause(() => Effect.logError("Failed to write todos to key value store")))
)

const hashChanges = Fx.callback<string>((emit) => {
  const onHashChange = () => emit.succeed(location.hash)
  onHashChange()
  window.addEventListener("hashchange", onHashChange)
  return Effect.sync(() => window.removeEventListener("hashchange", onHashChange))
})

const filterStateLiterals = new Set(Domain.FilterState.members.map((m) => m.literal))

const currentFilterState = hashChanges.pipe(
  Fx.map((hash) => {
    const filter = hash.slice(1) as Domain.FilterState
    return filterStateLiterals.has(filter) ? filter : "all"
  })
)

export const Live = Layer.unwrap(
  Effect.gen(function*() {
    const services = yield* Effect.services<KeyValueStore.KeyValueStore>()

    const Model = Layer.mergeAll(
      // Ininialize our TodoList from storage
      App.TodoList.make(getTodos.pipe(Effect.provideServices(services))),
      // Update our FilterState everytime the current path changes
      App.FilterState.make(currentFilterState),
      // Initialize our TodoText
      App.TodoText.make(Effect.succeed(""))
    )

    const CreateTodo = Layer.sync(App.CreateTodo, () => (text: string) =>
      Effect.sync((): Domain.Todo => ({
        id: Domain.TodoId.makeUnsafe(crypto.randomUUID()),
        text,
        completed: false,
        timestamp: DateTime.makeUnsafe(new Date())
      })))

    return Layer.mergeAll(CreateTodo, Fx.drainLayer(writeTodos)).pipe(Layer.provideMerge(Model))
  })
).pipe(
  Layer.provide(KeyValueStore.layerStorage(() => localStorage))
)
