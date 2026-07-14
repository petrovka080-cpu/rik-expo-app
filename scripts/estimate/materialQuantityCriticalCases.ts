import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { renderPdfFromDraftRevision } from "../../src/features/pdf/renderPdfFromDraftRevision";
import { countProfessionalMaterialQuantityTraceRows } from "../../src/lib/estimate/professionalMaterialQuantityTrace";
import { createBuyerHandoffFromDraftRevision } from "../../src/features/procurement/createBuyerHandoffFromDraftRevision";
import { validateBuyerHandoffMaterialQuantities } from "../../src/features/procurement/validateBuyerHandoffMaterialQuantities";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { materialQuantityLinesFromRows } from "../../src/lib/estimate/professionalMaterialQuantityTrace";
import { validateProfessionalMaterialQuantityAccuracy } from "../../src/lib/estimate/validateProfessionalMaterialQuantityAccuracy";
import {
  MATERIAL_COMPLETENESS_RUNTIME_CASES,
  type MaterialCompletenessRuntimeCase,
} from "./materialCompletenessCriticalCases";

export const MATERIAL_QUANTITY_ACCURACY_CRITICAL_CASE_SET = "material-quantity-accuracy-critical" as const;
export const MATERIAL_QUANTITY_ACCURACY_RUNTIME_CASES_REQUIRED = 100;
export const MATERIAL_QUANTITY_ACCURACY_SAMPLE_OUTPUTS_REQUIRED = 50;

export type MaterialQuantityRuntimeCase = MaterialCompletenessRuntimeCase & {
  quantity_case_set: typeof MATERIAL_QUANTITY_ACCURACY_CRITICAL_CASE_SET;
};

export const MATERIAL_QUANTITY_ACCURACY_RUNTIME_CASES: readonly MaterialQuantityRuntimeCase[] =
  MATERIAL_COMPLETENESS_RUNTIME_CASES
    .slice(0, MATERIAL_QUANTITY_ACCURACY_RUNTIME_CASES_REQUIRED)
    .map((testCase) => ({
      ...testCase,
      case_id: testCase.case_id.replace("material-completeness", "material-quantity"),
      quantity_case_set: MATERIAL_QUANTITY_ACCURACY_CRITICAL_CASE_SET,
    }));

export function isSupportedMaterialQuantityCaseSet(value: string | null | undefined): boolean {
  return !value ||
    value === MATERIAL_QUANTITY_ACCURACY_CRITICAL_CASE_SET ||
    value === `${MATERIAL_QUANTITY_ACCURACY_CRITICAL_CASE_SET}-v1` ||
    value === `${MATERIAL_QUANTITY_ACCURACY_CRITICAL_CASE_SET}-100`;
}

export type MaterialQuantityRuntimeDomainProof = {
  case_id: string;
  prompt: string;
  expected_family_id: string;
  matched_family_id: string | null;
  calculator_id: string;
  passed: boolean;
  row_count: number;
  procurement_rows_count: number;
  material_quantity_lines_count: number;
  formula_backed_lines_count: number;
  source_backed_lines_count: number;
  rounding_backed_lines_count: number;
  waste_backed_lines_count: number;
  dynamic_param_backed_lines_count: number;
  pdf_material_quantity_trace_rows_count: number;
  buyer_handoff_rows_count: number;
  buyer_handoff_quantity_validation_passed: boolean;
  procurement_quantity_less_than_gross_count: number;
  gross_less_than_net_count: number;
  first_material_title: string | null;
  first_work_title: string | null;
  first_service_or_equipment_title: string | null;
  line_names_sample: string[];
  blocking_reasons: string[];
};

function firstTitle(rows: readonly { rowType: string; titleRu: string }[], rowTypes: readonly string[]): string | null {
  return rows.find((row) => rowTypes.includes(row.rowType))?.titleRu ?? null;
}

export function runMaterialQuantityRuntimeCaseDomainProof(
  testCase: MaterialQuantityRuntimeCase,
): MaterialQuantityRuntimeDomainProof {
  const revision = createEstimateDraftRevision({
    rawInput: testCase.prompt,
    city: "Bishkek",
    currency: "KGS",
    countryCode: "KG",
    createdAt: "2026-07-08T00:00:00.000Z",
  });
  const pdf = renderPdfFromDraftRevision({ revision });
  const buyer = createBuyerHandoffFromDraftRevision({ revision: pdf.revision, snapshot: pdf.snapshot });
  const lines = materialQuantityLinesFromRows({
    rows: revision.boq.rows,
    templateId: revision.selectedTemplateId,
    family: revision.matchedFamily,
  });
  const validation = validateProfessionalMaterialQuantityAccuracy({
    templateId: revision.selectedTemplateId,
    family: revision.matchedFamily,
    rows: revision.boq.rows,
    buyerHandoffItems: buyer.buyerHandoff.items,
  });
  const buyerQuantityValidation = validateBuyerHandoffMaterialQuantities({
    templateId: revision.selectedTemplateId,
    family: revision.matchedFamily,
    boqRows: revision.boq.rows,
    buyerHandoffItems: buyer.buyerHandoff.items,
  });
  const pdfTraceRows = countProfessionalMaterialQuantityTraceRows(pdf.pdf.body);
  const blockers = [
    revision.matchedFamily === testCase.family_id ? "" : `family_mismatch:${revision.matchedFamily || "missing"}`,
    validation.passed ? "" : `material_quantity_validation_failed:${validation.blockingReasons.join("|")}`,
    buyerQuantityValidation.passed ? "" : `buyer_material_quantity_validation_failed:${buyerQuantityValidation.blockers.join("|")}`,
    pdfTraceRows === lines.length ? "" : `pdf_trace_rows_mismatch:${pdfTraceRows}/${lines.length}`,
    lines.length > 0 ? "" : "material_quantity_lines_missing",
  ].filter(Boolean);

  return {
    case_id: testCase.case_id,
    prompt: testCase.prompt,
    expected_family_id: testCase.family_id,
    matched_family_id: revision.matchedFamily || null,
    calculator_id: revision.selectedTemplateId,
    passed: blockers.length === 0,
    row_count: revision.boq.rows.length,
    procurement_rows_count: validation.procurementRowsCount,
    material_quantity_lines_count: lines.length,
    formula_backed_lines_count: validation.formulaBackedLinesCount,
    source_backed_lines_count: validation.sourceBackedLinesCount,
    rounding_backed_lines_count: validation.roundingBackedLinesCount,
    waste_backed_lines_count: validation.wasteBackedLinesCount,
    dynamic_param_backed_lines_count: validation.dynamicParamBackedLinesCount,
    pdf_material_quantity_trace_rows_count: pdfTraceRows,
    buyer_handoff_rows_count: buyer.buyerHandoff.items.length,
    buyer_handoff_quantity_validation_passed: buyerQuantityValidation.passed,
    procurement_quantity_less_than_gross_count: lines.filter((line) => line.procurementQuantity + 1e-9 < line.grossQuantity).length,
    gross_less_than_net_count: lines.filter((line) => line.grossQuantity + 1e-9 < line.netQuantity).length,
    first_material_title: firstTitle(revision.boq.rows, ["material"]),
    first_work_title: firstTitle(revision.boq.rows, ["work", "labor"]),
    first_service_or_equipment_title: firstTitle(revision.boq.rows, ["service", "equipment", "transport"]),
    line_names_sample: lines.slice(0, 16).map((line) => line.materialName),
    blocking_reasons: blockers,
  };
}

export function runMaterialQuantityRuntimeCases(): MaterialQuantityRuntimeDomainProof[] {
  return MATERIAL_QUANTITY_ACCURACY_RUNTIME_CASES.map(runMaterialQuantityRuntimeCaseDomainProof);
}

export function writeMaterialQuantitySampleOutputs(
  outputDir: string,
  sampleCount = MATERIAL_QUANTITY_ACCURACY_SAMPLE_OUTPUTS_REQUIRED,
): { output_dir: string; sample_count: number; sample_paths: string[] } {
  mkdirSync(outputDir, { recursive: true });
  const samplePaths: string[] = [];
  for (const testCase of MATERIAL_QUANTITY_ACCURACY_RUNTIME_CASES.slice(0, sampleCount)) {
    const revision = createEstimateDraftRevision({
      rawInput: testCase.prompt,
      city: "Bishkek",
      currency: "KGS",
      countryCode: "KG",
      createdAt: "2026-07-08T00:00:00.000Z",
    });
    const pdf = renderPdfFromDraftRevision({ revision });
    const buyer = createBuyerHandoffFromDraftRevision({ revision: pdf.revision, snapshot: pdf.snapshot });
    const domain = runMaterialQuantityRuntimeCaseDomainProof(testCase);
    const pdfPath = path.join(outputDir, `${testCase.case_id}.pdf.txt`);
    const buyerPath = path.join(outputDir, `${testCase.case_id}.buyer-handoff.json`);
    const samplePath = path.join(outputDir, `${testCase.case_id}.sample.json`);
    writeFileSync(pdfPath, pdf.pdf.body, "utf8");
    writeFileSync(buyerPath, `${JSON.stringify(buyer.buyerHandoff, null, 2)}\n`, "utf8");
    writeFileSync(samplePath, `${JSON.stringify({
      prompt: testCase.prompt,
      matched_template: revision.selectedTemplateId,
      family: revision.matchedFamily,
      material_quantity: domain,
      pdf_path: path.relative(process.cwd(), pdfPath).replace(/\\/g, "/"),
      buyer_handoff_path: path.relative(process.cwd(), buyerPath).replace(/\\/g, "/"),
    }, null, 2)}\n`, "utf8");
    samplePaths.push(path.relative(process.cwd(), samplePath).replace(/\\/g, "/"));
  }
  return {
    output_dir: path.relative(process.cwd(), outputDir).replace(/\\/g, "/"),
    sample_count: samplePaths.length,
    sample_paths: samplePaths,
  };
}
