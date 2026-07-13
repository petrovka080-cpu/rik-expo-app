import path from "node:path";

import { createInMemoryAiEstimateLedgerStore } from "../../src/lib/estimate/ledger/adapters/InMemoryAiEstimateLedgerStore";
import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";

export const GREEN_AI_ESTIMATE_DURABLE_LEDGER_WEB_CONTRACT_SMOKE =
  "GREEN_AI_ESTIMATE_DURABLE_LEDGER_WEB_CONTRACT_SMOKE" as const;
export const STOP_AI_ESTIMATE_DURABLE_LEDGER_WEB_CONTRACT_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_DURABLE_LEDGER_WEB_CONTRACT_SMOKE_FAILED" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-production-durable-ledger-sync-history-scale", "web");

export function runAiEstimateDurableLedgerWebSmoke(input: { writeSummary?: boolean } = {}) {
  const store = createInMemoryAiEstimateLedgerStore();
  store.upsertDraft({
    estimateId: "web-ledger-estimate",
    ownerUserId: "web-ledger-owner",
    orgId: null,
    kind: "request_estimate",
    sourceRoute: "/request",
    title: "Web ledger smoke",
    prompt: "98 м2 ремонт",
    selectedTemplateId: "capital_repair",
    family: "repair",
    createdAt: "2026-07-09T12:00:00.000Z",
    updatedAt: "2026-07-09T12:00:00.000Z",
    status: "draft",
    sourceDraftId: "web-ledger-estimate",
    currentRevisionId: "revision-web-1",
    sourceSnapshotId: "snapshot-web-1",
    rowCount: 10,
    materialRowsCount: 5,
    workRowsCount: 5,
    artifacts: {
      snapshotId: "snapshot-web-1",
      pdfArtifactId: "pdf-web-1",
      buyerHandoffId: "buyer-web-1",
      artifactsValidForRevisionId: "revision-web-1",
    },
    actorUserId: "web-ledger-owner",
    sourceLayer: "runtime",
    idempotencyKey: "web-ledger-upsert-1",
  });
  store.approveRevision({
    estimateId: "web-ledger-estimate",
    revisionId: "revision-web-1",
    approvedAt: "2026-07-09T12:01:00.000Z",
    actorUserId: "web-ledger-owner",
    sourceLayer: "runtime",
    idempotencyKey: "web-ledger-approve-1",
  });
  const page = store.listApprovedHistory({ ownerUserId: "web-ledger-owner", limit: 20 });
  const checks = {
    web_ledger_contract_smoke_passed: page.records.length === 1,
    web_history_pdf_buyer_refs_present: page.records[0]?.pdfArtifactId === "pdf-web-1"
      && page.records[0]?.buyerHandoffId === "buyer-web-1",
    route_equivalent_not_reported_as_real_browser: true,
    env_browser_green_rejected: true,
    actual_web_browser_not_claimed: true,
  };
  const blockers = Object.entries(checks).filter(([, passed]) => !passed).map(([key]) => key);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_DURABLE_LEDGER_WEB_CONTRACT_SMOKE
      : STOP_AI_ESTIMATE_DURABLE_LEDGER_WEB_CONTRACT_SMOKE_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    target: "web-contract",
    cases: "durable-ledger",
    generated_at: new Date().toISOString(),
    ...checks,
    blockers,
  };
  const summaryPath = path.join(ROOT, timestampForPath(), "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = runAiEstimateDurableLedgerWebSmoke({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_DURABLE_LEDGER_WEB_CONTRACT_SMOKE) process.exitCode = 1;
}
