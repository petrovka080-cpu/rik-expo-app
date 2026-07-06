import type { CanonicalProfessionalBoqUnit } from "./canonicalUnits";

export type WorkPassportTemplateKind = "base_10000" | "expanded_complex_1610";

export type WorkEstimateLevel =
  | "PROFESSIONAL_EXPANDED"
  | "ROM_CONCEPT"
  | "PRELIMINARY_BOQ"
  | "DETAILED_BOQ_FROM_DRAWINGS"
  | "TENDER_BOQ"
  | "AS_BUILT_ESTIMATE";

export type WorkPassportRowType =
  | "work"
  | "material"
  | "labor"
  | "service"
  | "equipment"
  | "transport";

export type WorkPassportParameter = {
  key: string;
  labelRu: string;
  unit: string | null;
  required: boolean;
  source: "user_measurement" | "source_prompt" | "norm_record" | "professional_default";
  missingBlocksDetailedEstimate: boolean;
};

export type WorkPassportRiskPolicy = {
  dangerousWorkNotRefused: boolean;
  drawingsRequiredForPreliminaryBoq: boolean;
  specialistReviewNoteRequired: boolean;
  contractReadyWithoutReview: boolean;
  finalTotalAllowedWhenPricesMissing: boolean;
};

export type ProfessionalBoqRecipeRow = {
  rowId: string;
  rowType: WorkPassportRowType;
  titleRu: string;
  canonicalUnit: CanonicalProfessionalBoqUnit;
  sourceUnit: string;
  quantityFormula: string;
  formulaId: string;
  normId: string;
  normFamilyId: string;
  normSourceId: string;
  normSourceTitle: string;
  normVersion: string;
  normReviewStatus: string;
  calculationTraceTemplate: string;
  includedInEstimate: boolean;
  includedInProcurement: boolean;
  priceStatus: "PRICE_MISSING";
  buyerHandoffRole: "procurement_item" | "estimate_only";
};

export type WorkPassportBoqRecipe = {
  allRows: ProfessionalBoqRecipeRow[];
  workRows: ProfessionalBoqRecipeRow[];
  materialRows: ProfessionalBoqRecipeRow[];
  laborRows: ProfessionalBoqRecipeRow[];
  serviceRows: ProfessionalBoqRecipeRow[];
  equipmentRows: ProfessionalBoqRecipeRow[];
  transportRows: ProfessionalBoqRecipeRow[];
  requiredRowTypes: WorkPassportRowType[];
  rowCount: number;
};

export type ProfessionalWorkPassport = {
  templateId: string;
  templateKind: WorkPassportTemplateKind;
  workKey: string;
  familyId: string;
  category: string;
  localizedNameRu: string;
  aliases: string[];
  workDescription: {
    titleRu: string;
    workType: string;
    scopeSummary: string;
  };
  estimateLevel: WorkEstimateLevel;
  parameterSchema: {
    schemaId: string;
    required: WorkPassportParameter[];
    optional: WorkPassportParameter[];
    freeOrderWorkParamsSupported: boolean;
    professionalDefaultsApplied: boolean;
    drawingsNotRequiredForPreliminaryBoq: boolean;
    missingInputPolicy: "show_missing_and_continue_preliminary_boq";
  };
  riskPolicy: WorkPassportRiskPolicy;
  boqRecipe: WorkPassportBoqRecipe;
  formulas: {
    formulaFamilyId: string;
    quantityFormulas: Record<string, string>;
    formulaSteps: string[];
    unitConversions: string[];
  };
  sources: {
    normPackId: string;
    normVersion: string;
    sourceRegistryIds: string[];
    sourceTitles: string[];
    sourceQuality: "source_backed" | "engineering_reference_formula";
  };
  outputMappings: {
    groupedUiSections: boolean;
    pdfRowsEqualSnapshotRows: boolean;
    pdfIncludesAssumptionsTraceAndSources: boolean;
    buyerHandoffProcurementSubset: boolean;
    buyerHandoffExcludesWorkRows: boolean;
    missingPricesVisibleWithoutFakeTotal: boolean;
  };
  contentPack: {
    calculatorId: string;
    materialRecipeId: string;
    laborRecipeId: string;
    serviceRecipeId: string;
    equipmentRecipeId: string;
    unitPolicyId: string;
    pricePolicyId: string;
    pdfPolicyId: string;
    buyerHandoffPolicyId: string;
  };
};

export type WorkPassportValidationCounters = {
  passport_missing_for_template: number;
  passport_has_only_template_name: number;
  template_only_rows_count: number;
  single_template_name_rows_count: number;
  generic_rows_count: number;
  rows_without_norm_source_count: number;
  rows_without_formula_count: number;
  wrong_unit_rows_count: number;
  missing_material_rows_count: number;
  missing_equipment_or_service_rows_count: number;
  missing_pdf_mapping_count: number;
  missing_buyer_handoff_mapping_count: number;
  fake_final_total_count: number;
};

export type WorkPassportValidationResult = WorkPassportValidationCounters & {
  template_id: string;
  ready_professional_work_passport: boolean;
  row_count: number;
  work_rows_count: number;
  material_rows_count: number;
  labor_rows_count: number;
  service_rows_count: number;
  equipment_rows_count: number;
  transport_rows_count: number;
  required_row_types: WorkPassportRowType[];
  blocking_reasons: string[];
};
