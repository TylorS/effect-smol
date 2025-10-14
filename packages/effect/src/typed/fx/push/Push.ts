/**
 * Push is a type of Fx that can be used to push values to a sink.
 */

import type { Cause } from "../../../Cause.ts"
import type * as Option from "../../../data/Option.ts"
import type * as Effect from "../../../Effect.ts"
import { dual } from "../../../Function.ts"
import { pipeArguments } from "../../../interfaces/Pipeable.ts"
import type * as Scope from "../../../Scope.ts"
import * as Fx from "../index.ts"
import * as Sink from "../sink/index.ts"
import { FxTypeId } from "../TypeId.ts"

/**
 * Push is an abstract type which represents a Type which is both an Fx and a Sink. The type parameters
 * are decoupled from one another and allow mapping over the input and output of the Push separately for
 * more complex use cases.
 */
export interface Push<in A, in E, out R, out B, out E2, out R2> extends Sink.Sink<A, E, R>, Fx.Fx<B, E2, R2> {}

export namespace Push {
  export interface Any extends Push<any, any, any, any, any, any> {}
}

export const make: {
  <B, E2, R2>(fx: Fx.Fx<B, E2, R2>): <A, E, R>(sink: Sink.Sink<A, E, R>) => Push<A, E, R, B, E2, R2>
  <A, E, R, B, E2, R2>(sink: Sink.Sink<A, E, R>, fx: Fx.Fx<B, E2, R2>): Push<A, E, R, B, E2, R2>
} = dual(2, function make<A, E, R, B, E2, R2>(
  sink: Sink.Sink<A, E, R>,
  fx: Fx.Fx<B, E2, R2>
): Push<A, E, R, B, E2, R2> {
  return new PushImpl(sink, fx)
})

class PushImpl<A, E, R, B, E2, R2> implements Push<A, E, R, B, E2, R2> {
  readonly [FxTypeId]: FxTypeId = FxTypeId
  readonly sink: Sink.Sink<A, E, R>
  readonly fx: Fx.Fx<B, E2, R2>

  constructor(sink: Sink.Sink<A, E, R>, fx: Fx.Fx<B, E2, R2>) {
    this.sink = sink
    this.fx = fx

    this.onFailure = this.onFailure.bind(this)
    this.onSuccess = this.onSuccess.bind(this)
  }

  run<R3>(sink: Sink.Sink<B, E2, R3>): Effect.Effect<unknown, never, R2 | R3> {
    return this.fx.run(sink)
  }

  onFailure(cause: Cause<E>): Effect.Effect<unknown, never, R> {
    return this.sink.onFailure(cause)
  }

  onSuccess(value: A): Effect.Effect<unknown, never, R> {
    return this.sink.onSuccess(value)
  }

  pipe() {
    return pipeArguments(this, arguments)
  }
}

export const mapInput: {
  <P extends Push.Any, C>(
    f: (c: C) => Sink.Success<P>
  ): (
    push: P
  ) => Push<Sink.Context<P>, Sink.Error<P>, C, Fx.Fx.Services<P>, Fx.Fx.Error<P>, Fx.Fx.Success<P>>

  <P extends Push.Any, C>(
    push: P,
    f: (c: C) => Sink.Sink.Success<P>
  ): Push<Sink.Sink.Context<P>, Sink.Sink.Error<P>, C, Fx.Fx.Services<P>, Fx.Fx.Error<P>, Fx.Fx.Success<P>>
} = dual(2, function mapInput<P extends Push.Any, C>(
  push: P,
  f: (c: C) => Sink.Success<P>
): Push<Sink.Context<P>, Sink.Error<P>, C, Fx.Fx.Services<P>, Fx.Fx.Error<P>, Fx.Fx.Success<P>> {
  return make(
    Sink.map(push, f),
    push
  )
})

export const mapInputEffect: {
  <C, R3, E, A>(
    f: (c: C) => Effect.Effect<A, E, R3>
  ): <R, B, E2, R2>(push: Push<A, E, R, B, E2, R2>) => Push<C, E, R | R3, B, E2, R2>

  <A, E, R, B, E2, R2, R3, C>(
    push: Push<A, E, R, B, E2, R2>,
    f: (c: C) => Effect.Effect<A, E, R3>
  ): Push<C, E, R | R3, B, E2, R2>
} = dual(2, function mapInputEffect<A, E, R, B, E2, R2, R3, C>(
  push: Push<A, E, R, B, E2, R2>,
  f: (c: C) => Effect.Effect<A, E, R3>
): Push<C, E, R | R3, B, E2, R2> {
  return make(
    Sink.mapEffect(push, f),
    push
  )
})

export const filterInput: {
  <A>(f: (a: A) => boolean): <P extends Push.Any>(
    push: P
  ) => Push<Sink.Context<P>, Sink.Error<P>, A, Fx.Fx.Services<P>, Fx.Fx.Error<P>, Fx.Fx.Success<P>>
  <A, E, R, B, E2, R2>(push: Push<A, E, R, B, E2, R2>, f: (a: A) => boolean): Push<A, E, R, B, E2, R2>
} = dual(2, function filterInput<A, E, R, B, E2, R2>(
  push: Push<A, E, R, B, E2, R2>,
  f: (a: A) => boolean
): Push<A, E, R, B, E2, R2> {
  return make(
    Sink.filter(push, f),
    push
  )
})

export const filterInputEffect: {
  <A, R3, E>(f: (a: A) => Effect.Effect<boolean, E, R3>): <R, B, E2, R2>(
    push: Push<A, E, R, B, E2, R2>
  ) => Push<A, E, R | R3, B, E2, R2>

  <A, E, R, B, E2, R2, R3>(
    push: Push<A, E, R, B, E2, R2>,
    f: (a: A) => Effect.Effect<boolean, E, R3>
  ): Push<A, E, R | R3, B, E2, R2>
} = dual(2, function filterInputEffect<A, E, R, B, E2, R2, R3>(
  push: Push<A, E, R, B, E2, R2>,
  f: (a: A) => Effect.Effect<boolean, E, R3>
): Push<A, E, R | R3, B, E2, R2> {
  return make(
    Sink.filterEffect<A, E, R | R3>(push, f),
    push
  )
})

export const filterMapInput: {
  <C, A>(f: (c: C) => Option.Option<A>): <P extends Push.Any>(
    push: P
  ) => Push<C, Sink.Error<P>, Sink.Context<P>, Fx.Fx.Success<P>, Fx.Fx.Error<P>, Fx.Fx.Services<P>>
  <A, E, R, B, E2, R2, C>(push: Push<A, E, R, B, E2, R2>, f: (c: C) => Option.Option<A>): Push<C, E, R, B, E2, R2>
} = dual(2, function filterMapInput<A, E, R, B, E2, R2, C>(
  push: Push<A, E, R, B, E2, R2>,
  f: (c: C) => Option.Option<A>
): Push<C, E, R, B, E2, R2> {
  return make(
    Sink.filterMap(push, f),
    push
  )
})

export const filterMapInputEffect: {
  <C, R3, E, A>(f: (c: C) => Effect.Effect<Option.Option<A>, E, R3>): <R, B, E2, R2>(
    push: Push<A, E, R, B, E2, R2>
  ) => Push<C, E, R | R3, B, E2, R2>
  <A, E, R, B, E2, R2, R3, C>(
    push: Push<A, E, R, B, E2, R2>,
    f: (c: C) => Effect.Effect<Option.Option<A>, E, R3>
  ): Push<C, E, R | R3, B, E2, R2>
} = dual(2, function filterMapInputEffect<A, E, R, B, E2, R2, R3, C>(
  push: Push<A, E, R, B, E2, R2>,
  f: (c: C) => Effect.Effect<Option.Option<A>, E, R3>
): Push<C, E, R | R3, B, E2, R2> {
  return make(
    Sink.filterMapEffect(push, f),
    push
  )
})

export const map: {
  <B, C>(f: (b: B) => C): <A, E, R, E2, R2>(push: Push<A, E, R, B, E2, R2>) => Push<A, E, R, C, E2, R2>
  <A, E, R, B, E2, R2, C>(push: Push<A, E, R, B, E2, R2>, f: (b: B) => C): Push<A, E, R, C, E2, R2>
} = dual(2, function map<A, E, R, B, E2, R2, C>(
  push: Push<A, E, R, B, E2, R2>,
  f: (b: B) => C
): Push<A, E, R, C, E2, R2> {
  return make(
    push,
    Fx.map(push, f)
  )
})

export const mapEffect: {
  <B, C, E3, R3>(f: (b: B) => Effect.Effect<C, E3, R3>): <A, E, R, E2, R2>(
    push: Push<A, E, R, B, E2, R2>
  ) => Push<A, E, R, C, E2 | E3, R2 | R3>
  <A, E, R, B, E2, R2, C, E3, R3>(
    push: Push<A, E, R, B, E2, R2>,
    f: (b: B) => Effect.Effect<C, E3, R3>
  ): Push<A, E, R, C, E2 | E3, R2 | R3>
} = dual(2, function mapEffect<A, E, R, B, E2, R2, C, E3, R3>(
  push: Push<A, E, R, B, E2, R2>,
  f: (b: B) => Effect.Effect<C, E3, R3>
): Push<A, E, R, C, E2 | E3, R2 | R3> {
  return make(
    push,
    Fx.mapEffect(push, f)
  )
})

export const filter: {
  <B>(f: (b: B) => boolean): <A, E, R, E2, R2>(push: Push<A, E, R, B, E2, R2>) => Push<A, E, R, B, E2, R2>
  <A, E, R, B, E2, R2>(push: Push<A, E, R, B, E2, R2>, f: (b: B) => boolean): Push<A, E, R, B, E2, R2>
} = dual(2, function filter<A, E, R, B, E2, R2>(
  push: Push<A, E, R, B, E2, R2>,
  f: (b: B) => boolean
): Push<A, E, R, B, E2, R2> {
  return make(
    push,
    Fx.filter(push, f)
  )
})

export const filterEffect: {
  <B, R3, E3>(f: (b: B) => Effect.Effect<boolean, E3, R3>): <A, E, R, E2, R2>(
    push: Push<A, E, R, B, E2, R2>
  ) => Push<A, E, R, B, E2 | E3, R2 | R3>
  <A, E, R, B, E2, R2, R3, E3>(
    push: Push<A, E, R, B, E2, R2>,
    f: (b: B) => Effect.Effect<boolean, E3, R3>
  ): Push<A, E, R, B, E2 | E3, R2 | R3>
} = dual(2, function filterEffect<A, E, R, B, E2, R2, R3, E3>(
  push: Push<A, E, R, B, E2, R2>,
  f: (b: B) => Effect.Effect<boolean, E3, R3>
): Push<A, E, R, B, E2 | E3, R2 | R3> {
  return make(
    push,
    Fx.filterEffect(push, f)
  )
})

export const filterMap: {
  <B, C>(f: (b: B) => Option.Option<C>): <A, E, R, E2, R2>(
    push: Push<A, E, R, B, E2, R2>
  ) => Push<A, E, R, C, E2, R2>
  <A, E, R, B, E2, R2, C>(push: Push<A, E, R, B, E2, R2>, f: (b: B) => Option.Option<C>): Push<A, E, R, C, E2, R2>
} = dual(2, function filterMap<A, E, R, B, E2, R2, C>(
  push: Push<A, E, R, B, E2, R2>,
  f: (b: B) => Option.Option<C>
): Push<A, E, R, C, E2, R2> {
  return make(
    push,
    Fx.filterMap(push, f)
  )
})

export const filterMapEffect: {
  <B, C, E3, R3>(f: (b: B) => Effect.Effect<Option.Option<C>, E3, R3>): <A, E, R, E2, R2>(
    push: Push<A, E, R, B, E2, R2>
  ) => Push<A, E, R, C, E2 | E3, R2 | R3>
  <A, E, R, B, E2, R2, C, E3, R3>(
    push: Push<A, E, R, B, E2, R2>,
    f: (b: B) => Effect.Effect<Option.Option<C>, E3, R3>
  ): Push<A, E, R, C, E2 | E3, R2 | R3>
} = dual(2, function filterMapEffect<A, E, R, B, E2, R2, C, E3, R3>(
  push: Push<A, E, R, B, E2, R2>,
  f: (b: B) => Effect.Effect<Option.Option<C>, E3, R3>
): Push<A, E, R, C, E2 | E3, R2 | R3> {
  return make(
    push,
    Fx.filterMapEffect(push, f)
  )
})

export const switchMap: {
  <B, C, E3, R3>(f: (b: B) => Fx.Fx<C, E3, R3>): <A, E, R, E2, R2>(
    push: Push<A, E, R, B, E2, R2>
  ) => Push<A, E, R, Scope.Scope | C, E2 | E3, R2 | R3>
  <A, E, R, B, E2, R2, C, E3, R3>(
    push: Push<A, E, R, B, E2, R2>,
    f: (b: B) => Fx.Fx<C, E3, R3>
  ): Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope>
} = dual(2, function switchMap<A, E, R, B, E2, R2, C, E3, R3>(
  push: Push<A, E, R, B, E2, R2>,
  f: (b: B) => Fx.Fx<C, E3, R3>
): Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope> {
  return make(
    push,
    Fx.switchMap(push, f)
  )
})

export const switchMapEffect: {
  <B, C, E3, R3>(f: (b: B) => Effect.Effect<C, E3, R3>): <A, E, R, E2, R2>(
    push: Push<A, E, R, B, E2, R2>
  ) => Push<A, E, R, Scope.Scope | C, E2 | E3, R2 | R3>
  <A, E, R, B, E2, R2, C, E3, R3>(
    push: Push<A, E, R, B, E2, R2>,
    f: (b: B) => Effect.Effect<C, E3, R3>
  ): Push<A, E, R, Scope.Scope | C, E2 | E3, R2 | R3>
} = dual(2, function switchMapEffect<A, E, R, B, E2, R2, C, E3, R3>(
  push: Push<A, E, R, B, E2, R2>,
  f: (b: B) => Effect.Effect<C, E3, R3>
): Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope> {
  return make(
    push,
    Fx.switchMapEffect(push, f)
  )
})

export const flatMap: {
  <B, C, E3, R3>(f: (b: B) => Fx.Fx<C, E3, R3>): <A, E, R, E2, R2>(
    push: Push<A, E, R, B, E2, R2>
  ) => Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope>
  <A, E, R, B, E2, R2, C, E3, R3>(
    push: Push<A, E, R, B, E2, R2>,
    f: (b: B) => Fx.Fx<C, E3, R3>
  ): Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope>
} = dual(2, function flatMap<A, E, R, B, E2, R2, C, E3, R3>(
  push: Push<A, E, R, B, E2, R2>,
  f: (b: B) => Fx.Fx<C, E3, R3>
): Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope> {
  return make(
    push,
    Fx.flatMap(push, f)
  )
})

export const flatMapEffect: {
  <B, C, E3, R3>(f: (b: B) => Effect.Effect<C, E3, R3>): <A, E, R, E2, R2>(
    push: Push<A, E, R, B, E2, R2>
  ) => Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope>
  <A, E, R, B, E2, R2, C, E3, R3>(
    push: Push<A, E, R, B, E2, R2>,
    f: (b: B) => Effect.Effect<C, E3, R3>
  ): Push<A, E, R, Scope.Scope | C, E2 | E3, R2 | R3>
} = dual(2, function flatMapEffect<A, E, R, B, E2, R2, C, E3, R3>(
  push: Push<A, E, R, B, E2, R2>,
  f: (b: B) => Effect.Effect<C, E3, R3>
): Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope> {
  return make(
    push,
    Fx.flatMapEffect(push, f)
  )
})

export const exhaustMap: {
  <B, C, E3, R3>(f: (b: B) => Fx.Fx<C, E3, R3>): <A, E, R, E2, R2>(
    push: Push<A, E, R, B, E2, R2>
  ) => Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope>
  <A, E, R, B, E2, R2, C, E3, R3>(
    push: Push<A, E, R, B, E2, R2>,
    f: (b: B) => Fx.Fx<C, E3, R3>
  ): Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope>
} = dual(2, function exhaustMap<A, E, R, B, E2, R2, C, E3, R3>(
  push: Push<A, E, R, B, E2, R2>,
  f: (b: B) => Fx.Fx<C, E3, R3>
): Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope> {
  return make(
    push,
    Fx.exhaustMap(push, f)
  )
})

export const exhaustMapEffect: {
  <B, C, E3, R3>(f: (b: B) => Effect.Effect<C, E3, R3>): <A, E, R, E2, R2>(
    push: Push<A, E, R, B, E2, R2>
  ) => Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope>
  <A, E, R, B, E2, R2, C, E3, R3>(
    push: Push<A, E, R, B, E2, R2>,
    f: (b: B) => Effect.Effect<C, E3, R3>
  ): Push<A, E, R, Scope.Scope | C, E2 | E3, R2 | R3>
} = dual(2, function exhaustMapEffect<A, E, R, B, E2, R2, C, E3, R3>(
  push: Push<A, E, R, B, E2, R2>,
  f: (b: B) => Effect.Effect<C, E3, R3>
): Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope> {
  return make(
    push,
    Fx.exhaustMapEffect(push, f)
  )
})

export const exhaustLatestMap: {
  <B, C, E3, R3>(f: (b: B) => Fx.Fx<C, E3, R3>): <A, E, R, E2, R2>(
    push: Push<A, E, R, B, E2, R2>
  ) => Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope>
  <A, E, R, B, E2, R2, C, E3, R3>(
    push: Push<A, E, R, B, E2, R2>,
    f: (b: B) => Fx.Fx<C, E3, R3>
  ): Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope>
} = dual(2, function exhaustLatestMap<A, E, R, B, E2, R2, C, E3, R3>(
  push: Push<A, E, R, B, E2, R2>,
  f: (b: B) => Fx.Fx<C, E3, R3>
): Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope> {
  return make(
    push,
    Fx.exhaustLatestMap(push, f)
  )
})

export const exhaustLatestMapEffect: {
  <B, C, E3, R3>(f: (b: B) => Effect.Effect<C, E3, R3>): <A, E, R, E2, R2>(
    push: Push<A, E, R, B, E2, R2>
  ) => Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope>
  <A, E, R, B, E2, R2, C, E3, R3>(
    push: Push<A, E, R, B, E2, R2>,
    f: (b: B) => Effect.Effect<C, E3, R3>
  ): Push<A, E, R, Scope.Scope | C, E2 | E3, R2 | R3>
} = dual(2, function exhaustLatestMapEffect<A, E, R, B, E2, R2, C, E3, R3>(
  push: Push<A, E, R, B, E2, R2>,
  f: (b: B) => Effect.Effect<C, E3, R3>
): Push<A, E, R, C, E2 | E3, R2 | R3 | Scope.Scope> {
  return make(
    push,
    Fx.exhaustLatestMapEffect(push, f)
  )
})
