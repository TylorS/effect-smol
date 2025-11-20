import * as Equivalence from "../../../data/Equivalence.ts"
import type * as Exit from "../../../Exit.ts"
import { equals } from "../../../interfaces/Equal.ts"

export const getExitEquivalence = <E, A>(A: Equivalence.Equivalence<A>) =>
  Equivalence.make<Exit.Exit<A, E>>((a, b) => {
    if (a._tag === "Failure") {
      return b._tag === "Failure" && equals(a.cause, b.cause)
    } else {
      return b._tag === "Success" && A(a.value, b.value)
    }
  })
