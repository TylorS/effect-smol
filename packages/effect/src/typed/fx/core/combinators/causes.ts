import type * as Cause from "effect/Cause"
import * as Option from "effect/data/Option"
import * as Exit from "effect/Exit"
import type { Fx } from "../Fx.ts"
import { exit } from "./exit.ts"
import { filterMap } from "./filterMap.ts"

export const causes = <A, E, R>(fx: Fx<A, E, R>): Fx<Cause.Cause<E>, never, R> =>
  filterMap(
    exit(fx),
    Exit.match({
      onFailure: Option.some,
      onSuccess: Option.none
    })
  )
