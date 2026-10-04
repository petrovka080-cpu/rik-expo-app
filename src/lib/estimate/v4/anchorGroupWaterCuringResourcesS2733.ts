import { buildAutomaticConstructionOwnerR1, type AutomaticInclusionCondition, type AutomaticParameterSpec, type AutomaticRowSpec } from "./automaticConstructionOwnerR1";
import { CONCRETE_SLAB_CURING_SOURCE_ID, CONCRETE_SLAB_CURING_SOURCE_METADATA } from "./concreteSlabCuringR1";
import { effectivePurchaseBalanceExpressionsR1 } from "./effectivePurchaseBalanceR1";

export const ANCHOR_WATER_CURING_S2733_CONTRACT = "anchor-group-water-curing-resources:s27-33.v1";
export const ANCHOR_WATER_CURING_ROWS = {
  water: "material:concrete:curing-water",
  equipment: "equipment:concrete:curing-water-application",
  accessories: "material:concrete:curing-water-application-kit",
  delivery: "delivery:concrete:curing-water",
} as const;
const water: AutomaticInclusionCondition = { kind: "equals", parameterId: "curing_method", value: "water" };
const equipment: AutomaticInclusionCondition = { kind: "and", operands: [water,
  { kind: "equals", parameterId: "curing_water_equipment_required", value: "REQUIRED" }] };
const delivery: AutomaticInclusionCondition = { kind: "and", operands: [water,
  { kind: "equals", parameterId: "curing_water_delivery_mode", value: "SEPARATE_DELIVERY" }] };
const parameter = (id: string, title: string, valueType: AutomaticParameterSpec["valueType"], unitId: string | null,
  requiredWhen: AutomaticInclusionCondition, extra: Partial<AutomaticParameterSpec> = {}): AutomaticParameterSpec =>
  ({ id, title, valueType, unitId, kind: "conditional", requiredWhen, ...extra });

/** Water curing is already selectable in six delivered pour definitions but
 * had no water resource. Reuse the established direct project takeoff contract;
 * ACI is a method/specification source, never a universal m3-per-m3 coefficient.
 * No sample concrete-slab quantities or high-load profile values are borrowed. */
export function buildAnchorGroupWaterCuringResourcesS2733(catalogId: string) {
  const balance = effectivePurchaseBalanceExpressionsR1({ ownerRowId: ANCHOR_WATER_CURING_ROWS.water,
    orderUnitId: "m3", consumed: "curing_water_m3", stock: "0", reserve: "0",
    quantityMode: "canonical_decimal", balanceScope: "new_order_vs_required_consumption" });
  const rows: AutomaticRowSpec[] = [
      { rowId: ANCHOR_WATER_CURING_ROWS.water, formulaId: "anchor_curing_water_order_v1", expression: "curing_water_m3",
        section: "Уход за бетоном", category: "material", title: "Вода для ухода за бетоном по подтверждённому способу", unitId: "m3", procurement: true, inclusion: water,
        inputParameterIds: ["curing_water_source_reference"], titleParameterIds: ["curing_water_source_reference"],
        effectiveQuantityOutput: balance.owner.effectiveQuantityOutput, purchaseBalance: { ...balance.owner.purchaseBalance,
          requirementBasis: "selected_supply_order", plannedConsumptionExpression: "curing_water_m3" } },
      { rowId: ANCHOR_WATER_CURING_ROWS.equipment, formulaId: "anchor_curing_water_equipment_v1", expression: "curing_water_equipment_machine_h",
        section: "Уход за бетоном", category: "equipment", title: "Комплект подачи воды и увлажнения без воды и персонала", unitId: "machine_hour", procurement: true, inclusion: equipment,
        inputParameterIds: ["curing_water_equipment_designation", "curing_water_equipment_kit_specification", "curing_water_equipment_set_count"], titleParameterIds: ["curing_water_equipment_designation"] },
      { rowId: ANCHOR_WATER_CURING_ROWS.accessories, formulaId: "anchor_curing_water_kit_v1", expression: "curing_water_equipment_set_count",
        section: "Уход за бетоном", category: "material", title: "Принадлежности выбранного комплекта, включённые в стоимость оборудования", unitId: "set", inclusion: equipment,
        costTreatment: "INCLUDED_IN_RESOURCE_ROWS", inputParameterIds: ["curing_water_equipment_kit_specification"], titleParameterIds: ["curing_water_equipment_kit_specification"] },
      { rowId: ANCHOR_WATER_CURING_ROWS.delivery, formulaId: "anchor_curing_water_delivery_v1",
        expression: `ceil(${balance.effective}/curing_water_delivery_capacity_m3)`,
        section: "Уход за бетоном", category: "delivery", title: "Отдельная доставка воды для ухода за бетоном", unitId: "trip", procurement: true, inclusion: delivery,
        inputParameterIds: ["curing_water_delivery_vehicle_specification"], titleParameterIds: ["curing_water_delivery_vehicle_specification"],
        manualTransportQuantityPolicy: { unitId: "trip", minimum: "calculated_quantity", integer: true } },
    ];
  const definition = buildAutomaticConstructionOwnerR1({ contract: ANCHOR_WATER_CURING_S2733_CONTRACT, semanticOwner: catalogId,
    sourceId: CONCRETE_SLAB_CURING_SOURCE_ID, normId: "approved-project-water-curing-takeoff",
    sourceMetadata: { ...CONCRETE_SLAB_CURING_SOURCE_METADATA, artifact_sha256: CONCRETE_SLAB_CURING_SOURCE_METADATA.definition_hash },
    applicabilityRu: "Уход водой за забетонированной анкерной группой по подтверждённому проектному способу; объём воды, комплект и источник не выводятся только из м³ бетона.",
    ordinary: [{ id: "curing_method", title: "Способ ухода за бетоном", valueType: "enum", unitId: null,
      kind: "ordinary", values: ["membrane", "water"] }],
    profile: [], deferMissingProjectFactsToRows: true, excludedUnownedAssumptions: [],
    conditional: [
      parameter("curing_water_m3", "Полный объём воды по ведомости утверждённого способа ухода", "decimal", "m3", water, { min: 0.001 }),
      parameter("curing_water_source_reference", "Подтверждённый источник и требуемое качество воды для ухода", "text", null, water),
      parameter("curing_water_equipment_required", "Нужен ли отдельный комплект для подачи воды и увлажнения", "enum", null, water, { values: ["REQUIRED", "NOT_REQUIRED"] }),
      parameter("curing_water_equipment_designation", "Выбранный комплект подачи воды и увлажнения, с включённой энергией и принадлежностями, без воды и персонала", "text", null, equipment),
      parameter("curing_water_equipment_machine_h", "Машино-часы выбранного комплекта по ведомости способа ухода, без трудозатрат персонала", "decimal", "machine_hour", equipment, { min: 0.001 }),
      parameter("curing_water_equipment_kit_specification", "Принадлежности выбранного комплекта по подтверждённой комплектации: рукава, соединения, устройства увлажнения и их фактические количества", "text", null, equipment),
      parameter("curing_water_equipment_set_count", "Фактическое число комплектов с подтверждёнными принадлежностями", "integer", "set", equipment, { min: 1 }),
      parameter("curing_water_delivery_mode", "Источник поставки воды: на объекте или отдельная доставка", "enum", null, water, { values: ["ON_SITE_SUPPLY", "SEPARATE_DELIVERY"] }),
      parameter("curing_water_delivery_vehicle_specification", "Выбранная перевозка воды с включённым персоналом и возвратом, без стоимости самой воды", "text", null, delivery),
      parameter("curing_water_delivery_capacity_m3", "Полезный объём воды в рейсе по паспорту выбранного транспорта", "decimal", "m3", delivery, { min: 0.001 }),
    ],
    rows,
  });
  return { ...definition, formulas: definition.formulas.map((formula, index) => ({ ...formula,
    expression_source: rows[index]!.expression, output_unit_id: rows[index]!.unitId })), resources: definition.resources.map(row => ({ ...row,
    resource_graph: { ...row.resource_graph,
      ...(row.row_id === ANCHOR_WATER_CURING_ROWS.accessories ? { includedInResourceOwnerRowId: ANCHOR_WATER_CURING_ROWS.equipment } : {}) },
    source_metadata: { ...row.source_metadata, universal_productivity_claimed: false, universal_consumption_claimed: false,
      quantity_basis: "APPROVED_PROJECT_CURING_METHOD_AND_DIRECT_PROJECT_SCHEDULE" },
  })) };
}
