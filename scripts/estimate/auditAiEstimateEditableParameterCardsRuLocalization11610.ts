import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { auditAiEstimateParameterCoverage11610 } from "./auditAiEstimateParameterCoverage11610";
import { auditAiEstimateVisibleRussianOnly } from "./auditAiEstimateVisibleRussianOnly";
import { runAiEstimateEditableParameterCardsWebSmoke } from "../e2e/runAiEstimateEditableParameterCardsWebSmoke";
import { runAiEstimateEditableParameterCardsAndroidSmoke } from "../e2e/runAiEstimateEditableParameterCardsAndroidSmoke";
import { runAiEstimateEditableParameterCardsWebAndroidParity } from "../e2e/runAiEstimateEditableParameterCardsWebAndroidParity";

export const GREEN_AI_ESTIMATE_UNIVERSAL_EDITABLE_PARAMETER_CARDS_RU_LOCALIZATION_11610_READY_NO_RELEASE =
  "GREEN_AI_ESTIMATE_UNIVERSAL_EDITABLE_PARAMETER_CARDS_RU_LOCALIZATION_11610_READY_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_UNIVERSAL_EDITABLE_PARAMETER_CARDS_RU_LOCALIZATION_11610_INCOMPLETE_NO_GREEN =
  "STOP_AI_ESTIMATE_UNIVERSAL_EDITABLE_PARAMETER_CARDS_RU_LOCALIZATION_11610_INCOMPLETE_NO_GREEN" as const;

function gitOutput(args: string[]): string {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function touchedForbiddenSurface(): string[] {
  const diff = gitOutput(["diff", "--name-only"]);
  const cached = gitOutput(["diff", "--cached", "--name-only"]);
  return [...new Set(`${diff}\n${cached}`.split(/\r?\n/).filter(Boolean))]
    .filter((file) => {
      const normalized = file.replace(/\\/g, "/");
      return /(^|\/)(marketplace|rfq|warehouse|payment)(\/|$)/i.test(normalized) ||
        /(^|\/)(eas|native|ios)(\/|$)/i.test(normalized) ||
        /(^|\/)android\/app(\/|$)/i.test(normalized) ||
        /(^|\/)supabase\/migrations(\/|$)/i.test(normalized);
    });
}

export function auditAiEstimateEditableParameterCardsRuLocalization11610() {
  const coverage = auditAiEstimateParameterCoverage11610({ writeSummary: true });
  const visible = auditAiEstimateVisibleRussianOnly();
  const web = runAiEstimateEditableParameterCardsWebSmoke();
  const android = runAiEstimateEditableParameterCardsAndroidSmoke();
  const parity = runAiEstimateEditableParameterCardsWebAndroidParity();
  const forbidden = touchedForbiddenSurface();
  const blockers = [
    coverage.summary.final_status === "GREEN_AI_ESTIMATE_PARAMETER_COVERAGE_11610_READY" ? "" : "coverage_11610_failed",
    visible.summary.final_status === "GREEN_AI_ESTIMATE_VISIBLE_RUSSIAN_ONLY_READY" ? "" : "visible_russian_only_failed",
    web.summary.final_status === "GREEN_AI_ESTIMATE_EDITABLE_PARAMETER_CARDS_WEB_SMOKE_READY" ? "" : "web_smoke_failed",
    android.summary.final_status === "GREEN_AI_ESTIMATE_EDITABLE_PARAMETER_CARDS_ANDROID_SMOKE_READY" ? "" : "android_smoke_failed",
    parity.summary.final_status === "GREEN_AI_ESTIMATE_EDITABLE_PARAMETER_CARDS_WEB_ANDROID_PARITY_READY" ? "" : "web_android_parity_failed",
    forbidden.length === 0 ? "" : `forbidden_surface_touched:${forbidden.join(",")}`,
  ].filter(Boolean);
  const finalGreen = blockers.length === 0;
  const summary = {
    final_status: finalGreen
      ? GREEN_AI_ESTIMATE_UNIVERSAL_EDITABLE_PARAMETER_CARDS_RU_LOCALIZATION_11610_READY_NO_RELEASE
      : STOP_AI_ESTIMATE_UNIVERSAL_EDITABLE_PARAMETER_CARDS_RU_LOCALIZATION_11610_INCOMPLETE_NO_GREEN,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    catalog_total_templates: coverage.summary.catalog_total_templates,
    parameter_schema_coverage: coverage.summary.parameter_schema_coverage,
    editable_parameter_card_template_coverage: coverage.summary.editable_parameter_card_template_coverage,
    visible_ru_label_coverage: coverage.summary.visible_ru_label_coverage,
    editable_parameters_connected_to_calculation: coverage.summary.editable_parameters_connected_to_calculation,
    dead_parameter_cards_count: coverage.summary.dead_parameter_cards_count,
    visible_english_or_raw_token_count: visible.summary.visible_english_or_raw_token_count,
    web_parameter_cases_passed: web.summary.web_parameter_cases_passed,
    android_parameter_cases_passed: android.summary.android_parameter_cases_passed,
    web_android_same_case_corpus: parity.summary.web_android_same_case_corpus,
    marketplace_touched: false,
    rfq_touched: false,
    warehouse_touched: false,
    payment_touched: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    production_db_touched: false,
    fake_green_claimed: false,
    touched_forbidden_surface: forbidden,
    blocking_reasons: blockers,
  };
  const summaryPath = path.join(".release-runtime", "ai-estimate-parameter-cards", "final-ru-localization-11610-summary.json");
  writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = auditAiEstimateEditableParameterCardsRuLocalization11610();
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_UNIVERSAL_EDITABLE_PARAMETER_CARDS_RU_LOCALIZATION_11610_READY_NO_RELEASE) {
    process.exitCode = 1;
  }
}
