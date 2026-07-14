import type { WorkEstimateLevel, WorkPassportTemplateKind } from "./workPassportContract";

export type ProfessionalWorkPassportV2ParameterRole =
  | "P0_REQUIRED"
  | "P1_DETAIL"
  | "P2_CONDITION"
  | "COMPUTED"
  | "SYSTEM_HIDDEN";

export type ProfessionalWorkPassportV2ValidationStatus =
  | "SOFTWARE_SEALED_READY_FOR_EXPERT_REVIEW"
  | "BLOCKED";

export type ProfessionalWorkPassportV2SemanticSignature = {
  parameter_signature: string;
  material_signature: string;
  operation_signature: string;
  service_signature: string;
  equipment_signature: string;
  formula_signature: string;
  combined_signature_hash: string;
};

export type ProfessionalWorkPassportV2Identity = {
  work_id: string;
  canonical_name_ru: string;
  short_name_ru: string;
  description_ru: string;
  synonyms_ru: string[];
  professional_family_id: string;
  normative_family_id: string;
  calculator_id: string;
};

export type ProfessionalWorkPassportV2Classification = {
  template_kind: WorkPassportTemplateKind;
  category: string;
  estimate_level: WorkEstimateLevel;
  work_key: string;
  norm_pack_id: string;
  content_pack_ids: string[];
};

export type ProfessionalWorkPassportV2Scope = {
  included_scope_ru: string[];
  excluded_scope_ru: string[];
  result_ru: string;
  measurement_basis: string;
};

export type ProfessionalWorkPassportV2Applicability = {
  applicable_when_ru: string[];
  prerequisite_inputs_ru: string[];
  scale_assumptions_ru: string[];
  expert_review_required: boolean;
};

export type ProfessionalWorkPassportV2Exclusions = {
  excluded_scope_ru: string[];
  price_exclusions_ru: string[];
  external_review_required_ru: string[];
};

export type ProfessionalWorkPassportV2Parameter = {
  canonical_key: string;
  label_ru: string;
  question_ru: string;
  help_ru: string;
  unit: string | null;
  input_type: "number" | "text" | "boolean" | "select";
  allowed_values: string[];
  required: boolean;
  priority: number;
  minimum: number | null;
  maximum: number | null;
  default_policy: string;
  source_type: string;
  dependencies: string[];
  affected_formulas: string[];
  affected_materials: string[];
  affected_operations: string[];
  visibility_rule: string;
  role: ProfessionalWorkPassportV2ParameterRole;
};

export type ProfessionalWorkPassportV2ParameterGraph = {
  schema_id: string;
  visible_question_limit: 5;
  parameters: ProfessionalWorkPassportV2Parameter[];
  p0_required: string[];
  p1_detail: string[];
  p2_condition: string[];
  computed: string[];
  system_hidden: string[];
};

export type ProfessionalWorkPassportV2MaterialVariant = {
  variant_code: string;
  exact_name_ru: string;
  activation_rule: string;
  affected_material_codes: string[];
  affected_operation_codes: string[];
  affected_equipment_codes: string[];
  affected_formula_ids: string[];
  source_ids: string[];
};

export type ProfessionalWorkPassportV2Material = {
  material_code: string;
  exact_name_ru: string;
  material_class: string;
  grade: string | null;
  strength: string | null;
  size: string | null;
  thickness: string | null;
  diameter: string | null;
  density: string | null;
  standard: string | null;
  unit: string;
  consumption_formula: string;
  waste_factor: string;
  activation_rule: string;
  norm_source_id: string;
  technical_source_id: string;
};

export type ProfessionalWorkPassportV2Operation = {
  operation_code: string;
  exact_name_ru: string;
  scope_ru: string;
  unit: string;
  quantity_formula: string;
  labor_norm: string;
  crew: string;
  activation_rule: string;
  quality_control: string[];
  norm_source_id: string;
};

export type ProfessionalWorkPassportV2Service = {
  service_code: string;
  exact_name_ru: string;
  scope_ru: string;
  unit: string;
  quantity_formula: string;
  activation_rule: string;
  provider_requirements: string[];
  source_id: string;
};

export type ProfessionalWorkPassportV2Equipment = {
  equipment_code: string;
  exact_name_ru: string;
  equipment_class: string;
  capacity: string | null;
  technical_characteristics: string[];
  unit: string;
  machine_time_formula: string;
  activation_rule: string;
  norm_source_id: string;
};

export type ProfessionalWorkPassportV2Formula = {
  formula_id: string;
  expression: string;
  input_keys: string[];
  output_unit: string;
  rounding_rule: string;
  waste_rule: string;
  condition_rule: string;
  source_id: string;
  version: string;
};

export type ProfessionalWorkPassportV2NormSource = {
  source_id: string;
  source_url: string | null;
  publisher: string;
  jurisdiction: string;
  document_title: string;
  edition: string;
  effective_date: string;
  license_state: string;
  applicability: string;
  content_hash: string;
  validation_status: string;
};

export type ProfessionalWorkPassportV2ReferenceEstimate = {
  reference_owner_id: string;
  reference_family_id: string;
  validation_status: string;
  source_registry_ids: string[];
  source_url: string;
  covered_scope_ru: string;
  excluded_scope_ru: string;
};

export type ProfessionalWorkPassportV2QualityControl = {
  checklist_ru: string[];
  acceptance_rules_ru: string[];
  source_ids: string[];
};

export type ProfessionalWorkPassportV2SafetyRequirements = {
  requirements_ru: string[];
  specialist_review_required: boolean;
  forbidden_final_claims_ru: string[];
};

export type ProfessionalWorkPassportV2PricingRequirements = {
  price_state: "PRICE_MISSING_QUANTITY_ONLY";
  fake_total_forbidden: boolean;
  missing_prices_visible: boolean;
  regional_pricing_required: boolean;
};

export type ProfessionalWorkPassportV2Presentation = {
  preview_sections_ru: string[];
  ui_pdf_buyer_parity_required: boolean;
  pdf_rows_equal_snapshot_rows: boolean;
  buyer_handoff_procurement_subset: boolean;
  max_questions_shown: 5;
};

export type ProfessionalWorkPassportV2Validation = {
  status: ProfessionalWorkPassportV2ValidationStatus;
  blockers: string[];
  legitimate_exceptions: string[];
  semantic_signature: ProfessionalWorkPassportV2SemanticSignature;
  resolved_at: string;
};

export type ProfessionalWorkPassportV2Version = {
  contract_version: "ProfessionalWorkPassportV2";
  compiler_version: "2026-07-14.v1";
  source_passport_version: string;
};

export type ProfessionalWorkPassportV2Lineage = {
  professional_family_passport_id: string;
  normative_assembly_id: string;
  work_specific_passport_id: string;
  work_specific_override_ids: string[];
  compiled_resolved_passport_id: string;
};

export type ProfessionalWorkPassportV2 = {
  identity: ProfessionalWorkPassportV2Identity;
  classification: ProfessionalWorkPassportV2Classification;
  scope: ProfessionalWorkPassportV2Scope;
  applicability: ProfessionalWorkPassportV2Applicability;
  exclusions: ProfessionalWorkPassportV2Exclusions;
  parameter_graph: ProfessionalWorkPassportV2ParameterGraph;
  material_variants: ProfessionalWorkPassportV2MaterialVariant[];
  material_assemblies: ProfessionalWorkPassportV2Material[];
  work_operations: ProfessionalWorkPassportV2Operation[];
  services: ProfessionalWorkPassportV2Service[];
  machines: ProfessionalWorkPassportV2Equipment[];
  equipment: ProfessionalWorkPassportV2Equipment[];
  quantity_formulas: ProfessionalWorkPassportV2Formula[];
  norm_sources: ProfessionalWorkPassportV2NormSource[];
  reference_estimates: ProfessionalWorkPassportV2ReferenceEstimate[];
  quality_control: ProfessionalWorkPassportV2QualityControl;
  safety_requirements: ProfessionalWorkPassportV2SafetyRequirements;
  pricing_requirements: ProfessionalWorkPassportV2PricingRequirements;
  presentation: ProfessionalWorkPassportV2Presentation;
  validation: ProfessionalWorkPassportV2Validation;
  version: ProfessionalWorkPassportV2Version;
  lineage: ProfessionalWorkPassportV2Lineage;
};

export type ProfessionalWorkPassportV2CaseKind =
  | "A_MINIMAL_REQUEST"
  | "B_FULL_REQUEST"
  | "C_VARIANT_REQUEST"
  | "D_SCALE_REQUEST";

export type ProfessionalWorkPassportV2AcceptanceCase = {
  case_id: string;
  work_id: string;
  case_kind: ProfessionalWorkPassportV2CaseKind;
  status: "ready" | "blocked";
  assertions: Record<string, boolean>;
  blockers: string[];
};
