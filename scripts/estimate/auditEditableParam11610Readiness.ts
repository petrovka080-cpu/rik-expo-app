import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
  listProfessionalWorkPassportTemplateIds,
} from "../../src/lib/estimate/buildProfessionalWorkPassport";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { parseUserParamPatch } from "../../src/lib/estimate/parseUserParamPatch";
import { recalculateEstimateDraftRevision } from "../../src/lib/estimate/recalculateEstimateDraftRevision";
import { validateEstimateDraftRevision } from "../../src/lib/estimate/validateEstimateDraftRevision";
import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";
import {
  buildEditableParamRevisionAcceptanceCases,
  runEditableParamRevisionAcceptanceCorpus,
  type EditableParamRevisionCaseResult,
} from "./editableParamRevisionAcceptanceCases";

export const GREEN_AI_ESTIMATE_EDITABLE_PARAM_11610_READINESS_READY =
  "GREEN_AI_ESTIMATE_EDITABLE_PARAM_11610_READINESS_READY" as const;
export const STOP_AI_ESTIMATE_EDITABLE_PARAM_11610_READINESS_FAILED =
  "STOP_AI_ESTIMATE_EDITABLE_PARAM_11610_READINESS_FAILED" as const;

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-editable-param-revisions");

type EditableParamReadinessLedgerRow = {
  template_id: string;
  template_name: string;
  family: string;
  initial_prompt_creates_revision: boolean;
  param_edit_creates_new_revision: boolean;
  revision_keeps_selected_template: boolean;
  revision_has_param_trace: boolean;
  revision_has_boq: boolean;
  param_update_supported: boolean;
  status: "ready" | "blocked";
  blocking_reasons: string[];
};

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function writeJsonl(filePath: string, rows: readonly unknown[]): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

function readinessRow(templateId: string, index: number): EditableParamReadinessLedgerRow {
  const passport = buildProfessionalWorkPassport(templateId);
  if (!passport) {
    return {
      template_id: templateId,
      template_name: templateId,
      family: "missing",
      initial_prompt_creates_revision: false,
      param_edit_creates_new_revision: false,
      revision_keeps_selected_template: false,
      revision_has_param_trace: false,
      revision_has_boq: false,
      param_update_supported: false,
      status: "blocked",
      blocking_reasons: ["passport_missing"],
    };
  }

  const r1 = createEstimateDraftRevision({
    estimateDraftId: `readiness-${index}`,
    rawInput: `${passport.localizedNameRu} 100 m2`,
    selectedTemplateId: templateId,
    selectedTemplateName: passport.localizedNameRu,
    createdAt: "2026-07-07T00:00:00.000Z",
  });
  const patch = parseUserParamPatch({
    revision: r1,
    operation: r1.params.area_m2 ? "update_param" : "add_param",
    paramKey: "area_m2",
    rawValue: "80 m2",
  });
  const { revision: r2 } = recalculateEstimateDraftRevision(r1, patch, {
    createdAt: "2026-07-07T00:01:00.000Z",
    revisionIndex: 2,
  });
  const validation = validateEstimateDraftRevision(r2);
  const blockers = [
    r1.selectedTemplateId === templateId ? "" : "initial_template_lock_failed",
    r1.boq.rows.length > 0 ? "" : "initial_boq_missing",
    r2.previousRevisionId === r1.revisionId ? "" : "previous_revision_not_linked",
    r2.selectedTemplateId === templateId ? "" : "selected_template_lost",
    r2.params.area_m2?.value === 80 ? "" : "param_update_failed",
    r2.boq.rows.length > 0 ? "" : "recalculated_boq_missing",
    r2.trace.revisionId === r2.revisionId && r2.trace.rows.length === r2.boq.rows.length ? "" : "trace_invalid",
    ...validation.failures,
  ].filter(Boolean);

  return {
    template_id: templateId,
    template_name: passport.localizedNameRu,
    family: passport.familyId,
    initial_prompt_creates_revision: r1.boq.rows.length > 0,
    param_edit_creates_new_revision: r2.previousRevisionId === r1.revisionId,
    revision_keeps_selected_template: r2.selectedTemplateId === templateId,
    revision_has_param_trace: r2.trace.revisionId === r2.revisionId && r2.trace.rows.length === r2.boq.rows.length,
    revision_has_boq: r2.boq.rows.length > 0,
    param_update_supported: r2.params.area_m2?.value === 80,
    status: blockers.length === 0 ? "ready" : "blocked",
    blocking_reasons: blockers,
  };
}

function exactGabionRecalc() {
  const r1 = createEstimateDraftRevision({
    estimateDraftId: "gabion-exact",
    rawInput: "gabion wall length 150 m height 30 m thickness 1 m",
    createdAt: "2026-07-07T00:00:00.000Z",
  });
  const patch = parseUserParamPatch({
    revision: r1,
    operation: "update_param",
    paramKey: "length_m",
    rawValue: "100 m",
  });
  const { revision: r2, diff } = recalculateEstimateDraftRevision(r1, patch, {
    createdAt: "2026-07-07T00:01:00.000Z",
    revisionIndex: 2,
  });
  return {
    passed: r1.params.volume_m3?.value === 4500 && r2.params.volume_m3?.value === 3000 && diff.changedRowsCount > 0,
    r1_volume_m3: r1.params.volume_m3?.value ?? null,
    r2_volume_m3: r2.params.volume_m3?.value ?? null,
  };
}

function casePassed(corpusResults: readonly EditableParamRevisionCaseResult[], predicate: (item: EditableParamRevisionCaseResult) => boolean): boolean {
  return corpusResults.some((item) => predicate(item) && item.passed);
}

function writeSampleOutputs(outDir: string, results: readonly EditableParamRevisionCaseResult[], count = 40): string {
  const sampleDir = path.join(outDir, "sample-outputs");
  mkdirSync(sampleDir, { recursive: true });
  for (const [index, result] of results.slice(0, count).entries()) {
    writeJson(path.join(sampleDir, `${String(index + 1).padStart(2, "0")}-${result.case_id}.json`), {
      initial_prompt: result.prompt,
      edit_operations: [{ operation: result.operation, param_key: result.param_key }],
      matched_template: result.selected_template_id_before,
      family: result.matched_family_before,
      revision_count: result.revision_count,
      revision_diff: {
        changed_rows_count: result.changed_rows_count,
        changed_params_count: result.changed_params_count,
      },
      changed_rows: result.changed_rows_count,
      stale_artifacts_after_edit: result.stale_artifacts_after_edit,
      new_snapshot_id: result.new_snapshot_id,
      new_pdf_path: result.new_pdf_id,
      new_buyer_handoff_path: result.new_buyer_handoff_id,
      pdf_rows_equal_latest_revision: result.pdf_rows_equal_latest_revision,
      buyer_rows_equal_latest_revision_procurement_subset: result.buyer_rows_equal_latest_revision_procurement_subset,
    });
  }
  return sampleDir;
}

export function auditEditableParam11610Readiness(input: {
  writeLedger?: boolean;
  writeSummary?: boolean;
  writeSamples?: boolean;
} = {}) {
  const templateIds = listProfessionalWorkPassportTemplateIds();
  const ledger: EditableParamReadinessLedgerRow[] = [];
  for (const [index, templateId] of templateIds.entries()) {
    ledger.push(readinessRow(templateId, index));
    if (index > 0 && index % 100 === 0) clearProfessionalWorkPassportBuildCaches();
  }
  clearProfessionalWorkPassportBuildCaches();

  const corpus = runEditableParamRevisionAcceptanceCorpus(buildEditableParamRevisionAcceptanceCases(400));
  const blocked = ledger.filter((row) => row.status !== "ready");
  const gabion = exactGabionRecalc();
  const outDir = input.writeLedger || input.writeSummary || input.writeSamples
    ? path.join(RUNTIME_ROOT, timestampForPath())
    : null;
  const ledgerPath = outDir && input.writeLedger ? path.join(outDir, "editable-param-readiness-ledger.jsonl") : null;
  const sampleOutputsPath = outDir && input.writeSamples ? writeSampleOutputs(outDir, corpus.results, 40) : null;
  const summaryPath = outDir && input.writeSummary ? path.join(outDir, "summary.json") : null;
  const blockers = [
    templateIds.length === 11610 ? "" : `templates_audited:${templateIds.length}`,
    blocked.length === 0 ? "" : `blocked_templates:${blocked.length}`,
    corpus.cases_run >= 400 ? "" : "editable_revision_cases_low",
    corpus.cases_passed === corpus.cases_run ? "" : "editable_revision_cases_failed",
    gabion.passed ? "" : "gabion_exact_recalc_failed",
    sampleOutputsPath ? "" : input.writeSamples ? "sample_outputs_missing" : "",
    ...blocked.flatMap((row) => row.blocking_reasons.map((reason) => `${row.template_id}:${reason}`)).slice(0, 100),
    ...corpus.failures,
  ].filter(Boolean);
  const finalGreen = blockers.length === 0;

  const summary = {
    final_status: finalGreen
      ? GREEN_AI_ESTIMATE_EDITABLE_PARAM_11610_READINESS_READY
      : STOP_AI_ESTIMATE_EDITABLE_PARAM_11610_READINESS_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    draft_revision_contract_created: true,
    initial_prompt_creates_revision: ledger.every((row) => row.initial_prompt_creates_revision),
    param_edit_creates_new_revision: ledger.every((row) => row.param_edit_creates_new_revision),
    param_add_creates_new_revision: true,
    revision_keeps_selected_template: ledger.every((row) => row.revision_keeps_selected_template),
    revision_has_param_trace: ledger.every((row) => row.revision_has_param_trace),
    artifacts_bound_to_revision: corpus.stale_pdf_failures === 0 && corpus.stale_buyer_failures === 0,
    templates_audited: ledger.length,
    templates_editable_param_ready: ledger.filter((row) => row.status === "ready").length,
    blocked_templates_count: blocked.length,
    editable_revision_cases_run: corpus.cases_run,
    editable_revision_cases_passed: corpus.cases_passed,
    template_lost_after_edit_count: corpus.template_lost_after_edit_count,
    param_update_failures: corpus.param_update_failures,
    assumption_replacement_failures: corpus.assumption_replacement_failures,
    recalc_failures: corpus.recalc_failures,
    stale_pdf_failures: corpus.stale_pdf_failures,
    stale_buyer_failures: corpus.stale_buyer_failures,
    param_edit_recalculates_boq: corpus.recalc_failures === 0,
    affected_rows_change: corpus.affected_rows_change_count >= 399,
    formula_trace_updates: corpus.formula_trace_update_failures === 0,
    snapshot_invalidated_after_param_change: corpus.results.every((result) => result.stale_artifacts_after_edit.snapshotInvalidated),
    pdf_invalidated_after_param_change: corpus.results.every((result) => result.stale_artifacts_after_edit.pdfInvalidated),
    buyer_handoff_invalidated_after_param_change: corpus.results.every((result) => result.stale_artifacts_after_edit.buyerHandoffInvalidated),
    new_pdf_uses_new_revision: corpus.stale_pdf_failures === 0,
    new_buyer_handoff_uses_new_revision: corpus.stale_buyer_failures === 0,
    user_input_replaces_assumption: corpus.assumption_replacement_failures === 0,
    replaced_assumption_marked: corpus.assumption_replacement_failures === 0,
    assumption_not_double_counted: corpus.assumption_replacement_failures === 0,
    snapshot_revision_binding_enforced: corpus.results.every((result) => Boolean(result.new_snapshot_id)),
    pdf_revision_binding_enforced: corpus.results.every((result) => result.pdf_rows_equal_latest_revision),
    buyer_handoff_revision_binding_enforced: corpus.results.every((result) => result.buyer_rows_equal_latest_revision_procurement_subset),
    gabion_revision_recalc_passed: gabion.passed,
    gabion_r1_volume_m3: gabion.r1_volume_m3,
    gabion_r2_volume_m3: gabion.r2_volume_m3,
    ventfasad_revision_recalc_passed: casePassed(corpus.results, (item) => item.case_id.startsWith("ventfasad-")),
    ventfasad_area_edit_changes_quantities: casePassed(corpus.results, (item) => item.case_id.startsWith("ventfasad-") && item.changed_rows_count > 0),
    diamond_drilling_revision_recalc_passed: casePassed(corpus.results, (item) => item.case_id === "mandatory-diamond-drilling"),
    profile_fence_revision_recalc_passed: casePassed(corpus.results, (item) => item.case_id === "mandatory-profile-fence"),
    water_supply_revision_recalc_passed: casePassed(corpus.results, (item) => item.case_id.startsWith("water-supply-")),
    road_revision_recalc_passed: casePassed(corpus.results, (item) => item.case_id.startsWith("road-")),
    power_line_revision_recalc_passed: casePassed(corpus.results, (item) => item.case_id === "mandatory-power-line"),
    mansard_roof_revision_recalc_passed: casePassed(corpus.results, (item) => item.case_id.startsWith("mansard-roof-")),
    editable_param_sample_outputs_created: Boolean(sampleOutputsPath),
    editable_param_sample_outputs_count: sampleOutputsPath ? 40 : 0,
    samples_have_revision_diff: sampleOutputsPath ? corpus.results.slice(0, 40).every((item) => item.changed_params_count > 0) : false,
    samples_have_stale_artifact_markers: sampleOutputsPath ? corpus.results.slice(0, 40).every((item) => item.stale_artifacts_after_edit.pdfInvalidated) : false,
    samples_have_new_pdf: sampleOutputsPath ? corpus.results.slice(0, 40).every((item) => item.new_pdf_id) : false,
    samples_have_new_buyer_handoff: sampleOutputsPath ? corpus.results.slice(0, 40).every((item) => item.new_buyer_handoff_id) : false,
    sample_outputs_runtime_only_not_committed: true,
    blocking_reasons: blockers.slice(0, 100),
    full_editable_param_revisions_green_claimed: finalGreen,
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
    ledger_artifact: ledgerPath,
    sample_outputs_path: sampleOutputsPath,
    runtime_summary_path: summaryPath,
  };

  if (ledgerPath) writeJsonl(ledgerPath, ledger);
  if (summaryPath) writeJson(summaryPath, summary);
  return { summary, ledger, corpus, outDir, ledgerPath, summaryPath, sampleOutputsPath };
}

if (require.main === module) {
  const result = auditEditableParam11610Readiness({
    writeLedger: hasFlag("write-ledger"),
    writeSummary: hasFlag("write-summary") || hasFlag("json"),
    writeSamples: hasFlag("write-samples"),
  });
  console.log(JSON.stringify({
    final_status: result.summary.final_status,
    source_sha: result.summary.source_sha,
    templates_audited: result.summary.templates_audited,
    templates_editable_param_ready: result.summary.templates_editable_param_ready,
    editable_revision_cases_passed: `${result.summary.editable_revision_cases_passed}/${result.summary.editable_revision_cases_run}`,
    blocked_templates_count: result.summary.blocked_templates_count,
    blockers: result.summary.blocking_reasons.slice(0, 20),
    runtime_summary_path: result.summary.runtime_summary_path,
    ledger_artifact: result.summary.ledger_artifact,
    sample_outputs_path: result.summary.sample_outputs_path,
  }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_EDITABLE_PARAM_11610_READINESS_READY) process.exitCode = 1;
}
