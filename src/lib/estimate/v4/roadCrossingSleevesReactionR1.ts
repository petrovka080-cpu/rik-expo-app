import type { AutomaticInclusionCondition, AutomaticParameterSpec, AutomaticRowSpec } from "./automaticConstructionOwnerR1";
import { ROAD_CROSSING_SLEEVES_CIVIL_METHODS_R1 as methods } from "./roadCrossingSleevesCivilGeometryR1";

/** SAME AutomaticOwner resource graph: one actual complete temporary portable
 * reaction/backstop assembly for one selected drive, fully removed/returned.
 * PJA requires a drive-specific reaction arrangement; Tenbusch describes
 * portable backstops and actual steel shim/granular interfaces. No manufacturer
 * example, concrete volume, anchor/pile count or thrust capacity is a default.
 * https://www.pipejacking.org/about_pipe_jacking
 * https://tenbusch.com/underground_equipment/backstops.html */
export const ROAD_CROSSING_SLEEVES_REACTION_MODES_R1 = Object.freeze({
  portableRental: "Один полный временный переносной арендный упор для этого единственного продавливания, с фактическим полностью съёмным сопряжением и всеми деталями; весь комплект снят и возвращён",
  otherParty: "Все ресурсы реакционной конструкции обеспечены другой стороной без отдельной оплаты исполнителем; исключены из оплачиваемой проходки",
  other: "Бетонный/оставляемый упор, сваи, анкеры или заполнения с отдельными расходами, несколько/частичные упоры либо другая схема: отдельные реальные ресурсы",
});
export const ROAD_CROSSING_SLEEVES_REACTION_RENTAL_BASIS_R1 = "Только календарная аренда одного полного пригодного временного переносного упора со всеми фактически включёнными съёмными плитами/балками/распорками/крепежом/выравнивающими деталями/оснасткой; без домкратов, направляющих, гидравлики/энергии проходки, доставки/возврата, всех работ на объекте, расходников/отходов, отдельных оснований/свай/анкеров/бетона/заполнений";
export const ROAD_CROSSING_SLEEVES_REACTION_WORK_BASES_R1 = Object.freeze({
  crew: "Все исполнители только этой операции переносного упора, включая операторов/стропальщиков; без техники, энергии, аренды, материалов, разработки/засыпки, крепления котлована и работы домкратов/проходки",
  equipment: "Весь фактический совместимый комплект техники только этой операции упора с энергией, без всех исполнителей, календарной аренды упора, доставки, материалов, разработки/засыпки, крепления котлована и оборудования проходки",
});
export const roadCrossingSleevesReactionParameterId = (suffix: string) => `rcs_reaction_${suffix}`;
const id = roadCrossingSleevesReactionParameterId;
const METHOD = "rcs_civil_installation_method";
const applicable: AutomaticInclusionCondition = { kind: "equals", parameterId: METHOD, value: methods.pipeJacking };
const selected: AutomaticInclusionCondition = { kind: "and", operands: [applicable,
  { kind: "equals", parameterId: id("mode"), value: ROAD_CROSSING_SLEEVES_REACTION_MODES_R1.portableRental }] };
const members = [ ["reaction_panels", "реакционные плиты/стенки", 1], ["beams_braces", "полные балки/распорки", 0],
  ["removable_restraint_sets", "полные предусмотренные съёмные удерживающие узлы", 0], ["fastener_sets", "полные крепёжные узлы", 0],
  ["reusable_alignment_sets", "полные фактические пригодные съёмные выравнивающие детали/прокладки", 0],
  ["special_tackle", "вся предусмотренная специальная оснастка подъёма/установки/снятия", 0] ] as const;
const facts = [METHOD, id("mode"), id("allocation_reference"), id("program_and_design_reference"), id("kit_designation"), id("kit_product_reference"),
  ...members.map(([key]) => id(`kit_${key}_count`))];
const positionFacts = [...facts, "rcs_jacking_thrust_excavation_length_m", "rcs_jacking_thrust_excavation_width_m", "rcs_jacking_thrust_excavation_depth_m",
  "rcs_casing_outside_diameter_mm", "rcs_civil_jacking_advance_equipment_designation", id("configuration_and_force_reference"),
  ...["installed_required_length_m", "installed_required_width_m", "installed_required_height_m", "available_working_length_m", "available_working_width_m", "available_working_height_m",
    "required_full_reaction_kn", "admissible_full_reaction_kn"].map(id)];
const operations = [
  { key: "installation", title: "Полная сборка, выравнивание и установка одного исходного упора на объекте", quantity: "1", hourly: false },
  { key: "monitoring", title: "Отдельный контроль и обслуживание исходного упора за фактический календарный период, без второй работы домкратов/проходки", quantity: id("calendar_hours"), hourly: true },
  { key: "removal", title: "Полное снятие, разборка и подготовка исходного упора к возврату на объекте", quantity: "1", hourly: false },
] as const;
export const ROAD_CROSSING_SLEEVES_REACTION_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze((() => {
  const text = (suffix: string, title: string, when: AutomaticInclusionCondition = selected): AutomaticParameterSpec => ({ id: id(suffix), title,
    valueType: "text", unitId: null, kind: "conditional", requiredWhen: when });
  const number = (suffix: string, title: string, unitId: string, minimum = 0.000_001, integer = false): AutomaticParameterSpec => ({ id: id(suffix), title,
    valueType: integer ? "integer" : "decimal", unitId, min: minimum, kind: "conditional", requiredWhen: selected });
  return [
    { id: id("mode"), title: "Фактическая технология и граница реакционной конструкции продавливания", valueType: "enum", unitId: null,
      values: Object.values(ROAD_CROSSING_SLEEVES_REACTION_MODES_R1), kind: "conditional", requiredWhen: applicable } as AutomaticParameterSpec,
    text("allocation_reference", "Реакционная конструкция: полная фактическая граница всех сторон и стоимости; исключение этих ресурсов из оплачиваемых проходки/домкратов, крепления/разработки/засыпки котлована и других поставок", applicable),
    text("program_and_design_reference", "Фактические проект/условия грунта и сил/стадии/сопряжение/неподвижность/устойчивость/положение/приёмка упора для одного выбранного продавливания; полная программа всех исполнителей, техники, расходников/отходов и отдельно обеспеченных оснований; съёмный упор целиком возвращён, не постоянный занятый объём котлована"),
    text("kit_designation", "Фактический полный совместимый однородный переносной комплект реакционного упора"),
    text("kit_product_reference", "Полные паспорта/ведомость всех фактических деталей и их пригодности, совместимого полностью съёмного сопряжения и оснастки; не паспорт одного домкрата и не отдельная плита"),
    number("calendar_hours", "Фактический полный календарный срок аренды исходного упора с простоем, не машино-часы проходки", "hour"),
    ...members.map(([key, title, min]) => number(`kit_${key}_count`, `Исходный полный упор: ${title}, уже включены в аренду; явный ноль неприменимых деталей по полному источнику`, "piece", min, true)),
    { id: id("rental_cost_basis"), title: "Граница аренды исходного полного переносного упора", valueType: "enum", unitId: null,
      values: [ROAD_CROSSING_SLEEVES_REACTION_RENTAL_BASIS_R1], kind: "conditional", requiredWhen: selected } as AutomaticParameterSpec,
    text("configuration_and_force_reference", "Фактическая конфигурация всего установленного упора/сопряжения/грунта при максимальной расчётной реакции выбранного проходческого комплекта; полезное место после всех других частей и все рабочие габариты/зазоры; допустимая сила относится ко ВСЕЙ этой схеме, не только паспортная сила стали или домкрата"),
    ...[ ["installed_required_length_m", "Фактическая требуемая полезная длина установленного полного упора и всех рабочих перемещений/зазоров"],
      ["installed_required_width_m", "Фактическая требуемая полезная ширина установленного полного упора со всеми частями/рабочими зазорами"],
      ["installed_required_height_m", "Фактическая требуемая полезная высота всех установленных частей/работ; выбранный полный упор находится внутри котлована"],
      ["available_working_length_m", "Фактически подтверждённая полезная длина для этой схемы после остальных частей/ограничений, не наружная длина котлована"],
      ["available_working_width_m", "Фактически подтверждённая полезная ширина для этой схемы после остальных частей/ограничений, не наружная ширина котлована"],
      ["available_working_height_m", "Фактически подтверждённая полезная высота внутри котлована для этой схемы после остальных частей/ограничений" ] ]
      .map(([suffix, title]) => number(suffix, title, "m")),
    number("required_full_reaction_kn", "Фактическая максимальная расчётная реакция для ВСЕГО этого продавливания по применимому проекту с его фактическими коэффициентами/условиями, не длина и не паспортное усилие домкрата", "kn"),
    number("admissible_full_reaction_kn", "Фактическая допустимая реакция ВСЕЙ выбранной схемы упор–сопряжение–грунт в тех же условиях/основании по подтверждённому расчёту; не автоматически принятая прочность стали", "kn"),
    ...operations.flatMap(op => [
      text(`${op.key}_method_reference`, `${op.title}: полная фактическая отдельная операция/совместимость/исполнители/техника/приёмка; аренда, доставка, все материалы и остальные строительные операции исключены`),
      text(`${op.key}_crew_designation`, `${op.title}: все исполнители, включая операторов и стропальщиков`),
      number(`${op.key}_crew_h_per_unit`, `${op.title}: фактические суммарные человеко-часы ${op.hourly ? "всего упора за календарный час" : "за этот один полный исходный упор"}`, op.hourly ? "man_hour_per_hour" : "man_hour_per_piece"),
      { id: id(`${op.key}_crew_cost_basis`), title: `${op.title}: граница труда`, valueType: "enum", unitId: null,
        values: [ROAD_CROSSING_SLEEVES_REACTION_WORK_BASES_R1.crew], kind: "conditional", requiredWhen: selected } as AutomaticParameterSpec,
      text(`${op.key}_equipment_designation`, `${op.title}: весь совместимый комплект техники с энергией без исполнителей; отсутствие отдельной техники требует фактического источника и явного нуля`),
      number(`${op.key}_equipment_h_per_unit`, `${op.title}: фактические машино-часы ${op.hourly ? "всего упора за календарный час" : "за этот один полный исходный упор"}`, op.hourly ? "machine_hour_per_hour" : "machine_hour_per_piece", 0),
      { id: id(`${op.key}_equipment_cost_basis`), title: `${op.title}: граница техники`, valueType: "enum", unitId: null,
        values: [ROAD_CROSSING_SLEEVES_REACTION_WORK_BASES_R1.equipment], kind: "conditional", requiredWhen: selected } as AutomaticParameterSpec,
    ]),
  ];
})());
export const ROAD_CROSSING_SLEEVES_REACTION_ROWS_R1: readonly AutomaticRowSpec[] = Object.freeze((() => {
  const row = (suffix: string, title: string, expression: string, unitId: string, extra: Partial<AutomaticRowSpec> = {}): AutomaticRowSpec => ({
    rowId: `rcs:reaction:${suffix}`, formulaId: `rcs:reaction:${suffix}`, section: "Полный временный переносной реакционный упор", title, expression, unitId,
    category: "service", inclusion: selected, costTreatment: "INFORMATIONAL_SCOPE", inputParameterIds: facts, ...extra });
  const bounds = (unitId: string) => ({ schemaVersion: "canonical_formula_output_bounds_v1" as const, unitId, minimum: 0,
    reasonRu: "Весь выбранный упор должен помещаться в фактическое полезное пространство исходного котлована и обеспечивать фактическую расчётную реакцию всей схемы. Отрицательная разность не заменяется нулём или ручными часами. Это размерная/силовая проверка входных фактов, не автоматическая инженерная приёмка." });
  return [
    row("complete_kit_count", "Один исходный полный переносной упор для выбранного единственного продавливания", "1", "piece"),
    row("rental_set_hours", "Календарная аренда исходного полного упора со всеми включёнными деталями, без второй работы домкратов/проходки", id("calendar_hours"), "machine_hour", {
      category: "equipment", costTreatment: "OWN_COST", procurement: true, titleParameterIds: [id("kit_designation")], inputParameterIds: [...facts, id("calendar_hours"), id("rental_cost_basis")] }),
    ...members.map(([key, title]) => row(`included:${key}`, `${title} исходного полного упора, уже включены в аренду`, id(`kit_${key}_count`), "piece")),
    ...[ ["length_margin", `${id("available_working_length_m")}-${id("installed_required_length_m")}`, "m"],
      ["width_margin", `${id("available_working_width_m")}-${id("installed_required_width_m")}`, "m"],
      ["height_margin", `${id("available_working_height_m")}-${id("installed_required_height_m")}`, "m"],
      ["outer_length_margin", `rcs_jacking_thrust_excavation_length_m-${id("available_working_length_m")}`, "m"],
      ["outer_width_margin", `rcs_jacking_thrust_excavation_width_m-${id("available_working_width_m")}`, "m"],
      ["outer_height_margin", `rcs_jacking_thrust_excavation_depth_m-${id("available_working_height_m")}`, "m"],
      ["force_margin", `${id("admissible_full_reaction_kn")}-${id("required_full_reaction_kn")}`, "kn"] ]
      .map(([suffix, expression, unitId]) => row(suffix, "Разность исходных подтверждённых полезных/наружных размеров или реакции всей схемы, не инженерная приёмка", expression, unitId, {
        inputParameterIds: positionFacts, formulaOutputBounds: bounds(unitId) })),
    ...operations.flatMap(op => [
      row(`${op.key}:crew_hours`, `${op.title}: все исполнители`, `(${op.quantity})*${id(`${op.key}_crew_h_per_unit`)}`, "man_hour", {
        category: "labor", costTreatment: "OWN_COST", procurement: true, titleParameterIds: [id(`${op.key}_crew_designation`)],
        inputParameterIds: [...positionFacts, ...(op.hourly ? [id("calendar_hours")] : []), id(`${op.key}_method_reference`), id(`${op.key}_crew_designation`), id(`${op.key}_crew_h_per_unit`), id(`${op.key}_crew_cost_basis`)] }),
      row(`${op.key}:equipment_hours`, `${op.title}: совместимая техника с энергией без исполнителей`, `(${op.quantity})*${id(`${op.key}_equipment_h_per_unit`)}`, "machine_hour", {
        category: "equipment", costTreatment: "OWN_COST", procurement: true, titleParameterIds: [id(`${op.key}_equipment_designation`)],
        inputParameterIds: [...positionFacts, ...(op.hourly ? [id("calendar_hours")] : []), id(`${op.key}_method_reference`), id(`${op.key}_equipment_designation`), id(`${op.key}_equipment_h_per_unit`), id(`${op.key}_equipment_cost_basis`)] }),
    ]),
  ];
})());
export const ROAD_CROSSING_SLEEVES_REACTION_CARGO_R1 = Object.freeze({ key: "reaction_kit", title: "Один исходный полный переносной реакционный упор со всеми съёмными деталями",
  quantityExpression: "1", selected, facts: Object.freeze(facts), designationId: id("kit_designation") });
