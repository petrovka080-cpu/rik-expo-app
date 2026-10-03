import type { DeclaredPurchaseBalanceRowsR1 } from "./effectivePurchaseBalanceR1";

function common(prefix: string, parameterPrefix: string, consumed: string, stock: string, reserve: string, quantum: string,
  order: string, packages: string, remaining: string, free: string): DeclaredPurchaseBalanceRowsR1 {
  return { ownerRowId: `${prefix}:${order}`, consumedRowId: `${prefix}:${consumed}`, stock: `${parameterPrefix}_${stock}`,
    reserve: `${parameterPrefix}_${reserve}`, quantum: `${parameterPrefix}_${quantum}`, packagesRowId: `${prefix}:${packages}`,
    remainingRowId: `${prefix}:${remaining}`, freeRowId: `${prefix}:${free}` };
}

/** Finite declarations for existing crossing material owners. No expressions
 * are inferred or replaced by text matching; source consumption remains owned
 * by each listed resource, including physical state and disjoint allocation. */
export const ROAD_CROSSING_SLEEVES_EFFECTIVE_BALANCES_R1: readonly DeclaredPurchaseBalanceRowsR1[] = Object.freeze([
  common("rcs:joint", "rcs_joint_electrode", "electrode_consumed", "compatible_stock_kg", "retained_spare_kg", "supplier_pack_kg",
    "electrode_ordered", "electrode_packs", "electrode_remaining", "electrode_free"),
  { ...common("rcs:carrier", "rcs_carrier", "consumed_section_count", "compatible_whole_section_stock_count", "retained_whole_section_count", "supplier_bundle_section_count",
    "ordered_length_m", "supplier_bundle_count", "remaining_section_count", "free_section_count"), controlUnitFactor: "rcs_carrier_physical_supply_section_length_m", orderedUnitsRowId: "rcs:carrier:ordered_section_count" },
  ...["thrust", "reception"].flatMap(shaft => ["granular", "water"].map(material => common(`rcs:shoring-gap:${shaft}:${material}`, `rcs_shoring_gap_${shaft}_${material}`,
    "consumed_m3", "compatible_stock_m3", "retained_reserve_m3", "supplier_multiple_m3", "ordered_m3", "supplier_multiple_count", "remaining_unused_m3", "free_unused_beyond_reserve_m3"))),
  ...["trench", "thrust", "reception", "reaction"].flatMap(scope => ["lubricant", "cleaner", "wipes"].map(material => common(`rcs:shoring-material:${scope}:${material}`, `rcs_shoring_material_${scope}_${material}`,
    "consumed", "compatible_unused_stock", "retained_reserve", "supplier_pack_net", "ordered", "supplier_pack_count", "remaining_unused", "free_unused_beyond_reserve"))),
  ...[["bedding", "rcs_bedding"], ["pit-fill", "rcs_pit_fill"], ["trench-fill", "rcs_trench_fill"]].map(([scope, parameterPrefix]) => common(`rcs:${scope}`, parameterPrefix,
    "consumed_loose_m3", "compatible_loose_stock_m3", "retained_loose_reserve_m3", "supplier_loose_multiple_m3", "ordered_loose_m3", "supplier_multiple_count", "remaining_loose_m3", "free_loose_m3_beyond_reserve")),
  common("rcs:internal-fill", "rcs_internal_fill", "consumed_dry_kg", "compatible_dry_stock_kg", "retained_dry_reserve_kg", "supplier_bag_net_kg",
    "ordered_dry_kg", "supplier_bag_count", "remaining_dry_kg", "free_dry_kg_beyond_reserve"),
  { ...common("rcs:internal-water", "rcs_internal_fill_water", "unused", "compatible_stock_m3", "retained_reserve_m3", "supplier_multiple_m3",
    "ordered_m3", "supplier_multiple_count", "remaining_m3", "free_m3_beyond_reserve"), consumedRowId: "rcs:internal-fill:mixing_water_m3" },
  ...["bedding", "pits", "trench"].map(scope => common(`rcs:compaction-water:${scope}`, `rcs_compaction_water_${scope}`,
    "allocated_consumed_m3", "compatible_stock_m3", "retained_reserve_m3", "supplier_multiple_m3", "ordered_m3", "supplier_multiple_count", "remaining_m3", "free_m3_beyond_reserve")),
  ...["cutting_discs", "grinding_discs", "cleaner", "wipes"].map(material => common(`rcs:casing-prep-material:${material}`, `rcs_casing_prep_material_${material}`,
    "consumed", "compatible_stock", "retained_reserve", "supplier_pack_net", "ordered", "supplier_pack_count", "remaining", "free_beyond_reserve")),
  ...["joints", "damage"].map(zone => common(`rcs:coating:${zone}`, `rcs_coating_${zone}`,
    "activated_kit_count", "compatible_unmixed_kit_stock", "retained_kit_reserve", "supplier_pack_kit_count", "ordered_kit_count", "supplier_pack_count", "remaining_unmixed_kit_count", "free_unmixed_kit_count")),
  ...["joints", "damage"].flatMap(zone => ["abrasive", "cleaner", "wipes", "applicators"].map(material => common(`rcs:coating-consumable:${zone}:${material}`, `rcs_coating_${zone}_${material}`,
    "consumed", "compatible_stock", "retained_reserve", "supplier_pack_net", "ordered", "supplier_pack_count", "remaining", "free_beyond_reserve"))),
  ...["internal", "ends"].flatMap(group => ["couplers", "wash_water", "cleaner", "wipes", "markers"].map(material => common(`rcs:carrier-connection-material:${group}:${material}`, `rcs_carrier_connection_${group}_${material}`,
    "consumed", "compatible_stock", "retained_reserve", "supplier_pack_net", "ordered", "supplier_pack_count", "remaining", "free_beyond_reserve"))),
  common("rcs:water-control:fuel", "rcs_water_control_fuel", "consumed_l", "compatible_stock_l", "retained_reserve_l", "supplier_pack_net_l",
    "ordered_l", "supplier_pack_count", "remaining_l", "free_beyond_reserve_l"),
  common("rcs:water-treatment:bags", "rcs_water_treatment_bag", "consumed_count", "compatible_stock_count", "retained_reserve_count", "supplier_pack_count",
    "ordered_count", "supplier_pack_count", "remaining_count", "free_beyond_reserve_count"),
  ...["stakes", "paint"].map(material => common(`rcs:preparation:${material}`, `rcs_preparation_${material}`,
    "consumed", "compatible_stock", "retained_reserve", "supplier_pack_net", "ordered", "supplier_pack_count", "remaining", "free_beyond_reserve")),
  common("rcs:inspection:couplant", "rcs_inspection_couplant", "consumed_kg", "compatible_stock_kg", "retained_reserve_kg", "supplier_pack_net_kg",
    "ordered_kg", "supplier_pack_count", "remaining_kg", "free_kg_beyond_reserve"),
]);
