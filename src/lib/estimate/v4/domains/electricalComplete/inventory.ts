import { estimateDeterministicHash } from "../../../estimateDeterministicHash";
import type { ProfessionalCatalogBindingV1 } from "../../domainFactory";
import { buildGlobalCatalogInventoryV1, type GlobalCatalogInventoryRowV1 } from "../../domainFactory/globalCatalogInventoryV1";

export const ELECTRICAL_COMPLETE_DOMAIN_ID = "electrical_complete" as const;
export const ELECTRICAL_COMPLETE_DOMAIN_VERSION = "2.0.0" as const;
export const ELECTRICAL_COMPLETE_RECORD_COUNT = 605 as const;
export const ELECTRICAL_COMPLETE_TECHNOLOGY_COUNT = 605 as const;
export const ELECTRICAL_COMPLETE_ALIAS_COUNT = 0 as const;
export const ELECTRICAL_REVIEWED_EXCLUSION_COUNT = 405 as const;

export const ELECTRICAL_BASE_OWNED_SYSTEMS = Object.freeze([
  "BREAKER", "CABLE_CHANNEL", "LED_STRIP", "LIGHTING", "PANEL",
  "POWER_CABLE", "RCD", "SOCKET", "SWITCH", "VVG_CABLE",
] as const);

export const ELECTRICAL_EXPANDED_OWNED_FAMILIES = Object.freeze([
  "battery_energy_storage", "cable_ducts", "cable_pulling", "cable_trench",
  "cable_trench_energy", "distribution_board_outdoor", "distribution_substation",
  "electrical_poles_04kv", "electrical_poles_10kv", "electrical_poles_110kv",
  "electrical_poles_35kv", "electrical_testing_commissioning", "grounding_system",
  "lightning_protection", "outdoor_switchgear", "overhead_power_line_04kv",
  "overhead_power_line_10kv", "overhead_power_line_110kv", "overhead_power_line_35kv",
  "package_transformer_substation", "relay_protection_automation", "street_lighting_poles",
  "substation_10kv", "substation_110kv", "substation_35kv", "transformer_substation",
  "underground_cable_line",
] as const);

export const ELECTRICAL_RAW_EXPANDED_FAMILIES = Object.freeze([
  "ash_handling_system", "battery_energy_storage", "boiler_house", "boiler_installation",
  "cable_ducts", "cable_pulling", "cable_trench", "cable_trench_energy", "chimney_stack",
  "coal_handling_system", "combined_heat_power_plant", "commissioning_energy_facility",
  "control_building_energy", "cooling_tower", "distribution_board_outdoor",
  "distribution_substation", "electrical_poles_04kv", "electrical_poles_10kv",
  "electrical_poles_110kv", "electrical_poles_35kv", "electrical_testing_commissioning",
  "fuel_oil_facility", "generator_foundation", "grounding_system", "hydro_power_plant",
  "hydromechanical_equipment", "lightning_protection", "outdoor_switchgear",
  "overhead_power_line_04kv", "overhead_power_line_10kv", "overhead_power_line_110kv",
  "overhead_power_line_35kv", "package_transformer_substation", "penstock", "powerhouse",
  "relay_protection_automation", "small_hydro_power_plant", "solar_power_plant",
  "street_lighting_poles", "substation_10kv", "substation_110kv", "substation_35kv",
  "surge_tank", "thermal_power_plant", "transformer_foundation", "transformer_substation",
  "turbine_foundation", "turbine_hall", "turbine_installation_hpp", "underground_cable_line",
  "water_intake_hpp", "wind_power_plant",
] as const);

export type ElectricalExpandedOwnedFamily = typeof ELECTRICAL_EXPANDED_OWNED_FAMILIES[number];

export type ElectricalDomainInventoryRow = GlobalCatalogInventoryRowV1 & {
  source_domain_id: "electrical" | `expanded:${ElectricalExpandedOwnedFamily}`;
  scope_capability: string;
  canonical_technology_id: string;
  display_title_ru: string;
  localized_name_ru: string;
  template_id: string;
  work_type: string;
  record_role: "PRIMARY";
  equivalence_group_id: null;
  electrical_family: string;
  source_inventory_hash: string;
};

export type ElectricalReviewedExclusionRow = GlobalCatalogInventoryRowV1 & {
  record_role: "EXCLUDED";
  exclusion_owner: string;
  exclusion_reason: string;
};

function expandedFamily(row: GlobalCatalogInventoryRowV1): string | null {
  return row.domain_id.startsWith("expanded:") ? row.domain_id.slice("expanded:".length) : null;
}

function electricalFamily(row: GlobalCatalogInventoryRowV1): string {
  return expandedFamily(row) ?? row.primary_material_or_system;
}

function isOwned(row: GlobalCatalogInventoryRowV1): boolean {
  if (row.domain_id === "electrical") {
    return ELECTRICAL_BASE_OWNED_SYSTEMS.includes(row.primary_material_or_system as typeof ELECTRICAL_BASE_OWNED_SYSTEMS[number]);
  }
  const family = expandedFamily(row);
  return family !== null && ELECTRICAL_EXPANDED_OWNED_FAMILIES.includes(family as ElectricalExpandedOwnedFamily);
}

function inRawElectricalBucket(row: GlobalCatalogInventoryRowV1): boolean {
  const family = expandedFamily(row);
  return row.domain_id === "electrical" || (family !== null && ELECTRICAL_RAW_EXPANDED_FAMILIES.includes(
    family as typeof ELECTRICAL_RAW_EXPANDED_FAMILIES[number],
  ));
}

function exclusionOwner(row: GlobalCatalogInventoryRowV1): string {
  if (row.domain_id === "electrical") {
    const system = row.primary_material_or_system;
    if (system === "FIRE_ALARM") return "FIRE_LIFE_SAFETY_OWNER";
    if (system === "ACCESS_CONTROL") return "SECURITY_ACCESS_CONTROL_OWNER";
    return "ICT_LOW_CURRENT_COMMUNICATIONS_OWNER";
  }
  const family = expandedFamily(row) ?? "unknown";
  if (["generator_foundation", "transformer_foundation", "turbine_foundation"].includes(family)) return "STRUCTURAL_CIVIL_OWNER";
  if (["ash_handling_system", "boiler_house", "boiler_installation", "chimney_stack", "coal_handling_system", "cooling_tower", "fuel_oil_facility", "hydromechanical_equipment", "penstock", "surge_tank", "turbine_installation_hpp", "water_intake_hpp"].includes(family)) return "MECHANICAL_PROCESS_HYDRAULIC_OWNER";
  return "ENERGY_GENERATION_FACILITY_OWNER";
}

const globalInventory = buildGlobalCatalogInventoryV1();

export const ELECTRICAL_DOMAIN_INVENTORY: readonly ElectricalDomainInventoryRow[] = Object.freeze(
  globalInventory.rows.filter(isOwned).map((row) => {
    const capability = row.scope_capabilities[0];
    if (!capability || row.scope_capabilities.length !== 1) throw new Error(`ELECTRICAL_SCOPE_CAPABILITY_INVALID:${row.catalog_id}`);
    const family = electricalFamily(row);
    const withoutHash = {
      ...row,
      source_domain_id: row.domain_id as ElectricalDomainInventoryRow["source_domain_id"],
      scope_capability: capability,
      canonical_technology_id: `${ELECTRICAL_COMPLETE_DOMAIN_ID}:technology:${row.work_key}`,
      display_title_ru: row.title_ru,
      localized_name_ru: row.title_ru,
      template_id: `domain-passport:${row.catalog_id}:v1`,
      work_type: row.new_repair_demolition_state.toLocaleLowerCase("en-US"),
      record_role: "PRIMARY" as const,
      equivalence_group_id: null,
      electrical_family: family,
    };
    return { ...withoutHash, source_inventory_hash: estimateDeterministicHash(withoutHash) };
  }).sort((left, right) => left.catalog_id.localeCompare(right.catalog_id)),
);

export const ELECTRICAL_REVIEWED_EXCLUSIONS: readonly ElectricalReviewedExclusionRow[] = Object.freeze(
  globalInventory.rows.filter((row) => inRawElectricalBucket(row) && !isOwned(row)).map((row) => {
    const owner = exclusionOwner(row);
    return {
      ...row,
      record_role: "EXCLUDED" as const,
      exclusion_owner: owner,
      exclusion_reason: `Exact global-ledger boundary: ${electricalFamily(row)} is owned by ${owner}; only typed Electrical children may be linked without duplicate cost.`,
    };
  }).sort((left, right) => left.catalog_id.localeCompare(right.catalog_id)),
);

export const ELECTRICAL_DOMAIN_CATALOG_BINDINGS: readonly ProfessionalCatalogBindingV1[] = Object.freeze(
  ELECTRICAL_DOMAIN_INVENTORY.map((row) => ({
    catalog_id: row.catalog_id,
    work_key: row.work_key,
    canonical_technology_id: row.canonical_technology_id,
    scope_capability: row.scope_capability,
    alias_of: null,
    exact_identity_required: true as const,
  })),
);

if (ELECTRICAL_DOMAIN_INVENTORY.length !== ELECTRICAL_COMPLETE_RECORD_COUNT) throw new Error("ELECTRICAL_INVENTORY_DENOMINATOR_MISMATCH");
if (new Set(ELECTRICAL_DOMAIN_INVENTORY.map((row) => row.candidate_canonical_technology_id)).size !== 107) throw new Error("ELECTRICAL_GROUP_DENOMINATOR_MISMATCH");
if (ELECTRICAL_REVIEWED_EXCLUSIONS.length !== ELECTRICAL_REVIEWED_EXCLUSION_COUNT) throw new Error("ELECTRICAL_EXCLUSION_DENOMINATOR_MISMATCH");

export const ELECTRICAL_DOMAIN_INVENTORY_HASH = estimateDeterministicHash(ELECTRICAL_DOMAIN_INVENTORY);
export const ELECTRICAL_REVIEWED_EXCLUSIONS_HASH = estimateDeterministicHash(ELECTRICAL_REVIEWED_EXCLUSIONS);
