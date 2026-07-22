export const PROFESSIONAL_ESTIMATE_V4_SCHEMA = "ProfessionalEstimatePassportV4" as const;

export type WorkScopeClassV4 =
  | "atomic_operation"
  | "trade_assembly"
  | "system"
  | "project_package"
  | "facility"
  | "infrastructure_complex";

export type ParameterInputKindV4 =
  | "quantity"
  | "integer"
  | "decimal"
  | "enum"
  | "multiselect"
  | "boolean"
  | "text"
  | "location"
  | "date"
  | "document"
  | "geometry"
  | "equipment_selection"
  | "material_selection"
  | "derived"
  | "read_only_information";

export type ParameterNecessityV4 = "critical" | "recommended" | "optional" | "derived";

export type ParameterDataTypeV4 =
  | "number"
  | "integer"
  | "string"
  | "boolean"
  | "string_array"
  | "date"
  | "document_reference"
  | "geometry"
  | "selection"
  | "unknown";

export type EngineeringDimensionV4 =
  | "dimensionless"
  | "count"
  | "length"
  | "area"
  | "volume"
  | "mass"
  | "time"
  | "labor_time"
  | "machine_time"
  | "power"
  | "energy"
  | "pressure"
  | "temperature"
  | "flow"
  | "density"
  | "application_rate"
  | "transport_distance"
  | "transport_work"
  | "package"
  | "service"
  | "test"
  | "document"
  | "currency"
  | "currency_per_unit";

export type BoqCategoryV4 =
  | "material"
  | "equipment"
  | "labor"
  | "machinery"
  | "subcontract_service"
  | "transport"
  | "temporary_work"
  | "testing"
  | "documentation"
  | "permit"
  | "waste"
  | "commercial_adjustment";

export type EvidenceConfidenceV4 = "low" | "medium" | "high" | "expert_confirmed";

export type UserFactProvenanceV4 =
  | "user_confirmed"
  | "project_document"
  | "form_input"
  | "work_specific_default"
  | "family_default"
  | "ai_inference"
  | "unknown";

export type CatalogWorkV4 = {
  stable_work_id: string;
  catalog_version: string;
  active: boolean;
};
export type WorkIdentityV4 = {
  stable_work_id: string;
  professional_name_ru: string;
  synonyms_ru: string[];
  industry: string;
  family_id: string;
  action: string | null;
  object: string | null;
  technology: string | null;
  purpose: string | null;
};

export type UserFactV4 = {
  fact_id: string;
  parameter_id: string | null;
  value: unknown;
  unit_id: string | null;
  provenance: UserFactProvenanceV4;
  confirmed: boolean;
  source_reference: string | null;
  confidence: EvidenceConfidenceV4;
};

export type UserFactSetV4 = {
  work_id: string;
  facts: UserFactV4[];
  unresolved_fact_ids: string[];
};

export type WorkScopeV4 = {
  scope_class: WorkScopeClassV4;
  purpose_ru: string;
  included_scope_ru: string[];
  excluded_scope_ru: string[];
  applicability_rules: string[];
  complexity_rules: string[];
  regional_conditions: string[];
};

export type WorkSpecificParameterV4 = {
  parameter_id: string;
  canonical_key: string;
  owner_work_id: string;
  owner_family_id: string;
  professional_name_ru: string;
  user_help_ru: string;
  input_kind: ParameterInputKindV4;
  data_type: ParameterDataTypeV4;
  necessity: ParameterNecessityV4;
  dimension: EngineeringDimensionV4 | null;
  canonical_unit_id: string | null;
  display_unit_ids: string[];
  choices: { value: string; label_ru: string }[];
  range: { minimum: number | null; maximum: number | null } | null;
  step: number | null;
  precision: number | null;
  example_ru: string;
  default_value: unknown;
  default_source: UserFactProvenanceV4 | null;
  required_condition: string;
  applicability_condition: string;
  formula_dependencies: string[];
  affected_row_ids: string[];
  specification_bindings: string[];
  price_binding_keys: string[];
  provenance: string;
  confidence: EvidenceConfidenceV4;
  validation_message_ru: string;
  missing_value_consequence_ru: string;
  assumption_when_missing_ru: string | null;
  internal_only: boolean;
};

export type WorkSpecificParameterSchemaV4 = {
  schema_id: string;
  schema_version: "WorkSpecificParameterSchemaV4";
  owner_work_id: string;
  owner_family_id: string;
  parameters: WorkSpecificParameterV4[];
  mutually_exclusive_input_groups: { group_id: string; parameter_ids: string[]; rule: string }[];
  question_budget: { initial_maximum: number; hard_maximum: number };
  compatibility_source: "native_v4" | "v2_adapter";
};

export type WbsNodeV4 = {
  wbs_code: string;
  parent_wbs_code: string | null;
  title_ru: string;
  phase: string;
  applicability: string;
  sequence: number;
};

export type OperationV4 = {
  operation_id: string;
  wbs_code: string;
  professional_name_ru: string;
  action: string;
  action_object: string;
  technical_specification_ru: string;
  output_unit_id: string | null;
  formula_id: string | null;
  applicability: string;
  quality_control_ru: string[];
  safety_requirements_ru: string[];
  source_ids: string[];
};

export type ResourceRequirementV4 = {
  resource_id: string;
  category: BoqCategoryV4;
  professional_name_ru: string;
  technical_specification_ru: string;
  unit_id: string | null;
  formula_id: string | null;
  applicability: string;
  inclusion_reason_ru: string;
  exclusion_rule: string;
  price_key: string | null;
  shared_scope_key: string | null;
  alternative_group: string | null;
  confidence: EvidenceConfidenceV4;
  source_ids: string[];
};

export type FormulaDefinitionV4 = {
  formula_id: string;
  expression: string;
  input_parameter_ids: string[];
  input_unit_ids: Record<string, string | null>;
  output_unit_id: string | null;
  rounding_rule: string;
  waste_rule: string;
  applicability: string;
  source_ids: string[];
  dimensional_status: "valid" | "blocked" | "not_evaluated";
  dimensional_blockers: string[];
  explanation_trace_ru: string;
};

export type BoqLineDefinitionV4 = {
  row_id: string;
  wbs_code: string;
  parent_wbs_code: string | null;
  section: string;
  phase: string;
  category: BoqCategoryV4;
  professional_name_ru: string;
  action: string;
  action_object: string;
  technical_specification_ru: string;
  unit_id: string | null;
  formula_id: string | null;
  formula_inputs: string[];
  applicability: string;
  inclusion_reason_ru: string;
  exclusion_rule: string;
  waste_coefficient: number | null;
  consumption_norm: number | null;
  productivity: number | null;
  labor_hours: number | null;
  machine_hours: number | null;
  source_id: string | null;
  price_key: string | null;
  shared_scope_key: string | null;
  alternative_group: string | null;
  price_status: "PRICE_MISSING" | "PRICE_PARTIAL" | "PRICE_COMPLETE";
  confidence: EvidenceConfidenceV4;
  explanation_trace_ru: string;
};

export type PriceObservationV4 = {
  observation_id: string;
  resource_id: string;
  supplier: string;
  city: string;
  observed_at: string;
  currency_unit_id: string;
  amount: number;
  vat_included: boolean | null;
  delivery_included: boolean | null;
  minimum_order: number | null;
  valid_until: string | null;
  source_id: string;
  confidence: EvidenceConfidenceV4;
};

export type CommercialLineV4 = {
  commercial_line_id: string;
  source_row_ids: string[];
  title_ru: string;
  quantity: number | null;
  unit_id: string | null;
  price_observation_ids: string[];
};

export type ProcurementLineV4 = {
  procurement_line_id: string;
  resource_id: string;
  specification_ru: string;
  quantity: number | null;
  unit_id: string | null;
  equivalence_group: string | null;
  supplier_constraints_ru: string[];
};

export type ProjectCompositionV4 = {
  project_id: string;
  work_ids: string[];
  shared_scope_rules: {
    shared_scope_key: string;
    allocation_policy: "sum" | "maximum" | "allocate" | "include_once" | "by_section" | "ask_user";
    merge_rule: string;
  }[];
};

export type EstimateRevisionV4 = {
  revision_id: string;
  parent_revision_id: string | null;
  work_id: string;
  operation_id: string;
  created_at: string;
  immutable_payload_hash: string;
  state: "draft" | "approved";
  pdf_state: "current" | "outdated" | "not_created";
};

export type NormativeEvidenceV4 = {
  source_id: string;
  url_or_document_id: string | null;
  title: string;
  organization: string;
  jurisdiction: string;
  effective_date: string;
  accessed_at: string;
  applicability: string;
  version: string;
  checksum: string;
  license_state: string;
  linked_row_ids: string[];
  linked_parameter_ids: string[];
  extracted_fact_ids: string[];
  confidence: EvidenceConfidenceV4;
};

export type ProfessionalEstimatePassportV4Status =
  | "NATIVE_V4_WORK_SPECIFIC"
  | "V2_COMPATIBILITY_GAPS_RECORDED"
  | "BLOCKED";

export type ProfessionalEstimatePassportV4 = {
  schema_version: typeof PROFESSIONAL_ESTIMATE_V4_SCHEMA;
  catalog_work: CatalogWorkV4;
  identity: WorkIdentityV4;
  scope: WorkScopeV4;
  parameter_schema: WorkSpecificParameterSchemaV4;
  wbs: WbsNodeV4[];
  operations: OperationV4[];
  resources: ResourceRequirementV4[];
  formulas: FormulaDefinitionV4[];
  boq_rows: BoqLineDefinitionV4[];
  price_observations: PriceObservationV4[];
  commercial_lines: CommercialLineV4[];
  procurement_lines: ProcurementLineV4[];
  normative_evidence: NormativeEvidenceV4[];
  assumptions_ru: string[];
  uncertainty_ru: string[];
  confidence: EvidenceConfidenceV4;
  expert_review_status: "NOT_REVIEWED" | "EXPERT_REVIEW_REQUIRED" | "EXPERT_CONFIRMED";
  status: ProfessionalEstimatePassportV4Status;
  inheritance: {
    source_contract: "ProfessionalWorkPassportV2" | "ProfessionalEstimatePassportV4";
    family_passport_id: string | null;
    work_specific_overlay_id: string | null;
    adapter_version: string | null;
  };
  unresolved_requirements: string[];
  semantic_signature: string;
  deterministic_hash: string;
};
