import { never as never_ } from "../../../Effect.ts"
import type { Fx } from "../Fx.ts"
import { make } from "./make.ts"

export const never: Fx<never, never, never> = make<never, never, never>(() => never_)
