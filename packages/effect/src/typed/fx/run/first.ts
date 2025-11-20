import { head } from "../../../collections/Array.ts"
import type { Option } from "../../../data/Option.ts"
import type { Effect } from "../../../Effect.ts"
import { map } from "../../../Effect.ts"
import { pipe } from "../../../Function.ts"
import type { Fx } from "../Fx.ts"
import { collectUpTo } from "./collect.ts"

export function first<A, E, R>(fx: Fx<A, E, R>): Effect<Option<A>, E, R> {
  return pipe(fx, collectUpTo(1), map(head))
}
