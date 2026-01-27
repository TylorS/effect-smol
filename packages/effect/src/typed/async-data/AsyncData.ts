import * as Cause from "../../Cause.ts"
import * as Exit from "../../Exit.ts"
import { dual } from "../../Function.ts"
import * as Option from "../../Option.ts"
import { hasProperty, isObject, isString } from "../../Predicate.ts"
import * as Result from "../../Result.ts"
import * as Schema from "../../Schema.ts"
import type { Unify } from "../../Unify.ts"

export interface Progress {
  readonly loaded: number
  readonly total?: number | undefined
}

export interface NoData {
  readonly _tag: "NoData"
}

export interface Loading {
  readonly _tag: "Loading"
  readonly progress?: Progress | undefined
}

export interface Success<A> {
  readonly _tag: "Success"
  readonly value: A
  readonly progress?: Progress | undefined
}

export interface Failure<E> {
  readonly _tag: "Failure"
  readonly cause: Cause.Cause<E>
  readonly progress?: Progress | undefined
}

export interface Optimistic<A, E> {
  readonly _tag: "Optimistic"
  readonly value: A
  readonly previous: AsyncData<A, E>
}

export type AsyncData<A, E> = NoData | Loading | Success<A> | Failure<E> | Optimistic<A, E>

export type Refreshing<A, E> = (Success<A> | Failure<E>) & { readonly progress: Progress }

export const AsyncData = <const A extends Schema.Top, E extends Schema.Top>(
  A: A,
  E: E
): Schema.Codec<
  AsyncData<A["Type"], E["Type"]>,
  AsyncData<A["Encoded"], E["Encoded"]>,
  A["DecodingServices"] | E["DecodingServices"],
  A["EncodingServices"] | E["EncodingServices"]
> => {
  const Progress = Schema.Struct({ loaded: Schema.Number, total: Schema.optional(Schema.Number) })
  const NoData = Schema.Struct({ _tag: Schema.tag("NoData") })
  const Loading = Schema.Struct({ _tag: Schema.tag("Loading"), progress: Schema.optional(Progress) })
  const Success = Schema.Struct({ _tag: Schema.tag("Success"), value: A, progress: Schema.optional(Progress) })
  const Failure = Schema.Struct({ _tag: Schema.tag("Failure"), cause: E, progress: Schema.optional(Progress) })
  const Optimistic = Schema.Struct({
    _tag: Schema.tag("Optimistic"),
    value: A,
    previous: Schema.suspend(() => AsyncData)
  })
  const AsyncData = Schema.Union([NoData, Loading, Success, Failure, Optimistic]) as Schema.Codec<
    AsyncData<A["Type"], E["Type"]>,
    AsyncData<A["Encoded"], E["Encoded"]>,
    A["DecodingServices"] | E["DecodingServices"],
    A["EncodingServices"] | E["EncodingServices"]
  >
  return AsyncData
}

export const isNoData = <A, E>(asyncData: AsyncData<A, E>): asyncData is NoData => asyncData._tag === "NoData"
export const isLoading = <A, E>(asyncData: AsyncData<A, E>): asyncData is Loading => asyncData._tag === "Loading"
export const isSuccess = <A, E>(asyncData: AsyncData<A, E>): asyncData is Success<A> => asyncData._tag === "Success"
export const isFailure = <A, E>(asyncData: AsyncData<A, E>): asyncData is Failure<E> => asyncData._tag === "Failure"
export const isOptimistic = <A, E>(asyncData: AsyncData<A, E>): asyncData is Optimistic<A, E> =>
  asyncData._tag === "Optimistic"

const TAGS = new Set(["NoData", "Loading", "Success", "Failure", "Optimistic"])

export const isAsyncData = <A, E>(u: unknown): u is AsyncData<A, E> =>
  isObject(u) && hasProperty(u, "_tag") && isString(u._tag) && TAGS.has(u._tag)

export const isRefreshing = <A, E>(
  asyncData: AsyncData<A, E>
): asyncData is Refreshing<
  A,
  E
> => ((asyncData._tag === "Success" || asyncData._tag === "Failure") && asyncData.progress !== undefined)

export const isPending = <A, E>(asyncData: AsyncData<A, E>): asyncData is Loading | Refreshing<A, E> =>
  asyncData._tag === "Loading" || isRefreshing(asyncData)

export const NoData: NoData = { _tag: "NoData" }

export const loading = (progress?: Progress): Loading => ({ _tag: "Loading", progress })

export const success = <A>(value: A, progress?: Progress): Success<A> => ({
  _tag: "Success",
  value,
  progress
})

export const failure = <E>(cause: Cause.Cause<E>, progress?: Progress): Failure<E> => ({
  _tag: "Failure",
  cause,
  progress
})

export const optimistic = <A, E>(previous: AsyncData<A, E>, value: A): Optimistic<A, E> => ({
  _tag: "Optimistic",
  value,
  previous
})

export const startLoading = <A, E>(
  data: AsyncData<A, E>,
  progress?: Progress
): AsyncData<A, E> => {
  if (isSuccess(data)) {
    return success(data.value, progress)
  } else if (isFailure(data)) {
    return failure(data.cause, progress)
  } else if (isOptimistic(data)) {
    return optimistic(startLoading(data.previous, progress), data.value)
  } else {
    return loading(progress)
  }
}

export const stopLoading = <A, E>(
  data: AsyncData<A, E>
): AsyncData<A, E> => {
  if (isSuccess(data)) {
    return success(data.value)
  } else if (isFailure(data)) {
    return failure(data.cause)
  } else if (isOptimistic(data)) {
    return optimistic(stopLoading(data.previous), data.value)
  } else {
    return data
  }
}

export const match: {
  <A, E, R1, R2, R3, R4, R5>(
    matchers: {
      NoData: (data: NoData) => R1
      Loading: (data: Loading) => R2
      Failure: (cause: Cause.Cause<E>, data: Failure<E>) => R3
      Success: (value: A, data: Success<A>) => R4
      Optimistic: (value: A, data: Optimistic<A, E>) => R5
    }
  ): (data: AsyncData<A, E>) => Unify<R1 | R2 | R3 | R4 | R5>

  <A, E, R1, R2, R3, R4, R5>(
    data: AsyncData<A, E>,
    matchers: {
      NoData: (data: NoData) => R1
      Loading: (data: Loading) => R2
      Failure: (cause: Cause.Cause<E>, data: Failure<E>) => R3
      Success: (value: A, data: Success<A>) => R4
      Optimistic: (value: A, data: Optimistic<A, E>) => R5
    }
  ): Unify<R1 | R2 | R3 | R4 | R5>
} = dual(2, <A, E, R1, R2, R3, R4, R5>(data: AsyncData<A, E>, matchers: {
  NoData: (data: NoData) => R1
  Loading: (data: Loading) => R2
  Failure: (cause: Cause.Cause<E>, data: Failure<E>) => R3
  Success: (value: A, data: Success<A>) => R4
  Optimistic: (value: A, data: Optimistic<A, E>) => R5
}): Unify<R1 | R2 | R3 | R4> => {
  if (isSuccess(data)) {
    return matchers.Success(data.value, data) as Unify<R1 | R2 | R3 | R4>
  } else if (isFailure(data)) {
    return matchers.Failure(data.cause, data) as Unify<R1 | R2 | R3 | R4>
  } else if (isLoading(data)) {
    return matchers.Loading(data) as Unify<R1 | R2 | R3 | R4>
  } else if (isNoData(data)) {
    return matchers.NoData(data) as Unify<R1 | R2 | R3 | R4>
  } else {
    return matchers.Optimistic(data.value, data) as Unify<R1 | R2 | R3 | R4>
  }
})

export function getSuccess<A, E>(data: AsyncData<A, E>): Option.Option<A> {
  return match(data, {
    NoData: Option.none,
    Loading: Option.none,
    Failure: Option.none,
    Success: Option.some,
    Optimistic: Option.some
  })
}

/**
 * @since 1.0.0
 */
export function getCause<A, E>(data: AsyncData<A, E>): Option.Option<Cause.Cause<E>> {
  return match(data, {
    NoData: Option.none,
    Loading: Option.none,
    Failure: Option.some,
    Success: Option.none,
    Optimistic: Option.none
  })
}

/**
 * @since 1.0.0
 */
export function getError<A, E>(data: AsyncData<A, E>): Option.Option<E> {
  return match(data, {
    NoData: Option.none,
    Loading: Option.none,
    Failure: Cause.errorOption,
    Success: Option.none,
    Optimistic: Option.none
  })
}

export const map: {
  <A, B>(f: (a: A) => B): <E>(data: AsyncData<A, E>) => AsyncData<B, E>
  <A, E, B>(data: AsyncData<A, E>, f: (a: A) => B): AsyncData<B, E>
} = dual(2, function map<A, E, B>(data: AsyncData<A, E>, f: (a: A) => B): AsyncData<B, E> {
  if (isSuccess(data)) {
    return success(f(data.value), data.progress)
  } else if (isOptimistic(data)) {
    return optimistic(map(data.previous, f), f(data.value))
  } else {
    return data
  }
})

export const flatMap: {
  <A, E, B, E2>(
    f: (a: A, data: Success<A> | Optimistic<A, E>) => AsyncData<B, E2>
  ): (data: AsyncData<A, E>) => AsyncData<B, E | E2>
  <A, E, B, E2>(
    data: AsyncData<A, E>,
    f: (a: A, data: Success<A> | Optimistic<A, E>) => AsyncData<B, E>
  ): AsyncData<B, E | E2>
} = dual(
  2,
  function<A, E, B, E2>(
    data: AsyncData<A, E>,
    f: (a: A, data: Success<A> | Optimistic<A, E>) => AsyncData<B, E2>
  ): AsyncData<B, E | E2> {
    if (isSuccess(data) || isOptimistic(data)) {
      return f(data.value, data)
    } else {
      return data
    }
  }
)

export const mapError: {
  <A, E, E2>(f: (e: E) => E2): (data: AsyncData<A, E>) => AsyncData<A, E2>
  <A, E, E2>(data: AsyncData<A, E>, f: (e: E) => E2): AsyncData<A, E2>
} = dual(2, function mapError<A, E, E2>(data: AsyncData<A, E>, f: (e: E) => E2): AsyncData<A, E2> {
  if (isFailure(data)) {
    return failure(Cause.map(data.cause, f), data.progress)
  } else if (isOptimistic(data)) {
    return optimistic(mapError(data.previous, f), data.value)
  } else {
    return data
  }
})

export const fromExit = <A, E>(exit: Exit.Exit<A, E>): AsyncData<A, E> =>
  Exit.isSuccess(exit) ? success(exit.value) : failure(exit.cause)

export const fromResult = <A, E>(result: Result.Result<A, E>): AsyncData<A, E> =>
  Result.isSuccess(result) ? success(result.success) : failure(Cause.fail(result.failure))
