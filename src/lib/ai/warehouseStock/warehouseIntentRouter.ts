import type { WarehouseIntentContract, WarehouseStockIntent } from "./warehouseStockTypes";

export const WAREHOUSE_INTENT_CONTRACTS: readonly WarehouseIntentContract[] = [
  {
    intent: "stock_overview",
    examplesRu: ["что есть на складе", "остатки склада", "склад сегодня"],
    requiredContext: "period",
    allowedSources: ["stock_item", "warehouse_location", "incoming", "issue", "reservation", "document"],
    answerMode: "read",
  },
  {
    intent: "critical_deficits",
    examplesRu: ["что критично", "какие дефициты", "что нужно докупить"],
    requiredContext: "period",
    allowedSources: ["stock_item", "reservation", "work", "object", "procurement_request", "incoming"],
    answerMode: "read",
  },
  {
    intent: "material_blockers",
    examplesRu: ["какие материалы блокируют работы", "что мешает работам"],
    requiredContext: "period",
    allowedSources: ["stock_item", "work", "object", "procurement_request", "incoming", "estimate_line"],
    answerMode: "read",
  },
  {
    intent: "issue_readiness",
    examplesRu: ["что можно выдать сегодня", "проверь выдачу", "доступно к выдаче"],
    requiredContext: "period",
    allowedSources: ["stock_item", "issue", "reservation", "work", "object", "approval"],
    answerMode: "read",
  },
  {
    intent: "incoming_review",
    examplesRu: ["что пришло сегодня", "проверить приход"],
    requiredContext: "period",
    allowedSources: ["incoming", "waybill", "supplier_offer", "procurement_request", "document", "pdf_chunk"],
    answerMode: "read",
  },
  {
    intent: "incoming_waybill_reconciliation",
    examplesRu: ["сверь приход с накладной", "приход и накладная"],
    requiredContext: "incoming",
    allowedSources: ["incoming", "waybill", "procurement_request", "supplier_offer", "document", "pdf_chunk"],
    answerMode: "read",
  },
  {
    intent: "inventory_discrepancy_check",
    examplesRu: ["где расхождения", "инвентаризация", "сверь остатки"],
    requiredContext: "period",
    allowedSources: ["stock_item", "inventory_count", "incoming", "issue", "reservation", "document"],
    answerMode: "read",
  },
  {
    intent: "reservation_check",
    examplesRu: ["что зарезервировано", "покажи резервы"],
    requiredContext: "period",
    allowedSources: ["stock_item", "reservation", "work", "object", "approval"],
    answerMode: "read",
  },
  {
    intent: "transfer_readiness",
    examplesRu: ["проверь перемещение", "перемещения склада"],
    requiredContext: "period",
    allowedSources: ["transfer", "stock_item", "warehouse_location", "document", "approval"],
    answerMode: "read",
  },
  {
    intent: "location_missing_check",
    examplesRu: ["материалы без локации", "где нет полки"],
    requiredContext: "period",
    allowedSources: ["stock_item", "warehouse_location", "inventory_count"],
    answerMode: "read",
  },
  {
    intent: "stock_without_documents",
    examplesRu: ["склад без документов", "каких документов не хватает"],
    requiredContext: "period",
    allowedSources: ["stock_item", "incoming", "waybill", "document", "pdf_chunk"],
    answerMode: "read",
  },
  {
    intent: "warehouse_to_work_link",
    examplesRu: ["связь с работой", "материал и работа"],
    requiredContext: "work",
    allowedSources: ["stock_item", "work", "object", "issue", "reservation"],
    answerMode: "read",
  },
  {
    intent: "warehouse_to_procurement_link",
    examplesRu: ["связь с заявкой", "передать снабженцу"],
    requiredContext: "material",
    allowedSources: ["stock_item", "procurement_request", "supplier_offer", "marketplace_offer", "incoming"],
    answerMode: "draft",
  },
  {
    intent: "warehouse_to_estimate_spec_check",
    examplesRu: ["сверь со сметой", "сметная строка"],
    requiredContext: "material",
    allowedSources: ["stock_item", "estimate_line", "document", "pdf_chunk", "work", "object"],
    answerMode: "read",
  },
  {
    intent: "warehouse_to_project_spec_check",
    examplesRu: ["сверь с проектом", "проектная спецификация"],
    requiredContext: "material",
    allowedSources: ["stock_item", "project_specification", "pdf_chunk", "document", "work", "object"],
    answerMode: "read",
  },
  {
    intent: "draft_issue_document",
    examplesRu: ["подготовь выдачу", "черновик выдачи"],
    requiredContext: "material",
    allowedSources: ["stock_item", "issue", "work", "object", "approval"],
    answerMode: "draft",
  },
  {
    intent: "draft_discrepancy_act",
    examplesRu: ["подготовь акт расхождения", "акт расхождения"],
    requiredContext: "incoming",
    allowedSources: ["incoming", "waybill", "inventory_count", "document", "supplier_offer"],
    answerMode: "draft",
  },
  {
    intent: "warehouse_approval_handoff",
    examplesRu: ["отправить на согласование", "approval по складу"],
    requiredContext: "period",
    allowedSources: ["stock_item", "incoming", "issue", "reservation", "transfer", "approval", "document"],
    answerMode: "approval_route",
  },
] as const;

const INTENT_ALIASES: Partial<Record<WarehouseStockIntent, WarehouseStockIntent>> = {
  today_stock_summary: "stock_overview",
  what_to_issue_by_object: "issue_readiness",
  critical_materials: "critical_deficits",
  warehouse_linked_status: "stock_overview",
  incoming_readiness: "incoming_review",
  incoming_discrepancy_check: "incoming_waybill_reconciliation",
  issue_readiness_check: "issue_readiness",
  missing_documents_check: "stock_without_documents",
  specification_match_check: "warehouse_to_project_spec_check",
  unit_conversion_check: "warehouse_to_estimate_spec_check",
  procurement_handoff: "warehouse_to_procurement_link",
  foreman_handoff: "warehouse_to_work_link",
  approval_route: "warehouse_approval_handoff",
  document_request_draft: "stock_without_documents",
  inventory_reconciliation: "inventory_discrepancy_check",
};

function hasAny(value: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

export function getWarehouseIntentContract(intent: WarehouseStockIntent): WarehouseIntentContract {
  const normalized = INTENT_ALIASES[intent] ?? intent;
  const contract = WAREHOUSE_INTENT_CONTRACTS.find((item) => item.intent === normalized);
  if (!contract) throw new Error(`Unknown warehouse intent: ${intent}`);
  return contract;
}

export function normalizeWarehouseIntent(intent: WarehouseStockIntent): WarehouseStockIntent {
  return INTENT_ALIASES[intent] ?? intent;
}

export function routeWarehouseIntent(questionRu: string): WarehouseIntentContract {
  const q = questionRu.toLowerCase();
  if (hasAny(q, [/акт расхожд|discrepancy act|draft discrepancy/])) return getWarehouseIntentContract("draft_discrepancy_act");
  if (hasAny(q, [/подготов.*выдач|черновик выдач|draft issue/])) return getWarehouseIntentContract("draft_issue_document");
  if (hasAny(q, [/накладн|waybill/]) && hasAny(q, [/свер|расхожд|reconcil|mismatch/])) return getWarehouseIntentContract("incoming_waybill_reconciliation");
  if (hasAny(q, [/приход|поставк|incoming|receive|delivery/])) return getWarehouseIntentContract("incoming_review");
  if (hasAny(q, [/выдач|выдать|issue|pick|можно выдать/])) return getWarehouseIntentContract("issue_readiness");
  if (hasAny(q, [/резерв|reserved|reservation/])) return getWarehouseIntentContract("reservation_check");
  if (hasAny(q, [/перемещ|transfer/])) return getWarehouseIntentContract("transfer_readiness");
  if (hasAny(q, [/локац|полк|location|shelf/])) return getWarehouseIntentContract("location_missing_check");
  if (hasAny(q, [/инвентар|расхожд|сверь остат|inventory|mismatch|discrep/])) return getWarehouseIntentContract("inventory_discrepancy_check");
  if (hasAny(q, [/заявк|снабжен|procurement|buyer/])) return getWarehouseIntentContract("warehouse_to_procurement_link");
  if (hasAny(q, [/критич|дефицит|докупить|critical|shortage/])) return getWarehouseIntentContract("critical_deficits");
  if (hasAny(q, [/блокир|мешает|blocker|block/])) return getWarehouseIntentContract("material_blockers");
  if (hasAny(q, [/работ|объект|прораб|work|object|foreman/])) return getWarehouseIntentContract("warehouse_to_work_link");
  if (hasAny(q, [/смет|estimate|boq/])) return getWarehouseIntentContract("warehouse_to_estimate_spec_check");
  if (hasAny(q, [/проект|specification|специфик|pdf/])) return getWarehouseIntentContract("warehouse_to_project_spec_check");
  if (hasAny(q, [/документ|сертифик|docs?|certificate/])) return getWarehouseIntentContract("stock_without_documents");
  if (hasAny(q, [/соглас|approval|директор/])) return getWarehouseIntentContract("warehouse_approval_handoff");
  return getWarehouseIntentContract("stock_overview");
}
