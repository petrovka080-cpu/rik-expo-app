import type {
  DirectorCompanySourceType,
  DirectorIntent,
  DirectorIntentContract,
} from "./directorCompanyTypes";

const ALL_DIRECTOR_SOURCES: DirectorCompanySourceType[] = [
  "work",
  "object",
  "contractor",
  "procurement_request",
  "supplier_offer",
  "marketplace_offer",
  "warehouse_stock",
  "warehouse_incoming",
  "warehouse_issue",
  "payment",
  "invoice",
  "act",
  "cashflow",
  "document",
  "pdf_chunk",
  "report",
  "approval",
  "chat_message",
  "office_task",
  "security_summary",
];

function contract(
  intent: DirectorIntent,
  examplesRu: string[],
  requiredContext: DirectorIntentContract["requiredContext"],
  allowedSources: DirectorCompanySourceType[],
  answerMode: DirectorIntentContract["answerMode"] = "read",
): DirectorIntentContract {
  return { intent, examplesRu, requiredContext, allowedSources, answerMode };
}

export const DIRECTOR_INTENT_CONTRACTS: readonly DirectorIntentContract[] = [
  contract("today_decision_queue", ["что мне решить сегодня", "главные решения"], "company", ALL_DIRECTOR_SOURCES),
  contract("top_company_risks", ["главные риски компании", "что горит"], "company", ALL_DIRECTOR_SOURCES),
  contract("blocked_objects_summary", ["что блокирует объекты", "какие объекты стоят"], "company", ["object", "work", "warehouse_stock", "procurement_request", "payment", "document", "approval", "contractor"]),
  contract("approval_queue_review", ["что ждёт согласования", "открой approvals"], "approval", ["approval", "payment", "invoice", "procurement_request", "document", "work"], "approval_route"),
  contract("finance_risk_summary", ["что по деньгам", "риски по деньгам", "какие платежи рискованные"], "period", ["payment", "invoice", "act", "cashflow", "approval", "document"]),
  contract("cashflow_risk_summary", ["cashflow", "движение денег", "прогноз денег"], "period", ["cashflow", "payment", "invoice", "approval"]),
  contract("procurement_blockers", ["риски по закупкам", "какие закупки зависли"], "company", ["procurement_request", "supplier_offer", "marketplace_offer", "warehouse_stock", "work", "object"]),
  contract("supplier_delivery_risks", ["поставщики тормозят", "сроки поставки"], "company", ["supplier_offer", "procurement_request", "warehouse_incoming", "work", "object"]),
  contract("warehouse_deficits", ["риски по складу", "материалы блокируют"], "material", ["warehouse_stock", "warehouse_incoming", "warehouse_issue", "procurement_request", "work", "object"]),
  contract("incoming_discrepancies", ["расхождения прихода", "что пришло не так"], "company", ["warehouse_incoming", "document", "invoice", "procurement_request"]),
  contract("field_closeout_blockers", ["что не закрывается", "акты нельзя закрыть"], "company", ["work", "object", "contractor", "act", "document", "report"]),
  contract("contractor_blockers", ["подрядчики тормозят", "кто не сдал документы"], "company", ["contractor", "work", "document", "report", "chat_message"]),
  contract("document_evidence_gaps", ["каких документов не хватает", "какие evidence мешают"], "company", ["document", "pdf_chunk", "report", "act", "work", "approval"]),
  contract("office_stuck_work", ["где застрял офис", "office stuck"], "company", ["office_task", "document", "approval", "chat_message"]),
  contract("company_timeline", ["покажи timeline", "цепочка компании"], "company", ALL_DIRECTOR_SOURCES),
  contract("object_chain_trace", ["цепочка по объекту", "покажи всю цепочку"], "object", ALL_DIRECTOR_SOURCES),
  contract("weekly_executive_summary", ["summary за неделю", "executive summary"], "period", ALL_DIRECTOR_SOURCES, "draft"),
  contract("director_delegation_draft", ["кому что поручить", "подготовь поручения"], "company", ALL_DIRECTOR_SOURCES, "draft"),
  contract("approval_rationale_review", ["rationale approval", "почему согласовывать"], "approval", ["approval", "payment", "invoice", "document", "procurement_request", "work"], "approval_route"),
  contract("security_safe_summary", ["security summary", "безопасность"], "company", ["security_summary", "approval"], "read"),
];

const INTENT_BY_NAME = new Map(DIRECTOR_INTENT_CONTRACTS.map((item) => [item.intent, item]));

export function getDirectorIntentContract(intent: DirectorIntent): DirectorIntentContract {
  const contractEntry = INTENT_BY_NAME.get(intent);
  if (!contractEntry) return DIRECTOR_INTENT_CONTRACTS[0]!;
  return contractEntry;
}

export function routeDirectorIntent(questionRu: string): DirectorIntentContract {
  const q = questionRu.toLowerCase();
  if (q.includes("соглас") || q.includes("approval") || q.includes("апрув")) return getDirectorIntentContract("approval_queue_review");
  if (q.includes("деньг") || q.includes("плат") || q.includes("сч") || q.includes("invoice")) return getDirectorIntentContract("finance_risk_summary");
  if (q.includes("cashflow") || q.includes("движение денег") || q.includes("прогноз")) return getDirectorIntentContract("cashflow_risk_summary");
  if (q.includes("закуп") || q.includes("снаб") || q.includes("поставщик")) return getDirectorIntentContract("procurement_blockers");
  if (q.includes("склад") || q.includes("материал") || q.includes("дефицит")) return getDirectorIntentContract("warehouse_deficits");
  if (q.includes("приход") || q.includes("расхожд")) return getDirectorIntentContract("incoming_discrepancies");
  if (q.includes("подряд")) return getDirectorIntentContract("contractor_blockers");
  if (q.includes("документ") || q.includes("evidence") || q.includes("акт")) return getDirectorIntentContract("document_evidence_gaps");
  if (q.includes("офис") || q.includes("stuck")) return getDirectorIntentContract("office_stuck_work");
  if (q.includes("цепоч") || q.includes("timeline")) return getDirectorIntentContract("object_chain_trace");
  if (q.includes("security") || q.includes("безопас")) return getDirectorIntentContract("security_safe_summary");
  if (q.includes("summary") || q.includes("недел") || q.includes("отч")) return getDirectorIntentContract("weekly_executive_summary");
  if (q.includes("поруч") || q.includes("кому что")) return getDirectorIntentContract("director_delegation_draft");
  if (q.includes("блокир") || q.includes("объект")) return getDirectorIntentContract("blocked_objects_summary");
  if (q.includes("риск") || q.includes("горит")) return getDirectorIntentContract("top_company_risks");
  return getDirectorIntentContract("today_decision_queue");
}
