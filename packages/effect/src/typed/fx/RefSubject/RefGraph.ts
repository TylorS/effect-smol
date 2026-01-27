/**
 * Extensions to RefSubject for working with Graph values
 * @since 1.18.0
 */

import type * as Effect from "../../../Effect.ts"
import { equals } from "../../../Equal.ts"
import { dual } from "../../../Function.ts"
import * as Graph from "../../../Graph.ts"
import * as Option from "../../../Option.ts"
import type * as Scope from "../../../Scope.ts"
import type * as Fx from "../Fx/Fx.ts"
import * as RefSubject from "./RefSubject.ts"

/**
 * A RefGraph is a RefSubject specialized over a Graph.
 * @since 1.18.0
 * @category models
 */
export interface RefGraph<in out N, in out E, T extends Graph.Kind = "directed", in out Err = never, out R = never>
  extends RefSubject.RefSubject<Graph.Graph<N, E, T>, Err, R>
{}

/**
 * Creates a new `RefGraph` from a Graph, `Effect`, or `Fx`.
 * @since 1.18.0
 * @category constructors
 */
export function make<N, E, T extends Graph.Kind, Err, R>(
  initial:
    | Graph.Graph<N, E, T>
    | Effect.Effect<Graph.Graph<N, E, T>, Err, R>
    | Fx.Fx<Graph.Graph<N, E, T>, Err, R>
): Effect.Effect<RefGraph<N, E, T, Err>, never, R | Scope.Scope> {
  return RefSubject.make(initial, { eq: equals })
}

/**
 * Creates a new empty directed RefGraph.
 * @since 1.18.0
 * @category constructors
 */
export function directed<N, E, Err, R>(): Effect.Effect<
  RefGraph<N, E, "directed", Err>,
  never,
  R | Scope.Scope
> {
  return RefSubject.make(Graph.directed<N, E>(), { eq: equals })
}

/**
 * Creates a new empty undirected RefGraph.
 * @since 1.18.0
 * @category constructors
 */
export function undirected<N, E, Err, R>(): Effect.Effect<
  RefGraph<N, E, "undirected", Err>,
  never,
  R | Scope.Scope
> {
  return RefSubject.make(Graph.undirected<N, E>(), { eq: equals })
}

// ========================================
// Combinators
// ========================================

/**
 * Add a node to the graph.
 * @since 1.18.0
 * @category combinators
 */
export const addNode: {
  <N>(
    data: N
  ): <E, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>
  ) => Effect.Effect<Graph.Graph<N, E, T>, Err, R>
  <N, E, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>,
    data: N
  ): Effect.Effect<Graph.Graph<N, E, T>, Err, R>
} = dual(2, function addNode<N, E, T extends Graph.Kind, Err, R>(ref: RefGraph<N, E, T, Err, R>, data: N) {
  return RefSubject.update(ref, (g) => {
    const mutable = Graph.beginMutation(g)
    Graph.addNode(mutable, data)
    return Graph.endMutation(mutable)
  })
})

/**
 * Remove a node from the graph.
 * @since 1.18.0
 * @category combinators
 */
export const removeNode: {
  (
    nodeIndex: Graph.NodeIndex
  ): <N, E, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>
  ) => Effect.Effect<Graph.Graph<N, E, T>, Err, R>
  <N, E, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>,
    nodeIndex: Graph.NodeIndex
  ): Effect.Effect<Graph.Graph<N, E, T>, Err, R>
} = dual(2, function removeNode<N, E, T extends Graph.Kind, Err, R>(
  ref: RefGraph<N, E, T, Err, R>,
  nodeIndex: Graph.NodeIndex
) {
  return RefSubject.update(ref, (g) => {
    const mutable = Graph.beginMutation(g)
    Graph.removeNode(mutable, nodeIndex)
    return Graph.endMutation(mutable)
  })
})

/**
 * Update a node's data.
 * @since 1.18.0
 * @category combinators
 */
export const updateNode: {
  <N>(
    nodeIndex: Graph.NodeIndex,
    f: (data: N) => N
  ): <E, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>
  ) => Effect.Effect<Graph.Graph<N, E, T>, Err, R>
  <N, E, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>,
    nodeIndex: Graph.NodeIndex,
    f: (data: N) => N
  ): Effect.Effect<Graph.Graph<N, E, T>, Err, R>
} = dual(3, function updateNode<N, E, T extends Graph.Kind, Err, R>(
  ref: RefGraph<N, E, T, Err, R>,
  nodeIndex: Graph.NodeIndex,
  f: (data: N) => N
) {
  return RefSubject.update(ref, (g) => {
    const mutable = Graph.beginMutation(g)
    Graph.updateNode(mutable, nodeIndex, f)
    return Graph.endMutation(mutable)
  })
})

/**
 * Add an edge to the graph.
 * @since 1.18.0
 * @category combinators
 */
export const addEdge: {
  <E>(
    source: Graph.NodeIndex,
    target: Graph.NodeIndex,
    data: E
  ): <N, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>
  ) => Effect.Effect<Graph.Graph<N, E, T>, Err, R>
  <N, E, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>,
    source: Graph.NodeIndex,
    target: Graph.NodeIndex,
    data: E
  ): Effect.Effect<Graph.Graph<N, E, T>, Err, R>
} = dual(4, function addEdge<N, E, T extends Graph.Kind, Err, R>(
  ref: RefGraph<N, E, T, Err, R>,
  source: Graph.NodeIndex,
  target: Graph.NodeIndex,
  data: E
) {
  return RefSubject.update(ref, (g) => {
    const mutable = Graph.beginMutation(g)
    Graph.addEdge(mutable, source, target, data)
    return Graph.endMutation(mutable)
  })
})

/**
 * Remove an edge from the graph.
 * @since 1.18.0
 * @category combinators
 */
export const removeEdge: {
  (
    edgeIndex: Graph.EdgeIndex
  ): <N, E, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>
  ) => Effect.Effect<Graph.Graph<N, E, T>, Err, R>
  <N, E, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>,
    edgeIndex: Graph.EdgeIndex
  ): Effect.Effect<Graph.Graph<N, E, T>, Err, R>
} = dual(2, function removeEdge<N, E, T extends Graph.Kind, Err, R>(
  ref: RefGraph<N, E, T, Err, R>,
  edgeIndex: Graph.EdgeIndex
) {
  return RefSubject.update(ref, (g) => {
    const mutable = Graph.beginMutation(g)
    Graph.removeEdge(mutable, edgeIndex)
    return Graph.endMutation(mutable)
  })
})

/**
 * Update an edge's data.
 * @since 1.18.0
 * @category combinators
 */
export const updateEdge: {
  <E>(
    edgeIndex: Graph.EdgeIndex,
    f: (data: E) => E
  ): <N, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>
  ) => Effect.Effect<Graph.Graph<N, E, T>, Err, R>
  <N, E, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>,
    edgeIndex: Graph.EdgeIndex,
    f: (data: E) => E
  ): Effect.Effect<Graph.Graph<N, E, T>, Err, R>
} = dual(3, function updateEdge<N, E, T extends Graph.Kind, Err, R>(
  ref: RefGraph<N, E, T, Err, R>,
  edgeIndex: Graph.EdgeIndex,
  f: (data: E) => E
) {
  return RefSubject.update(ref, (g) => {
    const mutable = Graph.beginMutation(g)
    Graph.updateEdge(mutable, edgeIndex, f)
    return Graph.endMutation(mutable)
  })
})

/**
 * Map all node data.
 * @since 1.18.0
 * @category combinators
 */
export const mapNodes: {
  <N>(
    f: (data: N) => N
  ): <E, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>
  ) => Effect.Effect<Graph.Graph<N, E, T>, Err, R>
  <N, E, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>,
    f: (data: N) => N
  ): Effect.Effect<Graph.Graph<N, E, T>, Err, R>
} = dual(2, function mapNodes<N, E, T extends Graph.Kind, Err, R>(
  ref: RefGraph<N, E, T, Err, R>,
  f: (data: N) => N
) {
  return RefSubject.update(ref, (g) => {
    const mutable = Graph.beginMutation(g)
    Graph.mapNodes(mutable, f)
    return Graph.endMutation(mutable)
  })
})

/**
 * Map all edge data.
 * @since 1.18.0
 * @category combinators
 */
export const mapEdges: {
  <E>(
    f: (data: E) => E
  ): <N, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>
  ) => Effect.Effect<Graph.Graph<N, E, T>, Err, R>
  <N, E, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>,
    f: (data: E) => E
  ): Effect.Effect<Graph.Graph<N, E, T>, Err, R>
} = dual(2, function mapEdges<N, E, T extends Graph.Kind, Err, R>(
  ref: RefGraph<N, E, T, Err, R>,
  f: (data: E) => E
) {
  return RefSubject.update(ref, (g) => {
    const mutable = Graph.beginMutation(g)
    Graph.mapEdges(mutable, f)
    return Graph.endMutation(mutable)
  })
})

/**
 * Filter nodes.
 * @since 1.18.0
 * @category combinators
 */
export const filterNodes: {
  <N>(
    predicate: (data: N) => boolean
  ): <E, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>
  ) => Effect.Effect<Graph.Graph<N, E, T>, Err, R>
  <N, E, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>,
    predicate: (data: N) => boolean
  ): Effect.Effect<Graph.Graph<N, E, T>, Err, R>
} = dual(2, function filterNodes<N, E, T extends Graph.Kind, Err, R>(
  ref: RefGraph<N, E, T, Err, R>,
  predicate: (data: N) => boolean
) {
  return RefSubject.update(ref, (g) => {
    const mutable = Graph.beginMutation(g)
    Graph.filterNodes(mutable, predicate)
    return Graph.endMutation(mutable)
  })
})

/**
 * Filter edges.
 * @since 1.18.0
 * @category combinators
 */
export const filterEdges: {
  <E>(
    predicate: (data: E) => boolean
  ): <N, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>
  ) => Effect.Effect<Graph.Graph<N, E, T>, Err, R>
  <N, E, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>,
    predicate: (data: E) => boolean
  ): Effect.Effect<Graph.Graph<N, E, T>, Err, R>
} = dual(2, function filterEdges<N, E, T extends Graph.Kind, Err, R>(
  ref: RefGraph<N, E, T, Err, R>,
  predicate: (data: E) => boolean
) {
  return RefSubject.update(ref, (g) => {
    const mutable = Graph.beginMutation(g)
    Graph.filterEdges(mutable, predicate)
    return Graph.endMutation(mutable)
  })
})

/**
 * Reverse all edge directions.
 * @since 1.18.0
 * @category combinators
 */
export const reverse = <N, E, T extends Graph.Kind, Err, R>(
  ref: RefGraph<N, E, T, Err, R>
): Effect.Effect<Graph.Graph<N, E, T>, Err, R> =>
  RefSubject.update(ref, (g) => {
    const mutable = Graph.beginMutation(g)
    Graph.reverse(mutable)
    return Graph.endMutation(mutable)
  })

// ========================================
// Computed
// ========================================

/**
 * Get the node count.
 * @since 1.18.0
 * @category computed
 */
export const nodeCount = <N, E, T extends Graph.Kind, Err, R>(
  ref: RefGraph<N, E, T, Err, R>
): RefSubject.Computed<number, Err, R> => RefSubject.map(ref, Graph.nodeCount)

/**
 * Get the edge count.
 * @since 1.18.0
 * @category computed
 */
export const edgeCount = <N, E, T extends Graph.Kind, Err, R>(
  ref: RefGraph<N, E, T, Err, R>
): RefSubject.Computed<number, Err, R> => RefSubject.map(ref, Graph.edgeCount)

/**
 * Check if a node exists.
 * @since 1.18.0
 * @category computed
 */
export const hasNode: {
  (nodeIndex: Graph.NodeIndex): <N, E, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>
  ) => RefSubject.Computed<boolean, Err, R>
  <N, E, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>,
    nodeIndex: Graph.NodeIndex
  ): RefSubject.Computed<boolean, Err, R>
} = dual(2, function hasNode<N, E, T extends Graph.Kind, Err, R>(
  ref: RefGraph<N, E, T, Err, R>,
  nodeIndex: Graph.NodeIndex
) {
  return RefSubject.map(ref, Graph.hasNode(nodeIndex))
})

/**
 * Check if an edge exists.
 * @since 1.18.0
 * @category computed
 */
export const hasEdge: {
  (
    source: Graph.NodeIndex,
    target: Graph.NodeIndex
  ): <N, E, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>
  ) => RefSubject.Computed<boolean, Err, R>
  <N, E, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>,
    source: Graph.NodeIndex,
    target: Graph.NodeIndex
  ): RefSubject.Computed<boolean, Err, R>
} = dual(3, function hasEdge<N, E, T extends Graph.Kind, Err, R>(
  ref: RefGraph<N, E, T, Err, R>,
  source: Graph.NodeIndex,
  target: Graph.NodeIndex
) {
  return RefSubject.map(ref, Graph.hasEdge(source, target))
})

/**
 * Get neighbors of a node.
 * @since 1.18.0
 * @category computed
 */
export const neighbors: {
  (nodeIndex: Graph.NodeIndex): <N, E, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>
  ) => RefSubject.Computed<Array<Graph.NodeIndex>, Err, R>
  <N, E, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>,
    nodeIndex: Graph.NodeIndex
  ): RefSubject.Computed<Array<Graph.NodeIndex>, Err, R>
} = dual(2, function neighbors<N, E, T extends Graph.Kind, Err, R>(
  ref: RefGraph<N, E, T, Err, R>,
  nodeIndex: Graph.NodeIndex
) {
  return RefSubject.map(ref, Graph.neighbors(nodeIndex))
})

/**
 * Get directed neighbors of a node.
 * @since 1.18.0
 * @category computed
 */
export const neighborsDirected: {
  (
    nodeIndex: Graph.NodeIndex,
    direction: Graph.Direction
  ): <N, E, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>
  ) => RefSubject.Computed<Array<Graph.NodeIndex>, Err, R>
  <N, E, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>,
    nodeIndex: Graph.NodeIndex,
    direction: Graph.Direction
  ): RefSubject.Computed<Array<Graph.NodeIndex>, Err, R>
} = dual(3, function neighborsDirected<N, E, T extends Graph.Kind, Err, R>(
  ref: RefGraph<N, E, T, Err, R>,
  nodeIndex: Graph.NodeIndex,
  direction: Graph.Direction
) {
  return RefSubject.map(ref, Graph.neighborsDirected(nodeIndex, direction))
})

/**
 * Check if the graph is acyclic.
 * @since 1.18.0
 * @category computed
 */
export const isAcyclic = <N, E, T extends Graph.Kind, Err, R>(
  ref: RefGraph<N, E, T, Err, R>
): RefSubject.Computed<boolean, Err, R> => RefSubject.map(ref, Graph.isAcyclic)

/**
 * Check if the graph is bipartite (undirected only).
 * @since 1.18.0
 * @category computed
 */
export const isBipartite = <N, E, Err, R>(
  ref: RefGraph<N, E, "undirected", Err, R>
): RefSubject.Computed<boolean, Err, R> => RefSubject.map(ref, Graph.isBipartite)

/**
 * Get connected components (undirected only).
 * @since 1.18.0
 * @category computed
 */
export const connectedComponents = <N, E, Err, R>(
  ref: RefGraph<N, E, "undirected", Err, R>
): RefSubject.Computed<Array<Array<Graph.NodeIndex>>, Err, R> => RefSubject.map(ref, Graph.connectedComponents)

/**
 * Get strongly connected components.
 * @since 1.18.0
 * @category computed
 */
export const stronglyConnectedComponents = <N, E, T extends Graph.Kind, Err, R>(
  ref: RefGraph<N, E, T, Err, R>
): RefSubject.Computed<Array<Array<Graph.NodeIndex>>, Err, R> => RefSubject.map(ref, Graph.stronglyConnectedComponents)

// ========================================
// Filtered
// ========================================

/**
 * Get a node's data.
 * @since 1.18.0
 * @category filtered
 */
export const getNode: {
  (nodeIndex: Graph.NodeIndex): <N, E, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>
  ) => RefSubject.Filtered<N, Err, R>
  <N, E, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>,
    nodeIndex: Graph.NodeIndex
  ): RefSubject.Filtered<N, Err, R>
} = dual(2, function getNode<N, E, T extends Graph.Kind, Err, R>(
  ref: RefGraph<N, E, T, Err, R>,
  nodeIndex: Graph.NodeIndex
) {
  return RefSubject.filterMap(ref, Graph.getNode(nodeIndex))
})

/**
 * Get an edge's data.
 * @since 1.18.0
 * @category filtered
 */
export const getEdge: {
  (edgeIndex: Graph.EdgeIndex): <N, E, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>
  ) => RefSubject.Filtered<Graph.Edge<E>, Err, R>
  <N, E, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>,
    edgeIndex: Graph.EdgeIndex
  ): RefSubject.Filtered<Graph.Edge<E>, Err, R>
} = dual(2, function getEdge<N, E, T extends Graph.Kind, Err, R>(
  ref: RefGraph<N, E, T, Err, R>,
  edgeIndex: Graph.EdgeIndex
) {
  return RefSubject.filterMap(ref, (g) => Option.fromUndefinedOr(Graph.getEdge(g, edgeIndex)))
})

/**
 * Find a node matching a predicate.
 * @since 1.18.0
 * @category filtered
 */
export const findNode: {
  <N>(
    predicate: (data: N) => boolean
  ): <E, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>
  ) => RefSubject.Filtered<Graph.NodeIndex, Err, R>
  <N, E, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>,
    predicate: (data: N) => boolean
  ): RefSubject.Filtered<Graph.NodeIndex, Err, R>
} = dual(2, function findNode<N, E, T extends Graph.Kind, Err, R>(
  ref: RefGraph<N, E, T, Err, R>,
  predicate: (data: N) => boolean
) {
  return RefSubject.filterMap(ref, (g) => Option.fromUndefinedOr(Graph.findNode(g, predicate)))
})

/**
 * Find an edge matching a predicate.
 * @since 1.18.0
 * @category filtered
 */
export const findEdge: {
  <E>(
    predicate: (edge: E) => boolean
  ): <N, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>
  ) => RefSubject.Filtered<Graph.EdgeIndex, Err, R>
  <N, E, T extends Graph.Kind, Err, R>(
    ref: RefGraph<N, E, T, Err, R>,
    predicate: (edge: E) => boolean
  ): RefSubject.Filtered<Graph.EdgeIndex, Err, R>
} = dual(2, function findEdge<N, E, T extends Graph.Kind, Err, R>(
  ref: RefGraph<N, E, T, Err, R>,
  predicate: (edge: E) => boolean
) {
  return RefSubject.filterMap(ref, (g) => Option.fromUndefinedOr(Graph.findEdge(g, predicate)))
})
