import { forEach } from "../../../../Effect.ts"
import type { Fx } from "../Fx.ts"
import { make } from "./make.ts"

/**
 * Creates an Fx from an Iterable.
 * Emits each value from the iterable in order and then completes.
 *
 * @param iterable - The iterable to emit values from.
 * @returns An `Fx` that emits the values from the iterable.
 * @since 1.0.0
 * @category constructors
 */
export const fromIterable = <A>(iterable: Iterable<A>): Fx<A> =>
  make<A>((sink) => forEach(iterable, sink.onSuccess, { discard: true }))
