import type { AiDomainName } from "./aiDomainQueryTypes";

export type AiDomainPermissionScope = {
  role: string;
  userId: string;
  orgId: string;
  projectId?: string;
  allowedDomains: AiDomainName[];
  forbiddenDomains: AiDomainName[];
  allowedEntityScopes: {
    entityType: string;
    entityIds?: string[];
    scope: "own" | "project" | "org" | "client_visible" | "admin";
  }[];
  canSeeFinanceDetails: boolean;
  canSeeClientHiddenDocs: boolean;
  canSeeOtherContractors: boolean;
  canSeePrivateMedia: boolean;
};

const ALL_DOMAINS: AiDomainName[] = [
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
  "consumer_repair",
];

export function buildAiDomainPermissionScope(input: {
  role: string;
  userId: string;
  orgId: string;
  projectId?: string;
}): AiDomainPermissionScope {
  const role = input.role;
  const clientRestricted = role === "client";
  const contractorRestricted = role === "contractor";
  const consumerRestricted = role === "consumer";

  const forbiddenDomains = clientRestricted
    ? ["finance", "approvals"] as AiDomainName[]
    : contractorRestricted
      ? ["finance", "client"] as AiDomainName[]
      : consumerRestricted
        ? ALL_DOMAINS.filter((domain) => domain !== "consumer_repair" && domain !== "marketplace")
      : [];

  return {
    role,
    userId: input.userId,
    orgId: input.orgId,
    projectId: input.projectId,
    allowedDomains: ALL_DOMAINS.filter((domain) => !forbiddenDomains.includes(domain)),
    forbiddenDomains,
    allowedEntityScopes: [
      {
        entityType: "*",
        scope: consumerRestricted ? "own" : clientRestricted ? "client_visible" : contractorRestricted ? "own" : "org",
      },
    ],
    canSeeFinanceDetails: !clientRestricted && !contractorRestricted && !consumerRestricted,
    canSeeClientHiddenDocs: role === "director" || role === "admin" || role === "office",
    canSeeOtherContractors: role !== "contractor" && role !== "client" && role !== "consumer",
    canSeePrivateMedia: role !== "client" && role !== "consumer",
  };
}

export function canAiDomainScopeAccessDomain(
  scope: AiDomainPermissionScope,
  domain: AiDomainName,
): boolean {
  return scope.allowedDomains.includes(domain) && !scope.forbiddenDomains.includes(domain);
}
