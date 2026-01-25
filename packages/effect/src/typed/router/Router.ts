import { Effect } from "../../index.ts"
import * as Layer from "../../Layer.ts"
import { fromWindow } from "../navigation/fromWindow.ts"
import { initialMemory, memory, type InitialMemoryOptions, type MemoryOptions } from "../navigation/memory.ts"
import { Navigation } from "../navigation/Navigation.ts"
import { CurrentRoute } from "./CurrentRoute.ts"
import * as Route from "./Route.ts"

const BaseRoute = Layer.effect(
  CurrentRoute,
  Effect.gen(function* () {
    const navigation = yield* Navigation
    return CurrentRoute.of({
      route: Route.Parse(navigation.base),
      parent: null,
    })
  })
)

export type Router = CurrentRoute | Navigation

export const BrowserRouter = (window: Window) => BaseRoute.pipe(
  Layer.provideMerge(fromWindow(window))
)

export const ServerRouter = (options: MemoryOptions | InitialMemoryOptions) =>
  BaseRoute.pipe(
    Layer.provideMerge('url' in options ? initialMemory(options) : memory(options))
  )
