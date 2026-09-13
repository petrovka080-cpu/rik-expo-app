import formworkNormPack from "../../../../../data/estimate-norms/professional/formwork.json";
import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import type { ProfessionalParameterValueV4 } from "../professionalProjectAssemblyV4";
import type { ProfessionalPhysicalNormApplicabilityResolutionV1 } from "./professionalPhysicalNormApplicabilityV1";

const APPLICABILITY_VERSION = "professional-physical-norm-applicability:v1" as const;

export const RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID =
  "standard-profile:rics-nrm2:formwork-measured-contact-area:v1" as const;
export const RICS_NRM2_FORMWORK_NORM_ID =
  "formwork_rics_nrm2_measured_contact_area_same_unit_routing_v1" as const;
export const RICS_NRM2_FORMWORK_SOURCE_ID =
  `src_professional_norm_pack_${RICS_NRM2_FORMWORK_NORM_ID}` as const;

export const RICS_NRM2_FORMWORK_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "measured_formwork_contact_area_m2",
  "project_drawing_reference",
  "element_type",
  "element_dimensions_and_face_count",
  "plain_or_special_finish",
  "vertical_battered_horizontal_or_curved_class",
  "single_or_double_sided_scope",
  "openings_voids_and_deduction_rule",
  "permanent_or_removable_formwork",
  "project_measurement_rule_reference",
  "estimator_approval_reference",
] as const);

const formworkNorm = (() => {
  const found = formworkNormPack.norm_items.find(
    (item) => item.norm_id === RICS_NRM2_FORMWORK_NORM_ID,
  );
  if (!found) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${RICS_NRM2_FORMWORK_NORM_ID}`);
  return found;
})();

if (
  formworkNormPack.work_group !== "formwork" ||
  formworkNormPack.review_status !== "reviewed" ||
  formworkNorm.unit !== "m2" ||
  formworkNorm.rate.value !== 1 ||
  formworkNorm.rate.unit !== "m2/m2 same-unit routing identity for measured formwork contact area; not a m2-per-m3 consumption rate" ||
  formworkNorm.applicability.measurement_unit !== "m2" ||
  formworkNorm.applicability.element_geometry_and_finish_class_must_be_described !== true ||
  formworkNorm.applicability.irregular_shape_requires_dimensioned_description_or_diagram !== true ||
  formworkNorm.applicability.single_sided_and_battered_wall_formwork_must_be_described !== true ||
  formworkNorm.applicability.project_specific_opening_and_void_deduction_rule_required !== true ||
  formworkNorm.applicability.previous_2_4_m2_per_m3_seed_rejected !== true ||
  formworkNorm.applicability.previous_50_m2_package_assumption_rejected !== true ||
  formworkNorm.applicability.rate_is_routing_identity_not_material_consumption_norm !== true ||
  formworkNorm.applicability.automatic_production_binding_for_generic_formwork_forbidden !== true ||
  formworkNorm.parameters.length !== RICS_NRM2_FORMWORK_REQUIRED_EXPLICIT_PARAMETER_IDS.length ||
  RICS_NRM2_FORMWORK_REQUIRED_EXPLICIT_PARAMETER_IDS.some(
    (parameterId) => !formworkNorm.parameters.includes(parameterId),
  ) ||
  formworkNorm.waste_percent_default !== 0 ||
  formworkNorm.rounding.package_size !== 1 ||
  formworkNorm.rounding.mode !== "no_package_rounding_apply_project_measurement_precision_after_all_faces_and_deductions"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${RICS_NRM2_FORMWORK_NORM_ID}`);
}

export const RICS_NRM2_FORMWORK_SOURCE_METADATA = Object.freeze({
  source_id: RICS_NRM2_FORMWORK_SOURCE_ID,
  norm_id: RICS_NRM2_FORMWORK_NORM_ID,
  source_document_version: formworkNormPack.source_pack_version,
  source_title: formworkNorm.source.title,
  source_url: formworkNorm.source.url,
  exact_locator: formworkNorm.source.page,
  rate_value: formworkNorm.rate.value,
  rate_unit: formworkNorm.rate.unit,
  reference: formworkNorm.applicability.reference,
  measurement_unit: formworkNorm.applicability.measurement_unit,
  definition_hash: estimateDeterministicHash({
    work_group: formworkNormPack.work_group,
    source_pack_version: formworkNormPack.source_pack_version,
    norm_item: formworkNorm,
  }),
});

export const RICS_NRM2_FORMWORK_RUNTIME_BINDING_V1 = Object.freeze({
  norm_id: RICS_NRM2_FORMWORK_NORM_ID,
  work_group: "formwork",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "FORMWORK_MEASUREMENT",
  operation_class: "MEASURE",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID,
  source_id: RICS_NRM2_FORMWORK_SOURCE_ID,
  source_document_version: RICS_NRM2_FORMWORK_SOURCE_METADATA.source_document_version,
  source_definition_hash: RICS_NRM2_FORMWORK_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: RICS_NRM2_FORMWORK_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["formwork_measured_contact_area_routed_m2"] as const,
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
    source_id: RICS_NRM2_FORMWORK_SOURCE_ID,
    norm_id: RICS_NRM2_FORMWORK_NORM_ID,
    source_document_version: RICS_NRM2_FORMWORK_SOURCE_METADATA.source_document_version,
    source_url: RICS_NRM2_FORMWORK_SOURCE_METADATA.source_url,
    exact_locator: RICS_NRM2_FORMWORK_SOURCE_METADATA.exact_locator,
    source_definition_hash: RICS_NRM2_FORMWORK_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...consumedParameterIds].sort(),
    produced_parameter_ids: [] as const,
    parameter_values: parameterValues,
    blockers: [...new Set(blockers)].sort(),
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

export function resolveRicsNrm2FormworkPhysicalNormV1(input: {
  technology_class: string;
  operation_class: string;
  material_system?: string;
  scope_mode: string;
  parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>>;
}): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const productProfileId = primitiveString(explicitValue(input.parameter_values, "product_profile_id"));
  if (productProfileId !== RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID) {
    return nonApplied("NOT_REQUESTED", productProfileId, input.parameter_values, []);
  }
  if (
    input.technology_class !== "FORMWORK_MEASUREMENT" ||
    input.operation_class !== "MEASURE" ||
    input.material_system !== "FORMWORK_CONTACT_AREA" ||
    input.scope_mode !== "FULL_APPLICABLE_SCOPE"
  ) {
    return nonApplied("NOT_REQUESTED", productProfileId, input.parameter_values, []);
  }

  const explicit = Object.fromEntries(RICS_NRM2_FORMWORK_REQUIRED_EXPLICIT_PARAMETER_IDS.map(
    (parameterId) => [parameterId, explicitValue(input.parameter_values, parameterId)],
  ));
  const missing = RICS_NRM2_FORMWORK_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      input.parameter_values,
      missing,
      RICS_NRM2_FORMWORK_REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }

  const areaM2 = finiteNumber(explicit.measured_formwork_contact_area_m2);
  const drawingReference = primitiveString(explicit.project_drawing_reference);
  const elementType = primitiveString(explicit.element_type);
  const dimensionsAndFaces = primitiveString(explicit.element_dimensions_and_face_count);
  const finish = primitiveString(explicit.plain_or_special_finish)?.toUpperCase() ?? null;
  const geometryClass = primitiveString(
    explicit.vertical_battered_horizontal_or_curved_class,
  )?.toUpperCase() ?? null;
  const sidedScope = primitiveString(explicit.single_or_double_sided_scope)?.toUpperCase() ?? null;
  const deductionRule = primitiveString(explicit.openings_voids_and_deduction_rule);
  const formworkLifecycle = primitiveString(explicit.permanent_or_removable_formwork)?.toUpperCase() ?? null;
  const measurementRule = primitiveString(explicit.project_measurement_rule_reference);
  const approvalReference = primitiveString(explicit.estimator_approval_reference);
  const finishValid = finish === "PLAIN" || finish?.startsWith("SPECIAL:") === true;
  const geometryValid = /^(?:VERTICAL|HORIZONTAL|BATTERED:.+|CURVED:.+)$/u.test(geometryClass ?? "");
  const sidedScopeValid = sidedScope === "SINGLE_SIDED" || sidedScope === "DOUBLE_SIDED";
  const lifecycleValid = formworkLifecycle === "PERMANENT" || formworkLifecycle === "REMOVABLE";
  const blockers = [
    areaM2 !== null && areaM2 > 0 ? "" : "PROJECT_VALUE_INVALID:measured_formwork_contact_area_m2",
    meaningfulReference(drawingReference) ? "" : "PROJECT_VALUE_INVALID:project_drawing_reference",
    meaningfulReference(elementType) ? "" : "PROJECT_VALUE_INVALID:element_type",
    meaningfulReference(dimensionsAndFaces) && /\d/u.test(dimensionsAndFaces ?? "")
      ? ""
      : "PROJECT_VALUE_INVALID:element_dimensions_and_face_count",
    finishValid ? "" : `PHYSICAL_NORM_CLASSIFICATION_INVALID:plain_or_special_finish=${finish}`,
    geometryValid
      ? ""
      : `PHYSICAL_NORM_CLASSIFICATION_INVALID:vertical_battered_horizontal_or_curved_class=${geometryClass}`,
    sidedScopeValid
      ? ""
      : `PHYSICAL_NORM_CLASSIFICATION_INVALID:single_or_double_sided_scope=${sidedScope}`,
    deductionRule?.startsWith("PROJECT_RULE:")
      ? ""
      : "PROJECT_VALUE_INVALID:openings_voids_and_deduction_rule",
    lifecycleValid
      ? ""
      : `PHYSICAL_NORM_CLASSIFICATION_INVALID:permanent_or_removable_formwork=${formworkLifecycle}`,
    measurementRule?.startsWith("RICS_NRM2_WS11_CONFIRMED:")
      ? ""
      : "PROJECT_VALUE_INVALID:project_measurement_rule_reference",
    meaningfulReference(approvalReference) ? "" : "PROJECT_VALUE_INVALID:estimator_approval_reference",
  ].filter(Boolean);
  if (blockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      input.parameter_values,
      blockers,
      RICS_NRM2_FORMWORK_REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }

  const routedAreaM2 = areaM2! * formworkNorm.rate.value;
  const explicitOutput = finiteNumber(explicitValue(
    input.parameter_values,
    "formwork_measured_contact_area_routed_m2",
  ));
  if (explicitOutput !== null && Math.abs(explicitOutput - routedAreaM2) > 1e-9) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      input.parameter_values,
      [`PHYSICAL_NORM_VALUE_CONFLICT:formwork_measured_contact_area_routed_m2=${explicitOutput}:norm_value=${routedAreaM2}`],
      [
        ...RICS_NRM2_FORMWORK_REQUIRED_EXPLICIT_PARAMETER_IDS,
        "formwork_measured_contact_area_routed_m2",
      ],
    );
  }

  const capturedAt = RICS_NRM2_FORMWORK_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${productProfileId}`,
    `measured_formwork_contact_area_m2=${areaM2}`,
    `project_drawing_reference=${drawingReference}`,
    `element_type=${elementType}`,
    `element_dimensions_and_face_count=${dimensionsAndFaces}`,
    `plain_or_special_finish=${finish}`,
    `vertical_battered_horizontal_or_curved_class=${geometryClass}`,
    `single_or_double_sided_scope=${sidedScope}`,
    `openings_voids_and_deduction_rule=${deductionRule}`,
    `permanent_or_removable_formwork=${formworkLifecycle}`,
    `project_measurement_rule_reference=${measurementRule}`,
    `estimator_approval_reference=${approvalReference}`,
    `formwork_measured_contact_area_routed_m2=${routedAreaM2}`,
    "formula=measured_formwork_contact_area_m2*1",
    "automatic_m2_per_m3_factor=false",
    "automatic_package_rounding=false",
    "automatic_waste=false",
    "automatic_generic_binding=false",
  ].join(";");
  const parameterValues = Object.freeze({
    ...input.parameter_values,
    formwork_measured_contact_area_routed_m2: {
      value: routedAreaM2,
      unit_id: "m2",
      source_type: "APPLICABLE_NORM" as const,
      source_id: RICS_NRM2_FORMWORK_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: APPLICABILITY_VERSION,
    product_profile_id: productProfileId,
    source_id: RICS_NRM2_FORMWORK_SOURCE_ID,
    norm_id: RICS_NRM2_FORMWORK_NORM_ID,
    source_document_version: RICS_NRM2_FORMWORK_SOURCE_METADATA.source_document_version,
    source_url: RICS_NRM2_FORMWORK_SOURCE_METADATA.source_url,
    exact_locator: RICS_NRM2_FORMWORK_SOURCE_METADATA.exact_locator,
    source_definition_hash: RICS_NRM2_FORMWORK_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...RICS_NRM2_FORMWORK_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["formwork_measured_contact_area_routed_m2"] as const,
    calculated_formwork_measured_contact_area_m2: routedAreaM2,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}
