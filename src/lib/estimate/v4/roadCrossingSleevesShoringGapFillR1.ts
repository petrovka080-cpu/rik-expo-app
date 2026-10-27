import type { AutomaticInclusionCondition, AutomaticParameterSpec, AutomaticRowSpec } from "./automaticConstructionOwnerR1";
import { ROAD_CROSSING_SLEEVES_SHORING_CARGOS_R1, roadCrossingSleevesShoringParameterId as shoringId } from "./roadCrossingSleevesShoringR1";

/** SAME AutomaticOwner. Only ONE closed four-sided full-depth rectangular
 * contact box in ONE rectangular pit/position, no outside protrusions, other
 * annular occupants, unfilled portions or reuse/relocation. All homogeneous
 * granular gap fill remains permanently preplaced and is already excluded in
 * the ORIGINAL permanent occupied volume used by final return fill.
 * SBH requires actual ground contact/gap fill and removal coordinated with
 * backfill; no maker example dimensions/rates/soil/legal approval are inferred.
 * https://sbh-verbau.de/fileadmin/Webseite/mehrwert/Downloads/EN/Anleitungen_EN/600-manhole-2015.pdf */
export const ROAD_CROSSING_SLEEVES_SHORING_GAP_MODES_R1 = Object.freeze({
  retainedRectangular: "Один полный замкнутый четырёхстенный прямоугольный контактный комплект на всю глубину одного прямоугольного котлована, одно положение: весь наружный зазор заполнен одним зернистым материалом и постоянно остаётся в окончательной засыпке; без выступов/других занятых мест/неполного заполнения/перестановок/повторного использования",
  notRequired: "Отсутствие отдельного заполнения/герметизации зазоров подтверждено фактическим контактом всех стенок и применимым проектом/технологией; не принято по умолчанию",
  other: "Другая форма/траншея/частичный контакт, несколько комплектов/положений, герметизация, удаление/перенос/повторное использование или иной материал: отдельная фактическая схема ресурсов",
});
export const ROAD_CROSSING_SLEEVES_SHORING_GAP_SUPPLY_MODES_R1 = Object.freeze({
  separate: "Отдельно закупаемый совместимый материал только этого заполнения, с исключительно выделенным пригодным исходным запасом",
  otherParty: "Весь фактический материал этого заполнения обеспечивает другая сторона без отдельной закупки исполнителем",
});
export const ROAD_CROSSING_SLEEVES_SHORING_GAP_WORK_MODES_R1 = Object.freeze({
  separate: "Все работы заполнения/увлажнения/уплотнения отдельно и полностью исключены из установки крепления, разработки и окончательной обратной засыпки",
  otherParty: "Все работы заполнения/увлажнения/уплотнения обеспечивает другая сторона без оплаты исполнителем и без повторения в установке крепления/разработке/окончательной засыпке",
});
export const ROAD_CROSSING_SLEEVES_SHORING_GAP_BASES_R1 = Object.freeze({
  material: "Только новый отдельный заказ совместимого материала этого заполнения в подтверждённом состоянии; без исходного запаса, повторного заполнения, труда/техники, аренды, воды другого владельца, доставки и отходов",
  crew: "Все исполнители только укладки/увлажнения/уплотнения наружного заполнения, включая операторов; без техники/энергии, материалов, установки/извлечения крепления, разработки, окончательной засыпки и других работ",
  equipment: "Весь совместимый комплект только укладки/увлажнения/уплотнения наружного заполнения с энергией, без всех исполнителей, материалов, крепления/его установки/извлечения, разработки, окончательной засыпки и доставки",
});
export const roadCrossingSleevesShoringGapParameterId = (key: string, suffix: string) => `rcs_shoring_gap_${key}_${suffix}`;
const groups = (["thrust", "reception"] as const).map(key => {
  const cargo = ROAD_CROSSING_SLEEVES_SHORING_CARGOS_R1.find(c => c.key === `shoring_${key}_kits`);
  if (!cargo) throw new Error(`RCS_ACTUAL_PIT_SHORING_MISSING:${key}`);
  const id = (suffix: string) => roadCrossingSleevesShoringGapParameterId(key, suffix);
  const pit = (suffix: string) => `rcs_jacking_${key}_${suffix}`;
  const selected: AutomaticInclusionCondition = { kind: "and", operands: [cargo.selected,
    { kind: "equals", parameterId: id("mode"), value: ROAD_CROSSING_SLEEVES_SHORING_GAP_MODES_R1.retainedRectangular }] };
  const volume = `(${pit("excavation_length_m")}*${pit("excavation_width_m")}-${shoringId(key, "installed_outer_length_m")}*${shoringId(key, "installed_outer_width_m")})*${pit("excavation_depth_m")}`;
  const positive: AutomaticInclusionCondition = { kind: "and", operands: [selected,
    { kind: "formula_greater_than", expression: volume, unitId: "m3", value: 0 }] };
  const facts = [...cargo.facts, id("mode"), id("program_and_allocation_reference"), id("rectangular_contact_reference"),
    shoringId(key, "placement_cycle_count"), shoringId(key, "geometry_and_load_reference"),
    pit("excavation_length_m"), pit("excavation_width_m"), pit("excavation_depth_m"),
    shoringId(key, "installed_outer_length_m"), shoringId(key, "installed_outer_width_m")];
  const water = `(${volume})*${id("water_gross_l_per_finished_m3")}/1000`;
  const waterPositive: AutomaticInclusionCondition = { kind: "and", operands: [positive,
    { kind: "greater_than", parameterId: id("water_gross_l_per_finished_m3"), value: 0 }] };
  const materials = [
    { key: "granular", title: "совместимый зернистый материал в рыхлом поставочном состоянии", consumed: `(${volume})*${id("granular_gross_loose_per_finished_m3")}`, positive },
    { key: "water", title: "совместимая отдельно выделенная вода фактического увлажнения", consumed: water, positive: waterPositive },
  ].map(material => {
    const own: AutomaticInclusionCondition = { kind: "and", operands: [material.positive,
      { kind: "equals", parameterId: id(`${material.key}_supply_mode`), value: ROAD_CROSSING_SLEEVES_SHORING_GAP_SUPPLY_MODES_R1.separate }] };
    const need = `max(0,(${material.consumed})+${id(`${material.key}_retained_reserve_m3`)}-${id(`${material.key}_compatible_stock_m3`)})`;
    const multiples = `ceil((${need})/${id(`${material.key}_supplier_multiple_m3`)})`, ordered = `(${multiples})*${id(`${material.key}_supplier_multiple_m3`)}`;
    const remaining = `${id(`${material.key}_compatible_stock_m3`)}+(${ordered})-(${material.consumed})`;
    const materialFacts = [...facts, id(`${material.key}_supply_mode`), id(`${material.key}_product_designation`), id(`${material.key}_compatibility_reference`),
      id(material.key === "granular" ? "granular_gross_loose_per_finished_m3" : "water_gross_l_per_finished_m3")];
    const purchaseFacts = [...materialFacts, id(`${material.key}_compatible_stock_m3`), id(`${material.key}_retained_reserve_m3`), id(`${material.key}_supplier_multiple_m3`), id(`${material.key}_cost_basis`)];
    return { ...material, own, need, multiples, ordered, remaining, materialFacts, purchaseFacts };
  });
  const work: AutomaticInclusionCondition = { kind: "and", operands: [positive,
    { kind: "equals", parameterId: id("work_mode"), value: ROAD_CROSSING_SLEEVES_SHORING_GAP_WORK_MODES_R1.separate }] };
  return { key, title: cargo.title, cargo, id, pit, selected, volume, positive, facts, materials, work };
});
export const ROAD_CROSSING_SLEEVES_SHORING_GAP_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze(groups.flatMap(({ title, cargo, id, selected, positive, materials, work }) => {
  const text = (suffix: string, caption: string, when: AutomaticInclusionCondition = positive): AutomaticParameterSpec => ({ id: id(suffix), title: `${title}: ${caption}`,
    valueType: "text", unitId: null, kind: "conditional", requiredWhen: when });
  const number = (suffix: string, caption: string, unitId: string, min: number, when: AutomaticInclusionCondition = positive): AutomaticParameterSpec => ({ id: id(suffix),
    title: `${title}: ${caption}`, valueType: "decimal", unitId, min, kind: "conditional", requiredWhen: when });
  return [
    { id: id("mode"), title: `${title}: фактическая технология наружного заполнения/контакта`, valueType: "enum", unitId: null,
      values: Object.values(ROAD_CROSSING_SLEEVES_SHORING_GAP_MODES_R1), kind: "conditional", requiredWhen: cargo.selected } as AutomaticParameterSpec,
    text("program_and_allocation_reference", "полная фактическая граница заполнения/контакта/герметизации всех сторон и ресурсов; работы исключены из установки крепления/разработки/окончательной засыпки; постоянно предварительно заполненный зазор уже включён ОДИН РАЗ в исходный постоянный занятый объём этого котлована, не повторное потребление/укладка/вода и не выделенное повторное использование грунта", cargo.selected),
    text("rectangular_contact_reference", "полный исходный проект/система/контакт всех ЧЕТЫРЁХ стенок: существующие наружные длина/ширина комплекта являются ровно фактическим прямоугольным контактом, без выступов/других занятых объёмов/неполного заполнения; полный зазор на ВСЮ глубину однороден, один комплект/одно положение, материал всё время остаётся в окончательной засыпке; основание и другие конструкции отдельно", selected),
    number("granular_gross_loose_per_finished_m3", "фактический валовой рыхлый поставочный объём на 1 м³ этого готового постоянного наружного заполнения, включая ВСЕ потери/увлажнение/уплотнение; без переносимого/повторно используемого заполнения", "ratio", 0.000_001),
    number("water_gross_l_per_finished_m3", "фактическое дополнительное валовое увлажнение на 1 м³ ЭТОГО готового наружного заполнения; явный ноль подтверждает отсутствие добавляемой воды, не скрытый коэффициент влажности", "l_per_m3", 0),
    ...materials.flatMap(material => [
      { id: id(`${material.key}_supply_mode`), title: `${title}: ${material.title}: фактическое обеспечение`, valueType: "enum", unitId: null,
        values: Object.values(ROAD_CROSSING_SLEEVES_SHORING_GAP_SUPPLY_MODES_R1), kind: "conditional", requiredWhen: material.positive } as AutomaticParameterSpec,
      text(`${material.key}_product_designation`, `${material.title}: фактический совместимый продукт/состояние`, material.positive),
      text(`${material.key}_compatibility_reference`, `${material.title}: реальные качество/состояние/применимость/полные потери/распределение, запас исключительно ДО этой работы; нет второго счёта за грунт/повторное заполнение/другую воду`, material.positive),
      ...[ ["compatible_stock_m3", "исключительно выделенный пригодный исходный запас в том же состоянии, без уже использованного/ожидаемого возврата", 0],
        ["retained_reserve_m3", "сохраняемый пригодный резерв в том же состоянии", 0], ["supplier_multiple_m3", "фактическая кратность нового заказа в том же состоянии, не автоматически неделимая тара или рейсы", 0.000_001] ]
        .map(([suffix, caption, min]) => number(`${material.key}_${suffix}`, `${material.title}: ${caption}`, "m3", Number(min), material.own)),
      { id: id(`${material.key}_cost_basis`), title: `${title}: ${material.title}: граница нового отдельного заказа`, valueType: "enum", unitId: null,
        values: [ROAD_CROSSING_SLEEVES_SHORING_GAP_BASES_R1.material], kind: "conditional", requiredWhen: material.own } as AutomaticParameterSpec,
    ]),
    { id: id("work_mode"), title: `${title}: фактическая полная граница работ наружного заполнения`, valueType: "enum", unitId: null,
      values: Object.values(ROAD_CROSSING_SLEEVES_SHORING_GAP_WORK_MODES_R1), kind: "conditional", requiredWhen: positive } as AutomaticParameterSpec,
    text("work_method_reference", "вся фактическая укладка/увлажнение/уплотнение зазора и её технология/исполнители/совместимое оборудование/приёмка; установка и извлечение крепления/разработка/окончательная засыпка исключены, материалы/доставка отдельно", positive),
    ...(["crew", "equipment"] as const).flatMap(owner => [
      text(`${owner}_designation`, `весь фактический ${owner === "crew" ? "труд, включая операторов" : "совместимый комплект техники с энергией без исполнителей"} только наружного заполнения`, work),
      number(`${owner}_h_per_finished_m3`, `фактические ${owner === "crew" ? "суммарные человеко-часы" : "машино-часы"} только укладки/увлажнения/уплотнения на 1 м³ готового наружного заполнения`, `${owner === "crew" ? "man" : "machine"}_hour_per_m3`, owner === "crew" ? 0.000_001 : 0, work),
      { id: id(`${owner}_cost_basis`), title: `${title}: граница ${owner === "crew" ? "труда" : "техники"} заполнения`, valueType: "enum", unitId: null,
        values: [ROAD_CROSSING_SLEEVES_SHORING_GAP_BASES_R1[owner]], kind: "conditional", requiredWhen: work } as AutomaticParameterSpec,
    ]),
  ];
}));
export const ROAD_CROSSING_SLEEVES_SHORING_GAP_ROWS_R1: readonly AutomaticRowSpec[] = Object.freeze(groups.flatMap(({ key, title, id, pit, selected, volume, facts, materials, work }) => {
  const bounds = (unitId: string) => ({ schemaVersion: "canonical_formula_output_bounds_v1" as const, unitId, minimum: 0,
    reasonRu: "Поддерживается только один подтверждённый замкнутый прямоугольный контактный комплект в одном положении. Исходное наружное заполнение помещается в разработку и ОДИН РАЗ включено в исходный постоянный занятый объём перед окончательной засыпкой. Несовместимость не заменяется нулём или ручной закупкой/засыпкой." });
  const row = (suffix: string, caption: string, expression: string, unitId: string, extra: Partial<AutomaticRowSpec> = {}): AutomaticRowSpec => ({
    rowId: `rcs:shoring-gap:${key}:${suffix}`, formulaId: `rcs:shoring-gap:${key}:${suffix}`, section: `${title}: постоянное предварительное заполнение зазора`, title: caption,
    category: "service", expression, unitId, inclusion: selected, costTreatment: "INFORMATIONAL_SCOPE", inputParameterIds: facts, ...extra });
  return [
    row("one_kit_margin", "Проверка ровно одного исходного полного контактного комплекта для этой схемы", `1-${shoringId(key, "complete_kit_count")}`, "piece", { formulaOutputBounds: bounds("piece") }),
    row("one_position_margin", "Проверка ровно одного исходного положения без переноса/повторного заполнения", `1-${shoringId(key, "placement_cycle_count")}`, "piece", { formulaOutputBounds: bounds("piece") }),
    row("permanently_preplaced_finished_m3", "Готовый постоянный объём наружного зазора по исходной разработке и подтверждённому полному прямоугольному контакту; не ещё один вопрос размера", volume, "m3", { formulaOutputBounds: bounds("m3") }),
    row("already_allocated_permanent_volume_margin_m3", "Прочая часть исходного постоянного занятого объёма ПОСЛЕ однократного выделения этого наружного заполнения; не повторная засыпка", `${pit("permanent_occupied_volume_m3")}-(${volume})`, "m3", {
      inputParameterIds: [...facts, pit("permanent_occupied_volume_m3")], formulaOutputBounds: bounds("m3") }),
    ...materials.flatMap(material => [
      row(`${material.key}:consumed_m3`, `${material.title}: валовое потребление именно этого готового наружного заполнения`, material.consumed, "m3", {
        inclusion: material.positive, inputParameterIds: material.materialFacts }),
      ...[ ["need_before_multiple_m3", "дефицит до новой поставочной кратности", material.need], ["supplier_multiple_count", "новые поставочные кратности", material.multiples],
        ["ordered_m3", "новый отдельный заказ", material.ordered], ["remaining_unused_m3", "пригодный неиспользованный остаток с резервом", material.remaining],
        ["free_unused_beyond_reserve_m3", "свободный пригодный неиспользованный остаток сверх резерва", `(${material.remaining})-${id(`${material.key}_retained_reserve_m3`)}`] ]
        .map(([suffix, caption, expression]) => row(`${material.key}:${suffix}`, `${material.title}: ${caption}`, expression, suffix === "supplier_multiple_count" ? "package" : "m3", {
          inclusion: material.own, inputParameterIds: material.purchaseFacts, ...(suffix === "ordered_m3" ? { category: "material", costTreatment: "OWN_COST", procurement: true,
            titleParameterIds: [id(`${material.key}_product_designation`)] } : {}) })),
    ]),
    ...(["crew", "equipment"] as const).map(owner => row(`${owner}_hours`, `Только отдельные укладка/увлажнение/уплотнение наружного заполнения: ${owner === "crew" ? "все исполнители" : "вся совместимая техника с энергией без исполнителей"}`, `(${volume})*${id(`${owner}_h_per_finished_m3`)}`, owner === "crew" ? "man_hour" : "machine_hour", {
      category: owner === "crew" ? "labor" : "equipment", inclusion: work, costTreatment: "OWN_COST", procurement: true, titleParameterIds: [id(`${owner}_designation`)],
      inputParameterIds: [...facts, id("work_mode"), id("work_method_reference"), id(`${owner}_designation`), id(`${owner}_h_per_finished_m3`), id(`${owner}_cost_basis`)] })),
  ];
}));
export const ROAD_CROSSING_SLEEVES_SHORING_GAP_CARGOS_R1 = Object.freeze(groups.flatMap(({ key, title, id }) => ["granular", "water"].map(material => Object.freeze({
  key: `shoring_gap_${key}_${material}`, title: `${title}: ${material === "granular" ? "рыхлый материал постоянного наружного заполнения" : "вода его отдельного увлажнения"}`,
  rowId: `rcs:shoring-gap:${key}:${material}:ordered_m3`, stockId: id(`${material}_compatible_stock_m3`), unit: "m3" as const,
}))));
