import { fromIterable, runFork } from "effect/typed/fx/Fx"

fromIterable([1, 2, 3]).pipe(
  runFork
)
