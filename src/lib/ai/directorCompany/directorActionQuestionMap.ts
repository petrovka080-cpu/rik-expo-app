import type {
  DirectorActionQuestion,
  DirectorCompanyScreenId,
  DirectorIntent,
} from "./directorCompanyTypes";

export const DIRECTOR_ACTION_QUESTION_MAP: readonly DirectorActionQuestion[] = [
  {
    screenId: "director.dashboard",
    actionId: "today_decision_queue",
    labelRu: "Что решить сегодня",
    concreteQuestionRu:
      "Собери очередь решений директора на сегодня: approvals, платежи, закупки, складские дефициты, полевые blockers, документы и риски.",
    requiredContext: ["company", "period"],
    allowedSources: ["approval", "payment", "invoice", "procurement_request", "warehouse_stock", "warehouse_incoming", "work", "document", "report", "office_task"],
    answerMode: "read",
  },
  {
    screenId: "director.dashboard",
    actionId: "blocked_objects_summary",
    labelRu: "Что блокирует объекты",
    concreteQuestionRu:
      "Покажи объекты и работы, которые заблокированы материалами, документами, подрядчиками, складами, платежами или approvals.",
    requiredContext: ["company"],
    allowedSources: ["object", "work", "warehouse_stock", "procurement_request", "payment", "document", "approval", "contractor"],
    answerMode: "read",
  },
  {
    screenId: "director.dashboard",
    actionId: "finance_risk_summary",
    labelRu: "Риски по деньгам",
    concreteQuestionRu:
      "Покажи финансовые риски: платежи без документов, invoices без основания, cashflow risks, overdue approvals и суммы, требующие решения.",
    requiredContext: ["period"],
    allowedSources: ["payment", "invoice", "act", "cashflow", "approval", "document"],
    answerMode: "read",
  },
  {
    screenId: "director.dashboard",
    actionId: "procurement_blockers",
    labelRu: "Риски по закупкам",
    concreteQuestionRu:
      "Покажи закупочные blockers: заявки без поставщиков, supplier risks, marketplace gaps, delivery risks и что блокирует работы.",
    requiredContext: ["company"],
    allowedSources: ["procurement_request", "supplier_offer", "marketplace_offer", "warehouse_stock", "work", "object"],
    answerMode: "read",
  },
  {
    screenId: "director.dashboard",
    actionId: "warehouse_deficits",
    labelRu: "Риски по складу",
    concreteQuestionRu:
      "Покажи складские дефициты, incoming discrepancies, issue blockers, reservations и материалы, которые блокируют объекты.",
    requiredContext: ["company"],
    allowedSources: ["warehouse_stock", "warehouse_incoming", "warehouse_issue", "procurement_request", "work", "object"],
    answerMode: "read",
  },
  {
    screenId: "director.dashboard",
    actionId: "document_evidence_gaps",
    labelRu: "Документы и evidence",
    concreteQuestionRu:
      "Покажи документы, акты, reports и evidence, которые блокируют оплату, закрытие работ или approval.",
    requiredContext: ["company"],
    allowedSources: ["document", "pdf_chunk", "report", "act", "work", "approval"],
    answerMode: "read",
  },
  {
    screenId: "director.dashboard",
    actionId: "director_delegation_draft",
    labelRu: "Подготовить поручения",
    concreteQuestionRu:
      "Подготовь черновик поручений по ролям: бухгалтеру, снабженцу, складу, прорабу, офису — с причинами и источниками.",
    requiredContext: ["company"],
    allowedSources: ["approval", "payment", "procurement_request", "warehouse_stock", "work", "document", "office_task"],
    answerMode: "draft",
  },
  {
    screenId: "director.dashboard",
    actionId: "approval_queue_review",
    labelRu: "Открыть approvals",
    concreteQuestionRu:
      "Покажи pending approvals с рисками, источниками и причинами, но без автоматического approve/reject.",
    requiredContext: ["approval"],
    allowedSources: ["approval", "payment", "invoice", "procurement_request", "document", "work"],
    answerMode: "approval_route",
  },
  {
    screenId: "director.reports",
    actionId: "weekly_executive_summary",
    labelRu: "Сформировать summary",
    concreteQuestionRu:
      "Сформируй executive summary по стройке, закупкам, складу, финансам, документам, офису и approvals без финальной отправки.",
    requiredContext: ["period"],
    allowedSources: ["work", "procurement_request", "warehouse_stock", "payment", "invoice", "document", "report", "office_task", "approval"],
    answerMode: "draft",
  },
  {
    screenId: "ai.command_center",
    actionId: "director_delegation_draft",
    labelRu: "Подготовить поручение",
    concreteQuestionRu:
      "Подготовь role-specific безопасные действия для бухгалтерии, снабжения, склада, прораба и офиса с источниками.",
    requiredContext: ["company"],
    allowedSources: ["approval", "payment", "procurement_request", "warehouse_stock", "work", "document", "office_task"],
    answerMode: "draft",
  },
];

export function getDirectorActionQuestion(
  actionId: DirectorIntent,
  screenId: DirectorCompanyScreenId = "director.dashboard",
): DirectorActionQuestion | null {
  return (
    DIRECTOR_ACTION_QUESTION_MAP.find((item) => item.screenId === screenId && item.actionId === actionId) ??
    DIRECTOR_ACTION_QUESTION_MAP.find((item) => item.actionId === actionId) ??
    null
  );
}
