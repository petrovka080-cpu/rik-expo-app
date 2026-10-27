import type { ForemanActionQuestion } from "./foremanTypes";

export const FOREMAN_ACTION_QUESTION_MAP: readonly ForemanActionQuestion[] = [
  {
    screenId: "foreman.main",
    actionId: "daily_object_report",
    labelRu: "Что сделано / что нет",
    concreteQuestionRu:
      "Собери по объектам и датам, какие работы выполнены, какие не выполнены, что подтверждено фото/документами, что не закрыто.",
    allowedSources: ["work", "object", "photo", "act", "report", "document", "pdf_chunk", "chat_message"],
  },
  {
    screenId: "foreman.main",
    actionId: "closeout_readiness",
    labelRu: "Что мешает закрыть",
    concreteQuestionRu:
      "Проверь готовность работ к закрытию: фото, документы, подписи, акт, замечания, материалы, approval.",
    allowedSources: ["work", "photo", "document", "act", "approval", "warehouse_stock", "procurement_request"],
  },
  {
    screenId: "foreman.main",
    actionId: "missing_evidence_check",
    labelRu: "Проверить фото и документы",
    concreteQuestionRu:
      "Проверь, каких фото, документов, подписей и актов не хватает по сегодняшним работам.",
    allowedSources: ["work", "photo", "document", "act", "report"],
  },
  {
    screenId: "foreman.main",
    actionId: "daily_report_draft",
    labelRu: "Подготовить отчёт",
    concreteQuestionRu:
      "Подготовь черновик ежедневного отчёта по объектам: что сделано, что не сделано, чего не хватает и какие источники это подтверждают.",
    allowedSources: ["work", "object", "zone", "photo", "document", "report", "act", "chat_message"],
  },
  {
    screenId: "foreman.main",
    actionId: "act_draft",
    labelRu: "Подготовить акт",
    concreteQuestionRu:
      "Покажи, какие работы можно включить в черновик акта, а какие нельзя закрывать без фото, подписи, документа или согласования.",
    allowedSources: ["work", "act", "photo", "document", "approval", "estimate_line"],
  },
  {
    screenId: "foreman.main",
    actionId: "estimate_comparison",
    labelRu: "Сверить со сметой/проектом",
    concreteQuestionRu:
      "Сравни текущие работы с привязанной сметой, проектным PDF и архитектурными документами.",
    allowedSources: ["work", "estimate_line", "pdf_chunk", "document", "object"],
  },
  {
    screenId: "foreman.main",
    actionId: "material_blockers",
    labelRu: "Материалы и склад",
    concreteQuestionRu:
      "Проверь, какие материалы блокируют работы, есть ли остаток на складе, выдача или связанная заявка.",
    allowedSources: ["work", "material", "warehouse_stock", "warehouse_issue", "procurement_request"],
  },
  {
    screenId: "foreman.main",
    actionId: "contractor_message_draft",
    labelRu: "Написать подрядчику",
    concreteQuestionRu:
      "Подготовь черновик сообщения подрядчику с конкретным списком недостающих фото, документов, подписей и замечаний.",
    allowedSources: ["work", "subcontractor", "photo", "document", "remark", "chat_message"],
  },
  {
    screenId: "foreman.ai.quick_modal",
    actionId: "daily_object_report",
    labelRu: "Отчёт по объектам",
    concreteQuestionRu:
      "Собери быстрый отчёт по объектам: сделано, не сделано, источники, missing data и следующий безопасный шаг.",
    allowedSources: ["work", "object", "photo", "report", "act", "document"],
  },
  {
    screenId: "foreman.ai.quick_modal",
    actionId: "act_draft",
    labelRu: "Акт по работе",
    concreteQuestionRu:
      "Подготовь черновик акта по доступным работам и покажи, что нельзя включать без подтверждений.",
    allowedSources: ["work", "act", "photo", "document", "approval"],
  },
  {
    screenId: "foreman.ai.quick_modal",
    actionId: "missing_evidence_check",
    labelRu: "Список missing evidence",
    concreteQuestionRu:
      "Собери список недостающих фото, документов, подписей и актов по работам.",
    allowedSources: ["work", "photo", "document", "act"],
  },
  {
    screenId: "foreman.ai.quick_modal",
    actionId: "contractor_message_draft",
    labelRu: "Сообщение подрядчику",
    concreteQuestionRu:
      "Подготовь черновик сообщения подрядчику: что сдать, какие фото и документы приложить, какие замечания закрыть.",
    allowedSources: ["work", "subcontractor", "photo", "document", "remark"],
  },
  {
    screenId: "foreman.ai.quick_modal",
    actionId: "estimate_comparison",
    labelRu: "Сверка со сметой/проектом",
    concreteQuestionRu:
      "Сверь работы с источниками сметы и проектными PDF, не выдумывая требования без источника.",
    allowedSources: ["work", "estimate_line", "pdf_chunk", "document"],
  },
  {
    screenId: "foreman.ai.quick_modal",
    actionId: "material_blockers",
    labelRu: "Материальные blockers",
    concreteQuestionRu:
      "Покажи материалы, которые блокируют работы, связанный складской статус и заявку снабжения.",
    allowedSources: ["work", "material", "warehouse_stock", "procurement_request"],
  },
  {
    screenId: "foreman.subcontract",
    actionId: "subcontractor_blockers",
    labelRu: "Что мешает приёмке",
    concreteQuestionRu:
      "Проверь, что подрядчик сделал, что не подтвердил, какие фото, акты, подписи и замечания мешают приёмке.",
    allowedSources: ["work", "subcontractor", "photo", "act", "document", "remark"],
  },
  {
    screenId: "foreman.subcontract",
    actionId: "missing_evidence_check",
    labelRu: "Запросить фото/документы",
    concreteQuestionRu:
      "Собери запрос подрядчику на недостающие фото, документы и подписи.",
    allowedSources: ["work", "subcontractor", "photo", "document"],
  },
  {
    screenId: "foreman.subcontract",
    actionId: "act_draft",
    labelRu: "Подготовить акт",
    concreteQuestionRu:
      "Проверь, можно ли готовить черновик акта по подрядчику и что нельзя закрывать.",
    allowedSources: ["work", "subcontractor", "act", "photo", "document", "approval"],
  },
  {
    screenId: "foreman.subcontract",
    actionId: "contractor_message_draft",
    labelRu: "Написать подрядчику",
    concreteQuestionRu:
      "Подготовь черновик сообщения подрядчику с конкретным списком недостающих подтверждений.",
    allowedSources: ["work", "subcontractor", "photo", "document", "remark", "chat_message"],
  },
  {
    screenId: "foreman.subcontract",
    actionId: "subcontractor_blockers",
    labelRu: "Проверить замечания",
    concreteQuestionRu:
      "Проверь открытые замечания подрядчика и покажи, что мешает приёмке.",
    allowedSources: ["work", "subcontractor", "remark", "photo", "document"],
  },
] as const;

export function getForemanActionQuestion(actionId: string, screenId?: string): ForemanActionQuestion | null {
  return FOREMAN_ACTION_QUESTION_MAP.find((action) =>
    action.actionId === actionId && (!screenId || action.screenId === screenId),
  ) ?? null;
}
