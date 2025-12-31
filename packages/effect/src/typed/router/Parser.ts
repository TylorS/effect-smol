import type { Arg0, Pipe, TypeLambda, TypeLambda1 } from "hkt-core"

export type Result<Value, Rest extends string> = readonly [value: Value, rest: Rest]

export interface Parser<Output = unknown> extends TypeLambda<[input: string], Result<Output, string>> {}

export type Parse<P extends Parser<unknown>, Input extends string> = Pipe<Input, P>

type IsStringLiteral<T extends string> = string extends T ? false : true

type StrictEquals<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false

type IsNoProgress<Input extends string, Rest extends string> = IsStringLiteral<Input> extends true
  ? StrictEquals<Input, Rest>
  : false

export declare namespace Parser {
  export type Any = Parser<unknown>

  export type Run<P extends Any, Input extends string> = Pipe<Input, P>

  export interface Succeed<A> extends TypeLambda<[input: string], Result<A, string>> {
    readonly return: Arg0<this> extends infer Input extends string ? readonly [A, Input] : never
  }

  export interface Fail extends TypeLambda<[input: string], never> {
    readonly return: never
  }

  export interface Char<C extends string> extends TypeLambda<[input: string], Result<C, string> | never> {
    readonly return: Arg0<this> extends `${C}${infer Rest}` ? readonly [C, Rest] : never
  }

  export interface String<S extends string> extends TypeLambda<[input: string], Result<S, string> | never> {
    readonly return: Arg0<this> extends `${S}${infer Rest}` ? readonly [S, Rest] : never
  }

  export type LowercaseAlphabet =
    | "a"
    | "b"
    | "c"
    | "d"
    | "e"
    | "f"
    | "g"
    | "h"
    | "i"
    | "j"
    | "k"
    | "l"
    | "m"
    | "n"
    | "o"
    | "p"
    | "q"
    | "r"
    | "s"
    | "t"
    | "u"
    | "v"
    | "w"
    | "x"
    | "y"
    | "z"

  export type UppercaseAlphabet =
    | "A"
    | "B"
    | "C"
    | "D"
    | "E"
    | "F"
    | "G"
    | "H"
    | "I"
    | "J"
    | "K"
    | "L"
    | "M"
    | "N"
    | "O"
    | "P"
    | "Q"
    | "R"
    | "S"
    | "T"
    | "U"
    | "V"
    | "W"
    | "X"
    | "Y"
    | "Z"

  export type Alphabet = LowercaseAlphabet | UppercaseAlphabet

  export type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"

  export type AlphaNumeric = Alphabet | Digit

  type TakeWhileInternal<
    Input extends string,
    Allowed extends string,
    Acc extends string = ""
  > = Input extends `${infer Head}${infer Tail}`
    ? Head extends Allowed ? TakeWhileInternal<Tail, Allowed, `${Acc}${Head}`>
    : readonly [Acc, Input]
    : readonly [Acc, Input]

  type TakeWhile1Internal<Input extends string, Allowed extends string> = TakeWhileInternal<Input, Allowed> extends
    readonly [infer Taken extends string, infer Rest extends string] ? Taken extends "" ? never : readonly [Taken, Rest]
    : never

  export interface TakeWhile<Allowed extends string> extends TypeLambda<[input: string], Result<string, string>> {
    readonly return: Arg0<this> extends infer Input extends string ? TakeWhileInternal<Input, Allowed> : never
  }

  export interface TakeWhile1<Allowed extends string>
    extends TypeLambda<[input: string], Result<string, string> | never>
  {
    readonly return: Arg0<this> extends infer Input extends string ? TakeWhile1Internal<Input, Allowed> : never
  }

  export interface Map<P extends Any, F extends TypeLambda1> extends Parser<unknown> {
    readonly return: Arg0<this> extends infer Input extends string
      ? Pipe<Input, P> extends infer R ? [R] extends [never] ? never
        : R extends readonly [infer Value, infer Rest extends string] ? readonly [Pipe<Value, F>, Rest]
        : never
      : never
      : never
  }

  export interface FlatMap<P extends Any, F extends TypeLambda1> extends Parser<unknown> {
    readonly return: Arg0<this> extends infer Input extends string
      ? Pipe<Input, P> extends infer R ? [R] extends [never] ? never
        : R extends readonly [infer Value, infer Rest extends string]
          ? Pipe<Value, F> extends infer Next ? [Next] extends [never] ? never
            : Next extends Any ? Pipe<Rest, Next>
            : never
          : never
        : never
      : never
      : never
  }

  export interface Zip<P extends Any, Q extends Any> extends Parser<unknown> {
    readonly return: Arg0<this> extends infer Input extends string
      ? Pipe<Input, P> extends infer R1 ? [R1] extends [never] ? never
        : R1 extends readonly [infer Value1, infer Rest1 extends string]
          ? Pipe<Rest1, Q> extends infer R2 ? [R2] extends [never] ? never
            : R2 extends readonly [infer Value2, infer Rest2 extends string] ?
              readonly [readonly [Value1, Value2], Rest2]
            : never
          : never
        : never
      : never
      : never
  }

  export interface OrElse<P extends Any, Q extends Any> extends Parser<unknown> {
    readonly return: Arg0<this> extends infer Input extends string
      ? Pipe<Input, P> extends infer R ? [R] extends [never] ? Pipe<Input, Q>
        : R extends readonly [infer Value, infer Rest extends string] ? readonly [Value, Rest]
        : never
      : never
      : never
  }

  export interface Optional<P extends Any> extends Parser<unknown> {
    readonly return: Arg0<this> extends infer Input extends string
      ? Pipe<Input, P> extends infer R ? [R] extends [never] ? readonly [undefined, Input]
        : R extends readonly [infer Value, infer Rest extends string] ? readonly [Value, Rest]
        : never
      : never
      : never
  }

  type ManyInternal<
    P extends Any,
    Input extends string,
    Acc extends ReadonlyArray<unknown> = readonly []
  > = Pipe<Input, P> extends infer R ? [R] extends [never] ? readonly [Acc, Input]
    : R extends readonly [infer Value, infer Rest extends string]
      ? IsNoProgress<Input, Rest> extends true ? never : ManyInternal<P, Rest, readonly [...Acc, Value]>
    : never
    : never

  type Many1Internal<P extends Any, Input extends string> = Pipe<Input, P> extends infer R ? [R] extends [never] ? never
    : R extends readonly [infer Value, infer Rest extends string]
      ? IsNoProgress<Input, Rest> extends true ? never : ManyInternal<P, Rest, readonly [Value]>
    : never
    : never

  export interface Many<P extends Any> extends Parser<unknown> {
    readonly return: Arg0<this> extends infer Input extends string ? ManyInternal<P, Input> : never
  }

  export interface Many1<P extends Any> extends Parser<unknown> {
    readonly return: Arg0<this> extends infer Input extends string ? Many1Internal<P, Input> : never
  }

  export interface MapTo<F extends TypeLambda1> extends TypeLambda1 {
    readonly return: Arg0<this> extends infer P extends Any ? Map<P, F> : never
  }

  export interface FlatMapTo<F extends TypeLambda1> extends TypeLambda1 {
    readonly return: Arg0<this> extends infer P extends Any ? FlatMap<P, F> : never
  }

  export interface ZipWith<Q extends Any> extends TypeLambda1 {
    readonly return: Arg0<this> extends infer P extends Any ? Zip<P, Q> : never
  }

  export interface OrElseWith<Q extends Any> extends TypeLambda1 {
    readonly return: Arg0<this> extends infer P extends Any ? OrElse<P, Q> : never
  }

  export interface OptionalOf extends TypeLambda1 {
    readonly return: Arg0<this> extends infer P extends Any ? Optional<P> : never
  }

  export interface ManyOf extends TypeLambda1 {
    readonly return: Arg0<this> extends infer P extends Any ? Many<P> : never
  }

  export interface Many1Of extends TypeLambda1 {
    readonly return: Arg0<this> extends infer P extends Any ? Many1<P> : never
  }
}
