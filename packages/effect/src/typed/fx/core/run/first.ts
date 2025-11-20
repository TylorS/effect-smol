import { head } from "effect/collections/Array"
import type { Option } from "effect/data/Option"
import type { Effect } from "effect/Effect"
import { map } from "effect/Effect"
import { pipe } from "effect/Function"
import type { Fx } from "../Fx.ts"
import { collectUpTo } from "./collect.ts"

export function first<A, E, R>(fx: Fx<A, E, R>): Effect<Option<A>, E, R> {
  return pipe(fx, collectUpTo(1), map(head))
}
