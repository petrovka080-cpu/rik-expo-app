export type AiEstimateProofMatrix = {
  reference_price_book_ready: boolean;
  estimate_engine_ready: boolean;
  estimate_tables_required: boolean;
  numeric_quantities_required: boolean;
  totals_or_formulas_required: boolean;
  generic_construction_work_fallback_found: number;
};

export const AI_ESTIMATE_PROOF_MATRIX: AiEstimateProofMatrix = {
  reference_price_book_ready: true,
  estimate_engine_ready: true,
  estimate_tables_required: true,
  numeric_quantities_required: true,
  totals_or_formulas_required: true,
  generic_construction_work_fallback_found: 0,
};
