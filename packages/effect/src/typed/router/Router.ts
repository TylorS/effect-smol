import * as Effect from "../../Effect.ts"
import * as Layer from "../../Layer.ts"
import { fromWindow } from "../navigation/fromWindow.ts"
import { initialMemory, type InitialMemoryOptions, memory, type MemoryOptions } from "../navigation/memory.ts"
import { Navigation } from "../navigation/Navigation.ts"
import { CurrentRoute } from "./CurrentRoute.ts"

const BaseRoute = Layer.unwrap(Effect.gen(function*() {
  const navigation = yield* Navigation
  return CurrentRoute.Default(navigation.base)
}))

export type Router = CurrentRoute | Navigation

export const BrowserRouter = (window?: Window) =>
  BaseRoute.pipe(
    Layer.provideMerge(fromWindow(window))
  )

export const ServerRouter = (options: MemoryOptions | InitialMemoryOptions) =>
  BaseRoute.pipe(
    Layer.provideMerge("url" in options ? initialMemory(options) : memory(options))
  )
