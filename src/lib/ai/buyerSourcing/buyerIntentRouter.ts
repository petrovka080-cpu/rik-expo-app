import type { BuyerIntent, BuyerIntentContract } from "./buyerSourcingTypes";

export const BUYER_INTENT_CONTRACTS: readonly BuyerIntentContract[] = [
  {
    intent: "approved_request_sourcing",
    examplesRu: ["подбери поставщиков по утвержденной заявке", "что купить по этой заявке"],
    requiredContext: "approved_request",
    allowedSources: ["buyer_request", "request_line", "warehouse_stock", "own_marketplace", "approved_vendor", "supplier_history", "supplier_offer", "approval"],
    answerMode: "read",
  },
  {
    intent: "find_5_10_suppliers",
    examplesRu: ["найди 10 вариантов", "найди 5-10 поставщиков"],
    requiredContext: "approved_request",
    allowedSources: ["warehouse_stock", "own_marketplace", "approved_vendor", "supplier_history", "supplier_offer", "external_marketplace", "internet_source"],
    answerMode: "read",
  },
  {
    intent: "compare_suppliers",
    examplesRu: ["сравни поставщиков", "сравни варианты"],
    requiredContext: "request_line",
    allowedSources: ["own_marketplace", "approved_vendor", "supplier_history", "supplier_offer", "external_marketplace", "internet_source"],
    answerMode: "read",
  },
  {
    intent: "find_analogs",
    examplesRu: ["найди аналоги дешевле", "подбери замену материала"],
    requiredContext: "material",
    allowedSources: ["project_pdf", "estimate_line", "pdf_chunk", "own_marketplace", "approved_vendor", "external_marketplace"],
    answerMode: "read",
  },
  {
    intent: "check_warehouse_before_buy",
    examplesRu: ["что есть на складе", "проверь склад перед закупкой"],
    requiredContext: "request_line",
    allowedSources: ["warehouse_stock", "warehouse_incoming", "warehouse_issue", "buyer_request"],
    answerMode: "read",
  },
  {
    intent: "check_estimate_quantity",
    examplesRu: ["проверь по смете количество", "количество по смете"],
    requiredContext: "request_line",
    allowedSources: ["buyer_request", "request_line", "estimate_line", "pdf_chunk"],
    answerMode: "read",
  },
  {
    intent: "check_project_specification",
    examplesRu: ["проверь по проекту спецификацию", "что в проекте по материалу"],
    requiredContext: "request_line",
    allowedSources: ["buyer_request", "request_line", "project_pdf", "pdf_chunk"],
    answerMode: "read",
  },
  {
    intent: "prepare_rfq_draft",
    examplesRu: ["подготовь запрос поставщикам", "сделай RFQ"],
    requiredContext: "request_line",
    allowedSources: ["buyer_request", "request_line", "own_marketplace", "approved_vendor", "supplier_offer"],
    answerMode: "draft",
  },
  {
    intent: "prepare_shortlist",
    examplesRu: ["подготовь shortlist директору", "выбери 3 лучших"],
    requiredContext: "approved_request",
    allowedSources: ["buyer_request", "warehouse_stock", "own_marketplace", "supplier_offer", "approved_vendor", "supplier_history", "external_marketplace"],
    answerMode: "draft",
  },
  {
    intent: "prepare_approval_handoff",
    examplesRu: ["отправить на согласование", "что согласовать директору"],
    requiredContext: "approved_request",
    allowedSources: ["buyer_request", "supplier_offer", "approval"],
    answerMode: "approval_route",
  },
  {
    intent: "supplier_risk_check",
    examplesRu: ["почему этот поставщик рискованный", "покажи риски поставщика"],
    requiredContext: "supplier",
    allowedSources: ["approved_vendor", "supplier_history", "supplier_offer", "external_marketplace", "internet_source"],
    answerMode: "read",
  },
  {
    intent: "price_delivery_comparison",
    examplesRu: ["какой дешевле с доставкой", "какой быстрее"],
    requiredContext: "request_line",
    allowedSources: ["own_marketplace", "approved_vendor", "supplier_history", "supplier_offer", "external_marketplace", "internet_source"],
    answerMode: "read",
  },
  {
    intent: "external_marketplace_search",
    examplesRu: ["проверь внешние marketplace", "что есть во внешних источниках"],
    requiredContext: "marketplace",
    allowedSources: ["external_marketplace"],
    answerMode: "read",
  },
  {
    intent: "own_marketplace_search",
    examplesRu: ["что есть в нашем marketplace", "найди в каталоге"],
    requiredContext: "marketplace",
    allowedSources: ["own_marketplace"],
    answerMode: "read",
  },
  {
    intent: "urgent_delivery_options",
    examplesRu: ["что купить сначала", "какой вариант быстрее"],
    requiredContext: "approved_request",
    allowedSources: ["buyer_request", "warehouse_stock", "own_marketplace", "supplier_offer", "approved_vendor"],
    answerMode: "read",
  },
  {
    intent: "missing_procurement_data",
    examplesRu: ["что нужно уточнить перед заказом", "чего не хватает в заявке"],
    requiredContext: "none",
    allowedSources: ["buyer_request", "request_line", "approval", "pdf_chunk"],
    answerMode: "clarifying",
  },
] as const;

function normalize(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}\s/.-]+/gu, " ")
    .replace(/\s+/g, " ");
}

function hasAny(value: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

export function getBuyerIntentContract(intent: BuyerIntent): BuyerIntentContract {
  const contract = BUYER_INTENT_CONTRACTS.find((entry) => entry.intent === intent);
  if (!contract) throw new Error(`Missing buyer intent contract: ${intent}`);
  return {
    ...contract,
    examplesRu: [...contract.examplesRu],
    allowedSources: [...contract.allowedSources],
  };
}

export function routeBuyerIntent(questionRu: string): BuyerIntentContract {
  const q = normalize(questionRu);

  if (hasAny(q, [/смет/, /количеств/, /объем/, /объ[её]м/])) return getBuyerIntentContract("check_estimate_quantity");
  if (hasAny(q, [/проект/, /спецификац/, /pdf/, /чертеж/])) return getBuyerIntentContract("check_project_specification");
  if (hasAny(q, [/склад/, /остат/, /incoming/, /выдач/, /приход/])) return getBuyerIntentContract("check_warehouse_before_buy");
  if (hasAny(q, [/аналог/, /замен/, /дешевле/])) return getBuyerIntentContract("find_analogs");
  if (hasAny(q, [/shortlist/, /шортлист/, /3 лучш/, /директор/])) return getBuyerIntentContract("prepare_shortlist");
  if (hasAny(q, [/соглас/, /approval/, /маршрут/])) return getBuyerIntentContract("prepare_approval_handoff");
  if (hasAny(q, [/rfq/, /кп/, /запрос поставщик/])) return getBuyerIntentContract("prepare_rfq_draft");
  if (hasAny(q, [/риск/, /надежн/, /претенз/])) return getBuyerIntentContract("supplier_risk_check");
  if (hasAny(q, [/быстр/, /срок/, /доставк/, /цена/, /дороже/, /дешев/])) return getBuyerIntentContract("price_delivery_comparison");
  if (hasAny(q, [/внешн/, /интернет/, /marketplace/]) && !hasAny(q, [/наш/])) return getBuyerIntentContract("external_marketplace_search");
  if (hasAny(q, [/наш marketplace/, /наш маркет/, /каталог/])) return getBuyerIntentContract("own_marketplace_search");
  if (hasAny(q, [/сравн/])) return getBuyerIntentContract("compare_suppliers");
  if (hasAny(q, [/10 вариант/, /5-10/, /5 10/, /вариант/, /подбери/, /найди/])) return getBuyerIntentContract("find_5_10_suppliers");
  if (hasAny(q, [/что купить сначала/, /срочн/, /первым/])) return getBuyerIntentContract("urgent_delivery_options");
  if (hasAny(q, [/уточн/, /чего не хватает/, /перед заказ/])) return getBuyerIntentContract("missing_procurement_data");

  return getBuyerIntentContract("approved_request_sourcing");
}

export const buyerIntentRouter = routeBuyerIntent;
