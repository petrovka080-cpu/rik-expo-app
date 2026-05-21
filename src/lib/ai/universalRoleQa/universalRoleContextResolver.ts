export type UniversalRoleQaSourceOrigin =
  | "app_context_graph"
  | "app_data"
  | "pdf_document"
  | "internal_marketplace"
  | "approved_vendor"
  | "supplier_history"
  | "purchase_history"
  | "external_marketplace"
  | "official_regulation"
  | "manufacturer_manual"
  | "public_web"
  | "general_construction_knowledge"
  | "accounting_reference"
  | "tax_reference"
  | "demo_fixture"
  | "unknown";

export type UniversalRoleQaRole =
  | "director"
  | "foreman"
  | "buyer"
  | "accountant"
  | "warehouse"
  | "contractor"
  | "office"
  | "client"
  | "admin"
  | "security"
  | "marketplace_user";

export type UniversalRoleContext = {
  role: UniversalRoleQaRole;
  defaultGoalRu: string;
  allowedDomains: (
    | "procurement"
    | "warehouse"
    | "finance"
    | "field"
    | "documents"
    | "marketplace"
    | "reports"
    | "office"
    | "client"
    | "security"
    | "construction_knowledge"
    | "accounting_knowledge"
    | "public_web"
  )[];
  forbiddenDomains: string[];
  canUsePublicWebForPublicQuestions: boolean;
  canSeeFinanceDetails: boolean;
  canSeeOtherContractors: boolean;
  canSeeRuntimeDebug: boolean;
  defaultSourceOrder: UniversalRoleQaSourceOrigin[];
};

const baseSourceOrder: UniversalRoleQaSourceOrigin[] = [
  "app_context_graph",
  "app_data",
  "pdf_document",
  "internal_marketplace",
  "supplier_history",
  "purchase_history",
];

export const UNIVERSAL_ROLE_CONTEXTS: Readonly<Record<UniversalRoleQaRole, UniversalRoleContext>> = Object.freeze({
  director: {
    role: "director",
    defaultGoalRu: "решить approvals, риски, платежи, закупки и блокеры объекта",
    allowedDomains: ["procurement", "warehouse", "finance", "field", "documents", "marketplace", "reports", "office", "construction_knowledge", "accounting_knowledge", "public_web"],
    forbiddenDomains: [],
    canUsePublicWebForPublicQuestions: true,
    canSeeFinanceDetails: true,
    canSeeOtherContractors: true,
    canSeeRuntimeDebug: false,
    defaultSourceOrder: baseSourceOrder,
  },
  foreman: {
    role: "foreman",
    defaultGoalRu: "закрыть работы, материалы, фото, акты и полевые блокеры",
    allowedDomains: ["procurement", "warehouse", "field", "documents", "reports", "construction_knowledge", "public_web"],
    forbiddenDomains: ["security"],
    canUsePublicWebForPublicQuestions: true,
    canSeeFinanceDetails: false,
    canSeeOtherContractors: false,
    canSeeRuntimeDebug: false,
    defaultSourceOrder: ["app_context_graph", "app_data", "pdf_document", "general_construction_knowledge"],
  },
  buyer: {
    role: "buyer",
    defaultGoalRu: "купить утвержденные заявки с учетом склада и поставщиков",
    allowedDomains: ["procurement", "warehouse", "documents", "marketplace", "reports", "construction_knowledge", "public_web"],
    forbiddenDomains: ["security"],
    canUsePublicWebForPublicQuestions: true,
    canSeeFinanceDetails: false,
    canSeeOtherContractors: false,
    canSeeRuntimeDebug: false,
    defaultSourceOrder: baseSourceOrder,
  },
  accountant: {
    role: "accountant",
    defaultGoalRu: "проверить платежи, счета, акты, долги и бухгалтерские блокеры",
    allowedDomains: ["procurement", "warehouse", "finance", "documents", "reports", "accounting_knowledge", "public_web"],
    forbiddenDomains: ["security"],
    canUsePublicWebForPublicQuestions: true,
    canSeeFinanceDetails: true,
    canSeeOtherContractors: false,
    canSeeRuntimeDebug: false,
    defaultSourceOrder: ["app_context_graph", "app_data", "pdf_document", "accounting_reference"],
  },
  warehouse: {
    role: "warehouse",
    defaultGoalRu: "показать остатки, приходы, выдачи, резервы и дефициты",
    allowedDomains: ["procurement", "warehouse", "field", "documents", "marketplace", "reports"],
    forbiddenDomains: ["finance", "security"],
    canUsePublicWebForPublicQuestions: false,
    canSeeFinanceDetails: false,
    canSeeOtherContractors: false,
    canSeeRuntimeDebug: false,
    defaultSourceOrder: ["app_context_graph", "app_data", "internal_marketplace"],
  },
  contractor: {
    role: "contractor",
    defaultGoalRu: "показать только свои работы, замечания, фото, акты и блокеры оплаты",
    allowedDomains: ["field", "documents", "reports", "construction_knowledge"],
    forbiddenDomains: ["finance", "security", "other_contractors"],
    canUsePublicWebForPublicQuestions: false,
    canSeeFinanceDetails: false,
    canSeeOtherContractors: false,
    canSeeRuntimeDebug: false,
    defaultSourceOrder: ["app_context_graph", "app_data", "pdf_document"],
  },
  office: {
    role: "office",
    defaultGoalRu: "найти застрявшие работы, документы и офисные блокеры",
    allowedDomains: ["procurement", "field", "documents", "reports", "office", "public_web"],
    forbiddenDomains: ["security"],
    canUsePublicWebForPublicQuestions: true,
    canSeeFinanceDetails: false,
    canSeeOtherContractors: false,
    canSeeRuntimeDebug: false,
    defaultSourceOrder: baseSourceOrder,
  },
  client: {
    role: "client",
    defaultGoalRu: "показать прогресс проекта без внутренних финансов и runtime деталей",
    allowedDomains: ["field", "documents", "reports", "client"],
    forbiddenDomains: ["finance", "security", "runtime"],
    canUsePublicWebForPublicQuestions: false,
    canSeeFinanceDetails: false,
    canSeeOtherContractors: false,
    canSeeRuntimeDebug: false,
    defaultSourceOrder: ["app_context_graph", "app_data", "pdf_document"],
  },
  admin: {
    role: "admin",
    defaultGoalRu: "проверить доступы и админские отчеты без обхода согласования",
    allowedDomains: ["documents", "reports", "security"],
    forbiddenDomains: [],
    canUsePublicWebForPublicQuestions: false,
    canSeeFinanceDetails: false,
    canSeeOtherContractors: true,
    canSeeRuntimeDebug: false,
    defaultSourceOrder: ["app_context_graph", "app_data"],
  },
  security: {
    role: "security",
    defaultGoalRu: "проверить безопасность без раскрытия runtime/debug/secrets",
    allowedDomains: ["security", "reports"],
    forbiddenDomains: ["runtime_debug", "secrets"],
    canUsePublicWebForPublicQuestions: false,
    canSeeFinanceDetails: false,
    canSeeOtherContractors: false,
    canSeeRuntimeDebug: false,
    defaultSourceOrder: ["app_context_graph", "app_data"],
  },
  marketplace_user: {
    role: "marketplace_user",
    defaultGoalRu: "подготовить карточку товара, характеристики и похожие товары",
    allowedDomains: ["marketplace", "construction_knowledge", "public_web"],
    forbiddenDomains: ["finance", "security"],
    canUsePublicWebForPublicQuestions: true,
    canSeeFinanceDetails: false,
    canSeeOtherContractors: false,
    canSeeRuntimeDebug: false,
    defaultSourceOrder: ["internal_marketplace", "supplier_history", "public_web", "general_construction_knowledge"],
  },
});

export function resolveUniversalRoleContext(role: string): UniversalRoleContext {
  return UNIVERSAL_ROLE_CONTEXTS[(role as UniversalRoleQaRole) in UNIVERSAL_ROLE_CONTEXTS ? role as UniversalRoleQaRole : "office"];
}

export function listUniversalRoleContexts(): UniversalRoleContext[] {
  return Object.values(UNIVERSAL_ROLE_CONTEXTS);
}
