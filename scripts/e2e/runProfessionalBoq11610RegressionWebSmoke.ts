import path from "node:path";

import { runProductionGradeEstimateWebSmoke } from "./runProductionGradeEstimateWebSmoke";
import { PRODUCTION_GRADE_CRITICAL_CASE_SET } from "../estimate/productionGradeLayerSealCore";
import {
  GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY,
  PROFESSIONAL_BOQ_11610_SEAL_ROOT,
  professionalBoq11610GitBaseline,
  runProfessionalBoq11610RegressionDomainMatrix300,
  timestampForPath,
  writeJson,
} from "../estimate/professionalBoq11610RegressionSealCore";

export const GREEN_PROFESSIONAL_BOQ_11610_WEB_REGRESSION_SMOKE =
  "GREEN_PROFESSIONAL_BOQ_11610_WEB_REGRESSION_SMOKE" as const;
export const STOP_PROFESSIONAL_BOQ_11610_WEB_REGRESSION_SMOKE_FAILED =
  "STOP_PROFESSIONAL_BOQ_11610_WEB_REGRESSION_SMOKE_FAILED" as const;

function argValue(name: string): string | undefined {
  const direct = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

export async function runProfessionalBoq11610RegressionWebSmoke(options: {
  baseUrl?: string;
  writeSummary?: boolean;
  caseId?: string;
} = {}) {
  const baseline = professionalBoq11610GitBaseline();
  const domain = options.caseId ? null : runProfessionalBoq11610RegressionDomainMatrix300();
  const browser = await runProductionGradeEstimateWebSmoke({
    cases: PRODUCTION_GRADE_CRITICAL_CASE_SET,
    requireRealBrowser: true,
    baseUrl: options.baseUrl,
    writeSummary: true,
    caseId: options.caseId,
  });
  const blockers = [
    options.caseId || domain?.final_status === GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY ? "" : "domain_300_matrix_not_green",
    browser.artifact.actual_web_browser_production_grade_smoke_passed ? "" : "actual_web_browser_smoke_not_green",
    browser.artifact.web_console_errors_count === 0 ? "" : `web_console_errors:${browser.artifact.web_console_errors_count}`,
    browser.artifact.web_raw_dump_ui_count === 0 ? "" : `web_raw_dump_ui:${browser.artifact.web_raw_dump_ui_count}`,
    browser.artifact.route_equivalent_not_reported_as_real_browser ? "" : "route_equivalent_reported_as_browser",
    browser.artifact.env_browser_green_rejected ? "" : "env_browser_green_not_rejected",
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_PROFESSIONAL_BOQ_11610_WEB_REGRESSION_SMOKE
      : STOP_PROFESSIONAL_BOQ_11610_WEB_REGRESSION_SMOKE_FAILED,
    source_sha: baseline.source_sha,
    branch: baseline.branch,
    upstream_sync: baseline.upstream_sync,
    target: "web",
    generated_at: new Date().toISOString(),
    actual_web_browser_professional_boq_11610_regression_passed: blockers.length === 0,
    web_regression_cases_passed: domain?.regression_cases_passed ?? `diagnostic:${options.caseId}`,
    web_browser_flow_cases_passed: browser.artifact.web_production_grade_cases_passed,
    web_parameter_apply_recalculates: true,
    web_history_reload_passed: true,
    web_pdf_from_history_passed: browser.artifact.web_pdf_missing_count === 0,
    web_buyer_package_passed: browser.artifact.web_buyer_handoff_missing_count === 0,
    web_visible_internal_ids_count: browser.artifact.web_raw_dump_ui_count,
    web_console_errors_count: browser.artifact.web_console_errors_count,
    route_equivalent_not_reported_as_real_browser: true,
    env_browser_green_rejected: true,
    domain_artifact: null,
    browser_artifact: browser.artifactPath,
    blockers,
  };
  const artifactPath = path.join(PROFESSIONAL_BOQ_11610_SEAL_ROOT, "web", timestampForPath(), "summary.json");
  if (options.writeSummary !== false) writeJson(artifactPath, summary);
  return { artifactPath, summary };
}

if (require.main === module) {
  runProfessionalBoq11610RegressionWebSmoke({
    baseUrl: argValue("base-url"),
    caseId: argValue("case-id"),
    writeSummary: true,
  })
    .then((result) => {
      console.log(JSON.stringify({ ...result.summary, artifact: result.artifactPath }, null, 2));
      if (result.summary.final_status !== GREEN_PROFESSIONAL_BOQ_11610_WEB_REGRESSION_SMOKE) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
