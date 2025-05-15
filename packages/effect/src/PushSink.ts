import * as Cause from "./Cause.js"
import * as Effect from "./Effect.js"
import { dual } from "./Function.js"
import * as Option from "./Option.js"

export interface PushSink<A, E = never, R = never> {
  readonly onSuccess: (value: A) => Effect.Effect<unknown, never, R>
  readonly onFailure: (cause: Cause.Cause<E>) => Effect.Effect<unknown, never, R>
}

export function make<A, E = never, R = never, R2 = never>(
  sink: {
    readonly onSuccess: (value: A) => Effect.Effect<unknown, never, R>
    readonly onFailure: (cause: Cause.Cause<E>) => Effect.Effect<unknown, never, R2>
  }
): PushSink<A, E, R | R2> {
  return {
    onSuccess: sink.onSuccess,
    onFailure: sink.onFailure
  }
}

export const map: {
  <A, B>(f: (value: B) => A): <E, R>(sink: PushSink<A, E, R>) => PushSink<B, E, R>
  <A, E, R, B>(sink: PushSink<A, E, R>, f: (value: B) => A): PushSink<B, E, R>
} = dual(2, function map<A, E, R, B>(
  sink: PushSink<A, E, R>,
  f: (value: B) => A
): PushSink<B, E, R> {
  return {
    onSuccess: (value) => sink.onSuccess(f(value)),
    onFailure: sink.onFailure
  }
})

export const mapErrorCause: {
  <E, F>(f: (cause: Cause.Cause<F>) => Cause.Cause<E>): <A, R>(sink: PushSink<A, E, R>) => PushSink<A, F, R>
  <A, E, R, F>(sink: PushSink<A, E, R>, f: (cause: Cause.Cause<F>) => Cause.Cause<E>): PushSink<A, F, R>
} = dual(2, function mapErrorCause<A, E, R, F>(
  sink: PushSink<A, E, R>,
  f: (cause: Cause.Cause<F>) => Cause.Cause<E>
): PushSink<A, F, R> {
  return {
    onSuccess: sink.onSuccess,
    onFailure: (cause) => sink.onFailure(f(cause))
  }
})

export function mapError<A, E, R, F>(sink: PushSink<A, E, R>, f: (cause: F) => E): PushSink<A, F, R> {
  return mapErrorCause(sink, Cause.map(f))
}

export const filter: {
  <A>(f: (a: A) => boolean): <E, R>(sink: PushSink<A, E, R>) => PushSink<A, E, R>
  <A, E, R>(sink: PushSink<A, E, R>, f: (a: A) => boolean): PushSink<A, E, R>
} = dual(2, function filter<A, E, R>(sink: PushSink<A, E, R>, f: (a: A) => boolean): PushSink<A, E, R> {
  return {
    onSuccess: (value) => f(value) ? sink.onSuccess(value) : Effect.void,
    onFailure: sink.onFailure
  }
})

export const filterMap: {
  <A, B>(f: (b: B) => Option.Option<A>): <E, R>(sink: PushSink<A, E, R>) => PushSink<B, E, R>
  <A, E, R, B>(sink: PushSink<A, E, R>, f: (b: B) => Option.Option<A>): PushSink<B, E, R>
} = dual(2, function filterMap<A, E, R, B>(sink: PushSink<A, E, R>, f: (b: B) => Option.Option<A>): PushSink<B, E, R> {
  return {
    onSuccess: (value) => Option.match(f(value), {
      onNone: () => Effect.void,
      onSome: (value) => sink.onSuccess(value)
    }),
    onFailure: sink.onFailure
  }
})
