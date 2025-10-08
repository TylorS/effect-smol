import { flow, Ref, Scope } from "effect"
import * as Cause from "effect/Cause"
import type * as Equivalence from "effect/data/Equivalence"
import * as Option from "effect/data/Option"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { dual } from "effect/Function"
import { equals } from "effect/interfaces/Equal"
import { type Pipeable, pipeArguments } from "effect/interfaces/Pipeable"
import * as Layer from "effect/Layer"
import * as Util from "./_util.js"
import * as Sink from "./Sink.js"

export abstract class Fx<A, E = never, R = never> implements Pipeable {
  abstract run<RSink>(sink: Sink.Sink<A, E, RSink>): Effect.Effect<unknown, never, R | RSink>

  pipe: Pipeable["pipe"] = function(this: Fx<A, E, R>) {
    return pipeArguments(this, arguments)
  }
}

export declare namespace Fx {
  export type Any = Fx<any, any, any>

  export type Success<T> = T extends Fx<infer _A, infer _E, infer _R> ? _A
    : never

  export type Error<T> = T extends Fx<infer _A, infer _E, infer _R> ? _E
    : never

  export type Services<T> = T extends Fx<infer _A, infer _E, infer _R> ? _R
    : never
}

export type Success<T> = Fx.Success<T>
export type Error<T> = Fx.Error<T>
export type Services<T> = Fx.Services<T>

class Make<A, E, R> extends Fx<A, E, R> {
  readonly run: <RSink>(sink: Sink.Sink<A, E, RSink>) => Effect.Effect<unknown, never, R | RSink>

  constructor(run: <RSink>(sink: Sink.Sink<A, E, RSink>) => Effect.Effect<unknown, never, R | RSink>) {
    super()
    this.run = run
  }
}

export const make = <A, E = never, R = never>(
  run: <RSink = never>(sink: Sink.Sink<A, E, RSink>) => Effect.Effect<unknown, never, R | RSink>
) => new Make<A, E, R>(run)

export const succeed = <A>(value: A) => make<A>((sink) => sink.onSuccess(value))

export const failCause = <E>(cause: Cause.Cause<E>) => make<never, E, never>((sink) => sink.onFailure(cause))
export const fail = flow(Cause.fail, failCause)
export const die = flow(Cause.die, failCause)
export const fromFailures = flow(Cause.fromFailures, failCause)
export const interrupt = flow(Cause.interrupt, failCause)

export const fromEffect = <A, E = never, R = never>(
  effect: Effect.Effect<A, E, R>
): Fx<A, E, R> => make<A, E, R>((sink) => Effect.matchCauseEffect(effect, sink))

export const fromYieldable = <A, E = never, R = never>(
  yieldable: Effect.Yieldable<any, A, E, R>
): Fx<A, E, R> => make<A, E, R>((sink) => Effect.matchCauseEffect(yieldable.asEffect(), sink))

export type FlatMapLike = {
  <A, B, E2, R2>(
    f: (a: A) => Fx<B, E2, R2>
  ): <E, R>(self: Fx<A, E, R>) => Fx<B, E | E2, R | R2 | Scope.Scope>

  <A, E, R, B, E2, R2>(
    self: Fx<A, E, R>,
    f: (a: A) => Fx<B, E2, R2>
  ): Fx<B, E | E2, R | R2 | Scope.Scope>
}

export const flatMap: FlatMapLike = dual(2, <A, E, R, B, E2, R2>(
  self: Fx<A, E, R>,
  f: (a: A) => Fx<B, E2, R2>
): Fx<B, E | E2, R | R2 | Scope.Scope> =>
  make<B, E | E2, R | R2 | Scope.Scope>((sink) =>
    Util.withUnboundedFork((fork) =>
      self.run(Sink.make(
        sink.onFailure,
        (a) => fork(f(a).run(sink))
      ))
    )
  ))

export const flatMapEffect: {
  <A, B, E2, R2>(
    f: (a: A) => Effect.Effect<B, E2, R2>
  ): <E, R>(self: Fx<A, E, R>) => Fx<B, E | E2, R | R2 | Scope.Scope>

  <A, E, R, B, E2, R2>(
    self: Fx<A, E, R>,
    f: (a: A) => Effect.Effect<B, E2, R2>
  ): Fx<B, E | E2, R | R2 | Scope.Scope>
} = dual(2, <A, E, R, B, E2, R2>(
  self: Fx<A, E, R>,
  f: (a: A) => Effect.Effect<B, E2, R2>
): Fx<B, E | E2, R | R2 | Scope.Scope> =>
  make<B, E | E2, R | R2 | Scope.Scope>((sink) =>
    Util.withUnboundedFork((fork) =>
      self.run(Sink.make(
        sink.onFailure,
        (a) => fork(Effect.matchCauseEffect(f(a), sink))
      ))
    )
  ))

export const switchMap: FlatMapLike = dual(2, <A, E, R, B, E2, R2>(
  self: Fx<A, E, R>,
  f: (a: A) => Fx<B, E2, R2>
): Fx<B, E | E2, R | R2 | Scope.Scope> =>
  make<B, E | E2, R | R2 | Scope.Scope>((sink) =>
    Util.withSwitchFork((fork) =>
      self.run(Sink.make(
        sink.onFailure,
        (a) => fork(f(a).run(sink))
      ))
    )
  ))

export const switchMapEffect: {
  <A, B, E2, R2>(
    f: (a: A) => Effect.Effect<B, E2, R2>
  ): <E, R>(self: Fx<A, E, R>) => Fx<B, E | E2, R | R2 | Scope.Scope>

  <A, E, R, B, E2, R2>(
    self: Fx<A, E, R>,
    f: (a: A) => Effect.Effect<B, E2, R2>
  ): Fx<B, E | E2, R | R2 | Scope.Scope>
} = dual(2, <A, E, R, B, E2, R2>(
  self: Fx<A, E, R>,
  f: (a: A) => Effect.Effect<B, E2, R2>
): Fx<B, E | E2, R | R2 | Scope.Scope> =>
  make<B, E | E2, R | R2 | Scope.Scope>((sink) =>
    Util.withSwitchFork((fork) =>
      self.run(Sink.make(
        sink.onFailure,
        (a) => fork(Effect.matchCauseEffect(f(a), sink))
      ))
    )
  ))

export const exhaustLatestMap: FlatMapLike = dual(2, <A, E, R, B, E2, R2>(
  self: Fx<A, E, R>,
  f: (a: A) => Fx<B, E2, R2>
): Fx<B, E | E2, R | R2 | Scope.Scope> =>
  make<B, E | E2, R | R2 | Scope.Scope>((sink) =>
    Util.withExhaustLatestFork((fork) =>
      self.run(Sink.make(
        sink.onFailure,
        (a) => fork(f(a).run(sink))
      ))
    )
  ))

export const exhaustMapLatest: FlatMapLike = dual(2, <A, E, R, B, E2, R2>(
  self: Fx<A, E, R>,
  f: (a: A) => Fx<B, E2, R2>
): Fx<B, E | E2, R | R2 | Scope.Scope> =>
  make<B, E | E2, R | R2 | Scope.Scope>((sink) =>
    Util.withExhaustLatestFork((fork) =>
      self.run(Sink.make(
        sink.onFailure,
        (a) => fork(f(a).run(sink))
      ))
    )
  ))

export const exhaustMapLatestEffect: {
  <A, B, E2, R2>(
    f: (a: A) => Effect.Effect<B, E2, R2>
  ): <E, R>(self: Fx<A, E, R>) => Fx<B, E | E2, R | R2 | Scope.Scope>

  <A, E, R, B, E2, R2>(
    self: Fx<A, E, R>,
    f: (a: A) => Effect.Effect<B, E2, R2>
  ): Fx<B, E | E2, R | R2 | Scope.Scope>
} = dual(2, <A, E, R, B, E2, R2>(
  self: Fx<A, E, R>,
  f: (a: A) => Effect.Effect<B, E2, R2>
): Fx<B, E | E2, R | R2 | Scope.Scope> =>
  make<B, E | E2, R | R2 | Scope.Scope>((sink) =>
    Util.withExhaustLatestFork((fork) =>
      self.run(Sink.make(
        sink.onFailure,
        (a) => fork(Effect.matchCauseEffect(f(a), sink))
      ))
    )
  ))

export const exhaustMap: FlatMapLike = dual(2, <A, E, R, B, E2, R2>(
  self: Fx<A, E, R>,
  f: (a: A) => Fx<B, E2, R2>
): Fx<B, E | E2, R | R2 | Scope.Scope> =>
  make<B, E | E2, R | R2 | Scope.Scope>((sink) =>
    Util.withExhaustFork((fork) =>
      self.run(Sink.make(
        sink.onFailure,
        (a) => fork(f(a).run(sink))
      ))
    )
  ))

export const exhaustMapEffect: {
  <A, B, E2, R2>(
    f: (a: A) => Effect.Effect<B, E2, R2>
  ): <E, R>(self: Fx<A, E, R>) => Fx<B, E | E2, R | R2 | Scope.Scope>

  <A, E, R, B, E2, R2>(
    self: Fx<A, E, R>,
    f: (a: A) => Effect.Effect<B, E2, R2>
  ): Fx<B, E | E2, R | R2 | Scope.Scope>
} = dual(2, <A, E, R, B, E2, R2>(
  self: Fx<A, E, R>,
  f: (a: A) => Effect.Effect<B, E2, R2>
): Fx<B, E | E2, R | R2 | Scope.Scope> =>
  make<B, E | E2, R | R2 | Scope.Scope>((sink) =>
    Util.withExhaustFork((fork) =>
      self.run(Sink.make(
        sink.onFailure,
        (a) => fork(Effect.matchCauseEffect(f(a), sink))
      ))
    )
  ))

export const flatMapConcurrently: {
  <A, B, E2, R2>(
    f: (a: A) => Fx<B, E2, R2>,
    concurrency: number
  ): <E, R>(self: Fx<A, E, R>) => Fx<B, E | E2, R | R2 | Scope.Scope>

  <A, E, R, B, E2, R2>(
    self: Fx<A, E, R>,
    f: (a: A) => Fx<B, E2, R2>,
    concurrency: number
  ): Fx<B, E | E2, R | R2 | Scope.Scope>
} = dual(3, <A, E, R, B, E2, R2>(
  self: Fx<A, E, R>,
  f: (a: A) => Fx<B, E2, R2>,
  concurrency: number
): Fx<B, E | E2, R | R2 | Scope.Scope> =>
  make<B, E | E2, R | R2 | Scope.Scope>((sink) =>
    Util.withBoundedFork(concurrency, (fork) =>
      self.run(Sink.make(
        sink.onFailure,
        (a) => fork(f(a).run(sink))
      )))
  ))

export const flatMapConcurrentlyEffect: {
  <A, B, E2, R2>(
    f: (a: A) => Effect.Effect<B, E2, R2>,
    concurrency: number
  ): <E, R>(self: Fx<A, E, R>) => Fx<B, E | E2, R | R2 | Scope.Scope>

  <A, E, R, B, E2, R2>(
    self: Fx<A, E, R>,
    f: (a: A) => Effect.Effect<B, E2, R2>,
    concurrency: number
  ): Fx<B, E | E2, R | R2 | Scope.Scope>
} = dual(3, <A, E, R, B, E2, R2>(
  self: Fx<A, E, R>,
  f: (a: A) => Effect.Effect<B, E2, R2>,
  concurrency: number
): Fx<B, E | E2, R | R2 | Scope.Scope> =>
  make<B, E | E2, R | R2 | Scope.Scope>((sink) =>
    Util.withBoundedFork(concurrency, (fork) =>
      self.run(Sink.make(
        sink.onFailure,
        (a) => fork(Effect.matchCauseEffect(f(a), sink))
      )))
  ))

export const map: {
  <A, B>(
    f: (a: A) => B
  ): <E, R>(self: Fx<A, E, R>) => Fx<B, E, R>

  <A, E, R, B>(
    self: Fx<A, E, R>,
    f: (a: A) => B
  ): Fx<B, E, R>
} = dual(2, <A, E, R, B>(
  self: Fx<A, E, R>,
  f: (a: A) => B
): Fx<B, E, R> => make<B, E, R>((sink) => self.run(Sink.map(sink, f))))

export const mapEffect: {
  <A, B, E2, R2>(
    f: (a: A) => Effect.Effect<B, E2, R2>
  ): <E, R>(fx: Fx<A, E | E2, R>) => Fx<B, E | E2, R | R2>

  <A, E, R, B, E2, R2>(
    fx: Fx<A, E | E2, R>,
    f: (a: A) => Effect.Effect<B, E2, R2>
  ): Fx<B, E | E2, R | R2>
} = dual(2, <A, E, R, B, E2, R2>(
  self: Fx<A, E, R>,
  f: (a: A) => Effect.Effect<B, E2, R2>
): Fx<B, E | E2, R | R2 | Scope.Scope> =>
  make<B, E | E2, R | R2 | Scope.Scope>((sink) => self.run(Sink.mapEffect(sink, f))))

export const filter: {
  <A>(
    f: (a: A) => boolean
  ): <E, R>(self: Fx<A, E, R>) => Fx<A, E, R>

  <A, E, R>(
    self: Fx<A, E, R>,
    f: (a: A) => boolean
  ): Fx<A, E, R>
} = dual(2, <A, E, R>(
  self: Fx<A, E, R>,
  f: (a: A) => boolean
): Fx<A, E, R> => make<A, E, R>((sink) => self.run(Sink.filter(sink, f))))

export const filterMap: {
  <A, B>(
    f: (a: A) => Option.Option<B>
  ): <E, R>(self: Fx<A, E, R>) => Fx<B, E, R>

  <A, E, R, B>(
    self: Fx<A, E, R>,
    f: (a: A) => Option.Option<B>
  ): Fx<B, E, R>
} = dual(2, <A, E, R, B>(
  self: Fx<A, E, R>,
  f: (a: A) => Option.Option<B>
): Fx<B, E, R> => make<B, E, R>((sink) => self.run(Sink.filterMap(sink, f))))

export const compact = <A, E, R>(
  self: Fx<Option.Option<A>, E, R>
): Fx<A, E, R> => make<A, E, R>((sink) => self.run(Sink.compact(sink)))

export const filterEffect: {
  <A, E2, R2>(
    f: (a: A) => Effect.Effect<boolean, E2, R2>
  ): <E, R>(self: Fx<A, E | E2, R>) => Fx<A, E | E2, R | R2>

  <A, E, R, E2, R2>(
    self: Fx<A, E | E2, R>,
    f: (a: A) => Effect.Effect<boolean, E2, R2>
  ): Fx<A, E | E2, R | R2>
} = dual(2, <A, E, R, E2, R2>(
  self: Fx<A, E, R>,
  f: (a: A) => Effect.Effect<boolean, E2, R2>
): Fx<A, E | E2, R | R2> => make<A, E | E2, R | R2>((sink) => self.run(Sink.filterEffect(f)(sink))))

export const filterMapEffect: {
  <A, B, E2, R2>(
    f: (a: A) => Effect.Effect<Option.Option<B>, E2, R2>
  ): <E, R>(self: Fx<A, E | E2, R>) => Fx<B, E | E2, R | R2>

  <A, E, R, B, E2, R2>(
    self: Fx<A, E | E2, R>,
    f: (a: A) => Effect.Effect<Option.Option<B>, E2, R2>
  ): Fx<B, E | E2, R | R2>
} = dual(2, <A, E, R, B, E2, R2>(
  self: Fx<A, E, R>,
  f: (a: A) => Effect.Effect<Option.Option<B>, E2, R2>
): Fx<B, E | E2, R | R2> => make<B, E | E2, R | R2>((sink) => self.run(Sink.filterMapEffect(f)(sink))))

export const tapEffect: {
  <A, E2, R2>(
    f: (a: A) => Effect.Effect<unknown, E2, R2>
  ): <E, R>(self: Fx<A, E | E2, R>) => Fx<A, E | E2, R | R2>

  <A, E, R, E2, R2>(
    self: Fx<A, E | E2, R>,
    f: (a: A) => Effect.Effect<unknown, E2, R2>
  ): Fx<A, E | E2, R | R2>
} = dual(2, <A, E, R, E2, R2>(
  self: Fx<A, E, R>,
  f: (a: A) => Effect.Effect<unknown, E2, R2>
): Fx<A, E | E2, R | R2> => make<A, E | E2, R | R2>((sink) => self.run(Sink.tapEffect(f)(sink))))

export const loop: {
  <B, A, C>(
    seed: B,
    f: (acc: B, a: A) => readonly [C, B]
  ): <E, R>(self: Fx<A, E, R>) => Fx<C, E, R>

  <A, E, R, B, C>(
    self: Fx<A, E, R>,
    seed: B,
    f: (acc: B, a: A) => readonly [C, B]
  ): Fx<C, E, R>
} = dual(3, <A, E, R, B, C>(
  self: Fx<A, E, R>,
  seed: B,
  f: (acc: B, a: A) => readonly [C, B]
): Fx<C, E, R> => make<C, E, R>((sink) => self.run(Sink.loop(sink, seed, f))))

export const loopCause: {
  <B, A, C>(
    seed: B,
    f: (acc: B, a: Cause.Cause<A>) => readonly [Cause.Cause<C>, B]
  ): <E, R>(self: Fx<A, E, R>) => Fx<A, C, R>

  <A, E, R, B, C>(
    self: Fx<A, E, R>,
    seed: B,
    f: (acc: B, a: Cause.Cause<E>) => readonly [Cause.Cause<C>, B]
  ): Fx<A, C, R>
} = dual(3, <A, E, R, B, C>(
  self: Fx<A, E, R>,
  seed: B,
  f: (acc: B, a: Cause.Cause<E>) => readonly [Cause.Cause<C>, B]
): Fx<A, C, R> => make<A, C, R>((sink) => self.run(Sink.loopCause(sink, seed, f))))

export const loopEffect: {
  <B, A, E2, R2, C>(
    seed: B,
    f: (acc: B, a: A) => Effect.Effect<readonly [C, B], E2, R2>
  ): <E, R>(self: Fx<A, E | E2, R>) => Fx<C, E | E2, R | R2>

  <A, E, R, B, C>(
    self: Fx<A, E, R>,
    seed: B,
    f: (acc: B, a: A) => Effect.Effect<readonly [C, B], E, R>
  ): Fx<C, E, R>
} = dual(3, <A, E, R, B, C>(
  self: Fx<A, E, R>,
  seed: B,
  f: (acc: B, a: A) => Effect.Effect<readonly [C, B], E, R>
): Fx<C, E, R> => make<C, E, R>((sink) => self.run(Sink.loopEffect(seed, f)(sink))))

export const filterMapLoop: {
  <B, A, C>(
    seed: B,
    f: (acc: B, a: A) => readonly [Option.Option<C>, B]
  ): <E, R>(self: Fx<A, E, R>) => Fx<C, E, R>

  <A, E, R, B, C>(
    self: Fx<A, E, R>,
    seed: B,
    f: (acc: B, a: A) => readonly [Option.Option<C>, B]
  ): Fx<C, E, R>
} = dual(3, <A, E, R, B, C>(
  self: Fx<A, E, R>,
  seed: B,
  f: (acc: B, a: A) => readonly [Option.Option<C>, B]
): Fx<C, E, R> => make<C, E, R>((sink) => self.run(Sink.filterMapLoop(sink, seed, f))))

export const filterMapLoopCause: {
  <B, A, C>(
    seed: B,
    f: (acc: B, a: Cause.Cause<A>) => readonly [Option.Option<Cause.Cause<C>>, B]
  ): <E, R>(self: Fx<A, E, R>) => Fx<A, C, R>

  <A, E, R, B, C>(
    self: Fx<A, E, R>,
    seed: B,
    f: (acc: B, a: Cause.Cause<E>) => readonly [Option.Option<Cause.Cause<C>>, B]
  ): Fx<A, C, R>
} = dual(3, <A, E, R, B, C>(
  self: Fx<A, E, R>,
  seed: B,
  f: (acc: B, a: Cause.Cause<E>) => readonly [Option.Option<Cause.Cause<C>>, B]
): Fx<A, C, R> => make<A, C, R>((sink) => self.run(Sink.filterMapLoopCause(sink, seed, f))))

export const filterMapLoopEffect: {
  <B, A, E2, R2, C>(
    seed: B,
    f: (acc: B, a: A) => Effect.Effect<readonly [Option.Option<C>, B], E2, R2>
  ): <E, R>(self: Fx<A, E | E2, R>) => Fx<C, E | E2, R | R2>

  <A, E, R, B, R2, C>(
    self: Fx<A, E, R>,
    seed: B,
    f: (acc: B, a: A) => Effect.Effect<readonly [Option.Option<C>, B], E, R2>
  ): Fx<C, E, R | R2>
} = dual(3, <A, E, R, B, R2, C>(
  self: Fx<A, E, R>,
  seed: B,
  f: (acc: B, a: A) => Effect.Effect<readonly [Option.Option<C>, B], E, R2>
): Fx<C, E, R | R2> => make<C, E, R | R2>((sink) => self.run(Sink.filterMapLoopEffect(sink, seed, f))))

export const loopCauseEffect: {
  <B, A, E2, R2, C>(
    seed: B,
    f: (acc: B, a: Cause.Cause<A>) => Effect.Effect<readonly [Option.Option<Cause.Cause<C>>, B], E2, R2>
  ): <E, R>(self: Fx<A, E | E2, R>) => Fx<A, C | E2, R | R2>

  <A, E, R, B, R2, C>(
    self: Fx<A, E, R>,
    seed: B,
    f: (acc: B, a: Cause.Cause<E>) => Effect.Effect<readonly [Option.Option<Cause.Cause<C>>, B], C, R2>
  ): Fx<A, C, R | R2>
} = dual(3, <A, E, R, B, R2, C>(
  self: Fx<A, E, R>,
  seed: B,
  f: (acc: B, a: Cause.Cause<E>) => Effect.Effect<readonly [Option.Option<Cause.Cause<C>>, B], C, R2>
): Fx<A, C, R | R2> => make<A, C, R | R2>((sink) => self.run(Sink.filterMapLoopCauseEffect(sink, seed, f))))

export const filterMapLoopCauseEffect: {
  <B, A, E2, R2, C>(
    seed: B,
    f: (acc: B, a: Cause.Cause<A>) => Effect.Effect<readonly [Option.Option<Cause.Cause<C>>, B], E2, R2>
  ): <E, R>(self: Fx<A, E | E2, R>) => Fx<A, C | E2, R | R2>

  <A, E, R, B, R2, C>(
    self: Fx<A, E, R>,
    seed: B,
    f: (acc: B, a: Cause.Cause<E>) => Effect.Effect<readonly [Option.Option<Cause.Cause<C>>, B], C, R2>
  ): Fx<A, C, R | R2>
} = dual(3, <A, E, R, B, R2, C>(
  self: Fx<A, E, R>,
  seed: B,
  f: (acc: B, a: Cause.Cause<E>) => Effect.Effect<readonly [Option.Option<Cause.Cause<C>>, B], C, R2>
): Fx<A, C, R | R2> => make<A, C, R | R2>((sink) => self.run(Sink.filterMapLoopCauseEffect(sink, seed, f))))

export interface Bounds {
  readonly skip: number
  readonly take: number
}

export const slice: {
  (
    bounds: Bounds
  ): <A, E, R>(fx: Fx<A, E, R>) => Fx<A, E, R>

  <A, E, R>(
    fx: Fx<A, E, R>,
    bounds: Bounds
  ): Fx<A, E, R>
} = dual(2, <A, E, R>(
  fx: Fx<A, E, R>,
  bounds: Bounds
): Fx<A, E, R> => make<A, E, R>((sink) => Sink.slice(sink, bounds, (sink) => fx.run(sink))))

export const skip: {
  (
    n: number
  ): <A, E, R>(fx: Fx<A, E, R>) => Fx<A, E, R>

  <A, E, R>(
    fx: Fx<A, E, R>,
    n: number
  ): Fx<A, E, R>
} = dual(2, <A, E, R>(
  fx: Fx<A, E, R>,
  n: number
): Fx<A, E, R> => slice(fx, { skip: n, take: Infinity }))

export const take: {
  (
    n: number
  ): <A, E, R>(fx: Fx<A, E, R>) => Fx<A, E, R>

  <A, E, R>(
    fx: Fx<A, E, R>,
    n: number
  ): Fx<A, E, R>
} = dual(2, <A, E, R>(
  fx: Fx<A, E, R>,
  n: number
): Fx<A, E, R> => slice(fx, { skip: 0, take: n }))

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

export const unwrap = <A, E, R, E2, R2>(
  effect: Effect.Effect<Fx<A, E, R>, E2, R2>
): Fx<A, E | E2, R | R2> =>
  make<A, E | E2, R | R2>((sink) =>
    Effect.matchCauseEffect(effect, {
      onFailure: (cause) => sink.onFailure(cause),
      onSuccess: (fx) => fx.run(sink)
    })
  )

export const unwrapScoped = <A, E, R, E2, R2>(
  effect: Effect.Effect<Fx<A, E, R>, E2, R2 | Scope.Scope>
): Fx<A, E | E2, Exclude<R | R2, Scope.Scope>> =>
  make<A, E | E2, Exclude<R | R2, Scope.Scope>>((sink) =>
    Effect.scoped(Effect.matchCauseEffect(effect, {
      onFailure: (cause) => sink.onFailure(cause),
      onSuccess: (fx) => fx.run(sink)
    }))
  )

export const gen = <Yield extends Effect.Yieldable<any, any, any, any>, A, E, R>(
  f: () => Generator<Yield, Fx<A, E, R>, any>
): Fx<A, E | Effect.Yieldable.Error<Yield>, R | Effect.Yieldable.Services<Yield>> => unwrap(Effect.gen(f))

export const genScoped = <Yield extends Effect.Yieldable<any, any, any, any>, A, E, R>(
  f: () => Generator<Yield, Fx<A, E, R>, any>
): Fx<A, E | Effect.Yieldable.Error<Yield>, Exclude<R | Effect.Yieldable.Services<Yield>, Scope.Scope>> =>
  unwrapScoped(Effect.gen(f))

export const skipRepeatsWith = <A>(Eq: Equivalence.Equivalence<A>) => <E, R>(fx: Fx<A, E, R>): Fx<A, E, R> =>
  make<A, E, R>((sink) =>
    Sink.withState(
      sink,
      Option.none<A>(),
      (sink) =>
        fx.run(Sink.make(sink.onFailure, (a2) =>
          Effect.flatten(Ref.modify(
            sink.state,
            Option.match({
              onNone: () => [sink.onSuccess(a2), Option.some(a2)],
              onSome: (a) => Eq(a, a2) ? [Effect.void, Option.some(a)] : [sink.onSuccess(a2), Option.some(a2)]
            })
          ))))
    )
  )

const skipRepeats_ = skipRepeatsWith(equals)

export const skipRepeats: <A, E, R>(fx: Fx<A, E, R>) => Fx<A, E, R> = skipRepeats_

export const provide: {
  <R2, E2 = never, R3 = never>(
    layer: Layer.Layer<R2, E2, R3>
  ): <A, E, R>(fx: Fx<A, E, R>) => Fx<A, E | E2, Exclude<R, R2> | R3>

  <A, E, R, R2, E2 = never, R3 = never>(
    fx: Fx<A, E, R>,
    layer: Layer.Layer<R2, E2, R3>
  ): Fx<A, E | E2, Exclude<R, R2> | R3>
} = dual(2, <A, E, R, R2, E2 = never, R3 = never>(
  fx: Fx<A, E, R>,
  layer: Layer.Layer<R2, E2, R3>
): Fx<A, E | E2, Exclude<R, R2> | R3> =>
  make<A, E | E2, Exclude<R, R2> | R3>(
    Effect.fnUntraced(function*(sink) {
      const scope = yield* Scope.make()
      const servicesExit = yield* layer.pipe(
        Layer.buildWithScope(scope),
        Effect.exit
      )

      if (Exit.isFailure(servicesExit)) {
        yield* Scope.close(scope, servicesExit)
        return yield* sink.onFailure(servicesExit.cause)
      }

      return yield* fx.run(sink).pipe(
        Effect.provideServices(servicesExit.value),
        Effect.onExit((exit) => Scope.close(scope, exit))
      )
    })
  ))
