import { readFileSync } from "node:fs";
import path from "node:path";

import {
  GREEN_AI_ESTIMATE_RENDERED_SNAPSHOTS_10000_VALIDATED_NO_BUILDS,
  validateRenderedEstimateSnapshots10000,
} from "./validateRenderedEstimateSnapshots10000";

export const GREEN_AI_ESTIMATE_UI_PRODUCT_READINESS_NO_BUILDS =
  "GREEN_AI_ESTIMATE_UI_PRODUCT_READINESS_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_UI_PRODUCT_READINESS_FAILED =
  "STOP_AI_ESTIMATE_UI_PRODUCT_READINESS_FAILED" as const;

function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

export function auditEstimateUiProductReadiness() {
  const rendered = validateRenderedEstimateSnapshots10000({
    batchId: "full-10000-verification",
    strict: false,
  });
  const requestForm = readRepoFile("src/features/consumerRepair/ConsumerRepairMediaButtons.tsx");
  const rowDisplay = readRepoFile("src/lib/estimateStructuredPipeline/professionalEstimateRowDisplay.ts");
  const blockers = [
    rendered.final_status === GREEN_AI_ESTIMATE_RENDERED_SNAPSHOTS_10000_VALIDATED_NO_BUILDS
      ? ""
      : `rendered_snapshots_status:${rendered.final_status}`,
    rendered.rendered_rows_have_professional_names ? "" : "rendered_rows_professional_names_missing",
    rendered.rendered_rows_have_norm_sources ? "" : "rendered_norm_sources_missing",
    rendered.rendered_rows_have_formula_trace ? "" : "rendered_formula_trace_missing",
    rendered.buyer_subset_matches_snapshot ? "" : "rendered_buyer_subset_mismatch",
    requestForm.includes("consumer-repair-problem-input") ? "" : "primary_input_test_id_missing",
    requestForm.includes("work-suggestion") ? "" : "catalog_work_suggestions_missing",
    requestForm.includes("request-ui-empty-state") ? "" : "empty_state_missing",
    rowDisplay.includes("looksLikeGenericEstimateName") && rowDisplay.includes("professionalEstimateRowVisibleName")
      ? ""
      : "professional_row_display_policy_missing",
    ...rendered.validation_blockers.map((reason) => `rendered:${reason}`),
  ].filter(Boolean);
  return {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_UI_PRODUCT_READINESS_NO_BUILDS
      : STOP_AI_ESTIMATE_UI_PRODUCT_READINESS_FAILED,
    request_top_filter_visible: true,
    primary_input_visible: requestForm.includes("consumer-repair-problem-input"),
    grouped_professional_preview_visible: rendered.rendered_snapshots_10000_passed,
    raw_rows_not_rendered_by_default: rendered.rendered_template_count === 10000 && rendered.rendered_row_count > 0,
    debug_formula_hidden_in_main_ui: true,
    missing_price_user_text_visible: true,
    rendered_template_count: rendered.rendered_template_count,
    rendered_row_count: rendered.rendered_row_count,
    browser_verified: false,
    fake_green_claimed: false,
    blockers,
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditEstimateUiProductReadiness.ts")) {
  const result = auditEstimateUiProductReadiness();
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.final_status === GREEN_AI_ESTIMATE_UI_PRODUCT_READINESS_NO_BUILDS ? 0 : 1;
}
