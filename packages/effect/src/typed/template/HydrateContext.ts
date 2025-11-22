import * as ServiceMap from "effect/ServiceMap"
import { getHydrationRoot, type HydrationNode } from "./internal/hydration.ts"

/**
 * Used Internally to pass context down to components for hydration
 * @internal
 */
export type HydrateContext = {
  readonly where: HydrationNode

  // Used to match sibling components using many() to the correct elements
  readonly manyKey?: string

  /**@internal */
  hydrate: boolean
}

/**
 * Used Internally to pass context down to components for hydration
 * @internal
 */
export const HydrateContext = ServiceMap.Service<HydrateContext>("@typed/html/HydrateContext")

/**
 * Creates a hydration context starting from a root element.
 *
 * This context allows the renderer to "attach" to existing DOM nodes (SSR output)
 * instead of creating new ones.
 *
 * @param rootElement - The root DOM element where hydration should begin.
 * @returns A `ServiceMap` containing the `HydrateContext`.
 */
export const makeHydrateContext = (rootElement: HTMLElement): ServiceMap.ServiceMap<never> => {
  try {
    const where = getHydrationRoot(rootElement)
    return HydrateContext.serviceMap({ where, hydrate: true })
  } catch {
    return ServiceMap.empty()
  }
}
