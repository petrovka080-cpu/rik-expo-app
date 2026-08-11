import { professionalEstimatePassportId } from "../professionalEstimatePassportV4";
import { ASPHALT_RESOURCE_LEVEL_CORE_PARAMETER_KEYS_V4 } from "./compileAsphaltRelatedThroughCoreV4";
import { ASPHALT_REMOVAL_RESOURCE_PARAMETER_KEYS_V4 } from "./asphaltRemovalResourceAssembliesV4";

export const ASPHALT_RELATED_SEMANTIC_REGISTRY_VERSION_V4 =
  "asphalt-related-semantic-registry:2026-08-11.v2" as const;

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

export type AsphaltRelatedCatalogBindingV4 = {
  catalogRecordId: string;
  canonicalWorkKey: string;
  professionalPassportId: string;
  boqBlueprintId: string;
  parameterSchemaId: string;
  formulaBindingId: string;
  normApplicabilityProfileId: string;
  deterministicFixtureId: string;
};

const ASPHALT_CONCRETE_EXPANDED_IDS = Object.freeze([
  "asphalt_concrete_pavement_rom_concept_expanded_complex_v1",
  "asphalt_concrete_pavement_preliminary_boq_expanded_complex_v1",
  "asphalt_concrete_pavement_detailed_boq_from_drawings_expanded_complex_v1",
  "asphalt_concrete_pavement_tender_boq_expanded_complex_v1",
  "asphalt_concrete_pavement_as_built_estimate_expanded_complex_v1",
  "road_construction_rom_concept_expanded_complex_v1",
  "road_construction_preliminary_boq_expanded_complex_v1",
  "road_construction_detailed_boq_from_drawings_expanded_complex_v1",
  "road_construction_tender_boq_expanded_complex_v1",
  "road_construction_as_built_estimate_expanded_complex_v1",
  "village_road_construction_rom_concept_expanded_complex_v1",
  "village_road_construction_preliminary_boq_expanded_complex_v1",
  "village_road_construction_detailed_boq_from_drawings_expanded_complex_v1",
  "village_road_construction_tender_boq_expanded_complex_v1",
  "village_road_construction_as_built_estimate_expanded_complex_v1",
  "built-in-ai-1000:0701",
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
  "loading_required",
  "base_cleaning_required",
]);

const DEMOLITION_SHARED_OPTIONAL_PARAMETERS = Object.freeze([
  "total_area_m2",
  "removal_share",
  "existing_total_thickness_mm",
  "haul_distance_km",
  "truck_payload_t",
  "boundary_cut_length_m",
  "cut_map_geometry",
  "number_of_cards",
  "number_of_passes",
  "milling_width_m",
  "loading_required",
  "base_cleaning_required",
  "base_disposition",
  "base_condition_after_removal",
  "traffic_constraint",
  "dust_suppression_required",
  "contamination_reject_t",
  "disposal_loss_t",
  "payload_utilization_factor",
]);

const DEMOLITION_OPTIONAL_PARAMETERS = Object.freeze([
  ...DEMOLITION_SHARED_OPTIONAL_PARAMETERS,
  ...ASPHALT_REMOVAL_RESOURCE_PARAMETER_KEYS_V4,
  ...ASPHALT_RESOURCE_LEVEL_CORE_PARAMETER_KEYS_V4,
  "work_scope",
  "reinstatement_depth_mm",
  "new_asphalt_density_t_m3",
  "wearing_mix_type",
  "prepared_base_confirmed",
  "tack_coat_required",
  "tack_coat_rate_l_m2",
]);

const INSTALLATION_OPTIONAL_PARAMETERS = Object.freeze([
  "length_m",
  "width_m",
  "haul_distance_km",
  "number_of_compaction_passes",
  "edge_treatment_length_m",
  "tack_coat_required",
  "tack_coat_rate_l_m2",
  ...ASPHALT_RESOURCE_LEVEL_CORE_PARAMETER_KEYS_V4,
]);

const OPTIONAL_SITE_FEATURE_PARAMETERS = Object.freeze([
  "binder_layer_required",
  "binder_layer_thickness_mm",
  "binder_mix_type",
  "base_construction_required",
  "base_layer_thickness_mm",
  "base_material_type",
  "base_material_compaction_factor",
  "subbase_required",
  "subbase_layer_thickness_mm",
  "subbase_material_type",
  "subbase_material_compaction_factor",
  "base_repair_area_m2",
  "curb_required",
  "curb_length_m",
  "curb_type",
  "drainage_required",
  "drainage_length_m",
  "drainage_inlet_count",
  "drainage_type",
  "marking_required",
  "marking_area_m2",
  "marking_material_type",
  "marking_material_rate_kg_m2",
  "marking_glass_beads_required",
  "marking_glass_beads_rate_kg_m2",
  "signing_required",
  "sign_count",
  "lighting_required",
  "lighting_pole_count",
  "lighting_luminaire_count",
  "lighting_cable_length_m",
  "lighting_cabinet_count",
]);

const PARKING_FACILITY_OPTIONAL_PARAMETERS = Object.freeze([
  "accessible_parking_required",
  "accessible_space_count",
  "signing_required",
  "sign_count",
  "lighting_required",
  "lighting_pole_count",
  "lighting_luminaire_count",
  "lighting_cable_length_m",
  "lighting_cabinet_count",
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
    formulaGraphVersion: input.formulaGraphVersion ?? `${input.canonicalWorkKey}:formula-graph:v2`,
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
    requiredParameters: ["area_m2", "traffic_class", "base_condition", "wearing_layer_thickness_mm", "wearing_mix_type", "asphalt_density_t_m3"],
    optionalParameters: [...INSTALLATION_OPTIONAL_PARAMETERS, ...OPTIONAL_SITE_FEATURE_PARAMETERS],
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
    requiredParameters: [
      "area_m2", "bridge_deck_system_confirmed", "waterproofing_type", "waterproofing_condition",
      "protective_layer_thickness_mm", "wearing_layer_thickness_mm", "wearing_mix_type",
      "asphalt_density_t_m3", "traffic_class",
    ],
    optionalParameters: [
      "binder_layer_thickness_mm",
      "binder_mix_type",
      "waterproofing_repair_area_m2",
      "waterproofing_primer_rate_l_m2",
      "expansion_joint_length_m",
      ...INSTALLATION_OPTIONAL_PARAMETERS,
    ],
  }),
  profile({
    canonicalWorkKey: "asphalt_demolition",
    canonicalCatalogRecordId: "asphalt_demolition",
    catalogRecordIds: ["asphalt_demolition", "built-in-ai-1000:0670"],
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
    catalogRecordIds: ["asphalt_parking_lot", "built-in-ai-1000:0702"],
    professionalNameRu: "Асфальтирование парковки",
    operationClass: "NEW_FULL_CONSTRUCTION",
    applicationContext: "PARKING",
    passportId: professionalEstimatePassportId("asphalt_parking_lot"),
    calculationStrategyId: "asphalt_parking_lot:parking-pavement:v1",
    calculationProfileId: "asphalt_parking_lot:calculation-profile:v1",
    parameterSchemaId: "asphalt_parking_lot:parameter-schema:v1",
    requiredParameters: [
      "area_m2", "parking_purpose", "traffic_class", "base_condition", "prepared_base_confirmed",
      "wearing_layer_thickness_mm", "wearing_mix_type", "asphalt_density_t_m3",
    ],
    optionalParameters: [
      ...INSTALLATION_OPTIONAL_PARAMETERS,
      ...OPTIONAL_SITE_FEATURE_PARAMETERS,
      ...PARKING_FACILITY_OPTIONAL_PARAMETERS,
    ],
  }),
  profile({
    canonicalWorkKey: "asphalt_driveway",
    canonicalCatalogRecordId: "asphalt_driveway",
    catalogRecordIds: ["asphalt_driveway", "built-in-ai-1000:0703"],
    professionalNameRu: "Асфальтирование заезда",
    operationClass: "NEW_FULL_CONSTRUCTION",
    applicationContext: "YARD_OR_SITE",
    passportId: professionalEstimatePassportId("asphalt_driveway"),
    calculationStrategyId: "asphalt_driveway:site-pavement:v1",
    calculationProfileId: "asphalt_driveway:calculation-profile:v1",
    parameterSchemaId: "asphalt_driveway:parameter-schema:v1",
    requiredParameters: [
      "area_m2", "vehicle_type", "traffic_class", "base_condition", "prepared_base_confirmed",
      "connection_width_m", "wearing_layer_thickness_mm", "wearing_mix_type", "asphalt_density_t_m3",
    ],
    optionalParameters: ["old_pavement_removal_required", ...INSTALLATION_OPTIONAL_PARAMETERS, ...OPTIONAL_SITE_FEATURE_PARAMETERS],
  }),
  profile({
    canonicalWorkKey: "asphalt_patch_repair",
    canonicalCatalogRecordId: "asphalt_patch_repair",
    catalogRecordIds: ["asphalt_patch_repair", "built-in-ai-1000:0704"],
    professionalNameRu: "Ямочный ремонт асфальта",
    operationClass: "LOCAL_PATCH_REPAIR",
    applicationContext: "LOCAL_REPAIR_ZONE",
    passportId: professionalEstimatePassportId("asphalt_patch_repair"),
    calculationStrategyId: "asphalt_patch_repair:cut-remove-reinstate:v1",
    calculationProfileId: "asphalt_patch_repair:calculation-profile:v1",
    parameterSchemaId: "asphalt_patch_repair:parameter-schema:v1",
    requiredParameters: [
      "area_m2", "number_of_cards", "removal_depth_mm", "repair_method", "boundary_cut_required",
      "wearing_mix_type", "asphalt_density_t_m3", "existing_asphalt_density_t_m3", "tack_coat_required", "haul_required", "material_destination",
    ],
    optionalParameters: ["boundary_cut_length_m", "loading_required", "base_cleaning_required", ...INSTALLATION_OPTIONAL_PARAMETERS],
  }),
  profile({
    canonicalWorkKey: "asphalt_milling",
    canonicalCatalogRecordId: "asphalt_milling",
    catalogRecordIds: ["asphalt_milling", "built-in-ai-1000:0705"],
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
      "loading_required",
      "base_cleaning_required",
    ],
    optionalParameters: DEMOLITION_OPTIONAL_PARAMETERS,
  }),
  profile({
    canonicalWorkKey: "asphalt_overlay",
    canonicalCatalogRecordId: "asphalt_overlay",
    catalogRecordIds: ["asphalt_overlay", "built-in-ai-1000:0706"],
    professionalNameRu: "Устройство верхнего слоя асфальта",
    operationClass: "OVERLAY",
    applicationContext: "ROAD",
    passportId: professionalEstimatePassportId("asphalt_overlay"),
    calculationStrategyId: "asphalt_overlay:wearing-layer:v1",
    calculationProfileId: "asphalt_overlay:calculation-profile:v1",
    parameterSchemaId: "asphalt_overlay:parameter-schema:v1",
    requiredParameters: [
      "area_m2", "existing_surface_condition", "milling_required", "wearing_layer_thickness_mm",
      "wearing_mix_type", "asphalt_density_t_m3", "tack_coat_required",
    ],
    optionalParameters: ["milling_depth_mm", "number_of_passes", "defect_repair_required", ...INSTALLATION_OPTIONAL_PARAMETERS],
  }),
  profile({
    canonicalWorkKey: "asphalt_base_layer",
    canonicalCatalogRecordId: "asphalt_base_layer",
    catalogRecordIds: ["asphalt_base_layer", "built-in-ai-1000:0707"],
    professionalNameRu: "Устройство нижнего слоя асфальта",
    operationClass: "INSTALL_BINDER_LAYER",
    applicationContext: "ROAD",
    passportId: professionalEstimatePassportId("asphalt_base_layer"),
    calculationStrategyId: "asphalt_base_layer:binder-layer:v1",
    calculationProfileId: "asphalt_base_layer:calculation-profile:v1",
    parameterSchemaId: "asphalt_base_layer:parameter-schema:v1",
    requiredParameters: [
      "area_m2", "traffic_class", "underlying_layer_condition", "prepared_base_confirmed",
      "binder_layer_thickness_mm", "binder_mix_type", "asphalt_density_t_m3", "tack_coat_required",
    ],
    optionalParameters: INSTALLATION_OPTIONAL_PARAMETERS,
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

export function asphaltRelatedParameterKeysForProfileV4(
  profile: AsphaltRelatedProfileV4,
): readonly string[] {
  return Object.freeze([
    ...new Set([...profile.requiredParameters, ...profile.optionalParameters]),
  ]);
}

export function asphaltRelatedCatalogBindingV4(
  profile: AsphaltRelatedProfileV4,
  catalogRecordId: string,
): AsphaltRelatedCatalogBindingV4 {
  const exactCatalogRecordId = catalogRecordId.trim() || profile.canonicalCatalogRecordId;
  return Object.freeze({
    catalogRecordId: exactCatalogRecordId,
    canonicalWorkKey: profile.canonicalWorkKey,
    professionalPassportId: professionalEstimatePassportId(exactCatalogRecordId),
    boqBlueprintId: `${exactCatalogRecordId}:boq-blueprint:v4`,
    parameterSchemaId: `${exactCatalogRecordId}:parameter-schema:v4`,
    formulaBindingId: `${exactCatalogRecordId}:formula-binding:v4`,
    normApplicabilityProfileId: `${exactCatalogRecordId}:norm-applicability:v4`,
    deterministicFixtureId: `${exactCatalogRecordId}:deterministic-fixture:v4`,
  });
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
