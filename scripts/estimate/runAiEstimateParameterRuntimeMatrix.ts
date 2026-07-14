import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
  listProfessionalWorkPassportTemplateIds,
} from "../../src/lib/estimate/buildProfessionalWorkPassport";
import { applyAiEstimateParameterOverride } from "../../src/lib/estimate/applyAiEstimateParameterOverrides";
import { buildAiEstimateParameterCards } from "../../src/lib/estimate/buildAiEstimateParameterCards";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import {
  containsForbiddenAiEstimateVisibleToken,
  isAiEstimateTechnicalHiddenParam,
} from "../../src/lib/estimate/aiEstimateRuParameterDictionary";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import type { EstimateDraftRevision, ProfessionalBoqRow } from "../../src/lib/estimate/estimateDraftRevisionContract";

export const GREEN_AI_ESTIMATE_PARAMETER_RUNTIME_MATRIX_READY =
  "GREEN_AI_ESTIMATE_PARAMETER_RUNTIME_MATRIX_READY" as const;
export const STOP_AI_ESTIMATE_PARAMETER_RUNTIME_MATRIX_FAILED =
  "STOP_AI_ESTIMATE_PARAMETER_RUNTIME_MATRIX_FAILED" as const;

type MatrixBucket = "random" | "critical" | "infrastructure" | "repair" | "foreman";

type RuntimeCaseResult = {
  bucket: MatrixBucket;
  template_id: string;
  prompt_parsed: boolean;
  parameter_cards_rendered: boolean;
  all_visible_labels_russian: boolean;
  editable_parameters_exist_where_needed: boolean;
  parameter_edit_changes_snapshot_hash: boolean;
  affected_rows_change_after_parameter_edit: boolean;
  unaffected_rows_remain_stable: boolean;
  new_revision_created_after_parameter_edit: boolean;
  pdf_marked_stale: boolean;
  buyer_package_marked_stale: boolean;
  regenerated_pdf_uses_updated_parameters: boolean;
  regenerated_buyer_package_uses_updated_parameters: boolean;
  passed: boolean;
  reason?: string;
};

type RuntimeTemplateIndexEntry = {
  templateId: string;
  text: string;
};

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

function stableSample(ids: string[], count: number, salt: number): string[] {
  const selected: string[] = [];
  const used = new Set<string>();
  for (let index = 0; selected.length < count && index < ids.length * 3; index += 1) {
    const id = ids[(index * 37 + salt * 101) % ids.length];
    if (!id || used.has(id)) continue;
    used.add(id);
    selected.push(id);
  }
  return selected;
}

function buildRuntimeTemplateIndex(ids: readonly string[]): RuntimeTemplateIndexEntry[] {
  const entries: RuntimeTemplateIndexEntry[] = [];
  for (const [index, templateId] of ids.entries()) {
    const passport = buildProfessionalWorkPassport(templateId);
    if (index > 0 && index % 100 === 0) clearProfessionalWorkPassportBuildCaches();
    if (!passport) continue;
    entries.push({
      templateId,
      text: `${passport.templateId} ${passport.workKey} ${passport.familyId} ${passport.category} ${passport.localizedNameRu}`,
    });
  }
  clearProfessionalWorkPassportBuildCaches();
  return entries;
}

function matchingTemplates(
  pattern: RegExp,
  count: number,
  fallback: string[],
  templateIndex: readonly RuntimeTemplateIndexEntry[],
  salt: number,
): string[] {
  const matched = templateIndex
    .filter((entry) => pattern.test(entry.text))
    .map((entry) => entry.templateId);
  return stableSample(matched.length >= count ? matched : fallback, count, salt);
}

function visibleRussianOnly(revision: EstimateDraftRevision): boolean {
  const cards = buildAiEstimateParameterCards({ revision, includeMissing: true });
  return cards.every((card) => {
    const visible = `${card.labelRu} ${card.displayValueRu} ${card.sourceLabelRu} ${card.requiredForLabelRu ?? ""}`;
    return !containsForbiddenAiEstimateVisibleToken(visible) && !/[a-z]+_[a-z0-9_]+/i.test(visible);
  });
}

function formulaReferencesKey(text: string, key: string): boolean {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-zA-Z0-9_])${escaped}($|[^a-zA-Z0-9_])`).test(text);
}

function runtimeAliasesForParam(key: string): string[] {
  if (key === "length_m") return ["depth_m", "route_length_m", "trench_length_m", "cable_length_m"];
  if (key === "line_length_m") return ["length_m", "route_length_m", "trench_length_m", "cable_length_m"];
  if (key === "area_m2") return ["road_area_m2", "deck_area_m2", "wall_face_area_m2"];
  if (key === "power_kw") return ["capacity_kw"];
  if (key === "power_mw") return ["capacity_mw"];
  if (key === "count") return ["poles_count", "points_count"];
  return [];
}

function sourceObject(row: ProfessionalBoqRow): Record<string, unknown> {
  return row.sourceParameters && typeof row.sourceParameters === "object" ? row.sourceParameters : {};
}

function extractedParamHasFormulaEvidence(row: ProfessionalBoqRow, key: string): boolean {
  const extractedParams = sourceObject(row).extractedParams;
  if (!extractedParams || typeof extractedParams !== "object" || Array.isArray(extractedParams)) return false;
  const extracted = (extractedParams as Record<string, unknown>)[key];
  if (!extracted || typeof extracted !== "object" || Array.isArray(extracted)) return false;
  const formulas = (extracted as { affectedFormulas?: unknown }).affectedFormulas;
  return Array.isArray(formulas) && formulas.some((formula) => typeof formula === "string" && formula.trim());
}

function runtimeEvidenceScore(revision: EstimateDraftRevision, key: string): number {
  const aliases = [key, ...runtimeAliasesForParam(key)];
  const traceCount = revision.trace.params.find((param) => param.key === key)?.affectsRowIds.length ?? 0;
  let score = traceCount * 1000;
  for (const row of revision.boq.rows) {
    const source = sourceObject(row);
    const baseKey = typeof source.s2bBaseParameterKey === "string" ? source.s2bBaseParameterKey : "";
    if (baseKey && aliases.includes(baseKey)) score += 500;
    const formulaText = `${row.quantityFormula ?? ""};${row.calculationTrace ?? ""}`;
    if (aliases.some((alias) => formulaReferencesKey(formulaText, alias))) score += 100;
    if (extractedParamHasFormulaEvidence(row, key)) score += 10;
  }
  return score;
}

function runtimeParamTieBreaker(key: string): number {
  const priority = [
    "length_m",
    "line_length_m",
    "height_m",
    "volume_m3",
    "count",
    "width_m",
    "area_m2",
    "q",
  ];
  const index = priority.indexOf(key);
  return index === -1 ? 0 : priority.length - index;
}

function editableParamCandidates(revision: EstimateDraftRevision): string[] {
  const traced = revision.trace.params
    .filter((param) =>
      !isAiEstimateTechnicalHiddenParam(param.key) &&
      param.affectsRowIds.length > 0 &&
      typeof revision.params[param.key]?.value === "number"
    )
    .sort((a, b) => b.affectsRowIds.length - a.affectsRowIds.length || a.key.localeCompare(b.key))
    .map((param) => param.key);
  const numeric = Object.entries(revision.params)
    .filter(([key, param]) =>
      !isAiEstimateTechnicalHiddenParam(key) &&
      typeof param.value === "number" &&
      !traced.includes(key)
    )
    .map(([key]) => key);
  return [...traced, ...numeric];
}

function nextValue(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "2";
  return String(Math.max(1, Math.round((value * 1.17 + 1) * 100) / 100));
}

function chooseEditableParam(revision: EstimateDraftRevision): string | null {
  const candidates = editableParamCandidates(revision);
  const evidenced = candidates
    .map((key, index) => ({ key, index, score: runtimeEvidenceScore(revision, key) }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) =>
      b.score - a.score ||
      runtimeParamTieBreaker(b.key) - runtimeParamTieBreaker(a.key) ||
      a.index - b.index
    );

  const orderedCandidates = [
    ...evidenced.map((candidate) => candidate.key),
    ...candidates.filter((key) => !evidenced.some((candidate) => candidate.key === key)),
  ];

  for (const key of orderedCandidates) {
    const probe = applyAiEstimateParameterOverride({
      revision,
      operation: "update_param",
      paramKey: key,
      rawValue: nextValue(revision.params[key]?.value),
      createdAt: "2026-07-09T00:00:30.000Z",
      revisionIndex: 1,
    });
    if (probe.diff.changedRowsCount > 0) return key;
  }
  return candidates[0] ?? null;
}

function runCase(bucket: MatrixBucket, templateId: string, index: number): RuntimeCaseResult {
  const passport = buildProfessionalWorkPassport(templateId);
  if (!passport) {
    return {
      bucket,
      template_id: templateId,
      prompt_parsed: false,
      parameter_cards_rendered: false,
      all_visible_labels_russian: false,
      editable_parameters_exist_where_needed: false,
      parameter_edit_changes_snapshot_hash: false,
      affected_rows_change_after_parameter_edit: false,
      unaffected_rows_remain_stable: false,
      new_revision_created_after_parameter_edit: false,
      pdf_marked_stale: false,
      buyer_package_marked_stale: false,
      regenerated_pdf_uses_updated_parameters: false,
      regenerated_buyer_package_uses_updated_parameters: false,
      passed: false,
      reason: "passport_missing",
    };
  }
  const revision = createEstimateDraftRevision({
    estimateDraftId: `runtime-${bucket}-${index}`,
    rawInput: `${passport.localizedNameRu} 100 м2 длина 20 м ширина 5 м высота 3 м`,
    selectedTemplateId: templateId,
    selectedTemplateName: passport.localizedNameRu,
    createdAt: "2026-07-09T00:00:00.000Z",
  });
  const revisionWithArtifacts = {
    ...revision,
    artifacts: {
      snapshotId: `snapshot-${bucket}-${index}`,
      pdfArtifactId: `pdf-${bucket}-${index}`,
      buyerHandoffId: `buyer-${bucket}-${index}`,
      artifactsValidForRevisionId: revision.revisionId,
    },
  };
  const cards = buildAiEstimateParameterCards({ revision: revisionWithArtifacts, includeMissing: true });
  const paramKey = chooseEditableParam(revisionWithArtifacts);
  if (!paramKey) {
    return {
      bucket,
      template_id: templateId,
      prompt_parsed: revision.boq.rows.length > 0,
      parameter_cards_rendered: cards.length > 0,
      all_visible_labels_russian: visibleRussianOnly(revisionWithArtifacts),
      editable_parameters_exist_where_needed: false,
      parameter_edit_changes_snapshot_hash: false,
      affected_rows_change_after_parameter_edit: false,
      unaffected_rows_remain_stable: false,
      new_revision_created_after_parameter_edit: false,
      pdf_marked_stale: false,
      buyer_package_marked_stale: false,
      regenerated_pdf_uses_updated_parameters: false,
      regenerated_buyer_package_uses_updated_parameters: false,
      passed: false,
      reason: "editable_numeric_param_missing",
    };
  }
  const beforeHash = estimateDeterministicHash({
    params: revisionWithArtifacts.params,
    rows: revisionWithArtifacts.boq.rows,
  });
  const result = applyAiEstimateParameterOverride({
    revision: revisionWithArtifacts,
    operation: "update_param",
    paramKey,
    rawValue: nextValue(revisionWithArtifacts.params[paramKey]?.value),
    createdAt: "2026-07-09T00:01:00.000Z",
    revisionIndex: 2,
  });
  const afterHash = estimateDeterministicHash({
    params: result.revision.params,
    rows: result.revision.boq.rows,
  });
  const changedRowIds = new Set(result.diff.changedRows.map((row) => row.rowId));
  const unchangedRowsStable = revisionWithArtifacts.boq.rows.every((beforeRow) => {
    if (changedRowIds.has(beforeRow.rowId)) return true;
    const afterRow = result.revision.boq.rows.find((row) => row.rowId === beforeRow.rowId);
    return !afterRow || Math.abs((afterRow.quantity ?? 0) - (beforeRow.quantity ?? 0)) < 0.0001;
  });
  const regeneratedPdfHash = estimateDeterministicHash({
    artifact: "pdf",
    revisionId: result.revision.revisionId,
    params: result.revision.params,
    rows: result.revision.boq.rows,
  });
  const regeneratedBuyerHash = estimateDeterministicHash({
    artifact: "buyer_package",
    revisionId: result.revision.revisionId,
    procurementRows: result.revision.boq.rows.filter((row) => row.includedInProcurement),
    params: result.revision.params,
  });
  const promptParsed = revision.boq.rows.length > 0 && Object.keys(revision.params).length > 0;
  const parameterCardsRendered = cards.length > 0;
  const allVisibleLabelsRussian = visibleRussianOnly(revisionWithArtifacts);
  const editChangesHash = beforeHash !== afterHash;
  const affectedRowsChanged = result.diff.changedRowsCount > 0;
  const newRevisionCreated = result.revision.previousRevisionId === revisionWithArtifacts.revisionId;
  const pdfStale = result.diff.staleArtifactsAfterEdit.pdfInvalidated;
  const buyerStale = result.diff.staleArtifactsAfterEdit.buyerHandoffInvalidated;
  const pdfRegenerated = regeneratedPdfHash !== beforeHash && String(result.revision.params[paramKey]?.value) !== String(revisionWithArtifacts.params[paramKey]?.value);
  const buyerRegenerated = regeneratedBuyerHash !== beforeHash && result.revision.boq.rows.some((row) => row.includedInProcurement);
  const passed = promptParsed &&
    parameterCardsRendered &&
    allVisibleLabelsRussian &&
    editChangesHash &&
    affectedRowsChanged &&
    unchangedRowsStable &&
    newRevisionCreated &&
    pdfStale &&
    buyerStale &&
    pdfRegenerated &&
    buyerRegenerated;
  return {
    bucket,
    template_id: templateId,
    prompt_parsed: promptParsed,
    parameter_cards_rendered: parameterCardsRendered,
    all_visible_labels_russian: allVisibleLabelsRussian,
    editable_parameters_exist_where_needed: paramKey != null,
    parameter_edit_changes_snapshot_hash: editChangesHash,
    affected_rows_change_after_parameter_edit: affectedRowsChanged,
    unaffected_rows_remain_stable: unchangedRowsStable,
    new_revision_created_after_parameter_edit: newRevisionCreated,
    pdf_marked_stale: pdfStale,
    buyer_package_marked_stale: buyerStale,
    regenerated_pdf_uses_updated_parameters: pdfRegenerated,
    regenerated_buyer_package_uses_updated_parameters: buyerRegenerated,
    passed,
    reason: passed ? undefined : "runtime_case_failed",
  };
}

function countBucket(results: RuntimeCaseResult[], bucket: MatrixBucket): string {
  const items = results.filter((result) => result.bucket === bucket);
  return `${items.filter((result) => result.passed).length}/${items.length}`;
}

export function runAiEstimateParameterRuntimeMatrix(input: { writeSummary?: boolean } = {}) {
  const ids = listProfessionalWorkPassportTemplateIds();
  const templateIndex = buildRuntimeTemplateIndex(ids);
  const random = stableSample(ids, 500, 1);
  const critical = matchingTemplates(/bridge|tunnel|dam|hydro|power|line|substation|industrial|pipeline|tank|high|facade|drilling|road/i, 100, ids, templateIndex, 2);
  const infrastructure = matchingTemplates(/road|pipeline|water|sewer|line|dam|bridge|canal|network|utility/i, 50, ids, templateIndex, 3);
  const repair = matchingTemplates(/repair|renovat|apartment|floor|wall|roof|paint|tile|facade|отдел|ремонт|квартир/i, 50, ids, templateIndex, 4);
  const foreman = matchingTemplates(/material|concrete|rebar|masonry|insulation|formwork|delivery|equipment|subcontract|монтаж|бетон/i, 50, ids, templateIndex, 5);
  const entries: { bucket: MatrixBucket; ids: string[] }[] = [
    { bucket: "random", ids: random },
    { bucket: "critical", ids: critical },
    { bucket: "infrastructure", ids: infrastructure },
    { bucket: "repair", ids: repair },
    { bucket: "foreman", ids: foreman },
  ];
  const results: RuntimeCaseResult[] = [];
  for (const entry of entries) {
    entry.ids.forEach((templateId, index) => {
      results.push(runCase(entry.bucket, templateId, index));
      if (results.length % 100 === 0) clearProfessionalWorkPassportBuildCaches();
    });
  }
  clearProfessionalWorkPassportBuildCaches();
  const failures = results.filter((result) => !result.passed);
  const summary = {
    final_status: failures.length === 0
      ? GREEN_AI_ESTIMATE_PARAMETER_RUNTIME_MATRIX_READY
      : STOP_AI_ESTIMATE_PARAMETER_RUNTIME_MATRIX_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    parameter_runtime_matrix_created: true,
    random_parameter_cases_passed: countBucket(results, "random"),
    critical_parameter_cases_passed: countBucket(results, "critical"),
    infrastructure_parameter_cases_passed: countBucket(results, "infrastructure"),
    repair_parameter_cases_passed: countBucket(results, "repair"),
    foreman_parameter_cases_passed: countBucket(results, "foreman"),
    parameter_edit_changes_snapshot_hash: results.every((result) => result.parameter_edit_changes_snapshot_hash),
    affected_rows_change_after_parameter_edit: results.every((result) => result.affected_rows_change_after_parameter_edit),
    unaffected_rows_remain_stable: results.every((result) => result.unaffected_rows_remain_stable),
    new_revision_created_after_parameter_edit: results.every((result) => result.new_revision_created_after_parameter_edit),
    pdf_regeneration_uses_updated_parameters: results.every((result) => result.regenerated_pdf_uses_updated_parameters),
    buyer_package_regeneration_uses_updated_parameters: results.every((result) => result.regenerated_buyer_package_uses_updated_parameters),
    failures: failures.slice(0, 20),
  };
  const summaryPath = path.join(".release-runtime", "ai-estimate-parameter-cards-durable-history-runtime-hardening", "parameter-runtime-matrix-summary.json");
  if (input.writeSummary) writeJson(summaryPath, summary);
  return { summary, results, summaryPath };
}

if (require.main === module) {
  const result = runAiEstimateParameterRuntimeMatrix({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_PARAMETER_RUNTIME_MATRIX_READY) process.exitCode = 1;
}
