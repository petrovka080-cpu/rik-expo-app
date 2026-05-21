import {
  buildAiDocumentGraphNodes,
  type AiDocumentGraphInput,
} from "./aiDocumentGraphProvider";
import {
  buildAiExternalSourceRefs,
  convertExternalSourceToAiSourceRef,
} from "./aiExternalSourceRefProvider";
import {
  buildAiFieldGraphNodes,
  type AiFieldGraphInput,
} from "./aiFieldGraphProvider";
import {
  buildAiFinanceGraphNodes,
  type AiFinanceGraphInput,
} from "./aiFinanceGraphProvider";
import {
  buildAiMarketplaceGraphNodes,
  type AiMarketplaceGraphInput,
} from "./aiMarketplaceGraphProvider";
import { resolveAiSourceRefForRole, type AiContextGraphRole } from "./aiPermissionAwareLinkResolver";
import {
  buildAiProcurementGraphNodes,
  type AiProcurementGraphInput,
} from "./aiProcurementGraphProvider";
import {
  buildAiWarehouseGraphNodes,
  type AiWarehouseGraphInput,
} from "./aiWarehouseGraphProvider";
import {
  createAiContextGraphNode,
  createUnresolvedAiSourceRef,
  uniqueAiSourceRefs,
  type AiContextGraphBuildResult,
  type AiContextGraphEntityInput,
  type AiContextGraphNode,
  type AiExternalSourceRef,
} from "./aiSourceRef";

export type AiAppContextGraphBuildInput = {
  role: AiContextGraphRole;
  screenId: string;
  entities?: AiContextGraphEntityInput[];
  procurement?: AiProcurementGraphInput;
  warehouse?: AiWarehouseGraphInput;
  finance?: AiFinanceGraphInput;
  field?: AiFieldGraphInput;
  documents?: AiDocumentGraphInput;
  marketplace?: AiMarketplaceGraphInput;
  externalSources?: AiExternalSourceRef[];
};

function buildGenericEntityNodes(
  entities: readonly AiContextGraphEntityInput[] | undefined,
  role: AiContextGraphRole,
): AiContextGraphNode[] {
  return (entities ?? []).map((entity) => {
    const ref = resolveAiSourceRefForRole(
      createUnresolvedAiSourceRef(entity),
      role,
      entity.routeParams,
    );
    return createAiContextGraphNode(entity, ref);
  });
}

function mergeUniqueNodes(nodes: readonly AiContextGraphNode[]): AiContextGraphNode[] {
  const byId = new Map<string, AiContextGraphNode>();

  for (const node of nodes) {
    const existing = byId.get(node.ref.id);
    if (!existing) {
      byId.set(node.ref.id, node);
      continue;
    }

    const factKeys = new Set(existing.facts.map((fact) => `${fact.key}:${fact.valueRu}:${fact.sourceRefId}`));
    const linkKeys = new Set(existing.links.map((link) => `${link.relation}:${link.targetRefId}`));
    const missingKeys = new Set(existing.missingLinks.map((link) => `${link.expected}:${link.reasonRu}`));

    byId.set(node.ref.id, {
      ...existing,
      facts: [
        ...existing.facts,
        ...node.facts.filter((fact) => !factKeys.has(`${fact.key}:${fact.valueRu}:${fact.sourceRefId}`)),
      ],
      links: [
        ...existing.links,
        ...node.links.filter((link) => !linkKeys.has(`${link.relation}:${link.targetRefId}`)),
      ],
      missingLinks: [
        ...existing.missingLinks,
        ...node.missingLinks.filter((link) => !missingKeys.has(`${link.expected}:${link.reasonRu}`)),
      ],
    });
  }

  return [...byId.values()];
}

export function buildAiAppContextGraph(input: AiAppContextGraphBuildInput): AiContextGraphBuildResult {
  const providerTrace: string[] = [];
  const nodes = mergeUniqueNodes([
    ...buildGenericEntityNodes(input.entities, input.role),
    ...buildAiFieldGraphNodes(input.field, input.role),
    ...buildAiMarketplaceGraphNodes(input.marketplace, input.role),
    ...buildAiProcurementGraphNodes(input.procurement, input.role),
    ...buildAiWarehouseGraphNodes(input.warehouse, input.role),
    ...buildAiFinanceGraphNodes(input.finance, input.role),
    ...buildAiDocumentGraphNodes(input.documents, input.role),
  ]);

  if (input.entities?.length) providerTrace.push("aiContextGraphGenericEntityProvider");
  if (input.field) providerTrace.push("aiFieldGraphProvider");
  if (input.marketplace) providerTrace.push("aiMarketplaceGraphProvider");
  if (input.procurement) providerTrace.push("aiProcurementGraphProvider");
  if (input.warehouse) providerTrace.push("aiWarehouseGraphProvider");
  if (input.finance) providerTrace.push("aiFinanceGraphProvider");
  if (input.documents) providerTrace.push("aiDocumentGraphProvider");

  const externalSourceRefs = buildAiExternalSourceRefs(input.externalSources);
  if (externalSourceRefs.length) providerTrace.push("aiExternalSourceRefProvider");

  return {
    nodes,
    sourceRefs: uniqueAiSourceRefs([
      ...nodes.map((node) => node.ref),
      ...externalSourceRefs.map((source, index) => convertExternalSourceToAiSourceRef(source, index)),
    ]),
    externalSourceRefs,
    providerTrace,
  };
}
