import { AI_DOMAIN_NAMES, type AiDomainName } from "./aiDomainQueryTypes";

export const AI_DOMAIN_GATEWAY_ROLE_NAMES = [
  "director",
  "foreman",
  "buyer",
  "accountant",
  "warehouse",
  "contractor",
  "marketplace",
  "consumer",
] as const;

export type AiDomainGatewayRole = typeof AI_DOMAIN_GATEWAY_ROLE_NAMES[number];

export type AiDomainRoleAllowlistEntry = {
  role: AiDomainGatewayRole;
  allowedDomains: readonly AiDomainName[];
  maxFacts: 20;
  purpose: string;
};

export const AI_DOMAIN_ROLE_ALLOWLISTS: Record<AiDomainGatewayRole, AiDomainRoleAllowlistEntry> = {
  director: {
    role: "director",
    allowedDomains: [
      "procurement",
      "warehouse",
      "finance",
      "field",
      "documents",
      "media",
      "marketplace",
      "contractors",
      "office",
      "client",
      "approvals",
    ],
    maxFacts: 20,
    purpose: "company_summary_decisions",
  },
  foreman: {
    role: "foreman",
    allowedDomains: ["field", "procurement", "warehouse", "media", "documents", "contractors"],
    maxFacts: 20,
    purpose: "work_material_evidence_execution",
  },
  buyer: {
    role: "buyer",
    allowedDomains: ["procurement", "warehouse", "marketplace", "documents"],
    maxFacts: 20,
    purpose: "approved_procurement_options",
  },
  accountant: {
    role: "accountant",
    allowedDomains: ["finance", "documents", "procurement"],
    maxFacts: 20,
    purpose: "payment_invoice_debt_accounting",
  },
  warehouse: {
    role: "warehouse",
    allowedDomains: ["warehouse", "procurement", "field"],
    maxFacts: 20,
    purpose: "stock_movements_issue_receive",
  },
  contractor: {
    role: "contractor",
    allowedDomains: ["contractors", "field", "media", "documents"],
    maxFacts: 20,
    purpose: "own_work_evidence_delivery",
  },
  marketplace: {
    role: "marketplace",
    allowedDomains: ["marketplace", "media", "procurement"],
    maxFacts: 20,
    purpose: "listing_product_quality",
  },
  consumer: {
    role: "consumer",
    allowedDomains: ["consumer_repair", "marketplace"],
    maxFacts: 20,
    purpose: "own_b2c_request_only",
  },
};

export function isAiDomainGatewayRole(role: string): role is AiDomainGatewayRole {
  return (AI_DOMAIN_GATEWAY_ROLE_NAMES as readonly string[]).includes(role);
}

export function getAiDomainRoleAllowlist(role: string): readonly AiDomainName[] {
  if (!isAiDomainGatewayRole(role)) return AI_DOMAIN_NAMES;
  return AI_DOMAIN_ROLE_ALLOWLISTS[role].allowedDomains;
}

export function getAiDomainRoleAllowlistEntry(role: string): AiDomainRoleAllowlistEntry | undefined {
  return isAiDomainGatewayRole(role) ? AI_DOMAIN_ROLE_ALLOWLISTS[role] : undefined;
}

export function isAiDomainAllowedForRole(role: string, domain: AiDomainName): boolean {
  return getAiDomainRoleAllowlist(role).includes(domain);
}

export function getAiDomainRoleForbiddenDomains(role: string): AiDomainName[] {
  const allowed = getAiDomainRoleAllowlist(role);
  return AI_DOMAIN_NAMES.filter((domain) => !allowed.includes(domain));
}
