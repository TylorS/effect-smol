// eslint-disable-next-line import/no-unassigned-import
import "./styles.css"

import { Effect } from "effect"
import { not } from "effect/Boolean"
import { capitalize } from "effect/String"
import { Fx, RefSubject } from "effect/typed/fx"
import { EventHandler, html, many } from "effect/typed/template"
import * as App from "./application"
import * as Domain from "./domain"

const onSubmit = EventHandler.make(() => App.createTodo, { preventDefault: true })

const onInput = EventHandler.make((ev: InputEvent & { target: HTMLInputElement }) =>
  RefSubject.set(App.TodoText, ev.target.value)
)

const plural = <E, R>(count: RefSubject.Computed<number, E, R>, options: {
  one: string
  many: string
}) => RefSubject.map(count, (c) => (c === 1 ? options.one : options.many))

const clearCompleted = Fx.if(
  App.SomeAreCompleted,
  {
    onTrue: html`<button class="clear-completed" onclick="${App.clearCompletedTodos}">Clear completed</button>`,
    onFalse: Fx.null
  }
)

export const TodoApp = html`<section class="todoapp ${App.FilterState}">
  <header class="header">
    <h1>todos</h1>
    <form class="add-todo" onsubmit=${onSubmit}>
      <input
        class="new-todo"
        placeholder="What needs to be done?"
        .value="${App.TodoText}"
        oninput=${onInput}
      />
    </form>
  </header>
  <section class="main">
    <input class="toggle-all" type="checkbox" ?checked="${App.AllAreCompleted}" ?indeterminate="${App.SomeAreCompleted}" />
    <label for="toggle-all" onclick="${App.toggleAllCompleted}">Mark all as complete</label>
    <ul class="todo-list">
      ${many(App.Todos, (todo) => todo.id, TodoItem)}
    </ul>

    <footer class="footer">
      <span class="todo-count">
        ${App.ActiveCount} ${plural(App.ActiveCount, { one: "item", many: "items" })} left
      </span>

      <ul class="filters">
        ${Domain.FilterState.members.map((filter) => FilterLink(filter.literal))}
      </ul>

      ${clearCompleted}
    </footer>
  </section>
</section>`

function TodoItem(todo: RefSubject.RefSubject<Domain.Todo>, id: Domain.TodoId) {
  return Fx.gen(function*() {
    // Track whether this todo is being edited
    const isEditing = yield* RefSubject.make(false)

    // Track whether the todo is marked as completed
    const isCompleted = RefSubject.map(todo, Domain.isCompleted)

    // the current text
    const text = RefSubject.map(todo, (t) => t.text)

    // Update the todo's text
    const updateText = (text: string) => RefSubject.update(todo, Domain.updateText(text))

    // Reset the todo's text to the text value before editing it
    const reset = RefSubject.delete(todo).pipe(Effect.tap(() => RefSubject.set(isEditing, false)))

    // Submit the todo when the user is done editing
    const submit = text.asEffect().pipe(
      Effect.flatMap((t) => App.editTodo(id, t)),
      Effect.flatMap(() => reset)
    )

    const completedClasses = Fx.when(isCompleted, { onTrue: "completed", onFalse: "" })
    const editingClasses = Fx.when(isEditing, { onTrue: "editing", onFalse: "" })
    const toggleEditing = RefSubject.update(isEditing, not)
    const onInput = EventHandler.make((ev: InputEvent) => updateText((ev.target as HTMLInputElement).value))
    const onKeydown = EventHandler.make((ev: KeyboardEvent) => {
      if (ev.key === "Enter") return submit
      if (ev.key === "Escape") return reset
    })

    return html`<li class="${completedClasses} ${editingClasses}">
      <div class="view">
        <input
          type="checkbox"
          class="toggle"
          ?checked="${isCompleted}"
          onclick="${App.toggleTodoCompleted(id)}"
        />
        <label ondblclick="${toggleEditing}">${text}</label>
        <button class="destroy" onclick="${App.deleteTodo(id)}"></button>
      </div>

      <input
        class="edit"
        .value="${text}"
        oninput=${onInput}
        onfocusout="${submit}"
        onkeydown=${onKeydown}
      />
    </li>`
  })
}

function FilterLink(filter: Domain.FilterState) {
  const isSelected = Fx.map(App.FilterState, (state) => state === filter)
  const classes = Fx.when(isSelected, { onTrue: "selected", onFalse: "" })
  return html`<li><a href="/#${filter}" class="${classes}">${capitalize(filter)}</a></li>`
}
