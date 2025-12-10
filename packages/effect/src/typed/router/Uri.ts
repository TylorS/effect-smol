import type { Arg0, Call1W, Identity, Pipe, TypeLambda, TypeLambda1 } from "hkt-core"

/**
 * @since 1.0.0
 */
export type ParseUri<Input extends string, BaseUri extends string = never> = Pipe<
  Input,
  ParseUriLambda,
  [BaseUri] extends [never] ? Identity : ApplyBaseUriLambda<ParseUri<BaseUri>>
> extends infer R ? Uri<
    GetUriKey<R, "protocol">,
    GetUriKey<R, "username">,
    GetUriKey<R, "password">,
    GetUriKey<R, "hostname">,
    GetUriKey<R, "port">,
    GetUriKey<R, "pathname">,
    GetUriKey<R, "query">,
    GetUriKey<R, "hash">
  > :
  never

/**
 * @since 1.0.0
 */
export interface Uri<
  Protocol extends string = string,
  Username extends string = "",
  Password extends string = "",
  Hostname extends string = string,
  Port extends number | "" = "",
  Pathname extends string = "/",
  Query extends string = "",
  Hash extends string = ""
> {
  readonly protocol: Protocol
  readonly username: Username
  readonly password: Password
  readonly hostname: Hostname
  readonly port: Port
  readonly pathname: Pathname
  readonly query: Query
  readonly hash: Hash
}

/**
 * @since 1.0.0
 */
export declare namespace Uri {
  export type Any = Uri<string, string, string, string, number | "", string, string, string>
}

/**
 * @since 1.0.0
 */
export type FormatUri<Uri extends Uri.Any, BaseUri extends string = never> = Call1W<
  FormatUrlLambda,
  [BaseUri] extends [never] ? Uri : Call1W<ApplyBaseUriLambda<ParseUri<BaseUri>>, Uri>
>

// Internal

interface FormatUrlLambda extends TypeLambda1 {
  readonly return: Arg0<this> extends infer Uri extends Uri.Any ? StringJoin<[
      FormatProtocol<Uri["protocol"]>,
      FormatAuthentication<Uri["username"], Uri["password"]>,
      FormatHostname<Uri["hostname"]>,
      FormatPort<Uri["port"]>,
      FormatPathname<Uri["pathname"]>,
      FormatQuery<Uri["query"]>,
      FormatHash<Uri["hash"]>
    ]> :
    never
}

type IfNotEmpty<T, Then> = IsEmpty<T> extends 1 ? "" : Then

type FormatProtocol<Protocol extends string> = IfNotEmpty<
  Protocol,
  EnsureEndsWithDoubleSlash<EnsureEndsWithColon<Protocol>>
>

type EnsureEndsWithColon<T extends string> = `${T extends `${infer Rest}:` ? Rest : T}:`
type EnsureEndsWithDoubleSlash<T extends string> = T extends `${infer Rest}//` ? Rest
  : T extends `${infer Rest}/` ? `${Rest}//`
  : `${T}//`

type FormatAuthentication<Username extends string, Password extends string> = {
  0: `${Username}:${Password}@`
  1: ""
}[IsEmpty<Username> & IsEmpty<Password>]

type FormatHostname<Hostname extends string> = IfNotEmpty<Hostname, Hostname>

type FormatPort<Port extends number | ""> = IfNotEmpty<Port, EnsureStartsWithColon<`${Port}`>>

type EnsureStartsWithColon<T extends string> = T extends `:${infer _}` ? T : `:${T}`

type FormatPathname<Pathname extends string> = IfNotEmpty<Pathname, EnsureStartsWithSlash<`${Pathname}`>>

type EnsureStartsWithSlash<T extends string> = T extends `/${infer _}` ? T : `/${T}`

type FormatQuery<Query extends string> = IfNotEmpty<Query, EnsureStartsWithQuestionMark<`${Query}`>>

type EnsureStartsWithQuestionMark<T extends string> = T extends `?${infer _}` ? T : `?${T}`

type FormatHash<Hash extends string> = IfNotEmpty<Hash, EnsureStartsWithHash<`${Hash}`>>

type EnsureStartsWithHash<T extends string> = T extends `#${infer _}` ? T : `#${T}`

type IsEmpty<T> = [T] extends [""] ? 1 :
  [T] extends [never] ? 1
  : 0

type GetUriKey<UriLike, Key extends keyof Uri> = Key extends keyof UriLike
  ? UriLike[Key] extends Uri.Any[Key] ? UriLike[Key] : Uri[Key]
  : Uri[Key]

interface ParseUriLambda extends TypeLambda<[uri: string], Uri> {
  return: Arg0<this> extends infer R ? Pipe<
      [{}, R],
      UriParserReducerLambda<ParseHashLambda>,
      UriParserReducerLambda<ParseQueryLambda>,
      UriParserReducerLambda<ParseProtocolLambda>,
      UriParserReducerLambda<ParseAuthenticationLambda>,
      UriParserReducerLambda<ParsePathnamePortPathnameLambda>
    > extends readonly [infer Result, infer Remaining extends string] ? Remaining extends "" ? Result
      : `Failed to parse URI: ${Arg0<this>}` :
    never
    : never
}

interface UriParserReducerLambda<F extends TypeLambda> extends TypeLambda {
  return: Arg0<this> extends readonly [infer State, infer Input extends string] ? Pipe<
      Input,
      F
    > extends readonly [infer NextState, infer Remaining extends string] ? [NextState & State, Remaining] :
    never :
    never
}

interface ParseProtocolLambda extends TypeLambda {
  readonly return: Arg0<this> extends `${infer Protocol}//${infer Rest}` ? [{ readonly protocol: Protocol }, Rest]
    : [unknown, Arg0<this>]
}

interface ParseHashLambda extends TypeLambda {
  readonly return: Arg0<this> extends `${infer Rest}#${infer Hash}` ? [{ readonly hash: Hash }, Rest]
    : [unknown, Arg0<this>]
}

interface ParseQueryLambda extends TypeLambda {
  readonly return: Arg0<this> extends `${infer Rest}?${infer Query}` ? [{ readonly query: Query }, Rest]
    : [unknown, Arg0<this>]
}

interface ParseAuthenticationLambda extends TypeLambda {
  readonly return: Arg0<this> extends `${infer Username}:${infer Password}@${infer Rest}`
    ? [{ readonly username: Username; readonly password: Password }, Rest]
    : [unknown, Arg0<this>]
}

interface ParsePathnamePortPathnameLambda extends TypeLambda {
  readonly return: Arg0<this> extends `${infer Hostname}:${infer Port extends number}/${infer Pathname}`
    ? [{ readonly hostname: Hostname; readonly port: Port; readonly pathname: Pathname }, ""]
    : Arg0<this> extends `${infer Hostname}:${infer Port extends number}` ?
      [{ readonly hostname: Hostname; readonly port: Port }, ""]
    : Arg0<this> extends `${infer Hostname}/${infer Pathname}` ?
      "" extends Hostname ? [{ readonly pathname: Pathname }, ""]
      : [{ readonly hostname: Hostname; readonly pathname: Pathname }, ""]
    : Arg0<this> extends `${infer Hostname}` ? [{ readonly hostname: Hostname }, ""]
    : [unknown, Arg0<this>]
}

interface ApplyBaseUriLambda<BaseUri extends Uri.Any> extends TypeLambda1<Uri.Any, Uri.Any> {
  readonly return: Arg0<this> extends infer R extends Uri.Any ? Uri<
      GetUriKey<BaseUri, "protocol">,
      GetUriKey<BaseUri, "username">,
      GetUriKey<BaseUri, "password">,
      GetUriKey<BaseUri, "hostname">,
      GetUriKey<BaseUri, "port">,
      GetUriKey<R, "pathname">,
      GetUriKey<R, "query">,
      GetUriKey<R, "hash">
    > :
    never
}

type StringJoin<Input extends ReadonlyArray<string>, R extends string = ""> = Input extends
  readonly [infer A extends string, ...infer Rest extends ReadonlyArray<string>] ? StringJoin<Rest, `${R}${A}`> : R
