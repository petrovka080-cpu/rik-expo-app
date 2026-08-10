import { professionalEstimatePassportId } from "../professionalEstimatePassportV4";

export const ASPHALT_RELATED_SEMANTIC_REGISTRY_VERSION_V4 =
  "asphalt-related-semantic-registry:2026-08-10.v1" as const;

export type AsphaltRelatedOperationClassV4 =
  | "NEW_FULL_CONSTRUCTION"
  | "PAVE_ON_CONFIRMED_PREPARED_BASE"
  | "INSTALL_BINDER_LAYER"
  | "INSTALL_WEARING_LAYER"
  | "OVERLAY"
  | "SURFACE_TREATMENT"
  | "LOCAL_PATCH_REPAIR"
  | "AREA_CARD_REPAIR"
  | "JOINT_OR_EDGE_REPAIR"
  | "PARTIAL_DEPTH_MILLING"
  | "PARTIAL_DEPTH_REMOVAL"
  | "COLD_MILLING"
  | "LOCAL_BREAKUP"
  | "FULL_DEPTH_DEMOLITION"
  | "MECHANICAL_BREAKOUT"
  | "REMOVE_AND_HAUL"
  | "RECYCLE_OR_REGENERATE"
  | "BASE_REPAIR_AND_REINSTATE"
  | "DEMOLISH_AND_REINSTATE"
  | "DEMOLITION_AND_REINSTATEMENT"
  | "SPECIAL_CONTEXT_APPLICATION";

export type AsphaltRelatedApplicationContextV4 =
  | "ROAD"
  | "PARKING"
  | "YARD_OR_SITE"
  | "SIDEWALK_OR_PATH"
  | "BRIDGE_OR_STRUCTURE"
  | "INDUSTRIAL_OR_TECHNICAL_FLOOR"
  | "WET_OR_SPECIAL_ZONE"
  | "LOCAL_REPAIR_ZONE";

export type AsphaltRelatedProfileV4 = {
  canonicalWorkKey: string;
  canonicalCatalogRecordId: string;
  catalogRecordIds: readonly string[];
  professionalNameRu: string;
  uiGroup: "ROADWORKS" | "DEMOLITION_WORKS";
  semanticDomains: readonly ("ASPHALT_RELATED" | "ROADWORKS" | "DEMOLITION")[];
  surfaceMaterial: "ASPHALT_CONCRETE";
  operationClass: AsphaltRelatedOperationClassV4;
  applicationContext: AsphaltRelatedApplicationContextV4;
  passportId: string;
  passportVersion: string;
  calculationStrategyId: string;
  calculationProfileId: string;
  parameterSchemaId: string;
  formulaGraphVersion: string;
  normativeCompositionId: string;
  positiveVectorId: string;
  forbiddenOwnerSetId: string;
  requiredParameters: readonly string[];
  optionalParameters: readonly string[];
};

const ASPHALT_CONCRETE_EXPANDED_IDS = Object.freeze([
  "asphalt_concrete_pavement_rom_concept_expanded_complex_v1",
  "asphalt_concrete_pavement_preliminary_boq_expanded_complex_v1",
  "asphalt_concrete_pavement_detailed_boq_from_drawings_expanded_complex_v1",
  "asphalt_concrete_pavement_tender_boq_expanded_complex_v1",
  "asphalt_concrete_pavement_as_built_estimate_expanded_complex_v1",
]);

const BRIDGE_ASPHALT_EXPANDED_IDS = Object.freeze([
  "bridge_asphalt_rom_concept_expanded_complex_v1",
  "bridge_asphalt_preliminary_boq_expanded_complex_v1",
  "bridge_asphalt_detailed_boq_from_drawings_expanded_complex_v1",
  "bridge_asphalt_tender_boq_expanded_complex_v1",
  "bridge_asphalt_as_built_estimate_expanded_complex_v1",
]);

const DEMOLITION_REQUIRED_PARAMETERS = Object.freeze([
  "removal_area_m2",
  "removal_depth_mm",
  "removal_method",
  "removal_extent",
  "existing_asphalt_density_t_m3",
  "haul_required",
  "material_destination",
]);

const DEMOLITION_OPTIONAL_PARAMETERS = Object.freeze([
  "total_area_m2",
  "removal_share",
  "existing_total_thickness_mm",
  "haul_distance_km",
  "truck_payload_t",
  "boundary_cut_length_m",
  "cut_map_geometry",
  "number_of_cards",
  "number_of_passes",
  "base_disposition",
  "base_condition_after_removal",
  "traffic_constraint",
  "dust_suppression_required",
  "contamination_reject_t",
  "disposal_loss_t",
  "payload_utilization_factor",
  "reinstatement_depth_mm",
  "new_asphalt_density_t_m3",
]);

function profile(input: Omit<AsphaltRelatedProfileV4,
  "passportVersion" | "formulaGraphVersion" | "normativeCompositionId" | "positiveVectorId" | "forbiddenOwnerSetId" |
  "uiGroup" | "semanticDomains" | "surfaceMaterial"
> & Partial<Pick<AsphaltRelatedProfileV4,
  "passportVersion" | "formulaGraphVersion" | "normativeCompositionId" | "positiveVectorId" | "forbiddenOwnerSetId" |
  "uiGroup" | "semanticDomains" | "surfaceMaterial"
>>): AsphaltRelatedProfileV4 {
  const removal = [
    "FULL_DEPTH_DEMOLITION",
    "PARTIAL_DEPTH_MILLING",
    "PARTIAL_DEPTH_REMOVAL",
    "COLD_MILLING",
    "LOCAL_BREAKUP",
    "MECHANICAL_BREAKOUT",
    "REMOVE_AND_HAUL",
  ].includes(input.operationClass);
  const semanticDomains: readonly ("ASPHALT_RELATED" | "ROADWORKS" | "DEMOLITION")[] =
    input.semanticDomains ?? (removal
      ? ["ASPHALT_RELATED", "DEMOLITION"]
      : ["ASPHALT_RELATED", "ROADWORKS"]);
  return Object.freeze({
    ...input,
    catalogRecordIds: Object.freeze([...input.catalogRecordIds]),
    requiredParameters: Object.freeze([...input.requiredParameters]),
    optionalParameters: Object.freeze([...input.optionalParameters]),
    uiGroup: input.uiGroup ?? (removal ? "DEMOLITION_WORKS" : "ROADWORKS"),
    semanticDomains: Object.freeze([...semanticDomains]),
    surfaceMaterial: input.surfaceMaterial ?? "ASPHALT_CONCRETE",
    passportVersion: input.passportVersion ?? ASPHALT_RELATED_SEMANTIC_REGISTRY_VERSION_V4,
    formulaGraphVersion: input.formulaGraphVersion ?? `${input.canonicalWorkKey}:formula-graph:v1`,
    normativeCompositionId: input.normativeCompositionId ?? `${input.canonicalWorkKey}:normative-applicability:v1`,
    positiveVectorId: input.positiveVectorId ?? `${input.canonicalWorkKey}:positive-vector:v1`,
    forbiddenOwnerSetId: input.forbiddenOwnerSetId ?? `${input.canonicalWorkKey}:forbidden-owner-set:v1`,
  });
}

export const ASPHALT_RELATED_EXTRA_PROFILES_V4: readonly AsphaltRelatedProfileV4[] = Object.freeze([
  profile({
    canonicalWorkKey: "asphalt_concrete_pavement",
    canonicalCatalogRecordId: "asphalt_concrete_pavement_preliminary_boq_expanded_complex_v1",
    catalogRecordIds: [...ASPHALT_CONCRETE_EXPANDED_IDS, "asphalt_paving"],
    professionalNameRu: "Устройство асфальтобетонного дорожного покрытия",
    operationClass: "NEW_FULL_CONSTRUCTION",
    applicationContext: "ROAD",
    passportId: professionalEstimatePassportId("asphalt_concrete_pavement"),
    calculationStrategyId: "asphalt_concrete_pavement:full-pavement-structure:v4",
    calculationProfileId: "asphalt_concrete_pavement:calculation-profile:v4",
    parameterSchemaId: "asphalt_concrete_pavement:parameter-schema:v4",
    requiredParameters: ["area_m2", "wearing_layer_thickness_mm", "asphalt_density_t_m3"],
    optionalParameters: ["binder_layer_thickness_mm", "haul_distance_km"],
  }),
  profile({
    canonicalWorkKey: "bridge_asphalt",
    canonicalCatalogRecordId: "bridge_asphalt_preliminary_boq_expanded_complex_v1",
    catalogRecordIds: BRIDGE_ASPHALT_EXPANDED_IDS,
    professionalNameRu: "Асфальтобетонное покрытие мостового сооружения",
    operationClass: "SPECIAL_CONTEXT_APPLICATION",
    applicationContext: "BRIDGE_OR_STRUCTURE",
    passportId: professionalEstimatePassportId("bridge_asphalt"),
    calculationStrategyId: "bridge_asphalt:bridge-deck-overlay:v1",
    calculationProfileId: "bridge_asphalt:calculation-profile:v1",
    parameterSchemaId: "bridge_asphalt:parameter-schema:v1",
    requiredParameters: ["area_m2", "wearing_layer_thickness_mm", "asphalt_density_t_m3", "bridge_deck_system_confirmed"],
    optionalParameters: ["binder_layer_thickness_mm", "haul_distance_km"],
  }),
  profile({
    canonicalWorkKey: "asphalt_demolition",
    canonicalCatalogRecordId: "asphalt_demolition",
    catalogRecordIds: ["asphalt_demolition"],
    professionalNameRu: "Демонтаж асфальта",
    operationClass: "FULL_DEPTH_DEMOLITION",
    applicationContext: "ROAD",
    passportId: professionalEstimatePassportId("asphalt_demolition"),
    calculationStrategyId: "asphalt_demolition:mass-balance-and-haul:v1",
    calculationProfileId: "asphalt_demolition:calculation-profile:v1",
    parameterSchemaId: "asphalt_demolition:parameter-schema:v1",
    formulaGraphVersion: "asphalt-demolition-formula-graph:2026-08-10.v1",
    normativeCompositionId: "asphalt-demolition-kr-applicability:2026-08-10.v1",
    positiveVectorId: "asphalt-demolition:D0-D3:v1",
    forbiddenOwnerSetId: "asphalt-demolition:pure-demolition-installation-owners:v1",
    requiredParameters: DEMOLITION_REQUIRED_PARAMETERS,
    optionalParameters: DEMOLITION_OPTIONAL_PARAMETERS,
  }),
  profile({
    canonicalWorkKey: "asphalt_parking_lot",
    canonicalCatalogRecordId: "asphalt_parking_lot",
    catalogRecordIds: ["asphalt_parking_lot"],
    professionalNameRu: "Асфальтирование парковки",
    operationClass: "NEW_FULL_CONSTRUCTION",
    applicationContext: "PARKING",
    passportId: professionalEstimatePassportId("asphalt_parking_lot"),
    calculationStrategyId: "asphalt_parking_lot:parking-pavement:v1",
    calculationProfileId: "asphalt_parking_lot:calculation-profile:v1",
    parameterSchemaId: "asphalt_parking_lot:parameter-schema:v1",
    requiredParameters: ["area_m2", "wearing_layer_thickness_mm", "asphalt_density_t_m3", "traffic_class_confirmed"],
    optionalParameters: ["binder_layer_thickness_mm", "haul_distance_km"],
  }),
  profile({
    canonicalWorkKey: "asphalt_driveway",
    canonicalCatalogRecordId: "asphalt_driveway",
    catalogRecordIds: ["asphalt_driveway"],
    professionalNameRu: "Асфальтирование заезда",
    operationClass: "NEW_FULL_CONSTRUCTION",
    applicationContext: "YARD_OR_SITE",
    passportId: professionalEstimatePassportId("asphalt_driveway"),
    calculationStrategyId: "asphalt_driveway:site-pavement:v1",
    calculationProfileId: "asphalt_driveway:calculation-profile:v1",
    parameterSchemaId: "asphalt_driveway:parameter-schema:v1",
    requiredParameters: ["area_m2", "wearing_layer_thickness_mm", "asphalt_density_t_m3", "prepared_base_confirmed"],
    optionalParameters: ["binder_layer_thickness_mm", "haul_distance_km"],
  }),
  profile({
    canonicalWorkKey: "asphalt_patch_repair",
    canonicalCatalogRecordId: "asphalt_patch_repair",
    catalogRecordIds: ["asphalt_patch_repair"],
    professionalNameRu: "Ямочный ремонт асфальта",
    operationClass: "LOCAL_PATCH_REPAIR",
    applicationContext: "LOCAL_REPAIR_ZONE",
    passportId: professionalEstimatePassportId("asphalt_patch_repair"),
    calculationStrategyId: "asphalt_patch_repair:cut-remove-reinstate:v1",
    calculationProfileId: "asphalt_patch_repair:calculation-profile:v1",
    parameterSchemaId: "asphalt_patch_repair:parameter-schema:v1",
    requiredParameters: ["area_m2", "removal_depth_mm", "asphalt_density_t_m3", "material_destination"],
    optionalParameters: ["boundary_cut_length_m", "haul_distance_km"],
  }),
  profile({
    canonicalWorkKey: "asphalt_milling",
    canonicalCatalogRecordId: "asphalt_milling",
    catalogRecordIds: ["asphalt_milling"],
    professionalNameRu: "Холодное фрезерование асфальта",
    operationClass: "COLD_MILLING",
    applicationContext: "ROAD",
    passportId: professionalEstimatePassportId("asphalt_milling"),
    calculationStrategyId: "asphalt_milling:depth-volume-haul:v1",
    calculationProfileId: "asphalt_milling:calculation-profile:v1",
    parameterSchemaId: "asphalt_milling:parameter-schema:v1",
    requiredParameters: [
      "removal_area_m2",
      "removal_depth_mm",
      "existing_asphalt_density_t_m3",
      "haul_required",
      "material_destination",
    ],
    optionalParameters: DEMOLITION_OPTIONAL_PARAMETERS,
  }),
  profile({
    canonicalWorkKey: "asphalt_overlay",
    canonicalCatalogRecordId: "asphalt_overlay",
    catalogRecordIds: ["asphalt_overlay"],
    professionalNameRu: "Устройство верхнего слоя асфальта",
    operationClass: "OVERLAY",
    applicationContext: "ROAD",
    passportId: professionalEstimatePassportId("asphalt_overlay"),
    calculationStrategyId: "asphalt_overlay:wearing-layer:v1",
    calculationProfileId: "asphalt_overlay:calculation-profile:v1",
    parameterSchemaId: "asphalt_overlay:parameter-schema:v1",
    requiredParameters: ["area_m2", "wearing_layer_thickness_mm", "asphalt_density_t_m3", "prepared_base_confirmed"],
    optionalParameters: ["haul_distance_km"],
  }),
  profile({
    canonicalWorkKey: "asphalt_base_layer",
    canonicalCatalogRecordId: "asphalt_base_layer",
    catalogRecordIds: ["asphalt_base_layer"],
    professionalNameRu: "Устройство нижнего слоя асфальта",
    operationClass: "INSTALL_BINDER_LAYER",
    applicationContext: "ROAD",
    passportId: professionalEstimatePassportId("asphalt_base_layer"),
    calculationStrategyId: "asphalt_base_layer:binder-layer:v1",
    calculationProfileId: "asphalt_base_layer:calculation-profile:v1",
    parameterSchemaId: "asphalt_base_layer:parameter-schema:v1",
    requiredParameters: ["area_m2", "binder_layer_thickness_mm", "asphalt_density_t_m3", "prepared_base_confirmed"],
    optionalParameters: ["haul_distance_km"],
  }),
]);

const profileByCatalogRecordId = new Map<string, AsphaltRelatedProfileV4>();
const profileByCanonicalWorkKey = new Map<string, AsphaltRelatedProfileV4>();
for (const entry of ASPHALT_RELATED_EXTRA_PROFILES_V4) {
  profileByCanonicalWorkKey.set(entry.canonicalWorkKey, entry);
  for (const id of new Set([entry.canonicalWorkKey, ...entry.catalogRecordIds])) {
    const previous = profileByCatalogRecordId.get(id);
    if (previous && previous.canonicalWorkKey !== entry.canonicalWorkKey) {
      throw new Error(`ASPHALT_RELATED_CROSS_OPERATION_ALIAS:${id}`);
    }
    profileByCatalogRecordId.set(id, entry);
  }
}

export function getAsphaltRelatedProfileByCatalogRecordIdV4(
  catalogRecordId: string | null | undefined,
): AsphaltRelatedProfileV4 | null {
  const id = catalogRecordId?.trim();
  return id ? profileByCatalogRecordId.get(id) ?? null : null;
}

export function getAsphaltRelatedProfileByCanonicalWorkKeyV4(
  workKey: string | null | undefined,
): AsphaltRelatedProfileV4 | null {
  const id = workKey?.trim();
  return id ? profileByCanonicalWorkKey.get(id) ?? null : null;
}

export function isAsphaltRelatedAliasRecordV4(catalogRecordId: string): boolean {
  const profile = getAsphaltRelatedProfileByCatalogRecordIdV4(catalogRecordId);
  return Boolean(profile && catalogRecordId !== profile.canonicalCatalogRecordId);
}

export function auditAsphaltRelatedExtraProfileRegistryV4() {
  const catalogIds = ASPHALT_RELATED_EXTRA_PROFILES_V4.flatMap((entry) => entry.catalogRecordIds);
  return Object.freeze({
    profiles: ASPHALT_RELATED_EXTRA_PROFILES_V4.length,
    catalog_records: catalogIds.length,
    unique_catalog_records: new Set(catalogIds).size,
    duplicate_catalog_record_id: catalogIds.length - new Set(catalogIds).size,
    missing_passport: ASPHALT_RELATED_EXTRA_PROFILES_V4.filter((entry) => !entry.passportId).length,
    missing_strategy: ASPHALT_RELATED_EXTRA_PROFILES_V4.filter((entry) => !entry.calculationStrategyId).length,
    missing_operation_class: ASPHALT_RELATED_EXTRA_PROFILES_V4.filter((entry) => !entry.operationClass).length,
    missing_application_context: ASPHALT_RELATED_EXTRA_PROFILES_V4.filter((entry) => !entry.applicationContext).length,
    cross_operation_alias: 0,
    unknown_fallback: 0,
  });
}
