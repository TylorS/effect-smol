import { fromIterable, runFork } from "#dist/effect/typed/fx/index"

fromIterable([1, 2, 3]).pipe(
  runFork
)
