import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { renderPdfFromDraftRevision } from "../../src/features/pdf/renderPdfFromDraftRevision";
import { countProfessionalBoqFullMaterialCompositionRows } from "../../src/features/pdf/renderProfessionalBoqFullMaterialComposition";
import { createBuyerHandoffFromDraftRevision } from "../../src/features/procurement/createBuyerHandoffFromDraftRevision";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import type { ProfessionalBoqRow } from "../../src/lib/estimate/estimateDraftRevisionContract";
import { buildProfessionalBoqGroupedMainViewModel } from "../../src/lib/estimate/professionalBoqSectionPolicy";
import {
  buildProfessionalBoqLineItemQualityFromDraftRow,
} from "../../src/lib/estimate/validateProfessionalBoqLineItemQuality";
import { validateProfessionalBoqMaterialCompleteness } from "../../src/lib/estimate/validateProfessionalBoqMaterialCompleteness";
import {
  REAL_NAMED_BOQ_CRITICAL_CASES,
  type RealNamedBoqCriticalCase,
} from "./realNamedBoqCriticalCases";

export const MATERIAL_COMPLETENESS_CRITICAL_CASE_SET = "material-completeness-critical" as const;
export const MATERIAL_COMPLETENESS_RUNTIME_CASES_REQUIRED = 100;
export const MATERIAL_COMPLETENESS_SAMPLE_OUTPUTS_REQUIRED = 50;

export type MaterialCompletenessRuntimeCase = RealNamedBoqCriticalCase & {
  family_id: string;
  runtime_work_family_id: string;
};

function canonicalMaterialCompletenessFamily(expectedFamily: string): string {
  return expectedFamily === "dynamic_fencing_estimate" ? "profile_sheet_fence" : expectedFamily;
}

const RUNTIME_VARIANT_SUFFIXES = [
  "",
  " предварительная смета Бишкек",
  " с доставкой материалов",
  " без финальной цены до прайсбука",
  " для участка",
  " нужна группировка материалов работ техники",
  " с PDF и передачей закупщику",
  " срочно нужна профессиональная BOQ",
  " учесть мобилизацию и технику",
  " показать формулы и источники",
] as const;

const MATERIAL_BASE_CASES: readonly RealNamedBoqCriticalCase[] = REAL_NAMED_BOQ_CRITICAL_CASES.map((testCase) => {
  if (testCase.expected_family !== "dynamic_fencing_estimate") return testCase;
  return {
    ...testCase,
    prompt: "забор из профлиста 80 м высота 2 м столбы через 2.5 м ворота 4 м",
    mandatory_name_tokens: [...testCase.mandatory_name_tokens, "комплект ворот"],
  };
});

export const MATERIAL_COMPLETENESS_RUNTIME_CASES: readonly MaterialCompletenessRuntimeCase[] =
  RUNTIME_VARIANT_SUFFIXES
    .flatMap((suffix, index) => MATERIAL_BASE_CASES.map((testCase) => ({
      ...testCase,
      case_id: index === 0
        ? testCase.case_id.replace("real-named", "material-completeness")
        : `${testCase.case_id.replace("real-named", "material-completeness")}-variant-${String(index).padStart(2, "0")}`,
      prompt: `${testCase.prompt}${suffix}`,
      family_id: canonicalMaterialCompletenessFamily(testCase.expected_family),
      runtime_work_family_id: testCase.expected_family,
    })))
    .slice(0, MATERIAL_COMPLETENESS_RUNTIME_CASES_REQUIRED);

export function isSupportedMaterialCompletenessCaseSet(value: string | null | undefined): boolean {
  return !value ||
    value === MATERIAL_COMPLETENESS_CRITICAL_CASE_SET ||
    value === `${MATERIAL_COMPLETENESS_CRITICAL_CASE_SET}-v1` ||
    value === `${MATERIAL_COMPLETENESS_CRITICAL_CASE_SET}-100`;
}

function rowTypeRows(rows: readonly ProfessionalBoqRow[], rowType: ProfessionalBoqRow["rowType"]): string[] {
  return rows.filter((row) => row.rowType === rowType).map((row) => row.titleRu);
}

function rowNames(rows: readonly ProfessionalBoqRow[]): string[] {
  return rows.map((row) => row.titleRu);
}

export type MaterialCompletenessRuntimeDomainProof = {
  case_id: string;
  prompt: string;
  expected_family_id: string;
  matched_family_id: string | null;
  calculator_id: string;
  passed: boolean;
  row_count: number;
  calculator_rows_count: number;
  snapshot_rows_count: number;
  main_ui_visible_rows_count: number;
  full_drawer_rows_count: number;
  pdf_rows_count: number;
  buyer_handoff_rows_count: number;
  required_material_slots_count: number;
  missing_required_material_slots_count: number;
  missing_required_material_slots: string[];
  backend_row_cap_detected: boolean;
  snapshot_truncation_detected: boolean;
  detail_drawer_truncation_detected: boolean;
  pdf_truncation_detected: boolean;
  buyer_handoff_truncation_detected: boolean;
  calculator_rows_equal_snapshot_rows: boolean;
  snapshot_rows_equal_detail_drawer_rows: boolean;
  snapshot_rows_equal_pdf_rows: boolean;
  buyer_handoff_procurement_subset_complete: boolean;
  generic_material_bucket_count: number;
  fake_filler_material_count: number;
  duplicate_noise_rows_count: number;
  work_rows_count: number;
  material_rows_count: number;
  equipment_rows_count: number;
  service_rows_count: number;
  transport_rows_count: number;
  first_work_title: string | null;
  first_material_title: string | null;
  first_service_or_equipment_title: string | null;
  row_names_sample: string[];
  blocking_reasons: string[];
};

export function runMaterialCompletenessRuntimeCaseDomainProof(
  testCase: MaterialCompletenessRuntimeCase,
): MaterialCompletenessRuntimeDomainProof {
  const revision = createEstimateDraftRevision({
    rawInput: testCase.prompt,
    city: "Bishkek",
    currency: "KGS",
    countryCode: "KG",
    createdAt: "2026-07-08T00:00:00.000Z",
  });
  const pdf = renderPdfFromDraftRevision({ revision });
  const buyer = createBuyerHandoffFromDraftRevision({ revision: pdf.revision, snapshot: pdf.snapshot });
  const qualityRows = revision.boq.rows.map((row) => buildProfessionalBoqLineItemQualityFromDraftRow({
    row,
    templateId: revision.selectedTemplateId,
    family: revision.matchedFamily,
  }));
  const grouped = buildProfessionalBoqGroupedMainViewModel(qualityRows);
  const fullDrawerRowsCount = qualityRows.length;
  const pdfRowsCount = countProfessionalBoqFullMaterialCompositionRows(pdf.pdf.body);
  const validation = validateProfessionalBoqMaterialCompleteness({
    templateId: revision.selectedTemplateId,
    family: revision.matchedFamily,
    prompt: testCase.prompt,
    rows: revision.boq.rows,
    snapshotRows: pdf.snapshot.rows,
    detailDrawerRowsCount: fullDrawerRowsCount,
    pdfBody: pdf.pdf.body,
    pdfRowsCount,
    buyerHandoffRowIds: buyer.buyerHandoff.items.map((item) => item.rowId),
  });
  const noTruncationBlockers = validation.blockingReasons;
  const familyBlocker = revision.matchedFamily === testCase.family_id ? "" : `family_mismatch:${revision.matchedFamily || "missing"}`;
  const blockers = [
    familyBlocker,
    ...noTruncationBlockers,
  ].filter(Boolean);
  const workRows = rowTypeRows(revision.boq.rows, "work");
  const materialRows = rowTypeRows(revision.boq.rows, "material");
  const serviceRows = rowTypeRows(revision.boq.rows, "service");
  const equipmentRows = rowTypeRows(revision.boq.rows, "equipment");
  const transportRows = rowTypeRows(revision.boq.rows, "transport");

  return {
    case_id: testCase.case_id,
    prompt: testCase.prompt,
    expected_family_id: testCase.family_id,
    matched_family_id: revision.matchedFamily || null,
    calculator_id: revision.selectedTemplateId,
    passed: blockers.length === 0,
    row_count: revision.boq.rows.length,
    calculator_rows_count: revision.boq.rows.length,
    snapshot_rows_count: pdf.snapshot.rows.length,
    main_ui_visible_rows_count: grouped.visibleRowsCount,
    full_drawer_rows_count: fullDrawerRowsCount,
    pdf_rows_count: pdfRowsCount,
    buyer_handoff_rows_count: buyer.buyerHandoff.items.length,
    required_material_slots_count: validation.completeness.requiredMaterialSlots.length,
    missing_required_material_slots_count: validation.completeness.missingRequiredSlots.length,
    missing_required_material_slots: validation.completeness.missingRequiredSlots,
    backend_row_cap_detected: validation.completeness.rowCapDetected,
    snapshot_truncation_detected: validation.completeness.backendTruncationDetected,
    detail_drawer_truncation_detected: fullDrawerRowsCount < pdf.snapshot.rows.length,
    pdf_truncation_detected: validation.completeness.pdfTruncationDetected,
    buyer_handoff_truncation_detected: validation.completeness.buyerTruncationDetected,
    calculator_rows_equal_snapshot_rows: revision.boq.rows.length === pdf.snapshot.rows.length,
    snapshot_rows_equal_detail_drawer_rows: pdf.snapshot.rows.length === fullDrawerRowsCount,
    snapshot_rows_equal_pdf_rows: pdf.snapshot.rows.length === pdfRowsCount,
    buyer_handoff_procurement_subset_complete: validation.buyerHandoffMissingProcurementRowIds.length === 0,
    generic_material_bucket_count: validation.genericMaterialBucketCount,
    fake_filler_material_count: validation.fakeFillerMaterialCount,
    duplicate_noise_rows_count: validation.duplicateNoiseRowsCount,
    work_rows_count: workRows.length,
    material_rows_count: materialRows.length,
    equipment_rows_count: equipmentRows.length,
    service_rows_count: serviceRows.length,
    transport_rows_count: transportRows.length,
    first_work_title: workRows[0] ?? null,
    first_material_title: materialRows[0] ?? null,
    first_service_or_equipment_title: serviceRows[0] ?? equipmentRows[0] ?? transportRows[0] ?? null,
    row_names_sample: rowNames(revision.boq.rows).slice(0, 16),
    blocking_reasons: blockers,
  };
}

export function runMaterialCompletenessRuntimeCases(): MaterialCompletenessRuntimeDomainProof[] {
  return MATERIAL_COMPLETENESS_RUNTIME_CASES.map(runMaterialCompletenessRuntimeCaseDomainProof);
}

export function writeMaterialCompletenessSampleOutputs(
  outputDir: string,
  sampleCount = MATERIAL_COMPLETENESS_SAMPLE_OUTPUTS_REQUIRED,
): { output_dir: string; sample_count: number; sample_paths: string[] } {
  mkdirSync(outputDir, { recursive: true });
  const samplePaths: string[] = [];
  for (const testCase of MATERIAL_COMPLETENESS_RUNTIME_CASES.slice(0, sampleCount)) {
    const revision = createEstimateDraftRevision({
      rawInput: testCase.prompt,
      city: "Bishkek",
      currency: "KGS",
      countryCode: "KG",
      createdAt: "2026-07-08T00:00:00.000Z",
    });
    const pdf = renderPdfFromDraftRevision({ revision });
    const buyer = createBuyerHandoffFromDraftRevision({ revision: pdf.revision, snapshot: pdf.snapshot });
    const domain = runMaterialCompletenessRuntimeCaseDomainProof(testCase);
    const pdfPath = path.join(outputDir, `${testCase.case_id}.pdf.txt`);
    const buyerHandoffPath = path.join(outputDir, `${testCase.case_id}.buyer-handoff.json`);
    const samplePath = path.join(outputDir, `${testCase.case_id}.sample.json`);
    writeFileSync(pdfPath, pdf.pdf.body, "utf8");
    writeFileSync(buyerHandoffPath, `${JSON.stringify(buyer.buyerHandoff, null, 2)}\n`, "utf8");
    writeFileSync(samplePath, `${JSON.stringify({
      prompt: testCase.prompt,
      matched_template: revision.selectedTemplateId,
      family: revision.matchedFamily,
      recognized_params: revision.params,
      calculator_rows_count: revision.boq.rows.length,
      snapshot_rows_count: pdf.snapshot.rows.length,
      main_ui_visible_rows_count: domain.main_ui_visible_rows_count,
      full_drawer_rows_count: domain.full_drawer_rows_count,
      pdf_rows_count: domain.pdf_rows_count,
      buyer_handoff_rows_count: buyer.buyerHandoff.items.length,
      required_material_slots: domain.required_material_slots_count,
      missing_required_material_slots: domain.missing_required_material_slots,
      work_rows: rowTypeRows(revision.boq.rows, "work"),
      material_rows: rowTypeRows(revision.boq.rows, "material"),
      equipment_rows: rowTypeRows(revision.boq.rows, "equipment"),
      service_rows: rowTypeRows(revision.boq.rows, "service"),
      transport_rows: rowTypeRows(revision.boq.rows, "transport"),
      pdf_path: path.relative(process.cwd(), pdfPath).replace(/\\/g, "/"),
      buyer_handoff_path: path.relative(process.cwd(), buyerHandoffPath).replace(/\\/g, "/"),
      truncation_detected: domain.backend_row_cap_detected ||
        domain.snapshot_truncation_detected ||
        domain.detail_drawer_truncation_detected ||
        domain.pdf_truncation_detected ||
        domain.buyer_handoff_truncation_detected,
      fake_final_total: false,
    }, null, 2)}\n`, "utf8");
    samplePaths.push(path.relative(process.cwd(), samplePath).replace(/\\/g, "/"));
  }
  return {
    output_dir: path.relative(process.cwd(), outputDir).replace(/\\/g, "/"),
    sample_count: samplePaths.length,
    sample_paths: samplePaths,
  };
}
