import { compileFormulaGraph } from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import { stringifyCanonicalEstimateJson } from "../../../src/lib/estimate/estimateDeterministicHash";
import type { PurchaseGroupRepresentative } from "./s2732PurchaseGroupOverlay";

const prefix = "canonical-work:base:concrete_foundation_interior_";
const families = ["anchor_group", "belt", "column_base", "concrete_slab", "formwork", "joint", "pedestal", "pile_cap", "reinforcement_frame", "slab_foundation", "stairs_concrete", "strip_foundation"];
const contexts = ["standard", "high_load", "large_area", "repair", "small_area", "technical_room", "wet_zone"];
export const FORMWORK_MATERIAL_PURCHASE_TARGETS_S2733 = families.flatMap(family => contexts.map(context => `${prefix}${family}_form_${context}`));
const frami = ["perforated-tape-50x2", "joint-sealing-tape", "release-agent"].map(id => `material:formwork:${id}`);
const reinforcement = ["steel-approved-schedule", "binding-wire", "spacer-chairs", "mechanical-couplers"].map(id => `material:reinforcement:${id}`);
const placement = ["ready-mix", "curing-membrane", "winter-heating-cable"].map(id => `material:concrete:${id}`);
const stairs = ["stairs-risers-edges", "stairs-release-agent", "stairs-consumables"].map(id => `material:formwork:${id}`);
const stairsVibration = ["concrete-stairs-vibration:03:material:electricity", "concrete-stairs-vibration:04:consumable:cleaning-water", "concrete-stairs-vibration:04:consumable:brush", "concrete-stairs-vibration:04:consumable:wipes"];
const unitIds: Readonly<Record<string, string>> = {
  ...Object.fromEntries(frami.map((id, i) => [id, i === 2 ? "l" : "m"])),
  ...Object.fromEntries(reinforcement.map((id, i) => [id, i < 2 ? "kg" : "piece"])),
  ...Object.fromEntries(placement.map((id, i) => [id, ["m3", "m2", "m"][i]])),
  "material:concrete:construction-joint-waterstop": "m",
  "material:formwork:dokaflex-project-fixings": "kg", "material:formwork:dokaflex-release-agent": "l",
  ...Object.fromEntries(["slab-embedded-items", "slab-embedded-items-welding-consumables", "slab-embedded-items-temporary-support", "slab-embedded-items-coating"].map(id => [`material:concrete:${id}`, "kg"])),
  ...Object.fromEntries(stairs.map((id, i) => [id, ["m", "l", "kg"][i]])),
  ...Object.fromEntries(["joint-premolded-filler", "joint-backer-rod", "joint-sealant", "joint-waterstop", "joint-edge-profile", "joint-load-transfer-devices", "joint-edge-reinforcement"].map((id, i) => [`material:concrete:${id}`, ["m", "m", "l", "m", "m", "piece", "kg"][i]])),
  ...Object.fromEntries(stairsVibration.map((id, i) => [id, ["kwh", "m3", "item", "item"][i]])),
  ...Object.fromEntries(["curing-water", "wet-curing-covering", "impervious-curing-sheet", "membrane-curing-compound"].map((id, i) => [`material:concrete:${id}`, ["m3", "m2", "m2", "l"][i]])),
};
const same = (left: unknown, right: unknown) => stringifyCanonicalEstimateJson(left) === stringifyCanonicalEstimateJson(right);
function invariant(value: unknown, code: string): asserts value { if (!value) throw new Error(`S2733_FORMWORK_MATERIAL_SCOPE:${code}`); }

/** Delivered, finite source profiles only. Electricity is an energy service,
 * not an invented stock/supplier package; rental piece-days are not purchases. */
export function formworkMaterialPurchaseScopeS2733(parent: PurchaseGroupRepresentative) {
  const id = String(parent.definition.catalog_id);
  invariant(FORMWORK_MATERIAL_PURCHASE_TARGETS_S2733.includes(id), "FINITE_SCOPE");
  const suffix = id.slice(prefix.length), family = suffix.split("_form_")[0], context = suffix.split("_form_")[1];
  const standardStairs = family === "stairs_concrete" && context === "standard";
  const slab = family === "concrete_slab", stair = family === "stairs_concrete", frame = family === "reinforcement_frame", joint = family === "joint";
  const shape = slab ? [72, 174] : standardStairs ? [76, 136] : stair ? [43, 94] : frame ? [16, 37] : joint ? [15, 44] : [24, 52];
  invariant(parent.resources.length === shape[0] && parent.parameters.length === shape[1], "DELIVERED_SHAPE_DRIFT");
  const expected = slab ? [...placement, ...reinforcement, "material:formwork:dokaflex-project-fixings", "material:formwork:dokaflex-release-agent",
    ...["slab-embedded-items", "slab-embedded-items-welding-consumables", "slab-embedded-items-temporary-support", "slab-embedded-items-coating"].map(id => `material:concrete:${id}`)]
    : standardStairs ? [placement[0], placement[2], "material:concrete:construction-joint-waterstop", ...reinforcement, ...stairs, ...stairsVibration,
      ...["curing-water", "wet-curing-covering", "impervious-curing-sheet", "membrane-curing-compound"].map(id => `material:concrete:${id}`)]
      : stair ? [...placement, ...reinforcement, ...stairs] : frame ? reinforcement : joint ?
        ["joint-premolded-filler", "joint-backer-rod", "joint-sealant", "joint-waterstop", "joint-edge-profile", "joint-load-transfer-devices", "joint-edge-reinforcement"].map(id => `material:concrete:${id}`) : frami;
  const materialRows = parent.resources.filter(row => row.category === "material");
  invariant(same(materialRows.map(row => String(row.row_id)), expected), "MATERIAL_IDENTITY_DRIFT");
  invariant(materialRows.every(row => row.unit_id === unitIds[row.row_id] && row.row_type === "material" && row.procurement_eligible
    && (!row.resource_graph.costTreatment || row.resource_graph.costTreatment === "OWN_COST")
    && !row.resource_graph.purchaseBalanceV1 && !row.resource_graph.purchaseBalanceOwnerRowId), "MATERIAL_OWNER_UNIT_DRIFT");
  const formulas = new Map(parent.formulas.map(f => [String(f.formula_id), f]));
  const volume = slab ? "slab_concrete_volume_m3" : stair ? "stairs_concrete_volume_m3" : null;
  const expressions: Record<string, string> = {};
  const targetRows = materialRows.filter(row => row.row_id !== stairsVibration[0]);
  for (const row of targetRows) {
    const f = formulas.get(String(row.formula_id)); invariant(f, "MATERIAL_FORMULA_MISSING");
    const expression = row.row_id === placement[0] ? `${volume}*(1+placement_selected_contingency_percent/100)` : String(f.expression_source);
    invariant(same(compileFormulaGraph(expression).ast, f.ast), `PERSISTED_AST_DRIFT:${row.row_id}`);
    expressions[row.row_id] = expression;
  }
  const deliveries: { rowId: string; ownerRowId: string; unitId: string; distanceParameterId: string; unitFactor: string }[] = [];
  for (const [rowId, ownerRowId, unitId, distanceParameterId, unitFactor] of [
    ...(volume ? [["delivery:concrete:ready-mix", placement[0], "m3_km", "placement_concrete_delivery_distance_km", "1"]] : []),
    ...(slab || stair || frame ? [["delivery:reinforcement:steel", reinforcement[0], "t_km", frame ? "reinforcement_delivery_distance_km" : "reinforcement_reinforcement_delivery_distance_km", "1000"]] : []),
  ]) {
    const row = parent.resources.find(r => r.row_id === rowId), f = row && formulas.get(String(row.formula_id));
    const expectedExpression = unitFactor === "1" ? `${expressions[ownerRowId]}*${distanceParameterId}` : `${expressions[ownerRowId]}/${unitFactor}*${distanceParameterId}`;
    invariant(row && f && row.unit_id === unitId && same(f.ast, compileFormulaGraph(expectedExpression).ast), `DELIVERY_SOURCE_DRIFT:${rowId}`);
    deliveries.push({ rowId, ownerRowId, unitId, distanceParameterId, unitFactor });
  }
  return { targetRowIds: targetRows.map(row => String(row.row_id)), expressions, volumeParameterId: volume, deliveries };
}
