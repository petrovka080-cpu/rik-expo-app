import { createHash } from "node:crypto";
import { compileFormulaGraph } from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import { buildAutomaticConstructionOwnerR1 } from "../../../src/lib/estimate/v4/automaticConstructionOwnerR1";
import { effectivePurchaseBalanceExpressionsR1, effectiveResourceQuantityParameterId } from "../../../src/lib/estimate/v4/effectivePurchaseBalanceR1";
import { stringifyCanonicalEstimateJson } from "../../../src/lib/estimate/estimateDeterministicHash";
import type { CanonicalPublisherJson as Json } from "./canonicalDefinitionPublisherR1";

export const S2732_PURCHASE_GROUP_CONTRACT = "rik-expo-app.s27-32.material-purchase-group.v1";
const anchorPrefix = "canonical-work:base:concrete_foundation_interior_anchor_group_pour_";
const anchors = ["standard", "large_area", "repair", "small_area", "technical_room", "wet_zone"];
const anchorRows = ["ready-mix", "curing-membrane", "winter-heating-cable", "construction-joint-waterstop"].map(id => `material:concrete:${id}`);
export const S2732_PURCHASE_GROUP_ROWS: Readonly<Record<string, readonly string[]>> = {
  "canonical-work:base:paving_roads_landscape_interior_asphalt_install_large_area": [
    "asphalt:material:hot-dense-fine-mix", "asphalt:material:road-bitumen", "asphalt:material:technical-kerosene", "asphalt:material:hardwood-side-stop-bars"],
  ...Object.fromEntries(anchors.map(id => [anchorPrefix + id, anchorRows])),
  "canonical-work:expanded:bridge_asphalt": [
    "bridge:waterproofing:primer", "bridge:waterproofing:membrane-rolls", "bridge:waterproofing:lpg",
    "bridge:screed:reinforcement-mesh-cards", "bridge:screed:binding-wire", "bridge:screed:spacer-packages",
    "bridge:screed:edge-form", "bridge:screed:formwork-screw-boxes", "bridge:screed:formwork-stakes", "bridge:screed:formwork-braces",
    "bridge:screed:form-oil", "bridge:asphalt:continuous-tack-emulsion", "bridge:leveling:ready-mix",
    "bridge:drainage:tubes", "bridge:drainage:briquettes", "bridge:drainage:sealant-packages",
    "bridge:joint:sealant-packages", "bridge:joint:primer", "bridge:joint:backer-cord-coils"],
  "canonical-work:expanded:pumping_station": [
    "blinding", "structural_concrete", "reinforcement", "formwork", "waterproofing", "imported_backfill",
    "suction_manifold", "discharge_manifold", "isolation_valves", "check_valves", "dismantling_joints", "flanged_joint_sets",
    "earthing", "power_cable", "cable_tray", "cable_terminations", "embedded_parts", "nonshrink_grout",
    "mechanical_consumables", "electrical_consumables", "curing_compound", "test_water", "disinfection_reagent"].map(id => `rc09:wps_${id}`),
  "canonical-work:expanded:booster_pumping_station": [
    "suction_manifold", "discharge_manifold", "flanged_joint_sets", "anchors", "nonshrink_grout", "power_cable",
    "cable_terminations", "earthing", "cable_tray", "mechanical_consumables", "electrical_consumables", "test_water", "disinfection_reagent"].map(id => `rc09:bps_${id}`),
};

export type PurchaseGroupRepresentative = {
  definition: Json; parameters: Json[]; formulas: Json[]; resources: Json[]; baseline: Json; passport: Json; bindings: Json[];
};
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(`S2732_PURCHASE_GROUP:${message}`); }
function hash(value: unknown): string { return createHash("sha256").update(stringifyCanonicalEstimateJson(value)).digest("hex"); }

/** Exact stable row identities only. The original DB definition supplies the
 * calculation and inclusion boundaries; this migration inserts no norms. */
export function overlayS2732PurchaseGroup(parent: PurchaseGroupRepresentative) {
  const result: PurchaseGroupRepresentative = structuredClone(parent);
  const catalogId = String(parent.definition.catalog_id);
  const targets = S2732_PURCHASE_GROUP_ROWS[catalogId];
  invariant(targets, `UNKNOWN_CATALOG:${catalogId}`);
  invariant(parent.parameters.every(p => p.default_value == null), `NON_NULL_DEFAULT:${catalogId}`);
  const resources = new Map(result.resources.map(r => [String(r.row_id), r]));
  const formulas = new Map(result.formulas.map(f => [String(f.formula_id), f]));
  const changedFormulas = new Set<string>();
  const effective = (rowId: string) => effectiveResourceQuantityParameterId(rowId);
  const originalExpression = (rowId: string): string => {
    const row = resources.get(rowId);
    invariant(row && formulas.has(row.formula_id), `RESOURCE_OR_FORMULA_MISSING:${rowId}`);
    return String(formulas.get(row.formula_id)!.expression_source);
  };
  const replaceFormula = (rowId: string, expression: string, sharedRows: readonly string[] = [rowId]) => {
    const row = resources.get(rowId);
    invariant(row, `LINKED_ROW_MISSING:${rowId}`);
    const original = formulas.get(row.formula_id)!;
    // A shared formula must never change an unrelated physical work row.
    const actualSharedRows = result.resources.filter(r => r.formula_id === row.formula_id).map(r => String(r.row_id)).sort();
    invariant(JSON.stringify(actualSharedRows) === JSON.stringify([...sharedRows].sort()), `SHARED_LINKED_FORMULA:${rowId}`);
    const graph = compileFormulaGraph(expression);
    Object.assign(original, { expression_source: expression, ast: graph.ast, input_parameter_ids: graph.inputParameterIds, ast_sha256: hash(graph.ast) });
    changedFormulas.add(String(original.formula_id));
  };
  for (const rowId of targets) {
    const row = resources.get(rowId);
    invariant(row && row.procurement_eligible && row.row_type === "material"
      && (!row.resource_graph.costTreatment || row.resource_graph.costTreatment === "OWN_COST")
      && !row.resource_graph.purchaseBalanceV1 && !row.resource_graph.purchaseBalanceOwnerRowId, `TARGET_OWNER_DRIFT:${rowId}`);
    const expression = originalExpression(rowId);
    const unit = String(row.unit_id);
    const cable = rowId === "rc09:wps_power_cable" ? "wps" : rowId === "rc09:bps_power_cable" ? "bps" : null;
    const quantum = ["pcs", "piece", "set", "roll", "package"].includes(unit);
    const selectedContingency = catalogId.startsWith(anchorPrefix) && rowId === "material:concrete:ready-mix";
    const balance = cable
      ? effectivePurchaseBalanceExpressionsR1({ ownerRowId: rowId, orderUnitId: unit,
        consumed: `${cable}_power_cable_route_length_m*(1+${cable}_cable_expected_loss_fraction)`,
        stock: `${cable}_cable_available_stock_m`, reserve: `${cable}_cable_retained_spare_m`, quantum: `${cable}_cable_supplier_drum_length_m` })
      : quantum
        ? effectivePurchaseBalanceExpressionsR1({ ownerRowId: rowId, orderUnitId: unit, consumed: expression, stock: "0", reserve: "0", quantum: "1" })
        : effectivePurchaseBalanceExpressionsR1({ ownerRowId: rowId, orderUnitId: unit, consumed: expression, stock: "0", reserve: "0",
          quantityMode: "canonical_decimal", balanceScope: "new_order_vs_required_consumption" });
    row.resource_graph = { ...row.resource_graph, effectiveQuantityOutputV1: balance.owner.effectiveQuantityOutput,
      purchaseBalanceV1: { ...balance.owner.purchaseBalance, ...(!cable ? {
        balanceScope: "new_order_vs_required_consumption", requirementBasis: selectedContingency ? "selected_order_including_contingency" : "selected_supply_order",
        plannedConsumptionExpression: selectedContingency ? "plan_dimension_concrete_volume_m3" : expression,
      } : {}) } };
    if (cable) {
      replaceFormula(`rc09:${cable}-cable-balance:drum-count`, balance.packages!);
      replaceFormula(`rc09:${cable}-cable-balance:remainder`, balance.remaining);
      replaceFormula(`rc09:${cable}-cable-balance:surplus-beyond-spare`, balance.free);
    }
  }
  if (catalogId.startsWith(anchorPrefix)) {
    replaceFormula("delivery:concrete:ready-mix", `${effective("material:concrete:ready-mix")}*concrete_delivery_distance_km`);
  } else if (catalogId.endsWith("asphalt_install_large_area")) {
    const order = effective("asphalt:material:hot-dense-fine-mix");
    replaceFormula("asphalt:delivery:truck-trips", `ceil(${order}/truck_capacity_t)`, ["asphalt:delivery:truck-trips", "asphalt:quality:mix-temperature"]);
    replaceFormula("asphalt:delivery:ton-km", `${order}*haul_distance_km`);
    replaceFormula("asphalt:delivery:truck-machine-hours", `ceil(${order}/truck_capacity_t)*(2*haul_distance_km/truck_average_speed_km_h+truck_turnaround_h)`);
  } else if (catalogId === "canonical-work:expanded:bridge_asphalt") {
    replaceFormula("bridge:waterproofing:membrane-purchased-area", `${effective("bridge:waterproofing:membrane-rolls")}*bridge_membrane_roll_area_m2`);
    replaceFormula("bridge:screed:reinforcement-mesh-purchased-area", `${effective("bridge:screed:reinforcement-mesh-cards")}*bridge_mesh_card_length_m*bridge_mesh_card_width_m`);
    replaceFormula("bridge:screed:reinforcement-delivery", `ceil((${effective("bridge:screed:reinforcement-mesh-cards")}*bridge_mesh_card_weight_kg+${effective("bridge:screed:binding-wire")})/1000/bridge_reinforcement_truck_capacity_t)`);
  }
  const equipmentDelivery = catalogId === "canonical-work:expanded:pumping_station";
  const equipmentDeliveryParameter = "wps_equipment_delivery_trip_count";
  if (equipmentDelivery) {
    const legacy = resources.get("rc09:logistics:wps-material-delivery")!;
    invariant(legacy && legacy.unit_id === "trip", "WPS_LEGACY_DELIVERY_DRIFT");
    // The predecessor added m3 and pump pieces. Preserve its identity for
    // history, exclude that invalid aggregate, and give distinct services new
    // cost identities so an old mixed-service price cannot silently migrate.
    legacy.inclusion_ast = { kind: "literal", value: false };
    legacy.procurement_eligible = false;
    legacy.resource_graph = { ...legacy.resource_graph, payable: false, costTreatment: "INFORMATIONAL_SCOPE", costOwner: "scope",
      supersededMixedDimensionalDelivery: true };
    for (const [suffix, title, expression, inputIds] of [
      ["concrete-delivery", "Доставка бетонных материалов: конструкционный бетон и бетонная подготовка",
        `ceil((${effective("rc09:wps_structural_concrete")}+${effective("rc09:wps_blinding")})/wps_delivery_capacity_m3_per_trip)`, ["wps_delivery_capacity_m3_per_trip"]],
      ["equipment-delivery", "Доставка насосов и оборудования по подтверждённому плану перевозки", equipmentDeliveryParameter, [equipmentDeliveryParameter]],
    ] as const) {
      const rowId = `rc09:logistics:wps-${suffix}`;
      const formulaId = `wps_${suffix.replaceAll("-", "_")}_s2732`;
      const graph = compileFormulaGraph(expression);
      result.formulas.push({ ...formulas.get(legacy.formula_id), formula_id: formulaId, expression_source: expression,
        ast: graph.ast, input_parameter_ids: graph.inputParameterIds, ast_sha256: hash(graph.ast) });
      changedFormulas.add(formulaId);
      result.resources.push({ ...legacy, row_id: rowId, ordinal: Math.max(...result.resources.map(r => Number(r.ordinal))) + 1,
        title_ru: title, formula_id: formulaId, semantic_owner: rowId, cost_owner_id: rowId, procurement_eligible: true,
        inclusion_ast: { kind: "literal", value: true },
        source_metadata: { ...legacy.source_metadata, logisticsSplitContract: S2732_PURCHASE_GROUP_CONTRACT },
        resource_graph: { ...legacy.resource_graph, formulaId, semanticOwnerId: rowId, payable: true,
          costTreatment: "OWN_COST", costOwner: "resource", inputParameterIds: [...inputIds],
          manualTransportQuantityPolicyV1: { unitId: "trip", minimum: "calculated_quantity", integer: true },
          scopeContextParameterIds: ["wps_station_count"], supersededMixedDimensionalDelivery: false } });
    }
  }
  const source = parent.resources[0]!.source_metadata;
  const internal = buildAutomaticConstructionOwnerR1({ contract: S2732_PURCHASE_GROUP_CONTRACT, semanticOwner: catalogId,
    sourceId: S2732_PURCHASE_GROUP_CONTRACT, normId: "compiler-derived-order-not-a-norm",
    sourceMetadata: { source_title: source.source_title ?? catalogId, source_document_version: source.source_document_version ?? S2732_PURCHASE_GROUP_CONTRACT,
      definition_hash: parent.definition.definition_sha256, exact_locator: "MASTER S27.32 §20.34.4: confirmed effective material order",
      artifact_sha256: parent.definition.definition_sha256 },
    applicabilityRu: "Внутреннее принятое количество существующего ресурса; не новая норма или проектное исходное значение.",
    ordinary: [], profile: [], conditional: equipmentDelivery ? [{ id: equipmentDeliveryParameter,
      title: "Подтверждённое число рейсов насосов и оборудования по плану перевозки", kind: "conditional", valueType: "integer", unitId: "trip", min: 1 }] : [],
    deferMissingProjectFactsToRows: true, excludedUnownedAssumptions: [],
    rows: targets.map(rowId => ({ rowId, formulaId: rowId, expression: "0", section: "Internal", category: "material",
      title: String(resources.get(rowId)!.title_ru), unitId: String(resources.get(rowId)!.unit_id),
      effectiveQuantityOutput: { parameterId: effective(rowId), unitId: String(resources.get(rowId)!.unit_id) } })),
  }).parameters;
  const existingIds = new Set(parent.parameters.map(p => String(p.parameter_id)));
  invariant(internal.every(p => !existingIds.has(p.parameter_id)), "EFFECTIVE_PARAMETER_COLLISION");
  result.parameters.push(...internal.map((p, index) => ({ ...p, ordinal: Math.max(...parent.parameters.map(p => Number(p.ordinal))) + 1 + index })));
  if (equipmentDelivery) {
    const fact = result.parameters.find(p => p.parameter_id === equipmentDeliveryParameter)!;
    fact.constraints_json = { ...fact.constraints_json, requiredWhen: { kind: "greater_than", parameterId: "wps_station_count", value: 0 } };
    fact.truth_metadata = { ...fact.truth_metadata, guide: { ...fact.truth_metadata.guide,
      source_role: "PROJECT_DOCUMENTATION", source_document: "Требуется подтверждённый план перевозки поставщика или проектной логистики",
      source_locator: "Насосы и оборудование станции: фактические отдельные рейсы, выбранный транспорт и маршрут",
      applicability: "Отдельная перевозка насосов и оборудования; объём бетона и условная вместимость бетонной доставки это число не определяют.",
      guide_short_ru: "Укажите целое число рейсов по подтверждённому плану перевозки насосов и оборудования. План пока не предоставлен; расчёт не подставляет число рейсов.",
    } };
  }
  for (const p of result.parameters) {
    const id = String(p.parameter_id);
    const consumers = result.formulas.filter(f => f.input_parameter_ids.includes(id)).map(f => String(f.formula_id));
    p.truth_metadata.formula_consumers = consumers;
    result.baseline.formula_consumer_ids[id] = consumers;
    if (!existingIds.has(id)) {
      const rows = result.resources.filter(r => consumers.includes(r.formula_id)).map(r => String(r.row_id));
      p.truth_metadata.resource_branch_consumers = rows;
      result.baseline.resource_consumer_row_ids[id] = rows;
      result.baseline.uom_by_parameter[id] = p.unit_id;
      result.baseline.normative_source_ids[id] = [];
      result.baseline.guide_provenance_ru[id] = p.truth_metadata.guide.guide_short_ru;
    }
  }
  result.baseline.parameter_schema_sha256 = hash(result.parameters.map(p => ({ parameterId: p.parameter_id, unitId: p.unit_id,
    valueType: p.value_type, constraints: p.constraints_json, truth: p.truth_metadata })));
  invariant(result.resources.length === parent.resources.length + (equipmentDelivery ? 2 : 0)
    && result.formulas.length === parent.formulas.length + (equipmentDelivery ? 2 : 0), "COMPOSITION_CHANGED");
  return { representative: result, targetRowIds: [...targets], addedParameterIds: internal.map(p => p.parameter_id), changedFormulaIds: [...changedFormulas] };
}
