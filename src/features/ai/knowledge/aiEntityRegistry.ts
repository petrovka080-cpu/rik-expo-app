import type { AiUserRole } from "../policy/aiRolePolicy";
import type {
  AiBusinessEntity,
  AiEntityKnowledgeEntry,
  AiIntent,
} from "./aiKnowledgeTypes";

export const REQUIRED_AI_BUSINESS_ENTITIES: readonly AiBusinessEntity[] = [
  "project",
  "request",
  "supplier",
  "material",
  "warehouse_item",
  "stock_movement",
  "payment",
  "company_debt",
  "accounting_posting",
  "report",
  "pdf_document",
  "act",
  "subcontract",
  "contractor",
  "chat_thread",
  "map_object",
  "office_member",
  "invite",
];

const PROCUREMENT_ROLES: readonly AiUserRole[] = ["director", "control", "buyer"];
const PROJECT_ROLES: readonly AiUserRole[] = ["director", "control", "foreman"];
const FINANCE_ROLES: readonly AiUserRole[] = ["director", "control", "accountant"];
const WAREHOUSE_ROLES: readonly AiUserRole[] = ["director", "control", "warehouse"];
const CONTRACTOR_ROLES: readonly AiUserRole[] = ["director", "control", "foreman", "contractor"];
const OFFICE_ROLES: readonly AiUserRole[] = ["director", "control", "office", "admin"];
const COMMON_READ_INTENTS: readonly AiIntent[] = ["find", "summarize", "explain", "check_status", "find_risk"];

export const AI_ENTITY_KNOWLEDGE_REGISTRY: readonly AiEntityKnowledgeEntry[] = [
  {
    entity: "project",
    label: "Project",
    domains: ["projects", "control", "reports", "map"],
    readableByRoles: PROJECT_ROLES,
    sensitiveFieldsPolicy: "redact_ids",
    usefulForIntents: COMMON_READ_INTENTS,
    evidenceRequired: true,
  },
  {
    entity: "request",
    label: "Request",
    domains: ["procurement", "projects", "warehouse", "control"],
    readableByRoles: ["director", "control", "foreman", "buyer", "warehouse"],
    sensitiveFieldsPolicy: "redact_ids",
    usefulForIntents: [...COMMON_READ_INTENTS, "draft", "prepare_request", "submit_for_approval"],
    evidenceRequired: true,
  },
  {
    entity: "supplier",
    label: "Supplier",
    domains: ["procurement", "marketplace", "control", "map"],
    readableByRoles: PROCUREMENT_ROLES,
    sensitiveFieldsPolicy: "redact_internal",
    usefulForIntents: ["find", "compare", "explain", "find_risk", "draft"],
    evidenceRequired: true,
  },
  {
    entity: "material",
    label: "Material",
    domains: ["procurement", "marketplace", "warehouse", "projects"],
    readableByRoles: ["director", "control", "foreman", "buyer", "warehouse"],
    sensitiveFieldsPolicy: "none",
    usefulForIntents: ["find", "compare", "explain", "draft", "prepare_request", "check_status"],
    evidenceRequired: true,
  },
  {
    entity: "warehouse_item",
    label: "Warehouse item",
    domains: ["warehouse", "control", "reports"],
    readableByRoles: WAREHOUSE_ROLES,
    sensitiveFieldsPolicy: "redact_ids",
    usefulForIntents: COMMON_READ_INTENTS,
    evidenceRequired: true,
  },
  {
    entity: "stock_movement",
    label: "Stock movement",
    domains: ["warehouse", "reports"],
    readableByRoles: WAREHOUSE_ROLES,
    sensitiveFieldsPolicy: "redact_ids",
    usefulForIntents: COMMON_READ_INTENTS,
    evidenceRequired: true,
  },
  {
    entity: "payment",
    label: "Payment",
    domains: ["finance", "documents", "reports"],
    readableByRoles: FINANCE_ROLES,
    sensitiveFieldsPolicy: "redact_finance",
    usefulForIntents: ["find", "summarize", "explain", "check_status", "find_risk", "submit_for_approval"],
    evidenceRequired: true,
  },
  {
    entity: "company_debt",
    label: "Company debt",
    domains: ["finance", "reports", "control"],
    readableByRoles: FINANCE_ROLES,
    sensitiveFieldsPolicy: "redact_finance",
    usefulForIntents: ["find", "summarize", "explain", "find_risk"],
    evidenceRequired: true,
  },
  {
    entity: "accounting_posting",
    label: "Accounting posting",
    domains: ["finance"],
    readableByRoles: FINANCE_ROLES,
    sensitiveFieldsPolicy: "redact_finance",
    usefulForIntents: ["find", "summarize", "explain", "check_status"],
    evidenceRequired: true,
  },
  {
    entity: "report",
    label: "Report",
    domains: ["reports", "projects", "warehouse", "finance", "subcontracts", "control"],
    readableByRoles: ["director", "control", "foreman", "buyer", "accountant", "warehouse", "contractor"],
    sensitiveFieldsPolicy: "redact_ids",
    usefulForIntents: ["find", "summarize", "explain", "prepare_report", "find_risk"],
    evidenceRequired: true,
  },
  {
    entity: "pdf_document",
    label: "PDF document",
    domains: ["documents", "reports", "finance", "subcontracts", "warehouse"],
    readableByRoles: ["director", "control", "foreman", "buyer", "accountant", "warehouse", "contractor", "office", "admin"],
    sensitiveFieldsPolicy: "redact_ids",
    usefulForIntents: ["find", "summarize", "explain", "draft", "submit_for_approval"],
    evidenceRequired: true,
  },
  {
    entity: "act",
    label: "Act",
    domains: ["documents", "subcontracts", "finance", "reports"],
    readableByRoles: ["director", "control", "foreman", "accountant", "contractor"],
    sensitiveFieldsPolicy: "redact_ids",
    usefulForIntents: ["find", "summarize", "prepare_act", "submit_for_approval"],
    evidenceRequired: true,
  },
  {
    entity: "subcontract",
    label: "Subcontract",
    domains: ["subcontracts", "contractors", "reports"],
    readableByRoles: CONTRACTOR_ROLES,
    sensitiveFieldsPolicy: "own_records_only",
    usefulForIntents: ["find", "summarize", "explain", "prepare_act", "check_status"],
    evidenceRequired: true,
  },
  {
    entity: "contractor",
    label: "Contractor",
    domains: ["contractors", "subcontracts", "control"],
    readableByRoles: CONTRACTOR_ROLES,
    sensitiveFieldsPolicy: "own_records_only",
    usefulForIntents: ["find", "summarize", "explain", "find_risk"],
    evidenceRequired: true,
  },
  {
    entity: "chat_thread",
    label: "Chat thread",
    domains: ["chat"],
    readableByRoles: ["director", "control", "foreman", "buyer", "accountant", "warehouse", "contractor", "office", "admin"],
    sensitiveFieldsPolicy: "redact_internal",
    usefulForIntents: ["find", "summarize", "explain", "draft"],
    evidenceRequired: true,
  },
  {
    entity: "map_object",
    label: "Map object",
    domains: ["map", "marketplace", "projects"],
    readableByRoles: ["director", "control", "foreman", "buyer"],
    sensitiveFieldsPolicy: "redact_ids",
    usefulForIntents: ["find", "compare", "explain"],
    evidenceRequired: true,
  },
  {
    entity: "office_member",
    label: "Office member",
    domains: ["office"],
    readableByRoles: OFFICE_ROLES,
    sensitiveFieldsPolicy: "redact_ids",
    usefulForIntents: ["find", "summarize", "explain"],
    evidenceRequired: false,
  },
  {
    entity: "invite",
    label: "Invite",
    domains: ["office"],
    readableByRoles: OFFICE_ROLES,
    sensitiveFieldsPolicy: "redact_ids",
    usefulForIntents: ["find", "explain", "draft", "submit_for_approval"],
    evidenceRequired: false,
  },
];

export function getAiEntityKnowledge(entity: AiBusinessEntity): AiEntityKnowledgeEntry | null {
  return AI_ENTITY_KNOWLEDGE_REGISTRY.find((entry) => entry.entity === entity) ?? null;
}

export function listAiEntityKnowledge(): AiEntityKnowledgeEntry[] {
  return [...AI_ENTITY_KNOWLEDGE_REGISTRY];
}
