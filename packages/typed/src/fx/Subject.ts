import type { Fx } from "./Fx"
import type { Sink } from "./Sink"

export interface Subject<A, E = never, R = never> extends Fx<A, E, R>, Sink<A, E, R> {}
