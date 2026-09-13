import sewerageNormPack from "../../../../../data/estimate-norms/professional/sewerage.json";
import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import type { ProfessionalParameterValueV4 } from "../professionalProjectAssemblyV4";
import type { ProfessionalPhysicalNormApplicabilityResolutionV1 } from "./professionalPhysicalNormApplicabilityV1";

const APPLICABILITY_VERSION = "professional-physical-norm-applicability:v1" as const;

export const WAVIN_OSMA_C3766BK_110MM_3M_PRODUCT_PROFILE_ID =
  "manufacturer-profile:wavin-osma:c3766bk:110mm:3m:v1" as const;
export const WAVIN_OSMA_C3766BK_110MM_3M_NORM_ID =
  "sewerage_wavin_osma_110mm_3m_pipe_linear_m_route_v1" as const;
export const WAVIN_OSMA_C3766BK_110MM_3M_SOURCE_ID =
  `src_professional_norm_pack_${WAVIN_OSMA_C3766BK_110MM_3M_NORM_ID}` as const;
export const WAVIN_OSMA_C3766BK_SUPPLIER_MASTER_PACK_PIECE_COUNT = 57 as const;

export const WAVIN_OSMA_C3766BK_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "approved_pipe_route_linear_m",
  "system_application",
  "hydraulic_and_appliance_design_reference",
  "selected_nominal_diameter",
  "selected_product_code",
  "selected_commercial_pipe_length_m",
  "fitting_schedule",
  "fitting_socket_and_insertion_layout",
  "reusable_cut_length_plan",
  "thermal_movement_design",
  "support_schedule",
  "firestopping_scope",
  "acoustic_scope",
  "project_cutting_allowance_percent",
  "supplier_purchase_packaging",
] as const);

const pipeNorm = (() => {
  const found = sewerageNormPack.norm_items.find(
    (item) => item.norm_id === WAVIN_OSMA_C3766BK_110MM_3M_NORM_ID,
  );
  if (!found) {
    throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${WAVIN_OSMA_C3766BK_110MM_3M_NORM_ID}`);
  }
  return found;
})();

if (
  sewerageNormPack.work_group !== "sewerage" ||
  sewerageNormPack.review_status !== "reviewed" ||
  pipeNorm.unit !== "linear_m" ||
  pipeNorm.rate.value !== 1 ||
  pipeNorm.rate.unit !== "geometric pipe linear m/approved route linear m before designed fittings, socket insertion and cut reuse; not a published consumption rate" ||
  pipeNorm.applicability.catalog_code !== "C3766BK" ||
  pipeNorm.applicability.sap_number !== "3080894" ||
  pipeNorm.applicability.standard !== "EN 1453-1" ||
  pipeNorm.applicability.material !== "PVC-U" ||
  pipeNorm.applicability.article_compression_class !== "pressureless" ||
  pipeNorm.applicability.nominal_diameter !== "DN 100" ||
  pipeNorm.applicability.outer_pipe_diameter_mm !== 110 ||
  pipeNorm.applicability.wall_thickness_mm !== 3.5 ||
  pipeNorm.applicability.piece_length_m !== 3 ||
  pipeNorm.applicability.above_ground_soil_and_waste_application_only !== true ||
  pipeNorm.applicability.rate_is_geometric_identity_not_manufacturer_consumption_norm !== true ||
  pipeNorm.applicability.additional_waste_not_published !== true ||
  pipeNorm.applicability.automatic_production_binding_for_generic_sewerage_forbidden !== true ||
  !sewerageNormPack.review_evidence.items[0]?.verified_facts.includes(
    `product_page_packaging_record_is_${WAVIN_OSMA_C3766BK_SUPPLIER_MASTER_PACK_PIECE_COUNT}_pieces_and_is_not_a_project_consumption_allowance`,
  ) ||
  pipeNorm.parameters.length !== WAVIN_OSMA_C3766BK_REQUIRED_EXPLICIT_PARAMETER_IDS.length ||
  WAVIN_OSMA_C3766BK_REQUIRED_EXPLICIT_PARAMETER_IDS.some(
    (parameterId) => !pipeNorm.parameters.includes(parameterId),
  ) ||
  pipeNorm.waste_percent_default !== 0 ||
  pipeNorm.rounding.package_size !== 3 ||
  pipeNorm.rounding.mode !== "route_takeoff_before_explicit_product_length_cut_and_socket_layout"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${WAVIN_OSMA_C3766BK_110MM_3M_NORM_ID}`);
}

export const WAVIN_OSMA_C3766BK_110MM_3M_SOURCE_METADATA = Object.freeze({
  source_id: WAVIN_OSMA_C3766BK_110MM_3M_SOURCE_ID,
  norm_id: WAVIN_OSMA_C3766BK_110MM_3M_NORM_ID,
  source_document_version: sewerageNormPack.source_pack_version,
  source_title: pipeNorm.source.title,
  source_url: pipeNorm.source.url,
  exact_locator: pipeNorm.source.page,
  rate_value: pipeNorm.rate.value,
  rate_unit: pipeNorm.rate.unit,
  product: pipeNorm.applicability.product,
  catalog_code: pipeNorm.applicability.catalog_code,
  sap_number: pipeNorm.applicability.sap_number,
  standard: pipeNorm.applicability.standard,
  nominal_diameter: pipeNorm.applicability.nominal_diameter,
  outer_pipe_diameter_mm: pipeNorm.applicability.outer_pipe_diameter_mm,
  wall_thickness_mm: pipeNorm.applicability.wall_thickness_mm,
  piece_length_m: pipeNorm.applicability.piece_length_m,
  supplier_master_pack_piece_count: WAVIN_OSMA_C3766BK_SUPPLIER_MASTER_PACK_PIECE_COUNT,
  definition_hash: estimateDeterministicHash({
    work_group: sewerageNormPack.work_group,
    source_pack_version: sewerageNormPack.source_pack_version,
    norm_item: pipeNorm,
  }),
});

export const WAVIN_OSMA_C3766BK_110MM_3M_RUNTIME_BINDING_V1 = Object.freeze({
  norm_id: WAVIN_OSMA_C3766BK_110MM_3M_NORM_ID,
  work_group: "sewerage",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "ABOVE_GROUND_SOIL_WASTE_PIPE_SYSTEM",
  operation_class: "INSTALL",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: WAVIN_OSMA_C3766BK_110MM_3M_PRODUCT_PROFILE_ID,
  source_id: WAVIN_OSMA_C3766BK_110MM_3M_SOURCE_ID,
  source_document_version: WAVIN_OSMA_C3766BK_110MM_3M_SOURCE_METADATA.source_document_version,
  source_definition_hash: WAVIN_OSMA_C3766BK_110MM_3M_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: WAVIN_OSMA_C3766BK_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: [
    "wavin_osma_geometric_pipe_quantity_linear_m",
    "wavin_osma_project_procurement_quantity_linear_m",
  ] as const,
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
    : Number(String(value.value).replace(/\s+/g, "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

function meaningfulReference(value: string | null): boolean {
  return value !== null && value.length >= 6 && !/^(?:NONE|N\/A|UNKNOWN|TBD|НЕИЗВЕСТНО)$/iu.test(value);
}

function projectOrderFromPackaging(value: string | null): {
  pieceCount: number;
  procurementLengthM: number;
} | null {
  const match = value?.match(new RegExp(
    `^PROJECT_ORDER:(\\d+)X3M=(\\d+(?:[.,]\\d+)?)M;SUPPLIER_MASTER_PACK_${WAVIN_OSMA_C3766BK_SUPPLIER_MASTER_PACK_PIECE_COUNT}_NOT_ASSUMED$`,
    "iu",
  ));
  if (!match?.[1] || !match[2]) return null;
  const pieceCount = Number(match[1]);
  const procurementLengthM = Number(match[2].replace(",", "."));
  if (
    !Number.isInteger(pieceCount) ||
    pieceCount <= 0 ||
    !Number.isFinite(procurementLengthM) ||
    procurementLengthM <= 0 ||
    Math.abs(procurementLengthM - pieceCount * 3) > 1e-9
  ) return null;
  return { pieceCount, procurementLengthM };
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
    source_id: WAVIN_OSMA_C3766BK_110MM_3M_SOURCE_ID,
    norm_id: WAVIN_OSMA_C3766BK_110MM_3M_NORM_ID,
    source_document_version: WAVIN_OSMA_C3766BK_110MM_3M_SOURCE_METADATA.source_document_version,
    source_url: WAVIN_OSMA_C3766BK_110MM_3M_SOURCE_METADATA.source_url,
    exact_locator: WAVIN_OSMA_C3766BK_110MM_3M_SOURCE_METADATA.exact_locator,
    source_definition_hash: WAVIN_OSMA_C3766BK_110MM_3M_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...consumedParameterIds].sort(),
    produced_parameter_ids: [] as const,
    parameter_values: parameterValues,
    blockers: [...new Set(blockers)].sort(),
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

export function resolveWavinOsmaC3766Bk110Mm3MPhysicalNormV1(input: {
  technology_class: string;
  operation_class: string;
  material_system?: string;
  scope_mode: string;
  parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>>;
}): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const productProfileId = primitiveString(explicitValue(input.parameter_values, "product_profile_id"));
  if (productProfileId !== WAVIN_OSMA_C3766BK_110MM_3M_PRODUCT_PROFILE_ID) {
    return nonApplied("NOT_REQUESTED", productProfileId, input.parameter_values, []);
  }
  if (
    input.technology_class !== "ABOVE_GROUND_SOIL_WASTE_PIPE_SYSTEM" ||
    input.operation_class !== "INSTALL" ||
    input.material_system !== "WAVIN_OSMA_C3766BK_110MM_3M" ||
    input.scope_mode !== "FULL_APPLICABLE_SCOPE"
  ) {
    return nonApplied("NOT_REQUESTED", productProfileId, input.parameter_values, []);
  }

  const explicit = Object.fromEntries(WAVIN_OSMA_C3766BK_REQUIRED_EXPLICIT_PARAMETER_IDS.map(
    (parameterId) => [parameterId, explicitValue(input.parameter_values, parameterId)],
  ));
  const missing = WAVIN_OSMA_C3766BK_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      input.parameter_values,
      missing,
      WAVIN_OSMA_C3766BK_REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }

  const routeLengthM = finiteNumber(explicit.approved_pipe_route_linear_m);
  const systemApplication = primitiveString(explicit.system_application)?.toUpperCase();
  const hydraulicDesignReference = primitiveString(explicit.hydraulic_and_appliance_design_reference);
  const selectedNominalDiameter = primitiveString(explicit.selected_nominal_diameter)?.toUpperCase();
  const selectedProductCode = primitiveString(explicit.selected_product_code)?.toUpperCase();
  const selectedCommercialLengthM = finiteNumber(explicit.selected_commercial_pipe_length_m);
  const fittingSchedule = primitiveString(explicit.fitting_schedule);
  const socketLayout = primitiveString(explicit.fitting_socket_and_insertion_layout);
  const cutPlan = primitiveString(explicit.reusable_cut_length_plan);
  const thermalDesign = primitiveString(explicit.thermal_movement_design);
  const supportSchedule = primitiveString(explicit.support_schedule);
  const firestoppingScope = primitiveString(explicit.firestopping_scope);
  const acousticScope = primitiveString(explicit.acoustic_scope);
  const cuttingAllowancePercent = finiteNumber(explicit.project_cutting_allowance_percent);
  const supplierPackaging = primitiveString(explicit.supplier_purchase_packaging)?.toUpperCase();
  const projectOrder = projectOrderFromPackaging(supplierPackaging ?? null);
  const minimumOrderLengthM = routeLengthM === null || cuttingAllowancePercent === null
    ? null
    : Number((routeLengthM * (1 + cuttingAllowancePercent / 100)).toFixed(9));
  const blockers = [
    routeLengthM !== null && routeLengthM > 0
      ? ""
      : "PROJECT_VALUE_INVALID:approved_pipe_route_linear_m",
    systemApplication === "ABOVE_GROUND_SOIL_AND_WASTE"
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:system_application=${systemApplication}`,
    meaningfulReference(hydraulicDesignReference)
      ? ""
      : "PROJECT_VALUE_INVALID:hydraulic_and_appliance_design_reference",
    selectedNominalDiameter === "DN100_OD110"
      ? ""
      : `PHYSICAL_NORM_VARIANT_CONFLICT:selected_nominal_diameter=${selectedNominalDiameter}`,
    selectedProductCode === "C3766BK"
      ? ""
      : `PHYSICAL_NORM_VARIANT_CONFLICT:selected_product_code=${selectedProductCode}`,
    selectedCommercialLengthM === 3
      ? ""
      : `PHYSICAL_NORM_VARIANT_CONFLICT:selected_commercial_pipe_length_m=${selectedCommercialLengthM}`,
    meaningfulReference(fittingSchedule) ? "" : "PROJECT_VALUE_INVALID:fitting_schedule",
    meaningfulReference(socketLayout) ? "" : "PROJECT_VALUE_INVALID:fitting_socket_and_insertion_layout",
    meaningfulReference(cutPlan) ? "" : "PROJECT_VALUE_INVALID:reusable_cut_length_plan",
    meaningfulReference(thermalDesign) ? "" : "PROJECT_VALUE_INVALID:thermal_movement_design",
    meaningfulReference(supportSchedule) ? "" : "PROJECT_VALUE_INVALID:support_schedule",
    meaningfulReference(firestoppingScope) ? "" : "PROJECT_VALUE_INVALID:firestopping_scope",
    meaningfulReference(acousticScope) ? "" : "PROJECT_VALUE_INVALID:acoustic_scope",
    cuttingAllowancePercent !== null && cuttingAllowancePercent >= 0 && cuttingAllowancePercent <= 100
      ? ""
      : `PROJECT_VALUE_INVALID:project_cutting_allowance_percent=${cuttingAllowancePercent}`,
    projectOrder !== null
      ? ""
      : "PROJECT_VALUE_INVALID:supplier_purchase_packaging",
    projectOrder !== null && minimumOrderLengthM !== null &&
      projectOrder.procurementLengthM + 1e-9 >= minimumOrderLengthM
      ? ""
      : `PROJECT_VALUE_INVALID:supplier_purchase_packaging_below_route_and_allowance:minimum=${minimumOrderLengthM}`,
  ].filter(Boolean);
  if (blockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      input.parameter_values,
      blockers,
      WAVIN_OSMA_C3766BK_REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }

  const geometricQuantityM = Number((routeLengthM! * pipeNorm.rate.value).toFixed(9));
  const procurementQuantityM = projectOrder!.procurementLengthM;
  const explicitGeometricOutput = finiteNumber(explicitValue(
    input.parameter_values,
    "wavin_osma_geometric_pipe_quantity_linear_m",
  ));
  const explicitProcurementOutput = finiteNumber(explicitValue(
    input.parameter_values,
    "wavin_osma_project_procurement_quantity_linear_m",
  ));
  const conflicts = [
    explicitGeometricOutput !== null && Math.abs(explicitGeometricOutput - geometricQuantityM) > 1e-9
      ? `PHYSICAL_NORM_VALUE_CONFLICT:wavin_osma_geometric_pipe_quantity_linear_m=${explicitGeometricOutput}:norm_value=${geometricQuantityM}`
      : "",
    explicitProcurementOutput !== null && Math.abs(explicitProcurementOutput - procurementQuantityM) > 1e-9
      ? `PHYSICAL_NORM_VALUE_CONFLICT:wavin_osma_project_procurement_quantity_linear_m=${explicitProcurementOutput}:project_value=${procurementQuantityM}`
      : "",
  ].filter(Boolean);
  if (conflicts.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      input.parameter_values,
      conflicts,
      [
        ...WAVIN_OSMA_C3766BK_REQUIRED_EXPLICIT_PARAMETER_IDS,
        "wavin_osma_geometric_pipe_quantity_linear_m",
        "wavin_osma_project_procurement_quantity_linear_m",
      ],
    );
  }

  const capturedAt = WAVIN_OSMA_C3766BK_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${productProfileId}`,
    `approved_pipe_route_linear_m=${routeLengthM}`,
    `system_application=${systemApplication}`,
    `hydraulic_and_appliance_design_reference=${hydraulicDesignReference}`,
    `selected_nominal_diameter=${selectedNominalDiameter}`,
    `selected_product_code=${selectedProductCode}`,
    `selected_commercial_pipe_length_m=${selectedCommercialLengthM}`,
    `fitting_schedule=${fittingSchedule}`,
    `fitting_socket_and_insertion_layout=${socketLayout}`,
    `reusable_cut_length_plan=${cutPlan}`,
    `thermal_movement_design=${thermalDesign}`,
    `support_schedule=${supportSchedule}`,
    `firestopping_scope=${firestoppingScope}`,
    `acoustic_scope=${acousticScope}`,
    `project_cutting_allowance_percent=${cuttingAllowancePercent}`,
    `supplier_purchase_packaging=${supplierPackaging}`,
    `wavin_osma_geometric_pipe_quantity_linear_m=${geometricQuantityM}`,
    `wavin_osma_project_procurement_quantity_linear_m=${procurementQuantityM}`,
    "formula=approved_pipe_route_linear_m*1",
    "fittings_socket_insertion_and_cut_reuse_separate=true",
    "automatic_cutting_allowance=false",
    "automatic_three_metre_rounding=false",
    "supplier_master_pack_57_assumed=false",
    "automatic_generic_binding=false",
  ].join(";");
  const parameterValues = Object.freeze({
    ...input.parameter_values,
    wavin_osma_geometric_pipe_quantity_linear_m: {
      value: geometricQuantityM,
      unit_id: "linear_m",
      source_type: "APPLICABLE_NORM" as const,
      source_id: WAVIN_OSMA_C3766BK_110MM_3M_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
    wavin_osma_project_procurement_quantity_linear_m: {
      value: procurementQuantityM,
      unit_id: "linear_m",
      source_type: "USER_EXPLICIT" as const,
      source_id: "project-selected-wavin-osma-pipe-order",
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: APPLICABILITY_VERSION,
    product_profile_id: productProfileId,
    source_id: WAVIN_OSMA_C3766BK_110MM_3M_SOURCE_ID,
    norm_id: WAVIN_OSMA_C3766BK_110MM_3M_NORM_ID,
    source_document_version: WAVIN_OSMA_C3766BK_110MM_3M_SOURCE_METADATA.source_document_version,
    source_url: WAVIN_OSMA_C3766BK_110MM_3M_SOURCE_METADATA.source_url,
    exact_locator: WAVIN_OSMA_C3766BK_110MM_3M_SOURCE_METADATA.exact_locator,
    source_definition_hash: WAVIN_OSMA_C3766BK_110MM_3M_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...WAVIN_OSMA_C3766BK_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: [
      "wavin_osma_geometric_pipe_quantity_linear_m",
      "wavin_osma_project_procurement_quantity_linear_m",
    ] as const,
    calculated_wavin_osma_geometric_pipe_quantity_linear_m: geometricQuantityM,
    calculated_wavin_osma_project_procurement_quantity_linear_m: procurementQuantityM,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}
