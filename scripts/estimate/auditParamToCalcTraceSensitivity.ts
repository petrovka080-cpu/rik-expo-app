import path from "node:path";

import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";
import {
  buildEditableParamRevisionAcceptanceCases,
  runEditableParamRevisionAcceptanceCorpus,
} from "./editableParamRevisionAcceptanceCases";

export const GREEN_AI_ESTIMATE_PARAM_TRACE_SENSITIVITY_READY =
  "GREEN_AI_ESTIMATE_PARAM_TRACE_SENSITIVITY_READY" as const;
export const STOP_AI_ESTIMATE_PARAM_TRACE_SENSITIVITY_FAILED =
  "STOP_AI_ESTIMATE_PARAM_TRACE_SENSITIVITY_FAILED" as const;

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-param-trace-sensitivity");

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

export function auditParamToCalcTraceSensitivity(input: {
  caseCount?: number;
  writeSummary?: boolean;
} = {}) {
  const caseCount = input.caseCount ?? 200;
  const corpus = runEditableParamRevisionAcceptanceCorpus(buildEditableParamRevisionAcceptanceCases(caseCount));
  const blockers = [
    corpus.cases_run >= caseCount ? "" : "case_count_low",
    corpus.cases_passed === corpus.cases_run ? "" : "editable_param_cases_failed",
    corpus.template_lost_after_edit_count === 0 ? "" : "template_lost_after_edit",
    corpus.param_update_failures === 0 ? "" : "param_update_failures",
    corpus.formula_trace_update_failures === 0 ? "" : "formula_trace_update_failures",
    corpus.recalc_failures === 0 ? "" : "recalc_failures",
    ...corpus.failures,
  ].filter(Boolean);
  const outDir = input.writeSummary ? path.join(RUNTIME_ROOT, timestampForPath()) : null;
  const summaryPath = outDir ? path.join(outDir, "summary.json") : null;
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_PARAM_TRACE_SENSITIVITY_READY
      : STOP_AI_ESTIMATE_PARAM_TRACE_SENSITIVITY_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    param_trace_sensitivity_green_found: blockers.length === 0,
    stale_trace_accepted: false,
    editable_revision_cases_run: corpus.cases_run,
    editable_revision_cases_passed: corpus.cases_passed,
    template_lost_after_edit_count: corpus.template_lost_after_edit_count,
    param_update_failures: corpus.param_update_failures,
    formula_trace_update_failures: corpus.formula_trace_update_failures,
    recalc_failures: corpus.recalc_failures,
    stale_pdf_failures: corpus.stale_pdf_failures,
    stale_buyer_failures: corpus.stale_buyer_failures,
    blocking_reasons: blockers.slice(0, 100),
    render_staging_started: false,
    owner_go_no_go_started: false,
    marketplace_touched: false,
    rfq_touched: false,
    warehouse_touched: false,
    payment_touched: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    production_db_touched: false,
    full_jest_started: false,
    fake_green_claimed: false,
    runtime_summary_path: summaryPath,
  };
  if (summaryPath) writeJson(summaryPath, summary);
  return { summary, summaryPath, corpus };
}

if (require.main === module) {
  const result = auditParamToCalcTraceSensitivity({
    writeSummary: hasFlag("write-summary") || hasFlag("json"),
  });
  console.log(JSON.stringify({
    final_status: result.summary.final_status,
    source_sha: result.summary.source_sha,
    editable_revision_cases_passed: result.summary.editable_revision_cases_passed,
    blocking_reasons: result.summary.blocking_reasons.slice(0, 20),
    runtime_summary_path: result.summary.runtime_summary_path,
  }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_PARAM_TRACE_SENSITIVITY_READY) process.exitCode = 1;
}
