import type { AutomaticInclusionCondition, AutomaticParameterSpec, AutomaticRowSpec } from "./automaticConstructionOwnerR1";

/** A source-bound resource component for the existing common compiler.
 * Eaton IOM017 Rev15 separates the housing, its accessories, bags and service;
 * bag replacement depends on actual condition/differential pressure, not a
 * universal m3-per-bag norm. No example rating, rule or approval is installed.
 * https://www.eaton.com/content/dam/eaton/products/filtration-solutions/filter-systems-and-strainers/filters-and-strainers/bag-filter-housing/documents/installation-and-operation-manuals/eaton-installation-operation-maintenance-manual-bag-filter-housing-us.pdf */
export const ROAD_CROSSING_SLEEVES_WATER_TREATMENT_MODES_R1 = Object.freeze({
  singleBag: "Один общий полный арендованный пассивный корпус с одним сменным мешком для всего однородного однопроходного потока одновременно работающих насосов; без рециркуляции и иной обработки",
  otherParty: "Вся требуемая обработка воды и её ресурсы обеспечены другой стороной без отдельной оплаты исполнителем",
  notRequired: "Отсутствие обработки воды подтверждено фактическими качеством воды, получателем и проектной схемой",
  other: "Несколько корпусов/мешков, разнородная вода, рециркуляция, реагенты или иная обработка: отдельная программа ресурсов",
});
export const ROAD_CROSSING_SLEEVES_WATER_TREATMENT_RENTAL_BASIS_R1 = "Календарное наличие одного полного пассивного фильтровального комплекта с фактическими корпусом/корзиной/рукавами/соединениями/опорами/клапанами/измерением/защитой и отдельно видимыми включёнными сервисными расходниками; подготовка перед выдачей и очистка после возврата включены, без сменных мешков, всех работ на объекте, подъёмной техники, насосной энергии, доставки/возврата и отходов";
export const ROAD_CROSSING_SLEEVES_WATER_TREATMENT_BAG_BASIS_R1 = "Только новый заказ целых совместимых сменных мешков в фактических полных поставочных упаковках с отдельным пригодным наличием/резервом/фактической негодностью; без аренды, труда, энергии, доставки и обращения с отходами";
export const roadCrossingSleevesWaterTreatmentParameterId = (suffix: string): string => `rcs_water_treatment_${suffix}`;
type PumpContext = Readonly<{
  selected: AutomaticInclusionCondition; facts: readonly string[]; calendarHoursId: string; volumeExpression: string;
  workingSetCountId: string; flowId: string; headId: string; dischargeId: string; originalVolumeParameterIds: readonly string[];
  crewCostBasis: string; equipmentCostBasis: string;
}>;
export function buildRoadCrossingSleevesWaterTreatmentResourcesR1(pump: PumpContext): Readonly<{
  parameters: readonly AutomaticParameterSpec[]; rows: readonly AutomaticRowSpec[];
}> {
  const id = roadCrossingSleevesWaterTreatmentParameterId;
  const selected: AutomaticInclusionCondition = { kind: "and", operands: [pump.selected,
    { kind: "equals", parameterId: id("mode"), value: ROAD_CROSSING_SLEEVES_WATER_TREATMENT_MODES_R1.singleBag }] };
  const positive: AutomaticInclusionCondition = { kind: "and", operands: [selected,
    { kind: "formula_greater_than", expression: pump.volumeExpression, unitId: "m3", value: 0 }] };
  const facts = [...pump.facts, id("mode"), id("program_reference"), id("allocation_reference"), id("kit_designation"), id("kit_product_reference"),
    pump.headId, pump.dischargeId];
  const volumeFacts = [...facts, ...pump.originalVolumeParameterIds, id("bag_effective_capacity_m3")];
  const used = `ceil((${pump.volumeExpression})/${id("bag_effective_capacity_m3")})`;
  const consumed = `(${used})+${id("bag_actual_preinstall_unusable_count")}`;
  const need = `max(0,(${consumed})+${id("bag_retained_reserve_count")}-${id("bag_compatible_stock_count")})`;
  const packs = `ceil((${need})/${id("bag_supplier_pack_count")})`, ordered = `(${packs})*${id("bag_supplier_pack_count")}`;
  const remaining = `${id("bag_compatible_stock_count")}+(${ordered})-(${consumed})`;
  // Every amount is the complete actual programme/BOM, not a guessed per-hour
  // consumption. Lease owns these items once; they are not new paid purchases.
  const kitMembers = [
    ["interconnecting_hose_m", "Фактические дополнительные межсоединительные рукава фильтра без повторных насосных рукавов", "m"],
    ["coupling_count", "Фактические полные дополнительные соединения фильтра", "piece"],
    ["valve_node_count", "Фактические клапанные/запорные/дренажные/воздушные и защитные узлы фильтра", "piece"],
    ["pressure_device_count", "Фактические совместимые средства контроля давления/перепада", "piece"],
    ["service_gasket_count", "Фактические полные включённые сервисные уплотнения на всю программу", "piece"],
    ["service_cleaner_l", "Фактическая включённая совместимая сервисная очищающая жидкость на всю программу", "l"],
    ["service_lubricant_kg", "Фактическая включённая совместимая сервисная смазка на всю программу", "kg"],
    ["service_wipe_count", "Фактические включённые одноразовые сервисные салфетки на всю программу", "piece"],
  ] as const;
  const works = [
    { key: "setup", title: "Установка и подключение одного полного фильтровального комплекта", expression: "1", inclusion: selected, rateUnit: "piece" },
    { key: "removal", title: "Отключение, дренирование и снятие одного полного фильтровального комплекта", expression: "1", inclusion: selected, rateUnit: "piece" },
    { key: "bag_cycle", title: "Все первоначальные установки и замены мешков с окончательным снятием, разгерметизацией/дренированием и контролем один раз", expression: used, inclusion: positive, rateUnit: "piece" },
    { key: "monitoring", title: "Отдельный контроль всей фильтрации за календарный период без повторных операторов насосов и смен мешков", expression: pump.calendarHoursId, inclusion: selected, rateUnit: "hour" },
  ] as const;
  const parameters: AutomaticParameterSpec[] = [
    { id: id("mode"), title: "Подтверждённая технология и граница обработки откачанной воды", valueType: "enum", unitId: null,
      values: Object.values(ROAD_CROSSING_SLEEVES_WATER_TREATMENT_MODES_R1), kind: "conditional", requiredWhen: pump.selected },
    { id: id("program_reference"), title: "Фактическая программа требуемой обработки/её отсутствия: качество/состав воды, получатель, однопроходный общий поток, допустимый перепад/давление и результаты контроля; не автоматическая приёмка очистки",
      valueType: "text", unitId: null, kind: "conditional", requiredWhen: pump.selected },
    ...[ ["allocation_reference", "Фактическое исключительное распределение одного общего фильтра на всю группу/период и всех ресурсов; нет повторных насосных рукавов/операторов или другой очистки"],
      ["kit_designation", "Фактический полный пассивный арендованный комплект с одним корпусом/одним мешком и всеми подключениями/опорами/корзиной/контролем/защитой"],
      ["kit_product_reference", "Полная фактическая ведомость состава/аренды/включённых сервисных материалов и паспорта всех частей; совместимость воды/давления/потока/условий, потери фильтра уже учтены в полном напоре насосов, без дополнительной энергии и неучтённых жидкостей на объекте"],
    ].map(([suffix, title]): AutomaticParameterSpec => ({ id: id(suffix), title, valueType: "text", unitId: null, kind: "conditional", requiredWhen: selected })),
    ...[ ["confirmed_max_flow_m3_h", "Подтверждённая допустимая подача выбранного полного фильтра при фактических воде/мешке/условиях/перепаде; не теоретический максимум по чистой воде", "m3_per_hour", 0.000_001],
      ["actual_max_housing_pressure_bar", "Фактическое максимальное давление в корпусе с переходными режимами по схеме; не выводится только из геометрического напора", "bar", 0],
      ["rated_max_housing_pressure_bar", "Подтверждённое допустимое давление выбранного полного комплекта при фактических воде/температуре/условиях по паспортам", "bar", 0.000_001],
    ].map(([suffix, title, unit, min]): AutomaticParameterSpec => ({ id: id(String(suffix)), title: String(title), valueType: "decimal", unitId: String(unit), min: Number(min), kind: "conditional", requiredWhen: selected })),
    ...kitMembers.map(([key, title, unit]): AutomaticParameterSpec => ({ id: id(`kit_${key}`), title: `${title}; фактическое количество в полной ведомости, отсутствие — явный 0`,
      valueType: unit === "piece" ? "integer" : "decimal", unitId: unit, min: key === "pressure_device_count" ? 1 : 0, kind: "conditional", requiredWhen: selected })),
    { id: id("rental_cost_basis"), title: "Граница аренды полного фильтра и фактически включённых сервисных ресурсов", valueType: "enum", unitId: null,
      values: [ROAD_CROSSING_SLEEVES_WATER_TREATMENT_RENTAL_BASIS_R1], kind: "conditional", requiredWhen: selected },
    ...[ ["bag_product_designation", "Фактический целый совместимый одноразовый сменный мешок для выбранного корпуса/корзины/воды"],
      ["bag_product_reference", "Фактический паспорт мешка/уплотнения и подтверждение пригодности наличия, качества/температуры/перепада/состояния и эффективного ресурса при всей однородной воде; не произвольная норма м³ на мешок"] ]
      .map(([suffix, title]): AutomaticParameterSpec => ({ id: id(suffix), title, valueType: "text", unitId: null, kind: "conditional", requiredWhen: positive })),
    { id: id("bag_effective_capacity_m3"), title: "Фактически подтверждённый эффективный объём всей этой однородной воды на один целый мешок до обязательной замены по состоянию/перепаду; весь поток через один мешок, без рециркуляции",
      valueType: "decimal", unitId: "m3_per_piece", min: 0.000_001, kind: "conditional", requiredWhen: positive },
    ...[ ["bag_actual_preinstall_unusable_count", "Фактически негодные мешки в ходе этой работы до установки; не прогноз отказов и не второе фильтрование", 0],
      ["bag_compatible_stock_count", "Пригодные целые исключительно выделенные мешки до этой работы/негодности; использованные мокрые мешки сюда не возвращаются", 0],
      ["bag_retained_reserve_count", "Сохраняемый пригодный резерв целых мешков", 0], ["bag_supplier_pack_count", "Фактические целые мешки в полной новой поставочной упаковке", 1] ]
      .map(([suffix, title, min]): AutomaticParameterSpec => ({ id: id(String(suffix)), title: String(title), valueType: "integer", unitId: "piece", min: Number(min), kind: "conditional", requiredWhen: positive })),
    { id: id("bag_cost_basis"), title: "Отдельная граница нового заказа сменных мешков", valueType: "enum", unitId: null,
      values: [ROAD_CROSSING_SLEEVES_WATER_TREATMENT_BAG_BASIS_R1], kind: "conditional", requiredWhen: positive },
    ...works.flatMap(work => [
      { id: id(`${work.key}_method_reference`), title: `${work.title}: фактическая полная процедура и исключительная граница всех ресурсов; у мешков фактическая средневзвешенная полная программа включает первую установку и окончательное снятие, мокрые мешки не пригодный остаток`,
        valueType: "text", unitId: null, kind: "conditional", requiredWhen: work.inclusion } as AutomaticParameterSpec,
      ...(["crew", "equipment"] as const).flatMap(owner => [
        { id: id(`${work.key}_${owner}_designation`), title: `${work.title}: ${owner === "crew" ? "все исполнители, включая операторов" : "вся отдельная совместимая техника с энергией; пассивные части комплекта оплачены в аренде"}`,
          valueType: "text", unitId: null, kind: "conditional", requiredWhen: work.inclusion } as AutomaticParameterSpec,
        { id: id(`${work.key}_${owner}_h_per_unit`), title: `${work.title}: фактические полные ${owner === "crew" ? "человеко-часы" : "машино-часы"} на ${work.rateUnit === "hour" ? "календарный час всей группы" : work.key === "bag_cycle" ? "каждый использованный мешок" : "один общий комплект"}; отсутствие — явный 0`,
          valueType: "decimal", unitId: `${owner === "crew" ? "man" : "machine"}_hour_per_${work.rateUnit}`, min: 0, kind: "conditional", requiredWhen: work.inclusion } as AutomaticParameterSpec,
        { id: id(`${work.key}_${owner}_cost_basis`), title: `${work.title}: отдельная граница ${owner === "crew" ? "труда" : "техники"}`,
          valueType: "enum", unitId: null, values: [owner === "crew" ? pump.crewCostBasis : pump.equipmentCostBasis], kind: "conditional", requiredWhen: work.inclusion } as AutomaticParameterSpec,
      ]),
    ]),
  ];
  const row = (key: string, title: string, expression: string, unitId: string, extra: Partial<AutomaticRowSpec> = {}): AutomaticRowSpec => ({
    rowId: `rcs:water-treatment:${key}`, formulaId: `rcs:water-treatment:${key}`, section: "Фильтрация откачанной воды", category: "equipment",
    title, expression, unitId, inclusion: selected, costTreatment: "INFORMATIONAL_SCOPE", inputParameterIds: facts, ...extra,
  });
  const rows: AutomaticRowSpec[] = [
    row("deployed_kit_count", "Один общий полный пассивный фильтровальный комплект; резервные насосы не добавляют корпуса", "1", "piece"),
    row("filtered_water_m3", "Вся исходная откачанная вода через один общий мешок один раз; не объём закупки и не приёмка качества", pump.volumeExpression, "m3"),
    row("flow_capacity_margin_m3_h", "Допустимая подача полного фильтра сверх подачи всех одновременно работающих насосов; средняя доля работы не уменьшает мгновенный поток",
      `${id("confirmed_max_flow_m3_h")}-${pump.workingSetCountId}*${pump.flowId}`, "m3_per_hour", {
        formulaOutputBounds: { schemaVersion: "canonical_formula_output_bounds_v1", unitId: "m3_per_hour", minimum: 0,
          reasonRu: "Один общий фильтр должен пропускать весь фактический одновременный поток; резерв и средняя доля времени не уменьшают этот контроль, ручной заказ мешков не исправляет несовместимость." } }),
    row("pressure_margin_bar", "Допустимое давление полного фильтра сверх фактического максимума этой схемы", `${id("rated_max_housing_pressure_bar")}-${id("actual_max_housing_pressure_bar")}`, "bar", {
      formulaOutputBounds: { schemaVersion: "canonical_formula_output_bounds_v1", unitId: "bar", minimum: 0,
        reasonRu: "Подтверждённое допустимое давление полного фильтра должно покрывать фактический максимум со всеми режимами; ручная аренда не исправляет несовместимость." } }),
    ...kitMembers.map(([key, title, unit]) => row(`kit:${key}`, `${title}; включено в аренду один раз, не отдельная закупка`, id(`kit_${key}`), unit)),
    row("rental_set_hours", "Календарная аренда одного полного фильтра со всем фактическим составом и включёнными сервисными расходниками", pump.calendarHoursId, "set_hour", {
      costTreatment: "OWN_COST", procurement: true, titleParameterIds: [id("kit_designation")],
      inputParameterIds: [...facts, pump.calendarHoursId, pump.workingSetCountId, pump.flowId, id("confirmed_max_flow_m3_h"), id("actual_max_housing_pressure_bar"), id("rated_max_housing_pressure_bar"),
        id("rental_cost_basis"), ...kitMembers.map(([key]) => id(`kit_${key}`))] }),
    ...([ ["used_count", "Целые мешки, фактически используемые для всей исходной воды, включая последнюю неполностью выработанную единицу", used, "piece"],
      ["wet_used_count", "Использованные мокрые мешки после окончательного снятия; не пригодный складской остаток", used, "piece"],
      ["consumed_count", "Полное расходование мешков: использованные и фактическая негодность до установки", consumed, "piece"],
      ["new_need_count", "Дополнительные целые мешки после пригодного наличия с сохраняемым резервом", need, "piece"],
      ["supplier_pack_count", "Полные новые поставочные упаковки мешков", packs, "package"], ["ordered_count", "Новый отдельный заказ целых мешков", ordered, "piece"],
      ["remaining_count", "Пригодные неиспользованные целые мешки с резервом", remaining, "piece"],
      ["free_beyond_reserve_count", "Свободные пригодные целые мешки сверх резерва", `(${remaining})-${id("bag_retained_reserve_count")}`, "piece"] ] as const)
      .map(([key, title, expression, unit]) => row(`bags:${key}`, title, expression, unit, { category: "material", inclusion: positive,
        costTreatment: key === "ordered_count" ? "OWN_COST" : "INFORMATIONAL_SCOPE", procurement: key === "ordered_count",
        inputParameterIds: [...volumeFacts, id("bag_product_designation"), id("bag_product_reference"), ...(key === "ordered_count" ? [id("bag_cost_basis")] : [])],
        ...(key === "ordered_count" ? { titleParameterIds: [id("bag_product_designation")] } : {}) })),
    ...works.flatMap(work => (["crew", "equipment"] as const).map(owner => row(`${work.key}:${owner}_hours`, `${work.title}: ${owner === "crew" ? "все исполнители" : "вся отдельная совместимая техника с энергией"}`,
      `(${work.expression})*${id(`${work.key}_${owner}_h_per_unit`)}`, owner === "crew" ? "man_hour" : "machine_hour", {
        category: owner === "crew" ? "labor" : "equipment", inclusion: work.inclusion, costTreatment: "OWN_COST", procurement: true,
        titleParameterIds: [id(`${work.key}_${owner}_designation`)], inputParameterIds: [...facts, id(`${work.key}_method_reference`), id(`${work.key}_${owner}_cost_basis`),
          ...(work.key === "bag_cycle" ? [...volumeFacts, id("bag_product_reference")] : [])] }))),
  ];
  return Object.freeze({ parameters: Object.freeze(parameters), rows: Object.freeze(rows) });
}
