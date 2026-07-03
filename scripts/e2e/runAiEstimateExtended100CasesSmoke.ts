import {
  GREEN_AI_ESTIMATE_EXTENDED_PROFESSIONAL_100_WORK_CASES_CERTIFICATION_NO_BUILDS,
  runExtendedProfessionalCertification,
  type ExtendedCertificationOptions,
} from "../estimate/extendedProfessionalCertificationCore";

function smokeTarget(): NonNullable<ExtendedCertificationOptions["smokeTarget"]> {
  const envTarget = process.env.ESTIMATE_SMOKE_TARGET;
  if (envTarget === "web" || envTarget === "android-chrome" || envTarget === "both" || envTarget === "headless") {
    return envTarget;
  }
  const arg = process.argv.find((item) => item.startsWith("--target="))?.slice("--target=".length);
  if (arg === "web" || arg === "android-chrome" || arg === "both" || arg === "headless") return arg;
  return "both";
}

const target = smokeTarget();
const fullLifecycleLimit = target === "android-chrome" ? 3 : 20;
const summary = runExtendedProfessionalCertification({
  casesLimit: 100,
  fullLifecycleLimit,
  promptParsingLimit: target === "android-chrome" ? 25 : 100,
  includeAllTemplates: false,
  smokeTarget: target,
  writeSummary: true,
});

const targetPassed = target === "android-chrome"
  ? summary.android_chrome_extended_cases_smoke_passed &&
    summary.android_chrome_25_preview_cases_passed &&
    summary.android_chrome_3_full_lifecycle_cases_passed
  : target === "web"
    ? summary.web_extended_100_cases_smoke_passed &&
      summary.web_100_preview_cases_passed &&
      summary.web_10_full_lifecycle_cases_passed
    : summary.web_extended_100_cases_smoke_passed &&
      summary.android_chrome_extended_cases_smoke_passed &&
      summary.web_100_preview_cases_passed &&
      summary.android_chrome_25_preview_cases_passed;

console.log(JSON.stringify({
  final_status: summary.final_status,
  smoke_target: target,
  runtime_summary_path: summary.runtime_summary_path,
  web_extended_100_cases_smoke_passed: summary.web_extended_100_cases_smoke_passed,
  web_100_preview_cases_passed: summary.web_100_preview_cases_passed,
  web_10_full_lifecycle_cases_passed: summary.web_10_full_lifecycle_cases_passed,
  android_chrome_extended_cases_smoke_passed: summary.android_chrome_extended_cases_smoke_passed,
  android_chrome_25_preview_cases_passed: summary.android_chrome_25_preview_cases_passed,
  android_chrome_3_full_lifecycle_cases_passed: summary.android_chrome_3_full_lifecycle_cases_passed,
  target_passed: targetPassed,
  failure_ids: summary.failure_ids.slice(0, 50),
  native_build_started: summary.native_build_started,
  eas_started: summary.eas_started,
  release_started: summary.release_started,
  production_db_touched: summary.production_db_touched,
  destructive_migration_run: summary.destructive_migration_run,
  fake_green_claimed: summary.fake_green_claimed,
}, null, 2));

if (
  summary.final_status !== GREEN_AI_ESTIMATE_EXTENDED_PROFESSIONAL_100_WORK_CASES_CERTIFICATION_NO_BUILDS ||
  !targetPassed
) {
  process.exitCode = 1;
}
