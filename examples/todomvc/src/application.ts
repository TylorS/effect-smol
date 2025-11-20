import * as Option from "effect/data/Option"
import * as Effect from "effect/Effect"
import * as ServiceMap from "effect/ServiceMap"
import * as RefArray from "effect/typed/fx/ref-subject/RefArray"
import * as RefSubject from "effect/typed/fx/ref-subject/RefSubject"
import * as Domain from "./domain"

/* #region Services */

export class CreateTodo
  extends ServiceMap.Service<CreateTodo, (text: string) => Effect.Effect<Domain.Todo>>()("CreateTodo")
{
  static override readonly call = (text: string) =>
    Effect.flatMap(CreateTodo.asEffect(), (createTodo) => createTodo(text))
}

/* #endregion */

/* #region Model */

export class TodoList extends RefSubject.Service<TodoList, Domain.TodoList>()("TodoList") {}

export class FilterState extends RefSubject.Service<FilterState, Domain.FilterState>()("FilterState") {}

export class TodoText extends RefSubject.Service<TodoText, string>()("TodoText") {}

export const Todos: RefSubject.Computed<Domain.TodoList, never, TodoList | FilterState> = RefSubject.map(
  RefSubject.struct({
    list: TodoList,
    state: FilterState
  }),
  Domain.filterTodoList
)

export const ActiveCount: RefSubject.Computed<number, never, TodoList> = RefSubject.map(TodoList, Domain.activeCount)

export const SomeAreCompleted: RefSubject.Computed<boolean, never, TodoList> = RefSubject.map(
  TodoList,
  Domain.someAreCompleted
)

export const AllAreCompleted: RefSubject.Computed<boolean, never, TodoList> = RefSubject.map(
  TodoList,
  Domain.allAreCompleted
)

/* #endregion */

/* #region Intent */

export const createTodo: Effect.Effect<Option.Option<Domain.Todo>, never, CreateTodo | TodoList | TodoText> = Effect
  .flatMap(TodoText.asEffect(), (text: string) =>
    text.trim() === ""
      ? Effect.succeed(Option.none<Domain.Todo>())
      : CreateTodo.call(text).pipe(
        Effect.tap((todo) => RefArray.prepend(TodoList, todo)),
        Effect.tap(() => RefSubject.set(TodoText, "")),
        Effect.asSome
      ))

export const editTodo = (id: Domain.TodoId, text: string): Effect.Effect<Domain.TodoList, never, TodoList> =>
  text.trim() === ""
    ? deleteTodo(id)
    : RefSubject.update(TodoList, Domain.editText(id, text))

export const toggleTodoCompleted: (id: Domain.TodoId) => Effect.Effect<Domain.TodoList, never, TodoList> = (id) =>
  RefSubject.update(TodoList, Domain.toggleCompleted(id))

export const deleteTodo: (id: Domain.TodoId) => Effect.Effect<Domain.TodoList, never, TodoList> = (id) =>
  RefSubject.update(TodoList, Domain.deleteTodo(id))

export const clearCompletedTodos: Effect.Effect<Domain.TodoList, never, TodoList> = RefSubject.update(
  TodoList,
  Domain.clearCompleted
)

export const toggleAllCompleted: Effect.Effect<Domain.TodoList, never, TodoList> = RefSubject.update(
  TodoList,
  Domain.toggleAllCompleted
)

/* #endregion */
