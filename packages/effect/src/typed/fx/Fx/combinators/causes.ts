import type * as Cause from "../../../../Cause.ts"
import * as Exit from "../../../../Exit.ts"
import * as Option from "../../../../Option.ts"
import type { Fx } from "../Fx.ts"
import { exit } from "./exit.ts"
import { filterMap } from "./filterMap.ts"

/**
 * Emits only the failure causes from an Fx, discarding successful values.
 *
 * @param fx - The `Fx` stream.
 * @returns An `Fx` emitting `Cause<E>`.
 * @since 1.0.0
 * @category combinators
 */
export const causes = <A, E, R>(fx: Fx<A, E, R>): Fx<Cause.Cause<E>, never, R> =>
  filterMap(
    exit(fx),
    Exit.match({
      onFailure: Option.some,
      onSuccess: Option.none
    })
  )
