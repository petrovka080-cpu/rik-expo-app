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
};

export type RoadworksWaveARow = {
  rowId: string;
  category: "material" | "work" | "labor" | "equipment" | "service" | "logistics" | "test" | "document";
  nameRu: string;
  unit: "m2" | "t" | "t_km" | "l" | "h" | "trip" | "item";
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
    parameters: ["area_m2", "thickness_mm", "density_t_m3", "waste_factor", "haul_distance_km", "productivity_m2_h"],
  },
  lay: {
    family: "asphalt_mix_placement",
    manifest: "ASPHALT_MIX_PLACEMENT",
    assemblies: ["asphalt_mix", "paving", "mix_delivery", "placement_control"],
    parameters: ["area_m2", "thickness_mm", "density_t_m3", "waste_factor", "haul_distance_km", "productivity_m2_h"],
  },
  compact: {
    family: "asphalt_compaction",
    manifest: "ASPHALT_LAYER_COMPACTION",
    assemblies: ["roller_compaction", "density_control"],
    parameters: ["area_m2", "productivity_m2_h"],
  },
  repair: {
    family: "asphalt_surface_repair",
    manifest: "ASPHALT_SURFACE_REPAIR",
    assemblies: ["repair_boundary_cutting", "damaged_material_removal", "tack_coat", "repair_mix", "repair_compaction", "waste_haul", "repair_acceptance"],
    parameters: ["area_m2", "thickness_mm", "density_t_m3", "waste_factor", "haul_distance_km", "productivity_m2_h"],
  },
  prepare: {
    family: "asphalt_surface_preparation",
    manifest: "ASPHALT_SURFACE_PREPARATION",
    assemblies: ["mechanical_cleaning", "local_defect_preparation", "surface_acceptance"],
    parameters: ["area_m2", "productivity_m2_h"],
  },
  level: {
    family: "asphalt_leveling",
    manifest: "ASPHALT_LEVELING_COURSE",
    assemblies: ["tack_coat", "leveling_mix", "leveling_placement", "leveling_compaction", "level_control"],
    parameters: ["area_m2", "thickness_mm", "density_t_m3", "waste_factor", "haul_distance_km", "productivity_m2_h"],
  },
  drain: {
    family: "asphalt_surface_drainage",
    manifest: "ASPHALT_SURFACE_DRAINAGE",
    assemblies: ["drainage_profile_setting", "surface_channel_forming", "drainage_acceptance"],
    parameters: ["area_m2", "productivity_m2_h"],
  },
  finish: {
    family: "asphalt_surface_finishing",
    manifest: "ASPHALT_SURFACE_FINISHING",
    assemblies: ["joint_finishing", "surface_cleanup", "finish_acceptance"],
    parameters: ["area_m2", "productivity_m2_h"],
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

const round = (value: number): number => Math.round(value * 1000) / 1000;

export function compileRoadworksWaveAWork(
  workId: string,
  input: RoadworksWaveAInputs,
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
  const sourceIds = ["kg_sn_road_construction", "kg_mtd_road_quality_control"] as const;
  const row = (
    id: string, category: RoadworksWaveARow["category"], nameRu: string,
    unit: RoadworksWaveARow["unit"], quantity: number, formulaId: string,
    affectedBy: readonly string[], owner: RoadworksWaveARow["procurementOwner"],
  ): RoadworksWaveARow => ({
    rowId: prefix + id, category, nameRu, unit, quantity: round(quantity), formulaId,
    affectedBy, sourceIds, procurementOwner: owner,
  });
  const commonControl = row("acceptance", "test", "Контроль результата работ", "item", Math.max(1, Math.ceil(area / 1000)), "ceil(area_m2/1000)", ["area_m2"], "laboratory");
  const mixes = [
    row("mix", "material", operation === "repair" ? "Ремонтная асфальтобетонная смесь" : "Асфальтобетонная смесь заданного проектом типа", "t", tonnes, "area_m2*thickness_mm/1000*density_t_m3*waste_factor", ["area_m2", "thickness_mm", "density_t_m3", "waste_factor"], "buyer"),
    row("mix_delivery", "logistics", "Доставка асфальтобетонной смеси", "trip", Math.max(1, Math.ceil(tonnes / 20)), "ceil(mix_t/20)", ["area_m2", "thickness_mm", "density_t_m3", "waste_factor", "haul_distance_km"], "contractor"),
    row("mix_transport", "logistics", "Транспортная работа по доставке смеси", "t_km", tonnes * input.haul_distance_km, "mix_t*haul_distance_km", ["area_m2", "thickness_mm", "density_t_m3", "waste_factor", "haul_distance_km"], "contractor"),
  ];
  const work = (id: string, name: string) => row(id, "work", name, "m2", area, "area_m2", ["area_m2"], "contractor");
  const machine = (id: string, name: string) => row(id, "equipment", name, "h", hours, "area_m2/productivity_m2_h", ["area_m2", "productivity_m2_h"], "contractor");

  const byOperation: Record<RoadworksWaveAOperation, RoadworksWaveARow[]> = {
    install: [
      row("tack_coat", "material", "Битумная эмульсия для подгрунтовки", "l", area * 0.3, "area_m2*0.3", ["area_m2"], "buyer"),
      ...mixes, work("paving", "Устройство однослойного асфальтобетонного покрытия"),
      machine("paver", "Асфальтоукладчик"), machine("roller", "Каток дорожный"), commonControl,
    ],
    lay: [...mixes, work("placement", "Укладка асфальтобетонной смеси"), machine("paver", "Асфальтоукладчик"), commonControl],
    compact: [work("compaction", "Уплотнение асфальтобетонного слоя"), machine("roller", "Каток дорожный"), commonControl],
    repair: [
      work("boundary_cutting", "Оконтуривание и вскрытие границ ремонтной карты"),
      work("removal", "Удаление разрушенного материала"),
      row("tack_coat", "material", "Битумная эмульсия для подгрунтовки ремонтной карты", "l", area * 0.4, "area_m2*0.4", ["area_m2"], "buyer"),
      ...mixes, work("repair_placement", "Устройство ремонтного слоя"),
      machine("repair_equipment", "Комплект техники для ремонта покрытия"),
      row("waste_haul", "logistics", "Вывоз снятого асфальтобетона", "trip", Math.max(1, Math.ceil(tonnes / 15)), "ceil(removed_t/15)", ["area_m2", "thickness_mm", "density_t_m3", "waste_factor", "haul_distance_km"], "contractor"),
      row("waste_transport", "logistics", "Транспортная работа по вывозу снятого материала", "t_km", tonnes * input.haul_distance_km, "removed_t*haul_distance_km", ["area_m2", "thickness_mm", "density_t_m3", "waste_factor", "haul_distance_km"], "contractor"),
      commonControl,
    ],
    prepare: [work("cleaning", "Механизированная очистка и подготовка поверхности"), machine("cleaner", "Подметально-уборочная машина"), commonControl],
    level: [
      row("tack_coat", "material", "Битумная эмульсия под выравнивающий слой", "l", area * 0.3, "area_m2*0.3", ["area_m2"], "buyer"),
      ...mixes, work("leveling", "Устройство выравнивающего слоя"), machine("leveling_equipment", "Комплект укладки и уплотнения"), commonControl,
    ],
    drain: [work("profile", "Формирование проектного водоотводного профиля покрытия"), machine("profiling", "Комплект профилирования поверхности"), commonControl],
    finish: [
      row("joint_sealant", "material", "Материал для герметизации технологических стыков", "l", area * 0.01, "area_m2*0.01", ["area_m2"], "buyer"),
      work("finishing", "Финишная обработка стыков и очистка покрытия"),
      machine("finishing_equipment", "Комплект финишной обработки стыков"),
      commonControl,
    ],
  };
  return { workId, rows: byOperation[operation] };
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
};
