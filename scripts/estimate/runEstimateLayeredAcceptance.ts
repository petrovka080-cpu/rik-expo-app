import {
  GREEN_AI_ESTIMATE_LAYERED_ACCEPTANCE_MATRIX_COMMITTED_NO_BUILDS,
  buildEstimateLayeredAcceptanceReport,
} from "./buildEstimateLayeredAcceptanceReport";

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

if (require.main === module) {
  if (!hasFlag("all")) {
    console.error("RUN_ESTIMATE_LAYERED_ACCEPTANCE_REQUIRES_--all");
    process.exit(1);
  }

  const report = buildEstimateLayeredAcceptanceReport({
    requireGitClean: true,
    requireRuntimeEvidence: true,
    requireSourceGates: true,
    writeRuntime: true,
  });

  console.log(JSON.stringify({
    final_status: report.final_status,
    source_sha: report.source_sha,
    branch: report.branch,
    upstream_sync: report.upstream_sync,
    worktree_clean: report.worktree_clean,
    failed_layer: report.failed_layer,
    blocking_reasons: report.blocking_reasons,
    all_layers_passed: report.all_layers_passed,
    upper_layers_not_green_without_dependencies: report.upper_layers_not_green_without_dependencies,
    catalog_total_templates: report.catalog_total_templates,
    ready_professional_count: report.ready_professional_count,
    actual_web_browser_controlled_pilot_smoke_passed: report.actual_web_browser_controlled_pilot_smoke_passed,
    actual_android_emulator_controlled_pilot_smoke_passed: report.actual_android_emulator_controlled_pilot_smoke_passed,
    artifact: report.runtime_summary_path,
  }, null, 2));

  if (report.final_status !== GREEN_AI_ESTIMATE_LAYERED_ACCEPTANCE_MATRIX_COMMITTED_NO_BUILDS) {
    process.exitCode = 1;
  }
}
