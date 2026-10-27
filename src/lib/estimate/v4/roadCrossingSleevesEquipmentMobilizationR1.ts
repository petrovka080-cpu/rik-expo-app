import type { AutomaticInclusionCondition, AutomaticParameterSpec, AutomaticRowSpec } from "./automaticConstructionOwnerR1";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";

/** Complete indivisible equipment units use the same AutomaticOwner graphs.
 * Actual packing/condition/routes/handling come from the complete equipment
 * documentation and load programme, not machine-hours or consumable orders.
 * Eaton IOM017 section3.2 requires appropriate transport/lifting attachments;
 * it supplies no universal vehicle, shipping mass or project capacity.
 * https://www.eaton.com/content/dam/eaton/products/filtration-solutions/filter-systems-and-strainers/filters-and-strainers/bag-filter-housing/documents/installation-and-operation-manuals/eaton-installation-operation-maintenance-manual-bag-filter-housing-us.pdf */
export const ROAD_CROSSING_SLEEVES_EQUIPMENT_MOBILIZATION_MODES_R1 = Object.freeze({
  separate: "Отдельные подтверждённые рейсы только целых полных комплектов этого оборудования и только этого направления",
  otherParty: "Это направление перевозки полностью обеспечено другой стороной без отдельной оплаты исполнителем",
  noMovement: "Отсутствие перевозки этого направления подтверждено фактическими местонахождением, распределением и условиями оборудования",
  other: "Общий рейс доставки/возврата, совместный груз, раздельные части комплектов или другая схема: отдельная ведомость перевозки",
});
type EquipmentCargo = Readonly<{
  key: string; title: string; quantityExpression: string; selected: AutomaticInclusionCondition;
  facts: readonly string[]; designationId: string;
}>;
export function buildRoadCrossingSleevesEquipmentMobilizationR1(cargos: readonly EquipmentCargo[], fullTripCostBasis: string): Readonly<{
  parameters: readonly AutomaticParameterSpec[]; rows: readonly AutomaticRowSpec[];
}> {
  const lanes = cargos.flatMap(cargo => (["inbound", "return"] as const).map(direction => {
    const key = `${cargo.key}_${direction}`, title = `${cargo.title}: ${direction === "inbound" ? "доставка к месту временного хранения на объекте" : "возврат всех комплектов после снятия от места временного хранения"}`;
    const id = (suffix: string) => `rcs_equipment_mobilization_${key}_${suffix}`;
    const selected: AutomaticInclusionCondition = { kind: "and", operands: [cargo.selected,
      { kind: "formula_greater_than", expression: cargo.quantityExpression, unitId: "piece", value: 0 }] };
    const separate: AutomaticInclusionCondition = { kind: "and", operands: [selected,
      { kind: "equals", parameterId: id("mode"), value: ROAD_CROSSING_SLEEVES_EQUIPMENT_MOBILIZATION_MODES_R1.separate }] };
    const capacity = `floor(min(${id("max_complete_units_per_trip")},${id("route_payload_kg")}/${id("shipping_kg_per_complete_unit")}))`;
    const originalFacts = [...new Set([...compileFormulaGraph(cargo.quantityExpression).inputParameterIds,
      ...cargo.facts, cargo.designationId, id("mode"), id("allocation_reference")])];
    const transportFacts = [...originalFacts, id("condition_and_load_reference"), id("vehicle_designation"), id("cost_basis"),
      id("shipping_kg_per_complete_unit"), id("route_payload_kg"), id("max_complete_units_per_trip")];
    return { cargo, key, title, id, selected, separate, capacity, originalFacts, transportFacts };
  }));
  const parameters: AutomaticParameterSpec[] = lanes.flatMap(({ title, id, selected, separate }) => [
    { id: id("mode"), title: `${title}: фактическая граница перевозки`, valueType: "enum", unitId: null,
      values: Object.values(ROAD_CROSSING_SLEEVES_EQUIPMENT_MOBILIZATION_MODES_R1), kind: "conditional", requiredWhen: selected } as AutomaticParameterSpec,
    { id: id("allocation_reference"), title: `${title}: фактические местонахождение/маршрут/направление/исключительное распределение всех комплектов и полная граница оплаты; не второй счёт за общий обратный рейс, другие грузы, аренду или монтажные перемещения`,
      valueType: "text", unitId: null, kind: "conditional", requiredWhen: selected } as AutomaticParameterSpec,
    ...[ ["condition_and_load_reference", `${title}: полные паспорта/ведомость всех частей, фактические состояние/дренирование/очистка/герметизация/тара/масса/габариты/крепление/подъём и совместимый маршрут/транспорт; разгрузка до хранения отдельно от установки, возврат после снятия, иной состав/потери требуют отдельной схемы`],
      ["vehicle_designation", `${title}: фактический совместимый полный транспортный комплект со всеми предусмотренными средствами погрузки/крепления/выгрузки и исполнителями`] ]
      .map(([suffix, caption]): AutomaticParameterSpec => ({ id: id(suffix), title: caption, valueType: "text", unitId: null, kind: "conditional", requiredWhen: separate })),
    ...[ ["shipping_kg_per_complete_unit", `${title}: подтверждённая перевозочная масса одного целого полного однородного комплекта в фактическом состоянии с тарой/частями; не масса материала и не время работы`, "kg_per_piece", 0.000_001],
      ["route_payload_kg", `${title}: фактическая допустимая полезная масса полного транспорта для этого груза/маршрута`, "kg", 0.000_001],
      ["max_complete_units_per_trip", `${title}: фактические целые полные комплекты в рейсе по размещению/габаритам/креплению; части комплекта не отдельные комплекты`, "piece", 1] ]
      .map(([suffix, caption, unit, min]): AutomaticParameterSpec => ({ id: id(String(suffix)), title: String(caption), valueType: unit === "piece" ? "integer" : "decimal",
        unitId: String(unit), min: Number(min), kind: "conditional", requiredWhen: separate })),
    { id: id("cost_basis"), title: `${title}: граница одного полного отдельного рейса только этого направления без других грузов, аренды/работы и повторного возврата техники`,
      valueType: "enum", unitId: null, values: [fullTripCostBasis], kind: "conditional", requiredWhen: separate } as AutomaticParameterSpec,
  ]);
  const rows: AutomaticRowSpec[] = lanes.flatMap(({ cargo, key, title, id, selected, separate, capacity, originalFacts, transportFacts }) => {
    const row = (suffix: string, caption: string, expression: string, unitId: string, extra: Partial<AutomaticRowSpec> = {}): AutomaticRowSpec => ({
      rowId: `rcs:equipment-mobilization:${key}:${suffix}`, formulaId: `rcs:equipment-mobilization:${key}:${suffix}`, section: title, category: "transport",
      title: caption, expression, unitId, inclusion: separate, costTreatment: "INFORMATIONAL_SCOPE", inputParameterIds: transportFacts, ...extra,
    });
    return [
      row("complete_unit_count", `${title}: исходные целые полные комплекты оборудования, включая предусмотренный резерв; не календарные/рабочие часы или закупка расходников`, cargo.quantityExpression, "piece", {
        inclusion: selected, inputParameterIds: originalFacts }),
      row("shipping_mass_kg", `${title}: фактическая полная перевозочная масса оборудования с тарой в этом направлении`, `(${cargo.quantityExpression})*${id("shipping_kg_per_complete_unit")}`, "kg"),
      row("effective_complete_units_per_trip", `${title}: целые полные комплекты в отдельном рейсе по массе/размещению`, capacity, "piece", {
        formulaOutputBounds: { schemaVersion: "canonical_formula_output_bounds_v1", unitId: "piece", minimum: 1,
          reasonRu: "Транспорт этого направления должен вмещать хотя бы один целый полный допустимый комплект с тарой/частями; ручные рейсы не исправляют несовместимость, разделённые части требуют фактической отдельной ведомости." } }),
      row("trip_count", `${title}: полные отдельные рейсы с транспортом/всеми исполнителями/энергией/погрузкой/выгрузкой и возвратом транспортного средства, без повторной работы оборудования`, `ceil((${cargo.quantityExpression})/(${capacity}))`, "trip", {
        costTreatment: "OWN_COST", procurement: true, titleParameterIds: [id("vehicle_designation")] }),
    ];
  });
  return Object.freeze({ parameters: Object.freeze(parameters), rows: Object.freeze(rows) });
}
