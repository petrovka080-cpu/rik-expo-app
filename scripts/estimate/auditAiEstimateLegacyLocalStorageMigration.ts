import path from "node:path";

import { validateLegacyAiEstimateMigration } from "../../src/lib/estimate/ledger/migration/validateLegacyAiEstimateMigration";
import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";

export const GREEN_AI_ESTIMATE_LEGACY_LOCAL_STORAGE_MIGRATION =
  "GREEN_AI_ESTIMATE_LEGACY_LOCAL_STORAGE_MIGRATION" as const;
export const STOP_AI_ESTIMATE_LEGACY_LOCAL_STORAGE_MIGRATION_FAILED =
  "STOP_AI_ESTIMATE_LEGACY_LOCAL_STORAGE_MIGRATION_FAILED" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-production-durable-ledger-sync-history-scale", "legacy-migration");

export function auditAiEstimateLegacyLocalStorageMigration(input: { writeSummary?: boolean } = {}) {
  const proof = validateLegacyAiEstimateMigration();
  const blockers = proof.ok ? [] : Object.entries(proof)
    .filter(([, value]) => value === false)
    .map(([key]) => key);
  const summary = {
    final_status: proof.ok
      ? GREEN_AI_ESTIMATE_LEGACY_LOCAL_STORAGE_MIGRATION
      : STOP_AI_ESTIMATE_LEGACY_LOCAL_STORAGE_MIGRATION_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    ...proof,
    destructive_migration_used: false,
    legacy_records_deleted: false,
    blockers,
  };
  const summaryPath = path.join(ROOT, timestampForPath(), "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = auditAiEstimateLegacyLocalStorageMigration({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_LEGACY_LOCAL_STORAGE_MIGRATION) process.exitCode = 1;
}
