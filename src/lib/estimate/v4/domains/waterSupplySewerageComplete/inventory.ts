import { estimateDeterministicHash } from "../../../estimateDeterministicHash";
import type { ProfessionalCatalogBindingV1 } from "../../domainFactory";
import {
  buildGlobalCatalogInventoryV1,
  type GlobalCatalogInventoryRowV1,
} from "../../domainFactory/globalCatalogInventoryV1";

export const WATER_SEWER_COMPLETE_DOMAIN_ID = "water_supply_sewerage" as const;
export const WATER_SEWER_COMPLETE_DOMAIN_VERSION = "1.0.0" as const;
export const WATER_SEWER_COMPLETE_RECORD_COUNT = 835 as const;
export const WATER_SEWER_COMPLETE_TECHNOLOGY_COUNT = 835 as const;
export const WATER_SEWER_COMPLETE_ALIAS_COUNT = 0 as const;
export const WATER_SEWER_REVIEWED_EXCLUSION_COUNT = 165 as const;

export const WATER_SEWER_EXPANDED_OWNED_FAMILIES = Object.freeze([
  "aeration_tanks",
  "booster_pumping_station",
  "borehole_water_supply",
  "chlorination_station",
  "distribution_pipeline",
  "filtration_station",
  "flushing_disinfection",
  "gravity_sewer_collector",
  "house_connection_water",
  "inspection_chambers",
  "inspection_wells",
  "manholes",
  "outfall_structure",
  "pressure_pipeline",
  "pressure_sewer_pipeline",
  "pressure_testing_disinfection",
  "pumping_station",
  "rainwater_inlets",
  "reservoir_clean_water",
  "septic_treatment_facility",
  "settlement_water_network",
  "sewage_treatment_tanks",
  "sewer_pumping_station",
  "site_sewer_connection",
  "site_water_connection",
  "sludge_dewatering",
  "stormwater_drainage",
  "valves_chambers",
  "village_sewer_network",
  "village_water_supply",
  "wastewater_treatment_plant",
  "water_intake",
  "water_meter_chambers",
  "water_reservoir",
  "water_tower",
  "water_treatment_plant",
  "well_construction",
] as const);

export type WaterSewerExpandedOwnedFamily =
  typeof WATER_SEWER_EXPANDED_OWNED_FAMILIES[number];

export const WATER_SEWER_REVIEWED_EXCLUSION_FAMILIES = Object.freeze([
  "dewatering_system",
  "drainage_channel",
  "drainage_prism",
  "environmental_monitoring_wells",
  "fire_fighting_pump_station",
  "fire_hydrants",
  "gutters_downpipes",
  "hydraulic_testing",
  "intake_structure",
  "irrigation_channel",
  "leachate_collection",
  "multi_utility_trench",
  "pipe_bedding_backfill",
  "pipeline_compensators",
  "pipeline_insulation",
  "pipeline_pressure_testing",
  "pipeline_welding",
  "preinsulated_pipe_installation",
  "pressure_pipeline_industrial",
  "process_piping_dn50_dn1200",
  "road_drainage",
  "service_chambers",
  "sprinkler_system",
  "technological_pipeline",
  "tunnel_drainage",
  "utility_crossings",
  "utility_trench",
  "water_control_gates",
  "water_intake_hpp",
  "district_heating_pipeline",
  "heat_network",
  "gas_pipeline_low_pressure",
  "gas_pipeline_medium_pressure",
] as const);

const EXPANDED_LABELS_RU: Readonly<Record<WaterSewerExpandedOwnedFamily, string>> = Object.freeze({
  aeration_tanks: "Аэротенки очистных сооружений",
  booster_pumping_station: "Повысительная насосная станция водоснабжения",
  borehole_water_supply: "Скважинное водоснабжение",
  chlorination_station: "Станция обеззараживания воды",
  distribution_pipeline: "Распределительный водопровод",
  filtration_station: "Фильтровальная станция водоподготовки",
  flushing_disinfection: "Промывка и дезинфекция водопровода",
  gravity_sewer_collector: "Самотечный канализационный коллектор",
  house_connection_water: "Водопроводный ввод в здание",
  inspection_chambers: "Смотровые камеры канализации",
  inspection_wells: "Смотровые колодцы канализации",
  manholes: "Канализационные колодцы",
  outfall_structure: "Выпуск сточных или ливневых вод",
  pressure_pipeline: "Наружный напорный водопровод",
  pressure_sewer_pipeline: "Напорный канализационный трубопровод",
  pressure_testing_disinfection: "Испытание и дезинфекция напорной сети",
  pumping_station: "Насосная станция водоснабжения или водоотведения",
  rainwater_inlets: "Дождеприёмники ливневой канализации",
  reservoir_clean_water: "Резервуар чистой воды",
  septic_treatment_facility: "Локальное септическое очистное сооружение",
  settlement_water_network: "Распределительная сеть водоснабжения населённого пункта",
  sewage_treatment_tanks: "Технологические ёмкости очистки сточных вод",
  sewer_pumping_station: "Канализационная насосная станция",
  site_sewer_connection: "Подключение площадки к канализационной сети",
  site_water_connection: "Подключение площадки к водопроводной сети",
  sludge_dewatering: "Обезвоживание осадка сточных вод",
  stormwater_drainage: "Ливневая канализационная сеть",
  valves_chambers: "Камеры водопроводной арматуры",
  village_sewer_network: "Канализационная сеть населённого пункта",
  village_water_supply: "Система водоснабжения населённого пункта",
  wastewater_treatment_plant: "Очистные сооружения сточных вод",
  water_intake: "Водозаборное сооружение",
  water_meter_chambers: "Камеры водомерных узлов",
  water_reservoir: "Резервуар системы водоснабжения",
  water_tower: "Водонапорная башня",
  water_treatment_plant: "Комплекс водоподготовки",
  well_construction: "Водозаборная скважина",
});

const ESTIMATE_LEVEL_LABELS_RU: Readonly<Record<string, string>> = Object.freeze({
  AS_BUILT_ESTIMATE: "исполнительная смета",
  DETAILED_BOQ_FROM_DRAWINGS: "детальная ведомость по проекту",
  PRELIMINARY_BOQ: "предварительная ведомость объёмов",
  ROM_CONCEPT: "концептуальная оценка состава",
  TENDER_BOQ: "тендерная ведомость объёмов",
});

export type WaterSewerDomainInventoryRow = GlobalCatalogInventoryRowV1 & {
  source_domain_id: "plumbing" | `expanded:${WaterSewerExpandedOwnedFamily}`;
  scope_capability: string;
  canonical_technology_id: string;
  display_title_ru: string;
  localized_name_ru: string;
  template_id: string;
  work_type: string;
  record_role: "PRIMARY";
  equivalence_group_id: null;
  source_inventory_hash: string;
};

export type WaterSewerReviewedExclusionRow = GlobalCatalogInventoryRowV1 & {
  record_role: "EXCLUDED";
  exclusion_owner: string;
  exclusion_reason: string;
};

function expandedFamily(domainId: string): string | null {
  return domainId.startsWith("expanded:") ? domainId.slice("expanded:".length) : null;
}

function isOwned(row: GlobalCatalogInventoryRowV1): boolean {
  if (row.domain_id === "plumbing") return true;
  const family = expandedFamily(row.domain_id);
  return family !== null && WATER_SEWER_EXPANDED_OWNED_FAMILIES.includes(family as WaterSewerExpandedOwnedFamily);
}

function displayTitle(row: GlobalCatalogInventoryRowV1): string {
  if (row.domain_id === "plumbing") return row.title_ru;
  const family = expandedFamily(row.domain_id) as WaterSewerExpandedOwnedFamily;
  const level = ESTIMATE_LEVEL_LABELS_RU[row.operation_class];
  if (!EXPANDED_LABELS_RU[family] || !level) {
    throw new Error(`WATER_SEWER_DISPLAY_TITLE_MAPPING_MISSING:${row.catalog_id}`);
  }
  return `${EXPANDED_LABELS_RU[family]} — ${level}`;
}

function scopeCapability(row: GlobalCatalogInventoryRowV1): string {
  const capability = row.scope_capabilities[0];
  if (!capability || row.scope_capabilities.length !== 1) {
    throw new Error(`WATER_SEWER_SCOPE_CAPABILITY_INVALID:${row.catalog_id}`);
  }
  return capability;
}

const globalInventory = buildGlobalCatalogInventoryV1();
const ownedSourceRows = globalInventory.rows.filter(isOwned);

export const WATER_SEWER_DOMAIN_INVENTORY: readonly WaterSewerDomainInventoryRow[] = Object.freeze(
  ownedSourceRows.map((row) => {
    const sourceDomainId = row.domain_id as WaterSewerDomainInventoryRow["source_domain_id"];
    const exactDisplayTitle = displayTitle(row);
    const withoutHash = {
      ...row,
      source_domain_id: sourceDomainId,
      scope_capability: scopeCapability(row),
      canonical_technology_id: `${WATER_SEWER_COMPLETE_DOMAIN_ID}:technology:${row.work_key}`,
      display_title_ru: exactDisplayTitle,
      localized_name_ru: exactDisplayTitle,
      template_id: `domain-passport:${row.catalog_id}:v1`,
      work_type: row.new_repair_demolition_state.toLocaleLowerCase("en-US"),
      record_role: "PRIMARY" as const,
      equivalence_group_id: null,
    };
    return {
      ...withoutHash,
      source_inventory_hash: estimateDeterministicHash(withoutHash),
    };
  }).sort((left, right) => left.catalog_id.localeCompare(right.catalog_id)),
);

const exclusionReasonByFamily: Readonly<Record<string, string>> = Object.freeze({
  dewatering_system: "EARTHWORKS_DEWATERING_OWNER",
  drainage_channel: "EARTHWORKS_DRAINAGE_OWNER",
  drainage_prism: "EARTHWORKS_DRAINAGE_OWNER",
  environmental_monitoring_wells: "ENVIRONMENTAL_MONITORING_OWNER",
  fire_fighting_pump_station: "FIRE_SAFETY_OWNER",
  fire_hydrants: "FIRE_SAFETY_OWNER",
  gutters_downpipes: "ROOFING_RAINWATER_OWNER",
  hydraulic_testing: "CROSS_DOMAIN_TESTING_OWNER",
  intake_structure: "HYDRAULIC_STRUCTURES_OWNER",
  irrigation_channel: "LANDSCAPE_IRRIGATION_OWNER",
  leachate_collection: "LANDFILL_ENVIRONMENTAL_OWNER",
  multi_utility_trench: "MULTI_UTILITY_COORDINATION_OWNER",
  pipe_bedding_backfill: "EARTHWORKS_CHILD_ASSEMBLY_OWNER",
  pipeline_compensators: "HEATING_PROCESS_PIPE_OWNER",
  pipeline_insulation: "INSULATION_OWNER",
  pipeline_pressure_testing: "CROSS_DOMAIN_PIPELINE_TESTING_OWNER",
  pipeline_welding: "CROSS_DOMAIN_WELDING_OWNER",
  preinsulated_pipe_installation: "HEATING_NETWORK_OWNER",
  pressure_pipeline_industrial: "PROCESS_PIPING_OWNER",
  process_piping_dn50_dn1200: "PROCESS_PIPING_OWNER",
  road_drainage: "ROAD_DRAINAGE_OWNER",
  service_chambers: "MULTI_UTILITY_CHAMBER_OWNER",
  sprinkler_system: "FIRE_SAFETY_OWNER",
  technological_pipeline: "PROCESS_PIPING_OWNER",
  tunnel_drainage: "TUNNEL_DRAINAGE_OWNER",
  utility_crossings: "MULTI_UTILITY_CROSSING_OWNER",
  utility_trench: "MULTI_UTILITY_TRENCH_OWNER",
  water_control_gates: "HYDRAULIC_STRUCTURES_OWNER",
  water_intake_hpp: "HYDROPOWER_OWNER",
  district_heating_pipeline: "HEATING_NETWORK_OWNER",
  heat_network: "HEATING_NETWORK_OWNER",
  gas_pipeline_low_pressure: "GAS_SUPPLY_OWNER",
  gas_pipeline_medium_pressure: "GAS_SUPPLY_OWNER",
});

export const WATER_SEWER_REVIEWED_EXCLUSIONS: readonly WaterSewerReviewedExclusionRow[] = Object.freeze(
  globalInventory.rows
    .filter((row) => {
      const family = expandedFamily(row.domain_id);
      return family !== null && WATER_SEWER_REVIEWED_EXCLUSION_FAMILIES.includes(
        family as typeof WATER_SEWER_REVIEWED_EXCLUSION_FAMILIES[number],
      );
    })
    .map((row) => {
      const family = expandedFamily(row.domain_id)!;
      return {
        ...row,
        record_role: "EXCLUDED" as const,
        exclusion_owner: exclusionReasonByFamily[family],
        exclusion_reason: `Exact global-ledger boundary: ${family} is owned by ${exclusionReasonByFamily[family]}`,
      };
    })
    .sort((left, right) => left.catalog_id.localeCompare(right.catalog_id)),
);

export const WATER_SEWER_DOMAIN_CATALOG_BINDINGS: readonly ProfessionalCatalogBindingV1[] = Object.freeze(
  WATER_SEWER_DOMAIN_INVENTORY.map((row) => ({
    catalog_id: row.catalog_id,
    work_key: row.work_key,
    canonical_technology_id: row.canonical_technology_id,
    scope_capability: row.scope_capability,
    alias_of: null,
    exact_identity_required: true as const,
  })),
);

const baseCount = WATER_SEWER_DOMAIN_INVENTORY.filter((row) => row.source_domain_id === "plumbing").length;
const expandedCount = WATER_SEWER_DOMAIN_INVENTORY.length - baseCount;
if (
  globalInventory.catalog_total !== 11_610 ||
  globalInventory.arithmetic.domain_denominator_sum !== 11_610 ||
  globalInventory.arithmetic.duplicate_catalog_id !== 0 ||
  globalInventory.arithmetic.silent_exclusion !== 0 ||
  baseCount !== 650 ||
  expandedCount !== WATER_SEWER_EXPANDED_OWNED_FAMILIES.length * 5 ||
  WATER_SEWER_DOMAIN_INVENTORY.length !== WATER_SEWER_COMPLETE_RECORD_COUNT ||
  WATER_SEWER_REVIEWED_EXCLUSIONS.length !== WATER_SEWER_REVIEWED_EXCLUSION_COUNT
) {
  throw new Error(`WATER_SEWER_DENOMINATOR_MISMATCH:${JSON.stringify({
    global: globalInventory.catalog_total,
    baseCount,
    expandedCount,
    records: WATER_SEWER_DOMAIN_INVENTORY.length,
    exclusions: WATER_SEWER_REVIEWED_EXCLUSIONS.length,
  })}`);
}

if (new Set(WATER_SEWER_DOMAIN_INVENTORY.map((row) => row.catalog_id)).size !== WATER_SEWER_COMPLETE_RECORD_COUNT) {
  throw new Error("WATER_SEWER_DUPLICATE_CATALOG_ID");
}
if (new Set(WATER_SEWER_DOMAIN_INVENTORY.map((row) => row.canonical_technology_id)).size !== WATER_SEWER_COMPLETE_TECHNOLOGY_COUNT) {
  throw new Error("WATER_SEWER_UNPROVEN_ALIAS_FAN_IN");
}
