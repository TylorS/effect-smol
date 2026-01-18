import * as Cause from "../../../../Cause.ts"
import { dual } from "../../../../Function.ts"
import type * as Arr from "../../../../Array.ts"
import type { ExcludeTag, ExtractTag, NoInfer, Tags } from "../../../../Types.ts"
import { make as makeSink } from "../../Sink/Sink.ts"
import { make } from "../constructors/make.ts"
import type { Fx } from "../Fx.ts"
import { isFail } from "../../../../Filter.ts"

const hasTag = (u: unknown): u is { readonly _tag: string } =>
  typeof u === "object" && u !== null && "_tag" in u && typeof (u as Record<string, unknown>)["_tag"] === "string"

const matchesTag = <E, K extends string>(
  tag: K | Arr.NonEmptyReadonlyArray<K>,
  error: E
): error is ExtractTag<E, K> => {
  if (!hasTag(error)) return false
  if (typeof tag === "string") return error._tag === tag
  return tag.some((t) => t === error._tag)
}

/**
 * Recovers from a typed failure of an Fx by switching to a fallback Fx.
 *
 * Mirrors `Effect.catch` / `Effect.catchAll` (catches `Cause.Fail` only).
 *
 * @since 1.0.0
 * @category combinators
 */
export const catch_: {
  <E, A2, E2, R2>(
    f: (e: E) => Fx<A2, E2, R2>
  ): <A, R>(self: Fx<A, E, R>) => Fx<A | A2, E2, R | R2>

  <A, E, R, A2, E2, R2>(
    self: Fx<A, E, R>,
    f: (e: E) => Fx<A2, E2, R2>
  ): Fx<A | A2, E2, R | R2>
} = dual(2, <A, E, R, A2, E2, R2>(
  self: Fx<A, E, R>,
  f: (e: E) => Fx<A2, E2, R2>
): Fx<A | A2, E2, R | R2> =>
  make<A | A2, E2, R | R2>((sink) =>
    self.run(makeSink(
      (cause) => {
        const filtered = Cause.filterFail(cause)
        if (isFail(filtered)) {
          return sink.onFailure(filtered.fail)
        }
        return f(filtered.error).run(sink)
      },
      sink.onSuccess
    ))
  ))

export { catch_ as catch }

/**
 * An alias for {@link catch}.
 *
 * @since 1.0.0
 * @category combinators
 */
export const catchAll = catch_

/**
 * Recovers from *any* failure cause of an Fx (including defects and interrupts)
 * by switching to a fallback Fx.
 *
 * Mirrors `Effect.catchCause`.
 *
 * @since 1.0.0
 * @category combinators
 */
export const catchCause: {
  <E, A2, E2, R2>(
    f: (cause: Cause.Cause<E>) => Fx<A2, E2, R2>
  ): <A, R>(self: Fx<A, E, R>) => Fx<A | A2, E2, R | R2>

  <A, E, R, A2, E2, R2>(
    self: Fx<A, E, R>,
    f: (cause: Cause.Cause<E>) => Fx<A2, E2, R2>
  ): Fx<A | A2, E2, R | R2>
} = dual(2, <A, E, R, A2, E2, R2>(
  self: Fx<A, E, R>,
  f: (cause: Cause.Cause<E>) => Fx<A2, E2, R2>
): Fx<A | A2, E2, R | R2> =>
  make<A | A2, E2, R | R2>((sink) =>
    self.run(makeSink(
      (cause) => f(cause).run(sink),
      sink.onSuccess
    ))
  ))

/**
 * Recovers from a typed failure by matching on the `_tag` field of the error.
 *
 * Mirrors `Effect.catchTag`.
 *
 * @since 1.0.0
 * @category combinators
 */
export const catchTag: {
  <const K extends Tags<E> | Arr.NonEmptyReadonlyArray<Tags<E>>, E, A2, E2, R2>(
    k: K,
    f: (e: ExtractTag<NoInfer<E>, K extends Arr.NonEmptyReadonlyArray<string> ? K[number] : K>) => Fx<A2, E2, R2>
  ): <A, R>(
    self: Fx<A, E, R>
  ) => Fx<A | A2, E2 | ExcludeTag<E, K extends Arr.NonEmptyReadonlyArray<string> ? K[number] : K>, R | R2>

  <A, E, R, const K extends Tags<E> | Arr.NonEmptyReadonlyArray<Tags<E>>, A2, E2, R2>(
    self: Fx<A, E, R>,
    k: K,
    f: (e: ExtractTag<E, K extends Arr.NonEmptyReadonlyArray<string> ? K[number] : K>) => Fx<A2, E2, R2>
  ): Fx<A | A2, E2 | ExcludeTag<E, K extends Arr.NonEmptyReadonlyArray<string> ? K[number] : K>, R | R2>
} = dual(3, <A, E, R, const K extends Tags<E> | Arr.NonEmptyReadonlyArray<Tags<E>>, A2, E2, R2>(
  self: Fx<A, E, R>,
  k: K,
  f: (e: ExtractTag<E, K extends Arr.NonEmptyReadonlyArray<string> ? K[number] : K>) => Fx<A2, E2, R2>
): Fx<A | A2, E2 | ExcludeTag<E, K extends Arr.NonEmptyReadonlyArray<string> ? K[number] : K>, R | R2> =>
  make<A | A2, E2 | ExcludeTag<E, K extends Arr.NonEmptyReadonlyArray<string> ? K[number] : K>, R | R2>((sink) =>
    self.run(makeSink(
      (cause) => {
        const filtered = Cause.filterFail(cause)
        if (isFail(filtered)) {
          return sink.onFailure(filtered.fail)
        } else if (matchesTag(k, filtered.error)) {
          return f(filtered.error as ExtractTag<E, K extends Arr.NonEmptyReadonlyArray<string> ? K[number] : K>).run(sink)
        } else {
          return sink.onFailure(cause as Cause.Cause<E2 | ExcludeTag<E, K extends Arr.NonEmptyReadonlyArray<string> ? K[number] : K>>)
        }
      },
      sink.onSuccess
    ))
  ))

