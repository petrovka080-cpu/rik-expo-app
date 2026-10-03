import { buildAutomaticConstructionOwnerR1, type AutomaticInclusionCondition, type AutomaticOwnerDefinition, type AutomaticParameterSpec, type AutomaticRowSpec } from "./automaticConstructionOwnerR1";
import { ROAD_CROSSING_SLEEVES_QUANTITY_PARAMETERS_R1, ROAD_CROSSING_SLEEVES_QUANTITY_EXPRESSIONS_R1 as quantities } from "./roadCrossingSleevesQuantityModelR1";
import { ROAD_CROSSING_SLEEVES_SPACER_PARAMETERS_R1, ROAD_CROSSING_SLEEVES_SPACER_GEOMETRY_ROWS_R1 } from "./roadCrossingSleevesSpacerGeometryR1";
import { ROAD_CROSSING_SLEEVES_PROCUREMENT_PARAMETERS_R1, ROAD_CROSSING_SLEEVES_PROCUREMENT_ROWS_R1 } from "./roadCrossingSleevesProcurementR1";
import { ROAD_CROSSING_SLEEVES_CIVIL_PARAMETERS_R1, ROAD_CROSSING_SLEEVES_CIVIL_ROWS_R1,
  ROAD_CROSSING_SLEEVES_CIVIL_EXPRESSIONS_R1 as civil, ROAD_CROSSING_SLEEVES_CIVIL_METHODS_R1 as methods } from "./roadCrossingSleevesCivilGeometryR1";
import { ROAD_CROSSING_SLEEVES_JOINT_RESOURCE_PARAMETERS_R1, ROAD_CROSSING_SLEEVES_JOINT_RESOURCE_ROWS_R1 } from "./roadCrossingSleevesJointResourcesR1";
import { ROAD_CROSSING_SLEEVES_CASING_MATERIAL_PARAMETERS_R1, ROAD_CROSSING_SLEEVES_CASING_MATERIAL_ROWS_R1,
  ROAD_CROSSING_SLEEVES_CARRIER_PARAMETERS_R1, ROAD_CROSSING_SLEEVES_CARRIER_ROWS_R1 } from "./roadCrossingSleevesCasingMaterialR1";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
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
const METHOD_ID = "rcs_civil_installation_method";
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
export const ROAD_CROSSING_SLEEVES_MECHANICAL_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze(
  mechanicalWorks.flatMap(work => {
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
);
export const ROAD_CROSSING_SLEEVES_MECHANICAL_ROWS_R1: readonly AutomaticRowSpec[] = Object.freeze(
  mechanicalWorks.flatMap(work => (["crew", "equipment"] as const).map(owner => ({
    rowId: `rcs:mechanical:${work.key}:${owner}_hours`, formulaId: `rcs:mechanical:${work.key}:${owner}_hours`,
    section: `Монтаж: ${work.title}`, title: `${work.title}: ${owner === "crew" ? "труд всех исполнителей" : "комплект техники с энергией"}`,
    category: owner === "crew" ? "labor" : "equipment", unitId: owner === "crew" ? "man_hour" : "machine_hour",
    expression: `(${work.quantity})*${mechanicalId(work.key, `${owner}_h_per_unit`)}`, ...(work.inclusion ? { inclusion: work.inclusion } : {}),
    procurement: true, titleParameterIds: [mechanicalId(work.key, `${owner}_designation`)],
    inputParameterIds: [...work.facts, mechanicalId(work.key, "method_reference"), mechanicalId(work.key, `${owner}_designation`), mechanicalId(work.key, `${owner}_cost_basis`)],
  }))),
);

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
type FreightCargo = Readonly<{ key: string; title: string; purchase: AutomaticRowSpec; stockId: string;
  unit: "piece" | "m3" | "kg"; sectionLengthId?: string; quantum?: string }>;
function freightCargo(key: string, title: string, rows: readonly AutomaticRowSpec[], rowId: string,
  stockId: string, unit: FreightCargo["unit"], sectionLengthId?: string, quantum?: string): FreightCargo {
  const purchase = rows.find(row => row.rowId === rowId);
  if (!purchase || purchase.costTreatment !== "OWN_COST") throw new Error(`RCS_FREIGHT_PURCHASE_OWNER_MISSING:${rowId}`);
  return { key, title, purchase, stockId, unit, sectionLengthId, quantum };
}
const freightCargoGroups: readonly FreightCargo[] = [
  freightCargo("casing", "Секции стального футляра", ROAD_CROSSING_SLEEVES_CASING_MATERIAL_ROWS_R1,
    "rcs:casing:ordered_casing_length_m", "rcs_compatible_stock_section_count", "piece", "rcs_planned_physical_section_length_m"),
  freightCargo("carrier", "Секции рабочей трубы", ROAD_CROSSING_SLEEVES_CARRIER_ROWS_R1,
    "rcs:carrier:ordered_length_m", "rcs_carrier_compatible_whole_section_stock_count", "piece", "rcs_carrier_physical_supply_section_length_m"),
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
];
const freightId = (key: string, suffix: string) => `rcs_freight_${key}_${suffix}`;
const freightLanes = freightCargoGroups.flatMap(cargo => (["new", "stock"] as const).map(lane => {
  const key = `${cargo.key}_${lane}`;
  const offsite = freightId(cargo.key, "offsite_stock_units");
  const quantity = lane === "stock" ? offsite : cargo.sectionLengthId
    ? `(${cargo.purchase.expression})/${cargo.sectionLengthId}` : cargo.purchase.expression;
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
  const quantum = cargo.unit === "piece" ? "1" : lane === "new" ? cargo.quantum : undefined;
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
        costTreatment: "OWN_COST", procurement: true, titleParameterIds: [freightId(key, "vehicle_designation")] },
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
    "Excavation support/reaction structures and groundwater measures; actual applicability and approved civil execution rates",
    "Approved pit return-fill technology, soil suitability/classification, heterogeneous/slurry allocations and non-granular/other bedding technologies",
    "Clearance/site preparation, other survey layouts and actual control acceptance, applicable fencing/traffic measures, recovered markers/waste handling; joint repairs/reinspection and other NDT methods, coating/drying, jacking section loading, carrier connections and method/design approval",
    "Internal fill product/method approval, other/partial fills, external overbreak grouting, pressure/buoyancy/restraints, preparation/curing and water quality/allocation approval",
    "Consolidated delivery manifests, fittings/consumables freight, equipment delivery/return and extra soil sorting/site handling; actual certified mass, routes, receiving permission and prices remain project facts",
    "Full-owner reconciliation of explicit purchase exceptions with formula-reference balances",
    "Actual product/layout/design acceptance and governed full-owner publication/readback/UI acceptance",
  ]),
});
export const ROAD_CROSSING_SLEEVES_COMPONENT_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze([
  ...ROAD_CROSSING_SLEEVES_QUANTITY_PARAMETERS_R1, ...ROAD_CROSSING_SLEEVES_SPACER_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_CASING_MATERIAL_PARAMETERS_R1, ...ROAD_CROSSING_SLEEVES_PROCUREMENT_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_CARRIER_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_CIVIL_PARAMETERS_R1, ...ROAD_CROSSING_SLEEVES_JOINT_RESOURCE_PARAMETERS_R1,
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
  ...ROAD_CROSSING_SLEEVES_PREPARATION_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_INSPECTION_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_FREIGHT_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_SOIL_PARAMETERS_R1,
]);
export const ROAD_CROSSING_SLEEVES_COMPONENT_ROWS_R1: readonly AutomaticRowSpec[] = Object.freeze([
  ...ROAD_CROSSING_SLEEVES_CASING_MATERIAL_ROWS_R1, ...ROAD_CROSSING_SLEEVES_SPACER_GEOMETRY_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_PROCUREMENT_ROWS_R1, ...ROAD_CROSSING_SLEEVES_CIVIL_ROWS_R1, ...ROAD_CROSSING_SLEEVES_JOINT_RESOURCE_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_CARRIER_ROWS_R1,
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
  ...ROAD_CROSSING_SLEEVES_PREPARATION_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_INSPECTION_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_FREIGHT_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_SOIL_ROWS_R1,
]);

/** Existing resources partitioned by actual construction stage. Open entries
 * are concrete absent resources/decisions, never a fabricated completeness PASS.
 */
export const ROAD_CROSSING_SLEEVES_STAGE_MATRIX_R1 = Object.freeze([
  { stageId: "preparation", titleRu: "Подготовка участка", rows: ROAD_CROSSING_SLEEVES_PREPARATION_ROWS_R1.filter(row => !row.rowId.startsWith("rcs:preparation:removal:")),
    remaining: ["Доступ, расчистка и подготовка площадки", "Другие схемы разбивки и фактическая приёмка геодезического контроля", "Применимые временные ограждения и организация движения"] },
  { stageId: "installation", titleRu: "Устройство перехода", rows: [
    ...ROAD_CROSSING_SLEEVES_CIVIL_ROWS_R1.filter(row => !["rcs:civil:open_cut_full_width_bedding_m3", "rcs:civil:open_cut_remaining_fill_space_m3"].includes(row.rowId)),
    ...ROAD_CROSSING_SLEEVES_CIVIL_EXECUTION_ROWS_R1],
    remaining: ["Крепление грунта и реакционные конструкции", "Водоотведение", "Разделение разных партий и дополнительное перемещение грунта", "Применимые смазка и заполнение снаружи футляра"] },
  { stageId: "bedding", titleRu: "Основание", rows: [
    ...ROAD_CROSSING_SLEEVES_CIVIL_ROWS_R1.filter(row => row.rowId === "rcs:civil:open_cut_full_width_bedding_m3"), ...ROAD_CROSSING_SLEEVES_BEDDING_ROWS_R1,
    ...ROAD_CROSSING_SLEEVES_FILL_EXECUTION_ROWS_R1.filter(row => row.rowId.startsWith("rcs:fill-execution:bedding:")),
    ...ROAD_CROSSING_SLEEVES_COMPACTION_WATER_ROWS_R1.filter(row => row.rowId.startsWith("rcs:compaction-water:bedding:"))],
    remaining: ["Подтверждение технологии слоёв и уплотнения основания", "Фактические качество и отдельное распределение воды", "Применимое основание котлованов"] },
  { stageId: "casing", titleRu: "Футляр и стыки", rows: [...ROAD_CROSSING_SLEEVES_CASING_MATERIAL_ROWS_R1, ...ROAD_CROSSING_SLEEVES_JOINT_RESOURCE_ROWS_R1,
    ...ROAD_CROSSING_SLEEVES_INSPECTION_ROWS_R1,
    ...ROAD_CROSSING_SLEEVES_MECHANICAL_ROWS_R1.filter(row => /^rcs:mechanical:casing_/u.test(row.rowId))],
    remaining: ["Подтверждение технологии подготовки и отдельные расходники", "Другие методы контроля, фактические дефекты, ремонт и повторный контроль", "Применимое восстановление защитного покрытия", "Загрузка секций при продавливании и подтверждённая схема подъёма"] },
  { stageId: "carrier_and_supports", titleRu: "Рабочая труба, опоры и концевые узлы", rows: [...ROAD_CROSSING_SLEEVES_SPACER_GEOMETRY_ROWS_R1, ...ROAD_CROSSING_SLEEVES_PROCUREMENT_ROWS_R1,
    ...ROAD_CROSSING_SLEEVES_CARRIER_ROWS_R1, ...ROAD_CROSSING_SLEEVES_MECHANICAL_ROWS_R1.filter(row => !/^rcs:mechanical:casing_/u.test(row.rowId))],
    remaining: ["Подтверждение рабочей трубы, иной поставки и совместимой технологии монтажа", "Соединители и соединения рабочей трубы", "Подтверждённые удерживающие и концевые конструкции"] },
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
    ...ROAD_CROSSING_SLEEVES_PREPARATION_ROWS_R1.filter(row => row.rowId.startsWith("rcs:preparation:removal:")),
    ...ROAD_CROSSING_SLEEVES_SOIL_ROWS_R1.filter(row => row.costTreatment === "OWN_COST")],
    remaining: ["Применимое восстановление территории и покрытия", "Доставка и возврат оборудования; объединённые грузы, комплектующие и расходники", "Фактический возврат пригодных колов и вывоз/приём отходов разбивки", "Испытания и завершение без подмены материалов документами"] },
].map(({ rows, ...stage }) => Object.freeze({ ...stage, ownResourceIds: Object.freeze(rows.map(row => row.rowId)), remaining: Object.freeze(stage.remaining) })));
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
