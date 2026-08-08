import workCatalog from "../../../../../data/estimate-catalog/work-items/work-catalog-10000.json";

export const ROADWORKS_WAVE_A_SOURCE_SHA = "e1e258f2";

export type RoadworksWaveAOperation =
  | "install"
  | "lay"
  | "compact"
  | "repair"
  | "prepare"
  | "level"
  | "drain"
  | "finish";

export type RoadworksWaveAScope =
  | "standard"
  | "small_area"
  | "large_area"
  | "wet_zone"
  | "technical_room";

export type RoadworksWaveAScopeExecutionProfile = {
  applicationContext: string;
  executionMethod: string;
  applicabilitySourceIds: readonly string[];
  exclusions: readonly string[];
};

export const ROADWORKS_WAVE_A_SCOPE_EXECUTION_PROFILES: Readonly<
  Record<RoadworksWaveAScope, RoadworksWaveAScopeExecutionProfile>
> = Object.freeze({
  standard: {
    applicationContext: "Дорожное покрытие, улица, проезд, площадка или дорога промышленного предприятия со стандартным фронтом работ",
    executionMethod: "Стандартный механизированный технологический поток по утверждённому проекту",
    applicabilitySourceIds: ["kg_snip_32_01_2004_road_design", "kg_nism_gost_9128_2013"],
    exclusions: ["Не включает основание и полный комплекс дорожной инфраструктуры, если они не выбраны отдельным scope"],
  },
  small_area: {
    applicationContext: "Локальный или стеснённый наружный участок дорожного покрытия с ограниченным доступом крупной техники",
    executionMethod: "Малый механизированный комплект и ручная доработка кромок; производительность задаётся проектным вводом",
    applicabilitySourceIds: ["kg_snip_32_01_2004_road_design", "kg_nism_gost_9128_2013"],
    exclusions: ["Не применяется как скрытый коэффициент к стандартной площади; доступ и производительность подтверждаются пользователем"],
  },
  large_area: {
    applicationContext: "Протяжённый или крупноплощадной наружный фронт дорожных работ",
    executionMethod: "Непрерывный механизированный поток укладки/обработки с поточным контролем захваток",
    applicabilitySourceIds: ["kg_snip_32_01_2004_road_design", "kg_nism_gost_9128_2013"],
    exclusions: ["Не включает дополнительные слои дорожной одежды без явного выбора полного pavement scope"],
  },
  wet_zone: {
    applicationContext: "Наружная асфальтированная площадка, проезд или парковочная поверхность с периодическим увлажнением осадками и проектным поверхностным водоотводом",
    executionMethod: "Дорожная технология выполняется по сухому принятому основанию с явно заданными уклонами, лотками/приёмниками и маршрутом отвода поверхностной воды",
    applicabilitySourceIds: ["kg_snip_32_01_2004_road_design", "kg_nism_gost_9128_2013"],
    exclusions: [
      "Не является санитарной мокрой зоной, внутренней ванной/душевой или гидроизоляцией здания",
      "Не означает укладку по мокрому основанию",
      "Не применяется к постоянно погружённым или химически агрессивным поверхностям",
    ],
  },
  technical_room: {
    applicationContext: "Асфальтобетонный пол производственного технического помещения при допустимой проектной категории воздействий",
    executionMethod: "Стеснённое устройство асфальтобетонного пола с проектной толщиной и контролем ровности",
    applicabilitySourceIds: ["kg_sp_31_101_2024_floors", "kg_nism_gost_9128_2013"],
    exclusions: ["Не применяется при весьма значительном механическом воздействии", "Не применяется без проектной проверки жидкостных, тепловых, антистатических и пожарных требований"],
  },
});

export type RoadworksWaveACatalogClassification =
  | "CANONICAL_WORK_MODEL"
  | "SEARCH_ALIAS"
  | "SCOPE_PRESET"
  | "DISTINCT_WORK_SUBTYPE"
  | "INVALID_CATALOG_ENTRY"
  | "DOMAIN_REVIEW_REQUIRED";

type CatalogItem = (typeof workCatalog.items)[number];

export type RoadworksWaveAInventoryItem = {
  workId: string;
  catalogItemId: string;
  templateId: string;
  professionalNameRu: string;
  catalogName: string;
  technologyFamily: string;
  scopeProfile: RoadworksWaveAScope;
  scopeClass: string;
  primaryQuantity: "area_m2";
  primaryUnit: "m2";
  parameterSchemaId: string;
  manifestId: string;
  assemblyIds: readonly string[];
  sourcePackId: string;
  legacyMappingStatus: "mapped_exactly";
  migrationStatus: "migrated_wave_a";
  semanticModelId: string;
  semanticOwnership: "canonical_model" | "work_specific_profile";
  canonicalModelId: string;
  canonicalWorkId: string;
  scopePresetId: string | null;
  catalogClassification: RoadworksWaveACatalogClassification;
  classificationReason: string;
  domainReviewStatus: "not_required_for_catalog_mapping" | "applicability_review_required";
};

export type RoadworksWaveARow = {
  rowId: string;
  category: "material" | "work" | "labor" | "equipment" | "service" | "logistics" | "test" | "document";
  rowType: "material" | "work" | "labor" | "equipment" | "service" | "logistics" | "control" | "document";
  semanticOwner: string;
  workKey: string;
  passportId: string;
  nameRu: string;
  unit: "m2" | "t" | "t_km" | "l" | "man_hour" | "machine_hour" | "trip" | "pcs";
  uom: "m2" | "t" | "t_km" | "l" | "man_hour" | "machine_hour" | "trip" | "pcs";
  quantity: number;
  formulaId: string;
  affectedBy: readonly string[];
  sourceParameterKeys: readonly string[];
  sourceIds: readonly string[];
  normativeSourceId: string;
  normativeRateIds: readonly string[];
  roundingRule: "ROUND_HALF_UP_3" | "CEIL_POSITIVE" | "EXACT_ONE";
  wasteRule: "INPUT_WASTE_FACTOR_APPLIED" | "NOT_APPLICABLE";
  priceSourceId: string | null;
  priceDate: string | null;
  revisionId: "REFERENCE_UNSAVED";
  procurementEligibility: "ELIGIBLE" | "CONTRACTOR_SCOPE" | "EXCLUDED_CONTROL_DOCUMENT";
  payable: boolean;
  procurementOwner: "buyer" | "contractor" | "laboratory" | "customer";
};

export type RoadworksWaveANumericInputKey =
  | "area_m2"
  | "thickness_mm"
  | "density_t_m3"
  | "waste_factor"
  | "haul_distance_km"
  | "productivity_m2_h"
  | "tack_coat_l_m2"
  | "truck_capacity_t"
  | "waste_truck_capacity_t"
  | "acceptance_lot_m2"
  | "joint_sealant_l_m2";

export type RoadworksWaveAApplicabilityInputKey =
  | "exterior_surface_kind"
  | "drainage_outfall_confirmed"
  | "base_dry_and_accepted"
  | "floor_mechanical_impact_class"
  | "floor_liquid_exposure_class"
  | "approved_floor_mix_type";

export type RoadworksWaveAParameterKey = RoadworksWaveANumericInputKey | RoadworksWaveAApplicabilityInputKey;

export type RoadworksWaveAParameterPresentation = {
  labelRu: string;
  unit: RoadworksWaveAParameterDefinition["unit"];
  inputKind: "number" | "select" | "boolean";
  choices: readonly { value: string; labelRu: string }[];
};

export type RoadworksWaveAInputs = {
  area_m2: number;
  thickness_mm: number;
  density_t_m3: number;
  waste_factor: number;
  haul_distance_km: number;
  productivity_m2_h: number;
  tack_coat_l_m2: number;
  truck_capacity_t: number;
  waste_truck_capacity_t: number;
  acceptance_lot_m2: number;
  joint_sealant_l_m2: number;
  exterior_surface_kind: "PARKING" | "DRIVE" | "INDUSTRIAL_SITE" | "EXTERNAL_AREA";
  drainage_outfall_confirmed: boolean;
  base_dry_and_accepted: boolean;
  floor_mechanical_impact_class: "LOW" | "MODERATE" | "SIGNIFICANT";
  floor_liquid_exposure_class: "NONE" | "LOW_PERIODIC";
  approved_floor_mix_type: "CAST_ASPHALT" | "RIGID_ASPHALT_CONCRETE";
};

export const ROADWORKS_WAVE_A_NUMERIC_INPUT_KEYS: readonly RoadworksWaveANumericInputKey[] = Object.freeze([
  "area_m2", "thickness_mm", "density_t_m3", "waste_factor", "haul_distance_km",
  "productivity_m2_h", "tack_coat_l_m2", "truck_capacity_t", "waste_truck_capacity_t",
  "acceptance_lot_m2", "joint_sealant_l_m2",
]);

export const ROADWORKS_WAVE_A_SCOPE_APPLICABILITY_PARAMETER_KEYS: Readonly<
  Record<RoadworksWaveAScope, readonly RoadworksWaveAApplicabilityInputKey[]>
> = Object.freeze({
  standard: [],
  small_area: [],
  large_area: [],
  wet_zone: ["exterior_surface_kind", "drainage_outfall_confirmed", "base_dry_and_accepted"],
  technical_room: ["floor_mechanical_impact_class", "floor_liquid_exposure_class", "approved_floor_mix_type"],
});

const PREFIX = "paving_roads_landscape_interior_asphalt_";
const OPERATIONS: readonly RoadworksWaveAOperation[] = [
  "install", "lay", "compact", "repair", "prepare", "level", "drain", "finish",
];
const SCOPES: readonly RoadworksWaveAScope[] = [
  "standard", "small_area", "large_area", "wet_zone", "technical_room",
];

const OPERATION_META: Record<RoadworksWaveAOperation, {
  family: string;
  manifest: string;
  assemblies: readonly string[];
  parameters: readonly string[];
}> = {
  install: {
    family: "asphalt_pavement_installation",
    manifest: "SINGLE_LAYER_ASPHALT_INSTALLATION",
    assemblies: ["surface_cleaning", "tack_coat", "asphalt_mix", "paving", "compaction", "layer_acceptance"],
    parameters: ["area_m2", "thickness_mm", "density_t_m3", "waste_factor", "haul_distance_km", "productivity_m2_h", "tack_coat_l_m2", "truck_capacity_t", "acceptance_lot_m2"],
  },
  lay: {
    family: "asphalt_mix_placement",
    manifest: "ASPHALT_MIX_PLACEMENT",
    assemblies: ["asphalt_mix", "paving", "mix_delivery", "placement_control"],
    parameters: ["area_m2", "thickness_mm", "density_t_m3", "waste_factor", "haul_distance_km", "productivity_m2_h", "truck_capacity_t", "acceptance_lot_m2"],
  },
  compact: {
    family: "asphalt_compaction",
    manifest: "ASPHALT_LAYER_COMPACTION",
    assemblies: ["roller_compaction", "density_control"],
    parameters: ["area_m2", "productivity_m2_h", "acceptance_lot_m2"],
  },
  repair: {
    family: "asphalt_surface_repair",
    manifest: "ASPHALT_SURFACE_REPAIR",
    assemblies: ["repair_boundary_cutting", "damaged_material_removal", "tack_coat", "repair_mix", "repair_compaction", "waste_haul", "repair_acceptance"],
    parameters: ["area_m2", "thickness_mm", "density_t_m3", "waste_factor", "haul_distance_km", "productivity_m2_h", "tack_coat_l_m2", "truck_capacity_t", "waste_truck_capacity_t", "acceptance_lot_m2"],
  },
  prepare: {
    family: "asphalt_surface_preparation",
    manifest: "ASPHALT_SURFACE_PREPARATION",
    assemblies: ["mechanical_cleaning", "local_defect_preparation", "surface_acceptance"],
    parameters: ["area_m2", "productivity_m2_h", "acceptance_lot_m2"],
  },
  level: {
    family: "asphalt_leveling",
    manifest: "ASPHALT_LEVELING_COURSE",
    assemblies: ["tack_coat", "leveling_mix", "leveling_placement", "leveling_compaction", "level_control"],
    parameters: ["area_m2", "thickness_mm", "density_t_m3", "waste_factor", "haul_distance_km", "productivity_m2_h", "tack_coat_l_m2", "truck_capacity_t", "acceptance_lot_m2"],
  },
  drain: {
    family: "asphalt_surface_drainage",
    manifest: "ASPHALT_SURFACE_DRAINAGE",
    assemblies: ["drainage_profile_setting", "surface_channel_forming", "drainage_acceptance"],
    parameters: ["area_m2", "productivity_m2_h", "acceptance_lot_m2"],
  },
  finish: {
    family: "asphalt_surface_finishing",
    manifest: "ASPHALT_SURFACE_FINISHING",
    assemblies: ["joint_finishing", "surface_cleanup", "finish_acceptance"],
    parameters: ["area_m2", "productivity_m2_h", "joint_sealant_l_m2", "acceptance_lot_m2"],
  },
};

export const ROADWORKS_WAVE_A_KRER_27_RATE_IDS_BY_OPERATION: Readonly<
  Record<RoadworksWaveAOperation, readonly string[]>
> = Object.freeze({
  install: ["27-06-019", "27-06-020", "27-06-021"],
  lay: ["27-06-019", "27-06-020", "27-06-021"],
  compact: ["27-06-019", "27-06-020"],
  repair: ["27-03-008", "27-03-009", "27-06-025"],
  prepare: ["27-03-001", "27-03-002", "27-03-003", "27-03-008"],
  level: ["27-03-004"],
  drain: ["27-02-001", "27-02-003"],
  finish: ["27-06-009", "27-06-011", "27-06-013"],
});

function parseIdentity(item: CatalogItem): { operation: RoadworksWaveAOperation; scope: RoadworksWaveAScope } | null {
  if (item.work_family_id !== "roadworks" || !item.work_key.startsWith(PREFIX)) return null;
  const tail = item.work_key.slice(PREFIX.length);
  const operation = OPERATIONS.find((candidate) => tail.startsWith(`${candidate}_`));
  if (!operation) return null;
  const scope = tail.slice(operation.length + 1) as RoadworksWaveAScope;
  if (!SCOPES.includes(scope)) return null;
  return { operation, scope };
}

function scopeClass(scope: RoadworksWaveAScope): string {
  return ({
    standard: "unrestricted_standard_area",
    small_area: "small_area_manual_constraints",
    large_area: "large_area_mechanized",
    wet_zone: "wet_exposure_area",
    technical_room: "restricted_indoor_technical_area",
  } satisfies Record<RoadworksWaveAScope, string>)[scope];
}

const catalogWaveA = workCatalog.items
  .map((item) => ({ item, identity: parseIdentity(item) }))
  .filter((entry): entry is { item: CatalogItem; identity: NonNullable<typeof entry.identity> } => Boolean(entry.identity));

export const RoadworksWaveAInventory: readonly RoadworksWaveAInventoryItem[] = catalogWaveA.map(({ item, identity }) => {
  const meta = OPERATION_META[identity.operation];
  const canonicalModelWorkId = `${PREFIX}${identity.operation}_standard`;
  const canonicalModelId = `roadworks-wave-a:${identity.operation}:v1`;
  const isCanonical = identity.scope === "standard";
  const catalogClassification: RoadworksWaveACatalogClassification = isCanonical
    ? "CANONICAL_WORK_MODEL"
    : "DISTINCT_WORK_SUBTYPE";
  return {
    workId: item.work_key,
    catalogItemId: item.work_catalog_item_id,
    templateId: item.template_id,
    professionalNameRu: item.professional_name_ru,
    catalogName: item.professional_name_ru,
    technologyFamily: meta.family,
    scopeProfile: identity.scope,
    scopeClass: scopeClass(identity.scope),
    primaryQuantity: "area_m2" as const,
    primaryUnit: "m2" as const,
    parameterSchemaId: `${item.work_key}:parameters:v4.3`,
    manifestId: `${meta.manifest}:${identity.scope}`,
    assemblyIds: meta.assemblies,
    sourcePackId: "kg_roadworks_asphalt_wave_a_sources_v1",
    legacyMappingStatus: "mapped_exactly" as const,
    migrationStatus: "migrated_wave_a" as const,
    semanticModelId: canonicalModelId,
    semanticOwnership: isCanonical
      ? "canonical_model" as const
      : "work_specific_profile" as const,
    canonicalModelId,
    canonicalWorkId: canonicalModelWorkId,
    scopePresetId: isCanonical ? null : `roadworks-wave-a:${identity.operation}:${identity.scope}:v4.3`,
    catalogClassification,
    classificationReason: isCanonical
      ? "Стандартная запись владеет базовой технологической операцией и собственным work-specific профилем."
      : `Контекст ${identity.scope} меняет способ выполнения, применимость, BOQ и контроль; это отдельный work-specific профиль, а не переименование базового шаблона.`,
    domainReviewStatus: "not_required_for_catalog_mapping" as const,
  };
}).sort((a, b) => a.workId.localeCompare(b.workId));

export function getRoadworksWaveAOperation(workId: string): RoadworksWaveAOperation | null {
  const item = workCatalog.items.find((candidate) => candidate.work_key === workId);
  return item ? parseIdentity(item)?.operation ?? null : null;
}

export function getRoadworksWaveAParameterKeys(workId: string): readonly RoadworksWaveAParameterKey[] {
  const operation = getRoadworksWaveAOperation(workId);
  const item = RoadworksWaveAInventory.find((candidate) => candidate.workId === workId);
  return operation && item
    ? [
      ...OPERATION_META[operation].parameters as readonly RoadworksWaveANumericInputKey[],
      ...ROADWORKS_WAVE_A_SCOPE_APPLICABILITY_PARAMETER_KEYS[item.scopeProfile],
    ]
    : [];
}

export type RoadworksWaveAParameterDefinition = {
  parameterId: string;
  key: RoadworksWaveAParameterKey;
  tier: "P0" | "P1" | "P2";
  unit: "m2" | "mm" | "t_m3" | "ratio" | "km" | "m2_h" | "l_m2" | "t" | "enum" | "boolean";
  sourceRole: "USER_PROJECT_INPUT";
};

const PARAMETER_UNITS: Record<RoadworksWaveAParameterKey, RoadworksWaveAParameterDefinition["unit"]> = {
  area_m2: "m2",
  thickness_mm: "mm",
  density_t_m3: "t_m3",
  waste_factor: "ratio",
  haul_distance_km: "km",
  productivity_m2_h: "m2_h",
  tack_coat_l_m2: "l_m2",
  truck_capacity_t: "t",
  waste_truck_capacity_t: "t",
  acceptance_lot_m2: "m2",
  joint_sealant_l_m2: "l_m2",
  exterior_surface_kind: "enum",
  drainage_outfall_confirmed: "boolean",
  base_dry_and_accepted: "boolean",
  floor_mechanical_impact_class: "enum",
  floor_liquid_exposure_class: "enum",
  approved_floor_mix_type: "enum",
};

export const ROADWORKS_WAVE_A_PARAMETER_PRESENTATION: Readonly<
  Record<RoadworksWaveAParameterKey, RoadworksWaveAParameterPresentation>
> = Object.freeze({
  area_m2: { labelRu: "\u041f\u043b\u043e\u0449\u0430\u0434\u044c \u0440\u0430\u0431\u043e\u0442", unit: "m2", inputKind: "number", choices: [] },
  thickness_mm: { labelRu: "\u0422\u043e\u043b\u0449\u0438\u043d\u0430 \u0441\u043b\u043e\u044f", unit: "mm", inputKind: "number", choices: [] },
  density_t_m3: { labelRu: "\u041f\u043b\u043e\u0442\u043d\u043e\u0441\u0442\u044c \u0430\u0441\u0444\u0430\u043b\u044c\u0442\u043e\u0431\u0435\u0442\u043e\u043d\u043d\u043e\u0439 \u0441\u043c\u0435\u0441\u0438", unit: "t_m3", inputKind: "number", choices: [] },
  waste_factor: { labelRu: "\u041a\u043e\u044d\u0444\u0444\u0438\u0446\u0438\u0435\u043d\u0442 \u0442\u0435\u0445\u043d\u043e\u043b\u043e\u0433\u0438\u0447\u0435\u0441\u043a\u0438\u0445 \u043f\u043e\u0442\u0435\u0440\u044c", unit: "ratio", inputKind: "number", choices: [] },
  haul_distance_km: { labelRu: "\u0414\u0430\u043b\u044c\u043d\u043e\u0441\u0442\u044c \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0438", unit: "km", inputKind: "number", choices: [] },
  productivity_m2_h: { labelRu: "\u041f\u0440\u043e\u0438\u0437\u0432\u043e\u0434\u0438\u0442\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u044c \u0437\u0432\u0435\u043d\u0430", unit: "m2_h", inputKind: "number", choices: [] },
  tack_coat_l_m2: { labelRu: "\u0420\u0430\u0441\u0445\u043e\u0434 \u0431\u0438\u0442\u0443\u043c\u043d\u043e\u0439 \u044d\u043c\u0443\u043b\u044c\u0441\u0438\u0438", unit: "l_m2", inputKind: "number", choices: [] },
  truck_capacity_t: { labelRu: "\u0413\u0440\u0443\u0437\u043e\u043f\u043e\u0434\u044a\u0451\u043c\u043d\u043e\u0441\u0442\u044c \u0441\u0430\u043c\u043e\u0441\u0432\u0430\u043b\u0430", unit: "t", inputKind: "number", choices: [] },
  waste_truck_capacity_t: { labelRu: "\u0413\u0440\u0443\u0437\u043e\u043f\u043e\u0434\u044a\u0451\u043c\u043d\u043e\u0441\u0442\u044c \u0442\u0440\u0430\u043d\u0441\u043f\u043e\u0440\u0442\u0430 \u0434\u043b\u044f \u0432\u044b\u0432\u043e\u0437\u0430", unit: "t", inputKind: "number", choices: [] },
  acceptance_lot_m2: { labelRu: "\u041f\u043b\u043e\u0449\u0430\u0434\u044c \u043f\u0440\u0438\u0451\u043c\u043e\u0447\u043d\u043e\u0439 \u043f\u0430\u0440\u0442\u0438\u0438", unit: "m2", inputKind: "number", choices: [] },
  joint_sealant_l_m2: { labelRu: "\u0420\u0430\u0441\u0445\u043e\u0434 \u0433\u0435\u0440\u043c\u0435\u0442\u0438\u043a\u0430 \u0434\u043b\u044f \u0448\u0432\u043e\u0432", unit: "l_m2", inputKind: "number", choices: [] },
  exterior_surface_kind: {
    labelRu: "\u0412\u0438\u0434 \u043d\u0430\u0440\u0443\u0436\u043d\u043e\u0439 \u043f\u043b\u043e\u0449\u0430\u0434\u043a\u0438", unit: "enum", inputKind: "select",
    choices: [
      { value: "PARKING", labelRu: "\u041f\u0430\u0440\u043a\u043e\u0432\u043a\u0430" },
      { value: "DRIVE", labelRu: "\u041f\u0440\u043e\u0435\u0437\u0434" },
      { value: "INDUSTRIAL_SITE", labelRu: "\u041f\u0440\u043e\u043c\u044b\u0448\u043b\u0435\u043d\u043d\u0430\u044f \u043f\u043b\u043e\u0449\u0430\u0434\u043a\u0430" },
      { value: "EXTERNAL_AREA", labelRu: "\u041d\u0430\u0440\u0443\u0436\u043d\u0430\u044f \u043f\u043b\u043e\u0449\u0430\u0434\u043a\u0430" },
    ],
  },
  drainage_outfall_confirmed: {
    labelRu: "\u0412\u043e\u0434\u043e\u043e\u0442\u0432\u043e\u0434 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d", unit: "boolean", inputKind: "boolean",
    choices: [{ value: "true", labelRu: "\u0414\u0430" }, { value: "false", labelRu: "\u041d\u0435\u0442" }],
  },
  base_dry_and_accepted: {
    labelRu: "\u041e\u0441\u043d\u043e\u0432\u0430\u043d\u0438\u0435 \u0441\u0443\u0445\u043e\u0435 \u0438 \u043f\u0440\u0438\u043d\u044f\u0442\u043e", unit: "boolean", inputKind: "boolean",
    choices: [{ value: "true", labelRu: "\u0414\u0430" }, { value: "false", labelRu: "\u041d\u0435\u0442" }],
  },
  floor_mechanical_impact_class: {
    labelRu: "\u041a\u043b\u0430\u0441\u0441 \u043c\u0435\u0445\u0430\u043d\u0438\u0447\u0435\u0441\u043a\u043e\u0439 \u043d\u0430\u0433\u0440\u0443\u0437\u043a\u0438", unit: "enum", inputKind: "select",
    choices: [{ value: "LOW", labelRu: "\u041d\u0438\u0437\u043a\u0430\u044f" }, { value: "MODERATE", labelRu: "\u0423\u043c\u0435\u0440\u0435\u043d\u043d\u0430\u044f" }, { value: "SIGNIFICANT", labelRu: "\u0417\u043d\u0430\u0447\u0438\u0442\u0435\u043b\u044c\u043d\u0430\u044f" }],
  },
  floor_liquid_exposure_class: {
    labelRu: "\u041a\u043b\u0430\u0441\u0441 \u0432\u043e\u0437\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f \u0436\u0438\u0434\u043a\u043e\u0441\u0442\u0435\u0439", unit: "enum", inputKind: "select",
    choices: [{ value: "NONE", labelRu: "\u041d\u0435\u0442" }, { value: "LOW_PERIODIC", labelRu: "\u0421\u043b\u0430\u0431\u043e\u0435 \u043f\u0435\u0440\u0438\u043e\u0434\u0438\u0447\u0435\u0441\u043a\u043e\u0435" }],
  },
  approved_floor_mix_type: {
    labelRu: "\u0421\u043e\u0433\u043b\u0430\u0441\u043e\u0432\u0430\u043d\u043d\u044b\u0439 \u0442\u0438\u043f \u0441\u043c\u0435\u0441\u0438 \u0434\u043b\u044f \u043f\u043e\u043b\u0430", unit: "enum", inputKind: "select",
    choices: [{ value: "CAST_ASPHALT", labelRu: "\u041b\u0438\u0442\u043e\u0439 \u0430\u0441\u0444\u0430\u043b\u044c\u0442" }, { value: "RIGID_ASPHALT_CONCRETE", labelRu: "\u0416\u0451\u0441\u0442\u043a\u0438\u0439 \u0430\u0441\u0444\u0430\u043b\u044c\u0442\u043e\u0431\u0435\u0442\u043e\u043d" }],
  },
});

export function getRoadworksWaveAParameterDefinitions(workId: string): readonly RoadworksWaveAParameterDefinition[] {
  return getRoadworksWaveAParameterKeys(workId).map((key) => {
    const tier = key === "area_m2" || ROADWORKS_WAVE_A_SCOPE_APPLICABILITY_PARAMETER_KEYS
      .wet_zone.includes(key as RoadworksWaveAApplicabilityInputKey) || ROADWORKS_WAVE_A_SCOPE_APPLICABILITY_PARAMETER_KEYS
      .technical_room.includes(key as RoadworksWaveAApplicabilityInputKey)
      ? "P0" as const
      : ["thickness_mm", "density_t_m3", "haul_distance_km", "productivity_m2_h"].includes(key)
        ? "P1" as const
        : "P2" as const;
    return Object.freeze({
      parameterId: `${workId}:parameter:${key}:v4`,
      key,
      tier,
      unit: PARAMETER_UNITS[key],
      sourceRole: "USER_PROJECT_INPUT" as const,
    });
  });
}

const round = (value: number): number => Math.round(value * 1000) / 1000;

export function compileRoadworksWaveAWork(
  workId: string,
  input: RoadworksWaveAInputs,
  options: { scopeProfile?: RoadworksWaveAScope } = {},
): { workId: string; rows: RoadworksWaveARow[] } {
  const operation = getRoadworksWaveAOperation(workId);
  if (!operation) throw new Error(`Unknown Roadworks Wave A work ID: ${workId}`);
  const inventoryItem = RoadworksWaveAInventory.find((item) => item.workId === workId);
  const scopeProfile = options.scopeProfile ?? inventoryItem?.scopeProfile ?? "standard";
  for (const key of ROADWORKS_WAVE_A_NUMERIC_INPUT_KEYS) {
    const value = input[key];
    if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid ${key}: ${value}`);
  }
  if (scopeProfile === "wet_zone" && (
    !["PARKING", "DRIVE", "INDUSTRIAL_SITE", "EXTERNAL_AREA"].includes(input.exterior_surface_kind) ||
    input.drainage_outfall_confirmed !== true ||
    input.base_dry_and_accepted !== true
  )) {
    throw new Error("ASPHALT_EXTERNAL_AREA_APPLICABILITY_INPUTS_REQUIRED");
  }
  if (scopeProfile === "technical_room" && (
    !["LOW", "MODERATE", "SIGNIFICANT"].includes(input.floor_mechanical_impact_class) ||
    !["NONE", "LOW_PERIODIC"].includes(input.floor_liquid_exposure_class) ||
    !["CAST_ASPHALT", "RIGID_ASPHALT_CONCRETE"].includes(input.approved_floor_mix_type)
  )) {
    throw new Error("ASPHALT_INDUSTRIAL_FLOOR_APPLICABILITY_INPUTS_REQUIRED");
  }
  const area = input.area_m2;
  const tonnes = round(area * input.thickness_mm / 1000 * input.density_t_m3 * input.waste_factor);
  const hours = round(area / input.productivity_m2_h);
  const prefix = `${workId}:`;
  const operationSourceIds = ({
    install: ["kg_krer_27_roadworks_2015", "kg_nism_gost_9128_2013"],
    lay: ["kg_krer_27_roadworks_2015", "kg_nism_gost_9128_2013"],
    compact: ["kg_krer_27_roadworks_2015"],
    repair: ["kg_krer_27_roadworks_2015", "kg_mtd_order_171_2003_patch_repair", "kg_nism_gost_9128_2013"],
    prepare: ["kg_krer_27_roadworks_2015", "kg_snip_32_01_2004_road_design"],
    level: ["kg_krer_27_roadworks_2015", "kg_nism_gost_9128_2013"],
    drain: ["kg_krer_27_roadworks_2015", "kg_snip_32_01_2004_road_design"],
    finish: ["kg_krer_27_roadworks_2015", "kg_snip_32_01_2004_road_design"],
  } satisfies Record<RoadworksWaveAOperation, readonly string[]>)[operation];
  const normativeSourceIds = scopeProfile === "technical_room"
    ? ["kg_sp_31_101_2024_floors", "kg_krer_11_floors_2015", "kg_nism_gost_9128_2013"]
    : [...new Set([
      ...operationSourceIds,
      ...ROADWORKS_WAVE_A_SCOPE_EXECUTION_PROFILES[scopeProfile].applicabilitySourceIds,
    ])];
  const sourceIds = [...normativeSourceIds, "project_quantity_inputs_v3"];
  const normativeSourceId = scopeProfile === "technical_room"
    ? "kg_krer_11_floors_2015"
    : "kg_krer_27_roadworks_2015";
  const normativeRateIds = scopeProfile === "technical_room"
    ? input.approved_floor_mix_type === "CAST_ASPHALT"
      ? ["11-01-019-01", "11-01-019-02"]
      : ["11-01-019-03", "11-01-019-04"]
    : ROADWORKS_WAVE_A_KRER_27_RATE_IDS_BY_OPERATION[operation];
  const passportId = `professional-estimate-passport:v4:${workId}`;
  const rowType = (category: RoadworksWaveARow["category"]): RoadworksWaveARow["rowType"] =>
    category === "test" ? "control" : category;
  const row = (
    id: string, category: RoadworksWaveARow["category"], nameRu: string,
    unit: RoadworksWaveARow["unit"], quantity: number, formulaId: string,
    affectedBy: readonly RoadworksWaveAParameterKey[], owner: RoadworksWaveARow["procurementOwner"],
  ): RoadworksWaveARow => {
    const sourceParameterKeys = [...new Set<RoadworksWaveAParameterKey>([
      ...affectedBy,
      ...(scopeProfile === "technical_room" ? ["approved_floor_mix_type" as const] : []),
    ])];
    return ({
    rowId: prefix + id,
    category,
    rowType: rowType(category),
    semanticOwner: passportId,
    workKey: workId,
    passportId,
    nameRu,
    unit,
    uom: unit,
    quantity: round(quantity),
    formulaId,
    affectedBy: sourceParameterKeys,
    sourceParameterKeys,
    sourceIds,
    normativeSourceId,
    normativeRateIds,
    roundingRule: formulaId === "one_documentation_set"
      ? "EXACT_ONE"
      : formulaId.startsWith("ceil(")
        ? "CEIL_POSITIVE"
        : "ROUND_HALF_UP_3",
    wasteRule: sourceParameterKeys.includes("waste_factor") ? "INPUT_WASTE_FACTOR_APPLIED" : "NOT_APPLICABLE",
    priceSourceId: null,
    priceDate: null,
    revisionId: "REFERENCE_UNSAVED",
    procurementEligibility: category === "test" || category === "document"
      ? "EXCLUDED_CONTROL_DOCUMENT"
      : owner === "buyer"
        ? "ELIGIBLE"
        : "CONTRACTOR_SCOPE",
    payable: category !== "test" && category !== "document",
    procurementOwner: owner,
    });
  };
  const commonControl = row("acceptance", "test", "Контроль результата работ", "pcs", Math.max(1, Math.ceil(area / input.acceptance_lot_m2)), "ceil(area_m2/acceptance_lot_m2)", ["area_m2", "acceptance_lot_m2"], "laboratory");
  const mixes = [
    row("mix", "material", operation === "repair"
      ? "Ремонтная асфальтобетонная смесь"
      : scopeProfile === "technical_room"
        ? input.approved_floor_mix_type === "CAST_ASPHALT"
          ? "Литая асфальтобетонная смесь для промышленного пола"
          : "Жёсткая асфальтобетонная смесь для промышленного пола"
        : "Асфальтобетонная смесь заданного проектом типа", "t", tonnes, "area_m2*thickness_mm/1000*density_t_m3*waste_factor", ["area_m2", "thickness_mm", "density_t_m3", "waste_factor", ...(scopeProfile === "technical_room" ? ["approved_floor_mix_type" as const] : [])], "buyer"),
    row("mix_delivery", "logistics", "Доставка асфальтобетонной смеси", "trip", Math.max(1, Math.ceil(tonnes / input.truck_capacity_t)), "ceil(mix_t/truck_capacity_t)", ["area_m2", "thickness_mm", "density_t_m3", "waste_factor", "truck_capacity_t"], "contractor"),
    row("mix_transport", "logistics", "Транспортная работа по доставке смеси", "t_km", tonnes * input.haul_distance_km, "mix_t*haul_distance_km", ["area_m2", "thickness_mm", "density_t_m3", "waste_factor", "haul_distance_km"], "contractor"),
  ];
  const work = (id: string, name: string) => row(id, "work", name, "m2", area, "area_m2", ["area_m2"], "contractor");
  const machine = (id: string, name: string) => row(id, "equipment", name, "machine_hour", hours, "area_m2/productivity_m2_h", ["area_m2", "productivity_m2_h"], "contractor");
  const labor = row("crew_labor", "labor", "Труд дорожной бригады", "man_hour", hours, "area_m2/productivity_m2_h", ["area_m2", "productivity_m2_h"], "contractor");
  const documentation = row("execution_documentation", "document", "Исполнительная документация и журнал работ", "pcs", 1, "one_documentation_set", [], "contractor");

  const byOperation: Record<RoadworksWaveAOperation, RoadworksWaveARow[]> = {
    install: [
      row("tack_coat", "material", "Битумная эмульсия для подгрунтовки", "l", area * input.tack_coat_l_m2, "area_m2*tack_coat_l_m2", ["area_m2", "tack_coat_l_m2"], "buyer"),
      ...mixes, work("paving", "Устройство однослойного асфальтобетонного покрытия"),
      machine("paver", "Асфальтоукладчик"), machine("roller", "Каток дорожный"), commonControl,
    ],
    lay: [...mixes, work("placement", "Укладка асфальтобетонной смеси"), machine("paver", "Асфальтоукладчик"), commonControl],
    compact: [work("compaction", "Уплотнение асфальтобетонного слоя"), machine("roller", "Каток дорожный"), commonControl],
    repair: [
      work("boundary_cutting", "Оконтуривание и вскрытие границ ремонтной карты"),
      work("removal", "Удаление разрушенного материала"),
      row("tack_coat", "material", "Битумная эмульсия для подгрунтовки ремонтной карты", "l", area * input.tack_coat_l_m2, "area_m2*tack_coat_l_m2", ["area_m2", "tack_coat_l_m2"], "buyer"),
      ...mixes, work("repair_placement", "Устройство ремонтного слоя"),
      machine("repair_equipment", "Комплект техники для ремонта покрытия"),
      row("waste_haul", "logistics", "Вывоз снятого асфальтобетона", "trip", Math.max(1, Math.ceil(tonnes / input.waste_truck_capacity_t)), "ceil(removed_t/waste_truck_capacity_t)", ["area_m2", "thickness_mm", "density_t_m3", "waste_factor", "waste_truck_capacity_t"], "contractor"),
      row("waste_transport", "logistics", "Транспортная работа по вывозу снятого материала", "t_km", tonnes * input.haul_distance_km, "removed_t*haul_distance_km", ["area_m2", "thickness_mm", "density_t_m3", "waste_factor", "haul_distance_km"], "contractor"),
      commonControl,
    ],
    prepare: [work("cleaning", "Механизированная очистка и подготовка поверхности"), machine("cleaner", "Подметально-уборочная машина"), commonControl],
    level: [
      row("tack_coat", "material", "Битумная эмульсия под выравнивающий слой", "l", area * input.tack_coat_l_m2, "area_m2*tack_coat_l_m2", ["area_m2", "tack_coat_l_m2"], "buyer"),
      ...mixes, work("leveling", "Устройство выравнивающего слоя"), machine("leveling_equipment", "Комплект укладки и уплотнения"), commonControl,
    ],
    drain: [work("profile", "Формирование проектного водоотводного профиля покрытия"), machine("profiling", "Комплект профилирования поверхности"), commonControl],
    finish: [
      row("joint_sealant", "material", "Материал для герметизации технологических стыков", "l", area * input.joint_sealant_l_m2, "area_m2*joint_sealant_l_m2", ["area_m2", "joint_sealant_l_m2"], "buyer"),
      work("finishing", "Финишная обработка стыков и очистка покрытия"),
      machine("finishing_equipment", "Комплект финишной обработки стыков"),
      commonControl,
    ],
  };
  const scopeRows: RoadworksWaveARow[] = scopeProfile === "small_area"
    ? [row("restricted_area_execution", "service", "Организация работ на малой площади", "m2", area, "area_m2", ["area_m2"], "contractor")]
    : scopeProfile === "large_area"
      ? [row("large_area_mechanized_execution", "service", "Организация механизированного потока на большой площади", "m2", area, "area_m2", ["area_m2"], "contractor")]
      : scopeProfile === "wet_zone"
        ? [
          row("wet_zone_execution", "service", `Организация работ на наружной поверхности ${input.exterior_surface_kind} после подтверждения сухости основания и водоотвода`, "m2", area, "area_m2", ["area_m2", "exterior_surface_kind", "drainage_outfall_confirmed", "base_dry_and_accepted"], "contractor"),
          row("wet_zone_acceptance", "test", "Контроль уклонов, водоотвода и пригодности основания", "pcs", Math.max(1, Math.ceil(area / input.acceptance_lot_m2)), "ceil(area_m2/acceptance_lot_m2)", ["area_m2", "acceptance_lot_m2", "drainage_outfall_confirmed", "base_dry_and_accepted"], "laboratory"),
        ]
        : scopeProfile === "technical_room"
          ? [
            row("industrial_floor_execution", "service", `Стеснённое устройство асфальтобетонного пола: воздействие ${input.floor_mechanical_impact_class}, жидкость ${input.floor_liquid_exposure_class}`, "m2", area, "area_m2", ["area_m2", "floor_mechanical_impact_class", "floor_liquid_exposure_class", "approved_floor_mix_type"], "contractor"),
            row("industrial_floor_acceptance", "test", "Контроль толщины, ровности и проектной категории воздействий на пол", "pcs", Math.max(1, Math.ceil(area / input.acceptance_lot_m2)), "ceil(area_m2/acceptance_lot_m2)", ["area_m2", "acceptance_lot_m2", "floor_mechanical_impact_class", "floor_liquid_exposure_class", "approved_floor_mix_type"], "laboratory"),
          ]
          : [];
  return { workId, rows: [...byOperation[operation], labor, documentation, ...scopeRows] };
}

export type RoadworksWaveAPriceBook = {
  priceSourceId: string;
  priceDate: string;
  currency: "KGS";
  unitPriceByRowId: Readonly<Record<string, number>>;
};

export type RoadworksWaveAPricedRow = RoadworksWaveARow & {
  unitPrice: number | null;
  lineTotal: number;
  priceSourceId: string | null;
  priceDate: string | null;
};

/**
 * Applies an explicit, revisionable price source to a compiled quantity graph.
 * It never invents a market price: every payable row must have its own quote.
 */
export function priceRoadworksWaveACompilation(
  compilation: ReturnType<typeof compileRoadworksWaveAWork>,
  priceBook: RoadworksWaveAPriceBook,
): { workId: string; rows: readonly RoadworksWaveAPricedRow[]; monetaryTotal: number; currency: "KGS" } {
  if (!priceBook.priceSourceId || !/^\d{4}-\d{2}-\d{2}$/.test(priceBook.priceDate)) {
    throw new Error("ASPHALT_PRICE_SOURCE_AND_DATE_REQUIRED");
  }
  const rows = compilation.rows.map((row): RoadworksWaveAPricedRow => {
    if (!row.payable) {
      return Object.freeze({ ...row, unitPrice: null, lineTotal: 0, priceSourceId: null, priceDate: null });
    }
    const unitPrice = priceBook.unitPriceByRowId[row.rowId];
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      throw new Error(`ASPHALT_PRICE_REQUIRED:${row.rowId}`);
    }
    return Object.freeze({
      ...row,
      unitPrice,
      lineTotal: round(row.quantity * unitPrice),
      priceSourceId: priceBook.priceSourceId,
      priceDate: priceBook.priceDate,
    });
  });
  return Object.freeze({
    workId: compilation.workId,
    rows: Object.freeze(rows),
    monetaryTotal: round(rows.reduce((sum, row) => sum + row.lineTotal, 0)),
    currency: priceBook.currency,
  });
}

export function roadworksWaveANaturalLanguageCases(item: RoadworksWaveAInventoryItem): readonly string[] {
  return [
    `${item.professionalNameRu} 120 м2`,
    `Нужно выполнить ${item.professionalNameRu}, площадь 850 м2, толщина 50 мм`,
    `Посчитайте, пожалуйста, ${item.professionalNameRu} примерно на 45 квадратов`,
  ];
}

export function resolveRoadworksWaveAWork(prompt: string): string | null {
  const normalized = prompt.toLocaleLowerCase("ru-RU");
  const matches = RoadworksWaveAInventory.filter((item) =>
    normalized.includes(item.professionalNameRu.toLocaleLowerCase("ru-RU")),
  );
  return matches.length === 1 ? matches[0].workId : null;
}

function stableHash(value: unknown): string {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function auditRoadworksWaveA() {
  const ids = RoadworksWaveAInventory.map((item) => item.workId);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  const ledgers = {
    inventory: RoadworksWaveAInventory,
    passport: RoadworksWaveAInventory.map((item) => ({ workId: item.workId, overlayId: `${item.workId}:overlay:v4`, manifestId: item.manifestId })),
    material: RoadworksWaveAInventory.map((item) => ({ workId: item.workId, materialRows: compileRoadworksWaveAWork(item.workId, DEFAULT_ROADWORKS_WAVE_A_INPUTS).rows.filter((row) => row.category === "material").map((row) => row.rowId) })),
    parameter: RoadworksWaveAInventory.map((item) => ({ workId: item.workId, parameters: getRoadworksWaveAParameterKeys(item.workId) })),
    formula: RoadworksWaveAInventory.map((item) => ({ workId: item.workId, formulas: compileRoadworksWaveAWork(item.workId, DEFAULT_ROADWORKS_WAVE_A_INPUTS).rows.map((row) => row.formulaId) })),
    source: RoadworksWaveAInventory.map((item) => ({ workId: item.workId, sourcePackId: item.sourcePackId })),
    legacy: RoadworksWaveAInventory.map((item) => ({ templateId: item.templateId, workId: item.workId, status: item.legacyMappingStatus })),
    clone: RoadworksWaveAInventory.map((item) => ({ workId: item.workId, semanticSignature: stableHash([item.technologyFamily, item.scopeClass, item.assemblyIds, getRoadworksWaveAParameterKeys(item.workId)]) })),
  };
  const blockers = {
    duplicate_id: duplicateIds.length,
    missing_classification: RoadworksWaveAInventory.filter((item) => !item.technologyFamily || !item.scopeClass).length,
    generic_family: RoadworksWaveAInventory.filter((item) => item.technologyFamily === "roadworks" || item.technologyFamily === "asphalt").length,
    missing_overlay: ledgers.passport.filter((item) => !item.overlayId).length,
    missing_manifest: RoadworksWaveAInventory.filter((item) => !item.manifestId).length,
    missing_formula: ledgers.formula.filter((item) => item.formulas.length === 0).length,
    missing_source: ledgers.source.filter((item) => !item.sourcePackId).length,
    legacy_mapping_missing: ledgers.legacy.filter((item) => item.status !== "mapped_exactly").length,
  };
  return {
    sourceSha: ROADWORKS_WAVE_A_SOURCE_SHA,
    total: RoadworksWaveAInventory.length,
    uniqueIds: new Set(ids).size,
    blockers,
    ledgers,
    hash: stableHash(ledgers),
  };
}

export const DEFAULT_ROADWORKS_WAVE_A_INPUTS: RoadworksWaveAInputs = {
  area_m2: 100,
  thickness_mm: 50,
  density_t_m3: 2.4,
  waste_factor: 1.03,
  haul_distance_km: 20,
  productivity_m2_h: 100,
  tack_coat_l_m2: 0.3,
  truck_capacity_t: 20,
  waste_truck_capacity_t: 15,
  acceptance_lot_m2: 1000,
  joint_sealant_l_m2: 0.01,
  exterior_surface_kind: "PARKING",
  drainage_outfall_confirmed: true,
  base_dry_and_accepted: true,
  floor_mechanical_impact_class: "MODERATE",
  floor_liquid_exposure_class: "NONE",
  approved_floor_mix_type: "CAST_ASPHALT",
};
