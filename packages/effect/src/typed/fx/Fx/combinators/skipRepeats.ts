import { equals } from "effect/interfaces/Equal"
import type { Fx } from "../Fx.ts"
import { skipRepeatsWith } from "./skipRepeatsWith.ts"

const skipRepeats_ = skipRepeatsWith<any>(equals)

/**
 * Drops elements that are equal to the previous element using standard equality.
 *
 * @param fx - The `Fx` stream.
 * @returns An `Fx` with consecutive duplicates removed.
 * @since 1.0.0
 * @category combinators
 */
export const skipRepeats: <A, E, R>(fx: Fx<A, E, R>) => Fx<A, E, R> = skipRepeats_
