import { normalizeAiActionLedgerEvidenceRefs } from "../actionLedger/aiActionLedgerEvidence";
import type { AiActionLedgerRecord } from "../actionLedger/aiActionLedgerTypes";

export function normalizeApprovalInboxEvidenceRefs(value: unknown): string[] {
  return normalizeAiActionLedgerEvidenceRefs(value);
}

export function hasApprovalInboxEvidence(record: AiActionLedgerRecord): boolean {
  return normalizeApprovalInboxEvidenceRefs(record.evidenceRefs).length > 0;
}

export function buildApprovalInboxRiskFlags(record: AiActionLedgerRecord): string[] {
  const flags: string[] = [];
  if (record.riskLevel === "approval_required") flags.push("approval_required");
  if (record.riskLevel === "forbidden") flags.push("forbidden_action");
  if (record.status === "expired") flags.push("expired");
  if (record.status === "rejected") flags.push("rejected_blocks_execution");
  if (Date.parse(record.expiresAt) <= Date.now()) flags.push("expires_or_expired");
  if (!hasApprovalInboxEvidence(record)) flags.push("missing_evidence");
  return [...new Set(flags)];
}
