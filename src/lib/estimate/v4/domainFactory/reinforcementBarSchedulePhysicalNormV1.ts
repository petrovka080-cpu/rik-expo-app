import reinforcementNormPack from "../../../../../data/estimate-norms/professional/reinforcement.json";
import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import type { ProfessionalParameterValueV4 } from "../professionalProjectAssemblyV4";
import type { ProfessionalPhysicalNormApplicabilityResolutionV1 } from "./professionalPhysicalNormApplicabilityV1";

const APPLICABILITY_VERSION = "professional-physical-norm-applicability:v1" as const;

export const REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID =
  "project-profile:approved-reinforcement-bar-schedule:fhwa-rics:v1" as const;
export const REINFORCEMENT_BAR_SCHEDULE_NORM_ID =
  "reinforcement_project_bar_schedule_weight_same_unit_routing_v1" as const;
export const REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID =
  `src_professional_norm_pack_${REINFORCEMENT_BAR_SCHEDULE_NORM_ID}` as const;

export const REINFORCEMENT_BAR_SCHEDULE_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "approved_reinforcement_schedule_weight_kg",
  "bar_bending_schedule_reference",
  "structural_drawing_and_revision_reference",
  "bar_standard_and_grade",
  "bar_size_designation",
  "nominal_diameter_mm",
  "shape_straight_bent_curved_or_link",
  "bar_count_and_cut_length_m",
  "selected_standard_mass_kg_per_m",
  "laps_hooks_chairs_connectors_and_accessories_scope",
  "fabrication_allowance_if_documented",
  "supplier_bundle_or_length_constraints",
  "estimator_approval_reference",
] as const);

const reinforcementNorm = (() => {
  const found = reinforcementNormPack.norm_items.find(
    (item) => item.norm_id === REINFORCEMENT_BAR_SCHEDULE_NORM_ID,
  );
  if (!found) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${REINFORCEMENT_BAR_SCHEDULE_NORM_ID}`);
  return found;
})();

if (
  reinforcementNormPack.work_group !== "reinforcement" ||
  reinforcementNormPack.review_status !== "reviewed" ||
  reinforcementNorm.unit !== "kg" ||
  reinforcementNorm.rate.value !== 1 ||
  reinforcementNorm.rate.unit !== "kg/kg same-unit routing identity for approved reinforcement schedule mass; not a kg-per-m3 concrete allowance" ||
  reinforcementNorm.applicability.approved_bar_schedule_or_explicit_bar_takeoff_required !== true ||
  reinforcementNorm.applicability.bar_standard_grade_size_shape_count_and_length_required !== true ||
  reinforcementNorm.applicability.selected_standard_or_product_mass_per_metre_required !== true ||
  reinforcementNorm.applicability.laps_hooks_chairs_connectors_and_accessories_scope_must_be_explicit !== true ||
  reinforcementNorm.applicability.previous_95_kg_per_m3_seed_rejected !== true ||
  reinforcementNorm.applicability.diameter_squared_over_162_as_automatic_source_forbidden !== true ||
  reinforcementNorm.applicability.rate_is_routing_identity_not_design_reinforcement_norm !== true ||
  reinforcementNorm.applicability.automatic_production_binding_for_generic_reinforcement_forbidden !== true ||
  reinforcementNorm.parameters.length !== REINFORCEMENT_BAR_SCHEDULE_REQUIRED_EXPLICIT_PARAMETER_IDS.length ||
  REINFORCEMENT_BAR_SCHEDULE_REQUIRED_EXPLICIT_PARAMETER_IDS.some(
    (parameterId) => !reinforcementNorm.parameters.includes(parameterId),
  ) ||
  reinforcementNorm.waste_percent_default !== 0 ||
  reinforcementNorm.rounding.package_size !== 1 ||
  reinforcementNorm.rounding.mode !== "no_rounding_before_full_approved_bar_schedule_then_apply_documented_supplier_constraints"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${REINFORCEMENT_BAR_SCHEDULE_NORM_ID}`);
}

export const REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA = Object.freeze({
  source_id: REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID,
  norm_id: REINFORCEMENT_BAR_SCHEDULE_NORM_ID,
  source_document_version: reinforcementNormPack.source_pack_version,
  source_title: reinforcementNorm.source.title,
  source_url: reinforcementNorm.source.url,
  exact_locator: reinforcementNorm.source.page,
  rate_value: reinforcementNorm.rate.value,
  rate_unit: reinforcementNorm.rate.unit,
  primary_mass_table_reference: reinforcementNorm.applicability.primary_mass_table_reference,
  measurement_reference: reinforcementNorm.applicability.measurement_reference,
  definition_hash: estimateDeterministicHash({
    work_group: reinforcementNormPack.work_group,
    source_pack_version: reinforcementNormPack.source_pack_version,
    norm_item: reinforcementNorm,
  }),
});

export const REINFORCEMENT_BAR_SCHEDULE_RUNTIME_BINDING_V1 = Object.freeze({
  norm_id: REINFORCEMENT_BAR_SCHEDULE_NORM_ID,
  work_group: "reinforcement",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "REINFORCEMENT_SCHEDULE_MEASUREMENT",
  operation_class: "MEASURE",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID,
  source_id: REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID,
  source_document_version: REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA.source_document_version,
  source_definition_hash: REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: REINFORCEMENT_BAR_SCHEDULE_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["reinforcement_schedule_weight_routed_kg"] as const,
});

function explicitValue(
  values: Readonly<Record<string, ProfessionalParameterValueV4>>,
  parameterId: string,
): ProfessionalParameterValueV4 | null {
  const value = values[parameterId];
  if (!value || value.source_type === "VISIBLE_BASELINE_ASSUMPTION") return null;
  if (typeof value.value === "string" && value.value.trim().length === 0) return null;
  return value;
}

function primitiveString(value: ProfessionalParameterValueV4 | null): string | null {
  if (typeof value?.value !== "string") return null;
  return value.value.trim() || null;
}

function finiteNumber(value: ProfessionalParameterValueV4 | null): number | null {
  if (!value) return null;
  const numeric = typeof value.value === "number"
    ? value.value
    : Number(String(value.value).replace(/\s+/gu, "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

function meaningfulReference(value: string | null): boolean {
  return value !== null && value.length >= 4 && !/^(?:NONE|N\/A|UNKNOWN|TBD)$/iu.test(value);
}

function nonApplied(
  status: "NOT_REQUESTED" | "BLOCKED_REQUIRED_INPUTS" | "BLOCKED_NOT_APPLICABLE",
  productProfileId: string | null,
  parameterValues: Readonly<Record<string, ProfessionalParameterValueV4>>,
  blockers: readonly string[],
  consumedParameterIds: readonly string[] = [],
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const withoutHash = {
    status,
    applicability_version: APPLICABILITY_VERSION,
    product_profile_id: productProfileId,
    source_id: REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID,
    norm_id: REINFORCEMENT_BAR_SCHEDULE_NORM_ID,
    source_document_version: REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA.source_document_version,
    source_url: REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA.source_url,
    exact_locator: REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA.exact_locator,
    source_definition_hash: REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...consumedParameterIds].sort(),
    produced_parameter_ids: [] as const,
    parameter_values: parameterValues,
    blockers: [...new Set(blockers)].sort(),
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

export function resolveReinforcementBarSchedulePhysicalNormV1(input: {
  technology_class: string;
  operation_class: string;
  material_system?: string;
  scope_mode: string;
  parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>>;
}): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const productProfileId = primitiveString(explicitValue(input.parameter_values, "product_profile_id"));
  if (productProfileId !== REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID) {
    return nonApplied("NOT_REQUESTED", productProfileId, input.parameter_values, []);
  }
  if (
    input.technology_class !== "REINFORCEMENT_SCHEDULE_MEASUREMENT" ||
    input.operation_class !== "MEASURE" ||
    input.material_system !== "APPROVED_REINFORCEMENT_BAR_SCHEDULE" ||
    input.scope_mode !== "FULL_APPLICABLE_SCOPE"
  ) {
    return nonApplied("NOT_REQUESTED", productProfileId, input.parameter_values, []);
  }

  const explicit = Object.fromEntries(REINFORCEMENT_BAR_SCHEDULE_REQUIRED_EXPLICIT_PARAMETER_IDS.map(
    (parameterId) => [parameterId, explicitValue(input.parameter_values, parameterId)],
  ));
  const missing = REINFORCEMENT_BAR_SCHEDULE_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      input.parameter_values,
      missing,
      REINFORCEMENT_BAR_SCHEDULE_REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }

  const approvedWeightKg = finiteNumber(explicit.approved_reinforcement_schedule_weight_kg);
  const scheduleReference = primitiveString(explicit.bar_bending_schedule_reference);
  const drawingReference = primitiveString(explicit.structural_drawing_and_revision_reference);
  const standardAndGrade = primitiveString(explicit.bar_standard_and_grade);
  const sizeDesignation = primitiveString(explicit.bar_size_designation);
  const diameterMm = finiteNumber(explicit.nominal_diameter_mm);
  const shape = primitiveString(explicit.shape_straight_bent_curved_or_link)?.toUpperCase() ?? null;
  const countAndLength = primitiveString(explicit.bar_count_and_cut_length_m);
  const selectedMassKgM = finiteNumber(explicit.selected_standard_mass_kg_per_m);
  const accessoriesScope = primitiveString(explicit.laps_hooks_chairs_connectors_and_accessories_scope);
  const fabricationAllowance = primitiveString(explicit.fabrication_allowance_if_documented);
  const supplierConstraints = primitiveString(explicit.supplier_bundle_or_length_constraints);
  const approvalReference = primitiveString(explicit.estimator_approval_reference);
  const shapeValid = /^(?:STRAIGHT|BENT(?::.+)?|CURVED(?::.+)?|LINK(?::.+)?)$/u.test(shape ?? "");
  const blockers = [
    approvedWeightKg !== null && approvedWeightKg > 0
      ? ""
      : "PROJECT_VALUE_INVALID:approved_reinforcement_schedule_weight_kg",
    meaningfulReference(scheduleReference) ? "" : "PROJECT_VALUE_INVALID:bar_bending_schedule_reference",
    meaningfulReference(drawingReference) ? "" : "PROJECT_VALUE_INVALID:structural_drawing_and_revision_reference",
    meaningfulReference(standardAndGrade) ? "" : "PROJECT_VALUE_INVALID:bar_standard_and_grade",
    meaningfulReference(sizeDesignation) ? "" : "PROJECT_VALUE_INVALID:bar_size_designation",
    diameterMm !== null && diameterMm > 0 ? "" : "PROJECT_VALUE_INVALID:nominal_diameter_mm",
    shapeValid ? "" : `PHYSICAL_NORM_CLASSIFICATION_INVALID:shape_straight_bent_curved_or_link=${shape}`,
    meaningfulReference(countAndLength) && /\d/u.test(countAndLength ?? "")
      ? ""
      : "PROJECT_VALUE_INVALID:bar_count_and_cut_length_m",
    selectedMassKgM !== null && selectedMassKgM > 0
      ? ""
      : "PROJECT_VALUE_INVALID:selected_standard_mass_kg_per_m",
    accessoriesScope?.startsWith("PROJECT_SCOPE:")
      ? ""
      : "PROJECT_VALUE_INVALID:laps_hooks_chairs_connectors_and_accessories_scope",
    fabricationAllowance?.startsWith("PROJECT_ALLOWANCE:") ||
      fabricationAllowance === "NONE:INCLUDED_IN_APPROVED_SCHEDULE"
      ? ""
      : "PROJECT_VALUE_INVALID:fabrication_allowance_if_documented",
    supplierConstraints?.startsWith("PROJECT_CONSTRAINT:") ||
      supplierConstraints === "NONE:NO_AUTOMATIC_BUNDLE_ROUNDING"
      ? ""
      : "PROJECT_VALUE_INVALID:supplier_bundle_or_length_constraints",
    meaningfulReference(approvalReference) ? "" : "PROJECT_VALUE_INVALID:estimator_approval_reference",
  ].filter(Boolean);
  if (blockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      input.parameter_values,
      blockers,
      REINFORCEMENT_BAR_SCHEDULE_REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }

  const routedWeightKg = approvedWeightKg! * reinforcementNorm.rate.value;
  const explicitOutput = finiteNumber(explicitValue(
    input.parameter_values,
    "reinforcement_schedule_weight_routed_kg",
  ));
  if (explicitOutput !== null && Math.abs(explicitOutput - routedWeightKg) > 1e-9) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      input.parameter_values,
      [`PHYSICAL_NORM_VALUE_CONFLICT:reinforcement_schedule_weight_routed_kg=${explicitOutput}:norm_value=${routedWeightKg}`],
      [
        ...REINFORCEMENT_BAR_SCHEDULE_REQUIRED_EXPLICIT_PARAMETER_IDS,
        "reinforcement_schedule_weight_routed_kg",
      ],
    );
  }

  const capturedAt = REINFORCEMENT_BAR_SCHEDULE_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${productProfileId}`,
    `approved_reinforcement_schedule_weight_kg=${approvedWeightKg}`,
    `bar_bending_schedule_reference=${scheduleReference}`,
    `structural_drawing_and_revision_reference=${drawingReference}`,
    `bar_standard_and_grade=${standardAndGrade}`,
    `bar_size_designation=${sizeDesignation}`,
    `nominal_diameter_mm=${diameterMm}`,
    `shape_straight_bent_curved_or_link=${shape}`,
    `bar_count_and_cut_length_m=${countAndLength}`,
    `selected_standard_mass_kg_per_m=${selectedMassKgM}`,
    `laps_hooks_chairs_connectors_and_accessories_scope=${accessoriesScope}`,
    `fabrication_allowance_if_documented=${fabricationAllowance}`,
    `supplier_bundle_or_length_constraints=${supplierConstraints}`,
    `estimator_approval_reference=${approvalReference}`,
    `reinforcement_schedule_weight_routed_kg=${routedWeightKg}`,
    "formula=approved_reinforcement_schedule_weight_kg*1",
    "automatic_kg_per_m3_allowance=false",
    "automatic_diameter_squared_over_162=false",
    "automatic_bundle_rounding=false",
    "automatic_waste=false",
    "automatic_generic_binding=false",
  ].join(";");
  const parameterValues = Object.freeze({
    ...input.parameter_values,
    reinforcement_schedule_weight_routed_kg: {
      value: routedWeightKg,
      unit_id: "kg",
      source_type: "APPLICABLE_NORM" as const,
      source_id: REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: APPLICABILITY_VERSION,
    product_profile_id: productProfileId,
    source_id: REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID,
    norm_id: REINFORCEMENT_BAR_SCHEDULE_NORM_ID,
    source_document_version: REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA.source_document_version,
    source_url: REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA.source_url,
    exact_locator: REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA.exact_locator,
    source_definition_hash: REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...REINFORCEMENT_BAR_SCHEDULE_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["reinforcement_schedule_weight_routed_kg"] as const,
    calculated_reinforcement_schedule_weight_kg: routedWeightKg,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}
