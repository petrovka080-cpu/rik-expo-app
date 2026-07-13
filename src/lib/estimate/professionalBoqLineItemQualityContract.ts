import type { CanonicalProfessionalBoqUnit } from "./canonicalUnits";
import type { WorkPassportRowType } from "./workPassportContract";

export type ProfessionalBoqLineItemRowType =
  | WorkPassportRowType
  | "mobilization"
  | "overhead"
  | "document"
  | "other";

export type ProfessionalBoqNomenclatureType =
  | "material"
  | "work"
  | "service"
  | "equipment";

export type ProfessionalBoqLineItemQuality = {
  rowId: string;
  templateId: string;
  family: string;
  rowType: ProfessionalBoqLineItemRowType;
  displayName: string;
  professionalName: string;
  nomenclatureName: string;
  nomenclatureId: string | null;
  nomenclatureType: ProfessionalBoqNomenclatureType | "source_backed_row";
  nomenclatureResolved: boolean;
  nameIsNotGeneric: boolean;
  nameIsNotTemplateOnly: boolean;
  nameIsNotRawFormulaOrDebug: boolean;
  canonicalUnit: CanonicalProfessionalBoqUnit | null;
  unitValid: boolean;
  quantityFormula: string;
  formulaId: string;
  sourceId: string;
  normId: string;
  citationLabel: string;
  sourceBacked: boolean;
  calculationTrace: string;
  section: string;
  groupedUiSection: string;
  pdfSection: string;
  procurementEligible: boolean;
  buyerHandoffEligible: boolean;
};

export type ProfessionalBoqLineItemQualityIssue =
  | "generic_name"
  | "template_only_name"
  | "raw_formula_or_debug_name"
  | "missing_nomenclature"
  | "missing_source"
  | "missing_citation"
  | "missing_formula"
  | "missing_calculation_trace"
  | "invalid_unit"
  | "missing_grouped_ui_section"
  | "missing_pdf_section"
  | "buyer_handoff_procurement_mismatch";

export type ProfessionalBoqLineItemQualityValidation = {
  passed: boolean;
  issues: ProfessionalBoqLineItemQualityIssue[];
};

export type ProfessionalBoqLineItemQualityCounters = {
  row_count: number;
  real_named_rows_count: number;
  generic_rows_count: number;
  template_only_rows_count: number;
  raw_formula_or_debug_rows_count: number;
  rows_without_real_nomenclature_count: number;
  rows_without_source_citation_count: number;
  rows_without_formula_count: number;
  rows_without_calculation_trace_count: number;
  wrong_unit_rows_count: number;
  duplicate_noise_rows_count: number;
  missing_grouped_ui_section_count: number;
  missing_pdf_section_count: number;
  buyer_handoff_eligible_rows_count: number;
  buyer_handoff_ineligible_procurement_rows_count: number;
  material_service_equipment_rows_count: number;
};

export type ProfessionalBoqTemplateLineItemQualityResult =
  ProfessionalBoqLineItemQualityCounters & {
    template_id: string;
    family: string;
    ready_real_named_professional_boq_line_items: boolean;
    blocking_reasons: string[];
  };

export type ProfessionalBoqLineItemQualityRegistrySummary =
  ProfessionalBoqLineItemQualityCounters & {
    templates_total: number;
    templates_processed: number;
    templates_real_named_boq_ready: number;
    blocked_templates_count: number;
    minimum_real_named_boq_rows_required: number;
    min_real_named_rows_per_template: number;
    real_nomenclature_rows_percent: number;
    source_backed_rows_percent: number;
    grouped_ui_ready: boolean;
    pdf_rows_equal_snapshot_rows: boolean;
    buyer_handoff_procurement_subset_valid: boolean;
    no_raw_dump_main_ui: boolean;
    no_template_only_names: boolean;
    no_generic_names: boolean;
    no_wrong_units: boolean;
    blocking_reasons: string[];
  };

export const ZERO_PROFESSIONAL_BOQ_LINE_ITEM_QUALITY_COUNTERS: ProfessionalBoqLineItemQualityCounters = {
  row_count: 0,
  real_named_rows_count: 0,
  generic_rows_count: 0,
  template_only_rows_count: 0,
  raw_formula_or_debug_rows_count: 0,
  rows_without_real_nomenclature_count: 0,
  rows_without_source_citation_count: 0,
  rows_without_formula_count: 0,
  rows_without_calculation_trace_count: 0,
  wrong_unit_rows_count: 0,
  duplicate_noise_rows_count: 0,
  missing_grouped_ui_section_count: 0,
  missing_pdf_section_count: 0,
  buyer_handoff_eligible_rows_count: 0,
  buyer_handoff_ineligible_procurement_rows_count: 0,
  material_service_equipment_rows_count: 0,
};
