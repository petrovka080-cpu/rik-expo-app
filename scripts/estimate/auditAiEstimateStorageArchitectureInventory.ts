import { readFileSync } from "node:fs";
import path from "node:path";

import { validateAiEstimateSourceOfTruthPolicy } from "../../src/lib/estimate/ledger/validateAiEstimateSourceOfTruthPolicy";
import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";

export const GREEN_AI_ESTIMATE_STORAGE_ARCHITECTURE_INVENTORY =
  "GREEN_AI_ESTIMATE_STORAGE_ARCHITECTURE_INVENTORY" as const;
export const STOP_AI_ESTIMATE_STORAGE_ARCHITECTURE_INVENTORY_FAILED =
  "STOP_AI_ESTIMATE_STORAGE_ARCHITECTURE_INVENTORY_FAILED" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-production-durable-ledger-sync-history-scale", "architecture-inventory");

function source(pathname: string): string {
  return readFileSync(pathname, "utf8");
}

export function auditAiEstimateStorageArchitectureInventory(input: { writeSummary?: boolean } = {}) {
  const sourceSha = gitOutput(["rev-parse", "HEAD"]);
  const repository = source("src/lib/consumerRequests/consumerRequestRepository.ts");
  const service = source("src/lib/consumerRequests/consumerRequestService.ts");
  const bridge = source("src/lib/consumerRequests/consumerRequestLedgerBridge.ts");
  const inMemory = source("src/lib/estimate/ledger/adapters/InMemoryAiEstimateLedgerStore.ts");
  const browser = source("src/lib/estimate/ledger/adapters/BrowserCachedAiEstimateLedgerStore.ts");
  const server = source("src/lib/estimate/ledger/adapters/ServerAiEstimateLedgerStore.ts");
  const policy = validateAiEstimateSourceOfTruthPolicy();
  const checks = {
    source_of_truth_policy_passed: policy.ok,
    in_memory_adapter_created: inMemory.includes("createInMemoryAiEstimateLedgerStore"),
    browser_cache_write_through_adapter_created: browser.includes("sourceOfTruth: false")
      && browser.includes("options.primary"),
    server_api_adapter_contract_created: server.includes("/ai-estimate-ledger/approved-history")
      && server.includes("/ai-estimate-ledger/revisions/approve")
      && server.includes("/ai-estimate-ledger/drafts/upsert"),
    consumer_save_syncs_ledger: repository.includes("syncConsumerRepairBundleToAiEstimateLedger"),
    approved_history_reads_ledger: service.includes("listConsumerRepairApprovedHistoryRecordsFromLedger"),
    ledger_hydrates_from_durable_store_before_history_read: service.includes("hydrateConsumerRepairRequestStoreForLedger"),
    local_storage_not_approved_history_truth: bridge.includes("listApprovedHistory") && !bridge.includes("localStorage"),
  };
  const blockers = Object.entries(checks).filter(([, passed]) => !passed).map(([key]) => key);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_STORAGE_ARCHITECTURE_INVENTORY
      : STOP_AI_ESTIMATE_STORAGE_ARCHITECTURE_INVENTORY_FAILED,
    source_sha: sourceSha,
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    ...checks,
    production_db_touched: false,
    render_started: false,
    release_started: false,
    blockers,
  };
  const summaryPath = path.join(ROOT, timestampForPath(), "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = auditAiEstimateStorageArchitectureInventory({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_STORAGE_ARCHITECTURE_INVENTORY) process.exitCode = 1;
}
