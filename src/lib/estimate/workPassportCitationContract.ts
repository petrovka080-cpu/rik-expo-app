export type WorkPassportSourceCitationValidation = {
  template_id: string;
  row_count: number;
  rows_with_source_citation_count: number;
  rows_without_norm_source_count: number;
  rows_without_source_citation_count: number;
  rows_without_formula_provenance_count: number;
  rows_without_quantity_trace_count: number;
  rows_with_price_count: number;
  price_rows_without_pricebook_source_count: number;
  unverified_sources_used_as_trusted_count: number;
  preliminary_rows_with_visible_disclosure_count: number;
  source_registry_ids: string[];
  blocking_reasons: string[];
};

export type WorkPassportSourceCoverageSummary = {
  templates_audited: number;
  rows_audited: number;
  source_citations_attached_to_boq_rows_count: number;
  blocked_templates_count: number;
  rows_without_norm_source_count: number;
  rows_without_source_citation_count: number;
  formulas_without_provenance_count: number;
  rows_without_quantity_trace_count: number;
  rows_with_price_count: number;
  price_rows_without_pricebook_source_count: number;
  unverified_sources_used_as_trusted_count: number;
  preliminary_rows_with_visible_disclosure_count: number;
  source_registry_ids_used_count: number;
  all_11610_work_passports_have_norm_source_citations: boolean;
  all_boq_rows_have_norm_source_citation: boolean;
  all_boq_rows_have_formula_provenance: boolean;
  all_boq_rows_have_quantity_trace: boolean;
  all_price_rows_have_pricebook_source_or_missing_price_policy: boolean;
  blocking_reasons: string[];
};
