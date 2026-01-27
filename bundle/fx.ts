import { fromIterable } from "#dist/effect/typed/fx/Fx/constructors/fromIterable"
import { runFork } from "#dist/effect/typed/fx/Fx/run/fork"

fromIterable([1, 2, 3]).pipe(
  runFork
)
