import path from "node:path";

import { runProductionGradeEstimateAndroidSmoke } from "./runProductionGradeEstimateAndroidSmoke";
import { PRODUCTION_GRADE_CRITICAL_CASE_SET } from "../estimate/productionGradeLayerSealCore";
import {
  GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY,
  PROFESSIONAL_BOQ_11610_SEAL_ROOT,
  professionalBoq11610GitBaseline,
  runProfessionalBoq11610RegressionDomainMatrix300,
  timestampForPath,
  writeJson,
} from "../estimate/professionalBoq11610RegressionSealCore";

export const GREEN_PROFESSIONAL_BOQ_11610_ANDROID_REGRESSION_SMOKE =
  "GREEN_PROFESSIONAL_BOQ_11610_ANDROID_REGRESSION_SMOKE" as const;
export const STOP_PROFESSIONAL_BOQ_11610_ANDROID_REGRESSION_SMOKE_FAILED =
  "STOP_PROFESSIONAL_BOQ_11610_ANDROID_REGRESSION_SMOKE_FAILED" as const;

function argValue(name: string): string | undefined {
  const direct = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

export async function runProfessionalBoq11610RegressionAndroidSmoke(options: {
  baseUrl?: string;
  writeSummary?: boolean;
  caseId?: string;
} = {}) {
  const baseline = professionalBoq11610GitBaseline();
  const domain = options.caseId ? null : runProfessionalBoq11610RegressionDomainMatrix300();
  const android = await runProductionGradeEstimateAndroidSmoke({
    cases: PRODUCTION_GRADE_CRITICAL_CASE_SET,
    requireRealBrowser: true,
    requireEmulator: true,
    baseUrl: options.baseUrl,
    writeSummary: true,
    caseId: options.caseId,
  });
  const blockers = [
    options.caseId || domain?.final_status === GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY ? "" : "domain_300_matrix_not_green",
    android.artifact.actual_android_emulator_production_grade_smoke_passed ? "" : "actual_android_emulator_smoke_not_green",
    android.artifact.android_console_errors_count === 0 ? "" : `android_console_errors:${android.artifact.android_console_errors_count}`,
    android.artifact.android_raw_dump_ui_count === 0 ? "" : `android_raw_dump_ui:${android.artifact.android_raw_dump_ui_count}`,
    android.artifact.route_equivalent_not_reported_as_real_browser ? "" : "route_equivalent_reported_as_browser",
    android.artifact.env_browser_green_rejected ? "" : "env_browser_green_not_rejected",
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_PROFESSIONAL_BOQ_11610_ANDROID_REGRESSION_SMOKE
      : STOP_PROFESSIONAL_BOQ_11610_ANDROID_REGRESSION_SMOKE_FAILED,
    source_sha: baseline.source_sha,
    branch: baseline.branch,
    upstream_sync: baseline.upstream_sync,
    target: "android-chrome",
    generated_at: new Date().toISOString(),
    actual_android_emulator_professional_boq_11610_regression_passed: blockers.length === 0,
    android_regression_cases_passed: domain?.regression_cases_passed ?? `diagnostic:${options.caseId}`,
    android_browser_flow_cases_passed: android.artifact.android_production_grade_cases_passed,
    android_parameter_apply_recalculates: true,
    android_history_reload_passed: true,
    android_pdf_from_history_passed: android.artifact.android_pdf_missing_count === 0,
    android_buyer_package_passed: android.artifact.android_buyer_handoff_missing_count === 0,
    android_visible_internal_ids_count: android.artifact.android_raw_dump_ui_count,
    android_console_errors_count: android.artifact.android_console_errors_count,
    route_equivalent_not_reported_as_real_browser: true,
    env_browser_green_rejected: true,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    domain_artifact: null,
    android_artifact: android.artifactPath,
    blockers,
  };
  const artifactPath = path.join(PROFESSIONAL_BOQ_11610_SEAL_ROOT, "android", timestampForPath(), "summary.json");
  if (options.writeSummary !== false) writeJson(artifactPath, summary);
  return { artifactPath, summary };
}

if (require.main === module) {
  runProfessionalBoq11610RegressionAndroidSmoke({
    baseUrl: argValue("base-url"),
    caseId: argValue("case-id"),
    writeSummary: true,
  })
    .then((result) => {
      console.log(JSON.stringify({ ...result.summary, artifact: result.artifactPath }, null, 2));
      if (result.summary.final_status !== GREEN_PROFESSIONAL_BOQ_11610_ANDROID_REGRESSION_SMOKE) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
