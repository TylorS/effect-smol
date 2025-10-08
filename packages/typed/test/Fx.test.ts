import * as Fx from "@typed/fx/Fx"
import { describe, it } from "@typed/vitest"
import { Cause, Effect } from "effect"

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
})
