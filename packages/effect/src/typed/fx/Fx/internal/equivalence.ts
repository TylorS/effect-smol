import { equals } from "../../../../Equal.ts"
import * as Equivalence from "../../../../Equivalence.ts"
import type * as Exit from "../../../../Exit.ts"

export const getExitEquivalence = <E, A>(A: Equivalence.Equivalence<A>) =>
  Equivalence.make<Exit.Exit<A, E>>((a, b) => {
    if (a._tag === "Failure") {
      return b._tag === "Failure" && equals(a.cause, b.cause)
    } else {
      return b._tag === "Success" && A(a.value, b.value)
    }
  })
