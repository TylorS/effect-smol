import { void as void_ } from "../../../Effect.ts"
import type { Fx } from "../Fx.ts"
import { make } from "./make.ts"

export const empty: Fx<never, never, never> = make<never, never, never>(() => void_)
