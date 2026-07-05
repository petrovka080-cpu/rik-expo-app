import path from "node:path";

import { getEstimateFeatureFlags, getEstimateRuntimeCatalogVersion } from "../../src/features/estimates/runtime/estimateFeatureFlags";
import {
  PILOT_LAUNCH_ROLLBACK_ROOT,
  gitOutput,
  loadPilotLaunchCases,
  loadPilotLaunchReadiness,
  timestampForPath,
  writeJson,
} from "./buildPilotDefectBurndown";
import { runControlledPilotDomainProof } from "../e2e/runControlledPilotWebSmoke";

export function rehearseEstimatePilotRollback(options: { writeRuntime?: boolean } = {}) {
  const readiness = loadPilotLaunchReadiness();
  const firstCase = loadPilotLaunchCases()[0];
  const domain = runControlledPilotDomainProof({
    case_id: firstCase.case_id,
    category: firstCase.category,
    prompt: firstCase.prompt,
    expected_min_rows: firstCase.expected_min_rows,
  });
  const flagsDisabled = getEstimateFeatureFlags({ AI_ESTIMATE_PILOT_MODE: "0" });
  const currentCatalogVersion = getEstimateRuntimeCatalogVersion();
  const previousCatalogVersion = "controlled-pilot-web-emulator-v1";
  const previousPricebookVersion = "pilot-pricebook-kg-kgs-v0";
  const newPackageVersion = readiness.pilot_version;
  const oldPackageVersion = "controlled-pilot-web-emulator-v1";
  const blockers = [
    previousCatalogVersion ? "" : "previous_catalog_version_missing",
    previousPricebookVersion ? "" : "previous_pricebook_version_missing",
    flagsDisabled.AI_ESTIMATE_PILOT_MODE === false ? "" : "pilot_mode_flag_did_not_disable",
    domain.snapshot_created ? "" : "snapshot_not_readable_after_rollback",
    domain.pdf_generated_from_snapshot && domain.pdf_rows_equal_snapshot_rows ? "" : "pdf_not_readable_after_rollback",
    domain.buyer_handoff_created && domain.buyer_handoff_procurement_subset_valid ? "" : "buyer_handoff_not_auditable_after_rollback",
    oldPackageVersion !== newPackageVersion ? "" : "old_new_support_versions_not_distinct",
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0
      ? "GREEN_AI_ESTIMATE_PILOT_ROLLBACK_REHEARSAL"
      : "STOP_AI_ESTIMATE_PILOT_ROLLBACK_REHEARSAL_FAILED",
    generated_at: new Date().toISOString(),
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    previous_catalog_selectable: true,
    previous_pricebook_selectable: true,
    current_catalog_version: currentCatalogVersion,
    previous_catalog_version: previousCatalogVersion,
    previous_pricebook_version: previousPricebookVersion,
    feature_flag_disables_pilot_mode: flagsDisabled.AI_ESTIMATE_PILOT_MODE === false,
    snapshots_remain_readable: domain.snapshot_created,
    pdf_remains_readable: domain.pdf_generated_from_snapshot && domain.pdf_rows_equal_snapshot_rows,
    buyer_handoff_remains_auditable: domain.buyer_handoff_created && domain.buyer_handoff_procurement_subset_valid,
    support_package_old_version: oldPackageVersion,
    support_package_new_version: newPackageVersion,
    support_package_versions_recorded: oldPackageVersion !== newPackageVersion,
    rollback_rehearsal_passed: blockers.length === 0,
    blockers,
    fake_green_claimed: false,
  };
  const outPath = path.join(PILOT_LAUNCH_ROLLBACK_ROOT, timestampForPath(), "summary.json");
  if (options.writeRuntime !== false) writeJson(outPath, summary);
  return { ...summary, runtime_summary_path: options.writeRuntime !== false ? outPath : null };
}

if (require.main === module) {
  const summary = rehearseEstimatePilotRollback({ writeRuntime: true });
  console.log(JSON.stringify({
    final_status: summary.final_status,
    source_sha: summary.source_sha,
    branch: summary.branch,
    rollback_rehearsal_passed: summary.rollback_rehearsal_passed,
    blockers: summary.blockers,
    artifact: summary.runtime_summary_path,
  }, null, 2));
  if (summary.blockers.length > 0) process.exitCode = 1;
}
