import * as Schema from "../../Schema.ts"

export const ProposedDestination = Schema.Struct({
  url: Schema.URLFromString,
  state: Schema.Unknown,
  sameDocument: Schema.Boolean,
  key: Schema.optional(Schema.String)
})
export type ProposedDestination = typeof ProposedDestination.Type

export const Destination = Schema.Struct({
  ...ProposedDestination.fields,
  id: Schema.String,
  key: Schema.String
})
export type Destination = typeof Destination.Type

export const NavigationType = Schema.Union([
  Schema.Literal("push"),
  Schema.Literal("replace"),
  Schema.Literal("reload"),
  Schema.Literal("traverse")
])
export type NavigationType = typeof NavigationType.Type

export const Transition = Schema.Struct({
  type: NavigationType,
  from: Destination,
  to: ProposedDestination,
  info: Schema.optional(Schema.Unknown)
})
export type Transition = typeof Transition.Type

export const BeforeNavigationEvent = Schema.Struct({
  type: NavigationType,
  from: Destination,
  delta: Schema.Number,
  to: ProposedDestination,
  info: Schema.Unknown
})
export type BeforeNavigationEvent = typeof BeforeNavigationEvent.Type

export const NavigationEvent = Schema.Struct({
  type: NavigationType,
  destination: Destination,
  info: Schema.Unknown
})
export type NavigationEvent = typeof NavigationEvent.Type

export class NavigationError extends Schema.ErrorClass(`@typed/navigation/NavigationError`)({
  _tag: Schema.tag("NavigationError"),
  error: Schema.Unknown
}) {}

export class RedirectError extends Schema.ErrorClass(`@typed/navigation/RedirectError`)({
  _tag: Schema.tag("RedirectError"),
  url: Schema.Union([Schema.URLFromString, Schema.String]),
  options: Schema.optional(Schema.Struct({
    state: Schema.optional(Schema.Unknown),
    info: Schema.optional(Schema.Unknown)
  }))
}) {}

export class CancelNavigation extends Schema.ErrorClass(`@typed/navigation/CancelNavigation`)({
  _tag: Schema.tag("CancelNavigation")
}) {}
