import * as Effect from "effect/Effect"
import * as Push from "effect/Push"
import { bench } from "./bench.js"
import * as Rx from 'rxjs'
import * as Most from '@most/core'
import { newDefaultScheduler } from '@most/scheduler'
import { pipe, Scope } from "effect"

const isEven = (n: number) => n % 2 === 0
const double = (n: number) => n * 2

const ITERATION_COUNT = 1000
const NUMBERS = Array.from({ length: 1000 }, (_, i) => i + 1)
const runBench = (name: string) => (effect: Effect.Effect<unknown, never, Scope.Scope>) => effect.pipe(
  bench(name, ITERATION_COUNT),
  Effect.runPromise
)

await Push.fromArray(NUMBERS).pipe(
  Push.filter(isEven),
  Push.map(double),
  Push.collect,
  runBench("Effect/Push"),
)

await Effect.callback((resume) => {
  const values: number[] = []

  const observable = pipe(
    Rx.from(NUMBERS),
    Rx.filter(isEven),
    Rx.map(double),
  )
  const subscription = observable.subscribe({
    next: (value) => values.push(value),
    error: (error) => resume(Effect.die(error)),
    complete: () => resume(Effect.succeed(values)),
  })

  return Effect.sync(() => subscription.unsubscribe())
}).pipe(
  Effect.tapError(Effect.logError),
  runBench("Rx"),
)

const scheduler = newDefaultScheduler()

// Most doesn't actually have a "fromArray/fromIterable" so lets implement our own for testing purposes
const mostIterable = Most.newStream<number>((sink, scheduler) => scheduler.scheduleTask(-1, -1, -1, {
  run(time) {
    for (let i = 0; i < NUMBERS.length; i++) {
      sink.event(time, NUMBERS[i])
    }
    sink.end(time)
  },
  error(time, error) {
    sink.error(time, error)
  },
  dispose() {
    sink.end(scheduler.currentTime())
  }
}))

await Effect.promise(() => {
  const values: number[] = []

  const program = pipe(
    mostIterable,
    Most.filter(isEven),
    Most.map(double),
    Most.tap((value) => values.push(value)),
    Most.runEffects
  )

  return program(scheduler).then(() => values)
}).pipe(
  runBench("Most"),
)
