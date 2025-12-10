// import * as Record from "../../data/Record.ts"
// import { dual } from "../../Function.ts"
// import * as Schema from "../../schema/Schema.ts"
// import * as Transformation from "../../schema/Transformation.ts"

// type ValueOf<T> = T extends ReadonlyArray<any> ? T[number] : T
// type UnionToIntersection<T> = (T extends any ? (x: T) => void : never) extends (x: infer R) => void ? R : never

// export type ExtractParams<T extends Schema.Top> = UnionToIntersection<Extract<ValueOf<T["Type"]>, Record<string, any>>>

// export const literal = <const T extends string>(value: T) => Schema.Literal(value)

// export const Param = Symbol.for("@typed/router/Param")

// export type ParamModifier = "?" | "+" | "*"

// export interface Param<
//   Name extends string,
//   S extends Schema.Codec<any, string, any, any>,
//   Modifier extends ParamModifier = never
// > extends
//   Schema.Codec<
//     ExtractParams<S>,
//     string,
//     S["EncodingServices"],
//     S["DecodingServices"]
//   >
// {
//   readonly [Param]: Name
// }

// export const param: {
//   <S extends Schema.Codec<any, string, any, any>>(
//     schema: S
//   ): <const Name extends string>(
//     name: Name
//   ) => Param<Name, S>

//   <const Name extends string, S extends Schema.Codec<any, string, any, any>>(
//     name: Name,
//     schema: S
//   ): Param<Name, S>
// } = dual(2, <const Name extends string, S extends Schema.Codec<any, string, any, any>>(
//   name: Name,
//   schema: S
// ): Param<Name, S> => {
//   const { ast } = schema.pipe(
//     Schema.decodeTo(
//       Schema.Record(Schema.Literal(name), Schema.typeCodec(schema)),
//       Transformation.transform({
//         decode: (record: Record<Name, S["Type"]>) => record[name],
//         encode: (value: S["Type"]) => Record.singleton(name, value)
//       })
//     )
//   )

//   return Object.assign(out, { [Param]: name })
// })

// export const string = param(Schema.String)

// export const number = param(Schema.NumberFromString)

// export const integer = param(Schema.NumberFromString.pipe(Schema.decodeTo(Schema.Int)))

// export const bigint = param(Schema.String.pipe(Schema.decodeTo(Schema.BigInt)))

// export const boolean = param(
//   Schema.Literals(["0", "1", "true", "false"]).pipe(
//     Schema.fromJsonString,
//     Schema.decodeTo(Schema.Union([Schema.BooleanFromBit, Schema.Boolean]))
//   )
// )

// export interface Route<
//   Parser extends Schema.TemplateLiteralParser<ReadonlyArray<Schema.TemplateLiteral.Part>>,
//   E,
//   R
// > extends
//   Schema.Codec<
//     ExtractParams<Parser>,
//     string,
//     E,
//     R
//   >
// {
//   readonly parts: Parser["parts"]
// }

// export const parse = <const Parts extends Schema.TemplateLiteral.Parts>(
//   ...parts: Parts
// ): Route<Schema.TemplateLiteralParser<Parts>, never, never> => {
//   const parser = Schema.TemplateLiteralParser(parts)
// }

// export const foo = parse(
//   "/",
//   bigint("foo")
// )

// const x = Schema.decodeEffect(foo)
