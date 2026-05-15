import { hasDirectorFullAiAccess, type AiUserRole } from "../policy/aiRolePolicy";
import { listAiScreenButtonRoleActionEntries } from "../screenAudit/aiScreenButtonRoleActionRegistry";
import type { AiScreenButtonActionEntry } from "../screenAudit/aiScreenButtonRoleActionTypes";

export type AiDirectorExecutiveScreenId =
  | "director.dashboard"
  | "director.finance"
  | "director.reports"
  | "ai.command_center";

export type AiDirectorExecutiveDomain =
  | "procurement"
  | "warehouse"
  | "finance"
  | "foreman";

export type AiDirectorCrossDomainEvidenceStatus = "loaded" | "empty" | "blocked";

export type AiDirectorCrossDomainEvidenceRef = {
  type:
    | "audit_action"
    | "bff_route"
    | "domain_evidence"
    | "approval_route"
    | "role_policy"
    | "risk_policy";
  ref: string;
  source: "screen_audit" | "bff_registry" | "approval_router" | "director_evidence_policy";
  redacted: true;
  rawRowsReturned: false;
  rawPromptReturned: false;
  rawProviderPayloadReturned: false;
};

export type AiDirectorDomainEvidenceSummary = {
  domain: AiDirectorExecutiveDomain;
  screenIds: readonly string[];
  actionIds: readonly string[];
  safeReadActionIds: readonly string[];
  draftActionIds: readonly string[];
  approvalActionIds: readonly string[];
  forbiddenActionIds: readonly string[];
  bffRoutes: readonly string[];
  evidenceSources: readonly string[];
  evidenceRefs: readonly AiDirectorCrossDomainEvidenceRef[];
  crossScreenRisks: readonly string[];
  primaryRiskReason: string;
  safeReadReady: boolean;
  approvalReady: boolean;
  evidenceBacked: boolean;
  directExecuteAllowed: false;
  directMutationAllowed: false;
  mutationCount: 0;
};

export type AiDirectorCrossDomainEvidenceResult = {
  status: AiDirectorCrossDomainEvidenceStatus;
  screenId: AiDirectorExecutiveScreenId;
  role: AiUserRole;
  coveredExecutiveScreens: readonly AiDirectorExecutiveScreenId[];
  domainSummaries: readonly AiDirectorDomainEvidenceSummary[];
  executiveApprovalActionIds: readonly string[];
  evidenceRefs: readonly AiDirectorCrossDomainEvidenceRef[];
  evidenceBacked: boolean;
  coversDirectorDashboard: boolean;
  coversDirectorFinance: boolean;
  coversDirectorReports: boolean;
  coversAiCommandCenter: boolean;
  coversProcurement: boolean;
  coversWarehouse: boolean;
  coversFinance: boolean;
  coversForeman: boolean;
  safeReadOnly: true;
  approvalRequiredOnly: true;
  roleScoped: true;
  noDirectExecute: true;
  noDirectFinanceProcurementWarehouseMutation: true;
  directExecuteAllowed: false;
  directMutationAllowed: false;
  dbWrites: 0;
  mutationCount: 0;
  providerCalled: false;
  rawRowsReturned: false;
  rawPromptReturned: false;
  rawProviderPayloadReturned: false;
  fakeEvidence: false;
  exactReason: string | null;
};

export const AI_DIRECTOR_CROSS_DOMAIN_EVIDENCE_CONTRACT = Object.freeze({
  contractId: "ai_director_cross_domain_evidence_v1",
  screens: ["director.dashboard", "director.finance", "director.reports", "ai.command_center"],
  domains: ["procurement", "warehouse", "finance", "foreman"],
  source: "ai_screen_button_role_action_audit_and_approval_router",
  safeReadOnly: true,
  approvalRequiredOnly: true,
  directExecuteAllowed: false,
  directMutationAllowed: false,
  noDirectFinanceProcurementWarehouseMutation: true,
  mutationCount: 0,
  dbWrites: 0,
  providerCalled: false,
  rawRowsReturned: false,
  rawPromptReturned: false,
  rawProviderPayloadReturned: false,
  fakeEvidence: false,
} as const);

export const AI_DIRECTOR_EXECUTIVE_SCREEN_IDS: readonly AiDirectorExecutiveScreenId[] = [
  "director.dashboard",
  "director.finance",
  "director.reports",
  "ai.command_center",
];

export const AI_DIRECTOR_EXECUTIVE_DOMAINS: readonly AiDirectorExecutiveDomain[] = [
  "procurement",
  "warehouse",
  "finance",
  "foreman",
];

const EXECUTIVE_APPROVAL_ACTION_IDS: Readonly<Record<AiDirectorExecutiveScreenId, string>> = Object.freeze({
  "director.dashboard": "director.dashboard.approval",
  "director.finance": "director.finance.approval",
  "director.reports": "director.reports.approval",
  "ai.command_center": "ai.command_center.approval",
});

function isDirectorExecutiveScreenId(value: string): value is AiDirectorExecutiveScreenId {
  return AI_DIRECTOR_EXECUTIVE_SCREEN_IDS.includes(value as AiDirectorExecutiveScreenId);
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

function evidenceRef(params: {
  type: AiDirectorCrossDomainEvidenceRef["type"];
  ref: string;
  source: AiDirectorCrossDomainEvidenceRef["source"];
}): AiDirectorCrossDomainEvidenceRef {
  return {
    type: params.type,
    ref: params.ref,
    source: params.source,
    redacted: true,
    rawRowsReturned: false,
    rawPromptReturned: false,
    rawProviderPayloadReturned: false,
  };
}

function directorDomainForEntry(entry: AiScreenButtonActionEntry): AiDirectorExecutiveDomain | null {
  if (entry.screenId.startsWith("foreman.")) return "foreman";
  if (entry.primaryDomain === "projects" || entry.primaryDomain === "subcontracts") return "foreman";
  if (entry.primaryDomain === "warehouse") return "warehouse";
  if (entry.primaryDomain === "finance") return "finance";
  if (entry.primaryDomain === "procurement" || entry.primaryDomain === "marketplace") {
    return "procurement";
  }
  return null;
}

function riskReason(domain: AiDirectorExecutiveDomain, risks: readonly string[]): string {
  if (risks.length > 0) return risks[0] ?? "Evidence-backed director risk review is required.";
  if (domain === "finance") return "Finance decisions require ledger-backed approval before posting or payment.";
  if (domain === "warehouse") return "Warehouse stock movements require approval before receive or issue.";
  if (domain === "procurement") return "Procurement decisions require internal-first evidence and approval.";
  return "Field closeout decisions require evidence-backed draft and approval only.";
}

function buildDomainSummary(params: {
  domain: AiDirectorExecutiveDomain;
  entries: readonly AiScreenButtonActionEntry[];
}): AiDirectorDomainEvidenceSummary {
  const domainEntries = params.entries.filter((entry) => directorDomainForEntry(entry) === params.domain);
  const screenIds = unique(domainEntries.map((entry) => entry.screenId));
  const actionIds = unique(domainEntries.map((entry) => entry.actionId));
  const safeReadActionIds = unique(
    domainEntries.filter((entry) => entry.actionKind === "safe_read").map((entry) => entry.actionId),
  );
  const draftActionIds = unique(
    domainEntries.filter((entry) => entry.actionKind === "draft_only").map((entry) => entry.actionId),
  );
  const approvalActionIds = unique(
    domainEntries.filter((entry) => entry.actionKind === "approval_required").map((entry) => entry.actionId),
  );
  const forbiddenActionIds = unique(
    domainEntries.filter((entry) => entry.actionKind === "forbidden").map((entry) => entry.actionId),
  );
  const bffRoutes = unique(domainEntries.flatMap((entry) => entry.existingBffRoutes));
  const evidenceSources = unique(domainEntries.flatMap((entry) => entry.evidenceSources));
  const crossScreenRisks = unique(domainEntries.flatMap((entry) => entry.crossScreenRisks));
  const refs = [
    ...domainEntries.map((entry) =>
      evidenceRef({
        type: "audit_action",
        ref: `audit:${entry.screenId}:${entry.actionId}`,
        source: "screen_audit",
      }),
    ),
    ...bffRoutes.map((route) =>
      evidenceRef({
        type: "bff_route",
        ref: `bff:${route}`,
        source: "bff_registry",
      }),
    ),
    ...evidenceSources.map((source) =>
      evidenceRef({
        type: "domain_evidence",
        ref: `evidence:${params.domain}:${source}`,
        source: "screen_audit",
      }),
    ),
    ...approvalActionIds.map((actionId) =>
      evidenceRef({
        type: "approval_route",
        ref: `approval:${actionId}`,
        source: "approval_router",
      }),
    ),
  ];
  const dedupedRefs = Array.from(
    new Map(refs.map((ref) => [`${ref.type}:${ref.ref}`, ref] as const)).values(),
  ).slice(0, 40);

  return {
    domain: params.domain,
    screenIds,
    actionIds,
    safeReadActionIds,
    draftActionIds,
    approvalActionIds,
    forbiddenActionIds,
    bffRoutes,
    evidenceSources,
    evidenceRefs: dedupedRefs,
    crossScreenRisks,
    primaryRiskReason: riskReason(params.domain, crossScreenRisks),
    safeReadReady: safeReadActionIds.length > 0 && bffRoutes.length > 0,
    approvalReady: approvalActionIds.length > 0,
    evidenceBacked: dedupedRefs.length > 0 && evidenceSources.length > 0,
    directExecuteAllowed: false,
    directMutationAllowed: false,
    mutationCount: 0,
  };
}

function baseResult(params: {
  status: AiDirectorCrossDomainEvidenceStatus;
  screenId: AiDirectorExecutiveScreenId;
  role: AiUserRole;
  domainSummaries?: readonly AiDirectorDomainEvidenceSummary[];
  exactReason?: string | null;
}): AiDirectorCrossDomainEvidenceResult {
  const domainSummaries = params.domainSummaries ?? [];
  const evidenceRefs = domainSummaries.flatMap((summary) => summary.evidenceRefs);
  const domainSet = new Set(domainSummaries.map((summary) => summary.domain));
  const evidenceBacked =
    domainSummaries.length === AI_DIRECTOR_EXECUTIVE_DOMAINS.length &&
    domainSummaries.every((summary) => summary.evidenceBacked && summary.safeReadReady && summary.approvalReady);

  return {
    status: params.status,
    screenId: params.screenId,
    role: params.role,
    coveredExecutiveScreens: AI_DIRECTOR_EXECUTIVE_SCREEN_IDS,
    domainSummaries,
    executiveApprovalActionIds: AI_DIRECTOR_EXECUTIVE_SCREEN_IDS.map(
      (screenId) => EXECUTIVE_APPROVAL_ACTION_IDS[screenId],
    ),
    evidenceRefs,
    evidenceBacked,
    coversDirectorDashboard: true,
    coversDirectorFinance: true,
    coversDirectorReports: true,
    coversAiCommandCenter: true,
    coversProcurement: domainSet.has("procurement"),
    coversWarehouse: domainSet.has("warehouse"),
    coversFinance: domainSet.has("finance"),
    coversForeman: domainSet.has("foreman"),
    safeReadOnly: true,
    approvalRequiredOnly: true,
    roleScoped: true,
    noDirectExecute: true,
    noDirectFinanceProcurementWarehouseMutation: true,
    directExecuteAllowed: false,
    directMutationAllowed: false,
    dbWrites: 0,
    mutationCount: 0,
    providerCalled: false,
    rawRowsReturned: false,
    rawPromptReturned: false,
    rawProviderPayloadReturned: false,
    fakeEvidence: false,
    exactReason: params.exactReason ?? null,
  };
}

export function resolveAiDirectorCrossDomainEvidence(params: {
  auth: { userId: string; role: AiUserRole } | null;
  screenId: string;
}): AiDirectorCrossDomainEvidenceResult {
  const screenId = isDirectorExecutiveScreenId(params.screenId)
    ? params.screenId
    : "director.dashboard";
  const role = params.auth?.role ?? "unknown";

  if (!isDirectorExecutiveScreenId(params.screenId)) {
    return baseResult({
      status: "blocked",
      screenId,
      role,
      exactReason:
        "Director evidence resolver only covers director.dashboard, director.finance, director.reports, and ai.command_center.",
    });
  }

  if (!params.auth || !hasDirectorFullAiAccess(role)) {
    return baseResult({
      status: "blocked",
      screenId,
      role,
      exactReason: "Executive next-action evidence requires director or control role scope.",
    });
  }

  const entries = listAiScreenButtonRoleActionEntries();
  const domainSummaries = AI_DIRECTOR_EXECUTIVE_DOMAINS.map((domain) =>
    buildDomainSummary({ domain, entries }),
  );
  const evidenceBacked = domainSummaries.every(
    (summary) => summary.evidenceBacked && summary.safeReadReady && summary.approvalReady,
  );

  if (!evidenceBacked) {
    return baseResult({
      status: "blocked",
      screenId,
      role,
      domainSummaries,
      exactReason: "One or more executive domains is missing safe-read evidence or approval route coverage.",
    });
  }

  return baseResult({
    status: domainSummaries.length > 0 ? "loaded" : "empty",
    screenId,
    role,
    domainSummaries,
  });
}
