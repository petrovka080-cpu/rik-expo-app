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
      : `${work.title}: применимая карта укладки, слоёв и уплотнения с выбранной смесью и повторно используемым материалом; поставка, резерв и вывоз отдельно`),
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
  const quantum = cargo.unit === "piece" ? "1" : cargo.quantum;
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
    "Approved pit return-fill technology, suitability/reuse/haul/disposal of soil and non-granular/other bedding technologies",
    "Actual preparation consumables, joint NDT/repairs/coating/drying, jacking section loading, carrier connections and method/design approval",
    "Internal fill product/method approval, other/partial fills, external overbreak grouting, pressure/buoyancy/restraints, preparation/curing and water quality/allocation approval",
    "Consolidated delivery manifests, fittings/consumables freight, equipment delivery/return and soil haul/disposal; actual certified mass, routes and prices remain project facts",
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
  ...ROAD_CROSSING_SLEEVES_MECHANICAL_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_FREIGHT_PARAMETERS_R1,
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
  ...ROAD_CROSSING_SLEEVES_MECHANICAL_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_FREIGHT_ROWS_R1,
]);

/** Existing resources partitioned by actual construction stage. Open entries
 * are concrete absent resources/decisions, never a fabricated completeness PASS.
 */
export const ROAD_CROSSING_SLEEVES_STAGE_MATRIX_R1 = Object.freeze([
  { stageId: "preparation", titleRu: "Подготовка участка", rows: [],
    remaining: ["Доступ, подготовка площадки и разбивка", "Применимые временные ограждения и организация движения"] },
  { stageId: "installation", titleRu: "Устройство перехода", rows: [
    ...ROAD_CROSSING_SLEEVES_CIVIL_ROWS_R1.filter(row => !["rcs:civil:open_cut_full_width_bedding_m3", "rcs:civil:open_cut_remaining_fill_space_m3"].includes(row.rowId)),
    ...ROAD_CROSSING_SLEEVES_CIVIL_EXECUTION_ROWS_R1],
    remaining: ["Крепление грунта и реакционные конструкции", "Водоотведение", "Разделение грунта, перемещение и вывоз", "Применимые смазка и заполнение снаружи футляра"] },
  { stageId: "bedding", titleRu: "Основание", rows: [
    ...ROAD_CROSSING_SLEEVES_CIVIL_ROWS_R1.filter(row => row.rowId === "rcs:civil:open_cut_full_width_bedding_m3"), ...ROAD_CROSSING_SLEEVES_BEDDING_ROWS_R1,
    ...ROAD_CROSSING_SLEEVES_FILL_EXECUTION_ROWS_R1.filter(row => row.rowId.startsWith("rcs:fill-execution:bedding:"))],
    remaining: ["Подтверждение технологии слоёв и уплотнения основания", "Фактически расходуемая вода и её отдельная поставка", "Применимое основание котлованов"] },
  { stageId: "casing", titleRu: "Футляр и стыки", rows: [...ROAD_CROSSING_SLEEVES_CASING_MATERIAL_ROWS_R1, ...ROAD_CROSSING_SLEEVES_JOINT_RESOURCE_ROWS_R1,
    ...ROAD_CROSSING_SLEEVES_MECHANICAL_ROWS_R1.filter(row => /^rcs:mechanical:casing_/u.test(row.rowId))],
    remaining: ["Подтверждение технологии подготовки и отдельные расходники", "Контроль и исправление стыков", "Применимое восстановление защитного покрытия", "Загрузка секций при продавливании и подтверждённая схема подъёма"] },
  { stageId: "carrier_and_supports", titleRu: "Рабочая труба, опоры и концевые узлы", rows: [...ROAD_CROSSING_SLEEVES_SPACER_GEOMETRY_ROWS_R1, ...ROAD_CROSSING_SLEEVES_PROCUREMENT_ROWS_R1,
    ...ROAD_CROSSING_SLEEVES_CARRIER_ROWS_R1, ...ROAD_CROSSING_SLEEVES_MECHANICAL_ROWS_R1.filter(row => !/^rcs:mechanical:casing_/u.test(row.rowId))],
    remaining: ["Подтверждение рабочей трубы, иной поставки и совместимой технологии монтажа", "Соединители и соединения рабочей трубы", "Подтверждённые удерживающие и концевые конструкции"] },
  { stageId: "internal_fill", titleRu: "Заполнение внутри футляра", rows: [...ROAD_CROSSING_SLEEVES_INTERNAL_FILL_ROWS_R1, ...ROAD_CROSSING_SLEEVES_INTERNAL_WATER_ROWS_R1,
    ...ROAD_CROSSING_SLEEVES_FILL_EXECUTION_ROWS_R1.filter(row => row.rowId.startsWith("rcs:fill-execution:internal:"))],
    remaining: ["Подтверждение технологии смешивания, размещения и совместимого оборудования", "Применимые удерживающие конструкции и ограничения давления и плавучести", "Подготовка и выдержка", "Подтверждение качества и распределения воды", "Другие или частичные способы заполнения"] },
  { stageId: "backfill", titleRu: "Обратная засыпка", rows: [
    ...ROAD_CROSSING_SLEEVES_CIVIL_ROWS_R1.filter(row => row.rowId === "rcs:civil:open_cut_remaining_fill_space_m3"),
    ...ROAD_CROSSING_SLEEVES_PIT_RETURN_ROWS_R1, ...ROAD_CROSSING_SLEEVES_PIT_FILL_ROWS_R1, ...ROAD_CROSSING_SLEEVES_TRENCH_FILL_ROWS_R1,
    ...ROAD_CROSSING_SLEEVES_FILL_EXECUTION_ROWS_R1.filter(row => /^rcs:fill-execution:(?:pits|trench):/u.test(row.rowId))],
    remaining: ["Подтверждение пригодности и распределения повторно используемого грунта", "Послойные или другие материалы траншеи", "Подтверждение технологии укладки и уплотнения", "Фактически расходуемая вода и её отдельная поставка", "Состояния грунта и баланс вывоза"] },
  { stageId: "completion", titleRu: "Завершение перехода", rows: [...ROAD_CROSSING_SLEEVES_FREIGHT_ROWS_R1],
    remaining: ["Применимое восстановление территории и покрытия", "Доставка и возврат оборудования; объединённые грузы, комплектующие и расходники", "Испытания и завершение без подмены материалов документами"] },
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
