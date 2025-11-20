import type * as Cause from "../../../Cause.ts"
import * as Option from "../../../data/Option.ts"
import * as Exit from "../../../Exit.ts"
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
