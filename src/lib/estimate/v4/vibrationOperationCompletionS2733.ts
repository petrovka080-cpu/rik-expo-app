import { buildAutomaticConstructionOwnerR1, type AutomaticInclusionCondition, type AutomaticParameterSpec, type AutomaticRowSpec } from "./automaticConstructionOwnerR1";
import { CONCRETE_SLAB_VIBRATION_SOURCE_ID, CONCRETE_SLAB_VIBRATION_SOURCE_METADATA } from "./concreteSlabVibrationR1";
import { effectivePurchaseBalanceExpressionsR1 } from "./effectivePurchaseBalanceR1";

export const VIBRATION_COMPLETION_S2733_CONTRACT = "vibration-operation-completion:s27-33.v1";
export const VIBRATION_COMPLETION_ROWS = {
  equipment: "equipment:concrete:internal-vibrator",
  includedKit: "material:concrete:vibration-equipment-included-kit",
  separateKit: "material:concrete:vibration-equipment-separate-kit",
  pileCapLabor: "work:concrete:pile-cap-vibration-labor-composition",
  placementDelivery: "delivery:concrete:vibration-equipment-and-kits",
} as const;
const pricingId = "vibration_equipment_accessories_pricing_mode";
const specificationId = "vibration_equipment_accessories_specification";
const countId = "vibration_equipment_accessories_set_count";
const parameter = (id: string, title: string, valueType: AutomaticParameterSpec["valueType"], unitId: string | null,
  requiredWhen: AutomaticInclusionCondition, extra: Partial<AutomaticParameterSpec> = {}): AutomaticParameterSpec =>
  ({ id, title, valueType, unitId, kind: "conditional", requiredWhen, ...extra });

/** Direct, compatible project equipment BOM. ACI remains method guidance;
 * existing labor/equipment hours and mobilization are owned by the predecessor. */
export function buildVibrationOperationCompletionS2733(catalogId: string, volumeWorkOwnerRowId?: string,
  placementOwner?: { machineHoursParameterId: "deep_vibrator_machine_h" | "placement_deep_vibrator_machine_h";
    equipmentOwnerRowId: "equipment:concrete:deep-vibrator" }) {
  const machineHoursId = placementOwner?.machineHoursParameterId ?? "internal_vibrator_machine_h";
  const equipment: AutomaticInclusionCondition = { kind: "greater_than", parameterId: machineHoursId, value: 0 };
  const selected = (mode: string): AutomaticInclusionCondition => ({ kind: "and", operands: [equipment,
    { kind: "equals", parameterId: pricingId, value: mode }] });
  const kit: AutomaticInclusionCondition = { kind: "or", operands: ["INCLUDED_IN_EQUIPMENT_RATE", "SEPARATE_SUPPLY"].map(selected) };
  const delivery: AutomaticInclusionCondition = { kind: "and", operands: [equipment,
    { kind: "equals", parameterId: "vibration_equipment_delivery_mode", value: "SEPARATE_CONFIRMED_TRIPS" }] };
  const balance = effectivePurchaseBalanceExpressionsR1({ ownerRowId: VIBRATION_COMPLETION_ROWS.separateKit,
    orderUnitId: "set", consumed: countId, stock: "0", reserve: "0", quantum: "1" });
  const rows: AutomaticRowSpec[] = ["INCLUDED_IN_EQUIPMENT_RATE", "SEPARATE_SUPPLY"].map(mode => {
    const separate = mode === "SEPARATE_SUPPLY";
    return { rowId: separate ? VIBRATION_COMPLETION_ROWS.separateKit : VIBRATION_COMPLETION_ROWS.includedKit,
      formulaId: `vibration_equipment_accessories_${separate ? "separate" : "included"}_v1`, expression: countId,
      section: "Виброуплотнение бетона", category: "material",
      title: `Принадлежности и расходники вибратора, ${separate ? "отдельная поставка" : "включены в цену оборудования"}`,
      unitId: "set", procurement: separate, costTreatment: separate ? "OWN_COST" : "INCLUDED_IN_RESOURCE_ROWS",
      inclusion: selected(mode), inputParameterIds: separate ? [specificationId] : [specificationId, countId], titleParameterIds: [specificationId],
      ...(separate ? { purchaseBalance: balance.owner.purchaseBalance } : {}) };
  });
  // The delivered pile-cap work is paid per m3 and had no labor takeoff.
  // Disclose actual hours within that same work price; never charge them again.
  if (volumeWorkOwnerRowId) rows.push({ rowId: VIBRATION_COMPLETION_ROWS.pileCapLabor,
    formulaId: "pile_cap_vibration_labor_composition_v1", expression: "vibration_worker_h", section: "Виброуплотнение бетона",
    category: "construction_work", title: "Фактический состав труда, включённый в стоимость виброуплотнения ростверка в м³",
    unitId: "man_hour", procurement: false, costTreatment: "INCLUDED_IN_RESOURCE_ROWS" });
  if (placementOwner) rows.push({ rowId: VIBRATION_COMPLETION_ROWS.placementDelivery,
    formulaId: "placement_vibration_equipment_delivery_v1", expression: "vibration_equipment_delivery_trip_count",
    section: "Виброуплотнение бетона", category: "delivery", title: "Подтверждённая доставка и возврат вибратора с комплектами", unitId: "trip",
    procurement: true, inclusion: delivery, inputParameterIds: ["vibration_equipment_delivery_reference"], titleParameterIds: ["vibration_equipment_delivery_reference"],
    manualTransportQuantityPolicy: { unitId: "trip", minimum: "calculated_quantity", integer: true } });
  const addition = buildAutomaticConstructionOwnerR1({ contract: VIBRATION_COMPLETION_S2733_CONTRACT, semanticOwner: catalogId,
    sourceId: CONCRETE_SLAB_VIBRATION_SOURCE_ID, normId: "approved-project-vibration-equipment-component-bom",
    sourceMetadata: { ...CONCRETE_SLAB_VIBRATION_SOURCE_METADATA, artifact_sha256: CONCRETE_SLAB_VIBRATION_SOURCE_METADATA.definition_hash },
    applicabilityRu: "Фактическая комплектность применяемого вибратора, включая необходимые принадлежности и расходники по проектной ведомости и условиям цены; без универсальных коэффициентов.",
    ordinary: [], profile: [], deferMissingProjectFactsToRows: true, excludedUnownedAssumptions: [],
    conditional: [
      parameter(machineHoursId, "Машино-часы по существующей проектной ведомости", "decimal", "machine_hour", equipment),
      parameter(pricingId, "Принадлежности и расходники вибратора: не нужны дополнительные изделия, включены в цену или поставляются отдельно", "enum", null, equipment,
        { values: ["NOT_REQUIRED", "INCLUDED_IN_EQUIPMENT_RATE", "SEPARATE_SUPPLY"] }),
      parameter(specificationId, "Состав одного комплекта вибратора: конкретные изделия, расходники, совместимость и количество каждого по проекту", "text", null, kit),
      parameter(countId, "Фактическое число одинаковых комплектов принадлежностей и расходников вибратора", "integer", "set", kit, { min: 1 }),
      ...(placementOwner ? [
        parameter("vibration_equipment_specification", "Выбранный вибратор, совместимая головка и комплект по утверждённому способу уплотнения", "text", null, equipment),
        parameter("vibration_equipment_price_scope_reference", "Состав действующих ставок: энергия и оборудование, часы оператора в существующем труде укладки, принадлежности и поставка без повторной оплаты", "text", null, equipment),
        parameter("vibration_equipment_delivery_mode", "Вибратор и комплекты: доставка включена в ставку или отдельно подтверждена", "enum", null, equipment,
          { values: ["INCLUDED_IN_EQUIPMENT_RATE", "SEPARATE_CONFIRMED_TRIPS"] }),
        parameter("vibration_equipment_delivery_reference", "Подтверждённая поставка и возврат вибратора с комплектами, водитель и маршрут", "text", null, equipment),
        parameter("vibration_equipment_delivery_trip_count", "Подтверждённое целое число отдельно оплачиваемых рейсов вибратора и комплектов", "integer", "trip", delivery, { min: 1 }),
      ] : []),
      ...(volumeWorkOwnerRowId ? [{ id: "vibration_worker_h", title: "Фактические трудозатраты по ведомости, включённые в оплату виброуплотнения ростверка в м³",
        valueType: "decimal" as const, unitId: "man_hour", kind: "conditional" as const, min: 0.001 }] : []),
    ], rows });
  return { ...addition, formulas: addition.formulas.map((f, i) => ({ ...f, expression_source: rows[i]!.expression, output_unit_id: rows[i]!.unitId })),
    resources: addition.resources.map(r => ({ ...r, resource_graph: { ...r.resource_graph,
      ...(r.row_id === VIBRATION_COMPLETION_ROWS.includedKit ? { includedInResourceOwnerRowId: placementOwner?.equipmentOwnerRowId ?? VIBRATION_COMPLETION_ROWS.equipment } : {}),
      ...(r.row_id === VIBRATION_COMPLETION_ROWS.pileCapLabor ? { includedInResourceOwnerRowId: volumeWorkOwnerRowId } : {}) } as Record<string, unknown>,
      source_metadata: { ...r.source_metadata, universal_consumption_claimed: false, universal_productivity_claimed: false,
        quantity_basis: "APPROVED_PROJECT_METHOD_STATEMENT_AND_EQUIPMENT_SCHEDULE" } })) };
}
