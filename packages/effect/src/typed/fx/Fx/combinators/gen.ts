import * as Effect from "../../../../Effect.ts"
import type { Fx } from "../Fx.ts"
import { unwrap } from "./unwrap.ts"

/**
 * Creates an Fx using a generator function (Effect.gen style).
 *
 * This allows writing Fx code in a synchronous-looking style, using `yield*` to composition.
 * Note: The generator yields Effects, and the result is an Fx.
 *
 * @param f - The generator function.
 * @returns An `Fx` representing the result of the generator.
 * @since 1.0.0
 * @category combinators
 */
export const gen = <Yield extends Effect.Yieldable<any, any, any, any>, Return extends Fx.Any>(
  f: () => Generator<Yield, Return, any>
): Fx<
  Fx.Success<Return>,
  Fx.Error<Return> | Effect.Yieldable.Error<Yield>,
  Fx.Services<Return> | Effect.Yieldable.Services<Yield>
> => unwrap(Effect.gen(f)) as any
