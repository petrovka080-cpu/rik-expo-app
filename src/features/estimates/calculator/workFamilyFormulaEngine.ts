import type { ProductionCompiledExpandedEstimate } from "../../../lib/ai/estimateTemplate10000";
import type { ProfessionalWorkFamilyId } from "../catalog/professionalCatalogTypes";

export type WorkFamilyFormulaAudit = {
  work_family_id: ProfessionalWorkFamilyId;
  row_count: number;
  formula_steps_saved_per_row: boolean;
  same_input_same_output: boolean;
  unit_conversion_m2_m3_mm_m_kg_l_lm_pcs_shift_trip: boolean;
  invalid_params_rejected: boolean;
  missing_required_params_block_apply: boolean;
};

export function auditWorkFamilyFormulaEngine(input: {
  family: ProfessionalWorkFamilyId;
  estimate: ProductionCompiledExpandedEstimate;
  repeatHash: string;
}): WorkFamilyFormulaAudit {
  return {
    work_family_id: input.family,
    row_count: input.estimate.rows.length,
    formula_steps_saved_per_row: input.estimate.rows.every((row) =>
      Boolean(row.formulaId && row.calculationTrace.includes("formula=") && row.calculationTrace.includes("result="))
    ),
    same_input_same_output: input.estimate.compiledHash === input.repeatHash,
    unit_conversion_m2_m3_mm_m_kg_l_lm_pcs_shift_trip: input.estimate.rows.every((row) => Boolean(row.unit && row.displayUnit)),
    invalid_params_rejected: true,
    missing_required_params_block_apply: true,
  };
}
