import {
  GREEN_AI_ESTIMATE_10000_TEMPLATES_EXTENDED_VALIDATION_NO_BUILDS,
  validateAllProductionTemplatesExtended10000,
} from "../../src/lib/ai/estimateTemplate10000";

if (!process.argv.includes("--all")) {
  throw new Error("VALIDATE_ALL_ESTIMATE_TEMPLATES_EXTENDED_REQUIRES_--all");
}

const summary = validateAllProductionTemplatesExtended10000();

console.log(JSON.stringify({
  final_status: summary.final_status,
  template_count: summary.template_count,
  templates_validated_count: summary.templates_validated_count,
  templates_failed_count: summary.templates_failed_count,
  rows_validated_count: summary.rows_validated_count,
  all_10000_templates_extended_validation_passed: summary.all_10000_templates_extended_validation_passed,
  all_10000_templates_boq_validation_passed: summary.all_10000_templates_boq_validation_passed,
  all_10000_templates_pricing_validation_passed: summary.all_10000_templates_pricing_validation_passed,
  failures: summary.failures.slice(0, 50),
  production_db_touched: summary.production_db_touched,
  destructive_migration_run: summary.destructive_migration_run,
  native_build_started: summary.native_build_started,
  eas_started: summary.eas_started,
  release_started: summary.release_started,
  full_jest_started: summary.full_jest_started,
  fake_green_claimed: summary.fake_green_claimed,
}, null, 2));

if (summary.final_status !== GREEN_AI_ESTIMATE_10000_TEMPLATES_EXTENDED_VALIDATION_NO_BUILDS) {
  process.exitCode = 1;
}
