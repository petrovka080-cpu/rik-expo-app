import { BIA_TN10_MASONRY_PRODUCT_PROFILE_ID } from "../contracts/masonryBiaTn10IdentityV1";

type Primitive = string | number | boolean;

function decimal(raw: string) { const value = Number(raw.replace(/\s+/gu, "").replace(",", ".")); return Number.isFinite(value) ? value : null; }
function ref(text: string, label: RegExp) { return text.match(new RegExp(`${label.source}\\s*[:=]\\s*([^;\\n]+)`, "iu"))?.[1]?.trim() || null; }
function num(text: string, label: RegExp, unit = "") {
  const value = text.match(new RegExp(`${label.source}\\s*[:=]\\s*(\\d+(?:[.,]\\d+)?)\\s*${unit}`, "iu"))?.[1];
  return value ? decimal(value) : null;
}
function structuredNumericFields(value: unknown): Readonly<Record<string, number>> {
  if (typeof value !== "string") return {};
  return Object.fromEntries([...value.matchAll(/([A-Z0-9_]+)\s*=\s*(\d+(?:[.,]\d+)?)/gu)]
    .map((match) => [match[1]!, Number(match[2]!.replace(",", "."))]));
}
export function extractBiaTn10MasonryCanonicalParametersV1(text: string): Readonly<Record<string, Primitive>> | null {
  if (!/(?=.*(?:brick|кирпич))(?=.*bia)(?=.*tn\s*10)(?=.*table\s*4)/iu.test(text)) return null;
  const result: Record<string, Primitive> = { product_profile_id: BIA_TN10_MASONRY_PRODUCT_PROFILE_ID };
  const numeric: readonly (readonly [string, RegExp, string])[] = [
    ["measured_net_brick_wall_area_m2", /net\s+brick\s+wall\s+area/iu, "m(?:2|²)"],
    ["joint_width_mm", /joint\s+width/iu, "mm"],
    ["selected_brick_quantity_per_m2", /selected\s+brick\s+quantity\s+per\s+m2/iu, ""],
    ["selected_mortar_quantity_per_m2", /selected\s+mortar\s+quantity\s+per\s+m2/iu, ""],
    ["wall_layout_length_m", /wall\s+layout\s+length/iu, "m"],
    ["wall_height_m", /wall\s+height/iu, "m"],
    ["wall_connector_quantity_piece", /wall\s+connector\s+quantity/iu, ""],
    ["lintel_total_length_m", /lintel\s+total\s+length/iu, "m"],
    ["dpc_area_m2", /dpc\s+area/iu, "m(?:2|²)"],
    ["masonry_reinforcement_mass_kg", /masonry\s+reinforcement\s+mass/iu, "kg"],
    ["brick_cutting_length_m", /brick\s+cutting\s+length/iu, "m"],
    ["masonry_saw_machine_hours", /masonry\s+saw\s+machine\s+hours/iu, ""],
    ["material_handling_machine_hours", /material\s+handling\s+machine\s+hours/iu, ""],
    ["work_platform_rental_days", /work\s+platform\s+rental\s+days/iu, ""],
    ["engineering_inspection_hours", /engineering\s+inspection\s+hours/iu, ""],
    ["brick_unit_mass_kg", /brick\s+unit\s+mass/iu, "kg"],
    ["brick_delivery_distance_km", /brick\s+delivery\s+distance/iu, "km"],
    ["mortar_density_kg_m3", /mortar\s+density/iu, "kg(?:\/m3|\/m³)?"],
    ["mortar_delivery_distance_km", /mortar\s+delivery\s+distance/iu, "km"],
    ["masonry_waste_mass_t", /masonry\s+waste\s+mass/iu, "t"],
    ["waste_haul_distance_km", /waste\s+haul\s+distance/iu, "km"],
  ];
  for (const [id, label, unit] of numeric) { const value = num(text, label, unit); if (value !== null) result[id] = value; }
  const refs: readonly (readonly [string, RegExp])[] = [
    ["gross_wall_area_and_opening_deductions", /gross\s+wall\s+area\s+and\s+opening\s+deductions/iu],
    ["brick_manufacturer_and_designation", /brick\s+manufacturer\s+and\s+designation/iu],
    ["specified_and_nominal_dimensions", /specified\s+and\s+nominal\s+dimensions/iu],
    ["wall_thickness_and_wythe_configuration", /wall\s+thickness\s+and\s+wythe\s+configuration/iu],
    ["bond_pattern", /bond\s+pattern/iu], ["selected_bia_tn10_table_4_row", /selected\s+bia\s+tn10\s+table\s+4\s+row/iu],
    ["applicable_bond_correction_factors", /applicable\s+bond\s+correction\s+factors/iu],
    ["selected_project_breakage_and_waste_allowances", /selected\s+project\s+breakage\s+and\s+waste\s+allowances/iu],
    ["supplier_package_quantities", /supplier\s+package\s+quantities/iu],
    ["project_architect_engineer_or_estimator_approval_reference", /project\s+approval\s+reference/iu],
    ["project_scope_and_applicability_reference", /project\s+scope\s+and\s+applicability\s+reference/iu],
    ["wall_connector_designation", /wall\s+connector\s+designation/iu],
    ["lintel_designation", /lintel\s+designation/iu],
    ["dpc_product_designation", /dpc\s+product\s+designation/iu],
    ["masonry_reinforcement_designation", /masonry\s+reinforcement\s+designation/iu],
    ["masonry_saw_designation", /masonry\s+saw\s+designation/iu],
    ["material_handler_designation", /material\s+handler\s+designation/iu],
    ["work_platform_designation", /work\s+platform\s+designation/iu],
    ["lintel_and_connector_schedule_reference", /lintel\s+and\s+connector\s+schedule\s+reference/iu],
    ["equipment_schedule_reference", /equipment\s+schedule\s+reference/iu],
    ["logistics_plan_reference", /logistics\s+plan\s+reference/iu],
    ["quality_plan_reference", /quality\s+plan\s+reference/iu],
  ];
  for (const [id, label] of refs) { const value = ref(text, label); if (value) result[id] = value; }
  const clay = ref(text, /fired\s+clay\s+brick\s+confirmed/iu);
  if (clay) result.fired_clay_brick_confirmed = /^true$/iu.test(clay);
  const booleans: readonly (readonly [string, RegExp])[] = [
    ["wall_connectors_applicable", /wall\s+connectors\s+applicable/iu],
    ["lintels_applicable", /lintels\s+applicable/iu],
    ["dpc_applicable", /dpc\s+applicable/iu],
    ["masonry_reinforcement_applicable", /masonry\s+reinforcement\s+applicable/iu],
    ["work_platform_applicable", /work\s+platform\s+applicable/iu],
    ["engineering_inspection_applicable", /engineering\s+inspection\s+applicable/iu],
    ["brick_delivery_separately_priced", /brick\s+delivery\s+separately\s+priced/iu],
    ["mortar_delivery_separately_priced", /mortar\s+delivery\s+separately\s+priced/iu],
    ["waste_haul_applicable", /waste\s+haul\s+applicable/iu],
  ];
  for (const [id, label] of booleans) {
    const value = ref(text, label);
    if (value && /^(?:true|false)$/iu.test(value)) result[id] = /^true$/iu.test(value);
  }
  const corrections = structuredNumericFields(result.applicable_bond_correction_factors);
  const waste = structuredNumericFields(result.selected_project_breakage_and_waste_allowances);
  const packages = structuredNumericFields(result.supplier_package_quantities);
  if (corrections.BRICK_FACTOR !== undefined) result.brick_bond_correction_factor = corrections.BRICK_FACTOR;
  if (corrections.MORTAR_FACTOR !== undefined) result.mortar_bond_correction_factor = corrections.MORTAR_FACTOR;
  if (waste.BRICK_PERCENT !== undefined) result.brick_breakage_percent = waste.BRICK_PERCENT;
  if (waste.MORTAR_PERCENT !== undefined) result.mortar_waste_percent = waste.MORTAR_PERCENT;
  if (packages.BRICK_PIECES !== undefined) result.brick_supplier_package_pieces = packages.BRICK_PIECES;
  if (packages.MORTAR_M3 !== undefined) result.mortar_supplier_package_m3 = packages.MORTAR_M3;
  return Object.freeze(result);
}
