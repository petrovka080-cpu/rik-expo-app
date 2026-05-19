import type { ForemanIntent, ForemanIntentContract } from "./foremanTypes";

export const FOREMAN_INTENT_CONTRACTS: readonly ForemanIntentContract[] = [
  {
    intent: "daily_object_report",
    examplesRu: ["подготовь отчеты по объектам что было сделано а что нет", "отчёт по объектам за день"],
    allowedSources: ["work", "object", "zone", "photo", "act", "report", "document", "pdf_chunk", "chat_message"],
    requiredMinimumContext: "date",
    canUseGeneralConstructionKnowledge: true,
    canUsePdfAggregator: true,
    answerMode: "draft",
  },
  {
    intent: "what_done_today",
    examplesRu: ["что сделано сегодня", "что было вчера и сегодня"],
    allowedSources: ["work", "object", "zone", "photo", "report"],
    requiredMinimumContext: "date",
    canUseGeneralConstructionKnowledge: true,
    canUsePdfAggregator: false,
    answerMode: "read",
  },
  {
    intent: "what_not_done_today",
    examplesRu: ["что не сделано сегодня", "какие работы просрочены"],
    allowedSources: ["work", "object", "zone", "report", "approval"],
    requiredMinimumContext: "date",
    canUseGeneralConstructionKnowledge: true,
    canUsePdfAggregator: false,
    answerMode: "read",
  },
  {
    intent: "closeout_readiness",
    examplesRu: ["чо закрыть сегодня", "почему нельзя закрыть работу"],
    allowedSources: ["work", "photo", "document", "act", "approval", "warehouse_stock", "procurement_request"],
    requiredMinimumContext: "screen",
    canUseGeneralConstructionKnowledge: true,
    canUsePdfAggregator: true,
    answerMode: "read",
  },
  {
    intent: "missing_evidence_check",
    examplesRu: ["каких фото нехватает", "проверь evidence"],
    allowedSources: ["work", "photo", "document", "act", "report"],
    requiredMinimumContext: "screen",
    canUseGeneralConstructionKnowledge: true,
    canUsePdfAggregator: true,
    answerMode: "read",
  },
  {
    intent: "missing_photos_check",
    examplesRu: ["каких фото не хватает", "фото после выполнения"],
    allowedSources: ["work", "photo"],
    requiredMinimumContext: "screen",
    canUseGeneralConstructionKnowledge: true,
    canUsePdfAggregator: false,
    answerMode: "read",
  },
  {
    intent: "missing_documents_check",
    examplesRu: ["каких документов не хватает", "что по документам"],
    allowedSources: ["work", "document", "act", "report", "pdf_chunk"],
    requiredMinimumContext: "screen",
    canUseGeneralConstructionKnowledge: true,
    canUsePdfAggregator: true,
    answerMode: "read",
  },
  {
    intent: "signature_check",
    examplesRu: ["каких подписей не хватает", "проверить подписи"],
    allowedSources: ["work", "act", "document", "approval"],
    requiredMinimumContext: "screen",
    canUseGeneralConstructionKnowledge: true,
    canUsePdfAggregator: false,
    answerMode: "read",
  },
  {
    intent: "subcontractor_blockers",
    examplesRu: ["что по подрядчику", "что мешает подрядчику"],
    allowedSources: ["work", "subcontractor", "photo", "document", "act", "remark", "chat_message"],
    requiredMinimumContext: "screen",
    canUseGeneralConstructionKnowledge: true,
    canUsePdfAggregator: false,
    answerMode: "read",
  },
  {
    intent: "material_blockers",
    examplesRu: ["что по материалам", "какой материал блокирует"],
    allowedSources: ["work", "material", "warehouse_stock", "warehouse_issue", "procurement_request"],
    requiredMinimumContext: "screen",
    canUseGeneralConstructionKnowledge: true,
    canUsePdfAggregator: false,
    answerMode: "read",
  },
  {
    intent: "warehouse_linked_status",
    examplesRu: ["есть ли на складе", "склад по работе"],
    allowedSources: ["work", "material", "warehouse_stock", "warehouse_issue"],
    requiredMinimumContext: "screen",
    canUseGeneralConstructionKnowledge: false,
    canUsePdfAggregator: false,
    answerMode: "read",
  },
  {
    intent: "procurement_handoff",
    examplesRu: ["передать снабженцу", "заявка по материалу"],
    allowedSources: ["work", "material", "procurement_request", "warehouse_stock"],
    requiredMinimumContext: "screen",
    canUseGeneralConstructionKnowledge: true,
    canUsePdfAggregator: false,
    answerMode: "approval_route",
  },
  {
    intent: "estimate_comparison",
    examplesRu: ["сверь работы со сметой", "проверь количество по смете"],
    allowedSources: ["work", "estimate_line", "estimate_pdf", "boq", "object"],
    requiredMinimumContext: "screen",
    canUseGeneralConstructionKnowledge: false,
    canUsePdfAggregator: true,
    answerMode: "read",
  },
  {
    intent: "architecture_pdf_check",
    examplesRu: ["что по проекту", "сверь с архитектурой"],
    allowedSources: ["work", "object", "project_pdf", "architecture_pdf", "engineering_pdf", "pdf_chunk"],
    requiredMinimumContext: "screen",
    canUseGeneralConstructionKnowledge: true,
    canUsePdfAggregator: true,
    answerMode: "read",
  },
  {
    intent: "construction_norms_check",
    examplesRu: ["какие нормы нужны для закрытия", "покажи нормы"],
    allowedSources: ["general_construction_knowledge", "country_profile", "normative_pdf", "company_standard", "document"],
    requiredMinimumContext: "none",
    canUseGeneralConstructionKnowledge: true,
    canUsePdfAggregator: true,
    answerMode: "read",
  },
  {
    intent: "act_draft",
    examplesRu: ["какие акты можно подготовить", "подготовить акт"],
    allowedSources: ["work", "act", "photo", "document", "approval", "estimate_line"],
    requiredMinimumContext: "screen",
    canUseGeneralConstructionKnowledge: true,
    canUsePdfAggregator: true,
    answerMode: "draft",
  },
  {
    intent: "daily_report_draft",
    examplesRu: ["подготовить отчет", "ежедневный отчет"],
    allowedSources: ["work", "object", "zone", "photo", "report", "document"],
    requiredMinimumContext: "date",
    canUseGeneralConstructionKnowledge: true,
    canUsePdfAggregator: true,
    answerMode: "draft",
  },
  {
    intent: "contractor_message_draft",
    examplesRu: ["что написать подрядчику", "запроси фото у подрядчика"],
    allowedSources: ["work", "subcontractor", "photo", "document", "remark", "chat_message"],
    requiredMinimumContext: "screen",
    canUseGeneralConstructionKnowledge: true,
    canUsePdfAggregator: false,
    answerMode: "draft",
  },
  {
    intent: "approval_handoff",
    examplesRu: ["отправить на согласование", "какой approval"],
    allowedSources: ["work", "approval", "act", "document", "procurement_request"],
    requiredMinimumContext: "screen",
    canUseGeneralConstructionKnowledge: false,
    canUsePdfAggregator: false,
    answerMode: "approval_route",
  },
  {
    intent: "date_range_summary",
    examplesRu: ["покажи что было вчера и сегодня", "за неделю"],
    allowedSources: ["work", "object", "zone", "photo", "report"],
    requiredMinimumContext: "date",
    canUseGeneralConstructionKnowledge: true,
    canUsePdfAggregator: false,
    answerMode: "read",
  },
  {
    intent: "object_timeline",
    examplesRu: ["история объекта", "таймлайн по объекту"],
    allowedSources: ["work", "object", "zone", "photo", "report", "act", "chat_message"],
    requiredMinimumContext: "object",
    canUseGeneralConstructionKnowledge: true,
    canUsePdfAggregator: true,
    answerMode: "read",
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

export function getForemanIntentContract(intent: ForemanIntent): ForemanIntentContract {
  const contract = FOREMAN_INTENT_CONTRACTS.find((entry) => entry.intent === intent);
  if (!contract) throw new Error(`Missing foreman intent contract: ${intent}`);
  return {
    ...contract,
    examplesRu: [...contract.examplesRu],
    allowedSources: [...contract.allowedSources],
  };
}

export function routeForemanIntent(questionRu: string): ForemanIntentContract {
  const q = normalize(questionRu);

  if (hasAny(q, [/смет/, /boq/, /количеств/, /объем/, /объ[её]м/])) return getForemanIntentContract("estimate_comparison");
  if (hasAny(q, [/проект/, /архитект/, /чертеж/, /pdf/, /ар\b/, /кж\b/, /ов\b/, /вк\b/, /эл\b/])) return getForemanIntentContract("architecture_pdf_check");
  if (hasAny(q, [/норм/, /снип/, /гост/, /стандарт/, /страна/, /кыргыз/, /kg\b/])) return getForemanIntentContract("construction_norms_check");
  if (hasAny(q, [/материал/, /склад/, /остат/, /выдач/, /приход/])) return getForemanIntentContract("material_blockers");
  if (hasAny(q, [/снабжен/, /заявк/, /переда/])) return getForemanIntentContract("procurement_handoff");
  if (hasAny(q, [/подряд/, /субподряд/, /написа/, /сообщен/])) return getForemanIntentContract("contractor_message_draft");
  if (hasAny(q, [/акт/, /закрыт/, /приемк/, /приёмк/])) return getForemanIntentContract("act_draft");
  if (hasAny(q, [/фото/, /evidence/, /доказ/, /подтвержд/])) return getForemanIntentContract("missing_photos_check");
  if (hasAny(q, [/документ/, /подпис/])) return getForemanIntentContract("missing_documents_check");
  if (hasAny(q, [/меша/, /блок/, /почему нельзя/])) return getForemanIntentContract("closeout_readiness");
  if (hasAny(q, [/вчера/, /недел/, /диапазон/])) return getForemanIntentContract("date_range_summary");
  if (hasAny(q, [/не сдел/, /не выполн/, /просроч/])) return getForemanIntentContract("what_not_done_today");
  if (hasAny(q, [/что сдел/, /выполн/, /сделано/]) && !hasAny(q, [/что нет/, /не сдел/])) return getForemanIntentContract("what_done_today");
  if (hasAny(q, [/отчет/, /отчёт/, /объект/, /день/, /сегодня/, /что нет/])) return getForemanIntentContract("daily_object_report");

  return getForemanIntentContract("daily_object_report");
}

export const foremanIntentRouter = routeForemanIntent;
