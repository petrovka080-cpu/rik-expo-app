import path from "node:path";

import { newestSummary } from "./renderStagingAcceptanceCore";
import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";
import { GREEN_AI_ESTIMATE_DURABLE_LEDGER_ANDROID_CONTRACT_SMOKE } from "./runAiEstimateDurableLedgerAndroidSmoke";
import { GREEN_AI_ESTIMATE_DURABLE_LEDGER_WEB_CONTRACT_SMOKE } from "./runAiEstimateDurableLedgerWebSmoke";

export const GREEN_AI_ESTIMATE_DURABLE_LEDGER_WEB_ANDROID_PARITY =
  "GREEN_AI_ESTIMATE_DURABLE_LEDGER_WEB_ANDROID_PARITY" as const;
export const STOP_AI_ESTIMATE_DURABLE_LEDGER_WEB_ANDROID_PARITY_FAILED =
  "STOP_AI_ESTIMATE_DURABLE_LEDGER_WEB_ANDROID_PARITY_FAILED" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-production-durable-ledger-sync-history-scale");

type SummaryLike = {
  final_status?: string;
  source_sha?: string;
  web_ledger_contract_smoke_passed?: boolean;
  android_ledger_contract_smoke_passed?: boolean;
  route_equivalent_not_reported_as_real_browser?: boolean;
  env_browser_green_rejected?: boolean;
};

export function runAiEstimateDurableLedgerWebAndroidParity(input: { writeSummary?: boolean } = {}) {
  const sourceSha = gitOutput(["rev-parse", "HEAD"]);
  const web = newestSummary<SummaryLike>(path.join(ROOT, "web"), (summary) =>
    summary.source_sha === sourceSha && summary.final_status === GREEN_AI_ESTIMATE_DURABLE_LEDGER_WEB_CONTRACT_SMOKE
  );
  const android = newestSummary<SummaryLike>(path.join(ROOT, "android-chrome"), (summary) =>
    summary.source_sha === sourceSha && summary.final_status === GREEN_AI_ESTIMATE_DURABLE_LEDGER_ANDROID_CONTRACT_SMOKE
  );
  const checks = {
    web_summary_green_for_source: web?.summary.final_status === GREEN_AI_ESTIMATE_DURABLE_LEDGER_WEB_CONTRACT_SMOKE,
    android_summary_green_for_source: android?.summary.final_status === GREEN_AI_ESTIMATE_DURABLE_LEDGER_ANDROID_CONTRACT_SMOKE,
    same_source_sha: web?.summary.source_sha === sourceSha && android?.summary.source_sha === sourceSha,
    web_android_ledger_contract_parity: web?.summary.web_ledger_contract_smoke_passed === true
      && android?.summary.android_ledger_contract_smoke_passed === true,
    route_equivalent_not_reported_as_real_browser: web?.summary.route_equivalent_not_reported_as_real_browser === true
      && android?.summary.route_equivalent_not_reported_as_real_browser === true,
    env_browser_green_rejected: web?.summary.env_browser_green_rejected === true
      && android?.summary.env_browser_green_rejected === true,
  };
  const blockers = Object.entries(checks).filter(([, passed]) => !passed).map(([key]) => key);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_DURABLE_LEDGER_WEB_ANDROID_PARITY
      : STOP_AI_ESTIMATE_DURABLE_LEDGER_WEB_ANDROID_PARITY_FAILED,
    source_sha: sourceSha,
    branch: gitOutput(["branch", "--show-current"]),
    target: "web-android-contract-parity",
    cases: "durable-ledger",
    generated_at: new Date().toISOString(),
    artifact_paths: {
      web: web?.path ?? null,
      android: android?.path ?? null,
    },
    ...checks,
    blockers,
  };
  const summaryPath = path.join(ROOT, "web-android-parity", timestampForPath(), "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = runAiEstimateDurableLedgerWebAndroidParity({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_DURABLE_LEDGER_WEB_ANDROID_PARITY) process.exitCode = 1;
}
