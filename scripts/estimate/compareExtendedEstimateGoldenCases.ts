import {
  GREEN_AI_ESTIMATE_EXTENDED_PROFESSIONAL_100_WORK_CASES_CERTIFICATION_NO_BUILDS,
  runExtendedProfessionalCertification,
} from "./extendedProfessionalCertificationCore";

function numberArg(name: string, fallback: number): number {
  const prefix = `--${name}=`;
  const raw = process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const summary = runExtendedProfessionalCertification({
  casesLimit: numberArg("cases", 100),
  fullLifecycleLimit: numberArg("full-lifecycle", 20),
  promptParsingLimit: numberArg("prompt-parsing", 100),
  includeAllTemplates: !process.argv.includes("--skip-templates"),
  smokeTarget: "headless",
  writeSummary: true,
});

console.log(JSON.stringify({
  final_status: summary.final_status,
  runtime_summary_path: summary.runtime_summary_path,
  case_count: summary.case_count,
  golden_100_cases_passed: summary.golden_100_cases_passed,
  golden_cases_failed_count: summary.golden_cases_failed_count,
  golden_20_full_smeta_cases_passed: summary.golden_20_full_smeta_cases_passed,
  smoke_target: summary.smoke_target,
  smoke_execution_mode: summary.smoke_execution_mode,
  browser_automation_started: summary.browser_automation_started,
  smoke_claims_actual_browser_automation: summary.smoke_claims_actual_browser_automation,
  all_10000_templates_extended_validation_executed: summary.all_10000_templates_extended_validation_executed,
  all_10000_templates_extended_validation_passed: summary.all_10000_templates_extended_validation_passed,
  templates_validated_count: summary.templates_validated_count,
  templates_failed_count: summary.templates_failed_count,
  rows_validated_count: summary.rows_validated_count,
  failure_ids: summary.failure_ids.slice(0, 50),
  production_db_touched: summary.production_db_touched,
  destructive_migration_run: summary.destructive_migration_run,
  native_build_started: summary.native_build_started,
  eas_started: summary.eas_started,
  release_started: summary.release_started,
  full_jest_started: summary.full_jest_started,
  fake_green_claimed: summary.fake_green_claimed,
}, null, 2));

if (summary.final_status !== GREEN_AI_ESTIMATE_EXTENDED_PROFESSIONAL_100_WORK_CASES_CERTIFICATION_NO_BUILDS) {
  process.exitCode = 1;
}
