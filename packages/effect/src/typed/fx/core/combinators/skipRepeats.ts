import { equals } from "effect/interfaces/Equal"
import type { Fx } from "../Fx.ts"
import { skipRepeatsWith } from "./skipRepeatsWith.ts"

const skipRepeats_ = skipRepeatsWith<any>(equals)

export const skipRepeats: <A, E, R>(fx: Fx<A, E, R>) => Fx<A, E, R> = skipRepeats_
