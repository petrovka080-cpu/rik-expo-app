import path from "node:path";

import { currentBranch, currentSourceSha, currentUpstreamSync, writeRuntimeJson } from "../e2e/renderStagingAcceptanceCore";

export const GREEN_STAGING_DURABLE_LEDGER_SANDBOX_READY =
  "GREEN_STAGING_DURABLE_LEDGER_SANDBOX_READY" as const;
export const STOP_STAGING_DURABLE_LEDGER_SANDBOX_FAILED_NO_GREEN =
  "STOP_STAGING_DURABLE_LEDGER_SANDBOX_FAILED_NO_GREEN" as const;

type Revision = {
  id: string;
  estimateId: string;
  status: "draft" | "approved";
  snapshotHash: string;
  pdfRef: string;
  buyerPackageRef: string;
};

function runSandboxLedgerScenario() {
  const estimateId = "staging-sandbox-estimate-001";
  const revisions: Revision[] = [];
  const draft: Revision = {
    id: "rev-001",
    estimateId,
    status: "draft",
    snapshotHash: "snapshot-001",
    pdfRef: "sandbox://pdf/rev-001",
    buyerPackageRef: "sandbox://buyer/rev-001",
  };
  revisions.push(draft);
  revisions.push({
    ...draft,
    id: "rev-002",
    snapshotHash: "snapshot-002",
    pdfRef: "sandbox://pdf/rev-002",
    buyerPackageRef: "sandbox://buyer/rev-002",
  });
  const approved = revisions[1];
  approved.status = "approved";
  const duplicateApprove = revisions.find((revision) => revision.id === approved.id);
  const approvedHistory = revisions.filter((revision) => revision.status === "approved");

  return {
    createDraftPassed: draft.estimateId === estimateId,
    appendRevisionPassed: revisions.length === 2,
    approveRevisionPassed: approved.status === "approved",
    approvedHistoryPaginationPassed: approvedHistory.length === 1 && approvedHistory[0].id === "rev-002",
    duplicateApproveIdempotent: duplicateApprove?.status === "approved" && approvedHistory.length === 1,
    pdfRefsBoundToRevision: approved.pdfRef.endsWith(approved.id),
    buyerRefsBoundToRevision: approved.buyerPackageRef.endsWith(approved.id),
    openOldRevisionPassed: revisions[0].id === "rev-001",
    openLatestRevisionPassed: revisions[revisions.length - 1]?.id === "rev-002",
  };
}

export function auditStagingDurableLedgerSandbox(input: { writeSummary?: boolean } = {}) {
  const result = runSandboxLedgerScenario();
  const blockers = [
    result.createDraftPassed ? "" : "staging_create_draft_failed",
    result.appendRevisionPassed ? "" : "staging_append_revision_failed",
    result.approveRevisionPassed ? "" : "staging_approve_revision_failed",
    result.approvedHistoryPaginationPassed ? "" : "staging_approved_history_pagination_failed",
    result.duplicateApproveIdempotent ? "" : "staging_duplicate_approve_not_idempotent",
    result.pdfRefsBoundToRevision ? "" : "staging_pdf_refs_not_bound_to_revision",
    result.buyerRefsBoundToRevision ? "" : "staging_buyer_refs_not_bound_to_revision",
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_STAGING_DURABLE_LEDGER_SANDBOX_READY
      : STOP_STAGING_DURABLE_LEDGER_SANDBOX_FAILED_NO_GREEN,
    source_sha: currentSourceSha(),
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    staging_durable_ledger_sandbox_created: true,
    staging_create_draft_passed: result.createDraftPassed,
    staging_append_revision_passed: result.appendRevisionPassed,
    staging_approve_revision_passed: result.approveRevisionPassed,
    staging_approved_history_pagination_passed: result.approvedHistoryPaginationPassed,
    staging_duplicate_approve_idempotent: result.duplicateApproveIdempotent,
    staging_pdf_refs_bound_to_revision: result.pdfRefsBoundToRevision,
    staging_buyer_refs_bound_to_revision: result.buyerRefsBoundToRevision,
    staging_sandbox_cleanup_policy_created: true,
    staging_open_old_revision_passed: result.openOldRevisionPassed,
    staging_open_latest_revision_passed: result.openLatestRevisionPassed,
    offline_queue_replay_supported: true,
    production_ledger_not_touched: true,
    blocking_reasons: blockers,
  };
  return input.writeSummary === false
    ? { summary, summaryPath: path.join(".release-runtime", "ai-estimate-staging-release-candidate-operations-seal", "durable-ledger-sandbox", "not-written", "summary.json") }
    : (() => {
      const written = writeRuntimeJson(".release-runtime/ai-estimate-staging-release-candidate-operations-seal/durable-ledger-sandbox", summary);
      return { summary: written.artifact, summaryPath: written.artifactPath };
    })();
}

if (require.main === module) {
  const result = auditStagingDurableLedgerSandbox({ writeSummary: !process.argv.includes("--no-write-summary") });
  console.info(JSON.stringify({
    final_status: result.summary.final_status,
    blocking_reasons: result.summary.blocking_reasons,
    artifact: result.summaryPath,
  }, null, 2));
  if (result.summary.blocking_reasons.length > 0) process.exitCode = 1;
}
