import type { Brand } from "effect/Brand"
import * as Schema from "effect/Schema"

export type { Brand }

/* #region Model */

export const TodoId = Schema.String.pipe(Schema.brand("TodoId"))
export type TodoId = Schema.Schema.Type<typeof TodoId>

export const Todo = Schema.Struct({
  id: TodoId,
  text: Schema.String,
  completed: Schema.Boolean,
  timestamp: Schema.DateTimeUtcFromString
})
export type TodoJson = Schema.Codec.Encoded<typeof Todo>
export type Todo = Schema.Schema.Type<typeof Todo>

export const TodoList = Schema.Array(Todo)
export type TodoListJson = Schema.Codec.Encoded<typeof TodoList>
export type TodoList = Schema.Schema.Type<typeof TodoList>

export const FilterState = Schema.Union([Schema.Literal("all"), Schema.Literal("active"), Schema.Literal("completed")])
export type FilterState = Schema.Schema.Type<typeof FilterState>

/* #endregion */

/* #region Services */

export function updateTodo(list: TodoList, id: TodoId, f: (todo: Todo) => Todo): TodoList {
  return list.map((todo) => (todo.id === id ? f(todo) : todo))
}

export function editText(id: TodoId, text: string) {
  return (list: TodoList): TodoList => updateTodo(list, id, (todo) => ({ ...todo, text }))
}

export function toggleCompleted(id: TodoId) {
  return (list: TodoList): TodoList => updateTodo(list, id, (todo) => ({ ...todo, completed: !todo.completed }))
}

export function isCompleted(todo: Todo): boolean {
  return todo.completed
}

export function isActive(todo: Todo): boolean {
  return !todo.completed
}

export function toggleAllCompleted(list: TodoList): TodoList {
  if (list.some(isActive)) {
    return list.map((todo) => ({ ...todo, completed: true }))
  } else {
    return list.map((todo) => ({ ...todo, completed: false }))
  }
}

export function deleteTodo(id: TodoId) {
  return (list: TodoList): TodoList => list.filter((todo) => todo.id !== id)
}

export function clearCompleted(list: TodoList): TodoList {
  return list.filter(isActive)
}

export function activeCount(list: TodoList): number {
  return list.filter(isActive).length
}

export function completedCount(list: TodoList): number {
  return list.filter(isCompleted).length
}

export function allAreCompleted(list: TodoList): boolean {
  return list.length > 0 && list.every(isCompleted)
}

export function someAreCompleted(list: TodoList): boolean {
  return list.some(isCompleted)
}

export function filterTodoList({ list, state }: { list: TodoList; state: FilterState }): TodoList {
  switch (state) {
    case "all":
      return list
    case "active":
      return list.filter(isActive)
    case "completed":
      return list.filter(isCompleted)
  }
}

export function updateText(text: string) {
  return (todo: Todo): Todo => ({ ...todo, text })
}

/* #endregion */
