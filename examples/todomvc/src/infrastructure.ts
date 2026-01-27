import { DateTime, Effect, Layer, ServiceMap } from "effect"
import * as Option from "effect/Option"
import { Fx } from "effect/typed/fx"
import * as Router from "effect/typed/router"
import * as KeyValueStore from "effect/unstable/persistence/KeyValueStore"
import * as App from "./application"
import * as Domain from "./domain"

const TODOS_STORAGE_KEY = `@typed/todomvc/todos`

class Todos extends ServiceMap.Service<Todos>()("TodosService", {
  make: Effect.gen(function* () {
    const kv = yield* KeyValueStore.KeyValueStore
    return KeyValueStore.toSchemaStore(kv, Domain.TodoList)
  })
}) {
  static readonly get = Todos.asEffect().pipe(
    Effect.flatMap((service) => service.get(TODOS_STORAGE_KEY)),
    Effect.map(Option.getOrElse(() => [])),
    Effect.catchCause(() => Effect.succeed([]))
  )

  static readonly set = (todos: Domain.TodoList) =>
    Effect.flatMap(Todos.asEffect(), (service) => service.set(TODOS_STORAGE_KEY, todos)).pipe(
      Effect.catchCause((cause) => Effect.logError("Failed to write todos to key value store", cause))
    )

  static readonly replicateToStorage = App.TodoList.pipe(
    Fx.tap(Todos.set),
    Fx.drainLayer
  )

  static readonly local = Layer.effect(
    Todos,
    Effect.gen(function* () {
      const kv = yield* KeyValueStore.KeyValueStore
      return KeyValueStore.toSchemaStore(kv, Domain.TodoList)
    })
  ).pipe(
    Layer.provide(KeyValueStore.layerStorage(() => localStorage))
  )
}

const FilterState = Router
  .match(Router.Slash, "all")
  .match(Router.Parse("active"), "active")
  .match(Router.Parse("completed"), "completed")
  .pipe(Router.redirectTo('/'))

const Model = Layer.mergeAll(
  App.TodoList.make(Todos.get),
  App.FilterState.make(FilterState),
  App.TodoText.make("")
)

const CreateTodo = Layer.sync(App.CreateTodo, () => (text: string) =>
  Effect.sync((): Domain.Todo => ({
    id: Domain.TodoId.makeUnsafe(crypto.randomUUID()),
    text,
    completed: false,
    timestamp: DateTime.makeUnsafe(new Date())
  })))

export const Services = Layer.mergeAll(CreateTodo, Todos.replicateToStorage).pipe(
  Layer.provideMerge(Model),
  Layer.provideMerge(Todos.local),
  Layer.provideMerge(Router.BrowserRouter())
)
