import type { Exit } from "effect"
import * as Equivalence from "effect/data/Equivalence"
import { equals } from "effect/interfaces/Equal"

export const getExitEquivalence = <E, A>(A: Equivalence.Equivalence<A>) =>
  Equivalence.make<Exit.Exit<A, E>>((a, b) => {
    if (a._tag === "Failure") {
      return b._tag === "Failure" && equals(a.cause, b.cause)
    } else {
      return b._tag === "Success" && A(a.value, b.value)
    }
  })
