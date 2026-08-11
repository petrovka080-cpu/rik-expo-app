import { estimateDeterministicHash } from "../../../estimateDeterministicHash";
import type { ProfessionalCatalogBindingV1 } from "../../domainFactory";
import {
  buildGlobalCatalogInventoryV1,
  type GlobalCatalogInventoryRowV1,
} from "../../domainFactory/globalCatalogInventoryV1";

export const HVAC_COMPLETE_DOMAIN_ID = "heating_ventilation" as const;
export const HVAC_COMPLETE_DOMAIN_VERSION = "1.0.0" as const;
export const HVAC_BASE_HEATING_RECORD_COUNT = 550 as const;
export const HVAC_BASE_VENTILATION_RECORD_COUNT = 300 as const;
export const HVAC_COMPLETE_RECORD_COUNT = 920 as const;
export const HVAC_COMPLETE_TECHNOLOGY_COUNT = 920 as const;
export const HVAC_COMPLETE_ALIAS_COUNT = 0 as const;
export const HVAC_REVIEWED_EXCLUSION_COUNT = 200 as const;

export const HVAC_EXPANDED_OWNED_FAMILIES = Object.freeze([
  "boiler_house",
  "boiler_installation",
  "chimney_stack",
  "cooling_tower",
  "district_heating_pipeline",
  "heat_chamber",
  "heat_network",
  "HVAC_plant_room",
  "pipeline_compensators",
  "preinsulated_pipe_installation",
  "server_room_cooling",
  "site_heat_connection",
  "tunnel_ventilation",
  "ventilation_system",
] as const);

export type HvacExpandedOwnedFamily = typeof HVAC_EXPANDED_OWNED_FAMILIES[number];

export const HVAC_REVIEWED_EXCLUSION_FAMILIES = Object.freeze([
  "BMS_system",
  "cable_ducts",
  "cleanroom_construction",
  "cold_storage_building",
  "combined_heat_power_plant",
  "commissioning_energy_facility",
  "data_center_mep",
  "dust_suppression_system",
  "electrical_testing_commissioning",
  "equipment_foundation",
  "external_engineering_networks",
  "fire_alarm_system",
  "fire_fighting_pump_station",
  "fire_hydrants",
  "firebreaks_facade",
  "fuel_oil_facility",
  "fuel_tank",
  "gas_pipeline_low_pressure",
  "gas_pipeline_medium_pressure",
  "gas_regulator_station",
  "gutters_downpipes",
  "multi_utility_trench",
  "pipe_rack",
  "pipeline_insulation",
  "pipeline_pressure_testing",
  "pipeline_welding",
  "pressure_pipeline_industrial",
  "process_piping_dn50_dn1200",
  "refrigeration_equipment_foundation",
  "site_gas_connection",
  "smoke_exhaust_system",
  "sprinkler_system",
  "technological_pipeline",
  "testing_commissioning",
  "thermal_power_plant",
  "tunnel_drainage",
  "utility_crossings",
  "utility_trench",
  "ventilated_facade",
  "production_workshop",
] as const);

const EXPANDED_LABELS_RU: Readonly<Record<HvacExpandedOwnedFamily, string>> = Object.freeze({
  boiler_house: "Котельная",
  boiler_installation: "Монтаж котельного оборудования",
  chimney_stack: "Дымовая труба и газоходы",
  cooling_tower: "Градирня системы охлаждения",
  district_heating_pipeline: "Магистральная тепловая сеть",
  heat_chamber: "Тепловая камера",
  heat_network: "Тепловая сеть",
  HVAC_plant_room: "Машинное помещение отопления и вентиляции",
  pipeline_compensators: "Компенсаторы отопительного трубопровода",
  preinsulated_pipe_installation: "Предизолированный трубопровод тепловой сети",
  server_room_cooling: "Система охлаждения серверного помещения",
  site_heat_connection: "Подключение площадки к тепловой сети",
  tunnel_ventilation: "Тоннельная вентиляция",
  ventilation_system: "Система приточно-вытяжной вентиляции",
});

const ESTIMATE_LEVEL_LABELS_RU: Readonly<Record<string, string>> = Object.freeze({
  AS_BUILT_ESTIMATE: "исполнительная смета",
  DETAILED_BOQ_FROM_DRAWINGS: "детальная ведомость по проектным чертежам",
  PRELIMINARY_BOQ: "предварительная ведомость объёмов",
  ROM_CONCEPT: "концептуальная оценка состава",
  TENDER_BOQ: "тендерная ведомость объёмов",
});

export type HvacDomainInventoryRow = GlobalCatalogInventoryRowV1 & {
  source_domain_id: "heating_hvac" | "ventilation" | `expanded:${HvacExpandedOwnedFamily}`;
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

export type HvacReviewedExclusionRow = GlobalCatalogInventoryRowV1 & {
  record_role: "EXCLUDED";
  exclusion_owner: string;
  exclusion_reason: string;
};

function expandedFamily(domainId: string): string | null {
  return domainId.startsWith("expanded:") ? domainId.slice("expanded:".length) : null;
}

function isOwned(row: GlobalCatalogInventoryRowV1): boolean {
  if (row.domain_id === "heating_hvac" || row.domain_id === "ventilation") return true;
  const family = expandedFamily(row.domain_id);
  return family !== null && HVAC_EXPANDED_OWNED_FAMILIES.includes(family as HvacExpandedOwnedFamily);
}

function displayTitle(row: GlobalCatalogInventoryRowV1): string {
  if (row.domain_id === "heating_hvac" || row.domain_id === "ventilation") return row.title_ru;
  const family = expandedFamily(row.domain_id) as HvacExpandedOwnedFamily;
  const level = ESTIMATE_LEVEL_LABELS_RU[row.operation_class];
  if (!EXPANDED_LABELS_RU[family] || !level) {
    throw new Error(`HVAC_DISPLAY_TITLE_MAPPING_MISSING:${row.catalog_id}`);
  }
  return `${EXPANDED_LABELS_RU[family]} — ${level}`;
}

function scopeCapability(row: GlobalCatalogInventoryRowV1): string {
  const capability = row.scope_capabilities[0];
  if (!capability || row.scope_capabilities.length !== 1) {
    throw new Error(`HVAC_SCOPE_CAPABILITY_INVALID:${row.catalog_id}`);
  }
  return capability;
}

const exclusionOwnerByFamily: Readonly<Record<string, string>> = Object.freeze({
  BMS_system: "AUTOMATION_BMS_CHILD_OWNER",
  cable_ducts: "ELECTRICAL_CABLE_ROUTE_OWNER",
  cleanroom_construction: "SPECIAL_BUILDING_OWNER",
  cold_storage_building: "SPECIAL_BUILDING_OWNER",
  combined_heat_power_plant: "POWER_GENERATION_OWNER",
  commissioning_energy_facility: "ENERGY_COMMISSIONING_OWNER",
  data_center_mep: "MULTI_DOMAIN_MEP_OWNER",
  dust_suppression_system: "INDUSTRIAL_PROCESS_OWNER",
  electrical_testing_commissioning: "ELECTRICAL_COMMISSIONING_OWNER",
  equipment_foundation: "STRUCTURAL_FOUNDATION_CHILD_OWNER",
  external_engineering_networks: "MULTI_UTILITY_OWNER",
  fire_alarm_system: "FIRE_SAFETY_OWNER",
  fire_fighting_pump_station: "FIRE_SAFETY_OWNER",
  fire_hydrants: "FIRE_SAFETY_OWNER",
  firebreaks_facade: "FIRE_SAFETY_FACADE_OWNER",
  fuel_oil_facility: "FUEL_SYSTEM_OWNER",
  fuel_tank: "FUEL_SYSTEM_OWNER",
  gas_pipeline_low_pressure: "GAS_SUPPLY_OWNER",
  gas_pipeline_medium_pressure: "GAS_SUPPLY_OWNER",
  gas_regulator_station: "GAS_SUPPLY_OWNER",
  gutters_downpipes: "ROOFING_RAINWATER_OWNER",
  multi_utility_trench: "MULTI_UTILITY_COORDINATION_OWNER",
  pipe_rack: "STRUCTURAL_PIPE_RACK_OWNER",
  pipeline_insulation: "INSULATION_CHILD_OWNER",
  pipeline_pressure_testing: "CROSS_DOMAIN_TESTING_OWNER",
  pipeline_welding: "CROSS_DOMAIN_WELDING_OWNER",
  pressure_pipeline_industrial: "PROCESS_PIPING_OWNER",
  process_piping_dn50_dn1200: "PROCESS_PIPING_OWNER",
  refrigeration_equipment_foundation: "STRUCTURAL_FOUNDATION_CHILD_OWNER",
  site_gas_connection: "GAS_SUPPLY_OWNER",
  smoke_exhaust_system: "FIRE_SAFETY_SMOKE_CONTROL_OWNER",
  sprinkler_system: "FIRE_SAFETY_OWNER",
  technological_pipeline: "PROCESS_PIPING_OWNER",
  testing_commissioning: "CROSS_DOMAIN_COMMISSIONING_OWNER",
  thermal_power_plant: "POWER_GENERATION_OWNER",
  tunnel_drainage: "TUNNEL_DRAINAGE_OWNER",
  utility_crossings: "MULTI_UTILITY_CROSSING_OWNER",
  utility_trench: "MULTI_UTILITY_TRENCH_OWNER",
  ventilated_facade: "FACADE_OWNER",
  production_workshop: "INDUSTRIAL_BUILDING_OWNER",
});

const globalInventory = buildGlobalCatalogInventoryV1();
const ownedSourceRows = globalInventory.rows.filter(isOwned);

export const HVAC_DOMAIN_INVENTORY: readonly HvacDomainInventoryRow[] = Object.freeze(
  ownedSourceRows.map((row) => {
    const exactDisplayTitle = displayTitle(row);
    const withoutHash = {
      ...row,
      source_domain_id: row.domain_id as HvacDomainInventoryRow["source_domain_id"],
      scope_capability: scopeCapability(row),
      canonical_technology_id: `${HVAC_COMPLETE_DOMAIN_ID}:technology:${row.work_key}`,
      display_title_ru: exactDisplayTitle,
      localized_name_ru: exactDisplayTitle,
      template_id: `domain-passport:${row.catalog_id}:v1`,
      work_type: row.new_repair_demolition_state.toLocaleLowerCase("en-US"),
      record_role: "PRIMARY" as const,
      equivalence_group_id: null,
    };
    return { ...withoutHash, source_inventory_hash: estimateDeterministicHash(withoutHash) };
  }).sort((left, right) => left.catalog_id.localeCompare(right.catalog_id)),
);

export const HVAC_REVIEWED_EXCLUSIONS: readonly HvacReviewedExclusionRow[] = Object.freeze(
  globalInventory.rows
    .filter((row) => {
      const family = expandedFamily(row.domain_id);
      return family !== null && HVAC_REVIEWED_EXCLUSION_FAMILIES.includes(
        family as typeof HVAC_REVIEWED_EXCLUSION_FAMILIES[number],
      );
    })
    .map((row) => {
      const family = expandedFamily(row.domain_id)!;
      const owner = exclusionOwnerByFamily[family];
      if (!owner) throw new Error(`HVAC_EXCLUSION_OWNER_MISSING:${family}`);
      return {
        ...row,
        record_role: "EXCLUDED" as const,
        exclusion_owner: owner,
        exclusion_reason: `Exact global-ledger boundary: ${family} is owned by ${owner}`,
      };
    })
    .sort((left, right) => left.catalog_id.localeCompare(right.catalog_id)),
);

export const HVAC_DOMAIN_CATALOG_BINDINGS: readonly ProfessionalCatalogBindingV1[] = Object.freeze(
  HVAC_DOMAIN_INVENTORY.map((row) => ({
    catalog_id: row.catalog_id,
    work_key: row.work_key,
    canonical_technology_id: row.canonical_technology_id,
    scope_capability: row.scope_capability,
    alias_of: null,
    exact_identity_required: true as const,
  })),
);

const heatingCount = HVAC_DOMAIN_INVENTORY.filter((row) => row.source_domain_id === "heating_hvac").length;
const ventilationCount = HVAC_DOMAIN_INVENTORY.filter((row) => row.source_domain_id === "ventilation").length;
const expandedCount = HVAC_DOMAIN_INVENTORY.length - heatingCount - ventilationCount;
if (
  globalInventory.catalog_total !== 11_610 ||
  globalInventory.arithmetic.domain_denominator_sum !== 11_610 ||
  globalInventory.arithmetic.duplicate_catalog_id !== 0 ||
  globalInventory.arithmetic.silent_exclusion !== 0 ||
  heatingCount !== HVAC_BASE_HEATING_RECORD_COUNT ||
  ventilationCount !== HVAC_BASE_VENTILATION_RECORD_COUNT ||
  expandedCount !== HVAC_EXPANDED_OWNED_FAMILIES.length * 5 ||
  HVAC_DOMAIN_INVENTORY.length !== HVAC_COMPLETE_RECORD_COUNT ||
  HVAC_REVIEWED_EXCLUSIONS.length !== HVAC_REVIEWED_EXCLUSION_COUNT
) {
  throw new Error(`HVAC_DENOMINATOR_MISMATCH:${JSON.stringify({
    global: globalInventory.catalog_total,
    heatingCount,
    ventilationCount,
    expandedCount,
    records: HVAC_DOMAIN_INVENTORY.length,
    exclusions: HVAC_REVIEWED_EXCLUSIONS.length,
  })}`);
}
if (new Set(HVAC_DOMAIN_INVENTORY.map((row) => row.catalog_id)).size !== HVAC_COMPLETE_RECORD_COUNT) {
  throw new Error("HVAC_DUPLICATE_CATALOG_ID");
}
if (new Set(HVAC_DOMAIN_INVENTORY.map((row) => row.canonical_technology_id)).size !== HVAC_COMPLETE_TECHNOLOGY_COUNT) {
  throw new Error("HVAC_UNPROVEN_ALIAS_FAN_IN");
}
