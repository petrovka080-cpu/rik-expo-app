import type { ConstructionKnowledgeSource } from "../constructionKnowledgeCore";
import type {
  WarehouseDataProviderResult,
  WarehouseProviderDescriptor,
  WarehouseProviderKey,
  WarehouseStockContext,
} from "./warehouseStockTypes";

export const REQUIRED_WAREHOUSE_PROVIDER_KEYS: readonly WarehouseProviderKey[] = [
  "aiWarehouseScreenContextProvider",
  "aiWarehouseStockProvider",
  "aiWarehouseIncomingProvider",
  "aiWarehouseIssueProvider",
  "aiMaterialSpecificationProvider",
  "aiWorkObjectLinkedProvider",
  "aiProcurementLinkedRequestProvider",
  "aiPdfAggregatorProvider",
  "aiDocumentsProvider",
  "aiApprovalProvider",
  "aiUnitConversionProvider",
  "aiWarehouseDiscrepancyProvider",
  "aiWarehouseAnswerComposer",
  "aiWarehouseSourceSanitizer",
] as const;

function descriptor(key: WarehouseProviderKey): WarehouseProviderDescriptor {
  return {
    key,
    pure: true,
    usesHooks: false,
    usesUseEffectHack: false,
    dbWrites: false,
    directMutation: false,
    createsFakeData: false,
    ready: true,
  };
}

export const WAREHOUSE_PROVIDER_REGISTRY: readonly WarehouseProviderDescriptor[] =
  REQUIRED_WAREHOUSE_PROVIDER_KEYS.map(descriptor);

export function listWarehouseDataProviders(): WarehouseProviderDescriptor[] {
  return WAREHOUSE_PROVIDER_REGISTRY.map((item) => ({ ...item }));
}

function fact(id: string, textRu: string, sourceRefs: string[] = []): WarehouseDataProviderResult["facts"][number] {
  return {
    id,
    textRu,
    sourceRefs,
    confidence: sourceRefs.length > 0 ? "high" : "medium",
  };
}

function providerResult(params: Partial<WarehouseDataProviderResult>): WarehouseDataProviderResult {
  return {
    facts: params.facts ?? [],
    sources: params.sources ?? [],
    missingData: params.missingData ?? [],
    permissionLimited: params.permissionLimited ?? [],
    exactNoDataReasonRu: params.exactNoDataReasonRu,
  };
}

function sourceFilter(
  context: WarehouseStockContext,
  types: ConstructionKnowledgeSource["type"][],
): ConstructionKnowledgeSource[] {
  return context.sources.filter((source) => types.includes(source.type));
}

export function aiWarehouseScreenContextProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  return providerResult({
    facts: [
      fact(
        "warehouse:screen",
        `Screen ${context.screenId}: stock ${context.stockItems.length}, incoming ${context.incoming.length}, issues ${context.issues.length}.`,
      ),
    ],
  });
}

export function aiWarehouseStockProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  return providerResult({
    sources: sourceFilter(context, ["warehouse_stock", "material"]),
    facts: context.stockItems.map((item) =>
      fact(
        `stock:${item.id}`,
        `Stock ${item.materialNameRu}: available ${item.availableQty} ${item.unit}, reserved ${item.reservedQty}, incoming ${item.incomingQty}.`,
        item.sourceRefs,
      ),
    ),
    missingData: context.stockItems.length === 0 ? ["No warehouse stock source is connected for this screen."] : [],
    exactNoDataReasonRu: context.stockItems.length === 0 ? "No source-backed stock rows were found." : undefined,
  });
}

export function aiWarehouseIncomingProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  return providerResult({
    sources: sourceFilter(context, ["warehouse_stock", "material", "report", "act"]),
    facts: context.incoming.map((item) =>
      fact(
        `incoming:${item.id}`,
        `Incoming ${item.materialNameRu}: ${item.quantity} ${item.unit}, status ${item.status}.`,
        item.sourceRefs,
      ),
    ),
    missingData: context.incoming.flatMap((item) =>
      item.documentRefs.length === 0 || item.status === "needs_documents"
        ? [`Incoming ${item.id} has no source document/certificate/waybill.`]
        : [],
    ),
  });
}

export function aiWarehouseIssueProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  return providerResult({
    sources: sourceFilter(context, ["warehouse_stock", "work", "object", "procurement_request"]),
    facts: context.issues.map((item) =>
      fact(
        `issue:${item.id}`,
        `Issue ${item.materialNameRu}: requested ${item.requestedQty} ${item.unit}, issued ${item.issuedQty}, status ${item.status}.`,
        item.sourceRefs,
      ),
    ),
    missingData: context.issues.flatMap((item) => [
      ...(item.objectId ? [] : [`Issue ${item.id} has no linked object.`]),
      ...(item.workId ? [] : [`Issue ${item.id} has no linked work.`]),
      ...(item.requestId ? [] : [`Issue ${item.id} has no linked request.`]),
    ]),
  });
}

export function aiMaterialSpecificationProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  const sources = sourceFilter(context, ["specification", "boq", "project_pdf", "engineering_pdf", "estimate_pdf", "material"]);
  const itemsWithoutSpec = context.stockItems.filter((item) => !item.specificationText);
  return providerResult({
    sources,
    facts: [
      ...sources.map((source) =>
        fact(`spec:${source.id}`, `Specification source: ${source.labelRu}${source.page ? `, page ${source.page}` : ""}.`, [source.id]),
      ),
      ...context.stockItems
        .filter((item) => item.specificationText)
        .map((item) => fact(`spec:item:${item.id}`, `Material specification for ${item.materialNameRu}: ${item.specificationText}.`, item.sourceRefs)),
    ],
    missingData: [
      ...(sources.length === 0 ? ["No specification/project PDF source is linked to warehouse material."] : []),
      ...itemsWithoutSpec.map((item) => `Material ${item.materialNameRu} has no specification text.`),
    ],
  });
}

export function aiWorkObjectLinkedProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  const sources = sourceFilter(context, ["work", "object", "zone"]);
  return providerResult({
    sources,
    facts: sources.map((source) => fact(`work-object:${source.id}`, `Linked work/object source: ${source.labelRu}.`, [source.id])),
    missingData: sources.length === 0 ? ["No linked work/object source is available for warehouse item."] : [],
  });
}

export function aiProcurementLinkedRequestProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  const sources = sourceFilter(context, ["procurement_request"]);
  return providerResult({
    sources,
    facts: sources.map((source) => fact(`procurement:${source.id}`, `Linked procurement request: ${source.labelRu}.`, [source.id])),
    missingData: sources.length === 0 ? ["No linked procurement request is available for deficit handoff."] : [],
  });
}

export function aiDocumentsProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  const sources = sourceFilter(context, ["act", "report", "photo", "specification", "project_pdf", "engineering_pdf", "estimate_pdf"]);
  return providerResult({
    sources,
    facts: sources.map((source) => fact(`document:${source.id}`, `Warehouse document/source: ${source.labelRu}${source.page ? `, page ${source.page}` : ""}.`, [source.id])),
    missingData: context.documentsProviderConnected ? [] : ["Warehouse documents/PDF provider is not connected."],
  });
}

export function aiApprovalProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  const sources = sourceFilter(context, ["approval"]);
  return providerResult({
    sources,
    facts: [
      fact(
        "approval:warehouse",
        "Approval is prepared only as a human route; AI does not approve, receive, issue or write off stock.",
        sources.map((source) => source.id),
      ),
    ],
    missingData: sources.length === 0 ? ["Approval route is not linked for disputed stock event."] : [],
  });
}

export function aiUnitConversionProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  return providerResult({
    facts: [
      fact(
        "unit-conversion",
        context.unitConversionConfigured
          ? "Unit conversion basis is configured by source; unit comparison can be reviewed."
          : "Unit conversion basis is not configured; AI cannot convert units as fact.",
      ),
    ],
    missingData: context.unitConversionConfigured ? [] : ["Unit conversion factor/source is missing."],
  });
}

export function aiWarehouseDiscrepancyProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  const facts = context.issues.flatMap((issue) => {
    const stock = context.stockItems.find((item) => item.materialId === issue.materialId);
    if (!stock) return [fact(`discrepancy:${issue.id}`, `Issue ${issue.id} has no matching stock row.`, issue.sourceRefs)];
    const deficit = Math.max(0, issue.requestedQty - issue.issuedQty - stock.availableQty);
    return deficit > 0
      ? [fact(`discrepancy:${issue.id}`, `Issue ${issue.id} has deficit ${deficit} ${issue.unit}.`, [...issue.sourceRefs, ...stock.sourceRefs])]
      : [];
  });
  const incomingFacts = context.incoming
    .filter((item) => item.status === "disputed")
    .map((item) => fact(`discrepancy:incoming:${item.id}`, `Incoming ${item.id} is disputed and needs human review.`, item.sourceRefs));
  return providerResult({
    facts: [...facts, ...incomingFacts],
    missingData: facts.length === 0 && incomingFacts.length === 0 ? [] : ["Disputed/deficit stock event requires human review before mutation."],
  });
}

export const WAREHOUSE_DATA_PROVIDER_FUNCTIONS: Record<WarehouseProviderKey, (context: WarehouseStockContext) => WarehouseDataProviderResult> = {
  aiWarehouseScreenContextProvider,
  aiWarehouseStockProvider,
  aiWarehouseIncomingProvider,
  aiWarehouseIssueProvider,
  aiMaterialSpecificationProvider,
  aiWorkObjectLinkedProvider,
  aiProcurementLinkedRequestProvider,
  aiPdfAggregatorProvider: aiDocumentsProvider,
  aiDocumentsProvider,
  aiApprovalProvider,
  aiUnitConversionProvider,
  aiWarehouseDiscrepancyProvider,
  aiWarehouseAnswerComposer: () => providerResult({ facts: [fact("composer:warehouse", "Answer is composed by shared warehouse stock funnel composer.")] }),
  aiWarehouseSourceSanitizer: () => providerResult({ facts: [fact("sanitizer:warehouse", "Sources are sanitized from finance, security, runtime and raw provider data.")] }),
};

export function warehouseProviderTraceForAll(): string[] {
  return ["warehouseStockPipeline", ...REQUIRED_WAREHOUSE_PROVIDER_KEYS];
}
