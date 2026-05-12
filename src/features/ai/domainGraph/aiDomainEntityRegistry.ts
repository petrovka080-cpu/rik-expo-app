import type { AiUserRole } from "../policy/aiRolePolicy";
import type { AiDomainEntityEntry } from "./aiDomainEntityTypes";

const CONTROL_ROLES: readonly AiUserRole[] = ["director", "control"];
const OPERATIONS_ROLES: readonly AiUserRole[] = ["director", "control", "foreman", "buyer", "warehouse"];
const FINANCE_ROLES: readonly AiUserRole[] = ["director", "control", "accountant"];
const CONTRACT_ROLES: readonly AiUserRole[] = ["director", "control", "foreman", "contractor"];
const OFFICE_ROLES: readonly AiUserRole[] = ["director", "control", "office", "admin"];

export const AI_DOMAIN_ENTITY_REGISTRY: readonly AiDomainEntityEntry[] = [
  { entity: "project", domains: ["control", "procurement", "reports", "subcontracts"], readableByRoles: [...CONTROL_ROLES, "foreman", "buyer"], evidenceRequired: true, rawRowsAllowed: false, sensitive: "redact_ids" },
  { entity: "request", domains: ["procurement", "marketplace", "warehouse"], readableByRoles: OPERATIONS_ROLES, evidenceRequired: true, rawRowsAllowed: false, sensitive: "redact_ids" },
  { entity: "supplier", domains: ["procurement", "marketplace", "finance"], readableByRoles: ["director", "control", "buyer", "accountant"], evidenceRequired: true, rawRowsAllowed: false, sensitive: "redact_ids" },
  { entity: "material", domains: ["procurement", "marketplace", "warehouse"], readableByRoles: OPERATIONS_ROLES, evidenceRequired: true, rawRowsAllowed: false, sensitive: "none" },
  { entity: "warehouse_item", domains: ["warehouse", "procurement"], readableByRoles: OPERATIONS_ROLES, evidenceRequired: true, rawRowsAllowed: false, sensitive: "redact_ids" },
  { entity: "stock_movement", domains: ["warehouse"], readableByRoles: ["director", "control", "warehouse"], evidenceRequired: true, rawRowsAllowed: false, sensitive: "redact_ids" },
  { entity: "payment", domains: ["finance", "documents"], readableByRoles: FINANCE_ROLES, evidenceRequired: true, rawRowsAllowed: false, sensitive: "redact_finance" },
  { entity: "company_debt", domains: ["finance"], readableByRoles: FINANCE_ROLES, evidenceRequired: true, rawRowsAllowed: false, sensitive: "redact_finance" },
  { entity: "accounting_posting", domains: ["finance"], readableByRoles: FINANCE_ROLES, evidenceRequired: true, rawRowsAllowed: false, sensitive: "redact_finance" },
  { entity: "report", domains: ["reports", "control", "warehouse", "subcontracts"], readableByRoles: ["director", "control", "foreman", "buyer", "accountant", "warehouse", "contractor"], evidenceRequired: true, rawRowsAllowed: false, sensitive: "redact_ids" },
  { entity: "pdf_document", domains: ["documents", "reports", "finance", "warehouse", "subcontracts"], readableByRoles: ["director", "control", "foreman", "buyer", "accountant", "warehouse", "contractor"], evidenceRequired: true, rawRowsAllowed: false, sensitive: "redact_ids" },
  { entity: "act", domains: ["documents", "subcontracts", "finance"], readableByRoles: CONTRACT_ROLES, evidenceRequired: true, rawRowsAllowed: false, sensitive: "redact_ids" },
  { entity: "subcontract", domains: ["subcontracts"], readableByRoles: CONTRACT_ROLES, evidenceRequired: true, rawRowsAllowed: false, sensitive: "own_records_only" },
  { entity: "contractor", domains: ["contractors", "subcontracts", "office"], readableByRoles: [...CONTROL_ROLES, "foreman", "contractor", "office"], evidenceRequired: true, rawRowsAllowed: false, sensitive: "own_records_only" },
  { entity: "chat_thread", domains: ["chat"], readableByRoles: ["director", "control", "foreman", "buyer", "accountant", "warehouse", "contractor", "office", "admin"], evidenceRequired: true, rawRowsAllowed: false, sensitive: "redact_ids" },
  { entity: "real_estate_object", domains: ["real_estate"], readableByRoles: ["director", "control", "buyer", "foreman"], evidenceRequired: true, rawRowsAllowed: false, sensitive: "redact_ids" },
  { entity: "land_plot", domains: ["real_estate"], readableByRoles: ["director", "control", "buyer", "foreman"], evidenceRequired: true, rawRowsAllowed: false, sensitive: "redact_ids" },
  { entity: "commercial_space", domains: ["real_estate"], readableByRoles: ["director", "control", "buyer", "foreman"], evidenceRequired: true, rawRowsAllowed: false, sensitive: "redact_ids" },
  { entity: "map_object", domains: ["real_estate", "marketplace"], readableByRoles: ["director", "control", "buyer", "foreman"], evidenceRequired: true, rawRowsAllowed: false, sensitive: "redact_ids" },
  { entity: "office_member", domains: ["office", "chat"], readableByRoles: OFFICE_ROLES, evidenceRequired: true, rawRowsAllowed: false, sensitive: "redact_ids" },
  { entity: "project_estimate", domains: ["real_estate", "control"], readableByRoles: CONTROL_ROLES, evidenceRequired: true, rawRowsAllowed: false, sensitive: "redact_finance" },
] as const;

export function getAiDomainEntityEntry(entity: AiDomainEntityEntry["entity"]): AiDomainEntityEntry | null {
  return AI_DOMAIN_ENTITY_REGISTRY.find((entry) => entry.entity === entity) ?? null;
}
