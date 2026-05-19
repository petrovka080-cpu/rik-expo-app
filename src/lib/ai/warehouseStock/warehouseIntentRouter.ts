import type { WarehouseIntentContract, WarehouseStockIntent } from "./warehouseStockTypes";

export const WAREHOUSE_INTENT_CONTRACTS: readonly WarehouseIntentContract[] = [
  {
    intent: "today_stock_summary",
    examplesRu: ["what is critical on stock today", "warehouse today"],
    requiredContext: "screen",
    allowedSources: ["warehouse_stock", "warehouse_incoming", "warehouse_issue", "material", "document"],
    answerMode: "read",
  },
  {
    intent: "what_to_issue_by_object",
    examplesRu: ["what to issue by object", "materials for object"],
    requiredContext: "object",
    allowedSources: ["warehouse_stock", "warehouse_issue", "material", "object", "work", "procurement_request"],
    answerMode: "read",
  },
  {
    intent: "critical_materials",
    examplesRu: ["critical materials", "stock deficit"],
    requiredContext: "screen",
    allowedSources: ["warehouse_stock", "warehouse_issue", "material", "procurement_request"],
    answerMode: "read",
  },
  {
    intent: "material_blockers",
    examplesRu: ["what material blocks works", "material blockers"],
    requiredContext: "work",
    allowedSources: ["warehouse_stock", "warehouse_issue", "material", "work", "object", "procurement_request"],
    answerMode: "read",
  },
  {
    intent: "warehouse_linked_status",
    examplesRu: ["stock status for this material", "linked warehouse status"],
    requiredContext: "material",
    allowedSources: ["warehouse_stock", "warehouse_incoming", "warehouse_issue", "material"],
    answerMode: "read",
  },
  {
    intent: "incoming_readiness",
    examplesRu: ["check incoming", "can receive delivery"],
    requiredContext: "incoming",
    allowedSources: ["warehouse_incoming", "material", "document", "pdf_chunk", "approval"],
    answerMode: "read",
  },
  {
    intent: "incoming_discrepancy_check",
    examplesRu: ["incoming discrepancy", "arrival mismatch"],
    requiredContext: "incoming",
    allowedSources: ["warehouse_incoming", "warehouse_stock", "material", "document", "approval"],
    answerMode: "read",
  },
  {
    intent: "issue_readiness_check",
    examplesRu: ["can issue material", "issue readiness"],
    requiredContext: "issue",
    allowedSources: ["warehouse_stock", "warehouse_issue", "material", "work", "object", "approval"],
    answerMode: "read",
  },
  {
    intent: "missing_documents_check",
    examplesRu: ["missing docs", "what documents are missing"],
    requiredContext: "screen",
    allowedSources: ["warehouse_incoming", "warehouse_issue", "document", "pdf_chunk", "approval"],
    answerMode: "read",
  },
  {
    intent: "specification_match_check",
    examplesRu: ["check specification", "match material spec"],
    requiredContext: "material",
    allowedSources: ["material", "specification", "pdf_chunk", "document", "work", "object"],
    answerMode: "read",
  },
  {
    intent: "unit_conversion_check",
    examplesRu: ["check units", "convert package to pieces"],
    requiredContext: "material",
    allowedSources: ["material", "specification", "warehouse_stock", "document"],
    answerMode: "read",
  },
  {
    intent: "procurement_handoff",
    examplesRu: ["send deficit to buyer", "procurement handoff"],
    requiredContext: "material",
    allowedSources: ["warehouse_stock", "warehouse_issue", "procurement_request", "material", "approval"],
    answerMode: "draft",
  },
  {
    intent: "foreman_handoff",
    examplesRu: ["tell foreman what blocks work", "handoff to foreman"],
    requiredContext: "work",
    allowedSources: ["warehouse_stock", "warehouse_issue", "work", "object", "chat_message"],
    answerMode: "draft",
  },
  {
    intent: "approval_route",
    examplesRu: ["send discrepancy to approval", "approval route"],
    requiredContext: "screen",
    allowedSources: ["warehouse_stock", "warehouse_incoming", "warehouse_issue", "approval", "document"],
    answerMode: "approval_route",
  },
  {
    intent: "document_request_draft",
    examplesRu: ["request missing documents", "draft document request"],
    requiredContext: "incoming",
    allowedSources: ["warehouse_incoming", "document", "pdf_chunk", "material"],
    answerMode: "draft",
  },
  {
    intent: "inventory_reconciliation",
    examplesRu: ["reconcile stock", "stock discrepancy"],
    requiredContext: "screen",
    allowedSources: ["warehouse_stock", "warehouse_incoming", "warehouse_issue", "material", "document"],
    answerMode: "read",
  },
] as const;

function hasAny(value: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

export function getWarehouseIntentContract(intent: WarehouseStockIntent): WarehouseIntentContract {
  const contract = WAREHOUSE_INTENT_CONTRACTS.find((item) => item.intent === intent);
  if (!contract) throw new Error(`Unknown warehouse intent: ${intent}`);
  return contract;
}

export function routeWarehouseIntent(questionRu: string): WarehouseIntentContract {
  const q = questionRu.toLowerCase();
  if (hasAny(q, [/объект|object/]) && hasAny(q, [/выдать|материал|issue/])) return getWarehouseIntentContract("what_to_issue_by_object");
  if (hasAny(q, [/приход|incoming|поставка|receive|delivery/]) && hasAny(q, [/расхожд|mismatch|discrep/])) return getWarehouseIntentContract("incoming_discrepancy_check");
  if (hasAny(q, [/приход|incoming|поставка|receive|delivery/])) return getWarehouseIntentContract("incoming_readiness");
  if (hasAny(q, [/выдач|issue|выдать|pick/])) return getWarehouseIntentContract("issue_readiness_check");
  if (hasAny(q, [/критич|critical|дефицит|shortage|остат/])) return getWarehouseIntentContract("critical_materials");
  if (hasAny(q, [/блокир|blocker|block|мешает/])) return getWarehouseIntentContract("material_blockers");
  if (hasAny(q, [/документ|накладн|certificate|pdf|docs?/])) return getWarehouseIntentContract("missing_documents_check");
  if (hasAny(q, [/спецификац|specification|проект/])) return getWarehouseIntentContract("specification_match_check");
  if (hasAny(q, [/единиц|unit|упаков|convert|conversion/])) return getWarehouseIntentContract("unit_conversion_check");
  if (hasAny(q, [/снабжен|buyer|procurement|заявк/])) return getWarehouseIntentContract("procurement_handoff");
  if (hasAny(q, [/прораб|foreman/])) return getWarehouseIntentContract("foreman_handoff");
  if (hasAny(q, [/соглас|approval|директор/])) return getWarehouseIntentContract("approval_route");
  if (hasAny(q, [/свер|reconcile|inventory/])) return getWarehouseIntentContract("inventory_reconciliation");
  return getWarehouseIntentContract("today_stock_summary");
}
