export type Parameter<Name extends string, IsOptional extends boolean = false> = IsOptional extends true ? `${Name}?`
  : `:${Name}`

export type ParameterWithRegex<Name extends string, RegexSource extends string> = `${Parameter<Name>}(${RegexSource})`

export type Wildcard = "*"

export type QueryParameters<Params extends string> = `?${Params}`

export type PathJoin<Parts extends ReadonlyArray<string>> = Parts extends
  readonly [infer Head extends string, ...infer Tail extends ReadonlyArray<string>] ?
  RemoveDoubleSlashes<`/${Head}${PathJoin<Tail>}`>
  : "/"

type StripLeadingSlash<T extends string> = T extends `/${infer Rest}` ? StripLeadingSlash<Rest> : T
type StripTrailingSlash<T extends string> = T extends `${infer Rest}/` ? StripTrailingSlash<Rest> : T
type RemoveDoubleSlashes<T extends string> = T extends `${infer Prefix}//${infer Suffix}`
  ? `${RemoveDoubleSlashes<Prefix>}/${RemoveDoubleSlashes<Suffix>}`
  : T

type StripSlashes<T extends string> = StripLeadingSlash<StripTrailingSlash<RemoveDoubleSlashes<T>>>

type SeparatedBySlashes<T extends string> = T extends `${infer Prefix}/${infer Suffix}`
  ? [Prefix, ...SeparatedBySlashes<Suffix>]
  : [T] extends [infer Head] ? [Head]
  : ""

export type ParsePath<Path extends string> = ParsePathChunks<SeparatedBySlashes<StripSlashes<Path>>>

type ParsePathChunks<Chunks extends ReadonlyArray<string>> = Chunks extends
  readonly [infer Head extends string, ...infer Tail extends ReadonlyArray<string>] ?
  readonly [ParsePathChunk<Head>, ...ParsePathChunks<Tail>]
  : readonly []

type LowercaseAlphabet =
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
type UppercaseAlphabet =
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
type Alphabet = LowercaseAlphabet | UppercaseAlphabet

type Digits = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
type AlphaNumeric = Alphabet | Digits

type ParsePathChunk<Chunk extends string> = "" extends Chunk ? [] :
  Chunk extends Parameter<infer Name, true> ? ParseOptionalParameter<Name> :
  Chunk extends Parameter<infer Name, false> ? ParseParameter<Name> :
  Chunk extends ParameterWithRegex<infer Name, infer Regex> ? ParseParameterWithRegex<Name, Regex> :
  Chunk extends `${infer Prefix}${Wildcard}${infer Suffix}` ?
    [...ParsePathChunk<Prefix>, { type: "wildcard" }, ...ParsePathChunk<Suffix>] :
  Chunk extends `${infer Prefix}:${infer Suffix}` ? [...ParsePathChunk<Prefix>, ...ParsePathChunk<`:${Suffix}`>] :
  [{ type: "literal"; value: Chunk }]

type ParseOptionalParameter<Name extends string> = TakeWhileAlphanumeric<Name> extends
  [infer Prefix extends string, infer Suffix extends string]
  ? Suffix extends `?${infer Rest}` ? [{ type: "parameter"; name: Prefix; isOptional: true }, ...ParsePathChunk<Rest>]
  : [{ type: "parameter"; name: Prefix; isOptional: true }, ...ParsePathChunk<Suffix>]
  : [{ type: "parameter"; name: Name; isOptional: true }]

type ParseParameter<Name extends string> = TakeWhileAlphanumeric<Name> extends
  [infer Prefix extends string, infer Suffix extends string]
  ? Suffix extends `?${infer Rest}` ? [{ type: "parameter"; name: Prefix; isOptional: true }, ...ParsePathChunk<Rest>]
  : [{ type: "parameter"; name: Prefix; isOptional: false }, ...ParsePathChunk<Suffix>]
  : [{ type: "parameter"; name: Name; isOptional: false }]

type ParseParameterWithRegex<Name extends string, Regex extends string> = TakeWhileAlphanumeric<Name> extends
  [infer Prefix extends string, infer Suffix extends string]
  ? [{ type: "parameter"; name: Prefix; regex: Regex }, ...ParsePathChunk<Suffix>]
  : [{ type: "parameter"; name: Name; regex: Regex }]

type TakeWhile<T extends string, U extends string, Acc extends string = ""> = T extends `${infer Head}${infer Tail}` ?
  Head extends U ? TakeWhile<Tail, U, `${Acc}${Head}`> : [Acc, T]
  : [Acc, T]

type TakeWhileAlphanumeric<T extends string> = TakeWhile<T, AlphaNumeric>

type StringJoin<Input extends ReadonlyArray<string>, R extends string = ""> = Input extends
  readonly [infer A extends string, ...infer Rest extends ReadonlyArray<string>] ? StringJoin<Rest, `${R}${A}`> : R

type PrintAst<T extends ReadonlyArray<any>> = T extends
  readonly [infer Head extends ReadonlyArray<any>, ...infer Tail] ?
  `/${StringJoin<{ [K in keyof Head]: PrintAstPart<Head[K]> }>}${PrintAst<Tail>}` :
  ""

type PrintAstPart<T> = T extends { type: "literal"; value: infer Value extends string } ? Value :
  T extends { type: "parameter"; name: infer Name extends string; isOptional: infer IsOptional extends boolean } ?
    `:${Name}${IsOptional extends true ? "?" : ""}` :
  T extends { type: "parameter"; name: infer Name extends string; regex: infer Regex extends string } ?
    `:${Name}(${Regex})` :
  T extends { type: "wildcard" } ? "*" :
  never
