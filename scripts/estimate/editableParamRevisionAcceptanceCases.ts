import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { parseUserParamPatch } from "../../src/lib/estimate/parseUserParamPatch";
import { recalculateEstimateDraftRevision } from "../../src/lib/estimate/recalculateEstimateDraftRevision";
import { compareEstimateDraftRevisions } from "../../src/lib/estimate/compareEstimateDraftRevisions";
import { validateEstimateDraftRevision } from "../../src/lib/estimate/validateEstimateDraftRevision";
import { createSnapshotFromDraftRevision } from "../../src/features/estimates/createSnapshotFromDraftRevision";
import { renderPdfFromDraftRevision } from "../../src/features/pdf/renderPdfFromDraftRevision";
import { createBuyerHandoffFromDraftRevision } from "../../src/features/procurement/createBuyerHandoffFromDraftRevision";
import type {
  EstimateDraftRevision,
  EstimateDraftRevisionDiff,
  EstimateDraftRevisionParamValue,
} from "../../src/lib/estimate/estimateDraftRevisionContract";
import type { UserParamPatchOperation } from "../../src/lib/estimate/validateUserParamPatch";

export const EDITABLE_PARAM_REVISION_CASE_SET = "editable-param-critical-v1" as const;

export type EditableParamRevisionAcceptanceCase = {
  id: string;
  prompt: string;
  selectedTemplateId?: string;
  selectedTemplateName?: string;
  operation: UserParamPatchOperation;
  paramKey: string;
  rawValue: string;
  expectedFamily: string;
  expectedParamAfter?: EstimateDraftRevisionParamValue;
  expectChangedRows?: boolean;
  seedAssumption?: {
    key: string;
    value: EstimateDraftRevisionParamValue;
    reason: string;
  };
};

export type EditableParamRevisionCaseResult = {
  case_id: string;
  prompt: string;
  selected_template_id_before: string;
  selected_template_id_after: string;
  matched_family_before: string;
  matched_family_after: string;
  operation: UserParamPatchOperation;
  param_key: string;
  revision_count: 2;
  changed_rows_count: number;
  changed_params_count: number;
  stale_artifacts_after_edit: EstimateDraftRevisionDiff["staleArtifactsAfterEdit"];
  new_snapshot_id: string | null;
  new_pdf_id: string | null;
  new_buyer_handoff_id: string | null;
  pdf_rows_equal_latest_revision: boolean;
  buyer_rows_equal_latest_revision_procurement_subset: boolean;
  passed: boolean;
  blocking_reasons: string[];
};

export type EditableParamRevisionAcceptanceSummary = {
  cases_run: number;
  cases_passed: number;
  template_lost_after_edit_count: number;
  param_update_failures: number;
  assumption_replacement_failures: number;
  recalc_failures: number;
  stale_pdf_failures: number;
  stale_buyer_failures: number;
  affected_rows_change_count: number;
  formula_trace_update_failures: number;
  results: EditableParamRevisionCaseResult[];
  failures: string[];
};

function gabionCase(index: number): EditableParamRevisionAcceptanceCase {
  const length = 120 + index;
  const height = 3 + (index % 12);
  const nextLength = Math.max(10, length - 20);
  return {
    id: `gabion-${index}`,
    prompt: `gabion wall length ${length} m height ${height} m thickness 1 m`,
    operation: "update_param",
    paramKey: "length_m",
    rawValue: `${nextLength} m`,
    expectedFamily: "gabion_wall",
    expectedParamAfter: nextLength,
  };
}

function ventfasadCase(index: number): EditableParamRevisionAcceptanceCase {
  const area = 600 + index * 7;
  const nextArea = area - 100;
  return {
    id: `ventfasad-${index}`,
    prompt: `ventfasad turnkey ${area} m2`,
    operation: "update_param",
    paramKey: "area_m2",
    rawValue: `${nextArea} m2`,
    expectedFamily: "ventilated_facade",
    expectedParamAfter: nextArea,
  };
}

function waterSupplyCase(index: number): EditableParamRevisionAcceptanceCase {
  const km = 2 + (index % 6);
  const nextMeters = km * 700;
  return {
    id: `water-supply-${index}`,
    prompt: `village water supply ${km} km pipe PE100 d110`,
    operation: "update_param",
    paramKey: "length_m",
    rawValue: `${nextMeters} m`,
    expectedFamily: "village_water_supply",
    expectedParamAfter: nextMeters,
  };
}

function roadCase(index: number): EditableParamRevisionAcceptanceCase {
  const km = 1 + (index % 5);
  const nextMeters = km * 600;
  return {
    id: `road-${index}`,
    prompt: `road ${km} km width 7 m asphalt, full pavement structure`,
    operation: "update_param",
    paramKey: "length_m",
    rawValue: `${nextMeters} m`,
    expectedFamily: "road_construction",
    expectedParamAfter: nextMeters,
  };
}

function mansardRoofCase(index: number): EditableParamRevisionAcceptanceCase {
  const area = 160 + index * 3;
  const nextArea = area + 40;
  return {
    id: `mansard-roof-${index}`,
    prompt: `mansard roof ${area} m2 with windows metal tile insulation 200 mm`,
    operation: "update_param",
    paramKey: "area_m2",
    rawValue: `${nextArea} m2`,
    expectedFamily: "mansard_roof_with_windows",
    expectedParamAfter: nextArea,
  };
}

export function buildEditableParamRevisionAcceptanceCases(count = 400): EditableParamRevisionAcceptanceCase[] {
  const cases: EditableParamRevisionAcceptanceCase[] = [
    {
      id: "mandatory-diamond-drilling",
      prompt: "diamond core drill concrete 12 holes diameter 110 mm depth 250 mm",
      operation: "update_param",
      paramKey: "diameter_mm",
      rawValue: "90 mm",
      expectedFamily: "diamond_core_drilling_concrete",
      expectedParamAfter: 90,
    },
    {
      id: "mandatory-profile-fence",
      prompt: "profile fence 100 m height 2 m",
      selectedTemplateId: "dynamic_fencing_estimate_dynamic_professional_boq_runtime_v1",
      selectedTemplateName: "profile sheet fence",
      operation: "update_param",
      paramKey: "length_m",
      rawValue: "80 m",
      expectedFamily: "profile_sheet_fence",
      expectedParamAfter: 80,
    },
    {
      id: "mandatory-power-line",
      prompt: "power line 10 kV 2 km pole step 50 m",
      selectedTemplateId: "overhead_power_line_10kv_preliminary_boq_expanded_complex_v1",
      selectedTemplateName: "power line 10 kV",
      operation: "update_param",
      paramKey: "length_m",
      rawValue: "1000 m",
      expectedFamily: "overhead_power_line_10kv",
      expectedParamAfter: 1000,
    },
    {
      id: "mandatory-assumption-replacement",
      prompt: "ventfasad turnkey 1500 m2",
      operation: "replace_assumption",
      paramKey: "height_m",
      rawValue: "40 m",
      expectedFamily: "ventilated_facade",
      expectedParamAfter: 40,
      expectChangedRows: false,
      seedAssumption: {
        key: "height_m",
        value: 30,
        reason: "Default facade access height.",
      },
    },
  ];

  for (let index = 1; cases.length < count; index += 1) {
    cases.push(gabionCase(index));
    if (cases.length >= count) break;
    cases.push(ventfasadCase(index));
    if (cases.length >= count) break;
    cases.push(waterSupplyCase(index));
    if (cases.length >= count) break;
    cases.push(roadCase(index));
    if (cases.length >= count) break;
    cases.push(mansardRoofCase(index));
  }
  return cases.slice(0, count);
}

function valuesEqual(actual: unknown, expected: EstimateDraftRevisionParamValue | undefined): boolean {
  if (expected === undefined) return true;
  if (typeof expected === "number") return typeof actual === "number" && Math.abs(actual - expected) < 0.0001;
  return actual === expected;
}

function bindInitialArtifacts(revision: EstimateDraftRevision): EstimateDraftRevision {
  const snapshot = createSnapshotFromDraftRevision(revision);
  const pdf = renderPdfFromDraftRevision({ revision: snapshot.revision, snapshot: snapshot.snapshot });
  return createBuyerHandoffFromDraftRevision({ revision: pdf.revision, snapshot: pdf.snapshot }).revision;
}

export function runEditableParamRevisionAcceptanceCase(
  testCase: EditableParamRevisionAcceptanceCase,
): EditableParamRevisionCaseResult {
  const blockers: string[] = [];
  let r1 = createEstimateDraftRevision({
    estimateDraftId: `editable-${testCase.id}`,
    rawInput: testCase.prompt,
    selectedTemplateId: testCase.selectedTemplateId,
    selectedTemplateName: testCase.selectedTemplateName,
    createdAt: "2026-07-07T00:00:00.000Z",
  });
  if (testCase.seedAssumption && !r1.assumptions.some((assumption) => assumption.key === testCase.seedAssumption?.key)) {
    r1 = {
      ...r1,
      assumptions: [
        ...r1.assumptions,
        {
          key: testCase.seedAssumption.key,
          value: testCase.seedAssumption.value,
          reason: testCase.seedAssumption.reason,
          replacedByUserInput: false,
          visibleToUser: true,
        },
      ],
    };
  }
  const r1Validation = validateEstimateDraftRevision(r1);
  if (!r1Validation.valid) blockers.push(...r1Validation.failures.map((failure) => `r1:${failure}`));
  r1 = bindInitialArtifacts(r1);

  const patch = parseUserParamPatch({
    revision: r1,
    operation: testCase.operation,
    paramKey: testCase.paramKey,
    rawValue: testCase.rawValue,
  });
  const { revision: r2, diff } = recalculateEstimateDraftRevision(r1, patch, {
    createdAt: "2026-07-07T00:01:00.000Z",
    revisionIndex: 2,
  });
  const staleDiff = compareEstimateDraftRevisions(r1, r2);
  const r2Validation = validateEstimateDraftRevision(r2);
  const r2Snapshot = createSnapshotFromDraftRevision(r2);
  const r2Pdf = renderPdfFromDraftRevision({ revision: r2Snapshot.revision, snapshot: r2Snapshot.snapshot });
  const r2Buyer = createBuyerHandoffFromDraftRevision({ revision: r2Pdf.revision, snapshot: r2Pdf.snapshot });

  const changedRowsRequired = testCase.expectChangedRows !== false;
  const traceUpdated = r2.trace.revisionId === r2.revisionId &&
    r2.trace.selectedTemplateId === r2.selectedTemplateId &&
    r2.trace.staleTraceAccepted === false &&
    r2.trace.rows.length === r2.boq.rows.length;
  const assumptionReplaced = testCase.operation !== "replace_assumption" ||
    r2.assumptions.some((assumption) => assumption.key === testCase.paramKey && assumption.replacedByUserInput === true);

  if (!r2Validation.valid) blockers.push(...r2Validation.failures.map((failure) => `r2:${failure}`));
  if (!r1.selectedTemplateId || r2.selectedTemplateId !== r1.selectedTemplateId) blockers.push("selected_template_lost_after_edit");
  if (testCase.expectedFamily && r2.matchedFamily !== testCase.expectedFamily) blockers.push(`family_mismatch:${r2.matchedFamily}:${testCase.expectedFamily}`);
  if (!valuesEqual(r2.params[testCase.paramKey]?.value, testCase.expectedParamAfter)) blockers.push("param_value_not_updated");
  if (changedRowsRequired && diff.changedRowsCount <= 0) blockers.push("changed_rows_missing");
  if (!traceUpdated) blockers.push("formula_trace_not_updated");
  if (!staleDiff.staleArtifactsAfterEdit.snapshotInvalidated) blockers.push("snapshot_not_invalidated");
  if (!staleDiff.staleArtifactsAfterEdit.pdfInvalidated) blockers.push("pdf_not_invalidated");
  if (!staleDiff.staleArtifactsAfterEdit.buyerHandoffInvalidated) blockers.push("buyer_handoff_not_invalidated");
  if (r2Pdf.pdf.revisionId !== r2.revisionId || !r2Pdf.pdf.rowsEqualLatestRevision) blockers.push("new_pdf_revision_mismatch");
  if (r2Buyer.buyerHandoff.revisionId !== r2.revisionId || r2Buyer.buyerHandoff.forbiddenWorkRowsPresent !== false) {
    blockers.push("new_buyer_handoff_revision_mismatch");
  }
  if (!assumptionReplaced) blockers.push("assumption_not_replaced");

  return {
    case_id: testCase.id,
    prompt: testCase.prompt,
    selected_template_id_before: r1.selectedTemplateId,
    selected_template_id_after: r2.selectedTemplateId,
    matched_family_before: r1.matchedFamily,
    matched_family_after: r2.matchedFamily,
    operation: testCase.operation,
    param_key: testCase.paramKey,
    revision_count: 2,
    changed_rows_count: diff.changedRowsCount,
    changed_params_count: diff.changedParams.length,
    stale_artifacts_after_edit: staleDiff.staleArtifactsAfterEdit,
    new_snapshot_id: r2Snapshot.snapshot.snapshotId,
    new_pdf_id: r2Pdf.pdf.pdfArtifactId,
    new_buyer_handoff_id: r2Buyer.buyerHandoff.buyerHandoffId,
    pdf_rows_equal_latest_revision: r2Pdf.pdf.revisionId === r2.revisionId && r2Pdf.pdf.rowsEqualLatestRevision,
    buyer_rows_equal_latest_revision_procurement_subset:
      r2Buyer.buyerHandoff.revisionId === r2.revisionId && r2Buyer.buyerHandoff.forbiddenWorkRowsPresent === false,
    passed: blockers.length === 0,
    blocking_reasons: blockers,
  };
}

export function runEditableParamRevisionAcceptanceCorpus(
  cases: EditableParamRevisionAcceptanceCase[] = buildEditableParamRevisionAcceptanceCases(400),
): EditableParamRevisionAcceptanceSummary {
  const results = cases.map((testCase) => {
    try {
      return runEditableParamRevisionAcceptanceCase(testCase);
    } catch (error) {
      const failed: EditableParamRevisionCaseResult = {
        case_id: testCase.id,
        prompt: testCase.prompt,
        selected_template_id_before: "",
        selected_template_id_after: "",
        matched_family_before: "",
        matched_family_after: "",
        operation: testCase.operation,
        param_key: testCase.paramKey,
        revision_count: 2,
        changed_rows_count: 0,
        changed_params_count: 0,
        stale_artifacts_after_edit: {
          snapshotInvalidated: false,
          pdfInvalidated: false,
          buyerHandoffInvalidated: false,
        },
        new_snapshot_id: null,
        new_pdf_id: null,
        new_buyer_handoff_id: null,
        pdf_rows_equal_latest_revision: false,
        buyer_rows_equal_latest_revision_procurement_subset: false,
        passed: false,
        blocking_reasons: [error instanceof Error ? error.message : String(error)],
      };
      return failed;
    }
  });
  const failures = results
    .filter((result) => !result.passed)
    .flatMap((result) => result.blocking_reasons.map((reason) => `${result.case_id}:${reason}`));
  return {
    cases_run: results.length,
    cases_passed: results.filter((result) => result.passed).length,
    template_lost_after_edit_count: results.filter((result) => result.blocking_reasons.includes("selected_template_lost_after_edit")).length,
    param_update_failures: results.filter((result) => result.blocking_reasons.includes("param_value_not_updated")).length,
    assumption_replacement_failures: results.filter((result) => result.blocking_reasons.includes("assumption_not_replaced")).length,
    recalc_failures: results.filter((result) => result.blocking_reasons.includes("changed_rows_missing")).length,
    stale_pdf_failures: results.filter((result) => result.blocking_reasons.includes("pdf_not_invalidated") || result.blocking_reasons.includes("new_pdf_revision_mismatch")).length,
    stale_buyer_failures: results.filter((result) => result.blocking_reasons.includes("buyer_handoff_not_invalidated") || result.blocking_reasons.includes("new_buyer_handoff_revision_mismatch")).length,
    affected_rows_change_count: results.filter((result) => result.changed_rows_count > 0).length,
    formula_trace_update_failures: results.filter((result) => result.blocking_reasons.includes("formula_trace_not_updated")).length,
    results,
    failures: failures.slice(0, 100),
  };
}

if (require.main === module) {
  const result = runEditableParamRevisionAcceptanceCorpus();
  console.log(JSON.stringify({
    case_set: EDITABLE_PARAM_REVISION_CASE_SET,
    cases_passed: `${result.cases_passed}/${result.cases_run}`,
    failures: result.failures.slice(0, 20),
  }, null, 2));
  if (result.cases_passed !== result.cases_run) process.exitCode = 1;
}
