import { buildAutomaticConstructionOwnerR1, type AutomaticInclusionCondition, type AutomaticOwnerDefinition, type AutomaticParameterSpec, type AutomaticRowSpec } from "./automaticConstructionOwnerR1";
import { effectiveResourceQuantityParameterId, reconcileDeclaredPurchaseBalanceRowsR1 } from "./effectivePurchaseBalanceR1";
import { ROAD_CROSSING_SLEEVES_EFFECTIVE_BALANCES_R1 } from "./roadCrossingSleevesEffectivePurchaseBalancesR1";
import { ROAD_CROSSING_SLEEVES_QUANTITY_PARAMETERS_R1, ROAD_CROSSING_SLEEVES_QUANTITY_EXPRESSIONS_R1 as quantities } from "./roadCrossingSleevesQuantityModelR1";
import { ROAD_CROSSING_SLEEVES_SPACER_PARAMETERS_R1, ROAD_CROSSING_SLEEVES_SPACER_GEOMETRY_ROWS_R1 } from "./roadCrossingSleevesSpacerGeometryR1";
import { ROAD_CROSSING_SLEEVES_PROCUREMENT_PARAMETERS_R1, ROAD_CROSSING_SLEEVES_PROCUREMENT_ROWS_R1 } from "./roadCrossingSleevesProcurementR1";
import { ROAD_CROSSING_SLEEVES_CIVIL_PARAMETERS_R1, ROAD_CROSSING_SLEEVES_CIVIL_ROWS_R1,
  ROAD_CROSSING_SLEEVES_CIVIL_EXPRESSIONS_R1 as civil, ROAD_CROSSING_SLEEVES_CIVIL_METHODS_R1 as methods } from "./roadCrossingSleevesCivilGeometryR1";
import { ROAD_CROSSING_SLEEVES_JOINT_RESOURCE_PARAMETERS_R1, ROAD_CROSSING_SLEEVES_JOINT_RESOURCE_ROWS_R1 } from "./roadCrossingSleevesJointResourcesR1";
import { ROAD_CROSSING_SLEEVES_CASING_MATERIAL_PARAMETERS_R1, ROAD_CROSSING_SLEEVES_CASING_MATERIAL_ROWS_R1,
  ROAD_CROSSING_SLEEVES_CARRIER_PARAMETERS_R1, ROAD_CROSSING_SLEEVES_CARRIER_ROWS_R1,
  ROAD_CROSSING_SLEEVES_CARRIER_SUPPLY_MODES_R1 as carrierSupplyModes, ROAD_CROSSING_SLEEVES_CARRIER_EXPRESSIONS_R1 as carrierQuantities } from "./roadCrossingSleevesCasingMaterialR1";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { buildRoadCrossingSleevesWaterTreatmentResourcesR1, roadCrossingSleevesWaterTreatmentParameterId as waterTreatmentId } from "./roadCrossingSleevesWaterTreatmentR1";
import { buildRoadCrossingSleevesEquipmentMobilizationR1 } from "./roadCrossingSleevesEquipmentMobilizationR1";
import { ROAD_CROSSING_SLEEVES_SHORING_PARAMETERS_R1, ROAD_CROSSING_SLEEVES_SHORING_ROWS_R1,
  ROAD_CROSSING_SLEEVES_SHORING_CARGOS_R1, roadCrossingSleevesShoringParameterId as shoringId } from "./roadCrossingSleevesShoringR1";
import { buildRoadCrossingSleevesShoringConsumablesR1 } from "./roadCrossingSleevesShoringConsumablesR1";
import { ROAD_CROSSING_SLEEVES_REACTION_PARAMETERS_R1, ROAD_CROSSING_SLEEVES_REACTION_ROWS_R1, ROAD_CROSSING_SLEEVES_REACTION_CARGO_R1,
  roadCrossingSleevesReactionParameterId as reactionId } from "./roadCrossingSleevesReactionR1";
import { buildRoadCrossingSleevesServiceWasteR1 } from "./roadCrossingSleevesServiceWasteR1";
import { ROAD_CROSSING_SLEEVES_SHORING_GAP_PARAMETERS_R1, ROAD_CROSSING_SLEEVES_SHORING_GAP_ROWS_R1,
  ROAD_CROSSING_SLEEVES_SHORING_GAP_CARGOS_R1 } from "./roadCrossingSleevesShoringGapFillR1";
import { ROAD_CROSSING_SLEEVES_BEDDING_PARAMETERS_R1, ROAD_CROSSING_SLEEVES_BEDDING_ROWS_R1,
  ROAD_CROSSING_SLEEVES_BEDDING_APPLICABILITY_R1 } from "./roadCrossingSleevesBeddingMaterialR1";
import { ROAD_CROSSING_SLEEVES_PIT_RETURN_PARAMETERS_R1, ROAD_CROSSING_SLEEVES_PIT_RETURN_ROWS_R1,
  ROAD_CROSSING_SLEEVES_PIT_RETURN_EXPRESSIONS_R1 } from "./roadCrossingSleevesPitReturnFillR1";
import { ROAD_CROSSING_SLEEVES_PIT_FILL_PARAMETERS_R1, ROAD_CROSSING_SLEEVES_PIT_FILL_ROWS_R1,
  ROAD_CROSSING_SLEEVES_TRENCH_FILL_PARAMETERS_R1, ROAD_CROSSING_SLEEVES_TRENCH_FILL_ROWS_R1,
  ROAD_CROSSING_SLEEVES_PIT_FILL_APPLICABILITY_R1, ROAD_CROSSING_SLEEVES_TRENCH_FILL_APPLICABILITY_R1,
  ROAD_CROSSING_SLEEVES_TRENCH_FILL_EXPRESSIONS_R1 } from "./roadCrossingSleevesPitFillMaterialR1";
import { ROAD_CROSSING_SLEEVES_INTERNAL_FILL_PARAMETERS_R1, ROAD_CROSSING_SLEEVES_INTERNAL_FILL_ROWS_R1,
  ROAD_CROSSING_SLEEVES_INTERNAL_FILL_APPLICABILITY_R1, ROAD_CROSSING_SLEEVES_INTERNAL_FILL_EXPRESSIONS_R1,
  ROAD_CROSSING_SLEEVES_INTERNAL_WATER_PARAMETERS_R1, ROAD_CROSSING_SLEEVES_INTERNAL_WATER_ROWS_R1 } from "./roadCrossingSleevesInternalFillR1";
export { ROAD_CROSSING_SLEEVES_WATER_TREATMENT_MODES_R1, ROAD_CROSSING_SLEEVES_WATER_TREATMENT_RENTAL_BASIS_R1,
  ROAD_CROSSING_SLEEVES_WATER_TREATMENT_BAG_BASIS_R1, ROAD_CROSSING_SLEEVES_WATER_TREATMENT_WASTE_MODES_R1,
  ROAD_CROSSING_SLEEVES_WATER_TREATMENT_WASTE_TRIP_BASIS_R1, ROAD_CROSSING_SLEEVES_WATER_TREATMENT_WASTE_RECEIVING_MODES_R1,
  ROAD_CROSSING_SLEEVES_WATER_TREATMENT_WASTE_RECEIVING_BASIS_R1 } from "./roadCrossingSleevesWaterTreatmentR1";
export { ROAD_CROSSING_SLEEVES_EQUIPMENT_MOBILIZATION_MODES_R1 } from "./roadCrossingSleevesEquipmentMobilizationR1";
export { ROAD_CROSSING_SLEEVES_SHORING_MODES_R1, ROAD_CROSSING_SLEEVES_SHORING_RENTAL_BASIS_R1,
  ROAD_CROSSING_SLEEVES_SHORING_WORK_BASES_R1 } from "./roadCrossingSleevesShoringR1";
export { ROAD_CROSSING_SLEEVES_SHORING_CONSUMABLE_MODES_R1, ROAD_CROSSING_SLEEVES_SHORING_CONSUMABLE_BASIS_R1 } from "./roadCrossingSleevesShoringConsumablesR1";
export { ROAD_CROSSING_SLEEVES_SHORING_GAP_MODES_R1, ROAD_CROSSING_SLEEVES_SHORING_GAP_SUPPLY_MODES_R1,
  ROAD_CROSSING_SLEEVES_SHORING_GAP_WORK_MODES_R1, ROAD_CROSSING_SLEEVES_SHORING_GAP_BASES_R1 } from "./roadCrossingSleevesShoringGapFillR1";
export { ROAD_CROSSING_SLEEVES_REACTION_MODES_R1, ROAD_CROSSING_SLEEVES_REACTION_RENTAL_BASIS_R1, ROAD_CROSSING_SLEEVES_REACTION_WORK_BASES_R1 } from "./roadCrossingSleevesReactionR1";
export { ROAD_CROSSING_SLEEVES_SERVICE_WASTE_MODES_R1, ROAD_CROSSING_SLEEVES_SERVICE_WASTE_TRIP_BASIS_R1,
  ROAD_CROSSING_SLEEVES_SERVICE_WASTE_RECEIVING_MODES_R1, ROAD_CROSSING_SLEEVES_SERVICE_WASTE_RECEIVING_BASIS_R1 } from "./roadCrossingSleevesServiceWasteR1";

/** Execution arithmetic is part of this assembly, not a separate estimator.
 * PJA describes separate pits and an advancing excavation/jacking system:
 * https://pipejacking.org/about_pipe_jacking . It supplies NO project rate.
 * Selected method/equipment facts must account for ground, access and capacity.
 * Operator person-hours are in the crew row only; energy is in equipment only.
 */
export const ROAD_CROSSING_SLEEVES_CIVIL_EXECUTION_COST_BASES_R1 = Object.freeze({
  crew: "Все исполнители этой операции, включая операторов; без техники, энергии и материалов",
  equipment: "Без всех исполнителей; топливо и энергия включены; без доставки, креплений и водоотведения",
});
/** Loading/positioning a physical section is not drive metres or supplier
 * packaging. PJA describes placing pipes on the aligned thrust-pit rails:
 * https://pipejacking.org/about_pipe_jacking . Actual lifting capacity, access
 * and disjoint loading/advancement boundaries remain project evidence. */
export const ROAD_CROSSING_SLEEVES_JACKING_LOADING_MODES_R1 = Object.freeze({
  included: "Загрузка и установка секций на направляющие включены в выбранные ресурсы проходки без отдельной оплаты",
  separate: "Загрузка и установка секций на направляющие оплачиваются отдельно и исключены из ресурсов проходки",
  otherParty: "Загрузка и установка секций выполняются другой стороной без оплаты исполнителем и исключены из ресурсов проходки",
});
const JACKING_LOADING_MODE = "rcs_jacking_section_loading_cost_mode";
const JACKING_LOADING_REFERENCE = "rcs_jacking_section_loading_allocation_reference";
const METHOD_ID = "rcs_civil_installation_method";
const jackingLoadingScope: AutomaticInclusionCondition = { kind: "equals", parameterId: METHOD_ID, value: methods.pipeJacking };
const civilExecutionWorks = [
  { key: "open_cut", title: "Разработка открытой траншеи", method: methods.openCut, unit: "m3",
    expression: civil.open_cut_excavation_m3,
    facts: ["rcs_crossing_length_m", "rcs_open_cut_excavation_width_m", "rcs_open_cut_excavation_depth_m"] },
  { key: "jacking_pits", title: "Разработка стартового и приёмного котлованов", method: methods.pipeJacking, unit: "m3",
    expression: `(${civil.jacking_thrust_pit_excavation_m3})+(${civil.jacking_reception_pit_excavation_m3})`,
    facts: ["rcs_jacking_thrust_excavation_length_m", "rcs_jacking_thrust_excavation_width_m", "rcs_jacking_thrust_excavation_depth_m",
      "rcs_jacking_reception_excavation_length_m", "rcs_jacking_reception_excavation_width_m", "rcs_jacking_reception_excavation_depth_m"] },
  { key: "jacking_advance", title: "Проходка и продавливание футляра одним выбранным комплектом", method: methods.pipeJacking, unit: "m",
    expression: "rcs_crossing_length_m",
    facts: ["rcs_crossing_length_m", "rcs_jacking_confirmed_excavation_diameter_mm", "rcs_casing_outside_diameter_mm"] },
] as const;
const executionId = (key: string, suffix: string) => `rcs_civil_${key}_${suffix}`;
export const ROAD_CROSSING_SLEEVES_CIVIL_EXECUTION_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze(
  civilExecutionWorks.flatMap(work => {
    const requiredWhen = { parameterId: METHOD_ID, value: work.method };
    const text = (suffix: string, title: string): AutomaticParameterSpec => ({
      id: executionId(work.key, suffix), title, kind: "conditional", valueType: "text", unitId: null, requiredWhen,
    });
    const basis = (suffix: string, title: string, value: string): AutomaticParameterSpec => ({
      id: executionId(work.key, suffix), title, kind: "conditional", valueType: "enum", unitId: null, values: [value], requiredWhen,
    });
    const rate = (suffix: string, title: string, unitId: string): AutomaticParameterSpec => ({
      id: executionId(work.key, suffix), title, kind: "conditional", valueType: "decimal", unitId, min: 0, requiredWhen,
    });
    return [
      text("method_reference", `${work.title}: выбранная применимая технологическая карта с условиями грунта и доступа`),
      text("crew_designation", `${work.title}: все исполнители, включая операторов техники`),
      rate("crew_h_per_unit", `${work.title}: суммарные человеко-часы по выбранной технологии на ${work.unit === "m3" ? "м³ грунта в естественном состоянии" : "метр проходки"}`, `man_hour_per_${work.unit}`),
      basis("crew_cost_basis", `${work.title}: граница отдельной стоимости труда`, ROAD_CROSSING_SLEEVES_CIVIL_EXECUTION_COST_BASES_R1.crew),
      text("equipment_designation", `${work.title}: фактический совместимый комплект техники, не случайная машина по диаметру`),
      rate("equipment_h_per_unit", `${work.title}: часы выбранного комплекта по технологии на ${work.unit === "m3" ? "м³ грунта в естественном состоянии" : "метр проходки"}`, `machine_hour_per_${work.unit}`),
      basis("equipment_cost_basis", `${work.title}: граница отдельной стоимости техники`, ROAD_CROSSING_SLEEVES_CIVIL_EXECUTION_COST_BASES_R1.equipment),
    ];
  }),
);
export const ROAD_CROSSING_SLEEVES_CIVIL_EXECUTION_ROWS_R1: readonly AutomaticRowSpec[] = Object.freeze(
  civilExecutionWorks.flatMap(work => (["crew", "equipment"] as const).map(owner => ({
    rowId: `rcs:civil-execution:${work.key}:${owner}_hours`, formulaId: `rcs:civil-execution:${work.key}:${owner}_hours`,
    section: `Выполнение: ${work.title}`, category: owner === "crew" ? "labor" : "equipment",
    title: owner === "crew" ? `${work.title}: суммарный труд всех исполнителей` : `${work.title}: выбранный комплект техники с энергией`,
    unitId: owner === "crew" ? "man_hour" : "machine_hour",
    expression: `(${work.expression})*${executionId(work.key, `${owner}_h_per_unit`)}`,
    inclusion: { kind: "equals" as const, parameterId: METHOD_ID, value: work.method }, procurement: true,
    titleParameterIds: [executionId(work.key, `${owner}_designation`)],
    inputParameterIds: [METHOD_ID, ...work.facts, executionId(work.key, "method_reference"),
      ...(work.key === "jacking_advance" ? [JACKING_LOADING_MODE, JACKING_LOADING_REFERENCE, reactionId("mode"), reactionId("allocation_reference")] : []),
      executionId(work.key, `${owner}_designation`), executionId(work.key, `${owner}_cost_basis`)],
  }))),
);

/** Placing/compaction belongs to installed finished geometry, including reuse.
 * Supplied loose stock, purchase packages, retained reserve and order surplus
 * are NOT work quantities. Project methods and actual disjoint rates remain
 * explicit; missing supply ratio/order facts need not block known execution.
 */
const fillExecutionWorks: readonly Readonly<{ key: string; title: string; expression: string;
  inclusion: AutomaticInclusionCondition; facts: readonly string[]; basisRu?: string }>[] = [
  { key: "bedding", title: "Укладка и уплотнение зернистого основания", expression: civil.open_cut_full_width_bedding_m3,
    inclusion: ROAD_CROSSING_SLEEVES_BEDDING_APPLICABILITY_R1,
    facts: ["rcs_crossing_length_m", "rcs_open_cut_excavation_width_m", "rcs_open_cut_full_width_bedding_thickness_m", "rcs_bedding_granular_product_designation"] },
  { key: "pits", title: "Укладка и уплотнение выбранной засыпки обоих котлованов", expression: ROAD_CROSSING_SLEEVES_PIT_RETURN_EXPRESSIONS_R1.total_remaining_space_m3,
    inclusion: ROAD_CROSSING_SLEEVES_PIT_FILL_APPLICABILITY_R1,
    facts: [...new Set(ROAD_CROSSING_SLEEVES_PIT_RETURN_ROWS_R1.flatMap(row => row.inputParameterIds ?? [])), "rcs_pit_fill_granular_product_designation"] },
  { key: "trench", title: "Укладка и уплотнение выбранной засыпки траншеи", expression: ROAD_CROSSING_SLEEVES_TRENCH_FILL_EXPRESSIONS_R1.net_remaining_space_m3,
    inclusion: ROAD_CROSSING_SLEEVES_TRENCH_FILL_APPLICABILITY_R1,
    facts: ["rcs_crossing_length_m", "rcs_open_cut_excavation_width_m", "rcs_open_cut_excavation_depth_m",
      "rcs_open_cut_full_width_bedding_thickness_m", "rcs_casing_outside_diameter_mm", "rcs_trench_fill_other_permanent_occupied_volume_m3", "rcs_trench_fill_granular_product_designation"] },
  { key: "internal", title: "Смешивание и размещение выбранной смеси внутри футляра", expression: ROAD_CROSSING_SLEEVES_INTERNAL_FILL_EXPRESSIONS_R1.net_fill_m3,
    inclusion: ROAD_CROSSING_SLEEVES_INTERNAL_FILL_APPLICABILITY_R1,
    basisRu: "готового внутреннего заполнения; смешивание и размещение со всеми процессными потерями по выбранной технологии, без оплаты сухого резерва и упаковок",
    facts: ["rcs_crossing_length_m", "rcs_casing_inside_diameter_mm", "rcs_carrier_outside_diameter_mm",
      "rcs_internal_fill_permanent_occupied_m3", "rcs_internal_fill_dry_product_designation"] },
];
const fillExecutionId = (key: string, suffix: string) => `rcs_fill_${key}_${suffix}`;
export const ROAD_CROSSING_SLEEVES_FILL_EXECUTION_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze(
  fillExecutionWorks.flatMap(work => {
    const text = (suffix: string, title: string): AutomaticParameterSpec => ({ id: fillExecutionId(work.key, suffix), title,
      kind: "conditional", valueType: "text", unitId: null, requiredWhen: work.inclusion });
    const rate = (owner: "crew" | "equipment"): AutomaticParameterSpec => ({ id: fillExecutionId(work.key, `${owner}_h_per_finished_m3`),
      title: `${work.title}: ${owner === "crew" ? "суммарные человеко-часы всех исполнителей" : "часы выбранного комплекта техники"} на м³ ${work.basisRu ?? "готового уплотнённого объёма, включая повторное использование"}`,
      kind: "conditional", valueType: "decimal", unitId: `${owner === "crew" ? "man" : "machine"}_hour_per_m3`, min: 0, requiredWhen: work.inclusion });
    const basis = (owner: "crew" | "equipment"): AutomaticParameterSpec => ({ id: fillExecutionId(work.key, `${owner}_cost_basis`),
      title: `${work.title}: отдельная граница ${owner === "crew" ? "труда" : "техники"}`, kind: "conditional", valueType: "enum", unitId: null,
      values: [ROAD_CROSSING_SLEEVES_CIVIL_EXECUTION_COST_BASES_R1[owner]], requiredWhen: work.inclusion });
    return [text("method_reference", work.key === "internal"
      ? `${work.title}: согласованная карта смешивания и размещения с фактическими ограничениями давления, плавучести, удержания и выдержки; вода, материалы и доставка отдельно`
      : `${work.title}: применимая карта укладки, слоёв, фактического увлажнения и уплотнения с выбранной смесью и повторно используемым материалом; все исполнители и техника применения воды здесь, сама вода, доставка, резерв и вывоз отдельно`),
      text("crew_designation", `${work.title}: все исполнители, включая операторов`), rate("crew"), basis("crew"),
      text("equipment_designation", `${work.title}: выбранный совместимый комплект ${work.key === "internal" ? "смешивания и размещения" : "для укладки и уплотнения"}`), rate("equipment"), basis("equipment")];
  }),
);
export const ROAD_CROSSING_SLEEVES_FILL_EXECUTION_ROWS_R1: readonly AutomaticRowSpec[] = Object.freeze(
  fillExecutionWorks.flatMap(work => (["crew", "equipment"] as const).map(owner => ({
    rowId: `rcs:fill-execution:${work.key}:${owner}_hours`, formulaId: `rcs:fill-execution:${work.key}:${owner}_hours`,
    section: `Выполнение: ${work.title}`, category: owner === "crew" ? "labor" : "equipment",
    title: `${work.title}: ${owner === "crew" ? "суммарный труд всех исполнителей" : "выбранный комплект техники с энергией"}`,
    unitId: owner === "crew" ? "man_hour" : "machine_hour", expression: `(${work.expression})*${fillExecutionId(work.key, `${owner}_h_per_finished_m3`)}`,
    inclusion: work.inclusion, procurement: true, titleParameterIds: [fillExecutionId(work.key, `${owner}_designation`)],
    inputParameterIds: [...(work.key === "internal" ? [] : [METHOD_ID]), ...work.facts, fillExecutionId(work.key, "method_reference"),
      fillExecutionId(work.key, `${owner}_designation`), fillExecutionId(work.key, `${owner}_cost_basis`)],
  }))),
);

/** FP-24 204/301/302 distinguish moisture conditioning and suitable construction
 * water. Neither a moisture limit nor a generic added-water rate is a default:
 * actual gross addition includes initial moisture and process losses, under
 * the selected project method. Water application personnel/equipment belong
 * to existing fill execution ONLY; water purchase and dedicated haul exclude
 * them. Dust control, dewatering and internal grout mixing are other scopes.
 * https://highways.dot.gov/sites/fhwa.dot.gov/files/FP-24.pdf */
export const ROAD_CROSSING_SLEEVES_COMPACTION_WATER_MODES_R1 = Object.freeze({
  separate: "Отдельная закупка совместимой воды для увлажнения этой операции",
  otherParty: "Подтверждённая совместимая вода другой стороны без закупки исполнителем",
});
export const ROAD_CROSSING_SLEEVES_COMPACTION_WATER_COST_BASIS_R1 = "Только новый заказ воды для этой операции; без материала засыпки, всех исполнителей и техники применения воды, энергии, доставки и повторной оплаты той же воды";
const compactionWaterId = (key: string, suffix: string) => `rcs_compaction_water_${key}_${suffix}`;
const compactionWaterWorks = fillExecutionWorks.filter(work => work.key !== "internal").map(work => {
  const id = (suffix: string) => compactionWaterId(work.key, suffix);
  const consumed = `(${work.expression})*${id("gross_l_per_finished_m3")}/1000`;
  const positive: AutomaticInclusionCondition = { kind: "and", operands: [work.inclusion,
    { kind: "formula_greater_than", expression: consumed, unitId: "m3", value: 0 }] };
  const separate: AutomaticInclusionCondition = { kind: "and", operands: [positive,
    { kind: "equals", parameterId: id("supply_mode"), value: ROAD_CROSSING_SLEEVES_COMPACTION_WATER_MODES_R1.separate }] };
  const facts = [METHOD_ID, ...work.facts, fillExecutionId(work.key, "method_reference")];
  const sourceFacts = [...facts, id("gross_l_per_finished_m3"), id("supply_mode"), id("allocation_reference"), id("product_designation"), id("compatibility_reference")];
  return { ...work, id, consumed, positive, separate, facts, sourceFacts };
});
export const ROAD_CROSSING_SLEEVES_COMPACTION_WATER_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze(
  compactionWaterWorks.flatMap(work => {
    const text = (suffix: string, title: string): AutomaticParameterSpec => ({ id: work.id(suffix), title: `${work.title}: ${title}`,
      valueType: "text", unitId: null, kind: "conditional", requiredWhen: work.positive });
    const amount = (suffix: string, title: string, min = 0): AutomaticParameterSpec => ({ id: work.id(suffix), title: `${work.title}: ${title}`,
      valueType: "decimal", unitId: "m3", min, kind: "conditional", requiredWhen: work.separate });
    return [
      { id: work.id("gross_l_per_finished_m3"), title: `${work.title}: фактическая добавляемая вода на м³ готового объёма с учётом исходной влажности и всех потерь; явный 0 означает отсутствие добавления`,
        valueType: "decimal", unitId: "l_per_m3", min: 0, kind: "conditional", requiredWhen: work.inclusion } as AutomaticParameterSpec,
      { id: work.id("supply_mode"), title: `${work.title}: подтверждённый вариант снабжения фактически расходуемой водой`,
        valueType: "enum", unitId: null, values: Object.values(ROAD_CROSSING_SLEEVES_COMPACTION_WATER_MODES_R1), kind: "conditional", requiredWhen: work.positive } as AutomaticParameterSpec,
      text("allocation_reference", "документ отдельного распределения воды только этой операции, включая новый заказ, наличие и резерв; не повторять воду другого этапа, пылеподавления или затворения смеси"),
      text("product_designation", "фактическая подходящая вода для выбранного материала и технологии"),
      text("compatibility_reference", "подтверждение качества выбранной воды и фактического добавления с учётом исходной влажности; не разрешение переувлажнять материал"),
      amount("compatible_stock_m3", "пригодная вода в наличии, выделенная исключительно этой операции"),
      amount("retained_reserve_m3", "сохраняемый резерв той же отдельно выделенной воды"),
      amount("supplier_multiple_m3", "фактическая кратность нового заказа воды в м³; не число рейсов", 0.000_001),
      { id: work.id("cost_basis"), title: `${work.title}: отдельная граница стоимости нового заказа воды`, valueType: "enum", unitId: null,
        values: [ROAD_CROSSING_SLEEVES_COMPACTION_WATER_COST_BASIS_R1], kind: "conditional", requiredWhen: work.separate } as AutomaticParameterSpec,
    ];
  }),
);
export const ROAD_CROSSING_SLEEVES_COMPACTION_WATER_ROWS_R1: readonly AutomaticRowSpec[] = Object.freeze(
  compactionWaterWorks.flatMap(work => {
    const stock = work.id("compatible_stock_m3"), reserve = work.id("retained_reserve_m3"), multiple = work.id("supplier_multiple_m3");
    const need = `max(0,(${work.consumed})+${reserve}-${stock})`, count = `ceil((${need})/${multiple})`, ordered = `(${count})*${multiple}`;
    const remaining = `${stock}+(${ordered})-(${work.consumed})`;
    const row = (key: string, title: string, expression: string, inclusion: AutomaticInclusionCondition, facts: readonly string[], unitId = "m3"): AutomaticRowSpec => ({
      rowId: `rcs:compaction-water:${work.key}:${key}`, formulaId: `rcs:compaction-water:${work.key}:${key}`,
      section: `Вода: ${work.title}`, category: "material", title: `${work.title}: ${title}`, unitId, expression, inclusion,
      inputParameterIds: facts, costTreatment: "INFORMATIONAL_SCOPE",
    });
    return [row("consumed_m3", "фактическая добавляемая вода, не заказ, резерв или повторная оплата применения", work.consumed, work.inclusion, work.facts),
      row("allocated_consumed_m3", "расход в подтверждённом отдельном снабжении водой; без повторной закупки", work.consumed, work.positive, work.sourceFacts),
      ...([ ["new_need_m3", "дополнительная потребность в воде с резервом после пригодного наличия", need],
        ["supplier_multiple_count", "число кратностей заказа воды; не рейсы", count], ["ordered_m3", "новый отдельный заказ совместимой воды", ordered],
        ["remaining_m3", "неиспользованная вода после операции, включая сохраняемый резерв", remaining],
        ["free_m3_beyond_reserve", "свободная неиспользованная вода сверх сохраняемого резерва", `(${remaining})-${reserve}`] ] as const)
        .map(([key, title, expression]): AutomaticRowSpec => ({
          ...row(key, title, expression, work.separate, [...work.sourceFacts, ...(key === "ordered_m3" ? [work.id("cost_basis")] : [])], key === "supplier_multiple_count" ? "package" : "m3"),
          ...(key === "ordered_m3" ? { costTreatment: "OWN_COST", procurement: true, titleParameterIds: [work.id("product_designation")] } : {}),
        })),
    ];
  }),
);

/** Mechanical work uses installed geometry/components, never order or reserves.
 * Each actual method owns disjoint crew/equipment and access/load constraints.
 */
export const ROAD_CROSSING_SLEEVES_MECHANICAL_COST_BASES_R1 = Object.freeze({
  crew: "Все исполнители только этой монтажной операции, включая операторов; без материалов, техники, энергии и соседних операций",
  equipment: "Комплект только этой монтажной операции с энергией; без всех исполнителей, материалов, доставки и соседних операций",
});
const mechanicalWorks: readonly Readonly<{ key: string; title: string; quantity: string; unit: "piece" | "m";
  facts: readonly string[]; boundary: string; inclusion?: AutomaticInclusionCondition }>[] = [
  { key: "casing_preparation", title: "Подготовка и сборка физических секций футляра до сварки", quantity: quantities.installed_section_count, unit: "piece",
    facts: ["rcs_crossing_length_m", "rcs_planned_physical_section_length_m", "rcs_casing_product_designation", "rcs_casing_outside_diameter_mm", "rcs_casing_inside_diameter_mm"],
    boundary: "резка, обработка кромок и сборка всех используемых секций, включая наличие; без сварки, контроля, покрытия и подъёма" },
  { key: "casing_lowering", title: "Подъём и установка футляра в открытой траншее", quantity: quantities.installed_section_count, unit: "piece",
    facts: [METHOD_ID, "rcs_crossing_length_m", "rcs_planned_physical_section_length_m", "rcs_casing_product_designation", "rcs_casing_outside_diameter_mm", "rcs_casing_inside_diameter_mm"],
    inclusion: { kind: "equals", parameterId: METHOD_ID, value: methods.openCut },
    boundary: "совместимая схема строповки и установки используемых секций по фактической массе, вылету и доступу; без доставки и проходки" },
  { key: "casing_jacking_loading", title: "Отдельная загрузка физических секций футляра при продавливании", quantity: quantities.installed_section_count, unit: "piece",
    facts: [METHOD_ID, "rcs_crossing_length_m", "rcs_planned_physical_section_length_m", "rcs_casing_product_designation", "rcs_casing_outside_diameter_mm", "rcs_casing_inside_diameter_mm",
      JACKING_LOADING_MODE, JACKING_LOADING_REFERENCE, "rcs_civil_jacking_advance_method_reference"],
    inclusion: { kind: "and", operands: [jackingLoadingScope, { kind: "equals", parameterId: JACKING_LOADING_MODE, value: ROAD_CROSSING_SLEEVES_JACKING_LOADING_MODES_R1.separate }] },
    boundary: "фактическая масса целой секции, совместимая строповка, грузоподъёмность на фактическом вылете, доступ и установка на согласованные направляющие; без проходки, резки, сварки, доставки и приписывания реакции или креплений" },
  { key: "supports", title: "Монтаж опорных колец и контактной ленты рабочей трубы", quantity: quantities.raci_installed_ring_count, unit: "piece",
    facts: ["rcs_crossing_length_m", "rcs_raci_approved_ring_pitch_m", "rcs_raci_selected_elements_per_ring", "rcs_casing_inside_diameter_mm", "rcs_carrier_outside_diameter_mm",
      "rcs_maximum_joint_envelope_diameter_mm", "rcs_raci_selected_element_height_mm", "rcs_raci_element_designation", "rcs_contact_tape_designation", "rcs_raci_ring_width_mm", "rcs_contact_tape_width_mm"],
    boundary: "сборка и установка всех выбранных колец и одного полного прохода контактной ленты по одобренной схеме; без протаскивания трубы и концевых узлов" },
  { key: "carrier_insertion", title: "Протаскивание рабочей трубы через футляр", quantity: "rcs_crossing_length_m", unit: "m",
    facts: ["rcs_crossing_length_m", "rcs_carrier_product_designation", "rcs_casing_inside_diameter_mm", "rcs_carrier_outside_diameter_mm",
      "rcs_maximum_joint_envelope_diameter_mm", "rcs_raci_selected_element_height_mm", "rcs_raci_element_designation"],
    boundary: "допустимые тяговые усилия, опоры, доступ и совместимость оснащения для прохода длины футляра; без монтажа колец, соединений и концевых узлов" },
  { key: "end_seals", title: "Установка выбранных торцевых уплотнений с включёнными хомутами", quantity: quantities.installed_end_seal_kit_count, unit: "piece",
    facts: ["rcs_crossing_length_m", "rcs_casing_outside_diameter_mm", "rcs_carrier_outside_diameter_mm", "rcs_end_seal_kit_designation"],
    boundary: "монтаж двух выбранных комплектов торцевого уплотнения; не удерживающие конструкции, подпорные заглушки или заделка под давлением" },
];
const mechanicalId = (key: string, suffix: string) => `rcs_mechanical_${key}_${suffix}`;
export const ROAD_CROSSING_SLEEVES_MECHANICAL_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: JACKING_LOADING_MODE, title: "Подтверждённая граница загрузки секций футляра с ресурсами проходки", valueType: "enum", unitId: null,
    values: Object.values(ROAD_CROSSING_SLEEVES_JACKING_LOADING_MODES_R1), kind: "conditional", requiredWhen: jackingLoadingScope },
  { id: JACKING_LOADING_REFERENCE, title: "Фактическая карта, распределение исполнителей и оборудования загрузки и проходки без повторной оплаты, включая установку секций на направляющие",
    valueType: "text", unitId: null, kind: "conditional", requiredWhen: jackingLoadingScope },
  ...mechanicalWorks.flatMap(work => {
    const base = { kind: "conditional" as const, requiredWhen: work.inclusion
      ?? { kind: "greater_than" as const, parameterId: "rcs_crossing_length_m", value: 0 } };
    const text = (suffix: string, title: string): AutomaticParameterSpec => ({ ...base, id: mechanicalId(work.key, suffix), title, valueType: "text", unitId: null });
    const rate = (owner: "crew" | "equipment"): AutomaticParameterSpec => ({ ...base, id: mechanicalId(work.key, `${owner}_h_per_unit`),
      title: `${work.title}: ${owner === "crew" ? "суммарные человеко-часы всех исполнителей" : "часы совместимого комплекта техники"} по выбранной карте на ${work.unit === "piece" ? "установленную физическую единицу" : "метр протаскивания"}`,
      valueType: "decimal", unitId: `${owner === "crew" ? "man" : "machine"}_hour_per_${work.unit}`, min: 0 });
    const basis = (owner: "crew" | "equipment"): AutomaticParameterSpec => ({ ...base, id: mechanicalId(work.key, `${owner}_cost_basis`),
      title: `${work.title}: отдельная граница ${owner === "crew" ? "труда" : "техники"}`, valueType: "enum", unitId: null,
      values: [ROAD_CROSSING_SLEEVES_MECHANICAL_COST_BASES_R1[owner]] });
    return [text("method_reference", `${work.title}: согласованная карта, ${work.boundary}`),
      text("crew_designation", `${work.title}: выбранные исполнители, включая операторов`), rate("crew"), basis("crew"),
      text("equipment_designation", `${work.title}: выбранный совместимый комплект техники`), rate("equipment"), basis("equipment")];
  }),
]);
export const ROAD_CROSSING_SLEEVES_MECHANICAL_ROWS_R1: readonly AutomaticRowSpec[] = Object.freeze([
  { rowId: "rcs:mechanical:casing_jacking_loading:scope_section_count", formulaId: "rcs:mechanical:casing_jacking_loading:scope_section_count",
    section: "Загрузка секций при продавливании", category: "service", title: "Установленные секции в подтверждённой границе загрузки; не дополнительная повторная оплата",
    unitId: "piece", expression: quantities.installed_section_count, inclusion: jackingLoadingScope, costTreatment: "INFORMATIONAL_SCOPE",
    inputParameterIds: [JACKING_LOADING_MODE, JACKING_LOADING_REFERENCE] },
  ...mechanicalWorks.flatMap(work => (["crew", "equipment"] as const).map(owner => ({
    rowId: `rcs:mechanical:${work.key}:${owner}_hours`, formulaId: `rcs:mechanical:${work.key}:${owner}_hours`,
    section: `Монтаж: ${work.title}`, title: `${work.title}: ${owner === "crew" ? "труд всех исполнителей" : "комплект техники с энергией"}`,
    category: owner === "crew" ? "labor" : "equipment", unitId: owner === "crew" ? "man_hour" : "machine_hour",
    expression: `(${work.quantity})*${mechanicalId(work.key, `${owner}_h_per_unit`)}`, ...(work.inclusion ? { inclusion: work.inclusion } : {}),
    procurement: true, titleParameterIds: [mechanicalId(work.key, `${owner}_designation`)],
    inputParameterIds: [...work.facts, mechanicalId(work.key, "method_reference"), mechanicalId(work.key, `${owner}_designation`), mechanicalId(work.key, `${owner}_cost_basis`)],
  }))),
]);

/** TWI distinguishes clean/dry compatible joining surfaces; Norton distinguishes
 * cutting from grinding applications. These sources supply NO project rate.
 * The supported program consumes/discards whole touched abrasive/wipe units;
 * partial reusable tooling and other preparation methods require their own
 * program. Cutting, preparation and cleaning personnel/equipment already belong
 * to the existing mechanical preparation operation, never another labor charge.
 * https://www.twi-global.com/technical-knowledge/faqs/faq-what-is-surface-preparation-for-joining
 * https://www.nortonabrasives.com/en-gb/resources/expertise/frequently-asked-cutting-questions */
export const ROAD_CROSSING_SLEEVES_CASING_PREP_MATERIAL_MODES_R1 = Object.freeze({
  abrasive: "Раздельные отрезные и шлифовальные круги, очиститель и салфетки; затронутые целые круги и салфетки списываются после операции по подтверждённой карте",
  otherParty: "Расходники подготовки предоставлены другой стороной без закупки исполнителем",
  other: "Другие способы подготовки и повторно используемые частичные расходники: отдельная программа",
});
export const ROAD_CROSSING_SLEEVES_CASING_PREP_MATERIAL_COST_BASIS_R1 = "Только новый заказ выбранного расходника подготовки со всеми учтёнными потерями и резервом; без резки/подготовки как работы, всех исполнителей, оборудования, энергии, сварки, покрытия, доставки и повторной оплаты расходников";
const casingPrepId = (suffix: string) => `rcs_casing_prep_material_${suffix}`;
const casingPrepScope: AutomaticInclusionCondition = { kind: "greater_than", parameterId: "rcs_crossing_length_m", value: 0 };
const casingPrepSelected: AutomaticInclusionCondition = { kind: "and", operands: [casingPrepScope,
  { kind: "equals", parameterId: casingPrepId("mode"), value: ROAD_CROSSING_SLEEVES_CASING_PREP_MATERIAL_MODES_R1.abrasive }] };
const casingPrepOriginalFacts = ["rcs_crossing_length_m", "rcs_planned_physical_section_length_m", "rcs_casing_product_designation",
  "rcs_casing_outside_diameter_mm", "rcs_casing_inside_diameter_mm", "rcs_mechanical_casing_preparation_method_reference",
  "rcs_mechanical_casing_preparation_equipment_designation", casingPrepId("mode"), casingPrepId("program_reference")];
const casingPrepMaterials = [
  { key: "cutting_discs", title: "Совместимые отрезные круги подготовки футляра", unit: "piece" },
  { key: "grinding_discs", title: "Совместимые шлифовальные круги подготовки футляра", unit: "piece" },
  { key: "cleaner", title: "Совместимый очиститель подготовки футляра", unit: "l" },
  { key: "wipes", title: "Салфетки подготовки футляра", unit: "piece" },
] as const;
const casingPrepMaterialBranches = casingPrepMaterials.map(material => {
  const id = (suffix: string) => casingPrepId(`${material.key}_${suffix}`);
  const gross = `(${quantities.installed_section_count})*${id("gross_per_installed_section")}`;
  const consumed = material.unit === "piece" ? `ceil(${gross})` : gross;
  const positive: AutomaticInclusionCondition = { kind: "and", operands: [casingPrepSelected,
    { kind: "formula_greater_than", expression: consumed, unitId: material.unit, value: 0 }] };
  return { ...material, id, consumed, positive };
});
export const ROAD_CROSSING_SLEEVES_CASING_PREP_MATERIAL_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: casingPrepId("mode"), title: "Подтверждённая программа и граница закупки расходников подготовки футляра", valueType: "enum", unitId: null,
    values: Object.values(ROAD_CROSSING_SLEEVES_CASING_PREP_MATERIAL_MODES_R1), kind: "conditional", requiredWhen: casingPrepScope },
  { id: casingPrepId("program_reference"), title: "Фактическая программа расходников, область подготовки, совместимость материала и оборудования и правила списания целых затронутых единиц без повторной оплаты",
    valueType: "text", unitId: null, kind: "conditional", requiredWhen: casingPrepScope },
  ...casingPrepMaterialBranches.flatMap(material => {
    const text = (suffix: string, title: string): AutomaticParameterSpec => ({ id: material.id(suffix), title: `${material.title}: ${title}`,
      valueType: "text", unitId: null, kind: "conditional", requiredWhen: material.positive });
    const amount = (suffix: string, title: string, min = 0): AutomaticParameterSpec => ({ id: material.id(suffix), title: `${material.title}: ${title}`,
      valueType: material.unit === "piece" ? "integer" : "decimal", unitId: material.unit, min, kind: "conditional", requiredWhen: material.positive });
    return [
      { id: material.id("gross_per_installed_section"), title: `${material.title}: фактический полный расход на установленную физическую секцию, со всеми потерями по карте; явный 0 означает отсутствие этого расходника`,
        valueType: "decimal", unitId: `${material.unit}_per_piece`, min: 0, kind: "conditional", requiredWhen: casingPrepSelected } as AutomaticParameterSpec,
      text("product_designation", "фактически выбранное совместимое изделие или материал"),
      text("product_reference", "применимость конкретной операции, совместимость с материалом и инструментом; назначение круга, размеры и допустимая скорость по паспорту, условия очистки по карте"),
      amount("compatible_stock", "пригодное выделенное наличие до работы; только целые пригодные изделия или совместимый очиститель, без будущего возврата уже списанных единиц"),
      amount("retained_reserve", "сохраняемый резерв пригодного расходника"), amount("supplier_pack_net", "фактическое число единиц или литров без тары в новой упаковке", material.unit === "piece" ? 1 : 0.000_001),
      { id: material.id("cost_basis"), title: `${material.title}: отдельная граница нового заказа`, valueType: "enum", unitId: null,
        values: [ROAD_CROSSING_SLEEVES_CASING_PREP_MATERIAL_COST_BASIS_R1], kind: "conditional", requiredWhen: material.positive } as AutomaticParameterSpec,
    ];
  }),
]);
export const ROAD_CROSSING_SLEEVES_CASING_PREP_MATERIAL_ROWS_R1: readonly AutomaticRowSpec[] = Object.freeze([
  { rowId: "rcs:casing-prep-material:scope_length_m", formulaId: "rcs:casing-prep-material:scope_length_m", section: "Расходники подготовки футляра", category: "service",
    title: "Длина перехода в подтверждённой программе расходников; без повторной оплаты подготовки", unitId: "m", expression: "rcs_crossing_length_m",
    inclusion: casingPrepScope, costTreatment: "INFORMATIONAL_SCOPE", inputParameterIds: [casingPrepId("mode"), casingPrepId("program_reference")] },
  ...casingPrepMaterialBranches.flatMap(material => {
    const stock = material.id("compatible_stock"), reserve = material.id("retained_reserve"), pack = material.id("supplier_pack_net");
    const need = `max(0,(${material.consumed})+${reserve}-${stock})`, count = `ceil((${need})/${pack})`, ordered = `(${count})*${pack}`;
    const remaining = `${stock}+(${ordered})-(${material.consumed})`;
    return ([ ["consumed", "фактический расход, со списанием затронутых целых изделий по выбранной программе", material.consumed],
      ["new_need", "дополнительная потребность с резервом после пригодного наличия", need], ["supplier_pack_count", "число новых упаковок; не монтаж или доставка", count],
      ["ordered", "новый отдельный заказ выбранного расходника", ordered], ["remaining", "неиспользованный пригодный остаток, включая сохраняемый резерв", remaining],
      ["free_beyond_reserve", "свободный неиспользованный пригодный остаток сверх резерва", `(${remaining})-${reserve}`] ] as const)
      .map(([key, title, expression]): AutomaticRowSpec => ({ rowId: `rcs:casing-prep-material:${material.key}:${key}`, formulaId: `rcs:casing-prep-material:${material.key}:${key}`,
        section: material.title, category: "material", title: `${material.title}: ${title}`, unitId: key === "supplier_pack_count" ? "package" : material.unit,
        expression, inclusion: key === "consumed" ? casingPrepSelected : material.positive,
        costTreatment: key === "ordered" ? "OWN_COST" : "INFORMATIONAL_SCOPE", procurement: key === "ordered",
        inputParameterIds: [...casingPrepOriginalFacts, ...(key === "consumed" ? [] : [material.id("product_designation"), material.id("product_reference")]),
          ...(key === "ordered" ? [material.id("cost_basis")] : [])],
        ...(key === "ordered" ? { titleParameterIds: [material.id("product_designation")] } : {}) }));
  }),
]);

/** Selected field repair is two disjoint documented batches, not whole factory
 * recoating or invented defects. Denso's brush specification distinguishes
 * preparation, paired-component mixing, application/cure and inspection:
 * https://www.densona.com/wp-content/uploads/2020/04/Denso-Protal-7200-Brush-Application-Spec.pdf
 * No product, DFT, rate, mixing ratio, pot life or climate limit is a default.
 * The explicitly selected program activates WHOLE paired kits; leftover mixed
 * product after its usable life is wet waste, never unopened usable stock. */
export const ROAD_CROSSING_SLEEVES_COATING_MODES_R1 = Object.freeze({
  wholeKitBrush: "Кистевое восстановление цилиндрического футляра целыми двухкомпонентными комплектами; стыки и иные повреждения — по одной отдельной непересекающейся партии с подтверждённой пригодностью всего замеса",
  otherParty: "Восстановление покрытия и все его ресурсы предоставлены другой стороной без отдельной оплаты исполнителем",
  notRequired: "Отсутствие восстановления покрытия подтверждено проектной программой",
  other: "Другие покрытия, частичные замесы или общий замес зон: отдельная программа ресурсов",
});
export const ROAD_CROSSING_SLEEVES_COATING_KIT_COST_BASIS_R1 = "Только новый заказ полных согласованных двухкомпонентных комплектов, включающих оба компонента; без второй оплаты компонентов, подготовки, замеса/нанесения/выдержки/контроля как работ, всех исполнителей, оборудования, энергии, доставки и отходов";
export const ROAD_CROSSING_SLEEVES_COATING_CONSUMABLE_COST_BASIS_R1 = "Только новый заказ отдельного совместимого расходника покрытия, со всеми процессными потерями и резервом; без комплектов покрытия, работ подготовки/нанесения/контроля, всех исполнителей, оборудования, энергии, доставки, отходов и повторной оплаты";
const coatingId = (suffix: string) => `rcs_coating_${suffix}`;
const coatingScope: AutomaticInclusionCondition = { kind: "greater_than", parameterId: "rcs_crossing_length_m", value: 0 };
const coatingSelected: AutomaticInclusionCondition = { kind: "and", operands: [coatingScope,
  { kind: "equals", parameterId: coatingId("mode"), value: ROAD_CROSSING_SLEEVES_COATING_MODES_R1.wholeKitBrush }] };
const coatingJointScope: AutomaticInclusionCondition = { kind: "and", operands: [coatingSelected,
  { kind: "formula_greater_than", expression: quantities.site_joint_count, unitId: "piece", value: 0 }] };
const coatingJointArea = `(${quantities.site_joint_count})*3.141592654*rcs_casing_outside_diameter_mm/1000*${coatingId("joint_band_width_m")}`;
const coatingBaseFacts = ["rcs_crossing_length_m", "rcs_casing_outside_diameter_mm", "rcs_casing_inside_diameter_mm", "rcs_casing_product_designation", coatingId("mode"), coatingId("program_reference")];
const coatingZones = [
  { key: "joints", title: "Полосы монтажных стыков футляра", area: coatingJointArea, inclusion: coatingJointScope,
    facts: [...coatingBaseFacts, "rcs_planned_physical_section_length_m", "rcs_joint_wps_reference", coatingId("joint_band_width_m")] },
  { key: "damage", title: "Фактически повреждённые участки вне полос стыков", area: coatingId("damage_area_m2"), inclusion: coatingSelected,
    facts: [...coatingBaseFacts, coatingId("damage_area_m2")] },
].map(zone => ({ ...zone, id: (suffix: string) => coatingId(`${zone.key}_${suffix}`),
  positive: { kind: "and", operands: [zone.inclusion, { kind: "formula_greater_than", expression: zone.area, unitId: "m2", value: 0 }] } as AutomaticInclusionCondition }));
const coatingWorks = [
  { key: "preparation", title: "Очистка и подготовка поверхности под покрытие", boundary: "очистка, подготовка поверхности и края старого покрытия; без подготовки стыка под сварку, материала покрытия, нанесения и контроля" },
  { key: "application", title: "Замес, кистевое нанесение и защита на время выдержки", boundary: "замес целых комплектов, нанесение и фактическое обеспечение выдержки при согласованных условиях; без поверхностной подготовки, материалов, контроля и доставки" },
  { key: "inspection", title: "Первоначальный контроль восстановленного покрытия", boundary: "первоначальный предусмотренный программой контроль профиля/условий/толщины/выдержки/сплошности совместимыми приборами; без прогнозирования дефектов, исправления и повторного контроля" },
] as const;
const coatingKit = (zone: typeof coatingZones[number]) => {
  const mixed = `(${zone.area})*${zone.id("gross_mixed_l_per_m2")}`;
  const activated = `ceil((${mixed})/${zone.id("kit_net_mixed_l")})`;
  const need = `max(0,(${activated})+${zone.id("retained_kit_reserve")}-${zone.id("compatible_unmixed_kit_stock")})`;
  const packs = `ceil((${need})/${zone.id("supplier_pack_kit_count")})`, ordered = `(${packs})*${zone.id("supplier_pack_kit_count")}`;
  const remaining = `${zone.id("compatible_unmixed_kit_stock")}+(${ordered})-(${activated})`;
  return { mixed, activated, need, packs, ordered, remaining };
};
export const ROAD_CROSSING_SLEEVES_COATING_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: coatingId("mode"), title: "Подтверждённая технология и граница ресурсов восстановления покрытия футляра", valueType: "enum", unitId: null,
    values: Object.values(ROAD_CROSSING_SLEEVES_COATING_MODES_R1), kind: "conditional", requiredWhen: coatingScope },
  { id: coatingId("program_reference"), title: "Фактическая программа совместимого покрытия, отдельные зоны и партии, исходное покрытие/повреждения, толщина, условия, целые комплекты, замес/выдержка/контроль и границы оплаты",
    valueType: "text", unitId: null, kind: "conditional", requiredWhen: coatingScope },
  { id: coatingId("joint_band_width_m"), title: "Фактическая осевая ширина покрытия каждой полосы стыка, включая подтверждённые нахлёсты на исходное покрытие; не ширина шва",
    valueType: "decimal", unitId: "m", min: 0.000_001, kind: "conditional", requiredWhen: coatingJointScope },
  { id: coatingId("damage_area_m2"), title: "Фактическая площадь иных повреждённых участков с краевой подготовкой, без повторения полос стыков; отсутствие подтверждается явным 0, не прогнозом процента дефектов",
    valueType: "decimal", unitId: "m2", min: 0, kind: "conditional", requiredWhen: coatingSelected },
  ...coatingZones.flatMap(zone => {
    const text = (suffix: string, title: string): AutomaticParameterSpec => ({ id: zone.id(suffix), title: `${zone.title}: ${title}`,
      valueType: "text", unitId: null, kind: "conditional", requiredWhen: zone.positive });
    const amount = (suffix: string, title: string, unitId: string, min: number, integer = false): AutomaticParameterSpec => ({ id: zone.id(suffix), title: `${zone.title}: ${title}`,
      valueType: integer ? "integer" : "decimal", unitId, min, kind: "conditional", requiredWhen: zone.positive });
    return [text("allocation_reference", "фактическое отдельное распределение комплектов/расходников и партии работ, без совместного замеса и пересечения с другой зоной или операцией"),
      text("kit_designation", "выбранный полный совместимый двухкомпонентный комплект; оба компонента входят в одну покупку"),
      text("kit_product_reference", "паспорт и совместимость исходного/ремонтного покрытия, парных компонентов, толщины, условия замеса/нанесения/выдержки/контроля и пригодности несмешанных комплектов"),
      amount("gross_mixed_l_per_m2", "фактически расходуемый смешанный продукт на площадь с процессными потерями; без остатка округления целого замеса", "l_per_m2", 0.000_001),
      amount("kit_net_mixed_l", "фактический смешанный объём одного полного парного комплекта без тары, не объём одного компонента", "l", 0.000_001),
      amount("confirmed_single_batch_max_mixed_l", "подтверждённый максимальный объём всего единственного замеса этой зоны, который будет применён в фактических условиях в пределах пригодности; не универсальный паспортный расход", "l", 0.000_001),
      amount("compatible_unmixed_kit_stock", "пригодные полные несмешанные комплекты в наличии, выделенные исключительно этой партии; не активированный продукт или несогласованные остатки компонентов", "piece", 0, true),
      amount("retained_kit_reserve", "сохраняемые полные несмешанные комплекты", "piece", 0, true),
      amount("supplier_pack_kit_count", "полных парных комплектов в новой поставочной упаковке", "piece", 1, true),
      { id: zone.id("kit_cost_basis"), title: `${zone.title}: отдельная граница нового заказа комплекта`, valueType: "enum", unitId: null,
        values: [ROAD_CROSSING_SLEEVES_COATING_KIT_COST_BASIS_R1], kind: "conditional", requiredWhen: zone.positive } as AutomaticParameterSpec,
      ...coatingWorks.flatMap(work => [text(`${work.key}_method_reference`, `фактическая совместимая процедура: ${work.boundary}`),
        ...(["crew", "equipment"] as const).flatMap(owner => [
          text(`${work.key}_${owner}_designation`, `${work.title}: ${owner === "crew" ? "все исполнители, включая операторов" : "весь выбранный совместимый комплект с энергией"}`),
          amount(`${work.key}_${owner}_h_per_m2`, `${work.title}: фактические ${owner === "crew" ? "суммарные человеко-часы" : "часы комплекта"} по выбранному плану на площадь; фактические замесы и условия включены один раз`, `${owner === "crew" ? "man" : "machine"}_hour_per_m2`, 0),
          { id: zone.id(`${work.key}_${owner}_cost_basis`), title: `${zone.title}: ${work.title}, отдельная граница ${owner === "crew" ? "труда" : "техники"}`, valueType: "enum", unitId: null,
            values: [ROAD_CROSSING_SLEEVES_CIVIL_EXECUTION_COST_BASES_R1[owner]], kind: "conditional", requiredWhen: zone.positive } as AutomaticParameterSpec,
        ])]),
    ];
  }),
]);
export const ROAD_CROSSING_SLEEVES_COATING_ROWS_R1: readonly AutomaticRowSpec[] = Object.freeze([
  { rowId: "rcs:coating:scope_length_m", formulaId: "rcs:coating:scope_length_m", section: "Восстановление защитного покрытия", category: "service",
    title: "Длина перехода в подтверждённой программе покрытия; без повторной оплаты", unitId: "m", expression: "rcs_crossing_length_m", inclusion: coatingScope,
    costTreatment: "INFORMATIONAL_SCOPE", inputParameterIds: [coatingId("mode"), coatingId("program_reference")] },
  { rowId: "rcs:coating:unallocated_outer_area_m2", formulaId: "rcs:coating:unallocated_outer_area_m2", section: "Контроль площадей покрытия", category: "service",
    title: "Внешняя цилиндрическая площадь вне отдельных полос стыков и иных повреждений; не автоматически перекрашиваемая площадь", unitId: "m2",
    expression: `3.141592654*rcs_casing_outside_diameter_mm/1000*rcs_crossing_length_m-(${coatingJointArea})-${coatingId("damage_area_m2")}`,
    inclusion: coatingJointScope, costTreatment: "INFORMATIONAL_SCOPE", inputParameterIds: [...coatingBaseFacts, coatingId("damage_area_m2")],
    formulaOutputBounds: { schemaVersion: "canonical_formula_output_bounds_v1", unitId: "m2", minimum: 0,
      reasonRu: "Отдельные непересекающиеся зоны не могут превышать всю цилиндрическую поверхность фактического футляра; геометрия и карта зон должны быть исправлены, а не скрыты ручным количеством." } },
  ...coatingZones.flatMap((zone): AutomaticRowSpec[] => {
    const kit = coatingKit(zone), facts = [...zone.facts, zone.id("allocation_reference"), zone.id("kit_designation"), zone.id("kit_product_reference")];
    const row = (key: string, title: string, expression: string, unitId: string, inclusion = zone.positive): AutomaticRowSpec => ({
      rowId: `rcs:coating:${zone.key}:${key}`, formulaId: `rcs:coating:${zone.key}:${key}`, section: `Покрытие: ${zone.title}`, category: "material",
      title: `${zone.title}: ${title}`, unitId, expression, inclusion, costTreatment: "INFORMATIONAL_SCOPE", inputParameterIds: facts,
    });
    return [{ ...row("area_m2", "фактическая отдельная площадь, не вся заводская окраска", zone.area, "m2", zone.inclusion), inputParameterIds: zone.facts },
      { ...row("available_outer_area_m2", "внешняя цилиндрическая площадь за вычетом одной зоны; контроль геометрии без повторной оплаты", `3.141592654*rcs_casing_outside_diameter_mm/1000*rcs_crossing_length_m-(${zone.area})`, "m2", zone.inclusion), inputParameterIds: zone.facts,
      formulaOutputBounds: { schemaVersion: "canonical_formula_output_bounds_v1", unitId: "m2", minimum: 0,
        reasonRu: "Одна зона не может превышать всю внешнюю цилиндрическую поверхность фактического футляра." } },
      row("gross_mixed_need_l", "фактически расходуемый смешанный продукт с процессными потерями", kit.mixed, "l"),
      row("activated_kit_count", "полные комплекты, активируемые для отдельной партии, не новый заказ", kit.activated, "piece"),
      row("activated_mixed_l", "весь активированный смешанный продукт, включая остаток целого замеса", `(${kit.activated})*${zone.id("kit_net_mixed_l")}`, "l"),
      row("activated_surplus_l", "остаток активированного замеса сверх фактического расхода, после срока пригодности не складское наличие", `(${kit.activated})*${zone.id("kit_net_mixed_l")}-(${kit.mixed})`, "l"),
      { ...row("single_batch_available_capacity_l", "запас подтверждённой применимости одного полного замеса; другие партии требуют отдельной программы", `${zone.id("confirmed_single_batch_max_mixed_l")}-(${kit.activated})*${zone.id("kit_net_mixed_l")}`, "l"),
        formulaOutputBounds: { schemaVersion: "canonical_formula_output_bounds_v1", unitId: "l", minimum: 0,
          reasonRu: "Весь активируемый объём должен укладываться в подтверждённую применимость одного замеса этой зоны; несколько замесов нельзя скрывать общим округлением или ручным заказом." } },
      row("new_kit_need", "дополнительные полные комплекты с резервом после пригодного несмешанного наличия", kit.need, "piece"),
      row("supplier_pack_count", "число новых упаковок полных комплектов; не работы или рейсы", kit.packs, "package"),
      { ...row("ordered_kit_count", "новый заказ полных парных комплектов с обоими компонентами", kit.ordered, "piece"),
        costTreatment: "OWN_COST", procurement: true, titleParameterIds: [zone.id("kit_designation")], inputParameterIds: [...facts, zone.id("kit_cost_basis"), zone.id("confirmed_single_batch_max_mixed_l")] },
      row("remaining_unmixed_kit_count", "пригодные неактивированные комплекты после партии, включая сохраняемый резерв", kit.remaining, "piece"),
      row("free_unmixed_kit_count", "свободные пригодные неактивированные комплекты сверх резерва", `(${kit.remaining})-${zone.id("retained_kit_reserve")}`, "piece"),
      ...coatingWorks.flatMap(work => (["crew", "equipment"] as const).map((owner): AutomaticRowSpec => ({
        ...row(`${work.key}:${owner}_hours`, `${work.title}: ${owner === "crew" ? "все исполнители" : "совместимое оборудование с энергией"}`, `(${zone.area})*${zone.id(`${work.key}_${owner}_h_per_m2`)}`, owner === "crew" ? "man_hour" : "machine_hour"),
        category: owner === "crew" ? "labor" : "equipment", costTreatment: "OWN_COST", procurement: true,
        titleParameterIds: [zone.id(`${work.key}_${owner}_designation`)], inputParameterIds: [...facts, zone.id(`${work.key}_method_reference`), zone.id(`${work.key}_${owner}_cost_basis`)],
      }))),
    ];
  }),
]);

// Only the selected single-batch discard programme rounds touched articles to
// whole consumed units. Reusable brushes/tools and recovered abrasive are not
// invented future stock. Their actual programmes remain separate.
const coatingConsumables = [
  { key: "abrasive", title: "Совместимый абразив подготовки покрытия", unit: "kg", work: "preparation" },
  { key: "cleaner", title: "Совместимый очиститель покрытия", unit: "l", work: "preparation" },
  { key: "wipes", title: "Списываемые салфетки подготовки покрытия", unit: "piece", work: "preparation" },
  { key: "applicators", title: "Списываемые аппликаторы нанесения покрытия", unit: "piece", work: "application" },
] as const;
const coatingConsumableBranches = coatingZones.flatMap(zone => coatingConsumables.map(material => {
  const id = (suffix: string) => zone.id(`${material.key}_${suffix}`);
  const gross = `(${zone.area})*${id("gross_per_m2")}`;
  const consumed = material.unit === "piece" ? `ceil(${gross})` : gross;
  const positive: AutomaticInclusionCondition = { kind: "and", operands: [zone.positive,
    { kind: "formula_greater_than", expression: consumed, unitId: material.unit, value: 0 }] };
  return { ...material, zone, id, consumed, positive };
}));
export const ROAD_CROSSING_SLEEVES_COATING_CONSUMABLE_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze(
  coatingConsumableBranches.flatMap(material => {
    const text = (suffix: string, title: string): AutomaticParameterSpec => ({ id: material.id(suffix), title: `${material.zone.title}, ${material.title}: ${title}`,
      valueType: "text", unitId: null, kind: "conditional", requiredWhen: material.positive });
    const amount = (suffix: string, title: string, min = 0): AutomaticParameterSpec => ({ id: material.id(suffix), title: `${material.zone.title}, ${material.title}: ${title}`,
      valueType: material.unit === "piece" ? "integer" : "decimal", unitId: material.unit, min, kind: "conditional", requiredWhen: material.positive });
    return [
      { id: material.id("gross_per_m2"), title: `${material.zone.title}, ${material.title}: фактический полный расход на площадь со всеми процессными потерями; целые затронутые изделия списываются по программе, отсутствие — явный 0`,
        valueType: "decimal", unitId: `${material.unit}_per_m2`, min: 0, kind: "conditional", requiredWhen: material.zone.positive } as AutomaticParameterSpec,
      text("product_designation", "фактически выбранный совместимый расходник"),
      text("product_reference", "фактическая совместимость с исходным/ремонтным покрытием, процедурой и инструментом, правило полного расхода/списания, отдельное распределение партии и пригодность наличия"),
      amount("compatible_stock", "пригодное исключительно выделенное наличие до этой партии; без возврата уже использованных или смешанных материалов"),
      amount("retained_reserve", "сохраняемый пригодный резерв"), amount("supplier_pack_net", "фактическое нетто в новой поставочной упаковке", material.unit === "piece" ? 1 : 0.000_001),
      { id: material.id("cost_basis"), title: `${material.zone.title}, ${material.title}: отдельная граница нового заказа`, valueType: "enum", unitId: null,
        values: [ROAD_CROSSING_SLEEVES_COATING_CONSUMABLE_COST_BASIS_R1], kind: "conditional", requiredWhen: material.positive } as AutomaticParameterSpec,
    ];
  }),
);
export const ROAD_CROSSING_SLEEVES_COATING_CONSUMABLE_ROWS_R1: readonly AutomaticRowSpec[] = Object.freeze(
  coatingConsumableBranches.flatMap(material => {
    const stock = material.id("compatible_stock"), reserve = material.id("retained_reserve"), pack = material.id("supplier_pack_net");
    const need = `max(0,(${material.consumed})+${reserve}-${stock})`, count = `ceil((${need})/${pack})`, ordered = `(${count})*${pack}`;
    const remaining = `${stock}+(${ordered})-(${material.consumed})`;
    return ([ ["consumed", "фактический полный расход; целые затронутые изделия списываются по программе", material.consumed],
      ["new_need", "дополнительная потребность с резервом после пригодного наличия", need], ["supplier_pack_count", "число новых упаковок", count],
      ["ordered", "новый отдельный заказ расходника", ordered], ["remaining", "неиспользованный пригодный остаток с резервом", remaining],
      ["free_beyond_reserve", "свободный пригодный остаток сверх резерва", `(${remaining})-${reserve}`] ] as const)
      .map(([key, title, expression]): AutomaticRowSpec => ({ rowId: `rcs:coating-consumable:${material.zone.key}:${material.key}:${key}`, formulaId: `rcs:coating-consumable:${material.zone.key}:${material.key}:${key}`,
        section: `Покрытие: ${material.zone.title}`, category: "material", title: `${material.title}: ${title}`, unitId: key === "supplier_pack_count" ? "package" : material.unit,
        expression, inclusion: key === "consumed" ? material.zone.positive : material.positive,
        costTreatment: key === "ordered" ? "OWN_COST" : "INFORMATIONAL_SCOPE", procurement: key === "ordered",
        inputParameterIds: [...material.zone.facts, material.zone.id("allocation_reference"), material.zone.id(`${material.work}_method_reference`),
          ...(key === "consumed" ? [] : [material.id("product_designation"), material.id("product_reference")]),
          ...(key === "ordered" ? [material.id("cost_basis")] : [])],
        ...(key === "ordered" ? { titleParameterIds: [material.id("product_designation")] } : {}) }));
  }),
);

/** One original straight section layout, not supplier order counts or a whole
 * network. GF's manual identifies compatible couplings, cleaning/marking,
 * peeling, alignment, full fusion/cooling and initial inspection resources:
 * https://www.gfps.com/content/dam/gfps/us/products/joining-technology/electrofusion/msa-340/gfcp-us-electrofusion-installation-training-manual-en.pdf
 * No brand, voltage, duration, SDR range, consumable rate or acceptance default.
 * End ties are actual separate nodes, never an automatic two extra joints. */
export const ROAD_CROSSING_SLEEVES_CARRIER_CONNECTION_MODES_R1 = Object.freeze({
  electrofusion: "Одна прямая рабочая ПЭ-труба из исходных целых секций: по одной совместимой электромуфте на соединение, отдельные фактические концевые врезки того же вида",
  otherParty: "Все соединения рабочей трубы и их ресурсы предоставлены другой стороной без отдельной оплаты исполнителем",
  prejoined: "Отсутствие монтажных соединений и концевых врезок в выбранной работе подтверждено фактической схемой",
  other: "Другие соединения, неодинаковые секции/узлы или иная поставка: отдельная программа ресурсов",
});
export const ROAD_CROSSING_SLEEVES_CARRIER_CONNECTION_MATERIAL_COST_BASIS_R1 = "Только новый заказ отдельного совместимого изделия или расходника соединений рабочей трубы с подтверждёнными потерями и резервом; без рабочей трубы, опор, концевых уплотнений футляра, всех работ, исполнителей, оборудования, энергии, доставки и отходов";
const carrierConnectionId = (suffix: string) => `rcs_carrier_connection_${suffix}`;
const carrierConnectionScope: AutomaticInclusionCondition = { kind: "greater_than", parameterId: "rcs_crossing_length_m", value: 0 };
const carrierConnectionSelected: AutomaticInclusionCondition = { kind: "and", operands: [carrierConnectionScope,
  { kind: "equals", parameterId: carrierConnectionId("mode"), value: ROAD_CROSSING_SLEEVES_CARRIER_CONNECTION_MODES_R1.electrofusion }] };
const carrierConnectionFacts = ["rcs_crossing_length_m", "rcs_carrier_total_end_extension_m", "rcs_carrier_product_designation", "rcs_carrier_supply_mode",
  "rcs_carrier_outside_diameter_mm", carrierConnectionId("mode"), carrierConnectionId("program_reference")];
const carrierConnectionGroups = [
  { key: "internal", title: "Монтажные соединения прямых секций рабочей трубы", quantity: `max(0,(${carrierQuantities.installed_section_count})-1)`,
    facts: [...carrierConnectionFacts, "rcs_carrier_physical_supply_section_length_m"] },
  { key: "ends", title: "Фактические концевые соединения рабочей трубы", quantity: carrierConnectionId("end_tie_in_count"),
    facts: [...carrierConnectionFacts, carrierConnectionId("end_tie_in_count")] },
].map(group => ({ ...group, id: (suffix: string) => carrierConnectionId(`${group.key}_${suffix}`),
  positive: { kind: "and", operands: [carrierConnectionSelected, { kind: "formula_greater_than", expression: group.quantity, unitId: "piece", value: 0 }] } as AutomaticInclusionCondition }));
const carrierConnectionWorks = [
  { key: "joining", title: "Подготовка, полная электромуфтовая сварка и фиксация при охлаждении", boundary: "все фактические стадии очистки/маркировки/резки/зачистки/округления/сборки/фиксации, полный предусмотренный цикл или циклы сварки и охлаждения с фактическими условиями и защитой; без первоначального отдельного контроля, втягивания рабочей трубы, опор, материалов и доставки" },
  { key: "inspection", title: "Первоначальный контроль соединений рабочей трубы", boundary: "предусмотренный программой первоначальный контроль совместимости/подготовки/ввода/циклов/выдержки выбранными приборами; без прогнозирования дефектов, ремонта, повторного контроля и испытания всей линии" },
] as const;
const carrierConnectionMaterials = [
  { key: "couplers", title: "Совместимые полные электромуфты", unit: "piece" },
  { key: "wash_water", title: "Пригодная вода первоначальной очистки", unit: "l" },
  { key: "cleaner", title: "Совместимый очиститель соединений ПЭ-трубы", unit: "l" },
  { key: "wipes", title: "Списываемые совместимые салфетки соединений", unit: "piece" },
  { key: "markers", title: "Фактически списываемые совместимые маркеры", unit: "piece" },
] as const;
const carrierConnectionMaterialBranches = carrierConnectionGroups.flatMap(group => carrierConnectionMaterials.map(material => {
  const id = (suffix: string) => group.id(`${material.key}_${suffix}`);
  const gross = material.key === "couplers" ? `(${group.quantity})+${id("preinstall_unusable_count")}` : `(${group.quantity})*${id("gross_per_joint")}`;
  const consumed = material.unit === "piece" ? `ceil(${gross})` : gross;
  // A known real connection always needs one complete coupler, even while
  // additional unusable units remain unknown. Do not hide its product passport
  // or block independent complete joining work behind that purchase balance.
  const positive: AutomaticInclusionCondition = material.key === "couplers" ? group.positive : { kind: "and", operands: [group.positive,
    { kind: "formula_greater_than", expression: consumed, unitId: material.unit, value: 0 }] };
  return { ...material, group, id, consumed, positive };
}));
export const ROAD_CROSSING_SLEEVES_CARRIER_CONNECTION_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: carrierConnectionId("mode"), title: "Подтверждённая технология и граница соединений рабочей трубы", valueType: "enum", unitId: null,
    values: Object.values(ROAD_CROSSING_SLEEVES_CARRIER_CONNECTION_MODES_R1), kind: "conditional", requiredWhen: carrierConnectionScope },
  { id: carrierConnectionId("program_reference"), title: "Фактическая схема и программа соединений рабочей трубы: исходные одинаковые секции, разные монтажные/концевые узлы, совместимость ПЭ/толщины/давления/среды и электромуфт, условия/циклы/охлаждение/приборы/квалификация и отдельные границы оплаты",
    valueType: "text", unitId: null, kind: "conditional", requiredWhen: carrierConnectionScope },
  { id: carrierConnectionId("end_tie_in_count"), title: "Фактические концевые врезки выбранного перехода с той же электромуфтой, без повторения монтажных стыков; отсутствие в этой работе — явный 0, не автоматически 2",
    valueType: "integer", unitId: "piece", min: 0, max: 2, kind: "conditional", requiredWhen: carrierConnectionSelected },
  ...carrierConnectionGroups.flatMap(group => {
    const text = (suffix: string, title: string): AutomaticParameterSpec => ({ id: group.id(suffix), title: `${group.title}: ${title}`,
      valueType: "text", unitId: null, kind: "conditional", requiredWhen: group.positive });
    return [text("allocation_reference", "фактические отдельные узлы, материалы и работы; без повторения других соединений и втягивания/опор рабочей трубы"),
      { id: group.id("pipe_wall_thickness_mm"), title: `${group.title}: фактическая стенка выбранной рабочей ПЭ-трубы по паспорту; не стенка футляра`,
        valueType: "decimal", unitId: "mm", min: 0.000_001, kind: "conditional", requiredWhen: group.positive } as AutomaticParameterSpec,
      { id: group.id("coupler_outside_envelope_mm"), title: `${group.title}: фактический максимальный наружный габарит полного соединения с выступами; совместимость с исходным проходом/опорами`,
        valueType: "decimal", unitId: "mm", min: 0.000_001, kind: "conditional", requiredWhen: group.positive,
        numericPeerConstraints: { greaterThanParameter: "rcs_carrier_outside_diameter_mm", lessThanOrEqualParameter: "rcs_maximum_joint_envelope_diameter_mm" } } as AutomaticParameterSpec,
      ...carrierConnectionWorks.flatMap(work => [text(`${work.key}_method_reference`, `фактическая совместимая процедура: ${work.boundary}`),
        ...(["crew", "equipment"] as const).flatMap(owner => [
          text(`${work.key}_${owner}_designation`, `${work.title}: ${owner === "crew" ? "все исполнители и операторы" : "весь совместимый комплект, фиксаторы/подготовка/защита или приборы, с энергией"}`),
          { id: group.id(`${work.key}_${owner}_h_per_joint`), title: `${group.title}, ${work.title}: фактические ${owner === "crew" ? "суммарные человеко-часы" : "часы полного комплекта"} на завершённое соединение со всеми стадиями и охлаждением один раз`,
            valueType: "decimal", unitId: `${owner === "crew" ? "man" : "machine"}_hour_per_piece`, min: 0, kind: "conditional", requiredWhen: group.positive } as AutomaticParameterSpec,
          { id: group.id(`${work.key}_${owner}_cost_basis`), title: `${group.title}, ${work.title}: отдельная граница ${owner === "crew" ? "труда" : "техники"}`,
            valueType: "enum", unitId: null, values: [ROAD_CROSSING_SLEEVES_CIVIL_EXECUTION_COST_BASES_R1[owner]], kind: "conditional", requiredWhen: group.positive } as AutomaticParameterSpec,
        ])]),
    ];
  }),
  ...carrierConnectionMaterialBranches.flatMap(material => {
    const text = (suffix: string, title: string): AutomaticParameterSpec => ({ id: material.id(suffix), title: `${material.group.title}, ${material.title}: ${title}`,
      valueType: "text", unitId: null, kind: "conditional", requiredWhen: material.positive });
    const amount = (suffix: string, title: string, min = 0): AutomaticParameterSpec => ({ id: material.id(suffix), title: `${material.group.title}, ${material.title}: ${title}`,
      valueType: material.unit === "piece" ? "integer" : "decimal", unitId: material.unit, min, kind: "conditional", requiredWhen: material.positive });
    return [material.key === "couplers"
      ? { id: material.id("preinstall_unusable_count"), title: `${material.group.title}: фактически непригодные муфты в ходе этой работы до установки, сверх одной полной муфты на узел; исходное наличие измерено до этих потерь, не прогноз дефектных швов и не дополнительные работы`,
        valueType: "integer", unitId: "piece", min: 0, kind: "conditional", requiredWhen: material.group.positive } as AutomaticParameterSpec
      : { id: material.id("gross_per_joint"), title: `${material.group.title}, ${material.title}: фактический полный расход на завершённое соединение с процессными потерями; целые затронутые изделия списаны по программе, отсутствие — явный 0`,
        valueType: "decimal", unitId: `${material.unit}_per_piece`, min: 0, kind: "conditional", requiredWhen: material.group.positive } as AutomaticParameterSpec,
      text("product_designation", "фактически выбранное совместимое изделие или материал"),
      text("product_reference", "фактический паспорт/программа совместимости трубы и полной муфты, давления/среды/стенки/габарита или очистки/маркировки/списания; исходное пригодное наличие выделено только этой группе узлов"),
      amount("compatible_stock", "пригодное исключительно выделенное наличие до работы, без будущих возвратов использованного"),
      amount("retained_reserve", "сохраняемый пригодный резерв"), amount("supplier_pack_net", "фактическое нетто в новой поставочной упаковке", material.unit === "piece" ? 1 : 0.000_001),
      { id: material.id("cost_basis"), title: `${material.group.title}, ${material.title}: отдельная граница нового заказа`, valueType: "enum", unitId: null,
        values: [ROAD_CROSSING_SLEEVES_CARRIER_CONNECTION_MATERIAL_COST_BASIS_R1], kind: "conditional", requiredWhen: material.positive } as AutomaticParameterSpec,
    ];
  }),
]);
export const ROAD_CROSSING_SLEEVES_CARRIER_CONNECTION_ROWS_R1: readonly AutomaticRowSpec[] = Object.freeze([
  { rowId: "rcs:carrier-connection:scope_length_m", formulaId: "rcs:carrier-connection:scope_length_m", section: "Соединения рабочей трубы", category: "service",
    title: "Длина перехода в подтверждённой программе соединений; без повторной оплаты трубы", unitId: "m", expression: "rcs_crossing_length_m", inclusion: carrierConnectionScope,
    costTreatment: "INFORMATIONAL_SCOPE", inputParameterIds: [carrierConnectionId("mode"), carrierConnectionId("program_reference")] },
  { rowId: "rcs:carrier-connection:incompatible_supply_layout", formulaId: "rcs:carrier-connection:incompatible_supply_layout", section: "Контроль схемы рабочей трубы", category: "service",
    title: "Выбранная электромуфтовая схема требует исходной поставки одинаковыми целыми секциями", unitId: "piece", expression: "-1",
    inclusion: { kind: "and", operands: [carrierConnectionSelected, { kind: "or", operands: [carrierSupplyModes.customerSupplied, carrierSupplyModes.other].map((value): AutomaticInclusionCondition => ({ kind: "equals", parameterId: "rcs_carrier_supply_mode", value })) }] },
    costTreatment: "INFORMATIONAL_SCOPE", formulaOutputBounds: { schemaVersion: "canonical_formula_output_bounds_v1", unitId: "piece", minimum: 0,
      reasonRu: "Для иной поставки или заранее соединённой рабочей трубы нужна её фактическая схема узлов; исходные монтажные стыки нельзя выводить из неподтверждённой длины поставочных секций." } },
  ...carrierConnectionGroups.flatMap((group): AutomaticRowSpec[] => {
    const facts = [...group.facts, group.id("allocation_reference"), group.id("pipe_wall_thickness_mm"), group.id("coupler_outside_envelope_mm"),
      "rcs_maximum_joint_envelope_diameter_mm", group.id("couplers_product_designation"), group.id("couplers_product_reference")];
    return [{ rowId: `rcs:carrier-connection:${group.key}:joint_count`, formulaId: `rcs:carrier-connection:${group.key}:joint_count`, section: group.title, category: "service",
      title: `${group.title}: фактическое число узлов, не закупка или швы футляра`, unitId: "piece", expression: group.quantity,
      inclusion: carrierConnectionSelected, costTreatment: "INFORMATIONAL_SCOPE", inputParameterIds: group.facts },
    { rowId: `rcs:carrier-connection:${group.key}:pipe_inside_diameter_mm`, formulaId: `rcs:carrier-connection:${group.key}:pipe_inside_diameter_mm`, section: group.title, category: "service",
      title: `${group.title}: контроль фактической стенки рабочей трубы`, unitId: "mm", expression: `rcs_carrier_outside_diameter_mm-2*${group.id("pipe_wall_thickness_mm")}`,
      inclusion: group.positive, costTreatment: "INFORMATIONAL_SCOPE", inputParameterIds: group.facts,
      formulaOutputBounds: { schemaVersion: "canonical_formula_output_bounds_v1", unitId: "mm", exclusiveMinimum: 0,
        reasonRu: "Две фактические стенки рабочей трубы должны быть меньше её наружного диаметра; ручное количество не исправляет невозможное сечение." } },
    ...carrierConnectionWorks.flatMap(work => (["crew", "equipment"] as const).map((owner): AutomaticRowSpec => ({
      rowId: `rcs:carrier-connection:${group.key}:${work.key}:${owner}_hours`, formulaId: `rcs:carrier-connection:${group.key}:${work.key}:${owner}_hours`, section: group.title,
      category: owner === "crew" ? "labor" : "equipment", title: `${group.title}, ${work.title}: ${owner === "crew" ? "все исполнители" : "полный совместимый комплект с энергией"}`,
      unitId: owner === "crew" ? "man_hour" : "machine_hour", expression: `(${group.quantity})*${group.id(`${work.key}_${owner}_h_per_joint`)}`,
      inclusion: group.positive, costTreatment: "OWN_COST", procurement: true, titleParameterIds: [group.id(`${work.key}_${owner}_designation`)],
      inputParameterIds: [...facts, group.id(`${work.key}_method_reference`), group.id(`${work.key}_${owner}_cost_basis`)],
    }))),
    ];
  }),
  ...carrierConnectionMaterialBranches.flatMap(material => {
    const stock = material.id("compatible_stock"), reserve = material.id("retained_reserve"), pack = material.id("supplier_pack_net");
    const need = `max(0,(${material.consumed})+${reserve}-${stock})`, count = `ceil((${need})/${pack})`, ordered = `(${count})*${pack}`, remaining = `${stock}+(${ordered})-(${material.consumed})`;
    return ([ ["consumed", "фактическое потребление; непригодные муфты до монтажа не дополнительные работы", material.consumed],
      ["new_need", "дополнительная потребность с резервом после пригодного наличия", need], ["supplier_pack_count", "число новых упаковок", count],
      ["ordered", "новый отдельный заказ", ordered], ["remaining", "пригодный неиспользованный остаток с резервом", remaining],
      ["free_beyond_reserve", "свободный пригодный остаток сверх резерва", `(${remaining})-${reserve}`] ] as const)
      .map(([key, title, expression]): AutomaticRowSpec => ({ rowId: `rcs:carrier-connection-material:${material.group.key}:${material.key}:${key}`, formulaId: `rcs:carrier-connection-material:${material.group.key}:${material.key}:${key}`,
        section: material.group.title, category: "material", title: `${material.title}: ${title}`, unitId: key === "supplier_pack_count" ? "package" : material.unit,
        expression, inclusion: key === "consumed" ? material.group.positive : material.positive,
        costTreatment: key === "ordered" ? "OWN_COST" : "INFORMATIONAL_SCOPE", procurement: key === "ordered",
        inputParameterIds: [...material.group.facts, material.group.id("allocation_reference"), material.group.id("pipe_wall_thickness_mm"), material.group.id("coupler_outside_envelope_mm"), "rcs_maximum_joint_envelope_diameter_mm",
          material.group.id("joining_method_reference"), material.group.id("couplers_product_designation"), material.group.id("couplers_product_reference"),
          ...(key === "consumed" ? [] : [material.id("product_designation"), material.id("product_reference")]), ...(key === "ordered" ? [material.id("cost_basis")] : [])],
        ...(key === "ordered" ? { titleParameterIds: [material.id("product_designation")] } : {}) }));
  }),
]);

/** Source-bound rented hydraulic sump-pump systems, not a groundwater design.
 * Godwin's handbook covers the pump end and refers other package equipment to
 * its own documentation. The complete actual kit/BOM, hydraulic operating
 * point, duty, discharge and all rates below are therefore PROJECT facts:
 * https://www.xylem.com/siteassets/brand/godwin/resources/manual/hs-series-installation-operation-and-maintenance-manual-.pdf
 * Pumping volume/time are never inferred from earthwork volume. */
export const ROAD_CROSSING_SLEEVES_WATER_CONTROL_MODES_R1 = Object.freeze({
  hydraulicRental: "Однородная группа арендованных полных гидравлических погружных насосных комплектов с топливными силовыми блоками и отдельным топливом; рабочие и резервные комплекты по фактической схеме",
  otherParty: "Водоотведение и все его ресурсы предоставлены другой стороной без отдельной оплаты исполнителем",
  notRequired: "Отсутствие водоотведения подтверждено фактической проектной схемой и условиями",
  other: "Другие насосы, неоднородные режимы, иглофильтры, постоянный водопонизительный контур или иные меры: отдельная программа ресурсов",
});
export const ROAD_CROSSING_SLEEVES_WATER_CONTROL_RENTAL_BASIS_R1 = "Наличие одного полного фактического арендованного насосного комплекта за календарный час, включая рабочее/нерабочее время и обычные сервисные жидкости; состав по ведомости, без топлива/энергии, всех исполнителей, монтажной подъёмной техники, доставки/возврата, фильтровальных расходников, приёма воды и отходов";
export const ROAD_CROSSING_SLEEVES_WATER_CONTROL_FUEL_BASIS_R1 = "Только новый заказ совместимого топлива на весь фактический профиль рабочих и резервных комплектов с потерями и резервом; без повторной энергии в аренде, работы, техники, доставки и отходов";
const waterControlId = (suffix: string) => `rcs_water_control_${suffix}`;
const waterControlScope: AutomaticInclusionCondition = { kind: "greater_than", parameterId: "rcs_crossing_length_m", value: 0 };
const waterControlSelected: AutomaticInclusionCondition = { kind: "and", operands: [waterControlScope,
  { kind: "equals", parameterId: waterControlId("mode"), value: ROAD_CROSSING_SLEEVES_WATER_CONTROL_MODES_R1.hydraulicRental }] };
const waterControlFacts = ["rcs_crossing_length_m", "rcs_civil_installation_method", waterControlId("mode"), waterControlId("program_reference"),
  waterControlId("allocation_reference"), waterControlId("kit_designation"), waterControlId("kit_product_reference")];
const waterControlSets = `${waterControlId("working_set_count")}+${waterControlId("standby_set_count")}`;
const waterControlSetHours = `(${waterControlSets})*${waterControlId("calendar_hours")}`;
const waterControlRunningHours = `${waterControlId("working_set_count")}*${waterControlId("calendar_hours")}*${waterControlId("working_duty_fraction")}`;
const waterControlVolume = `(${waterControlRunningHours})*${waterControlId("flow_at_actual_head_m3_h")}`;
const waterControlFuel = `(${waterControlSetHours})*${waterControlId("gross_fuel_l_per_deployed_set_hour")}`;
const waterControlFuelPositive: AutomaticInclusionCondition = { kind: "and", operands: [waterControlSelected,
  { kind: "formula_greater_than", expression: waterControlFuel, unitId: "l", value: 0 }] };
const waterControlKitMembers = [
  { key: "discharge_hose_m", title: "Фактический напорный рукав в составе арендованного комплекта", unit: "m", min: 0.000_001 },
  { key: "hydraulic_supply_hose_m", title: "Фактический подающий гидравлический рукав в составе комплекта", unit: "m", min: 0.000_001 },
  { key: "hydraulic_return_hose_m", title: "Фактический обратный гидравлический рукав в составе комплекта", unit: "m", min: 0.000_001 },
  { key: "coupling_count", title: "Фактические полные совместимые соединения рукавов в составе комплекта", unit: "piece", min: 1 },
  { key: "strainer_count", title: "Фактические совместимые входные защитные узлы в составе комплекта", unit: "piece", min: 0 },
  { key: "valve_count", title: "Фактические совместимые клапаны и запорные узлы в составе комплекта", unit: "piece", min: 0 },
] as const;
const waterControlWorks = [
  { key: "setup", title: "Установка и подключение полных насосных комплектов", quantity: waterControlSets, unit: "piece" },
  { key: "removal", title: "Отключение, дренирование и снятие полных насосных комплектов", quantity: waterControlSets, unit: "piece" },
] as const;
export const ROAD_CROSSING_SLEEVES_WATER_CONTROL_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: waterControlId("mode"), title: "Подтверждённая технология и граница водоотведения перехода", valueType: "enum", unitId: null,
    values: Object.values(ROAD_CROSSING_SLEEVES_WATER_CONTROL_MODES_R1), kind: "conditional", requiredWhen: waterControlScope },
  { id: waterControlId("program_reference"), title: "Фактическая схема водоотведения/отсутствия необходимости: вода и грунт, зоны/период, одинаковые рабочие комплекты и режимы, резерв, гидравлика всей линии, сброс/приём и границы ресурсов; не приёмка проекта",
    valueType: "text", unitId: null, kind: "conditional", requiredWhen: waterControlScope },
  ...[ ["allocation_reference", "Фактическое исключительное распределение насосных комплектов, всего периода и работ на этот переход; резерв не второй раз работающий насос"],
    ["kit_designation", "Фактический полный арендованный гидравлический насосный комплект с силовым блоком, двигателем, гидросистемой, рукавами и всеми совместимыми соединениями/защитными узлами"],
    ["kit_product_reference", "Фактическая полная ведомость состава и аренды плюс отдельные паспорта насоса/силового блока/рукавов/соединений, допустимость воды/частиц/напора/подачи и условий; паспорт одного насосного узла не подтверждает весь комплект"],
    ["discharge_reference", "Фактические качество и классификация воды, совместимый приёмник/маршрут сброса, требуемая обработка и отдельные границы оплаты; разрешение не выводится из расчёта"],
    ["operation_method_reference", "Фактическая процедура установки/гидравлических подключений/работы/ожидания/контроля/выключения/дренирования, допустимый режим и все исполнители/операторы, без повторной оплаты других этапов"],
    ["operation_crew_designation", "Все фактические исполнители и операторы всей насосной группы, включая предусмотренный контроль; не умножать готовую суммарную норму на каждый комплект"],
  ].map(([suffix, title]): AutomaticParameterSpec => ({ id: waterControlId(suffix), title, valueType: "text", unitId: null, kind: "conditional", requiredWhen: waterControlSelected })),
  ...[ ["working_set_count", "Рабочие полные одинаковые насосные комплекты по фактической схеме", "piece", 1],
    ["standby_set_count", "Фактические полные резервные комплекты в аренде; их работа не предполагается, отсутствие — явный 0", "piece", 0],
    ["calendar_hours", "Фактический календарный период наличия всех комплектов, включая установку/снятие/ожидание; не выводить из выемки", "hour", 0.000_001],
    ["working_duty_fraction", "Фактическая доля этого периода с работой каждого одинакового рабочего комплекта, от 0 до 1; резервное включение требует своего режима", "ratio", 0],
    ["actual_system_head_m", "Фактический полный рабочий напор выбранной линии со всеми геометрическими и гидравлическими потерями по схеме", "m", 0.000_001],
    ["flow_at_actual_head_m3_h", "Подтверждённая фактическая подача одного комплекта при этом напоре, воде/частицах и режиме по паспортам/схеме; не паспортный максимум без напора", "m3_per_hour", 0.000_001],
    ["required_average_inflow_m3_h", "Фактическая требуемая средняя подача всей однородной группы по проектной схеме воды и периода; явный 0 допустим только с обоснованием исходной воды", "m3_per_hour", 0],
    ["operation_all_crew_h_per_calendar_hour", "Фактические суммарные человеко-часы всех исполнителей/операторов группы на календарный час, включая режимы контроля/ожидания один раз", "man_hour_per_hour", 0],
    ["gross_fuel_l_per_deployed_set_hour", "Фактический средневзвешенный полный расход топлива на час общего наличия комплектов по сводке всей группы; разные рабочие/нерабочие/резервные режимы и все потери включены один раз, одинаковый расход всех насосов не предполагается", "l_per_hour", 0],
  ].map(([suffix, title, unit, min]): AutomaticParameterSpec => ({ id: waterControlId(String(suffix)), title: String(title), valueType: unit === "piece" ? "integer" : "decimal",
    unitId: String(unit), min: Number(min), ...(suffix === "working_duty_fraction" ? { max: 1 } : {}), kind: "conditional", requiredWhen: waterControlSelected })),
  ...waterControlKitMembers.map(member => ({ id: waterControlId(`kit_${member.key}`), title: `${member.title}: фактическое количество на один полный комплект по ведомости, не новая отдельная закупка`,
    valueType: member.unit === "piece" ? "integer" : "decimal", unitId: member.unit, min: member.min, kind: "conditional", requiredWhen: waterControlSelected }) as AutomaticParameterSpec),
  { id: waterControlId("rental_cost_basis"), title: "Отдельная граница наличия полного арендованного насосного комплекта", valueType: "enum", unitId: null,
    values: [ROAD_CROSSING_SLEEVES_WATER_CONTROL_RENTAL_BASIS_R1], kind: "conditional", requiredWhen: waterControlSelected },
  { id: waterControlId("operation_crew_cost_basis"), title: "Отдельная граница всех исполнителей насосной группы", valueType: "enum", unitId: null,
    values: [ROAD_CROSSING_SLEEVES_CIVIL_EXECUTION_COST_BASES_R1.crew], kind: "conditional", requiredWhen: waterControlSelected },
  ...waterControlWorks.flatMap(work => [
    { id: waterControlId(`${work.key}_method_reference`), title: `${work.title}: фактическая совместимая процедура и полный подбор подъёма/доступа/гидравлических подключений без пересечения с эксплуатационным трудом`,
      valueType: "text", unitId: null, kind: "conditional", requiredWhen: waterControlSelected } as AutomaticParameterSpec,
    ...(["crew", "equipment"] as const).flatMap(owner => [
      { id: waterControlId(`${work.key}_${owner}_designation`), title: `${work.title}: ${owner === "crew" ? "все исполнители, включая операторов подъёмной техники" : "совместимая монтажная подъёмная техника с энергией, отдельно от арендованного насосного комплекта"}`,
        valueType: "text", unitId: null, kind: "conditional", requiredWhen: waterControlSelected } as AutomaticParameterSpec,
      { id: waterControlId(`${work.key}_${owner}_h_per_set`), title: `${work.title}: фактические ${owner === "crew" ? "суммарные человеко-часы" : "часы монтажной техники"} на один полный развёрнутый комплект`,
        valueType: "decimal", unitId: `${owner === "crew" ? "man" : "machine"}_hour_per_piece`, min: 0, kind: "conditional", requiredWhen: waterControlSelected } as AutomaticParameterSpec,
      { id: waterControlId(`${work.key}_${owner}_cost_basis`), title: `${work.title}: отдельная граница ${owner === "crew" ? "труда" : "монтажной техники"}`,
        valueType: "enum", unitId: null, values: [ROAD_CROSSING_SLEEVES_CIVIL_EXECUTION_COST_BASES_R1[owner]], kind: "conditional", requiredWhen: waterControlSelected } as AutomaticParameterSpec,
    ]),
  ]),
  ...[ ["fuel_product_designation", "Фактически выбранное совместимое топливо силового блока"],
    ["fuel_product_reference", "Паспортная совместимость топлива силового блока, пригодность исключительно выделенного наличия и полный однородный расход с режимами/потерями"] ]
    .map(([suffix, title]): AutomaticParameterSpec => ({ id: waterControlId(suffix), title, valueType: "text", unitId: null, kind: "conditional", requiredWhen: waterControlFuelPositive })),
  ...[ ["fuel_compatible_stock_l", "Пригодное исключительно выделенное топливо до работы", 0], ["fuel_retained_reserve_l", "Сохраняемый пригодный резерв топлива", 0],
    ["fuel_supplier_pack_net_l", "Фактические литры без тары в новой поставочной упаковке топлива", 0.000_001] ]
    .map(([suffix, title, min]): AutomaticParameterSpec => ({ id: waterControlId(String(suffix)), title: String(title), valueType: "decimal", unitId: "l", min: Number(min), kind: "conditional", requiredWhen: waterControlFuelPositive })),
  { id: waterControlId("fuel_cost_basis"), title: "Отдельная граница нового заказа топлива", valueType: "enum", unitId: null,
    values: [ROAD_CROSSING_SLEEVES_WATER_CONTROL_FUEL_BASIS_R1], kind: "conditional", requiredWhen: waterControlFuelPositive },
]);
export const ROAD_CROSSING_SLEEVES_WATER_CONTROL_ROWS_R1: readonly AutomaticRowSpec[] = Object.freeze([
  { rowId: "rcs:water-control:scope_length_m", formulaId: "rcs:water-control:scope_length_m", section: "Водоотведение перехода", category: "service",
    title: "Длина перехода в фактической программе водоотведения; без повторной оплаты выемки", unitId: "m", expression: "rcs_crossing_length_m", inclusion: waterControlScope,
    costTreatment: "INFORMATIONAL_SCOPE", inputParameterIds: [waterControlId("mode"), waterControlId("program_reference")] },
  ...[ ["deployed_set_count", "Полные рабочие и резервные насосные комплекты на объекте", waterControlSets, "piece"],
    ["deployed_set_hours", "Календарное наличие всех полных комплектов; не время работы всех насосов", waterControlSetHours, "set_hour"],
    ["operating_pump_hours", "Суммарное фактическое время работы только одинаковых рабочих насосов", waterControlRunningHours, "machine_hour"],
    ["pumped_water_m3", "Расчётная вода по фактическому рабочему режиму и подаче; не объём выемки и не автоматически разрешённый сброс", waterControlVolume, "m3"],
  ].map(([key, title, expression, unitId]): AutomaticRowSpec => ({ rowId: `rcs:water-control:${key}`, formulaId: `rcs:water-control:${key}`, section: "Водоотведение перехода", category: "equipment",
    title, expression, unitId, inclusion: waterControlSelected, costTreatment: "INFORMATIONAL_SCOPE", inputParameterIds: waterControlFacts })),
  { rowId: "rcs:water-control:available_average_flow_m3_h", formulaId: "rcs:water-control:available_average_flow_m3_h", section: "Контроль фактической подачи", category: "service",
    title: "Средняя подача рабочих насосов сверх фактической требуемой подачи группы; не инженерная приёмка", unitId: "m3_per_hour",
    expression: `${waterControlId("working_set_count")}*${waterControlId("working_duty_fraction")}*${waterControlId("flow_at_actual_head_m3_h")}-${waterControlId("required_average_inflow_m3_h")}`,
    inclusion: waterControlSelected, costTreatment: "INFORMATIONAL_SCOPE", inputParameterIds: [...waterControlFacts, waterControlId("actual_system_head_m")],
    formulaOutputBounds: { schemaVersion: "canonical_formula_output_bounds_v1", unitId: "m3_per_hour", minimum: 0,
      reasonRu: "Подтверждённая средняя подача рабочих насосов должна покрывать фактическую требуемую подачу этой схемы; резерв не предполагается работающим, ручная аренда не исправляет недостаток." } },
  ...waterControlKitMembers.map((member): AutomaticRowSpec => ({ rowId: `rcs:water-control:kit:${member.key}`, formulaId: `rcs:water-control:kit:${member.key}`, section: "Фактический состав насосных комплектов",
    category: "equipment", title: `${member.title}; количество во всех рабочих и резервных комплектах без второй оплаты`, unitId: member.unit,
    expression: `(${waterControlSets})*${waterControlId(`kit_${member.key}`)}`, inclusion: waterControlSelected, costTreatment: "INFORMATIONAL_SCOPE", inputParameterIds: waterControlFacts })),
  { rowId: "rcs:water-control:rental_set_hours", formulaId: "rcs:water-control:rental_set_hours", section: "Аренда насосных комплектов", category: "equipment",
    title: "Календарное наличие полных фактических насосных комплектов, включая резерв и весь состав, отдельно от энергии", unitId: "set_hour", expression: waterControlSetHours,
    inclusion: waterControlSelected, costTreatment: "OWN_COST", procurement: true, titleParameterIds: [waterControlId("kit_designation")],
    inputParameterIds: [...waterControlFacts, waterControlId("rental_cost_basis"), waterControlId("actual_system_head_m"), waterControlId("flow_at_actual_head_m3_h"), waterControlId("discharge_reference"), ...waterControlKitMembers.map(member => waterControlId(`kit_${member.key}`))] },
  { rowId: "rcs:water-control:operation_crew_hours", formulaId: "rcs:water-control:operation_crew_hours", section: "Эксплуатация насосной группы", category: "labor",
    title: "Все исполнители и операторы всей группы за весь период без повторного умножения на насосы", unitId: "man_hour",
    expression: `${waterControlId("calendar_hours")}*${waterControlId("operation_all_crew_h_per_calendar_hour")}`, inclusion: waterControlSelected,
    costTreatment: "OWN_COST", procurement: true, titleParameterIds: [waterControlId("operation_crew_designation")],
    inputParameterIds: [...waterControlFacts, waterControlId("operation_method_reference"), waterControlId("operation_crew_cost_basis"), waterControlId("discharge_reference")] },
  ...waterControlWorks.flatMap(work => (["crew", "equipment"] as const).map((owner): AutomaticRowSpec => ({
    rowId: `rcs:water-control:${work.key}:${owner}_hours`, formulaId: `rcs:water-control:${work.key}:${owner}_hours`, section: work.title,
    category: owner === "crew" ? "labor" : "equipment", title: `${work.title}: ${owner === "crew" ? "все исполнители" : "совместимая монтажная подъёмная техника с энергией"}`,
    unitId: owner === "crew" ? "man_hour" : "machine_hour", expression: `(${work.quantity})*${waterControlId(`${work.key}_${owner}_h_per_set`)}`,
    inclusion: waterControlSelected, costTreatment: "OWN_COST", procurement: true, titleParameterIds: [waterControlId(`${work.key}_${owner}_designation`)],
    inputParameterIds: [...waterControlFacts, waterControlId(`${work.key}_method_reference`), waterControlId(`${work.key}_${owner}_cost_basis`)],
  }))),
  ...((): AutomaticRowSpec[] => {
    const need = `max(0,(${waterControlFuel})+${waterControlId("fuel_retained_reserve_l")}-${waterControlId("fuel_compatible_stock_l")})`;
    const packs = `ceil((${need})/${waterControlId("fuel_supplier_pack_net_l")})`, ordered = `(${packs})*${waterControlId("fuel_supplier_pack_net_l")}`;
    const remaining = `${waterControlId("fuel_compatible_stock_l")}+(${ordered})-(${waterControlFuel})`;
    return [{ rowId: "rcs:water-control:fuel:operating_energy_l", formulaId: "rcs:water-control:fuel:operating_energy_l", section: "Контроль отдельного топлива", category: "service",
      title: "При работе топливных силовых блоков полный расход топлива не может быть скрыт явным нулём", unitId: "l", expression: waterControlFuel,
      inclusion: { kind: "and", operands: [waterControlSelected, { kind: "formula_greater_than", expression: waterControlRunningHours, unitId: "machine_hour", value: 0 }] },
      costTreatment: "INFORMATIONAL_SCOPE", inputParameterIds: waterControlFacts,
      formulaOutputBounds: { schemaVersion: "canonical_formula_output_bounds_v1", unitId: "l", exclusiveMinimum: 0,
        reasonRu: "Работа выбранных топливных силовых блоков требует положительного подтверждённого расхода; энергия другой технологии или другой стороны нуждается в своей схеме, а не нулевом расходе." } },
      ...([ ["consumed_l", "Фактический полный расход топлива рабочих/нерабочих/резервных режимов с потерями", waterControlFuel, "l"],
      ["new_need_l", "Дополнительное топливо с резервом после пригодного наличия", need, "l"], ["supplier_pack_count", "Число новых упаковок топлива", packs, "package"],
      ["ordered_l", "Новый отдельный заказ совместимого топлива", ordered, "l"], ["remaining_l", "Пригодное неиспользованное топливо с резервом", remaining, "l"],
      ["free_beyond_reserve_l", "Свободное пригодное топливо сверх резерва", `(${remaining})-${waterControlId("fuel_retained_reserve_l")}`, "l"] ] as const)
      .map(([key, title, expression, unitId]): AutomaticRowSpec => ({ rowId: `rcs:water-control:fuel:${key}`, formulaId: `rcs:water-control:fuel:${key}`, section: "Топливо насосных комплектов", category: "material",
        title, expression, unitId, inclusion: key === "consumed_l" ? waterControlSelected : waterControlFuelPositive,
        costTreatment: key === "ordered_l" ? "OWN_COST" : "INFORMATIONAL_SCOPE", procurement: key === "ordered_l",
        inputParameterIds: [...waterControlFacts, ...(key === "consumed_l" ? [] : [waterControlId("fuel_product_designation"), waterControlId("fuel_product_reference")]),
          ...(key === "ordered_l" ? [waterControlId("fuel_cost_basis"), waterControlId("operation_method_reference")] : [])],
        ...(key === "ordered_l" ? { titleParameterIds: [waterControlId("fuel_product_designation")] } : {}) })),
    ];
  })(),
]);

const waterTreatment = buildRoadCrossingSleevesWaterTreatmentResourcesR1({ selected: waterControlSelected, facts: waterControlFacts,
  calendarHoursId: waterControlId("calendar_hours"), volumeExpression: waterControlVolume,
  workingSetCountId: waterControlId("working_set_count"), flowId: waterControlId("flow_at_actual_head_m3_h"),
  headId: waterControlId("actual_system_head_m"), dischargeId: waterControlId("discharge_reference"),
  originalVolumeParameterIds: ["working_set_count", "calendar_hours", "working_duty_fraction", "flow_at_actual_head_m3_h"].map(waterControlId),
  receivingExcludedWaterId: "rcs_water_receiving_excluded_water_m3", receivingAllocationReferenceId: "rcs_water_receiving_allocation_reference",
  crewCostBasis: ROAD_CROSSING_SLEEVES_CIVIL_EXECUTION_COST_BASES_R1.crew, equipmentCostBasis: ROAD_CROSSING_SLEEVES_CIVIL_EXECUTION_COST_BASES_R1.equipment });
export const ROAD_CROSSING_SLEEVES_WATER_TREATMENT_PARAMETERS_R1 = waterTreatment.parameters;
export const ROAD_CROSSING_SLEEVES_WATER_TREATMENT_ROWS_R1 = waterTreatment.rows;
/** The receiver owns only the actually allocated output stream, not pumped
 * water automatically assumed to be permitted discharge. Treatment need is
 * project-specific: https://www.xylem.com/en-us/catalog/products--services/services/temporary-water-treatment/trench-dewatering/ */
export const ROAD_CROSSING_SLEEVES_WATER_RECEIVING_MODES_R1 = Object.freeze({
  separate: "Отдельно оплачиваемый приём всего фактически выделенного остатка воды одним подтверждённым получателем за м³",
  otherParty: "Приём фактически выделенной воды обеспечен другой стороной без отдельной оплаты исполнителем",
  other: "Разные получатели, неоднородная вода или иная граница оплаты: отдельная программа приёма",
});
export const ROAD_CROSSING_SLEEVES_WATER_RECEIVING_COST_BASIS_R1 = "Только приём фактически выделенного объёма воды в м³ подтверждённым получателем с полным составом его услуги; без насосов, очистки на объекте, доставки/перекачки и приёма фильтровальных отходов";
const waterReceivingId = (suffix: string) => `rcs_water_receiving_${suffix}`;
const waterOutputPositive: AutomaticInclusionCondition = { kind: "and", operands: [waterControlSelected,
  { kind: "formula_greater_than", expression: waterControlVolume, unitId: "m3", value: 0 }] };
const waterReceivingVolume = `(${waterControlVolume})-${waterReceivingId("excluded_water_m3")}`;
const waterReceivingPaid: AutomaticInclusionCondition = { kind: "and", operands: [waterOutputPositive,
  { kind: "equals", parameterId: waterReceivingId("mode"), value: ROAD_CROSSING_SLEEVES_WATER_RECEIVING_MODES_R1.separate },
  { kind: "formula_greater_than", expression: waterReceivingVolume, unitId: "m3", value: 0 }] };
const waterReceivingFacts = [...waterControlFacts, ...["working_set_count", "calendar_hours", "working_duty_fraction", "flow_at_actual_head_m3_h", "actual_system_head_m", "discharge_reference"].map(waterControlId),
  waterReceivingId("mode"), waterReceivingId("allocation_reference"), waterReceivingId("excluded_water_m3")];
export const ROAD_CROSSING_SLEEVES_WATER_RECEIVING_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: waterReceivingId("mode"), title: "Фактическая граница приёма откачанной воды", valueType: "enum", unitId: null,
    values: Object.values(ROAD_CROSSING_SLEEVES_WATER_RECEIVING_MODES_R1), kind: "conditional", requiredWhen: waterOutputPositive },
  { id: waterReceivingId("allocation_reference"), title: "Фактическая классификация/качество воды, маршрут и один получатель всего выделенного потока после обработки; исключённый объём выделен другим целям/получателям, включая воду в отходах, без повторного учёта; расчёт не подтверждает допустимость сброса",
    valueType: "text", unitId: null, kind: "conditional", requiredWhen: waterOutputPositive },
  { id: waterReceivingId("excluded_water_m3"), title: "Фактически выделенная вода из откачанного объёма, которая остаётся/идёт другим целям или получателям и не оплачивается здесь, включая воду в фильтровальных отходах; отсутствие — явный 0",
    valueType: "decimal", unitId: "m3", min: 0, kind: "conditional", requiredWhen: waterOutputPositive },
  ...[ ["receiver_designation", "Фактический получатель всей выделенной воды и полная отдельная услуга приёма"],
    ["receiver_reference", "Фактическое подтверждение качества, допустимости/вместимости/периода приёма, учёта м³ и полного состава услуги одного получателя без пересечения с ресурсами объекта"] ]
    .map(([suffix, title]): AutomaticParameterSpec => ({ id: waterReceivingId(suffix), title, valueType: "text", unitId: null, kind: "conditional", requiredWhen: waterReceivingPaid })),
  { id: waterReceivingId("cost_basis"), title: "Отдельная граница оплаты приёма воды", valueType: "enum", unitId: null,
    values: [ROAD_CROSSING_SLEEVES_WATER_RECEIVING_COST_BASIS_R1], kind: "conditional", requiredWhen: waterReceivingPaid },
]);
export const ROAD_CROSSING_SLEEVES_WATER_RECEIVING_ROWS_R1: readonly AutomaticRowSpec[] = Object.freeze([
  { rowId: "rcs:water-receiving:allocated_water_m3", formulaId: "rcs:water-receiving:allocated_water_m3", section: "Приём откачанной воды", category: "service",
    title: "Фактически выделенный получателю остаток откачанной воды после исключения иных объёмов; без автоматического разрешения сброса", unitId: "m3",
    expression: waterReceivingVolume, inclusion: waterOutputPositive, costTreatment: "INFORMATIONAL_SCOPE", inputParameterIds: waterReceivingFacts,
    formulaOutputBounds: { schemaVersion: "canonical_formula_output_bounds_v1", unitId: "m3", minimum: 0,
      reasonRu: "Другим целям/получателям и воде в отходах нельзя выделить больше исходного откачанного объёма; ручная услуга приёма не исправляет отрицательный баланс." } },
  { rowId: "rcs:water-receiving:separate_receiving_m3", formulaId: "rcs:water-receiving:separate_receiving_m3", section: "Приём откачанной воды", category: "service",
    title: "Отдельная полная услуга фактического получателя выделенной воды без повторной оплаты ресурсов объекта", unitId: "m3", expression: waterReceivingVolume,
    inclusion: waterReceivingPaid, costTreatment: "OWN_COST", procurement: true, titleParameterIds: [waterReceivingId("receiver_designation")],
    inputParameterIds: [...waterReceivingFacts, waterReceivingId("receiver_reference"), waterReceivingId("cost_basis")] },
]);

/** Actual initial straight-axis staking has its own physical resources.
 * FHWA FP-24 section 152 identifies selected survey/control methods, marking,
 * maintenance/replacement and final removal; it does not give this project's
 * pitch, point count, productivity or material rates. No US tolerance or legal
 * acceptance is transplanted into this component. Additional off-axis points
 * and replacement events are real disjoint plan facts, not derived duplicates.
 * https://highways.dot.gov/sites/fhwa.dot.gov/files/FP-24.pdf */
export const ROAD_CROSSING_SLEEVES_PREPARATION_MODES_R1 = Object.freeze({
  straightAxis: "Прямая ось с одним колом на точку и отдельной маркировочной краской",
  otherParty: "Готовая разбивка и её обслуживание предоставлены другой стороной без отдельной оплаты исполнителем",
  other: "Другие схемы разбивки: отдельная программа ресурсов",
});
export const ROAD_CROSSING_SLEEVES_PREPARATION_MATERIAL_COST_BASIS_R1 = "Только новый заказ выбранного материала разбивки с учтёнными потерями и резервом; без труда, приборов, энергии, доставки, удаления и повторной оплаты тех же ресурсов";
const preparationId = (suffix: string) => `rcs_preparation_${suffix}`;
const preparationScope: AutomaticInclusionCondition = { kind: "greater_than", parameterId: "rcs_crossing_length_m", value: 0 };
const preparationAxis: AutomaticInclusionCondition = { kind: "and", operands: [preparationScope,
  { kind: "equals", parameterId: preparationId("mode"), value: ROAD_CROSSING_SLEEVES_PREPARATION_MODES_R1.straightAxis }] };
const axisMarkerCount = "ceil(rcs_crossing_length_m/rcs_preparation_axis_marker_pitch_m)+1";
const initialMarkerCount = `(${axisMarkerCount})+${preparationId("additional_marker_count")}`;
const markerEvents = `(${initialMarkerCount})+${preparationId("marker_replacement_count")}`;
const preparationFacts = ["rcs_crossing_length_m", preparationId("mode"), preparationId("program_reference"),
  preparationId("axis_marker_pitch_m"), preparationId("additional_marker_count")];
const preparationWorks = [
  { key: "initial", title: "Первоначальная разбивка и установка маркированных точек", quantity: initialMarkerCount, inclusion: preparationAxis,
    boundary: "проверка исходного геодезического контроля, разбивка, установка и маркировка точек; без расчистки, материалов, замены, удаления и исполнительной съёмки" },
  { key: "replacement", title: "Подтверждённые замены маркированных точек", quantity: preparationId("marker_replacement_count"),
    inclusion: { kind: "and", operands: [preparationAxis, { kind: "greater_than", parameterId: preparationId("marker_replacement_count"), value: 0 }] } as AutomaticInclusionCondition,
    boundary: "снятие нарушенного кола и старой маркировки, повторная разбивка и установка замены; без материалов и повторного учёта снятого кола при завершении" },
  { key: "removal", title: "Удаление действующей временной разбивки при завершении", quantity: initialMarkerCount, inclusion: preparationAxis,
    boundary: "удаление оставшихся действующих колов и маркировки с согласованной защитой основания и исходных реперов; без уже снятых замен, материалов, транспортировки и приёма отходов" },
];
const preparationMaterials = [
  { key: "stakes", title: "Колья выбранной разбивки", unit: "piece", consumed: markerEvents },
  { key: "paint", title: "Маркировочная краска выбранной разбивки", unit: "kg", consumed: `(${markerEvents})*${preparationId("paint_gross_kg_per_marker")}` },
] as const;
export const ROAD_CROSSING_SLEEVES_PREPARATION_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: preparationId("mode"), title: "Подтверждённая схема и граница оплаты разбивки перехода", valueType: "enum", unitId: null,
    kind: "conditional", values: Object.values(ROAD_CROSSING_SLEEVES_PREPARATION_MODES_R1), requiredWhen: preparationScope },
  { id: preparationId("program_reference"), title: "Фактическая программа разбивки, геодезический контроль, схема точек и границы первоначальной установки, замены и удаления",
    valueType: "text", unitId: null, kind: "conditional", requiredWhen: preparationScope },
  { id: preparationId("axis_marker_pitch_m"), title: "Подтверждённый максимальный интервал маркеров одной прямой оси; оба конца учитываются автоматически",
    valueType: "decimal", unitId: "m", min: 0.000_001, kind: "conditional", requiredWhen: preparationAxis },
  ...(["additional_marker_count", "marker_replacement_count"] as const).map(suffix => ({ id: preparationId(suffix),
    title: suffix === "additional_marker_count" ? "Фактические дополнительные точки вне прямой оси по плану, без повторения концов и уже предоставленных исходных реперов"
      : "Подтверждённые события замены маркированных точек по программе; не резерв материала или повторение первоначальных точек",
    valueType: "integer", unitId: "piece", min: 0, kind: "conditional", requiredWhen: preparationAxis } as AutomaticParameterSpec)),
  { id: preparationId("paint_gross_kg_per_marker"), title: "Полный расход выбранной маркировочной краски на первоначальную или заменяемую точку, уже со всеми процессными потерями",
    valueType: "decimal", unitId: "kg_per_piece", min: 0, kind: "conditional", requiredWhen: preparationAxis },
  ...preparationWorks.flatMap(work => {
    const text = (suffix: string, title: string): AutomaticParameterSpec => ({ id: preparationId(`${work.key}_${suffix}`), title: `${work.title}: ${title}`,
      valueType: "text", unitId: null, kind: "conditional", requiredWhen: work.inclusion });
    return [text("method_reference", `фактическая процедура и граница: ${work.boundary}`),
      ...(["crew", "equipment"] as const).flatMap(owner => [
        text(`${owner}_designation`, owner === "crew" ? "фактические исполнители, включая операторов" : "фактические совместимые приборы или оборудование с энергией, без персонала"),
        { id: preparationId(`${work.key}_${owner}_h_per_marker`), title: `${work.title}: ${owner === "crew" ? "суммарные человеко-часы" : "часы выбранного комплекта"} на фактическую точку или событие`,
          valueType: "decimal", unitId: `${owner === "crew" ? "man" : "machine"}_hour_per_piece`, min: 0, kind: "conditional", requiredWhen: work.inclusion } as AutomaticParameterSpec,
        { id: preparationId(`${work.key}_${owner}_cost_basis`), title: `${work.title}: отдельная граница ${owner === "crew" ? "труда" : "приборов или оборудования"}`,
          valueType: "enum", unitId: null, values: [ROAD_CROSSING_SLEEVES_CIVIL_EXECUTION_COST_BASES_R1[owner]], kind: "conditional", requiredWhen: work.inclusion } as AutomaticParameterSpec,
      ])];
  }),
  ...preparationMaterials.flatMap(material => {
    const id = (suffix: string) => preparationId(`${material.key}_${suffix}`);
    const text = (suffix: string, title: string): AutomaticParameterSpec => ({ id: id(suffix), title: `${material.title}: ${title}`,
      valueType: "text", unitId: null, kind: "conditional", requiredWhen: preparationAxis });
    const amount = (suffix: string, title: string, min = 0): AutomaticParameterSpec => ({ id: id(suffix), title: `${material.title}: ${title}`,
      valueType: material.unit === "piece" ? "integer" : "decimal", unitId: material.unit, min, kind: "conditional", requiredWhen: preparationAxis });
    return [text("product_designation", "выбранное совместимое изделие или материал"), text("product_reference", "подтверждённая спецификация и совместимость программы; без включения в другую расценку"),
      ...(material.key === "stakes" ? [amount("pre_install_unusable", "фактические непригодные до установки единицы; не события замены уже установленных точек")] : []),
      amount("compatible_stock", "пригодное выделенное наличие до начала работ; будущий возврат уже использованных материалов здесь не учитывать"),
      amount("retained_reserve", "сохраняемый резерв выбранного материала"), amount("supplier_pack_net", "фактическое количество или масса без тары в упаковке", material.unit === "piece" ? 1 : 0.000_001),
      { id: id("cost_basis"), title: `${material.title}: отдельная граница стоимости нового заказа`, valueType: "enum", unitId: null,
        values: [ROAD_CROSSING_SLEEVES_PREPARATION_MATERIAL_COST_BASIS_R1], kind: "conditional", requiredWhen: preparationAxis } as AutomaticParameterSpec];
  }),
]);
export const ROAD_CROSSING_SLEEVES_PREPARATION_ROWS_R1: readonly AutomaticRowSpec[] = Object.freeze([
  { rowId: "rcs:preparation:scope_length_m", formulaId: "rcs:preparation:scope_length_m", section: "Подготовка: разбивка перехода", category: "service",
    title: "Длина перехода в выбранной программе разбивки; не отдельная повторная оплата", unitId: "m", expression: "rcs_crossing_length_m",
    inclusion: preparationScope, costTreatment: "INFORMATIONAL_SCOPE", inputParameterIds: [preparationId("mode"), preparationId("program_reference")] },
  ...([ ["axis_marker_count", "Точки одной прямой оси с обоими концами", axisMarkerCount],
    ["initial_marker_count", "Первоначальные точки оси и непересекающиеся дополнительные точки", initialMarkerCount],
    ["marker_installation_events", "Все установки колов, включая подтверждённые замены; не резерв или упаковки", markerEvents] ] as const)
    .map(([key, title, expression]): AutomaticRowSpec => ({ rowId: `rcs:preparation:${key}`, formulaId: `rcs:preparation:${key}`,
      section: "Подготовка: разбивка перехода", category: "service", title, unitId: "piece", expression,
      inclusion: preparationAxis, costTreatment: "INFORMATIONAL_SCOPE", inputParameterIds: preparationFacts })),
  ...preparationWorks.flatMap(work => (["crew", "equipment"] as const).map((owner): AutomaticRowSpec => ({
    rowId: `rcs:preparation:${work.key}:${owner}_hours`, formulaId: `rcs:preparation:${work.key}:${owner}_hours`, section: work.title,
    category: owner === "crew" ? "labor" : "equipment", title: `${work.title}: ${owner === "crew" ? "труд всех исполнителей" : "совместимые приборы или техника с энергией"}`,
    unitId: owner === "crew" ? "man_hour" : "machine_hour", expression: `(${work.quantity})*${preparationId(`${work.key}_${owner}_h_per_marker`)}`,
    inclusion: work.inclusion, procurement: true, titleParameterIds: [preparationId(`${work.key}_${owner}_designation`)],
    inputParameterIds: [...preparationFacts, ...(work.key === "replacement" ? [preparationId("marker_replacement_count")] : []),
      preparationId(`${work.key}_method_reference`), preparationId(`${work.key}_${owner}_cost_basis`)],
  }))),
  ...preparationMaterials.flatMap(material => {
    const id = (suffix: string) => preparationId(`${material.key}_${suffix}`);
    const consumed = `(${material.consumed})${material.key === "stakes" ? `+${id("pre_install_unusable")}` : ""}`;
    const stock = id("compatible_stock"), reserve = id("retained_reserve"), pack = id("supplier_pack_net");
    const need = `max(0,(${consumed})+${reserve}-${stock})`, packs = `ceil((${need})/${pack})`, ordered = `(${packs})*${pack}`;
    const remaining = `${stock}+(${ordered})-(${consumed})`;
    return ([ ["consumed", "Расход на установки и замены, включая процессные потери", consumed], ["new_need", "Дополнительная потребность с резервом после пригодного наличия", need],
      ["supplier_pack_count", "Число новых упаковок; не работа или рейсы", packs], ["ordered", "Новый заказ выбранного материала разбивки", ordered],
      ["remaining", "Неиспользованный остаток до возможного возврата ранее установленных материалов, включая резерв", remaining],
      ["free_beyond_reserve", "Свободный неиспользованный материал сверх сохраняемого резерва", `(${remaining})-${reserve}`] ] as const)
      .map(([key, title, expression]): AutomaticRowSpec => ({ rowId: `rcs:preparation:${material.key}:${key}`, formulaId: `rcs:preparation:${material.key}:${key}`,
        section: material.title, category: "material", title: `${material.title}: ${title}`, unitId: key === "supplier_pack_count" ? "package" : material.unit,
        expression, inclusion: preparationAxis, costTreatment: key === "ordered" ? "OWN_COST" : "INFORMATIONAL_SCOPE", procurement: key === "ordered",
        inputParameterIds: [...preparationFacts, preparationId("marker_replacement_count"), id("product_designation"), id("product_reference"),
          ...(key === "ordered" ? [id("cost_basis")] : [])], ...(key === "ordered" ? { titleParameterIds: [id("product_designation")] } : {}) }));
  }),
]);

/** Inspection consumes real work/equipment/materials, not a document row.
 * TWI describes distinct inspection methods and procedure-specific repair:
 * https://www.twi-global.com/what-we-do/services-and-support/asset-management/non-destructive-testing
 * https://www.twi-global.com/what-we-do/services-and-support/failure-analysis-and-repair/repair-procedure-development
 * No required sample fraction, defect rate or repair quantity is inferred.
 * This branch is initial visual/manual-UT inspection only, not acceptance. */
export const ROAD_CROSSING_SLEEVES_INSPECTION_MODES_R1 = Object.freeze({
  visual: "Отдельный визуальный контроль по подтверждённой программе",
  visualUt: "Отдельные визуальный и ручной ультразвуковой контроль по подтверждённой программе",
  otherParty: "Контроль другой стороны без отдельных ресурсов исполнителя",
  other: "Другие методы контроля: отдельная программа ресурсов",
});
export const ROAD_CROSSING_SLEEVES_INSPECTION_COUPLANT_COST_BASIS_R1 = "Только новый заказ контактной среды с учтёнными процессными потерями и резервом; без контроля, персонала, оборудования, энергии, доставки и повторной оплаты тех же материалов";
const inspectionId = (suffix: string) => `rcs_inspection_${suffix}`;
const siteJointsPositive: AutomaticInclusionCondition = { kind: "greater_than", parameterId: "rcs_crossing_length_m",
  valueParameterId: "rcs_planned_physical_section_length_m" };
const inspectionVisual: AutomaticInclusionCondition = { kind: "and", operands: [siteJointsPositive,
  { kind: "or", operands: [ROAD_CROSSING_SLEEVES_INSPECTION_MODES_R1.visual, ROAD_CROSSING_SLEEVES_INSPECTION_MODES_R1.visualUt]
    .map(value => ({ kind: "equals", parameterId: inspectionId("mode"), value })) }] };
const inspectionUtProgram: AutomaticInclusionCondition = { kind: "and", operands: [siteJointsPositive,
  { kind: "equals", parameterId: inspectionId("mode"), value: ROAD_CROSSING_SLEEVES_INSPECTION_MODES_R1.visualUt }] };
const inspectedUtJointCount = `ceil((${quantities.site_joint_count})*${inspectionId("ut_joint_fraction")})`;
const inspectionUt: AutomaticInclusionCondition = { kind: "and", operands: [inspectionUtProgram,
  { kind: "formula_greater_than", expression: inspectedUtJointCount, unitId: "piece", value: 0 }] };
const inspectionFacts = ["rcs_crossing_length_m", "rcs_planned_physical_section_length_m", "rcs_casing_outside_diameter_mm", "rcs_casing_inside_diameter_mm",
  "rcs_joint_wps_reference", "rcs_joint_welding_process", inspectionId("mode"), inspectionId("program_reference")];
const inspectionWorks = [
  { key: "visual", title: "Визуальный контроль монтажных стыков", count: quantities.site_joint_count, inclusion: inspectionVisual },
  { key: "ut", title: "Ручной ультразвуковой контроль выбранных монтажных стыков", count: inspectedUtJointCount, inclusion: inspectionUt },
];
export const ROAD_CROSSING_SLEEVES_INSPECTION_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: inspectionId("mode"), title: "Фактическая программа и граница оплаты контроля монтажных стыков", valueType: "enum", unitId: null,
    kind: "conditional", values: Object.values(ROAD_CROSSING_SLEEVES_INSPECTION_MODES_R1), requiredWhen: siteJointsPositive },
  { id: inspectionId("program_reference"), title: "Применимая программа первоначального контроля: метод, объём, выбранные стыки, доступ, критерии и исполнитель; ремонт и повторный контроль отдельно",
    valueType: "text", unitId: null, kind: "conditional", requiredWhen: siteJointsPositive },
  { id: inspectionId("ut_joint_fraction"), title: "Подтверждённая доля монтажных стыков для первоначального ручного УЗК от 0 до 1 по программе; количество целых стыков рассчитывается",
    valueType: "decimal", unitId: "ratio", min: 0, max: 1, kind: "conditional", requiredWhen: inspectionUtProgram },
  { id: inspectionId("couplant_cost_basis"), title: "Отдельная граница стоимости контактной среды первоначального УЗК", valueType: "enum", unitId: null,
    values: [ROAD_CROSSING_SLEEVES_INSPECTION_COUPLANT_COST_BASIS_R1], kind: "conditional", requiredWhen: inspectionUt },
  ...inspectionWorks.flatMap(work => {
    const text = (suffix: string, title: string): AutomaticParameterSpec => ({ id: inspectionId(`${work.key}_${suffix}`), title: `${work.title}: ${title}`,
      valueType: "text", unitId: null, kind: "conditional", requiredWhen: work.inclusion });
    const rate = (owner: "crew" | "equipment"): AutomaticParameterSpec => ({ id: inspectionId(`${work.key}_${owner}_h_per_joint`),
      title: `${work.title}: ${owner === "crew" ? "суммарные человеко-часы всех исполнителей" : "часы выбранного комплекта техники"} на первоначально проверяемый целый стык`,
      valueType: "decimal", unitId: `${owner === "crew" ? "man" : "machine"}_hour_per_piece`, min: 0, kind: "conditional", requiredWhen: work.inclusion });
    const basis = (owner: "crew" | "equipment"): AutomaticParameterSpec => ({ id: inspectionId(`${work.key}_${owner}_cost_basis`),
      title: `${work.title}: отдельная граница ${owner === "crew" ? "труда" : "оборудования"}`, valueType: "enum", unitId: null,
      kind: "conditional", values: [ROAD_CROSSING_SLEEVES_CIVIL_EXECUTION_COST_BASES_R1[owner]], requiredWhen: work.inclusion });
    return [text("method_reference", "подтверждённая применимость процедуры к материалу, толщине стенки, геометрии, поверхности, доступу и квалификации; без сварки, подготовки поверхности, ремонта и покрытия"),
      text("crew_designation", "фактические исполнители, включая операторов"), rate("crew"), basis("crew"),
      text("equipment_designation", "фактическое совместимое оборудование с энергией, без персонала и расходников"), rate("equipment"), basis("equipment")];
  }),
  ...(["product_designation", "product_reference", "gross_kg_per_joint", "compatible_stock_kg", "retained_reserve_kg", "supplier_pack_net_kg"] as const).map(suffix => {
    const titles = { product_designation: "Выбранная совместимая контактная среда ручного УЗК", product_reference: "Фактическая совместимость и полный расход контактной среды по выбранной процедуре; не включена в другую расценку",
      gross_kg_per_joint: "Полный расход контактной среды на первоначально проверяемый стык, включая все потери", compatible_stock_kg: "Пригодное совместимое наличие контактной среды",
      retained_reserve_kg: "Сохраняемый резерв контактной среды", supplier_pack_net_kg: "Фактическая масса контактной среды без тары в поставочной упаковке" };
    const isText = suffix === "product_designation" || suffix === "product_reference";
    return { id: inspectionId(`couplant_${suffix}`), title: titles[suffix], valueType: isText ? "text" : "decimal", unitId: isText ? null : suffix === "gross_kg_per_joint" ? "kg_per_piece" : "kg",
      ...(isText ? {} : { min: suffix === "supplier_pack_net_kg" ? 0.000_001 : 0 }), kind: "conditional", requiredWhen: inspectionUt } as AutomaticParameterSpec;
  }),
]);
export const ROAD_CROSSING_SLEEVES_INSPECTION_ROWS_R1: readonly AutomaticRowSpec[] = Object.freeze([
  { rowId: "rcs:inspection:program_joint_count", formulaId: "rcs:inspection:program_joint_count", section: "Контроль монтажных стыков", category: "service",
    title: "Монтажные стыки в подтверждённой программе контроля; не повторная оплата сварки или документа", unitId: "piece", expression: quantities.site_joint_count,
    inclusion: siteJointsPositive, costTreatment: "INFORMATIONAL_SCOPE", inputParameterIds: inspectionFacts },
  { rowId: "rcs:inspection:ut:initial_joint_count", formulaId: "rcs:inspection:ut:initial_joint_count", section: "Первоначальный ручной УЗК", category: "service",
    title: "Количество целых монтажных стыков выбранной первоначальной программы УЗК; не дефекты или ремонт", unitId: "piece", expression: inspectedUtJointCount,
    inclusion: inspectionUtProgram, costTreatment: "INFORMATIONAL_SCOPE", inputParameterIds: inspectionFacts },
  ...inspectionWorks.flatMap(work => (["crew", "equipment"] as const).map((owner): AutomaticRowSpec => ({
    rowId: `rcs:inspection:${work.key}:${owner}_hours`, formulaId: `rcs:inspection:${work.key}:${owner}_hours`, section: work.title,
    category: owner === "crew" ? "labor" : "equipment", title: `${work.title}: ${owner === "crew" ? "труд всех исполнителей" : "комплект техники с энергией"}`,
    unitId: owner === "crew" ? "man_hour" : "machine_hour", expression: `(${work.count})*${inspectionId(`${work.key}_${owner}_h_per_joint`)}`,
    inclusion: work.inclusion, procurement: true, titleParameterIds: [inspectionId(`${work.key}_${owner}_designation`)],
    inputParameterIds: [...inspectionFacts, ...(work.key === "ut" ? [inspectionId("ut_joint_fraction")] : []), inspectionId(`${work.key}_method_reference`),
      inspectionId(`${work.key}_${owner}_cost_basis`)],
  }))),
  ...((): AutomaticRowSpec[] => {
    const consumed = `(${inspectedUtJointCount})*${inspectionId("couplant_gross_kg_per_joint")}`;
    const reserve = inspectionId("couplant_retained_reserve_kg"), stock = inspectionId("couplant_compatible_stock_kg"), pack = inspectionId("couplant_supplier_pack_net_kg");
    const need = `max(0,(${consumed})+${reserve}-${stock})`, packs = `ceil((${need})/${pack})`, ordered = `(${packs})*${pack}`;
    const remaining = `${stock}+(${ordered})-(${consumed})`;
    const facts = [...inspectionFacts, inspectionId("ut_method_reference"), inspectionId("ut_joint_fraction"), inspectionId("couplant_product_designation"), inspectionId("couplant_product_reference")];
    const rows: readonly (readonly [string, string, string])[] = [
      ["consumed_kg", "Расход контактной среды на первоначальный УЗК, со всеми потерями", consumed],
      ["new_need_kg", "Дополнительная потребность контактной среды с резервом после пригодного наличия", need],
      ["supplier_pack_count", "Число новых упаковок контактной среды; не рейсы или труд", packs],
      ["ordered_kg", "Новый заказ совместимой контактной среды первоначального УЗК", ordered],
      ["remaining_kg", "Остаток контактной среды после первоначального УЗК, включая резерв", remaining],
      ["free_kg_beyond_reserve", "Свободная контактная среда сверх сохраняемого резерва", `(${remaining})-${reserve}`],
    ];
    return rows.map(([key, title, expression]): AutomaticRowSpec => ({ rowId: `rcs:inspection:couplant:${key}`, formulaId: `rcs:inspection:couplant:${key}`,
      section: "Контактная среда первоначального ручного УЗК", category: "material", title, expression, unitId: key === "supplier_pack_count" ? "package" : "kg",
      inclusion: inspectionUt, costTreatment: key === "ordered_kg" ? "OWN_COST" : "INFORMATIONAL_SCOPE", procurement: key === "ordered_kg",
      inputParameterIds: [...facts, ...(key === "ordered_kg" ? [inspectionId("couplant_cost_basis")] : [])],
      ...(key === "ordered_kg" ? { titleParameterIds: [inspectionId("couplant_product_designation")] } : {}) }));
  })(),
]);

/** Freight is derived from the selected material order, not installation or
 * supplier multiples. Existing stock has a separate actual off-site allocation.
 * Every lane is a dedicated documented load: consolidated loads require a
 * separate manifest, not two charges for the same vehicle trip. */
export const ROAD_CROSSING_SLEEVES_FREIGHT_MODES_R1 = Object.freeze({
  separate: "Отдельные подтверждённые рейсы только этого груза",
  otherParty: "Доставку обеспечивает другая сторона без отдельной оплаты исполнителем",
});
export const ROAD_CROSSING_SLEEVES_FREIGHT_COST_BASIS_R1 = "Один полный отдельный рейс этого груза: транспорт, водитель, энергия, погрузка, выгрузка и возврат; без материала, монтажа, других грузов и повторной оплаты тех же ресурсов";
const filterRentalForMobilization = ROAD_CROSSING_SLEEVES_WATER_TREATMENT_ROWS_R1.find(row => row.rowId === "rcs:water-treatment:rental_set_hours");
if (!filterRentalForMobilization?.inclusion) throw new Error("RCS_COMPLETE_FILTER_RENTAL_SCOPE_MISSING");
const equipmentMobilization = buildRoadCrossingSleevesEquipmentMobilizationR1([
  ROAD_CROSSING_SLEEVES_REACTION_CARGO_R1,
  ...ROAD_CROSSING_SLEEVES_SHORING_CARGOS_R1,
  { key: "water_pump_kits", title: "Полные гидравлические насосные комплекты с силовыми блоками и всем составом", quantityExpression: waterControlSets,
    selected: waterControlSelected, designationId: waterControlId("kit_designation"),
    facts: [...waterControlFacts, waterControlId("kit_product_reference"), ...waterControlKitMembers.map(member => waterControlId(`kit_${member.key}`))] },
  { key: "water_filter_kit", title: "Один полный общий пассивный фильтровальный комплект со всем предусмотренным составом", quantityExpression: "1",
    selected: filterRentalForMobilization.inclusion, designationId: waterTreatmentId("kit_designation"),
    facts: (filterRentalForMobilization.inputParameterIds ?? []).filter(parameter => parameter !== waterControlId("calendar_hours")) },
], ROAD_CROSSING_SLEEVES_FREIGHT_COST_BASIS_R1);
export const ROAD_CROSSING_SLEEVES_EQUIPMENT_MOBILIZATION_PARAMETERS_R1 = equipmentMobilization.parameters;
export const ROAD_CROSSING_SLEEVES_EQUIPMENT_MOBILIZATION_ROWS_R1 = equipmentMobilization.rows;
const shoringConsumables = buildRoadCrossingSleevesShoringConsumablesR1([...ROAD_CROSSING_SLEEVES_SHORING_CARGOS_R1.map(cargo => {
  const key = cargo.key.slice("shoring_".length, -"_kits".length);
  return { key, title: cargo.title, selected: cargo.selected, facts: cargo.facts, kitCountId: shoringId(key, "complete_kit_count"),
    cyclesId: shoringId(key, "placement_cycle_count"), calendarId: shoringId(key, "calendar_hours") };
}), { key: "reaction", title: "Полный переносной реакционный упор: материалы всей программы", selected: ROAD_CROSSING_SLEEVES_REACTION_CARGO_R1.selected,
  facts: ROAD_CROSSING_SLEEVES_REACTION_CARGO_R1.facts, kitCountId: "1", cyclesId: "1", calendarId: reactionId("calendar_hours") }]);
export const ROAD_CROSSING_SLEEVES_SHORING_CONSUMABLE_PARAMETERS_R1 = shoringConsumables.parameters;
export const ROAD_CROSSING_SLEEVES_SHORING_CONSUMABLE_ROWS_R1 = shoringConsumables.rows;
const serviceWaste = buildRoadCrossingSleevesServiceWasteR1([...ROAD_CROSSING_SLEEVES_SHORING_CARGOS_R1.map(cargo => ({
  key: cargo.key.slice("shoring_".length, -"_kits".length), title: cargo.title, selected: cargo.selected, facts: cargo.facts,
})), { key: "reaction", title: ROAD_CROSSING_SLEEVES_REACTION_CARGO_R1.title, selected: ROAD_CROSSING_SLEEVES_REACTION_CARGO_R1.selected,
  facts: ROAD_CROSSING_SLEEVES_REACTION_CARGO_R1.facts }].map(scope => {
  const wipes = shoringConsumables.rows.find(row => row.rowId === `rcs:shoring-material:${scope.key}:wipes:consumed`);
  if (!wipes) throw new Error(`RCS_ACTUAL_SERVICE_WIPES_MISSING:${scope.key}`);
  return { ...scope, wipesExpression: wipes.expression, wipesProductId: `rcs_shoring_material_${scope.key}_wipes_product_designation` };
}));
export const ROAD_CROSSING_SLEEVES_SERVICE_WASTE_PARAMETERS_R1 = serviceWaste.parameters;
export const ROAD_CROSSING_SLEEVES_SERVICE_WASTE_ROWS_R1 = serviceWaste.rows;
type FreightCargo = Readonly<{ key: string; title: string; purchase: AutomaticRowSpec; stockId: string;
  unit: "piece" | "m" | "m3" | "kg" | "l"; sectionLengthId?: string; quantum?: string }>;
function freightCargo(key: string, title: string, rows: readonly AutomaticRowSpec[], rowId: string,
  stockId: string, unit: FreightCargo["unit"], sectionLengthId?: string, quantum?: string): FreightCargo {
  const purchase = rows.find(row => row.rowId === rowId);
  if (!purchase || purchase.costTreatment !== "OWN_COST") throw new Error(`RCS_FREIGHT_PURCHASE_OWNER_MISSING:${rowId}`);
  return { key, title, purchase, stockId, unit, sectionLengthId, quantum };
}
const freightCargoGroups: readonly FreightCargo[] = [
  freightCargo("electrodes", "Совместимые электроды выбранной WPS", ROAD_CROSSING_SLEEVES_JOINT_RESOURCE_ROWS_R1,
    "rcs:joint:electrode_ordered", "rcs_joint_electrode_compatible_stock_kg", "kg", undefined, "rcs_joint_electrode_supplier_pack_kg"),
  ...ROAD_CROSSING_SLEEVES_SHORING_GAP_CARGOS_R1.map(cargo => freightCargo(cargo.key, cargo.title, ROAD_CROSSING_SLEEVES_SHORING_GAP_ROWS_R1, cargo.rowId, cargo.stockId, cargo.unit)),
  ...shoringConsumables.cargos.map(cargo => freightCargo(cargo.key, cargo.title, shoringConsumables.rows, cargo.rowId, cargo.stockId, cargo.unit, undefined, cargo.quantum)),
  freightCargo("casing", "Секции стального футляра", ROAD_CROSSING_SLEEVES_CASING_MATERIAL_ROWS_R1,
    "rcs:casing:ordered_casing_length_m", "rcs_compatible_stock_section_count", "piece", "rcs_planned_physical_section_length_m"),
  freightCargo("carrier", "Секции рабочей трубы", ROAD_CROSSING_SLEEVES_CARRIER_ROWS_R1,
    "rcs:carrier:ordered_length_m", "rcs_carrier_compatible_whole_section_stock_count", "piece", "rcs_carrier_physical_supply_section_length_m"),
  freightCargo("raci_elements", "Совместимые опорные элементы", ROAD_CROSSING_SLEEVES_PROCUREMENT_ROWS_R1,
    "rcs:raci-elements:ordered", "rcs_element_compatible_stock_count", "piece", undefined, "rcs_element_supplier_pack_count"),
  freightCargo("end_seal_kits", "Полные комплекты торцевого уплотнения", ROAD_CROSSING_SLEEVES_PROCUREMENT_ROWS_R1,
    "rcs:end-seal-kits:ordered", "rcs_end_seal_compatible_stock_count", "piece", undefined, "rcs_end_seal_supplier_pack_count"),
  freightCargo("contact_tape", "Совместимая контактная лента", ROAD_CROSSING_SLEEVES_PROCUREMENT_ROWS_R1,
    "rcs:contact-tape:ordered", "rcs_tape_compatible_stock_m", "m", undefined, "rcs_tape_supplier_roll_length_m"),
  freightCargo("bedding", "Материал основания в рыхлом состоянии", ROAD_CROSSING_SLEEVES_BEDDING_ROWS_R1,
    "rcs:bedding:ordered_loose_m3", "rcs_bedding_compatible_loose_stock_m3", "m3"),
  freightCargo("pits", "Материал засыпки котлованов в рыхлом состоянии", ROAD_CROSSING_SLEEVES_PIT_FILL_ROWS_R1,
    "rcs:pit-fill:ordered_loose_m3", "rcs_pit_fill_compatible_loose_stock_m3", "m3"),
  freightCargo("trench", "Материал засыпки траншеи в рыхлом состоянии", ROAD_CROSSING_SLEEVES_TRENCH_FILL_ROWS_R1,
    "rcs:trench-fill:ordered_loose_m3", "rcs_trench_fill_compatible_loose_stock_m3", "m3"),
  freightCargo("internal_dry", "Сухая смесь внутреннего заполнения", ROAD_CROSSING_SLEEVES_INTERNAL_FILL_ROWS_R1,
    "rcs:internal-fill:ordered_dry_kg", "rcs_internal_fill_compatible_dry_stock_kg", "kg", undefined, "rcs_internal_fill_supplier_bag_net_kg"),
  freightCargo("internal_water", "Вода для затворения внутреннего заполнения", ROAD_CROSSING_SLEEVES_INTERNAL_WATER_ROWS_R1,
    "rcs:internal-water:ordered_m3", "rcs_internal_fill_water_compatible_stock_m3", "m3"),
  freightCargo("inspection_couplant", "Контактная среда первоначального ручного УЗК", ROAD_CROSSING_SLEEVES_INSPECTION_ROWS_R1,
    "rcs:inspection:couplant:ordered_kg", "rcs_inspection_couplant_compatible_stock_kg", "kg", undefined, "rcs_inspection_couplant_supplier_pack_net_kg"),
  freightCargo("preparation_stakes", "Колья выбранной разбивки", ROAD_CROSSING_SLEEVES_PREPARATION_ROWS_R1,
    "rcs:preparation:stakes:ordered", "rcs_preparation_stakes_compatible_stock", "piece"),
  freightCargo("preparation_paint", "Краска выбранной разбивки", ROAD_CROSSING_SLEEVES_PREPARATION_ROWS_R1,
    "rcs:preparation:paint:ordered", "rcs_preparation_paint_compatible_stock", "kg", undefined, "rcs_preparation_paint_supplier_pack_net"),
  ...compactionWaterWorks.map(work => freightCargo(`compaction_water_${work.key}`, `Вода: ${work.title}`, ROAD_CROSSING_SLEEVES_COMPACTION_WATER_ROWS_R1,
    `rcs:compaction-water:${work.key}:ordered_m3`, work.id("compatible_stock_m3"), "m3")),
  ...casingPrepMaterialBranches.map(material => freightCargo(`casing_prep_${material.key}`, material.title, ROAD_CROSSING_SLEEVES_CASING_PREP_MATERIAL_ROWS_R1,
    `rcs:casing-prep-material:${material.key}:ordered`, material.id("compatible_stock"), material.unit, undefined, material.unit === "l" ? material.id("supplier_pack_net") : undefined)),
  ...coatingZones.map(zone => freightCargo(`coating_${zone.key}_kits`, `${zone.title}: полные несмешанные комплекты покрытия`, ROAD_CROSSING_SLEEVES_COATING_ROWS_R1,
    `rcs:coating:${zone.key}:ordered_kit_count`, zone.id("compatible_unmixed_kit_stock"), "piece")),
  ...coatingConsumableBranches.map(material => freightCargo(`coating_${material.zone.key}_${material.key}`, `${material.zone.title}: ${material.title}`, ROAD_CROSSING_SLEEVES_COATING_CONSUMABLE_ROWS_R1,
    `rcs:coating-consumable:${material.zone.key}:${material.key}:ordered`, material.id("compatible_stock"), material.unit, undefined, material.unit === "piece" ? undefined : material.id("supplier_pack_net"))),
  ...carrierConnectionMaterialBranches.map(material => freightCargo(`carrier_connection_${material.group.key}_${material.key}`, `${material.group.title}: ${material.title}`, ROAD_CROSSING_SLEEVES_CARRIER_CONNECTION_ROWS_R1,
    `rcs:carrier-connection-material:${material.group.key}:${material.key}:ordered`, material.id("compatible_stock"), material.unit, undefined, material.unit === "piece" ? undefined : material.id("supplier_pack_net"))),
  freightCargo("water_control_fuel", "Совместимое топливо насосной группы", ROAD_CROSSING_SLEEVES_WATER_CONTROL_ROWS_R1,
    "rcs:water-control:fuel:ordered_l", waterControlId("fuel_compatible_stock_l"), "l", undefined, waterControlId("fuel_supplier_pack_net_l")),
  freightCargo("water_treatment_bags", "Совместимые целые сменные фильтровальные мешки", ROAD_CROSSING_SLEEVES_WATER_TREATMENT_ROWS_R1,
    "rcs:water-treatment:bags:ordered_count", waterTreatmentId("bag_compatible_stock_count"), "piece", undefined, waterTreatmentId("bag_supplier_pack_count")),
];
const freightId = (key: string, suffix: string) => `rcs_freight_${key}_${suffix}`;
const freightLanes = freightCargoGroups.flatMap(cargo => (["new", "stock"] as const).map(lane => {
  const key = `${cargo.key}_${lane}`;
  const offsite = freightId(cargo.key, "offsite_stock_units");
  const quantity = lane === "stock" ? offsite : cargo.sectionLengthId
    ? `${effectiveResourceQuantityParameterId(cargo.purchase.rowId)}/${cargo.sectionLengthId}` : effectiveResourceQuantityParameterId(cargo.purchase.rowId);
  const applicability = cargo.purchase.inclusion ?? { kind: "greater_than" as const, parameterId: "rcs_crossing_length_m", value: 0 };
  const stockPositive: AutomaticInclusionCondition = { kind: "and", operands: [applicability,
    { kind: "greater_than", parameterId: cargo.stockId, value: 0 }] };
  const positive: AutomaticInclusionCondition = { kind: "and", operands: [lane === "stock" ? stockPositive : applicability,
    { kind: "formula_greater_than", expression: quantity, unitId: cargo.unit, value: 0 }] };
  const separate: AutomaticInclusionCondition = { kind: "and", operands: [positive,
    { kind: "equals", parameterId: freightId(key, "mode"), value: ROAD_CROSSING_SLEEVES_FREIGHT_MODES_R1.separate }] };
  // New supplier packs are indivisible. Already allocated usable stock may
  // be in opened containers with its OWN certified shipping-mass/load plan.
  // Whole physical pipe sections remain indivisible in either lane.
  const quantum = lane === "new" && cargo.quantum ? cargo.quantum : cargo.unit === "piece" ? "1" : undefined;
  const rawCapacity = `min(${freightId(key, "max_units_per_trip")},${freightId(key, "payload_kg")}/${freightId(key, "shipping_kg_per_unit")})`;
  const capacity = quantum ? `floor((${rawCapacity})/(${quantum}))*(${quantum})` : rawCapacity;
  return { cargo, key, lane, offsite, quantity, stockPositive, positive, separate, capacity };
}));
export const ROAD_CROSSING_SLEEVES_FREIGHT_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze([
  ...freightLanes.filter(lane => lane.lane === "stock").map(({ cargo, offsite, stockPositive }): AutomaticParameterSpec => ({
    id: offsite, title: `${cargo.title}: фактическая часть совместимого наличия вне объекта, выделенная к перевозке; на объекте — 0`,
    valueType: cargo.unit === "piece" ? "integer" : "decimal", unitId: cargo.unit, min: 0, kind: "conditional", requiredWhen: stockPositive,
    numericPeerConstraints: { lessThanOrEqualParameter: cargo.stockId },
  })),
  ...freightLanes.flatMap(({ cargo, key, lane, positive, separate }) => {
    const title = `${cargo.title}, ${lane === "new" ? "новый заказ" : "выделенное наличие вне объекта"}`;
    const numeric = (suffix: string, caption: string, unitId: string, min: number): AutomaticParameterSpec => ({
      id: freightId(key, suffix), title: `${title}: ${caption}`, valueType: cargo.unit === "piece" && suffix === "max_units_per_trip" ? "integer" : "decimal",
      unitId, min, kind: "conditional", requiredWhen: separate,
    });
    return [
      { id: freightId(key, "mode"), title: `${title}: фактическая граница доставки`, valueType: "enum", unitId: null, kind: "conditional",
        values: Object.values(ROAD_CROSSING_SLEEVES_FREIGHT_MODES_R1), requiredWhen: positive } as AutomaticParameterSpec,
      { id: freightId(key, "allocation_reference"), title: `${title}: документ фактической доставки, маршрута и отдельного груза; без пересечений с другими рейсами`,
        valueType: "text", unitId: null, kind: "conditional", requiredWhen: positive } as AutomaticParameterSpec,
      { id: freightId(key, "vehicle_designation"), title: `${title}: выбранный совместимый транспорт`, valueType: "text", unitId: null,
        kind: "conditional", requiredWhen: separate } as AutomaticParameterSpec,
      numeric("shipping_kg_per_unit", "подтверждённая перевозочная масса с тарой на единицу груза, не геометрическая масса", `kg_per_${cargo.unit}`, cargo.unit === "kg" ? 1 : 0.000_001),
      numeric("payload_kg", "фактическая допустимая полезная масса транспорта для выбранного маршрута", "kg", 0.000_001),
      numeric("max_units_per_trip", "допустимое количество в одном рейсе по подтверждённой схеме размещения", cargo.unit, cargo.unit === "piece" ? 1 : 0.000_001),
      { id: freightId(key, "cost_basis"), title: `${title}: граница одной транспортной расценки`, valueType: "enum", unitId: null,
        kind: "conditional", values: [ROAD_CROSSING_SLEEVES_FREIGHT_COST_BASIS_R1], requiredWhen: separate } as AutomaticParameterSpec,
      ...(cargo.sectionLengthId ? [{ ...numeric("max_section_length_m", "допустимая длина целой секции по схеме перевозки и маршруту", "m", 0.000_001),
        numericPeerConstraints: { greaterThanOrEqualParameter: cargo.sectionLengthId } }] : []),
    ];
  }),
]);
export const ROAD_CROSSING_SLEEVES_FREIGHT_ROWS_R1: readonly AutomaticRowSpec[] = Object.freeze(
  freightLanes.flatMap(({ cargo, key, lane, offsite, quantity, positive, separate, capacity }): AutomaticRowSpec[] => {
    const prefix = `rcs:freight:${key}`;
    const originalFacts = [...new Set([...compileFormulaGraph(cargo.purchase.expression).inputParameterIds,
      ...(cargo.purchase.inputParameterIds ?? []), ...(lane === "stock" ? [offsite, cargo.stockId] : []),
      freightId(key, "mode"), freightId(key, "allocation_reference")])];
    const transportFacts = [...originalFacts, freightId(key, "vehicle_designation"), freightId(key, "cost_basis"),
      freightId(key, "shipping_kg_per_unit"), freightId(key, "payload_kg"), freightId(key, "max_units_per_trip"),
      ...(cargo.sectionLengthId ? [cargo.sectionLengthId, freightId(key, "max_section_length_m")] : [])];
    const row = (suffix: string, title: string, expression: string, unitId: string, inclusion: AutomaticInclusionCondition,
      inputParameterIds: readonly string[] = transportFacts): AutomaticRowSpec => ({ rowId: `${prefix}:${suffix}`, formulaId: `${prefix}:${suffix}`,
      section: `Доставка: ${cargo.title} (${lane === "new" ? "новый заказ" : "наличие"})`, category: "transport", title,
      unitId, expression, inclusion, costTreatment: "INFORMATIONAL_SCOPE", inputParameterIds });
    return [
      row("cargo_units", `${cargo.title}: фактический груз к доставке, без повторной закупки`, quantity, cargo.unit, positive, originalFacts),
      row("shipping_mass_kg", `${cargo.title}: подтверждённая перевозочная масса с тарой`, `(${quantity})*${freightId(key, "shipping_kg_per_unit")}`, "kg", separate),
      { ...row("effective_units_per_trip", `${cargo.title}: вместимость рейса с учётом массы и размещения`, capacity, cargo.unit, separate),
        formulaOutputBounds: { schemaVersion: "canonical_formula_output_bounds_v1", unitId: cargo.unit, minimum: cargo.unit === "piece" ? 1 : 0.000_001,
          reasonRu: "Выбранный транспорт должен вмещать хотя бы одну допустимую единицу груза с тарой. Неподходящий транспорт не заменяется фиктивной вместимостью." } },
      { ...row("trip_count", `${cargo.title}: отдельные полные рейсы выбранного груза`, `ceil((${quantity})/(${capacity}))`, "trip", separate),
        costTreatment: "OWN_COST", procurement: true, titleParameterIds: [freightId(key, "vehicle_designation")],
        manualTransportQuantityPolicy: { unitId: "trip", minimum: "calculated_quantity", integer: true } },
    ];
  }),
);

/** FHWA distinguishes in-situ, loose and finished earthwork states:
 * https://highways.dot.gov/federal-lands/pddm/dpg/earthwork-design . Its example
 * factors are not installed here. One documented homogeneous batch only;
 * pit/drive mixtures and slurry need separate material-state allocations.
 * Approved finished reuse is the EXISTING fill fact, not another soil demand.
 * Purchase stock/reserve/surplus never becomes excavated soil a second time. */
export const ROAD_CROSSING_SLEEVES_SOIL_MODES_R1 = Object.freeze({
  uniform: "Одна подтверждённая однородная партия разработанного грунта",
  other: "Разные партии, пульпа или другое состояние: отдельное распределение",
});
export const ROAD_CROSSING_SLEEVES_SOIL_REUSE_ORIGINS_R1 = Object.freeze({
  current: "Весь уже выделенный материал засыпки взят из этой разработки",
  external: "Весь уже выделенный материал засыпки поступает из другого источника",
  partial: "Подтверждённая часть уже выделенного материала засыпки взята из этой разработки",
});
export const ROAD_CROSSING_SLEEVES_SOIL_DESTINATIONS_R1 = Object.freeze({
  reuse: "Подтверждённое использование на другом объекте",
  disposal: "Подтверждённый приём для размещения или утилизации",
});
export const ROAD_CROSSING_SLEEVES_SOIL_RECEIVING_MODES_R1 = Object.freeze({
  otherParty: "Приём обеспечивает другая сторона без отдельной оплаты исполнителем",
  looseVolume: "Отдельная оплата приёма по фактическим рыхлым м³",
  mass: "Отдельная оплата приёма по фактическим тоннам",
});
export const ROAD_CROSSING_SLEEVES_SOIL_RECEIVING_COST_BASIS_R1 = "Только приём выбранной партии в подтверждённом месте; без разработки, сортировки, перевозки, погрузки, выгрузки, укладки и повторной оплаты тех же ресурсов";
const soilId = (key: string, suffix: string) => `rcs_soil_${key}_${suffix}`;
const soilWorks = [
  { key: "trench", title: "Грунт открытой траншеи", method: methods.openCut, bank: civil.open_cut_excavation_m3,
    fill: ROAD_CROSSING_SLEEVES_TRENCH_FILL_APPLICABILITY_R1, fillRows: ROAD_CROSSING_SLEEVES_TRENCH_FILL_ROWS_R1,
    reuse: "rcs_trench_fill_approved_reused_finished_m3" },
  { key: "jacking", title: "Грунт котлованов и проходки", method: methods.pipeJacking, bank: civil.jacking_total_geometric_excavation_m3,
    fill: ROAD_CROSSING_SLEEVES_PIT_FILL_APPLICABILITY_R1, fillRows: ROAD_CROSSING_SLEEVES_PIT_FILL_ROWS_R1,
    reuse: "rcs_pit_fill_approved_reused_finished_m3" },
] as const;
const soilBatches = soilWorks.map(work => {
  const method: AutomaticInclusionCondition = { kind: "equals", parameterId: METHOD_ID, value: work.method };
  const base: AutomaticInclusionCondition = { kind: "and", operands: [method,
    { kind: "equals", parameterId: soilId(work.key, "scope"), value: ROAD_CROSSING_SLEEVES_SOIL_MODES_R1.uniform }] };
  const balance: AutomaticInclusionCondition = { kind: "and", operands: [base, work.fill] };
  const reusePositive: AutomaticInclusionCondition = { kind: "and", operands: [balance,
    { kind: "greater_than", parameterId: work.reuse, value: 0 }] };
  const partial: AutomaticInclusionCondition = { kind: "and", operands: [reusePositive,
    { kind: "equals", parameterId: soilId(work.key, "reuse_origin"), value: ROAD_CROSSING_SLEEVES_SOIL_REUSE_ORIGINS_R1.partial }] };
  const conversion: AutomaticInclusionCondition = { kind: "and", operands: [reusePositive, { kind: "or", operands: [
    { kind: "equals", parameterId: soilId(work.key, "reuse_origin"), value: ROAD_CROSSING_SLEEVES_SOIL_REUSE_ORIGINS_R1.current },
    { kind: "equals", parameterId: soilId(work.key, "reuse_origin"), value: ROAD_CROSSING_SLEEVES_SOIL_REUSE_ORIGINS_R1.partial },
  ] }] };
  const loose = `(${work.bank})*${soilId(work.key, "loose_per_bank_m3")}`;
  const fillGeometry = work.fillRows.find(row => row.rowId.endsWith(":additional_finished_fill_m3"));
  if (!fillGeometry) throw new Error(`RCS_SOIL_FILL_GEOMETRY_MISSING:${work.key}`);
  // Original geometry gates survive manual paid-quantity exceptions. Supply
  // product/ratio/stock are independent and not copied into soil allocation.
  const geometryFacts = [...new Set([METHOD_ID, ...compileFormulaGraph(work.bank).inputParameterIds,
    ...(fillGeometry.inputParameterIds ?? [])])];
  const variants = [
    { key: "zero_reuse", finished: "0", reuseLoose: "0", condition: { kind: "and", operands: [balance,
      { kind: "less_than_or_equal", parameterId: work.reuse, value: 0 }] } as AutomaticInclusionCondition },
    ...(["current", "external", "partial"] as const).map(origin => {
      const finished = origin === "external" ? "0" : origin === "partial" ? soilId(work.key, "reuse_current_finished_m3") : work.reuse;
      return { key: origin, finished, reuseLoose: origin === "external" ? "0" : `(${finished})*${soilId(work.key, "reuse_loose_per_finished_m3")}`,
        condition: { kind: "and", operands: [reusePositive,
          { kind: "equals", parameterId: soilId(work.key, "reuse_origin"), value: ROAD_CROSSING_SLEEVES_SOIL_REUSE_ORIGINS_R1[origin] }] } as AutomaticInclusionCondition };
    }),
  ].map(variant => {
    const excess = `(${loose})-(${variant.reuseLoose})-${soilId(work.key, "retained_loose_m3")}`;
    const positive: AutomaticInclusionCondition = { kind: "and", operands: [variant.condition,
      { kind: "formula_greater_than", expression: excess, unitId: "m3", value: 0 }] };
    return { ...variant, excess, positive };
  });
  const positive: AutomaticInclusionCondition = { kind: "or", operands: variants.map(variant => variant.positive) };
  const separate: AutomaticInclusionCondition = { kind: "and", operands: [positive,
    { kind: "equals", parameterId: soilId(work.key, "haul_mode"), value: ROAD_CROSSING_SLEEVES_FREIGHT_MODES_R1.separate }] };
  const volumeFee: AutomaticInclusionCondition = { kind: "and", operands: [positive,
    { kind: "equals", parameterId: soilId(work.key, "receiving_mode"), value: ROAD_CROSSING_SLEEVES_SOIL_RECEIVING_MODES_R1.looseVolume }] };
  const massFee: AutomaticInclusionCondition = { kind: "and", operands: [positive,
    { kind: "equals", parameterId: soilId(work.key, "receiving_mode"), value: ROAD_CROSSING_SLEEVES_SOIL_RECEIVING_MODES_R1.mass }] };
  const massNeeded: AutomaticInclusionCondition = { kind: "or", operands: [separate, massFee] };
  const capacity = `min(${soilId(work.key, "vehicle_loose_capacity_m3")},${soilId(work.key, "vehicle_payload_kg")}/${soilId(work.key, "shipping_density_kg_m3")})`;
  return { work, method, base, balance, reusePositive, partial, conversion, loose, geometryFacts, variants,
    positive, separate, volumeFee, massFee, massNeeded, capacity };
});
export const ROAD_CROSSING_SLEEVES_SOIL_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze(
  soilBatches.flatMap(({ work, method, base, balance, reusePositive, partial, conversion, positive, separate, volumeFee, massFee, massNeeded }) => {
    const text = (suffix: string, title: string, condition: AutomaticInclusionCondition): AutomaticParameterSpec => ({
      id: soilId(work.key, suffix), title: `${work.title}: ${title}`, valueType: "text", unitId: null, kind: "conditional", requiredWhen: condition });
    const numeric = (suffix: string, title: string, unitId: string, condition: AutomaticInclusionCondition, min = 0): AutomaticParameterSpec => ({
      id: soilId(work.key, suffix), title: `${work.title}: ${title}`, valueType: "decimal", unitId, min, kind: "conditional", requiredWhen: condition });
    const choice = (suffix: string, title: string, values: readonly string[], condition: AutomaticInclusionCondition): AutomaticParameterSpec => ({
      id: soilId(work.key, suffix), title: `${work.title}: ${title}`, valueType: "enum", unitId: null, values, kind: "conditional", requiredWhen: condition });
    return [
      choice("scope", "подтверждённое состояние и разделение материала", Object.values(ROAD_CROSSING_SLEEVES_SOIL_MODES_R1), method),
      text("batch_reference", "документ одной однородной партии, влажности и перехода из естественного в рыхлое состояние; разные грунты котлованов и проходки не объединять", base),
      numeric("loose_per_bank_m3", "фактические рыхлые м³ на м³ этой разработки в естественном состоянии", "ratio", base, 0.000_001),
      text("allocation_reference", "подтверждённая пригодность, происхождение и непересекающееся распределение этой партии; повторное использование не дублировать в поставочном наличии", balance),
      numeric("retained_loose_m3", "подтверждённый остаток этой партии на площадке для других целей, отдельно от уже выделенной засыпки; подтвердите ноль при отсутствии", "m3", balance),
      choice("reuse_origin", "фактическое происхождение уже выделенного в засыпку материала", Object.values(ROAD_CROSSING_SLEEVES_SOIL_REUSE_ORIGINS_R1), reusePositive),
      { ...numeric("reuse_current_finished_m3", "фактическая часть уже выделенного материала засыпки из этой разработки в готовом уплотнённом эквиваленте", "m3", partial, 0.000_001),
        numericPeerConstraints: { lessThanOrEqualParameter: work.reuse } },
      numeric("reuse_loose_per_finished_m3", "фактические рыхлые м³ этой партии на готовый м³ выделенной засыпки, включая процессные потери; не коэффициент нового поставочного материала", "ratio", conversion, 0.000_001),
      choice("destination", "фактическое назначение вывоза избытка", Object.values(ROAD_CROSSING_SLEEVES_SOIL_DESTINATIONS_R1), positive),
      text("destination_reference", "подтверждённый класс материала, допустимый приём и место назначения; геометрия не подтверждает экологическую пригодность", positive),
      choice("haul_mode", "кто оплачивает вывоз", Object.values(ROAD_CROSSING_SLEEVES_FREIGHT_MODES_R1), positive),
      text("haul_reference", "фактический маршрут и только эта отдельная партия; без повторной оплаты тех же рейсов", positive),
      text("vehicle_designation", "фактический совместимый транспорт по маршруту", separate),
      numeric("shipping_density_kg_m3", "подтверждённая перевозочная масса рыхлого м³ с фактической влажностью", "kg_per_m3", massNeeded, 0.000_001),
      numeric("vehicle_payload_kg", "фактическая допустимая полезная масса транспорта по маршруту", "kg", separate, 0.000_001),
      numeric("vehicle_loose_capacity_m3", "допустимый рыхлый объём в одном рейсе по схеме размещения", "m3", separate, 0.000_001),
      choice("haul_cost_basis", "граница полной отдельной транспортной расценки", [ROAD_CROSSING_SLEEVES_FREIGHT_COST_BASIS_R1], separate),
      choice("receiving_mode", "отдельная оплата приёма партии", Object.values(ROAD_CROSSING_SLEEVES_SOIL_RECEIVING_MODES_R1), positive),
      choice("receiving_cost_basis", "граница отдельной расценки приёма", [ROAD_CROSSING_SLEEVES_SOIL_RECEIVING_COST_BASIS_R1],
        { kind: "or", operands: [volumeFee, massFee] }),
    ];
  }),
);
export const ROAD_CROSSING_SLEEVES_SOIL_ROWS_R1: readonly AutomaticRowSpec[] = Object.freeze(
  soilBatches.flatMap(({ work, base, loose, geometryFacts, variants, capacity }): AutomaticRowSpec[] => {
    const bankFacts = [METHOD_ID, ...compileFormulaGraph(work.bank).inputParameterIds, soilId(work.key, "scope"), soilId(work.key, "batch_reference")];
    const row = (suffix: string, title: string, expression: string, unitId: string, inclusion: AutomaticInclusionCondition,
      facts: readonly string[], minimum = 0): AutomaticRowSpec => ({ rowId: `rcs:soil:${work.key}:${suffix}`, formulaId: `rcs:soil:${work.key}:${suffix}`,
      section: `Разработанный грунт: ${work.title}`, title, category: "service", unitId, expression, inclusion,
      costTreatment: "INFORMATIONAL_SCOPE", inputParameterIds: [...new Set(facts)],
      formulaOutputBounds: { schemaVersion: "canonical_formula_output_bounds_v1", unitId, minimum,
        reasonRu: "Состояния и распределения этой партии должны сохранять неотрицательный баланс. Невозможное распределение не заменяется нулём или ручным количеством." } });
    return [
      row("excavated_bank_m3", "Разработанный грунт в естественном состоянии; не покупка или рыхлый груз", work.bank, "m3", base, bankFacts),
      row("excavated_loose_m3", "Рыхлый объём всей подтверждённой партии после разработки", loose, "m3", base, bankFacts),
      ...variants.flatMap((variant): AutomaticRowSpec[] => {
        const prefix = variant.key;
        const facts = [...bankFacts, ...geometryFacts, work.reuse, soilId(work.key, "loose_per_bank_m3"), soilId(work.key, "allocation_reference"),
          soilId(work.key, "retained_loose_m3"), ...(variant.key === "zero_reuse" ? [] : [soilId(work.key, "reuse_origin")]),
          ...(variant.key === "current" || variant.key === "partial" ? [soilId(work.key, "reuse_loose_per_finished_m3")] : []),
          ...(variant.key === "partial" ? [soilId(work.key, "reuse_current_finished_m3")] : [])];
        const destinationFacts = [...facts, soilId(work.key, "destination"), soilId(work.key, "destination_reference")];
        const haulFacts = [...destinationFacts, soilId(work.key, "haul_mode"), soilId(work.key, "haul_reference"), soilId(work.key, "vehicle_designation"),
          soilId(work.key, "haul_cost_basis"), soilId(work.key, "shipping_density_kg_m3"), soilId(work.key, "vehicle_payload_kg"), soilId(work.key, "vehicle_loose_capacity_m3")];
        const separate: AutomaticInclusionCondition = { kind: "and", operands: [variant.positive,
          { kind: "equals", parameterId: soilId(work.key, "haul_mode"), value: ROAD_CROSSING_SLEEVES_FREIGHT_MODES_R1.separate }] };
        const fee = (mode: string): AutomaticInclusionCondition => ({ kind: "and", operands: [variant.positive,
          { kind: "equals", parameterId: soilId(work.key, "receiving_mode"), value: mode }] });
        const massFee = fee(ROAD_CROSSING_SLEEVES_SOIL_RECEIVING_MODES_R1.mass);
        const feeFacts = [...destinationFacts, soilId(work.key, "receiving_mode"), soilId(work.key, "receiving_cost_basis")];
        const mass = `(${variant.excess})*${soilId(work.key, "shipping_density_kg_m3")}`;
        return [
          row(`${prefix}:current_reused_finished_m3`, "Выделенная из этой разработки часть уже принятой засыпки в готовом эквиваленте", variant.finished, "m3", variant.condition, facts),
          row(`${prefix}:current_reused_loose_m3`, "Рыхлая часть этой партии, уже выделенная в засыпку со всеми процессными потерями", variant.reuseLoose, "m3", variant.condition, facts),
          row(`${prefix}:retained_loose_m3`, "Остаток этой партии на площадке для других целей, без повторения засыпки", soilId(work.key, "retained_loose_m3"), "m3", variant.condition, facts),
          row(`${prefix}:excess_loose_m3`, "Избыток разработанной партии к вывозу после выделенной засыпки и остатка на площадке", variant.excess, "m3", variant.condition, facts),
          row(`${prefix}:shipping_mass_kg`, "Фактическая перевозочная масса только вывозимого избытка", mass, "kg",
            { kind: "or", operands: [separate, massFee] }, [...destinationFacts, soilId(work.key, "shipping_density_kg_m3")]),
          row(`${prefix}:effective_loose_m3_per_trip`, "Вместимость отдельного рейса грунта по массе и размещению", capacity, "m3", separate, haulFacts, 0.000_001),
          { ...row(`${prefix}:trip_count`, "Полные отдельные рейсы вывоза избытка этой партии", `ceil((${variant.excess})/(${capacity}))`, "trip", separate, haulFacts),
            category: "transport", costTreatment: "OWN_COST", procurement: true, titleParameterIds: [soilId(work.key, "vehicle_designation")] },
          { ...row(`${prefix}:receiving_loose_m3`, "Отдельный приём вывозимого избытка в подтверждённом месте по рыхлому объёму", variant.excess, "m3",
            fee(ROAD_CROSSING_SLEEVES_SOIL_RECEIVING_MODES_R1.looseVolume), feeFacts), costTreatment: "OWN_COST", procurement: true,
            titleParameterIds: [soilId(work.key, "destination")] },
          { ...row(`${prefix}:receiving_tonnes`, "Отдельный приём вывозимого избытка в подтверждённом месте по фактической массе", `(${mass})/1000`, "tonne", massFee,
            [...feeFacts, soilId(work.key, "shipping_density_kg_m3")]), costTreatment: "OWN_COST", procurement: true,
            titleParameterIds: [soilId(work.key, "destination")] },
        ];
      }),
    ];
  }),
);

/** Composition of tested components ONLY. No second evaluator, profile defaults,
 * publication or claim of complete crossing execution. Return scope alongside
 * the definition so a caller cannot mistake arithmetic integration for a full
 * construction owner, engineering acceptance or procurement approval.
 */
export const ROAD_CROSSING_SLEEVES_COMPONENTS_SCOPE_R1 = Object.freeze({
  catalogId: "canonical-work:expanded:road_crossing_sleeves",
  fullOwner: false, engineeringAccepted: false, readyForPublication: false,
  omitted: Object.freeze([
    "Shoring/reaction actual design/method/load/interface approval, other consumables/waste and other kits/programmes; gap sealing, trenches, partial/nonrectangular/multiple/relocated/reused fill and retained-fill allocation approval; foundations/retained concrete/piles/anchors and other reaction schemes, groundwater measures; actual applicability and approved civil execution rates",
    "Approved pit return-fill technology, soil suitability/classification, heterogeneous/slurry allocations and non-granular/other bedding technologies",
    "Clearance/site preparation, other survey layouts and actual control acceptance, applicable fencing/traffic measures, recovered markers/waste handling; joint repairs/reinspection and other NDT methods, coating actual acceptance, other coatings/multiple or partial/shared mixes, cured defects/reinspection and wet waste handling, PE carrier connection actual acceptance, other connections/layouts/testing/repairs/waste and actual loading/method/design approval",
    "Internal fill product/method approval, other/partial fills, external overbreak grouting, pressure/buoyancy/restraints, preparation/curing and water quality/allocation approval",
    "Consolidated delivery manifests, other fittings/consumables freight, delivery/return of other construction fleets and changed/split equipment loads, extra soil sorting/site handling; actual certified mass, routes, receiving permission and prices remain project facts",
    "Full-owner reconciliation of explicit purchase exceptions with formula-reference balances",
    "Actual product/layout/design acceptance and governed full-owner publication/readback/UI acceptance",
  ]),
});
export const ROAD_CROSSING_SLEEVES_COMPONENT_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze([
  ...ROAD_CROSSING_SLEEVES_QUANTITY_PARAMETERS_R1, ...ROAD_CROSSING_SLEEVES_SPACER_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_CASING_MATERIAL_PARAMETERS_R1, ...ROAD_CROSSING_SLEEVES_PROCUREMENT_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_CARRIER_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_CIVIL_PARAMETERS_R1, ...ROAD_CROSSING_SLEEVES_JOINT_RESOURCE_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_SHORING_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_SHORING_GAP_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_REACTION_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_SHORING_CONSUMABLE_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_SERVICE_WASTE_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_BEDDING_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_PIT_RETURN_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_PIT_FILL_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_TRENCH_FILL_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_INTERNAL_FILL_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_INTERNAL_WATER_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_CIVIL_EXECUTION_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_FILL_EXECUTION_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_COMPACTION_WATER_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_MECHANICAL_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_CASING_PREP_MATERIAL_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_COATING_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_COATING_CONSUMABLE_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_CARRIER_CONNECTION_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_WATER_CONTROL_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_WATER_TREATMENT_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_WATER_RECEIVING_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_PREPARATION_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_INSPECTION_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_FREIGHT_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_EQUIPMENT_MOBILIZATION_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_SOIL_PARAMETERS_R1,
]);
export const ROAD_CROSSING_SLEEVES_COMPONENT_ROWS_R1: readonly AutomaticRowSpec[] = Object.freeze(reconcileDeclaredPurchaseBalanceRowsR1([
  ...ROAD_CROSSING_SLEEVES_CASING_MATERIAL_ROWS_R1, ...ROAD_CROSSING_SLEEVES_SPACER_GEOMETRY_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_PROCUREMENT_ROWS_R1, ...ROAD_CROSSING_SLEEVES_CIVIL_ROWS_R1, ...ROAD_CROSSING_SLEEVES_JOINT_RESOURCE_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_CARRIER_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_SHORING_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_SHORING_GAP_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_REACTION_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_SHORING_CONSUMABLE_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_SERVICE_WASTE_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_BEDDING_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_PIT_RETURN_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_PIT_FILL_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_TRENCH_FILL_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_INTERNAL_FILL_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_INTERNAL_WATER_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_CIVIL_EXECUTION_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_FILL_EXECUTION_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_COMPACTION_WATER_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_MECHANICAL_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_CASING_PREP_MATERIAL_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_COATING_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_COATING_CONSUMABLE_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_CARRIER_CONNECTION_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_WATER_CONTROL_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_WATER_TREATMENT_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_WATER_RECEIVING_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_PREPARATION_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_INSPECTION_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_FREIGHT_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_EQUIPMENT_MOBILIZATION_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_SOIL_ROWS_R1,
].map(row => freightCargoGroups.some(cargo => cargo.purchase.rowId === row.rowId) ? {
  ...row, effectiveQuantityOutput: row.effectiveQuantityOutput ?? { parameterId: effectiveResourceQuantityParameterId(row.rowId), unitId: row.unitId },
} : row), ROAD_CROSSING_SLEEVES_EFFECTIVE_BALANCES_R1));

/** Existing resources partitioned by actual construction stage. Open entries
 * are concrete absent resources/decisions, never a fabricated completeness PASS.
 */
export const ROAD_CROSSING_SLEEVES_STAGE_MATRIX_R1 = Object.freeze([
  { stageId: "preparation", titleRu: "Подготовка участка", rows: ROAD_CROSSING_SLEEVES_PREPARATION_ROWS_R1.filter(row => !row.rowId.startsWith("rcs:preparation:removal:")),
    remaining: ["Доступ, расчистка и подготовка площадки", "Другие схемы разбивки и фактическая приёмка геодезического контроля", "Применимые временные ограждения и организация движения"] },
  { stageId: "installation", titleRu: "Устройство перехода", rows: [
    ...ROAD_CROSSING_SLEEVES_REACTION_ROWS_R1.filter(row => !row.rowId.startsWith("rcs:reaction:removal:")),
    ...ROAD_CROSSING_SLEEVES_SHORING_CONSUMABLE_ROWS_R1,
    ...ROAD_CROSSING_SLEEVES_SHORING_GAP_ROWS_R1,
    ...ROAD_CROSSING_SLEEVES_SHORING_ROWS_R1.filter(row => !/^rcs:shoring:[^:]+:(?:extraction|disassembly):/u.test(row.rowId)),
    ...ROAD_CROSSING_SLEEVES_CIVIL_ROWS_R1.filter(row => !["rcs:civil:open_cut_full_width_bedding_m3", "rcs:civil:open_cut_remaining_fill_space_m3"].includes(row.rowId)),
    ...ROAD_CROSSING_SLEEVES_CIVIL_EXECUTION_ROWS_R1, ...ROAD_CROSSING_SLEEVES_WATER_CONTROL_ROWS_R1.filter(row => !row.rowId.startsWith("rcs:water-control:removal:")),
    ...ROAD_CROSSING_SLEEVES_WATER_TREATMENT_ROWS_R1.filter(row => !/^rcs:water-treatment:(?:removal|waste):/u.test(row.rowId) && row.rowId !== "rcs:water-treatment:bags:wet_used_count")],
    remaining: ["Подтверждение проекта/нагрузок/метода/сопряжения крепления и упора, прочие расходники/отходы; герметизация, траншейные/непрямоугольные/частичные зазоры, несколько комплектов/положений, удаляемое или повторно используемое заполнение и его распределение; основания/оставляемый бетон/сваи/анкеры и другие реакционные конструкции", "Подтверждение фактического водоотлива/фильтрации/приёма и их отходы, другие схемы очистки/приёма воды и способы водопонижения", "Разделение разных партий и дополнительное перемещение грунта", "Применимые смазка и заполнение снаружи футляра"] },
  { stageId: "bedding", titleRu: "Основание", rows: [
    ...ROAD_CROSSING_SLEEVES_CIVIL_ROWS_R1.filter(row => row.rowId === "rcs:civil:open_cut_full_width_bedding_m3"), ...ROAD_CROSSING_SLEEVES_BEDDING_ROWS_R1,
    ...ROAD_CROSSING_SLEEVES_FILL_EXECUTION_ROWS_R1.filter(row => row.rowId.startsWith("rcs:fill-execution:bedding:")),
    ...ROAD_CROSSING_SLEEVES_COMPACTION_WATER_ROWS_R1.filter(row => row.rowId.startsWith("rcs:compaction-water:bedding:"))],
    remaining: ["Подтверждение технологии слоёв и уплотнения основания", "Фактические качество и отдельное распределение воды", "Применимое основание котлованов"] },
  { stageId: "casing", titleRu: "Футляр и стыки", rows: [...ROAD_CROSSING_SLEEVES_CASING_MATERIAL_ROWS_R1, ...ROAD_CROSSING_SLEEVES_JOINT_RESOURCE_ROWS_R1,
    ...ROAD_CROSSING_SLEEVES_CASING_PREP_MATERIAL_ROWS_R1,
    ...ROAD_CROSSING_SLEEVES_COATING_ROWS_R1, ...ROAD_CROSSING_SLEEVES_COATING_CONSUMABLE_ROWS_R1,
    ...ROAD_CROSSING_SLEEVES_INSPECTION_ROWS_R1,
    ...ROAD_CROSSING_SLEEVES_MECHANICAL_ROWS_R1.filter(row => /^rcs:mechanical:casing_/u.test(row.rowId))],
    remaining: ["Подтверждение технологии подготовки и другие/повторно используемые частичные расходники", "Другие методы контроля, фактические дефекты, ремонт и повторный контроль", "Приёмка фактического покрытия, другие покрытия и несколько/частичные/общие замесы, отходы и исправление дефектов", "Подтверждённая схема подъёма, фактическая несущая способность и направляющие при загрузке"] },
  { stageId: "carrier_and_supports", titleRu: "Рабочая труба, опоры и концевые узлы", rows: [...ROAD_CROSSING_SLEEVES_SPACER_GEOMETRY_ROWS_R1, ...ROAD_CROSSING_SLEEVES_PROCUREMENT_ROWS_R1,
    ...ROAD_CROSSING_SLEEVES_CARRIER_CONNECTION_ROWS_R1,
    ...ROAD_CROSSING_SLEEVES_CARRIER_ROWS_R1, ...ROAD_CROSSING_SLEEVES_MECHANICAL_ROWS_R1.filter(row => !/^rcs:mechanical:casing_/u.test(row.rowId))],
    remaining: ["Подтверждение рабочей трубы, фактической схемы/совместимости электромуфт, иной поставки и технологии монтажа", "Другие соединители, соединения разных видов, реальные дефекты и повторный контроль, испытания линии и отходы соединений", "Подтверждённые удерживающие и концевые конструкции"] },
  { stageId: "internal_fill", titleRu: "Заполнение внутри футляра", rows: [...ROAD_CROSSING_SLEEVES_INTERNAL_FILL_ROWS_R1, ...ROAD_CROSSING_SLEEVES_INTERNAL_WATER_ROWS_R1,
    ...ROAD_CROSSING_SLEEVES_FILL_EXECUTION_ROWS_R1.filter(row => row.rowId.startsWith("rcs:fill-execution:internal:"))],
    remaining: ["Подтверждение технологии смешивания, размещения и совместимого оборудования", "Применимые удерживающие конструкции и ограничения давления и плавучести", "Подготовка и выдержка", "Подтверждение качества и распределения воды", "Другие или частичные способы заполнения"] },
  { stageId: "backfill", titleRu: "Обратная засыпка", rows: [
    ...ROAD_CROSSING_SLEEVES_CIVIL_ROWS_R1.filter(row => row.rowId === "rcs:civil:open_cut_remaining_fill_space_m3"),
    ...ROAD_CROSSING_SLEEVES_PIT_RETURN_ROWS_R1, ...ROAD_CROSSING_SLEEVES_PIT_FILL_ROWS_R1, ...ROAD_CROSSING_SLEEVES_TRENCH_FILL_ROWS_R1,
    ...ROAD_CROSSING_SLEEVES_SOIL_ROWS_R1.filter(row => row.costTreatment !== "OWN_COST"),
    ...ROAD_CROSSING_SLEEVES_COMPACTION_WATER_ROWS_R1.filter(row => !row.rowId.startsWith("rcs:compaction-water:bedding:")),
    ...ROAD_CROSSING_SLEEVES_FILL_EXECUTION_ROWS_R1.filter(row => /^rcs:fill-execution:(?:pits|trench):/u.test(row.rowId))],
    remaining: ["Подтверждение пригодности и распределения повторно используемого грунта", "Послойные или другие материалы траншеи", "Подтверждение технологии укладки и уплотнения", "Фактические качество и отдельное распределение воды", "Разные партии грунта, пульпа и иные состояния"] },
  { stageId: "completion", titleRu: "Завершение перехода", rows: [...ROAD_CROSSING_SLEEVES_FREIGHT_ROWS_R1,
    ...ROAD_CROSSING_SLEEVES_SERVICE_WASTE_ROWS_R1,
    ...ROAD_CROSSING_SLEEVES_REACTION_ROWS_R1.filter(row => row.rowId.startsWith("rcs:reaction:removal:")),
    ...ROAD_CROSSING_SLEEVES_SHORING_ROWS_R1.filter(row => /^rcs:shoring:[^:]+:(?:extraction|disassembly):/u.test(row.rowId)),
    ...ROAD_CROSSING_SLEEVES_EQUIPMENT_MOBILIZATION_ROWS_R1,
    ...ROAD_CROSSING_SLEEVES_WATER_TREATMENT_ROWS_R1.filter(row => /^rcs:water-treatment:(?:removal|waste):/u.test(row.rowId) || row.rowId === "rcs:water-treatment:bags:wet_used_count"),
    ...ROAD_CROSSING_SLEEVES_WATER_RECEIVING_ROWS_R1,
    ...ROAD_CROSSING_SLEEVES_WATER_CONTROL_ROWS_R1.filter(row => row.rowId.startsWith("rcs:water-control:removal:")),
    ...ROAD_CROSSING_SLEEVES_PREPARATION_ROWS_R1.filter(row => row.rowId.startsWith("rcs:preparation:removal:")),
    ...ROAD_CROSSING_SLEEVES_SOIL_ROWS_R1.filter(row => row.costTreatment === "OWN_COST")],
    remaining: ["Применимое восстановление территории и покрытия", "Доставка и возврат остальных механизмов; объединённые/разделённые грузы, иной возврат оборудования, другие комплектующие и расходники", "Фактический возврат пригодных колов и вывоз/приём отходов разбивки", "Испытания и завершение без подмены материалов документами"] },
].map(({ rows, ...stage }) => {
  const owners = new Set(rows.map(row => row.rowId));
  const stageRows = ROAD_CROSSING_SLEEVES_COMPONENT_ROWS_R1.filter(row => owners.has(row.rowId)
    || (row.purchaseBalanceOwnerRowId != null && owners.has(row.purchaseBalanceOwnerRowId)));
  return Object.freeze({ ...stage, ownResourceIds: Object.freeze(stageRows.map(row => row.rowId)), remaining: Object.freeze(stage.remaining) });
}));
function assertUnique(ids: readonly string[], kind: string): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`RCS_COMPONENT_DUPLICATE_${kind}:${id}`);
    seen.add(id);
  }
}
export function buildRoadCrossingSleevesComponentsR1(
  sourceMetadata: Parameters<typeof buildAutomaticConstructionOwnerR1>[0]["sourceMetadata"],
): Readonly<{ scope: typeof ROAD_CROSSING_SLEEVES_COMPONENTS_SCOPE_R1; definition: AutomaticOwnerDefinition;
  stageMatrix: typeof ROAD_CROSSING_SLEEVES_STAGE_MATRIX_R1 }> {
  assertUnique(ROAD_CROSSING_SLEEVES_COMPONENT_PARAMETERS_R1.map(parameter => parameter.id), "PARAMETER");
  assertUnique(ROAD_CROSSING_SLEEVES_COMPONENT_ROWS_R1.map(row => row.rowId), "ROW");
  assertUnique(ROAD_CROSSING_SLEEVES_COMPONENT_ROWS_R1.map(row => row.formulaId), "FORMULA");
  const definition = buildAutomaticConstructionOwnerR1({
    contract: "rik-expo-app.s27-28.road-crossing-sleeves-components.v1", semanticOwner: "road_crossing_sleeves_components",
    sourceId: "road-crossing-sleeves-automatic-s27-28", normId: "actual-selected-project-facts-and-source-bounded-components",
    sourceMetadata, applicabilityRu: "Компоненты одного футляра: количества, выбранные материалы, геометрия и MMA стыки. Не полная строительная работа или приёмка проекта.",
    ordinary: ROAD_CROSSING_SLEEVES_COMPONENT_PARAMETERS_R1.filter(parameter => parameter.kind === "ordinary"),
    profile: [], conditional: ROAD_CROSSING_SLEEVES_COMPONENT_PARAMETERS_R1.filter(parameter => parameter.kind === "conditional"),
    rows: ROAD_CROSSING_SLEEVES_COMPONENT_ROWS_R1, excludedUnownedAssumptions: ROAD_CROSSING_SLEEVES_COMPONENTS_SCOPE_R1.omitted,
  });
  return Object.freeze({ scope: ROAD_CROSSING_SLEEVES_COMPONENTS_SCOPE_R1, definition, stageMatrix: ROAD_CROSSING_SLEEVES_STAGE_MATRIX_R1 });
}
