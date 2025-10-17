import * as Effect from "../../../Effect.ts"
import { dual } from "../../../Function.ts"
import { make } from "../constructors/make.ts"
import { succeed } from "../constructors/succeed.ts"
import type { Fx } from "../Fx.ts"

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
): Fx<A | B, E, R> => continueWith(succeed(value), () => fx))

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
