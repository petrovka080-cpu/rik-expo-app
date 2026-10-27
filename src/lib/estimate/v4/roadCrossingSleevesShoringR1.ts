import type { AutomaticInclusionCondition, AutomaticParameterSpec, AutomaticRowSpec } from "./automaticConstructionOwnerR1";
import { ROAD_CROSSING_SLEEVES_CIVIL_METHODS_R1 as methods } from "./roadCrossingSleevesCivilGeometryR1";

/** Resource composition in the SAME AutomaticOwner/FormulaGraph. Kit quantities
 * and placement cycles are actual approved programme facts, never excavation m3
 * or ceil(crossing/box length). Full homogeneous kits are assembled/disassembled
 * on site once each; all are leased for the same actual calendar interval.
 * SBH Series600 describes distinct parts, assembly, placement and extraction
 * coordinated with backfill. Its example geometry, loads and foreign standards
 * are NOT defaults, project approval or rates for this implementation.
 * https://sbh-verbau.de/fileadmin/Webseite/mehrwert/Downloads/EN/Anleitungen_EN/600-manhole-2015.pdf */
export const ROAD_CROSSING_SLEEVES_SHORING_MODES_R1 = Object.freeze({
  completeRental: "Полные однородные временные арендные комплекты: каждый собирается и разбирается на объекте один раз, одинаковый срок аренды; все установки/перестановки и извлечения по фактической программе",
  otherParty: "Все ресурсы крепления этого участка обеспечены другой стороной без отдельной оплаты исполнителем",
  notRequired: "Отсутствие крепления этого участка подтверждено применимым проектом, грунтом, условиями и технологией; не принято автоматически",
  other: "Другое крепление, разные комплекты/сроки, частичные поставки, готовые собранные блоки или оставляемые конструкции: отдельная фактическая схема",
});
export const ROAD_CROSSING_SLEEVES_SHORING_RENTAL_BASIS_R1 = "Календарная аренда одного полного пригодного комплекта со всеми фактически предусмотренными панелями/распорками/удлинителями/соединителями/крепежом и специальной оснасткой; без доставки/возврата, всех работ на объекте, расходников, заполнения зазоров, отходов, грунта и реакционных конструкций";
export const ROAD_CROSSING_SLEEVES_SHORING_WORK_BASES_R1 = Object.freeze({
  crew: "Все исполнители только этой операции крепления, включая операторов/стропальщиков/сигнальщиков; без техники, энергии, аренды, материалов, земляных работ, засыпки и реакционных конструкций",
  equipment: "Весь совместимый комплект техники только этой операции крепления с энергией, без всех исполнителей, календарной аренды крепления, доставки, материалов, земляных работ, засыпки и реакционных конструкций",
});
export const roadCrossingSleevesShoringParameterId = (key: string, suffix: string) => `rcs_shoring_${key}_${suffix}`;
const METHOD = "rcs_civil_installation_method";
const groups = [
  { key: "trench", title: "Крепление открытой траншеи", method: methods.openCut,
    length: "rcs_crossing_length_m", width: "rcs_open_cut_excavation_width_m", depth: "rcs_open_cut_excavation_depth_m" },
  { key: "thrust", title: "Крепление стартового котлована", method: methods.pipeJacking,
    length: "rcs_jacking_thrust_excavation_length_m", width: "rcs_jacking_thrust_excavation_width_m", depth: "rcs_jacking_thrust_excavation_depth_m" },
  { key: "reception", title: "Крепление приёмного котлована", method: methods.pipeJacking,
    length: "rcs_jacking_reception_excavation_length_m", width: "rcs_jacking_reception_excavation_width_m", depth: "rcs_jacking_reception_excavation_depth_m" },
] as const;
const members = [
  ["base_panels", "основные стеновые панели", 1], ["top_panels", "надставные стеновые панели", 0],
  ["struts_frames", "полные распорки/рамы", 1], ["extensions", "удлинители", 0],
  ["connectors", "соединители", 0], ["fastener_sets", "полные предусмотренные комплекты пальцев/болтов с фиксаторами", 1],
  ["special_tackle", "вся специальная оснастка крепления, включая предусмотренные захваты/проушины/стропы", 0],
] as const;
const scopes = groups.map(group => {
  const id = (suffix: string) => roadCrossingSleevesShoringParameterId(group.key, suffix);
  const applicable: AutomaticInclusionCondition = { kind: "equals", parameterId: METHOD, value: group.method };
  const selected: AutomaticInclusionCondition = { kind: "and", operands: [applicable,
    { kind: "equals", parameterId: id("mode"), value: ROAD_CROSSING_SLEEVES_SHORING_MODES_R1.completeRental }] };
  const facts = [METHOD, id("mode"), id("program_reference"), id("kit_designation"), id("kit_product_reference"), id("complete_kit_count"),
    ...members.map(([key]) => id(`kit_${key}_per_complete_kit`))];
  const geometryFacts = [group.length, group.width, group.depth, "rcs_casing_outside_diameter_mm", id("geometry_and_load_reference"),
    ...["installed_outer_length_m", "installed_outer_width_m", "installed_height_m", "required_projection_m", "usable_width_m", "usable_length_m",
      "required_usable_width_m", "required_usable_length_m"].map(id)];
  return { ...group, id, applicable, selected, facts, geometryFacts };
});
const operations = [
  { key: "assembly", title: "Полная сборка каждого исходного комплекта на объекте", quantity: "complete_kit_count", perHour: false },
  { key: "installation", title: "Все установки и перестановки по программе с контактом грунта и контролем положения, без второй разработки грунта", quantity: "placement_cycle_count", perHour: false },
  { key: "monitoring", title: "Отдельный осмотр и обслуживание всей одновременно используемой группы за общий фактический календарный период", quantity: "calendar_hours", perHour: true },
  { key: "extraction", title: "Все извлечения по фактической программе вместе с последовательностью засыпки, без второй оплаты засыпки", quantity: "placement_cycle_count", perHour: false },
  { key: "disassembly", title: "Полная разборка и подготовка каждого исходного комплекта к возврату на объекте", quantity: "complete_kit_count", perHour: false },
] as const;
export const ROAD_CROSSING_SLEEVES_SHORING_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze(scopes.flatMap(({ title, id, applicable, selected }) => {
  const text = (suffix: string, caption: string, when: AutomaticInclusionCondition = selected): AutomaticParameterSpec => ({ id: id(suffix), title: `${title}: ${caption}`,
    valueType: "text", unitId: null, kind: "conditional", requiredWhen: when });
  const number = (suffix: string, caption: string, unitId: string, minimum: number, integer = false): AutomaticParameterSpec => ({ id: id(suffix),
    title: `${title}: ${caption}`, valueType: integer ? "integer" : "decimal", unitId, min: minimum, kind: "conditional", requiredWhen: selected });
  return [
    { id: id("mode"), title: `${title}: фактическая технология и граница ресурсов`, valueType: "enum", unitId: null,
      values: Object.values(ROAD_CROSSING_SLEEVES_SHORING_MODES_R1), kind: "conditional", requiredWhen: applicable } as AutomaticParameterSpec,
    text("program_reference", "применимые проект/грунт/условия/способ/полная схема сторон и непересекающихся ресурсов; фактическое число комплектов, весь календарь и каждое место установки/перестановки/извлечения, непрерывность защиты, торцы, доступ и взаимодействие с засыпкой; остальные материалы/зазоры/отходы и реакционные конструкции имеют отдельных владельцев", applicable),
    text("kit_designation", "фактический полный совместимый однородный комплект временного крепления"),
    text("kit_product_reference", "полные паспорта/ведомость всех деталей и оснастки, пригодность и совместимость, фактический включённый состав; комплект целиком снят и возвращён, не постоянный вытесненный объём"),
    number("complete_kit_count", "исходное число полных однородных арендных комплектов из ведомости всей программы, включая отдельно предусмотренный резерв; не объём грунта и не число перемещений", "piece", 1, true),
    number("calendar_hours", "одинаковый фактический полный календарный срок аренды каждого исходного комплекта, включая простой; не часы работы механизмов", "hour", 0.000_001),
    number("placement_cycle_count", "фактическое общее число полных циклов установка–извлечение всех комплектов, включая каждую перестановку; каждый исходный комплект используется хотя бы один раз", "piece", 1, true),
    ...members.map(([key, caption, min]) => number(`kit_${key}_per_complete_kit`, `${caption} в одном полном комплекте по ведомости; уже включены в аренду, явный ноль для неприменимых частей`, "piece", min, true)),
    { id: id("rental_cost_basis"), title: `${title}: граница календарной аренды полного комплекта`, valueType: "enum", unitId: null,
      values: [ROAD_CROSSING_SLEEVES_SHORING_RENTAL_BASIS_R1], kind: "conditional", requiredWhen: selected } as AutomaticParameterSpec,
    text("geometry_and_load_reference", "фактическая допустимая конфигурация/нагрузки/устойчивость/порядок и габариты всех частей при каждом положении, расчёт и применимость проекта; внутреннее место для выбранной технологии не заменяет наружную разработку"),
    ...([ ["installed_outer_length_m", "наибольшая фактическая наружная длина одного установленного полного комплекта со всеми частями", 0.000_001],
      ["installed_outer_width_m", "наибольшая фактическая наружная ширина установленного полного комплекта со всеми частями", 0.000_001],
      ["installed_height_m", "фактическая полная установленная высота стенок с предусмотренными надставками", 0.000_001],
      ["required_projection_m", "фактическая требуемая проектом/технологией высота стенок над землёй; явный ноль допустим только по источнику", 0],
      ["usable_width_m", "наименьшая фактическая полезная ширина внутри установленного комплекта между всеми выступающими деталями", 0.000_001],
      ["usable_length_m", "наименьшая фактическая полезная длина внутри установленного комплекта между всеми выступающими деталями", 0.000_001],
      ["required_usable_width_m", "фактическая требуемая полезная ширина всех работ/оборудования/зазоров выбранной технологии; не универсальная норма", 0.000_001],
      ["required_usable_length_m", "фактическая требуемая полезная длина всех работ/оборудования/зазоров выбранной технологии; не длина поставочной секции", 0.000_001] ] as const)
      .map(([key, caption, min]) => number(key, caption, "m", min)),
    ...operations.flatMap(op => [
      text(`${op.key}_method_reference`, `${op.title}: полная фактическая технология, все исполнители/механизмы и распределение; календарная аренда, земляные работы, доставка, засыпка и реакционные конструкции исключены`),
      text(`${op.key}_crew_designation`, `${op.title}: все исполнители, включая операторов и стропальщиков`),
      number(`${op.key}_crew_h_per_unit`, `${op.title}: фактические суммарные человеко-часы ${op.perHour ? "всей группы за календарный час, не на каждый комплект" : "за один полный исходный комплект или цикл согласно операции"}`, op.perHour ? "man_hour_per_hour" : "man_hour_per_piece", 0.000_001),
      { id: id(`${op.key}_crew_cost_basis`), title: `${title}: ${op.title}: граница труда`, valueType: "enum", unitId: null,
        values: [ROAD_CROSSING_SLEEVES_SHORING_WORK_BASES_R1.crew], kind: "conditional", requiredWhen: selected } as AutomaticParameterSpec,
      text(`${op.key}_equipment_designation`, `${op.title}: весь совместимый комплект техники и оснастки с энергией, без исполнителей; отсутствие отдельной техники подтверждается явным нулём`),
      number(`${op.key}_equipment_h_per_unit`, `${op.title}: фактические машино-часы ${op.perHour ? "всей группы за календарный час" : "за один полный исходный комплект или цикл согласно операции"}`, op.perHour ? "machine_hour_per_hour" : "machine_hour_per_piece", 0),
      { id: id(`${op.key}_equipment_cost_basis`), title: `${title}: ${op.title}: граница техники`, valueType: "enum", unitId: null,
        values: [ROAD_CROSSING_SLEEVES_SHORING_WORK_BASES_R1.equipment], kind: "conditional", requiredWhen: selected } as AutomaticParameterSpec,
    ]),
  ];
}));
export const ROAD_CROSSING_SLEEVES_SHORING_ROWS_R1: readonly AutomaticRowSpec[] = Object.freeze(scopes.flatMap(group => {
  const { key, title, id, selected, facts, geometryFacts } = group;
  const row = (suffix: string, caption: string, expression: string, unitId: string, extra: Partial<AutomaticRowSpec> = {}): AutomaticRowSpec => ({
    rowId: `rcs:shoring:${key}:${suffix}`, formulaId: `rcs:shoring:${key}:${suffix}`, section: title, category: "service", title: `${title}: ${caption}`,
    expression, unitId, inclusion: selected, costTreatment: "INFORMATIONAL_SCOPE", inputParameterIds: facts, ...extra });
  const bounds = (unitId: string) => ({ schemaVersion: "canonical_formula_output_bounds_v1" as const, unitId, minimum: 0,
    reasonRu: "Фактическая программа и полный комплект должны помещаться в исходную наружную разработку и обеспечивать исходный футляр/работы; отрицательная разность не является нулём, ручные количества не исправляют несовместимость. Это проверка размеров, не инженерная приёмка." });
  return [
    row("complete_kit_count", "исходные полные арендные комплекты из ведомости", id("complete_kit_count"), "piece"),
    row("rental_set_hours", "календарная аренда всех исходных полных комплектов, без повторной покупки включённых деталей", `${id("complete_kit_count")}*${id("calendar_hours")}`, "machine_hour", {
      category: "equipment", costTreatment: "OWN_COST", procurement: true, titleParameterIds: [id("kit_designation")],
      inputParameterIds: [...facts, id("calendar_hours"), id("rental_cost_basis")] }),
    ...members.map(([member, caption]) => row(`included:${member}`, `${caption} всех исходных комплектов, уже включены в аренду`, `${id("complete_kit_count")}*${id(`kit_${member}_per_complete_kit`)}`, "piece")),
    row("placement_cycle_count", "полные фактические циклы установки и извлечения всей группы", id("placement_cycle_count"), "piece"),
    row("placement_cycle_margin", "циклы сверх одного применения каждого исходного комплекта", `${id("placement_cycle_count")}-${id("complete_kit_count")}`, "piece", { formulaOutputBounds: bounds("piece") }),
    ...[ ["outer_length_margin", `${group.length}-${id("installed_outer_length_m")}`], ["outer_width_margin", `${group.width}-${id("installed_outer_width_m")}`],
      ["height_margin", `${id("installed_height_m")}-${group.depth}-${id("required_projection_m")}`],
      ["inner_outer_width_margin", `${id("installed_outer_width_m")}-${id("usable_width_m")}`],
      ["inner_outer_length_margin", `${id("installed_outer_length_m")}-${id("usable_length_m")}`],
      ["usable_width_margin", `${id("usable_width_m")}-${id("required_usable_width_m")}`],
      ["usable_length_margin", `${id("usable_length_m")}-${id("required_usable_length_m")}`],
      ["casing_width_margin", `${id("usable_width_m")}-rcs_casing_outside_diameter_mm/1000`] ]
      .map(([suffix, expression]) => row(suffix, "разность подтверждённых исходных размеров; не расчёт устойчивости и не нормативный зазор", expression, "m", {
        inputParameterIds: [...facts, ...geometryFacts], formulaOutputBounds: bounds("m") })),
    ...operations.flatMap(op => {
      const opFacts = [...facts, id(`${op.key}_method_reference`), id(op.quantity), ...(op.quantity === "placement_cycle_count" ? geometryFacts : []),
        ...(op.key === "installation" && key !== "trench" ? [`rcs_shoring_gap_${key}_mode`, `rcs_shoring_gap_${key}_program_and_allocation_reference`] : [])];
      return [
        row(`${op.key}:crew_hours`, `${op.title}: все исполнители`, `${id(op.quantity)}*${id(`${op.key}_crew_h_per_unit`)}`, "man_hour", {
          category: "labor", costTreatment: "OWN_COST", procurement: true, titleParameterIds: [id(`${op.key}_crew_designation`)],
          inputParameterIds: [...opFacts, id(`${op.key}_crew_designation`), id(`${op.key}_crew_h_per_unit`), id(`${op.key}_crew_cost_basis`)] }),
        row(`${op.key}:equipment_hours`, `${op.title}: совместимая техника с энергией без исполнителей`, `${id(op.quantity)}*${id(`${op.key}_equipment_h_per_unit`)}`, "machine_hour", {
          category: "equipment", costTreatment: "OWN_COST", procurement: true, titleParameterIds: [id(`${op.key}_equipment_designation`)],
          inputParameterIds: [...opFacts, id(`${op.key}_equipment_designation`), id(`${op.key}_equipment_h_per_unit`), id(`${op.key}_equipment_cost_basis`)] }),
      ];
    }),
  ];
}));
export const ROAD_CROSSING_SLEEVES_SHORING_CARGOS_R1 = Object.freeze(scopes.map(({ key, title, id, selected, facts }) => Object.freeze({
  key: `shoring_${key}_kits`, title: `${title}: полные исходные однородные комплекты со всеми предусмотренными частями`, quantityExpression: id("complete_kit_count"),
  selected, facts: Object.freeze(facts), designationId: id("kit_designation"),
})));
