import * as Effect from "../../../../Effect.js"
import type { SpanOptionsNoTrace } from "../../../../Tracer.ts"
import type { unassigned } from "../../../../Types.ts"
import { unwrap } from "../combinators/unwrap.ts"
import type { Fx } from "../Fx.ts"
import { isFx } from "../TypeId.ts"

/**
 * @since 1.0.0
 * @category function
 */
export namespace fn {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Gen = {
    <Eff extends Effect.Yieldable<any, any, any, any>, ReturnFx extends Fx.Any, Args extends Array<any>>(
      body: (this: unassigned, ...args: Args) => Generator<Eff, ReturnFx>
    ): (...args: Args) => Fx<
      Fx.Success<ReturnFx>,
      Fx.Error<ReturnFx> | Effect.Yieldable.Error<Eff>,
      Fx.Services<ReturnFx> | Effect.Yieldable.Services<Eff>
    >
    <Self, Eff extends Effect.Yieldable<any, any, any, any>, ReturnFx extends Fx.Any, Args extends Array<any>>(
      body: (this: Self, ...args: Args) => Generator<Eff, ReturnFx>
    ): (
      this: Self,
      ...args: Args
    ) => Fx<
      Fx.Success<ReturnFx>,
      Fx.Error<ReturnFx> | Effect.Yieldable.Error<Eff>,
      Fx.Services<ReturnFx> | Effect.Yieldable.Services<Eff>
    >

    <Eff extends Effect.Yieldable<any, any, any, any>, ReturnFx extends Fx.Any, Args extends Array<any>, A>(
      body: (this: unassigned, ...args: Args) => Generator<Eff, ReturnFx>,
      a: (
        _: Fx<
          Fx.Success<ReturnFx>,
          Fx.Error<ReturnFx> | Effect.Yieldable.Error<Eff>,
          Fx.Services<ReturnFx> | Effect.Yieldable.Services<Eff>
        >,
        ...args: Args
      ) => A
    ): (...args: Args) => A
    <Self, Eff extends Effect.Yieldable<any, any, any, any>, ReturnFx extends Fx.Any, Args extends Array<any>, A>(
      body: (this: Self, ...args: Args) => Generator<Eff, ReturnFx>,
      a: (
        _: Fx<
          Fx.Success<ReturnFx>,
          Fx.Error<ReturnFx> | Effect.Yieldable.Error<Eff>,
          Fx.Services<ReturnFx> | Effect.Yieldable.Services<Eff>
        >,
        ...args: Args
      ) => A
    ): (this: Self, ...args: Args) => A

    <Eff extends Effect.Yieldable<any, any, any, any>, ReturnFx extends Fx.Any, Args extends Array<any>, A, B>(
      body: (this: unassigned, ...args: Args) => Generator<Eff, ReturnFx>,
      a: (
        _: Fx<
          Fx.Success<ReturnFx>,
          Fx.Error<ReturnFx> | Effect.Yieldable.Error<Eff>,
          Fx.Services<ReturnFx> | Effect.Yieldable.Services<Eff>
        >,
        ...args: Args
      ) => A,
      b: (_: A, ...args: Args) => B
    ): (...args: Args) => B
    <Self, Eff extends Effect.Yieldable<any, any, any, any>, ReturnFx extends Fx.Any, Args extends Array<any>, A, B>(
      body: (this: Self, ...args: Args) => Generator<Eff, ReturnFx>,
      a: (
        _: Fx<
          Fx.Success<ReturnFx>,
          Fx.Error<ReturnFx> | Effect.Yieldable.Error<Eff>,
          Fx.Services<ReturnFx> | Effect.Yieldable.Services<Eff>
        >,
        ...args: Args
      ) => A,
      b: (_: A, ...args: Args) => B
    ): (this: Self, ...args: Args) => B

    <Eff extends Effect.Yieldable<any, any, any, any>, ReturnFx extends Fx.Any, Args extends Array<any>, A, B, C>(
      body: (this: unassigned, ...args: Args) => Generator<Eff, ReturnFx>,
      a: (
        _: Fx<
          Fx.Success<ReturnFx>,
          Fx.Error<ReturnFx> | Effect.Yieldable.Error<Eff>,
          Fx.Services<ReturnFx> | Effect.Yieldable.Services<Eff>
        >,
        ...args: Args
      ) => A,
      b: (_: A, ...args: Args) => B,
      c: (_: B, ...args: Args) => C
    ): (...args: Args) => C
    <
      Self,
      Eff extends Effect.Yieldable<any, any, any, any>,
      ReturnFx extends Fx.Any,
      Args extends Array<any>,
      A,
      B,
      C
    >(
      body: (this: Self, ...args: Args) => Generator<Eff, ReturnFx>,
      a: (
        _: Fx<
          Fx.Success<ReturnFx>,
          Fx.Error<ReturnFx> | Effect.Yieldable.Error<Eff>,
          Fx.Services<ReturnFx> | Effect.Yieldable.Services<Eff>
        >,
        ...args: Args
      ) => A,
      b: (_: A, ...args: Args) => B,
      c: (_: B, ...args: Args) => C
    ): (this: Self, ...args: Args) => C
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type NonGen = {
    <Args extends Array<any>, ReturnFx extends Fx.Any>(
      body: (this: unassigned, ...args: Args) => ReturnFx
    ): (...args: Args) => ReturnFx
    <Self, Args extends Array<any>, ReturnFx extends Fx.Any>(
      body: (this: Self, ...args: Args) => ReturnFx
    ): (this: Self, ...args: Args) => ReturnFx

    <Args extends Array<any>, ReturnFx extends Fx.Any, A>(
      body: (this: unassigned, ...args: Args) => ReturnFx,
      a: (_: ReturnFx, ...args: Args) => A
    ): (...args: Args) => A
    <Self, Args extends Array<any>, ReturnFx extends Fx.Any, A>(
      body: (this: Self, ...args: Args) => ReturnFx,
      a: (_: ReturnFx, ...args: Args) => A
    ): (this: Self, ...args: Args) => A

    <Args extends Array<any>, ReturnFx extends Fx.Any, A, B>(
      body: (this: unassigned, ...args: Args) => ReturnFx,
      a: (_: ReturnFx, ...args: Args) => A,
      b: (_: A, ...args: Args) => B
    ): (...args: Args) => B
    <Self, Args extends Array<any>, ReturnFx extends Fx.Any, A, B>(
      body: (this: Self, ...args: Args) => ReturnFx,
      a: (_: ReturnFx, ...args: Args) => A,
      b: (_: A, ...args: Args) => B
    ): (this: Self, ...args: Args) => B

    <Args extends Array<any>, ReturnFx extends Fx.Any, A, B, C>(
      body: (this: unassigned, ...args: Args) => ReturnFx,
      a: (_: ReturnFx, ...args: Args) => A,
      b: (_: A, ...args: Args) => B,
      c: (_: B, ...args: Args) => C
    ): (...args: Args) => C
    <Self, Args extends Array<any>, ReturnFx extends Fx.Any, A, B, C>(
      body: (this: Self, ...args: Args) => ReturnFx,
      a: (_: ReturnFx, ...args: Args) => A,
      b: (_: A, ...args: Args) => B,
      c: (_: B, ...args: Args) => C
    ): (this: Self, ...args: Args) => C
  }
}

export const fn: fn.Gen & fn.NonGen & {
  (name: string, options?: SpanOptionsNoTrace): fn.Gen & fn.NonGen
} = function(...args: Array<any>): any {
  const [name, options] = args

  type Gen = Generator<Effect.Yieldable<any, any, any, any>, Fx.Any>

  if (typeof name === "string") {
    const fn_ = Effect.fn(name, options)
    return (body: any, ...pipeables: Array<Function>) => {
      return fn_(
        function() {
          const x = body.apply(this, arguments)
          if (isFx(x)) return Effect.succeed(x)
          return x as Gen
        },
        unwrap,
        // @ts-expect-error - It's fine to be variadic
        ...pipeables
      )
    }
  }

  const [body, ...pipeables] = args
  return Effect.fn(
    function() {
      const x = body.apply(this, arguments)
      if (isFx(x)) return Effect.succeed(x)
      return x
    },
    unwrap,
    // @ts-expect-error - It's fine to be variadic
    ...pipeables
  )
}
