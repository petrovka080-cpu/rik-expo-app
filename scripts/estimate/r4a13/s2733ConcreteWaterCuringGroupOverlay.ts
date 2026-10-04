import { appendS2733WaterCuringResources, ANCHOR_WATER_CURING_TARGETS_S2733 } from "./s2733AnchorWaterCuringOverlay";
import { ANCHOR_WATER_CURING_ROWS } from "../../../src/lib/estimate/v4/anchorGroupWaterCuringResourcesS2733";
import { overlayS2732PurchaseGroup, type PurchaseGroupRepresentative } from "./s2732PurchaseGroupOverlay";
import type { CanonicalEstimateOperationReference } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition";
export const CONCRETE_WATER_CURING_NEW_TARGETS_S2733 = [
  "canonical-work:base:concrete_foundation_interior_belt_pour_high_load",
  "canonical-work:base:concrete_foundation_interior_belt_pour_large_area",
  "canonical-work:base:concrete_foundation_interior_belt_pour_repair",
  "canonical-work:base:concrete_foundation_interior_belt_pour_small_area",
  "canonical-work:base:concrete_foundation_interior_belt_pour_standard",
  "canonical-work:base:concrete_foundation_interior_belt_pour_technical_room",
  "canonical-work:base:concrete_foundation_interior_belt_pour_wet_zone",
  "canonical-work:base:concrete_foundation_interior_column_base_pour_high_load",
  "canonical-work:base:concrete_foundation_interior_column_base_pour_large_area",
  "canonical-work:base:concrete_foundation_interior_column_base_pour_repair",
  "canonical-work:base:concrete_foundation_interior_column_base_pour_small_area",
  "canonical-work:base:concrete_foundation_interior_column_base_pour_standard",
  "canonical-work:base:concrete_foundation_interior_column_base_pour_technical_room",
  "canonical-work:base:concrete_foundation_interior_column_base_pour_wet_zone",
  "canonical-work:base:concrete_foundation_interior_concrete_slab_pour_high_load",
  "canonical-work:base:concrete_foundation_interior_concrete_slab_pour_large_area",
  "canonical-work:base:concrete_foundation_interior_concrete_slab_pour_repair",
  "canonical-work:base:concrete_foundation_interior_concrete_slab_pour_small_area",
  "canonical-work:base:concrete_foundation_interior_concrete_slab_pour_standard",
  "canonical-work:base:concrete_foundation_interior_concrete_slab_pour_technical_room",
  "canonical-work:base:concrete_foundation_interior_concrete_slab_pour_wet_zone",
  "canonical-work:base:concrete_foundation_interior_pedestal_pour_high_load",
  "canonical-work:base:concrete_foundation_interior_pedestal_pour_large_area",
  "canonical-work:base:concrete_foundation_interior_pedestal_pour_repair",
  "canonical-work:base:concrete_foundation_interior_pedestal_pour_small_area",
  "canonical-work:base:concrete_foundation_interior_pedestal_pour_standard",
  "canonical-work:base:concrete_foundation_interior_pedestal_pour_technical_room",
  "canonical-work:base:concrete_foundation_interior_pedestal_pour_wet_zone",
  "canonical-work:base:concrete_foundation_interior_pile_cap_pour_high_load",
  "canonical-work:base:concrete_foundation_interior_pile_cap_pour_large_area",
  "canonical-work:base:concrete_foundation_interior_pile_cap_pour_repair",
  "canonical-work:base:concrete_foundation_interior_pile_cap_pour_small_area",
  "canonical-work:base:concrete_foundation_interior_pile_cap_pour_standard",
  "canonical-work:base:concrete_foundation_interior_pile_cap_pour_technical_room",
  "canonical-work:base:concrete_foundation_interior_pile_cap_pour_wet_zone",
  "canonical-work:base:concrete_foundation_interior_reinforcement_frame_pour_high_load",
  "canonical-work:base:concrete_foundation_interior_reinforcement_frame_pour_large_area",
  "canonical-work:base:concrete_foundation_interior_reinforcement_frame_pour_repair",
  "canonical-work:base:concrete_foundation_interior_reinforcement_frame_pour_small_area",
  "canonical-work:base:concrete_foundation_interior_reinforcement_frame_pour_standard",
  "canonical-work:base:concrete_foundation_interior_reinforcement_frame_pour_technical_room",
  "canonical-work:base:concrete_foundation_interior_reinforcement_frame_pour_wet_zone",
  "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_high_load",
  "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_large_area",
  "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_small_area",
  "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_technical_room",
  "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_wet_zone",
  "canonical-work:base:concrete_foundation_interior_stairs_concrete_pour_high_load",
  "canonical-work:base:concrete_foundation_interior_stairs_concrete_pour_large_area",
  "canonical-work:base:concrete_foundation_interior_stairs_concrete_pour_repair",
  "canonical-work:base:concrete_foundation_interior_stairs_concrete_pour_small_area",
  "canonical-work:base:concrete_foundation_interior_stairs_concrete_pour_standard",
  "canonical-work:base:concrete_foundation_interior_stairs_concrete_pour_technical_room",
  "canonical-work:base:concrete_foundation_interior_stairs_concrete_pour_wet_zone",
  "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_high_load",
  "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_repair",
  "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_small_area",
  "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_standard",
  "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_technical_room",
  "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_wet_zone"
] as const;
export const CONCRETE_WATER_CURING_GROUP_TARGETS_S2733: readonly string[] = [...CONCRETE_WATER_CURING_NEW_TARGETS_S2733, ...ANCHOR_WATER_CURING_TARGETS_S2733];
const operations = {
  supply: ["Поставка бетонной смеси", "Состав смеси, заказной объём, поставка и приёмка подтверждены по проекту и производственной ведомости."],
  placement: ["Укладка и уплотнение бетонной смеси", "Смесь уложена и уплотнена выбранным способом; труд и применимая техника определены по производственной ведомости."],
  finishing: ["Отделка поверхности бетона", "Поверхность отделана по проектным требованиям; способ и трудозатраты подтверждены."],
  curing: ["Уход за бетоном", "Выбранный способ ухода обеспечен материалами, трудом и применимым оборудованием; условия и завершение подтверждены по проекту."],
  heating: ["Зимний прогрев бетона", "Применимость и проектная схема прогрева подтверждены; кабель, труд и оборудование предусмотрены до окончания прогрева."],
  control: ["Приёмочный контроль бетонирования", "Предусмотренный проектом контроль выполнен и оформлен журналом бетонирования."],
  joint: ["Герметизация рабочего шва", "Применимый рабочий шов выполнен с выбранной гидрошпонкой и её монтажом по проекту."],
} as const;
const rowOperations: Record<string, keyof typeof operations> = {
  "material:concrete:ready-mix": "supply", "delivery:concrete:ready-mix": "supply",
  "work:concrete:place-and-compact": "placement", "equipment:concrete:pump": "placement", "equipment:concrete:crane-bucket": "placement", "equipment:concrete:deep-vibrator": "placement",
  "work:concrete:finish-surface": "finishing", "material:concrete:curing-membrane": "curing", "work:concrete:cure": "curing",
  ...Object.fromEntries(Object.values(ANCHOR_WATER_CURING_ROWS).map(id => [id, "curing" as const])),
  "material:concrete:winter-heating-cable": "heating", "work:concrete:winter-heating": "heating", "equipment:concrete:heating-transformer": "heating",
  "service:concrete:acceptance-control": "control", "material:concrete:construction-joint-waterstop": "joint", "work:concrete:construction-joint-waterstop-install": "joint",
};

/** Sixty actual missing water branches plus the six delivered anchors whose
 * operation references must cover the whole composition. Never add water twice
 * or rebuild any old physical owner from newer TypeScript family exports. */
export function overlayS2733ConcreteWaterCuringGroup(parent: PurchaseGroupRepresentative, waterNormativeLocatorId: string) {
  const catalogId = String(parent.definition.catalog_id);
  if (!CONCRETE_WATER_CURING_GROUP_TARGETS_S2733.includes(catalogId)) throw new Error("S2733_CONCRETE_WATER_FINITE_SCOPE");
  const groupTitleRu = String(parent.passport.physical_result_ru);
  const existing = ANCHOR_WATER_CURING_TARGETS_S2733.includes(catalogId);
  if (existing && (parent.resources.length !== 19 || Object.values(ANCHOR_WATER_CURING_ROWS).some(id => !parent.resources.some(r => r.row_id === id))))
    throw new Error("S2733_CONCRETE_WATER_DELIVERED_ANCHOR_DRIFT");
  const purchase = existing ? null : overlayS2732PurchaseGroup(parent, { concretePlacementOwners: true });
  const overlay = existing ? { representative: structuredClone(parent), targetRowIds: [], addedParameterIds: [], addedFormulaIds: [] }
    : appendS2733WaterCuringResources(purchase!.representative, waterNormativeLocatorId, { catalogIds: CONCRETE_WATER_CURING_NEW_TARGETS_S2733,
      groupId: catalogId, groupTitleRu, applicabilityRu: `Уход водой по утверждённому проектному способу. Участок работ: ${groupTitleRu}. Объём воды и применимость комплекта и доставки не выводятся только из м³ бетона.` });
  const representative = overlay.representative;
  representative.resources = representative.resources.map(row => {
    const operationId = rowOperations[String(row.row_id)];
    if (!operationId) throw new Error(`S2733_CONCRETE_OPERATION_OWNER_MISSING:${row.row_id}`);
    const operation: CanonicalEstimateOperationReference = { contractVersion: "canonical-operation-resource/v1", groupId: catalogId, groupTitleRu,
      operationId, operationTitleRu: operations[operationId][0], completionCriterionRu: operations[operationId][1] };
    return { ...row, resource_graph: { ...row.resource_graph, operationCompositionV1: operation } };
  });
  return { ...overlay, representative, targetRowIds: representative.resources.map(row => String(row.row_id)),
    addedParameterIds: [...(purchase?.addedParameterIds ?? []), ...overlay.addedParameterIds],
    changedFormulaIds: purchase?.changedFormulaIds ?? [], newWaterBranch: !existing };
}
