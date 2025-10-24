import { describe, it } from "@effect/vitest"
import { Cause, Effect } from "effect"
import * as Fx from "effect/typed/fx"

describe("Fx", () => {
  it.fx("Fx.succeed", {
    actual: Fx.succeed(1),
    expected: [1]
  })

  it.fxError("Fx.fail", {
    actual: Fx.fail("error"),
    expected: "error"
  })

  it.fxCause("Fx.die", {
    actual: Fx.die("error"),
    expected: Cause.die("error")
  })

  it.fx("Fx.fromEffect", {
    actual: Fx.fromEffect(Effect.succeed(1)),
    expected: [1]
  })

  it.fx("Fx.fromYieldable", {
    actual: Fx.fromYieldable(Effect.succeed(1)),
    expected: [1]
  })

  it.fx("Fx.fromIterable", {
    actual: Fx.fromIterable([1, 2, 3]),
    expected: [1, 2, 3]
  })

  it.fx("Fx.flatMap", {
    actual: Fx.fromIterable([1, 2, 3]).pipe(
      Fx.flatMap((n) => Fx.succeed(n + 1))
    ),
    expected: [2, 3, 4]
  })

  it.fx("Fx.switchMap", {
    actual: Fx.fromIterable([1, 2, 3]).pipe(
      Fx.switchMap((n) => Fx.succeed(n + 1))
    ),
    expected: [4]
  })

  it.fx("Fx.exhaustMap", {
    actual: Fx.fromIterable([1, 2, 3]).pipe(
      Fx.exhaustMap((n) => Fx.succeed(n + 1))
    ),
    expected: [2]
  })

  it.fx("Fx.exhaustMapLatest", {
    actual: Fx.fromIterable([1, 2, 3]).pipe(
      Fx.exhaustLatestMap((n) => Fx.succeed(n + 1))
    ),
    expected: [2, 4]
  })

  it.fx("Fx.mergeAll", {
    actual: Fx.mergeAll(
      Fx.succeed(1),
      Fx.succeed(2),
      Fx.succeed(3)
    ),
    expected: [1, 2, 3]
  })

  it.fx.live("Fx.at", {
    actual: Fx.at(1, 100),
    expected: [1]
  })

  it.fx.live("Fx.tuple", {
    actual: Fx.tuple(
      Fx.at(1, 0),
      Fx.at(2, 100),
      Fx.at(3, 50)
    ),
    expected: [[1, 2, 3]]
  })

  it.fx.live("Fx.mergeOrdered", {
    actual: Fx.mergeOrdered(
      Fx.succeed(1),
      Fx.at(2, 100), // Maintains order regardless of asynchrony
      Fx.succeed(3)
    ),
    expected: [1, 2, 3]
  })

  it.fx.live("Fx.keyed", {
    actual: Fx.keyed(Fx.succeed([1, 2, 3]), {
      getKey: (n) => n,
      onValue: Fx.map((n) => n + 1)
    }),
    expected: [[2, 3, 4]]
  })
})
