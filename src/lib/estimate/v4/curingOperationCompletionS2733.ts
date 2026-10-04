import { buildAutomaticConstructionOwnerR1, type AutomaticInclusionCondition, type AutomaticParameterSpec, type AutomaticRowSpec } from "./automaticConstructionOwnerR1";
import { CONCRETE_SLAB_CURING_SOURCE_ID, CONCRETE_SLAB_CURING_SOURCE_METADATA } from "./concreteSlabCuringR1";
import { effectivePurchaseBalanceExpressionsR1 } from "./effectivePurchaseBalanceR1";

export const CURING_COMPLETION_S2733_CONTRACT = "curing-operation-completion:s27-33.v1";
export const CURING_COMPLETION_ROWS = {
  water: "material:concrete:curing-water",
  equipment: "equipment:concrete:curing-application",
  includedKit: "material:concrete:curing-application-included-kit",
  separateKit: "material:concrete:curing-application-separate-kit",
  delivery: "delivery:concrete:curing-water",
} as const;
const water: AutomaticInclusionCondition = { kind: "or", operands: ["WATER_CURING", "WET_COVERING"].map(value => ({ kind: "equals", parameterId: "approved_external_curing_method", value })) };
// The existing curing schema has a boolean selector. The inclusion graph
// already supports boolean equality; retain that exact domain representation.
const equipment: AutomaticInclusionCondition = { kind: "and", operands: [
  { kind: "equals", parameterId: "application_equipment_required", value: true as unknown as string },
  { kind: "greater_than", parameterId: "application_equipment_machine_h", value: 0 },
] };
const delivery: AutomaticInclusionCondition = { kind: "and", operands: [water,
  { kind: "equals", parameterId: "curing_water_delivery_mode", value: "SEPARATE_DELIVERY" }] };
const kit = (value: string): AutomaticInclusionCondition => ({ kind: "and", operands: [equipment,
  { kind: "equals", parameterId: "application_equipment_accessories_pricing_mode", value }] });
const parameter = (id: string, title: string, valueType: AutomaticParameterSpec["valueType"], unitId: string | null,
  requiredWhen: AutomaticInclusionCondition, extra: Partial<AutomaticParameterSpec> = {}): AutomaticParameterSpec =>
  ({ id, title, valueType, unitId, kind: "conditional", requiredWhen, ...extra });

/** Complete the existing standalone curing operation. Old methods, labor,
 * material takeoff and application equipment stay in the delivered owner.
 * This adds actual accessory BOM and selected separate water transport only. */
export function buildCuringOperationCompletionS2733(catalogId: string) {
  const balance = effectivePurchaseBalanceExpressionsR1({ ownerRowId: CURING_COMPLETION_ROWS.water,
    orderUnitId: "m3", consumed: "curing_water_m3", stock: "0", reserve: "0",
    quantityMode: "canonical_decimal", balanceScope: "new_order_vs_required_consumption" });
  const kitBalance = effectivePurchaseBalanceExpressionsR1({ ownerRowId: CURING_COMPLETION_ROWS.separateKit,
    orderUnitId: "set", consumed: "application_equipment_accessories_set_count", stock: "0", reserve: "0", quantum: "1" });
  const rows: AutomaticRowSpec[] = [
    // Only its balance metadata/internal quantity are attached to the old water
    // owner by the overlay; its existing resource and formula are not replaced.
    { rowId: CURING_COMPLETION_ROWS.water, formulaId: "curing_completion_water_owner_v1", expression: "curing_water_m3",
      section: "Уход за бетоном", category: "material", title: "Вода для ухода за бетоном", unitId: "m3", procurement: true,
      inclusion: water, effectiveQuantityOutput: balance.owner.effectiveQuantityOutput, purchaseBalance: balance.owner.purchaseBalance },
    ...["INCLUDED_IN_EQUIPMENT_RATE", "SEPARATE_SUPPLY"].map((mode): AutomaticRowSpec => ({
      rowId: mode === "SEPARATE_SUPPLY" ? CURING_COMPLETION_ROWS.separateKit : CURING_COMPLETION_ROWS.includedKit,
      formulaId: mode === "SEPARATE_SUPPLY" ? "curing_completion_separate_kit_v1" : "curing_completion_included_kit_v1",
      expression: "application_equipment_accessories_set_count", section: "Уход за бетоном", category: "material",
      title: mode === "SEPARATE_SUPPLY" ? "Отдельно поставляемые принадлежности оборудования для ухода" : "Принадлежности, включённые в комплект оборудования для ухода",
      unitId: "set", procurement: mode === "SEPARATE_SUPPLY", inclusion: kit(mode),
      costTreatment: mode === "SEPARATE_SUPPLY" ? "OWN_COST" : "INCLUDED_IN_RESOURCE_ROWS",
      ...(mode === "SEPARATE_SUPPLY" ? { purchaseBalance: kitBalance.owner.purchaseBalance } : {}),
      inputParameterIds: ["application_equipment_accessories_specification"], titleParameterIds: ["application_equipment_accessories_specification"],
    })),
    { rowId: CURING_COMPLETION_ROWS.delivery, formulaId: "curing_completion_water_delivery_v1",
      expression: `ceil(${balance.effective}/curing_water_delivery_capacity_m3)`, section: "Обеспечение ухода водой", category: "delivery",
      title: "Отдельная доставка воды для ухода за бетоном", unitId: "trip", procurement: true, inclusion: delivery,
      inputParameterIds: ["curing_water_delivery_vehicle_specification"], titleParameterIds: ["curing_water_delivery_vehicle_specification"],
      manualTransportQuantityPolicy: { unitId: "trip", minimum: "calculated_quantity", integer: true } },
  ];
  const addition = buildAutomaticConstructionOwnerR1({ contract: CURING_COMPLETION_S2733_CONTRACT, semanticOwner: catalogId,
    sourceId: CONCRETE_SLAB_CURING_SOURCE_ID, normId: "approved-project-curing-accessory-bom-and-water-transport",
    sourceMetadata: { ...CONCRETE_SLAB_CURING_SOURCE_METADATA, artifact_sha256: CONCRETE_SLAB_CURING_SOURCE_METADATA.definition_hash },
    applicabilityRu: "Принадлежности и логистика утверждённого способа ухода: фактическая комплектность оборудования и принятый заказ воды, без новых коэффициентов расхода и производительности.",
    ordinary: [], profile: [], deferMissingProjectFactsToRows: true, excludedUnownedAssumptions: [],
    conditional: [
      // Existing numeric inputs are declared for builder validation only. The
      // overlay keeps their delivered definitions byte-for-byte.
      parameter("curing_water_m3", "Вода по существующей проектной ведомости", "decimal", "m3", water),
      parameter("application_equipment_machine_h", "Машино-часы по существующей ведомости", "decimal", "machine_hour", equipment),
      parameter("application_equipment_accessories_pricing_mode", "Принадлежности включены в цену оборудования или поставляются отдельно", "enum", null, equipment,
        { values: ["INCLUDED_IN_EQUIPMENT_RATE", "SEPARATE_SUPPLY"] }),
      parameter("application_equipment_accessories_specification", "Комплектация оборудования по ведомости: изделия, совместимость и фактические количества", "text", null, equipment),
      parameter("application_equipment_accessories_set_count", "Фактическое число комплектов принадлежностей", "integer", "set", equipment, { min: 1 }),
      parameter("curing_water_delivery_mode", "Вода на объекте или отдельная поставка", "enum", null, water, { values: ["ON_SITE_SUPPLY", "SEPARATE_DELIVERY"] }),
      parameter("curing_water_delivery_vehicle_specification", "Перевозка воды с водителем и возвратом, без стоимости воды", "text", null, delivery),
      parameter("curing_water_delivery_capacity_m3", "Полезный объём воды в рейсе по выбранному транспорту", "decimal", "m3", delivery, { min: 0.001 }),
    ], rows,
  });
  return { ...addition, formulas: addition.formulas.map((f, index) => ({ ...f, expression_source: rows[index]!.expression, output_unit_id: rows[index]!.unitId })),
    resources: addition.resources.map(r => ({ ...r, resource_graph: { ...r.resource_graph,
      ...(r.row_id === CURING_COMPLETION_ROWS.includedKit ? { includedInResourceOwnerRowId: CURING_COMPLETION_ROWS.equipment } : {}) } as Record<string, unknown>,
      source_metadata: { ...r.source_metadata, universal_consumption_claimed: false, universal_productivity_claimed: false,
        quantity_basis: "APPROVED_PROJECT_CURING_METHOD_AND_DIRECT_PROJECT_SCHEDULE" } })) };
}
