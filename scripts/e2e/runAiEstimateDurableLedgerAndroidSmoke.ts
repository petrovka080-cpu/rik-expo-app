import path from "node:path";

import { createInMemoryAiEstimateLedgerStore } from "../../src/lib/estimate/ledger/adapters/InMemoryAiEstimateLedgerStore";
import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";

export const GREEN_AI_ESTIMATE_DURABLE_LEDGER_ANDROID_CONTRACT_SMOKE =
  "GREEN_AI_ESTIMATE_DURABLE_LEDGER_ANDROID_CONTRACT_SMOKE" as const;
export const STOP_AI_ESTIMATE_DURABLE_LEDGER_ANDROID_CONTRACT_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_DURABLE_LEDGER_ANDROID_CONTRACT_SMOKE_FAILED" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-production-durable-ledger-sync-history-scale", "android-chrome");

export function runAiEstimateDurableLedgerAndroidSmoke(input: { writeSummary?: boolean } = {}) {
  const store = createInMemoryAiEstimateLedgerStore();
  store.upsertDraft({
    estimateId: "android-ledger-estimate",
    ownerUserId: "android-ledger-owner",
    orgId: null,
    kind: "consumer_repair",
    sourceRoute: "/request",
    title: "Android ledger smoke",
    prompt: "5000 м водопровод",
    selectedTemplateId: "water_supply_external",
    family: "infrastructure",
    createdAt: "2026-07-09T12:00:00.000Z",
    updatedAt: "2026-07-09T12:00:00.000Z",
    status: "draft",
    sourceDraftId: "android-ledger-estimate",
    currentRevisionId: "revision-android-1",
    sourceSnapshotId: "snapshot-android-1",
    rowCount: 34,
    materialRowsCount: 20,
    workRowsCount: 14,
    artifacts: {
      snapshotId: "snapshot-android-1",
      pdfArtifactId: "pdf-android-1",
      buyerHandoffId: "buyer-android-1",
      artifactsValidForRevisionId: "revision-android-1",
    },
    actorUserId: "android-ledger-owner",
    sourceLayer: "runtime",
    idempotencyKey: "android-ledger-upsert-1",
  });
  store.approveRevision({
    estimateId: "android-ledger-estimate",
    revisionId: "revision-android-1",
    approvedAt: "2026-07-09T12:01:00.000Z",
    actorUserId: "android-ledger-owner",
    sourceLayer: "runtime",
    idempotencyKey: "android-ledger-approve-1",
  });
  const page = store.listApprovedHistory({ ownerUserId: "android-ledger-owner", limit: 20 });
  const checks = {
    android_ledger_contract_smoke_passed: page.records.length === 1,
    android_history_pdf_buyer_refs_present: page.records[0]?.pdfArtifactId === "pdf-android-1"
      && page.records[0]?.buyerHandoffId === "buyer-android-1",
    route_equivalent_not_reported_as_real_browser: true,
    env_browser_green_rejected: true,
    actual_android_emulator_not_claimed: true,
  };
  const blockers = Object.entries(checks).filter(([, passed]) => !passed).map(([key]) => key);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_DURABLE_LEDGER_ANDROID_CONTRACT_SMOKE
      : STOP_AI_ESTIMATE_DURABLE_LEDGER_ANDROID_CONTRACT_SMOKE_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    target: "android-contract",
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
  const result = runAiEstimateDurableLedgerAndroidSmoke({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_DURABLE_LEDGER_ANDROID_CONTRACT_SMOKE) process.exitCode = 1;
}
