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
  semanticOwnership: "canonical_model" | "scope_preset" | "domain_review_required";
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
  nameRu: string;
  unit: "m2" | "t" | "t_km" | "l" | "man_hour" | "machine_hour" | "trip" | "pcs";
  quantity: number;
  formulaId: string;
  affectedBy: readonly string[];
  sourceIds: readonly string[];
  procurementOwner: "buyer" | "contractor" | "laboratory" | "customer";
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
};

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
  const isScalePreset = identity.scope === "small_area" || identity.scope === "large_area";
  const catalogClassification: RoadworksWaveACatalogClassification = isCanonical
    ? "CANONICAL_WORK_MODEL"
    : isScalePreset
      ? "SCOPE_PRESET"
      : "DOMAIN_REVIEW_REQUIRED";
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
    parameterSchemaId: `${item.work_key}:parameters:v4`,
    manifestId: `${meta.manifest}:${identity.scope}`,
    assemblyIds: meta.assemblies,
    sourcePackId: "kg_roadworks_asphalt_wave_a_sources_v1",
    legacyMappingStatus: "mapped_exactly" as const,
    migrationStatus: "migrated_wave_a" as const,
    semanticModelId: canonicalModelId,
    semanticOwnership: isCanonical
      ? "canonical_model" as const
      : isScalePreset
        ? "scope_preset" as const
        : "domain_review_required" as const,
    canonicalModelId,
    canonicalWorkId: canonicalModelWorkId,
    scopePresetId: isScalePreset ? `roadworks-wave-a:${identity.scope}:v1` : null,
    catalogClassification,
    classificationReason: isCanonical
      ? "Стандартная запись владеет единственным formula graph технологической операции."
      : isScalePreset
        ? "Масштаб участка является preset входных ограничений, а не отдельной технологией."
        : "Применимость дорожной технологии к влажной зоне или техническому помещению требует подтверждения профильным инженером.",
    domainReviewStatus: catalogClassification === "DOMAIN_REVIEW_REQUIRED"
      ? "applicability_review_required" as const
      : "not_required_for_catalog_mapping" as const,
  };
}).sort((a, b) => a.workId.localeCompare(b.workId));

export function getRoadworksWaveAOperation(workId: string): RoadworksWaveAOperation | null {
  const item = workCatalog.items.find((candidate) => candidate.work_key === workId);
  return item ? parseIdentity(item)?.operation ?? null : null;
}

export function getRoadworksWaveAParameterKeys(workId: string): readonly string[] {
  const operation = getRoadworksWaveAOperation(workId);
  return operation ? OPERATION_META[operation].parameters : [];
}

export type RoadworksWaveAParameterDefinition = {
  parameterId: string;
  key: keyof RoadworksWaveAInputs;
  tier: "P0" | "P1" | "P2";
  unit: "m2" | "mm" | "t_m3" | "ratio" | "km" | "m2_h" | "l_m2" | "t";
  sourceRole: "USER_PROJECT_INPUT";
};

const PARAMETER_UNITS: Record<keyof RoadworksWaveAInputs, RoadworksWaveAParameterDefinition["unit"]> = {
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
};

export function getRoadworksWaveAParameterDefinitions(workId: string): readonly RoadworksWaveAParameterDefinition[] {
  return getRoadworksWaveAParameterKeys(workId).map((rawKey) => {
    const key = rawKey as keyof RoadworksWaveAInputs;
    const tier = key === "area_m2"
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
  for (const [key, value] of Object.entries(input)) {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid ${key}: ${value}`);
  }
  const area = input.area_m2;
  const tonnes = round(area * input.thickness_mm / 1000 * input.density_t_m3 * input.waste_factor);
  const hours = round(area / input.productivity_m2_h);
  const prefix = `${workId}:`;
  const normativeSourceIds = ({
    install: ["kg_nism_gost_9128_2013", "kg_mtd_krer_27_06_20_1"],
    lay: ["kg_nism_gost_9128_2013", "kg_mtd_krer_27_06_20_1"],
    compact: ["kg_mtd_krer_27_06_20_1"],
    repair: ["kg_mtd_order_171_2003_patch_repair", "kg_nism_gost_9128_2013"],
    prepare: ["kg_snip_32_01_2004_road_design"],
    level: ["kg_nism_gost_9128_2013"],
    drain: ["kg_snip_32_01_2004_road_design"],
    finish: ["kg_snip_32_01_2004_road_design"],
  } satisfies Record<RoadworksWaveAOperation, readonly string[]>)[operation];
  const sourceIds = [...normativeSourceIds, "project_quantity_inputs_v3"];
  const row = (
    id: string, category: RoadworksWaveARow["category"], nameRu: string,
    unit: RoadworksWaveARow["unit"], quantity: number, formulaId: string,
    affectedBy: readonly string[], owner: RoadworksWaveARow["procurementOwner"],
  ): RoadworksWaveARow => ({
    rowId: prefix + id, category, nameRu, unit, quantity: round(quantity), formulaId,
    affectedBy, sourceIds, procurementOwner: owner,
  });
  const commonControl = row("acceptance", "test", "Контроль результата работ", "pcs", Math.max(1, Math.ceil(area / input.acceptance_lot_m2)), "ceil(area_m2/acceptance_lot_m2)", ["area_m2", "acceptance_lot_m2"], "laboratory");
  const mixes = [
    row("mix", "material", operation === "repair" ? "Ремонтная асфальтобетонная смесь" : "Асфальтобетонная смесь заданного проектом типа", "t", tonnes, "area_m2*thickness_mm/1000*density_t_m3*waste_factor", ["area_m2", "thickness_mm", "density_t_m3", "waste_factor"], "buyer"),
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
  const scopeRows: RoadworksWaveARow[] = options.scopeProfile === "small_area"
    ? [row("restricted_area_execution", "service", "Организация работ на малой площади", "m2", area, "area_m2", ["area_m2"], "contractor")]
    : options.scopeProfile === "large_area"
      ? [row("large_area_mechanized_execution", "service", "Организация механизированного потока на большой площади", "m2", area, "area_m2", ["area_m2"], "contractor")]
      : [];
  return { workId, rows: [...byOperation[operation], labor, documentation, ...scopeRows] };
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
};
