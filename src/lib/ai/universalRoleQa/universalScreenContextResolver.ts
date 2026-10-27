import type { UniversalRoleQaFilters } from "./universalFilterExtractor";
import type { UniversalRoleQaIntent } from "./universalIntentClassifier";

export type UniversalScreenContext = {
  screenId: string;
  route: string;
  screenGoalRu: string;
  visibleEntityRefs: string[];
  defaultFilters?: UniversalRoleQaFilters;
  screenDefaultIntent?: UniversalRoleQaIntent;
  allowedActions: ("safe_read" | "draft_only" | "approval_required" | "forbidden")[];
  forbiddenActions: string[];
  uiLanguage: "ru";
};

const screenDefaults: Record<string, Omit<UniversalScreenContext, "screenId" | "route">> = {
  foreman: {
    screenGoalRu: "полевые работы, материалы, фото и закрытие работ",
    visibleEntityRefs: [],
    screenDefaultIntent: "field_work_review",
    allowedActions: ["safe_read", "draft_only"],
    forbiddenActions: ["close_work", "issue_stock", "approve_payment"],
    uiLanguage: "ru",
  },
  director: {
    screenGoalRu: "решения директора, approvals, риски и платежи",
    visibleEntityRefs: [],
    screenDefaultIntent: "director_decision_summary",
    allowedActions: ["safe_read", "draft_only", "approval_required"],
    forbiddenActions: ["auto_approval", "auto_payment"],
    uiLanguage: "ru",
  },
  buyer: {
    screenGoalRu: "заявки, закупки, поставщики и marketplace",
    visibleEntityRefs: [],
    screenDefaultIntent: "procurement_request_review",
    allowedActions: ["safe_read", "draft_only", "approval_required"],
    forbiddenActions: ["create_purchase_order", "submit_without_approval"],
    uiLanguage: "ru",
  },
  accountant: {
    screenGoalRu: "счета, платежи, документы и проводки",
    visibleEntityRefs: [],
    screenDefaultIntent: "finance_payment_review",
    allowedActions: ["safe_read", "draft_only", "approval_required"],
    forbiddenActions: ["post_payment", "auto_accounting_entry"],
    uiLanguage: "ru",
  },
  warehouse: {
    screenGoalRu: "остатки, приходы, выдачи и дефициты склада",
    visibleEntityRefs: [],
    screenDefaultIntent: "warehouse_stock_review",
    allowedActions: ["safe_read"],
    forbiddenActions: ["issue_stock", "write_off_stock"],
    uiLanguage: "ru",
  },
  contractor: {
    screenGoalRu: "свои работы, фото, замечания и приемка",
    visibleEntityRefs: [],
    screenDefaultIntent: "contractor_acceptance_review",
    allowedActions: ["safe_read", "draft_only"],
    forbiddenActions: ["see_other_contractors", "close_acceptance"],
    uiLanguage: "ru",
  },
  documents: {
    screenGoalRu: "документы, PDF, связи и блокеры документов",
    visibleEntityRefs: [],
    screenDefaultIntent: "document_pdf_explanation",
    allowedActions: ["safe_read"],
    forbiddenActions: ["delete_document", "sign_document"],
    uiLanguage: "ru",
  },
  market: {
    screenGoalRu: "товары, поставщики и карточки marketplace",
    visibleEntityRefs: [],
    screenDefaultIntent: "marketplace_supplier_search",
    allowedActions: ["safe_read", "draft_only"],
    forbiddenActions: ["publish_product_without_review"],
    uiLanguage: "ru",
  },
  office: {
    screenGoalRu: "офисные блокеры, документы и застрявшие работы",
    visibleEntityRefs: [],
    screenDefaultIntent: "office_stuck_work_review",
    allowedActions: ["safe_read", "draft_only"],
    forbiddenActions: ["unsafe_mutation"],
    uiLanguage: "ru",
  },
  client: {
    screenGoalRu: "клиентский прогресс без внутренних финансов",
    visibleEntityRefs: [],
    screenDefaultIntent: "client_progress_review",
    allowedActions: ["safe_read"],
    forbiddenActions: ["show_internal_finance", "show_runtime_debug"],
    uiLanguage: "ru",
  },
};

export function resolveUniversalScreenContext(
  screenId: string,
  route = `/ai?context=${screenId}`,
): UniversalScreenContext {
  const key = screenId.replace(/^ai[.:/-]?/, "").replace(/^context[.:/-]?/, "");
  const defaults = screenDefaults[key] ?? screenDefaults.office;
  return {
    screenId,
    route,
    ...defaults,
  };
}

export function listUniversalScreenContexts(): UniversalScreenContext[] {
  return Object.keys(screenDefaults).map((screenId) => resolveUniversalScreenContext(screenId));
}
