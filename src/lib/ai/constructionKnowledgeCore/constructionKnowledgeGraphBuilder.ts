import type {
  ConstructionEvent,
  ConstructionKnowledgeSource,
} from "./constructionKnowledgeTypes";

export type ConstructionGraphNode = {
  id: string;
  kind: "source" | "event" | "object" | "work" | "estimate_line" | "material";
  labelRu: string;
};

export type ConstructionGraphEdge = {
  from: string;
  to: string;
  relation:
    | "supports"
    | "linked_to_object"
    | "linked_to_work"
    | "linked_to_estimate"
    | "linked_to_material"
    | "has_source";
};

export type ConstructionKnowledgeGraph = {
  nodes: ConstructionGraphNode[];
  edges: ConstructionGraphEdge[];
};

function addNode(
  nodes: Map<string, ConstructionGraphNode>,
  node: ConstructionGraphNode,
): void {
  if (!nodes.has(node.id)) {
    nodes.set(node.id, node);
  }
}

export function buildConstructionKnowledgeGraph(params: {
  sources: ConstructionKnowledgeSource[];
  events?: ConstructionEvent[];
}): ConstructionKnowledgeGraph {
  const nodes = new Map<string, ConstructionGraphNode>();
  const edges: ConstructionGraphEdge[] = [];

  for (const source of params.sources) {
    addNode(nodes, { id: source.id, kind: "source", labelRu: source.labelRu });
    if (source.linkedObjectId) {
      addNode(nodes, { id: `object:${source.linkedObjectId}`, kind: "object", labelRu: source.linkedObjectId });
      edges.push({ from: source.id, to: `object:${source.linkedObjectId}`, relation: "linked_to_object" });
    }
    if (source.linkedWorkId) {
      addNode(nodes, { id: `work:${source.linkedWorkId}`, kind: "work", labelRu: source.linkedWorkId });
      edges.push({ from: source.id, to: `work:${source.linkedWorkId}`, relation: "linked_to_work" });
    }
    if (source.linkedEstimateLineId) {
      addNode(nodes, { id: `estimate:${source.linkedEstimateLineId}`, kind: "estimate_line", labelRu: source.linkedEstimateLineId });
      edges.push({ from: source.id, to: `estimate:${source.linkedEstimateLineId}`, relation: "linked_to_estimate" });
    }
    if (source.linkedMaterialId) {
      addNode(nodes, { id: `material:${source.linkedMaterialId}`, kind: "material", labelRu: source.linkedMaterialId });
      edges.push({ from: source.id, to: `material:${source.linkedMaterialId}`, relation: "linked_to_material" });
    }
  }

  for (const event of params.events ?? []) {
    addNode(nodes, { id: `event:${event.id}`, kind: "event", labelRu: event.workNameRu ?? event.objectNameRu ?? event.id });
    for (const ref of event.sourceRefs) {
      edges.push({ from: `event:${event.id}`, to: ref, relation: "has_source" });
    }
    if (event.workId) {
      addNode(nodes, { id: `work:${event.workId}`, kind: "work", labelRu: event.workNameRu ?? event.workId });
      edges.push({ from: `event:${event.id}`, to: `work:${event.workId}`, relation: "linked_to_work" });
    }
    if (event.objectId) {
      addNode(nodes, { id: `object:${event.objectId}`, kind: "object", labelRu: event.objectNameRu ?? event.objectId });
      edges.push({ from: `event:${event.id}`, to: `object:${event.objectId}`, relation: "linked_to_object" });
    }
  }

  return {
    nodes: [...nodes.values()],
    edges,
  };
}

export const constructionKnowledgeGraphBuilder = buildConstructionKnowledgeGraph;
