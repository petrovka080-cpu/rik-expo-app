import {
  GREEN_AI_ESTIMATE_RENDERED_SNAPSHOTS_10000_READY_NO_BUILDS,
  renderEstimateSnapshots10000,
} from "./renderEstimateSnapshots10000";

export const GREEN_AI_ESTIMATE_RENDERED_SNAPSHOTS_10000_VALIDATED_NO_BUILDS =
  "GREEN_AI_ESTIMATE_RENDERED_SNAPSHOTS_10000_VALIDATED_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_RENDERED_SNAPSHOTS_10000_VALIDATION_FAILED =
  "STOP_AI_ESTIMATE_RENDERED_SNAPSHOTS_10000_VALIDATION_FAILED" as const;

function batchArg(): string | null {
  const direct = process.argv.find((arg) => arg.startsWith("--batch="));
  if (direct) return direct.slice("--batch=".length);
  const index = process.argv.indexOf("--batch");
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

export function validateRenderedEstimateSnapshots10000(options: { batchId?: string } = {}) {
  const render = renderEstimateSnapshots10000({
    batchId: options.batchId ?? "full-10000-verification",
    writeSummary: false,
  });
  const blockers = [
    render.final_status === GREEN_AI_ESTIMATE_RENDERED_SNAPSHOTS_10000_READY_NO_BUILDS
      ? ""
      : `render_status:${render.final_status}`,
    render.rendered_template_count === 10000 ? "" : `rendered_template_count:${render.rendered_template_count}`,
    render.rendered_row_count > 0 ? "" : "rendered_row_count_zero",
    render.rendered_rows_have_professional_names ? "" : "rendered_rows_professional_names_missing",
    render.rendered_rows_have_norm_sources ? "" : "rendered_rows_norm_sources_missing",
    render.rendered_rows_have_formula_trace ? "" : "rendered_rows_formula_trace_missing",
    render.rendered_material_units_correct ? "" : "rendered_material_units_incorrect",
    render.buyer_subset_matches_snapshot ? "" : "buyer_subset_mismatch",
    render.fake_green_claimed ? "fake_green_claimed" : "",
    ...render.blockers.map((reason) => `render:${reason}`),
  ].filter(Boolean);
  return {
    ...render,
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_RENDERED_SNAPSHOTS_10000_VALIDATED_NO_BUILDS
      : STOP_AI_ESTIMATE_RENDERED_SNAPSHOTS_10000_VALIDATION_FAILED,
    rendered_snapshots_10000_passed: blockers.length === 0,
    validation_blockers: blockers,
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/validateRenderedEstimateSnapshots10000.ts")) {
  try {
    const batchId = batchArg();
    if (!batchId) throw new Error("VALIDATE_RENDERED_ESTIMATE_SNAPSHOTS_10000_REQUIRES_--batch");
    const result = validateRenderedEstimateSnapshots10000({ batchId });
    console.log(JSON.stringify(result, null, 2));
    process.exitCode =
      result.final_status === GREEN_AI_ESTIMATE_RENDERED_SNAPSHOTS_10000_VALIDATED_NO_BUILDS ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
