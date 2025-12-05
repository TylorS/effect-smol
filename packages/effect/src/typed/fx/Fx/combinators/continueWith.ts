import * as Effect from "../../../../Effect.ts"
import { dual } from "../../../../Function.ts"
import { make } from "../constructors/make.ts"
import { succeed } from "../constructors/succeed.ts"
import type { Fx } from "../Fx.ts"

/**
 * continues an Fx with another Fx after the first one completes.
 *
 * @param f - A function that returns the next Fx to run.
 * @returns An `Fx` that emits values from the first Fx, then from the second Fx.
 * @since 1.0.0
 * @category combinators
 */
export const continueWith: {
  <B, E2, R2>(
    f: () => Fx<B, E2, R2>
  ): <A, E, R>(fx: Fx<A, E, R>) => Fx<A | B, E | E2, R | R2>

  <A, E, R, B, E2, R2>(
    fx: Fx<A, E, R>,
    f: () => Fx<B, E2, R2>
  ): Fx<A | B, E | E2, R | R2>
} = dual(2, <A, E, R, B, E2, R2>(
  fx: Fx<A, E, R>,
  f: () => Fx<B, E2, R2>
): Fx<A | B, E | E2, R | R2> =>
  make<A | B, E | E2, R | R2>((sink) => Effect.flatMap(fx.run(sink), () => f().run(sink))))

/**
 * Appends a value to the end of an Fx.
 *
 * @param value - The value to append.
 * @returns An `Fx` that emits values from the input Fx, then the appended value.
 * @since 1.0.0
 * @category combinators
 */
export const append: {
  <B>(
    value: B
  ): <A, E, R>(fx: Fx<A, E, R>) => Fx<A | B, E, R>

  <A, E, R, B>(
    fx: Fx<A, E, R>,
    value: B
  ): Fx<A | B, E, R>
} = dual(2, <A, E, R, B>(
  fx: Fx<A, E, R>,
  value: B
): Fx<A | B, E, R> => continueWith(fx, () => succeed(value)))

/**
 * Prepends a value to the beginning of an Fx.
 *
 * @param value - The value to prepend.
 * @returns An `Fx` that emits the prepended value, then values from the input Fx.
 * @since 1.0.0
 * @category combinators
 */
export const prepend: {
  <B>(
    value: B
  ): <A, E, R>(fx: Fx<A, E, R>) => Fx<B | A, E, R>

  <A, E, R, B>(
    fx: Fx<A, E, R>,
    value: B
  ): Fx<B | A, E, R>
} = dual(2, <A, E, R, B>(
  fx: Fx<A, E, R>,
  value: B
): Fx<B | A, E, R> => continueWith(succeed(value), () => fx))

/**
 * Wraps an Fx with a start and end value.
 *
 * @param before - The value to emit before the Fx starts.
 * @param after - The value to emit after the Fx completes.
 * @returns An `Fx` that emits `before`, then values from the input Fx, then `after`.
 * @since 1.0.0
 * @category combinators
 */
export const delimit: {
  <B, C>(
    before: B,
    after: C
  ): <A, E, R>(fx: Fx<A, E, R>) => Fx<A | B | C, E, R>

  <A, E, R, B, C>(
    fx: Fx<A, E, R>,
    before: B,
    after: C
  ): Fx<A | B | C, E, R>
} = dual(3, <A, E, R, B, C>(
  fx: Fx<A, E, R>,
  before: B,
  after: C
): Fx<A | B | C, E, R> =>
  fx.pipe(
    prepend(before),
    append(after)
  ))
