import * as Effect from "../../../../Effect.ts"
import type { Fx } from "../Fx.ts"
import { make } from "./make.ts"

export const suspend = <A, E, R>(fx: () => Fx<A, E, R>): Fx<A, E, R> =>
  make<A, E, R>((sink) => Effect.suspend(() => fx().run(sink)))
