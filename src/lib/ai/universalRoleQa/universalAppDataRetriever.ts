import {
  makeAiSourceRefId,
  type AiAppEntityType,
  type AiContextGraphBuildResult,
  type AiContextGraphNode,
  type AiSourceRef,
} from "../appContextGraph";
import type { UniversalRoleQaFilters } from "./universalFilterExtractor";
import type { UniversalRoleQaEntity } from "./universalEntityExtractor";
import type { UniversalRoleQaSourcePlan } from "./universalSourcePlanner";
import { normalizeUniversalRoleQaQuestion, uniqueUniversalStrings } from "./universalQuestionNormalizer";

export type UniversalRoleQaRetrievalRequest = {
  sourcePlan: UniversalRoleQaSourcePlan;
  appContextGraphRefs?: string[];
  query: {
    normalizedQuestionRu: string;
    intent: UniversalRoleQaSourcePlan["intent"];
    entity: UniversalRoleQaSourcePlan["entity"];
    filters: UniversalRoleQaFilters;
  };
  roleScope: {
    role: string;
    userId: string;
    companyId: string;
    allowedObjectIds?: string[];
    allowedProjectIds?: string[];
  };
  limits: {
    maxRows: number;
    maxPdfChunks: number;
    maxMarketplaceOffers: number;
    maxWebResults: number;
  };
};

export type UniversalRoleQaRetrievedItem = {
  textRu: string;
  sourceRefIds: string[];
  status: "found" | "missing" | "risk" | "blocked" | "draft" | "checked_empty" | "external_reference" | "requires_review";
  entityType?: AiAppEntityType;
  entityId?: string;
};

export type UniversalRoleQaOpenLink = {
  labelRu: string;
  sourceRefId: string;
  enabled: boolean;
  route?: string;
  disabledReasonRu?: string;
};

export type UniversalRoleQaAppDataRetrievalResult = {
  source: "app_data";
  used: boolean;
  checkedEmpty: boolean;
  items: UniversalRoleQaRetrievedItem[];
  sourceRefs: AiSourceRef[];
  openLinks: UniversalRoleQaOpenLink[];
  boundedQueryTrace: {
    maxRows: number;
    roleScoped: boolean;
    companyScoped: boolean;
    periodFilterApplied: boolean;
    entityFilterApplied: boolean;
    floorFilterApplied: boolean;
    materialFilterApplied: boolean;
    unbounded: false;
  };
};

const entityMap: Partial<Record<UniversalRoleQaEntity, AiAppEntityType[]>> = {
  procurement_request: ["procurement_request"],
  procurement_request_line: ["procurement_request_line"],
  purchase_order: ["purchase_order"],
  warehouse_stock: ["warehouse_stock"],
  warehouse_incoming: ["warehouse_incoming"],
  warehouse_issue: ["warehouse_issue"],
  warehouse_reservation: ["warehouse_reservation"],
  payment: ["payment"],
  invoice: ["invoice"],
  act: ["act"],
  contract: ["contract"],
  document: ["document"],
  pdf_document: ["pdf_document"],
  report: ["report"],
  work: ["work"],
  task: ["task"],
  object: ["object"],
  building: ["building"],
  floor: ["floor"],
  zone: ["zone"],
  material: ["material"],
  marketplace_product: ["marketplace_product"],
  supplier: ["supplier"],
  contractor: ["contractor"],
  photo: ["photo"],
  video: ["video"],
  approval: ["approval"],
  company: ["company"],
  user: ["user"],
};

function graphText(node: AiContextGraphNode): string {
  return normalizeUniversalRoleQaQuestion([
    node.titleRu,
    node.ref.labelRu,
    node.ref.entityId,
    ...node.facts.map((fact) => fact.valueRu),
    ...node.links.map((link) => link.labelRu),
    ...node.missingLinks.map((link) => link.reasonRu),
  ].join(" "));
}

function targetEntityTypes(plan: UniversalRoleQaSourcePlan): AiAppEntityType[] {
  if (plan.intent === "finance_payment_review" || plan.intent === "document_payment_blocker_review") return ["payment"];
  if (plan.intent === "warehouse_issue_trace") return ["warehouse_issue", "warehouse_stock", "warehouse_incoming"];
  if (plan.intent === "warehouse_stock_review" || plan.intent === "warehouse_deficit_review") return ["warehouse_stock", "warehouse_reservation"];
  if (plan.intent === "document_pdf_explanation" || plan.intent === "document_missing_links_review") return ["pdf_document", "document"];
  if (plan.intent === "marketplace_supplier_search" || plan.intent === "procurement_offer_selection") return ["marketplace_product", "supplier", "procurement_request", "warehouse_stock"];
  if (plan.intent === "field_work_review" || plan.intent === "field_work_closeout_help" || plan.intent === "contractor_acceptance_review") return ["work", "task", "photo", "act", "document"];
  if (plan.intent === "director_decision_summary") return ["approval", "procurement_request", "payment", "warehouse_stock", "work", "document"];
  if (plan.intent.startsWith("app_data") && plan.entity === "unknown") return ["procurement_request", "payment", "work", "warehouse_stock", "document"];
  return entityMap[plan.entity] ?? [];
}

function matchesFilters(node: AiContextGraphNode, filters: UniversalRoleQaFilters): boolean {
  const text = graphText(node);
  if (filters.floor?.number && !text.includes(`${filters.floor.number}`) && !text.includes("перв")) return false;
  if (filters.material?.normalizedNameRu && !text.includes(filters.material.normalizedNameRu)) return false;
  if (filters.status?.labelRu && !text.includes(normalizeUniversalRoleQaQuestion(filters.status.labelRu))) {
    if (filters.status.normalized === "missing_docs") return node.missingLinks.length > 0;
    if (filters.status.normalized === "blocked") return node.missingLinks.length > 0 || text.includes("block");
    return false;
  }
  return true;
}

function itemForNode(node: AiContextGraphNode): UniversalRoleQaRetrievedItem {
  const missing = node.missingLinks.map((link) => link.reasonRu).join("; ");
  const facts = node.facts
    .filter((fact) => fact.key !== "label")
    .slice(0, 3)
    .map((fact) => `${fact.key}: ${fact.valueRu}`)
    .join("; ");
  return {
    textRu: [node.titleRu, facts, missing ? `не хватает: ${missing}` : null].filter(Boolean).join("; "),
    sourceRefIds: uniqueUniversalStrings([node.ref.id, ...node.links.map((link) => link.targetRefId)]),
    status: node.missingLinks.length ? "risk" : "found",
    entityType: node.ref.entityType,
    entityId: node.ref.entityId,
  };
}

function refsById(graph: AiContextGraphBuildResult): Map<string, AiSourceRef> {
  return new Map(graph.sourceRefs.map((ref) => [ref.id, ref]));
}

export function retrieveUniversalAppData(
  request: UniversalRoleQaRetrievalRequest,
  graph: AiContextGraphBuildResult,
): UniversalRoleQaAppDataRetrievalResult {
  const entityTypes = targetEntityTypes(request.sourcePlan);
  const candidates = graph.nodes
    .filter((node) => !entityTypes.length || entityTypes.includes(node.ref.entityType))
    .filter((node) => matchesFilters(node, request.query.filters))
    .slice(0, Math.max(1, request.limits.maxRows));
  const items = candidates.map(itemForNode);
  const refIds = uniqueUniversalStrings(items.flatMap((item) => item.sourceRefIds));
  const refs = refsById(graph);
  const sourceRefs = refIds
    .map((refId) => refs.get(refId) ?? refs.get(makeAiSourceRefId("document", refId)))
    .filter((ref): ref is AiSourceRef => Boolean(ref));
  const openLinks = sourceRefs
    .filter((ref) => ref.origin !== "external_web")
    .map((ref) => ({
      labelRu: ref.labelRu,
      sourceRefId: ref.id,
      enabled: ref.permission.canOpen && Boolean(ref.appLink?.route),
      route: ref.appLink?.route,
      disabledReasonRu: ref.permission.canOpen ? undefined : ref.permission.reasonRu,
    }));

  return {
    source: "app_data",
    used: items.length > 0,
    checkedEmpty: items.length === 0,
    items,
    sourceRefs,
    openLinks,
    boundedQueryTrace: {
      maxRows: request.limits.maxRows,
      roleScoped: Boolean(request.roleScope.role),
      companyScoped: Boolean(request.roleScope.companyId),
      periodFilterApplied: Boolean(request.query.filters.period),
      entityFilterApplied: entityTypes.length > 0,
      floorFilterApplied: Boolean(request.query.filters.floor),
      materialFilterApplied: Boolean(request.query.filters.material),
      unbounded: false,
    },
  };
}
