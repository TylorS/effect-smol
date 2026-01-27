import * as Layer from "../../Layer.ts"
import { fromWindow } from "../navigation/fromWindow.ts"
import { initialMemory, type InitialMemoryOptions, memory, type MemoryOptions } from "../navigation/memory.ts"
import type { Navigation } from "../navigation/Navigation.ts"
import { CurrentRoute } from "./CurrentRoute.ts"

export type Router = CurrentRoute | Navigation

export const BrowserRouter = (window?: Window): Layer.Layer<Router> =>
  CurrentRoute.Default.pipe(Layer.provideMerge(fromWindow(window)))

export const ServerRouter = (options: MemoryOptions | InitialMemoryOptions): Layer.Layer<Router> =>
  CurrentRoute.Default.pipe(Layer.provideMerge("url" in options ? initialMemory(options) : memory(options)))
