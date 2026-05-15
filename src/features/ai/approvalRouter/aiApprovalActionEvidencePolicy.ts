import type { AiScreenButtonActionEntry } from "../screenAudit/aiScreenButtonRoleActionTypes";
import type { AiApprovalActionEvidencePolicy } from "./aiApprovalActionRouterTypes";

export const AI_APPROVAL_ACTION_MAX_EVIDENCE_REFS = 20;

const REQUIRED_EVIDENCE_KINDS = ["audit_action", "domain_evidence", "approval_route"] as const;

export type AiApprovalActionEvidenceSource = Pick<
  AiScreenButtonActionEntry,
  "screenId" | "actionId" | "evidenceSources" | "existingBffRoutes"
>;

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function stableEvidenceToken(value: string): string {
  return normalizeText(value).replace(/[^a-zA-Z0-9:/. _-]+/g, "_").slice(0, 160);
}

function uniqueBounded(values: readonly string[]): string[] {
  return [...new Set(values.map(stableEvidenceToken).filter(Boolean))]
    .sort()
    .slice(0, AI_APPROVAL_ACTION_MAX_EVIDENCE_REFS);
}

function hasApprovalRoute(entry: Pick<AiApprovalActionEvidenceSource, "existingBffRoutes">): boolean {
  return entry.existingBffRoutes.some((route) => route.includes("submit-for-approval") || route.includes("approve"));
}

export function buildAiApprovalActionEvidenceRefs(entry: AiApprovalActionEvidenceSource): string[] {
  return uniqueBounded([
    `audit:${entry.screenId}:${entry.actionId}`,
    ...entry.evidenceSources.map((source) => `evidence:${entry.screenId}:${source}`),
    ...entry.existingBffRoutes
      .filter((route) => route.includes("submit-for-approval") || route.includes("approve"))
      .map((route) => `bff:${route}`),
  ]);
}

export function buildAiApprovalActionEvidencePolicy(entry: AiApprovalActionEvidenceSource): AiApprovalActionEvidencePolicy {
  const missingEvidenceKinds: string[] = [];
  if (!entry.actionId.trim() || !entry.screenId.trim()) missingEvidenceKinds.push("audit_action");
  if (entry.evidenceSources.length === 0) missingEvidenceKinds.push("domain_evidence");
  if (!hasApprovalRoute(entry)) missingEvidenceKinds.push("approval_route");

  const evidenceRefs = buildAiApprovalActionEvidenceRefs(entry);

  return {
    ok: missingEvidenceKinds.length === 0 && evidenceRefs.length > 0,
    requiredEvidenceKinds: REQUIRED_EVIDENCE_KINDS,
    missingEvidenceKinds,
    evidenceRefs,
    maxEvidenceRefs: AI_APPROVAL_ACTION_MAX_EVIDENCE_REFS,
    evidenceBacked: missingEvidenceKinds.length === 0 && evidenceRefs.length > 0,
  };
}
