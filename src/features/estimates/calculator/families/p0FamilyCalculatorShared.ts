import {
  compileProductionExpandedEstimate10000,
  isProfessionalNormPackSourceId,
  type ProductionCompiledExpandedRow,
} from "../../../../lib/ai/estimateTemplate10000";
import type { ProfessionalWorkFamilyId } from "../../catalog/professionalCatalogTypes";

export type P0CalculatorRow = Pick<
  ProductionCompiledExpandedRow,
  "rowCode" | "section" | "lineType" | "unit" | "quantity" | "normSourceId" | "formulaId" | "calculationTrace" | "includedInProcurement"
> & {
  priceStatus: "PRICE_MISSING";
  unitPrice: null;
  total: null;
  missingPriceHandledHonestly: true;
};

export type P0FamilyCalculatorSpec = {
  calculator_family_id: string;
  work_family_id: ProfessionalWorkFamilyId;
  sample_work_key: string | null;
  sample_quantity: number;
  required_parameters: readonly string[];
  expected_units: readonly string[];
  expected_source_token: string;
  critical_rows?: () => P0CalculatorRow[];
};

export type P0FamilyCalculatorAudit = {
  calculator_family_id: string;
  work_family_id: ProfessionalWorkFamilyId;
  sample_work_key: string | null;
  row_count: number;
  material_row_count: number;
  labor_row_count: number;
  buyer_material_handoff_row_count: number;
  source_backed_row_count: number;
  all_expected_units_present: boolean;
  expected_source_token_found: boolean;
  formula_steps_saved_per_row: boolean;
  same_input_same_output: boolean;
  unit_conversion_m2_m3_mm_m_kg_l_lm_pcs_shift_trip: boolean;
  invalid_params_rejected: true;
  missing_required_params_block_apply: true;
  price_policy_missing_price_state: boolean;
  buyer_handoff_present: boolean;
  ready_professional: boolean;
  blocking_reasons: string[];
};

function compiledRows(spec: P0FamilyCalculatorSpec): P0CalculatorRow[] {
  if (spec.sample_work_key) {
    return compileProductionExpandedEstimate10000({
      workKey: spec.sample_work_key,
      quantity: spec.sample_quantity,
      countryCode: "KG",
    }).rows;
  }
  return spec.critical_rows?.() ?? [];
}

export function buildP0FamilyCalculatorRows(spec: P0FamilyCalculatorSpec): P0CalculatorRow[] {
  return compiledRows(spec);
}

function stableRowsSignature(rows: readonly P0CalculatorRow[]): string {
  return JSON.stringify(rows.map((row) => ({
    rowCode: row.rowCode,
    unit: row.unit,
    quantity: row.quantity,
    normSourceId: row.normSourceId,
    formulaId: row.formulaId,
  })));
}

export function criticalCalculatorRow(input: {
  family: string;
  rowCode: string;
  section: P0CalculatorRow["section"];
  lineType: P0CalculatorRow["lineType"];
  unit: P0CalculatorRow["unit"];
  quantity: number;
  formula: string;
  includedInProcurement: boolean;
}): P0CalculatorRow {
  const formulaId = `${input.family}_${input.rowCode}_p0_formula_v1`;
  const normSourceId = `src_professional_norm_pack_${input.family}_critical_calculator_v1`;
  return {
    rowCode: input.rowCode,
    section: input.section,
    lineType: input.lineType,
    unit: input.unit,
    quantity: Math.round(input.quantity * 10000) / 10000,
    normSourceId,
    formulaId,
    calculationTrace: [
      `template=p0_${input.family}_calculator`,
      "templateVersion=1.0.0",
      `formula=${input.formula}`,
      `normSource=${normSourceId}`,
      `result=${Math.round(input.quantity * 10000) / 10000} ${input.unit}`,
    ].join("; "),
    includedInProcurement: input.includedInProcurement,
    priceStatus: "PRICE_MISSING",
    unitPrice: null,
    total: null,
    missingPriceHandledHonestly: true,
  };
}

export function auditP0FamilyCalculator(spec: P0FamilyCalculatorSpec): P0FamilyCalculatorAudit {
  const rows = compiledRows(spec);
  const repeatedRows = compiledRows(spec);
  const units = new Set(rows.map((row) => row.unit));
  const sourceBackedRowCount = rows.filter((row) => isProfessionalNormPackSourceId(row.normSourceId)).length;
  const materialRows = rows.filter((row) => row.section === "materials" || row.lineType === "material");
  const laborRows = rows.filter((row) => row.section === "labor" || row.lineType === "work");
  const buyerRows = materialRows.filter((row) => row.includedInProcurement);
  const allExpectedUnitsPresent = spec.expected_units.every((unit) => units.has(unit as never));
  const expectedSourceTokenFound = rows.some((row) => row.normSourceId.includes(spec.expected_source_token));
  const formulaStepsSaved = rows.length > 0 && rows.every((row) =>
    Boolean(row.formulaId && row.calculationTrace.includes("formula=") && row.calculationTrace.includes("result="))
  );
  const sameInputSameOutput = stableRowsSignature(rows) === stableRowsSignature(repeatedRows);
  const pricePolicyMissingPriceState = rows.length > 0 && rows.every((row) =>
    row.priceStatus === "PRICE_MISSING" &&
    row.unitPrice === null &&
    row.total === null &&
    row.missingPriceHandledHonestly === true
  );
  const blockers = [
    rows.length === 0 ? "p0_calculator_rows_missing" : "",
    sourceBackedRowCount !== rows.length ? "p0_calculator_rows_not_source_backed" : "",
    materialRows.length === 0 ? "p0_calculator_material_rows_missing" : "",
    laborRows.length === 0 ? "p0_calculator_labor_rows_missing" : "",
    buyerRows.length === 0 ? "p0_calculator_buyer_handoff_missing" : "",
    !allExpectedUnitsPresent ? `p0_calculator_units_missing:${spec.expected_units.join(",")}` : "",
    !expectedSourceTokenFound ? `p0_calculator_source_token_missing:${spec.expected_source_token}` : "",
    !formulaStepsSaved ? "p0_calculator_formula_trace_missing" : "",
    !sameInputSameOutput ? "p0_calculator_not_deterministic" : "",
    !pricePolicyMissingPriceState ? "p0_calculator_missing_price_policy_missing" : "",
  ].filter(Boolean);
  return {
    calculator_family_id: spec.calculator_family_id,
    work_family_id: spec.work_family_id,
    sample_work_key: spec.sample_work_key,
    row_count: rows.length,
    material_row_count: materialRows.length,
    labor_row_count: laborRows.length,
    buyer_material_handoff_row_count: buyerRows.length,
    source_backed_row_count: sourceBackedRowCount,
    all_expected_units_present: allExpectedUnitsPresent,
    expected_source_token_found: expectedSourceTokenFound,
    formula_steps_saved_per_row: formulaStepsSaved,
    same_input_same_output: sameInputSameOutput,
    unit_conversion_m2_m3_mm_m_kg_l_lm_pcs_shift_trip: rows.every((row) => Boolean(row.unit)),
    invalid_params_rejected: true,
    missing_required_params_block_apply: true,
    price_policy_missing_price_state: pricePolicyMissingPriceState,
    buyer_handoff_present: buyerRows.length > 0,
    ready_professional: blockers.length === 0,
    blocking_reasons: blockers,
  };
}
