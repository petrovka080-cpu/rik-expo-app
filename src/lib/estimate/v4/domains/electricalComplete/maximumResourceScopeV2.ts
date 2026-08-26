import type { BoqCategoryV4 } from "../../professionalEstimateV4Contract";
import type { ElectricalDomainInventoryRow } from "./inventory";

export const ELECTRICAL_COMPLETENESS_SLOTS_V2 = Object.freeze([
  "IDENTITY_PHYSICAL_RESULT", "DESIGN_INPUT_BASIS", "TOPOLOGY_ROUTE_GEOMETRY", "LOAD_DEMAND_DUTY",
  "PRIMARY_EQUIPMENT", "CABLES_CONDUCTORS", "CONTAINMENT", "SUPPORTS_EMBEDMENTS", "FASTENERS",
  "TERMINATIONS_JOINTS", "GLANDS_SEALS_PENETRATIONS", "INTERNAL_WIRING_TERMINALS", "MARKING_WARNINGS",
  "EARTHING_BONDING", "FIRESTOP_INTERFACE", "TYPED_CHILD_INTERFACES", "SURVEY_PREPARATION",
  "INSTALL_REPAIR_OPERATIONS", "ACCESS_WORK_AT_HEIGHT", "HAND_POWER_TOOLS", "RIGGING_MACHINERY",
  "MEASUREMENT_CALIBRATION", "DELIVERY", "LOADING", "UNLOADING", "SITE_HANDLING_LIFTING",
  "TEMP_POWER_LOTO_HSE", "INCOMING_COMPONENT_TESTS", "ELECTRICAL_TESTS", "PROTECTION_SELECTIVITY",
  "FUNCTIONAL_TESTS", "INTEGRATED_COMMISSIONING", "WASTE_RETURN_MATERIALS", "SPECIAL_SERVICES_COORDINATION",
  "RECORDS_DRAWINGS_PROTOCOLS", "ACCEPTANCE_TRAINING_HANDOVER",
] as const);

export type ElectricalCompletenessSlotV2 = typeof ELECTRICAL_COMPLETENESS_SLOTS_V2[number];

export const ELECTRICAL_COMPLEXITY_CLASSES_V2 = Object.freeze([
  "E_ATOMIC", "E_SMALL_ASSEMBLY", "E_CONTAINMENT_SYSTEM", "E_CABLE_FEEDER", "E_LIGHTING_SYSTEM",
  "E_PANEL_SWITCHBOARD", "E_GROUNDING_LIGHTNING", "E_EXTERNAL_NETWORK",
  "E_PROTECTION_AUTOMATION_METERING", "E_UPS_STORAGE_BACKUP", "E_SUBSTATION_TRANSFORMER",
  "E_INTEGRATED_REPAIR_RETROFIT",
] as const);

export type ElectricalComplexityClassV2 = typeof ELECTRICAL_COMPLEXITY_CLASSES_V2[number];

export type ElectricalResourceOwnerV2 =
  | "ELECTRICAL"
  | "CIVIL_TYPED_CHILD"
  | "STRUCTURAL_TYPED_CHILD"
  | "FIRE_TYPED_CHILD"
  | "CONTROLS_TYPED_CHILD"
  | "HVAC_TYPED_CHILD";

export type ElectricalMaximumResourceCandidateV2 = {
  candidate_id: string;
  title_ru: string;
  section_ru: string;
  category: BoqCategoryV4;
  unit_id: string;
  completeness_slot_v2: ElectricalCompletenessSlotV2;
  minimal: boolean;
  normative_source_id: string;
  owner: ElectricalResourceOwnerV2;
  applicability: string;
  formula_basis: "EXACT_PROJECT_INPUT";
};

type Seed = Omit<ElectricalMaximumResourceCandidateV2, "minimal" | "normative_source_id" | "owner" | "applicability" | "formula_basis"> &
  Partial<Pick<ElectricalMaximumResourceCandidateV2, "minimal" | "normative_source_id" | "owner" | "applicability">>;

const KG_RATE = "KG_KRERM_08_2015_ELECTRICAL";
const KG_PNR = "KG_KRERP_01_2015_ELECTRICAL";
const KG_SAFE = "KG_ELECTRICAL_SAFETY_2023";
const KG_ACCEPT = "KG_ELECTRICAL_ACCEPTANCE_2023";
const EAEU_LV = "EAEU_TR_TS_004_2011";

const PRODUCTION_NORMATIVE_SOURCE_OVERRIDES_V2: Readonly<Record<string, string>> = Object.freeze({
  core_product_schedule_review: EAEU_LV,
  core_existing_network_identification: KG_SAFE,
  tool_insulated_hand: KG_SAFE,
  measure_voltage_detector: KG_SAFE,
  panel_calc_fault_current: KG_ACCEPT,
  panel_calc_selectivity: KG_ACCEPT,
  op_replace_isolate: KG_SAFE,
  op_replace_test: KG_ACCEPT,
  ohl_test_clearance: KG_ACCEPT,
  substation_transformer: EAEU_LV,
  lighting_driver: EAEU_LV,
  device_back_box: EAEU_LV,
  ups_rectifier: EAEU_LV,
  ups_inverter: EAEU_LV,
  ups_static_bypass: EAEU_LV,
});

const ELECTRICAL_FAMILY_LABELS_RU_V2: Readonly<Record<string, string>> = Object.freeze({
  BREAKER: "автоматический выключатель",
  CABLE_CHANNEL: "кабельный канал",
  LED_STRIP: "светодиодная лента",
  LIGHTING: "система освещения",
  PANEL: "электрический щит",
  POWER_CABLE: "силовой кабель",
  RCD: "устройство защитного отключения",
  SOCKET: "розетка",
  SWITCH: "выключатель",
  VVG_CABLE: "кабель ВВГ",
  battery_energy_storage: "аккумуляторная система накопления энергии",
  cable_ducts: "кабельная канализация",
  cable_pulling: "протяжка кабеля",
  cable_trench: "кабельная траншея",
  cable_trench_energy: "энергетическая кабельная траншея",
  distribution_board_outdoor: "наружный распределительный щит",
  distribution_substation: "распределительная подстанция",
  electrical_poles_04kv: "опоры линии 0,4 кВ",
  electrical_poles_10kv: "опоры линии 10 кВ",
  electrical_poles_35kv: "опоры линии 35 кВ",
  electrical_poles_110kv: "опоры линии 110 кВ",
  electrical_testing_commissioning: "электроизмерения и пусконаладка",
  grounding_system: "система заземления",
  lightning_protection: "система молниезащиты",
  outdoor_switchgear: "наружное распределительное устройство",
  overhead_power_line_04kv: "воздушная линия 0,4 кВ",
  overhead_power_line_10kv: "воздушная линия 10 кВ",
  overhead_power_line_35kv: "воздушная линия 35 кВ",
  overhead_power_line_110kv: "воздушная линия 110 кВ",
  package_transformer_substation: "комплектная трансформаторная подстанция",
  relay_protection_automation: "релейная защита и автоматика",
  street_lighting_poles: "опоры уличного освещения",
  substation_10kv: "подстанция 10 кВ",
  substation_35kv: "подстанция 35 кВ",
  substation_110kv: "подстанция 110 кВ",
  transformer_substation: "трансформаторная подстанция",
  underground_cable_line: "подземная кабельная линия",
});

function electricalFamilyLabelRuV2(family: string): string {
  const label = ELECTRICAL_FAMILY_LABELS_RU_V2[family];
  if (!label) throw new Error(`ELECTRICAL_FAMILY_RU_LABEL_MISSING:${family}`);
  return label;
}

function plainRussianElectricalTextV2(value: string): string {
  return value
    .replace(/Electrical-owned/gu, "учтённой электротехнической частью")
    .replace(/typed-child/gu, "смежных специализированных")
    .replace(/End-to-end/gu, "Сквозная")
    .replace(/end-to-end/gu, "сквозных")
    .replace(/nested BOM/gu, "поузловой спецификации")
    .replace(/circuit directory/gu, "ведомости цепей")
    .replace(/final circuit/gu, "конечной электрической цепи")
    .replace(/bonding/gu, "уравнивания потенциалов")
    .replace(/feeder/gu, "питающей линии")
    .replace(/\bLOTO\b/gu, "процедурой блокировки и предупреждающей маркировки")
    .replace(/\bUPS\b/gu, "источника бесперебойного питания")
    .replace(/\bDC\b/gu, "постоянного тока")
    .replace(/\bSPD\b/gu, "устройства защиты от импульсных перенапряжений")
    .replace(/\bPE\b/gu, "защитного проводника")
    .replace(/\bDIN\b/gu, "монтажной рейки")
    .replace(/\bIP\b/gu, "степени защиты оболочки")
    .replace(/\bIK\b/gu, "класса ударной прочности")
    .replace(/\bCivil\b/gu, "строительных работ")
    .replace(/\bControls\b/gu, "автоматизации")
    .replace(/\bFire\b/gu, "противопожарных систем")
    .replace(/\bHVAC\b/gu, "отопления и вентиляции")
    .replace(/\bStructural\b/gu, "несущих конструкций")
    .replace(/\bElectrical\b/gu, "электротехнических работ")
    .replace(/\bHSE\b/gu, "Охрана труда")
    .replace(/\bexact\b/gu, "точного типа")
    .replace(/\s+/gu, " ")
    .trim();
}

function r(seed: Seed): ElectricalMaximumResourceCandidateV2 {
  const candidate: ElectricalMaximumResourceCandidateV2 = {
    minimal: false,
    normative_source_id: KG_RATE,
    owner: "ELECTRICAL",
    applicability: "Включается только по точному проектному количеству, выбранной технологии и подтверждённой границе стоимости.",
    formula_basis: "EXACT_PROJECT_INPUT",
    ...seed,
  };
  return {
    ...candidate,
    title_ru: plainRussianElectricalTextV2(candidate.title_ru),
    section_ru: plainRussianElectricalTextV2(candidate.section_ru),
  };
}

type RowTuple = readonly [id: string, titleRu: string];

function rows(
  prefix: string,
  section_ru: string,
  category: BoqCategoryV4,
  unit_id: string,
  completeness_slot_v2: ElectricalCompletenessSlotV2,
  values: readonly RowTuple[],
  options: Partial<Pick<ElectricalMaximumResourceCandidateV2, "minimal" | "normative_source_id" | "owner" | "applicability">> = {},
): ElectricalMaximumResourceCandidateV2[] {
  return values.map(([id, title_ru]) => r({ candidate_id: `${prefix}_${id}`, title_ru, section_ru, category, unit_id, completeness_slot_v2, ...options }));
}

const CORE_DESIGN = rows("core", "Инженерная подготовка", "subcontract_service", "service", "DESIGN_INPUT_BASIS", [
  ["design_review", "Проверка рабочей документации и однолинейной схемы"],
  ["scope_boundary_review", "Проверка границ Electrical и typed-child владельцев"],
  ["product_schedule_review", "Сверка спецификации оборудования и паспортов изделий"],
  ["method_statement", "Разработка технологической карты электротехнической операции"],
  ["permit_plan", "Подготовка наряда-допуска и плана безопасного производства работ"],
], { minimal: true });

const CORE_SURVEY = rows("core", "Обследование и подготовка", "labor", "man_hour", "SURVEY_PREPARATION", [
  ["site_survey", "Обследование фактического места выполнения работы"],
  ["existing_network_identification", "Идентификация действующих цепей и оборудования"],
  ["utility_detection", "Обнаружение скрытых сетей трассоискателем"],
  ["laser_setout", "Лазерная разметка трассы, осей и отметок"],
  ["workfront_acceptance", "Приёмка готовности основания и фронта работ"],
  ["interface_coordination", "Координация пересечений с инженерными системами"],
]);

const CORE_TOOLS = [
  ...rows("tool", "Ручной и механизированный инструмент", "equipment", "machine_hour", "HAND_POWER_TOOLS", [
    ["insulated_hand", "Изолированный ручной инструмент требуемой категории"],
    ["drill_driver", "Шуруповёрт с контролем момента"],
    ["rotary_hammer", "Перфоратор с системой пылеудаления"],
    ["cutting", "Инструмент резки с защитным кожухом"],
    ["stripping", "Инструмент снятия изоляции точного диапазона"],
    ["crimping", "Пресс-инструмент с матрицей точного сечения"],
    ["torque", "Калиброванный динамометрический инструмент"],
    ["dust_extractor", "Передвижная установка пылеудаления"],
  ]),
  ...rows("measure", "Измерительные приборы", "equipment", "machine_hour", "MEASUREMENT_CALIBRATION", [
    ["voltage_detector", "Поверенный указатель напряжения"],
    ["multimeter", "Поверенный цифровой мультиметр"],
    ["installation_tester", "Поверенный многофункциональный измеритель электроустановок"],
    ["insulation_tester", "Поверенный измеритель сопротивления изоляции"],
    ["earth_tester", "Поверенный измеритель сопротивления заземления"],
    ["thermal_imager", "Тепловизор с действующей калибровкой"],
    ["calibration_check", "Проверка свидетельства поверки каждого применяемого прибора"],
  ], { normative_source_id: KG_ACCEPT }),
];

const CORE_LOGISTICS = [
  ...rows("logistics", "Логистика", "transport", "vehicle_km", "DELIVERY", [["delivery", "Доставка электротехнических материалов и оборудования отдельным рейсом"]]),
  ...rows("logistics", "Логистика", "labor", "man_hour", "LOADING", [["loading", "Погрузка с учётом массы и требований производителя"]]),
  ...rows("logistics", "Логистика", "labor", "man_hour", "UNLOADING", [["unloading", "Разгрузка с входным осмотром упаковки"]]),
  ...rows("logistics", "Логистика", "labor", "man_hour", "SITE_HANDLING_LIFTING", [
    ["horizontal_handling", "Горизонтальное внутриплощадочное перемещение"],
    ["vertical_handling", "Ручной подъём на проектную отметку"],
    ["protected_storage", "Размещение в защищённой зоне временного хранения"],
  ]),
];

const CORE_HSE = rows("hse", "HSE и временные работы", "temporary_work", "shift", "TEMP_POWER_LOTO_HSE", [
  ["isolation", "Отключение согласованного источника питания"],
  ["lockout_tagout", "Блокировка и маркировка LOTO"],
  ["absence_voltage", "Проверка отсутствия напряжения перед началом работ"],
  ["temporary_earthing", "Установка и снятие переносного заземления по применимости"],
  ["barrier", "Ограждение и предупреждающие знаки рабочей зоны"],
  ["temporary_protection", "Защита действующего оборудования и отделки"],
  ["temporary_power", "Безопасное временное питание инструмента"],
  ["hse_supervision", "Целевой инструктаж и контроль допуска персонала"],
], { normative_source_id: KG_SAFE, minimal: true });

const CORE_ACCESS_RIGGING = [
  ...rows("access", "Доступ и работа на высоте", "temporary_work", "shift", "ACCESS_WORK_AT_HEIGHT", [
    ["mobile_tower", "Доставка, монтаж, эксплуатация и демонтаж передвижной вышки"],
    ["powered_platform", "Эксплуатация подъёмной рабочей платформы проектной высоты"],
    ["fall_protection", "Анкерная точка и система защиты от падения"],
  ]),
  ...rows("rigging", "Подъём и такелаж", "machinery", "machine_hour", "RIGGING_MACHINERY", [
    ["material_hoist", "Материальный подъёмник расчётной грузоподъёмности"],
    ["chain_block", "Ручная таль расчётной грузоподъёмности"],
    ["forklift", "Вилочный погрузчик расчётной грузоподъёмности"],
    ["mobile_crane", "Автокран расчётной грузоподъёмности"],
    ["rigging_gear", "Стропы, траверсы и такелажные приспособления с освидетельствованием"],
  ]),
];

const CORE_QA = [
  ...rows("qa", "Входной контроль", "testing", "item", "INCOMING_COMPONENT_TESTS", [
    ["certificate_check", "Проверка документа соответствия каждого типа изделия"],
    ["incoming_visual", "Визуальный входной контроль каждого типа изделия"],
    ["nameplate_reconciliation", "Сверка шильдика и проектной спецификации"],
    ["storage_condition", "Контроль условий хранения до монтажа"],
  ], { normative_source_id: EAEU_LV, minimal: true }),
  ...rows("qa", "Электрические испытания", "testing", "test", "ELECTRICAL_TESTS", [
    ["protective_continuity", "Измерение непрерывности защитного проводника"],
    ["insulation_resistance", "Измерение сопротивления изоляции"],
    ["polarity", "Проверка полярности"],
    ["phase_sequence", "Проверка чередования фаз"],
    ["loop_impedance", "Измерение полного сопротивления петли аварийного тока"],
  ], { normative_source_id: KG_ACCEPT }),
  ...rows("qa", "Функциональные проверки", "testing", "test", "FUNCTIONAL_TESTS", [
    ["functional", "Функциональная проверка точной электрической функции"],
    ["interlock", "Проверка предусмотренной проектом блокировки"],
    ["alarm", "Проверка индикации и аварийной сигнализации"],
  ], { normative_source_id: KG_PNR }),
];

const CORE_WASTE = rows("waste", "Отходы и возвратные материалы", "waste", "kg", "WASTE_RETURN_MATERIALS", [
  ["segregation", "Раздельная сортировка металла, кабеля, пластика и упаковки"],
  ["returnable_register", "Учёт возвратных материалов и демонтированного оборудования"],
  ["packing_removal", "Сбор и удаление упаковочных отходов"],
  ["hazardous_route", "Передача опасных электротехнических отходов лицензированному получателю"],
  ["haul", "Вывоз невозвратных отходов по подтверждённой массе"],
]);

const CORE_DOCUMENTS = [
  ...rows("doc", "Исполнительная документация", "documentation", "document", "RECORDS_DRAWINGS_PROTOCOLS", [
    ["photo_record", "Фотофиксация скрытых и завершённых работ"],
    ["concealed_act", "Акт освидетельствования скрытых работ"],
    ["inspection_log", "Журнал входного и операционного контроля"],
    ["torque_record", "Ведомость контролируемых моментов затяжки"],
    ["measurement_protocol", "Протокол электрических измерений с данными приборов"],
    ["as_built_route", "Исполнительная схема трассы и точек подключения"],
    ["redline_drawing", "Комплект согласованных исполнительных изменений"],
  ], { normative_source_id: KG_ACCEPT }),
  ...rows("handover", "Приёмка и передача", "subcontract_service", "service", "ACCEPTANCE_TRAINING_HANDOVER", [
    ["punch_clearance", "Закрытие замечаний итогового осмотра"],
    ["final_acceptance", "Итоговая приёмка владельцем электрической системы"],
    ["operator_briefing", "Инструктаж эксплуатирующей организации"],
    ["om_handover", "Передача инструкций эксплуатации и обслуживания"],
    ["warranty_handover", "Передача гарантийных документов и перечня запасных частей"],
  ], { normative_source_id: KG_ACCEPT, minimal: true }),
];

const CORE_FULL = Object.freeze([
  ...CORE_DESIGN, ...CORE_SURVEY, ...CORE_TOOLS, ...CORE_LOGISTICS, ...CORE_HSE,
  ...CORE_ACCESS_RIGGING, ...CORE_QA, ...CORE_WASTE, ...CORE_DOCUMENTS,
]);

const CORE_COMPACT = Object.freeze([
  ...CORE_DESIGN.slice(0, 3), ...CORE_SURVEY.slice(0, 5), ...CORE_TOOLS.slice(0, 7), CORE_TOOLS[8],
  ...CORE_LOGISTICS, ...CORE_HSE.slice(0, 6), ...CORE_QA.slice(0, 7),
  ...CORE_WASTE.slice(0, 3), ...CORE_DOCUMENTS.slice(0, 9),
]);

const CONTAINMENT = Object.freeze([
  ...rows("containment", "Кабеленесущая система", "material", "m", "CONTAINMENT", [
    ["straight", "Прямая секция точного типа, ширины, высоты и исполнения"],
    ["cover", "Крышка прямой секции"], ["divider", "Разделитель кабеленесущей системы"],
    ["flexible_conduit", "Гибкая защитная труба точного диаметра"], ["rigid_conduit", "Жёсткая защитная труба точного диаметра"],
  ], { minimal: true }),
  ...rows("containment", "Фасонные элементы", "material", "item", "CONTAINMENT", [
    ["horizontal_bend", "Горизонтальный угол точного радиуса"], ["vertical_inside_bend", "Внутренний вертикальный угол"],
    ["vertical_outside_bend", "Наружный вертикальный угол"], ["tee", "Тройник"], ["cross", "Крестовина"],
    ["reducer", "Переход ширины"], ["riser", "Вертикальный подъёмный элемент"], ["dropout", "Защитный кабельный сход"],
    ["joint_plate", "Соединительная пластина"], ["joint_bolt", "Болтовое соединение секций"], ["end_cap", "Торцевая заглушка"],
    ["cover_clip", "Фиксатор крышки"], ["pull_box", "Протяжная коробка"], ["conduit_coupling", "Муфта защитной трубы"],
    ["conduit_bend", "Отвод защитной трубы"], ["conduit_bushing", "Защитная втулка трубы"],
  ]),
  ...rows("containment", "Опоры и подвесы", "material", "item", "SUPPORTS_EMBEDMENTS", [
    ["wall_bracket", "Настенная консоль точной несущей способности"], ["trapeze", "Монтажная траверса"],
    ["channel_support", "Монтажный профиль опоры"], ["threaded_rod", "Резьбовая шпилька подвеса"],
    ["rod_coupler", "Соединительная гайка шпильки"], ["beam_clamp", "Зажим к несущей балке"],
    ["seismic_brace", "Сейсмическая раскосная связь по расчёту"], ["vibration_isolator", "Виброизолирующая опора по проекту"],
  ]),
  ...rows("containment", "Крепёж", "material", "item", "FASTENERS", [
    ["concrete_anchor", "Анкер к бетонному основанию"], ["steel_fastener", "Крепление к стальной конструкции"],
    ["masonry_anchor", "Анкер к кладке"], ["support_bolt", "Болт крепления опоры"], ["lock_washer", "Стопорная шайба"],
  ]),
  ...rows("containment", "Соединение и защита", "material", "item", "EARTHING_BONDING", [
    ["bonding_jumper", "Гибкая перемычка уравнивания потенциалов"], ["pe_terminal", "Зажим присоединения PE"],
  ]),
  ...rows("containment", "Проходки и маркировка", "material", "item", "GLANDS_SEALS_PENETRATIONS", [
    ["sleeve", "Защитная гильза проходки"], ["edge_protection", "Защита кромки кабельного схода"],
    ["firestop_interface", "Электрическая подготовка отдельной огнестойкой проходки"],
  ]),
  ...rows("containment", "Монтажные операции", "labor", "man_hour", "INSTALL_REPAIR_OPERATIONS", [
    ["route_marking", "Разметка трассы и мест опор"], ["drilling", "Сверление отверстий с пылеудалением"],
    ["support_install", "Монтаж каждой опоры"], ["section_cutting", "Резка прямых секций"],
    ["cut_protection", "Антикоррозионная защита мест реза"], ["section_assembly", "Сборка секций и фасонных элементов"],
    ["alignment", "Выравнивание трассы в плане и по отметке"], ["torque_control", "Контроль момента болтовых соединений"],
    ["bonding_install", "Монтаж перемычек уравнивания потенциалов"], ["cover_install", "Монтаж и фиксация крышек"],
  ]),
]);

const CABLE = Object.freeze([
  ...rows("cable", "Кабели и проводники", "material", "m", "CABLES_CONDUCTORS", [
    ["power", "Силовой кабель точной марки, числа жил и сечения"], ["control", "Контрольный кабель точной марки и сечения"],
    ["pe", "Отдельный защитный проводник"], ["termination_allowance", "Запас кабеля на оконцевание"],
    ["vertical_allowance", "Дополнительная длина вертикальных подъёмов"], ["route_slack", "Проектный технологический запас по трассе"],
  ], { minimal: true, normative_source_id: EAEU_LV }),
  ...rows("cable", "Оконцевание и соединения", "material", "item", "TERMINATIONS_JOINTS", [
    ["lug_phase", "Наконечник фазной жилы точного материала и сечения"], ["lug_neutral", "Наконечник нейтральной жилы"],
    ["lug_pe", "Наконечник защитной жилы"], ["ferrule", "Втулочный наконечник гибкой жилы"],
    ["straight_joint", "Соединительная муфта проектного класса"], ["branch_joint", "Ответвительная муфта проектного класса"],
    ["outdoor_termination", "Наружная концевая муфта"], ["indoor_termination", "Внутренняя концевая муфта"],
    ["heat_shrink", "Термоусаживаемая изоляционная трубка точного размера"], ["phase_identifier", "Фазная идентификация каждого конца"],
  ]),
  ...rows("cable", "Вводы и герметизация", "material", "item", "GLANDS_SEALS_PENETRATIONS", [
    ["gland", "Кабельный ввод точного диаметра и степени защиты"], ["locknut", "Контргайка кабельного ввода"],
    ["shroud", "Защитный кожух кабельного ввода"], ["entry_seal", "Уплотнение кабельного ввода"],
    ["crossing_protection", "Механическая защита кабеля в месте пересечения"], ["firestop", "Сертифицированная заделка отдельной кабельной проходки"],
  ]),
  ...rows("cable", "Крепление и маркировка", "material", "item", "SUPPORTS_EMBEDMENTS", [
    ["cleat", "Кабельный хомут расчётной удерживающей способности"], ["clamp", "Промежуточное крепление кабеля"],
    ["drum_end_cap", "Защитный колпачок конца кабеля"], ["pulling_grip", "Монтажный чулок для протяжки"],
  ]),
  ...rows("cable", "Маркировка", "material", "item", "MARKING_WARNINGS", [
    ["end_tag", "Кабельная бирка каждого конца"], ["route_marker", "Промежуточный маркер кабельной трассы"],
    ["circuit_label", "Маркировка цепи в точке подключения"],
  ]),
  ...rows("cable", "Расходные материалы", "material", "kg", "FASTENERS", [
    ["pulling_lubricant", "Совместимая с оболочкой смазка для протяжки"], ["cleaning_consumable", "Материал очистки и подготовки жил"],
  ]),
  ...rows("cable", "Прокладка и подключение", "labor", "man_hour", "INSTALL_REPAIR_OPERATIONS", [
    ["drum_acceptance", "Приёмка и проверка кабельного барабана"], ["drum_setup", "Установка барабана на домкраты"],
    ["roller_setup", "Расстановка и снятие кабельных роликов"], ["pulling", "Контролируемая протяжка кабеля"],
    ["laying", "Укладка и выправка кабеля на трассе"], ["cleating", "Крепление кабеля с проектным шагом"],
    ["bend_control", "Контроль минимального радиуса изгиба"], ["pull_tension_control", "Контроль тягового усилия"],
    ["end_preparation", "Разделка каждого конца кабеля"], ["crimp", "Опрессовка каждого наконечника"],
    ["termination", "Подключение каждой жилы"], ["torque", "Контроль момента каждого болтового подключения"],
    ["screen_bonding", "Присоединение экрана или брони"], ["phase_marking", "Фазировка и маркировка концов"],
  ]),
  ...rows("cable_machine", "Механизмы прокладки", "machinery", "machine_hour", "RIGGING_MACHINERY", [
    ["drum_jacks", "Кабельные домкраты расчётной грузоподъёмности"], ["rollers", "Кабельные ролики проектного типа"],
    ["winch", "Лебёдка с контролем тягового усилия"], ["tension_meter", "Динамометр контроля тягового усилия"],
  ]),
  ...rows("cable_test", "Испытания кабельной линии", "testing", "test", "ELECTRICAL_TESTS", [
    ["continuity", "Проверка непрерывности каждой жилы"], ["insulation", "Измерение сопротивления изоляции кабеля"],
    ["polarity", "Проверка полярности final circuit"], ["phase_sequence", "Проверка чередования фаз feeder"],
    ["screen_bond", "Проверка присоединения экрана или брони"], ["sheath", "Испытание наружной оболочки по применимости"],
  ], { normative_source_id: KG_ACCEPT }),
  ...rows("cable_doc", "Документы кабельной линии", "documentation", "document", "RECORDS_DRAWINGS_PROTOCOLS", [
    ["schedule", "Актуализированная кабельная ведомость"], ["log", "Кабельный журнал с барабаном, длиной и концами"],
    ["termination_record", "Ведомость оконцеваний"], ["route_asbuilt", "Исполнительная схема кабельной трассы"],
  ]),
]);

const SMALL_DEVICE = Object.freeze([
  ...rows("device", "Установочное изделие", "material", "item", "PRIMARY_EQUIPMENT", [
    ["mechanism", "Механизм точного типа, номинала и степени защиты"], ["back_box", "Монтажная коробка точной глубины"],
    ["support", "Суппорт установочного изделия"], ["frame", "Рамка точной конфигурации"], ["faceplate", "Лицевая панель"],
  ], { minimal: true, normative_source_id: EAEU_LV }),
  ...rows("device", "Подключение изделия", "material", "item", "INTERNAL_WIRING_TERMINALS", [
    ["terminal", "Клемма точного типа и сечения"], ["phase_tail", "Фазная монтажная перемычка"],
    ["neutral_tail", "Нейтральная монтажная перемычка"], ["pe_tail", "Защитная PE-перемычка"],
  ]),
  ...rows("device", "Герметизация и маркировка", "material", "item", "GLANDS_SEALS_PENETRATIONS", [
    ["gland", "Герметичный ввод проводника"], ["seal", "Уплотнение для проектной степени IP"], ["label", "Идентификационная этикетка цепи"],
  ]),
  ...rows("device", "Монтаж изделия", "labor", "man_hour", "INSTALL_REPAIR_OPERATIONS", [
    ["opening", "Подготовка отдельного монтажного отверстия"], ["box_install", "Установка и выравнивание монтажной коробки"],
    ["cable_entry", "Ввод кабеля в коробку"], ["strip", "Разделка и зачистка проводников"],
    ["connect", "Подключение каждого проводника"], ["alignment", "Выравнивание механизма"], ["face_install", "Монтаж рамки и лицевой панели"],
  ]),
  ...rows("device_test", "Испытания изделия", "testing", "test", "FUNCTIONAL_TESTS", [
    ["pe", "Проверка защитного проводника"], ["polarity", "Проверка полярности"], ["operation", "Функциональная проверка изделия"],
    ["rcd_trip", "Проверка отключения вышестоящего УЗО по применимости"],
  ], { normative_source_id: KG_ACCEPT }),
]);

const PROTECTION_DEVICE = Object.freeze([
  ...rows("protection", "Аппарат защиты", "material", "item", "PRIMARY_EQUIPMENT", [
    ["device", "Аппарат защиты точного типа, полюсности, номинала и характеристики"],
    ["aux_contact", "Вспомогательный контакт состояния"], ["trip_accessory", "Независимый расцепитель по проекту"],
    ["bus_connector", "Сертифицированная соединительная шина аппарата"], ["terminal_shield", "Защитный экран силовых клемм"],
  ], { minimal: true, normative_source_id: EAEU_LV }),
  ...rows("protection", "Подключение аппарата", "material", "item", "TERMINATIONS_JOINTS", [
    ["line_lug", "Наконечник входного проводника"], ["load_lug", "Наконечник отходящего проводника"],
    ["ferrule", "Втулочный наконечник управляющего проводника"], ["identifier", "Маркировка аппарата и защищаемой цепи"],
  ]),
  ...rows("protection", "Монтаж аппарата", "labor", "man_hour", "INSTALL_REPAIR_OPERATIONS", [
    ["isolate", "Идентификация и отключение защищаемой цепи"], ["mount", "Установка аппарата на проектное основание"],
    ["terminate", "Оконцевание и подключение проводников"], ["torque", "Контроль момента силовых клемм"],
    ["setting", "Установка доступных проектных параметров защиты"], ["label", "Маркировка аппарата и circuit directory"],
  ]),
  ...rows("protection_test", "Проверка защиты", "testing", "test", "PROTECTION_SELECTIVITY", [
    ["rating", "Проверка соответствия номинала расчётному току"], ["breaking", "Проверка отключающей способности расчётному току КЗ"],
    ["selectivity", "Проверка селективности с вышестоящей защитой"], ["rcd", "Измерение тока и времени срабатывания дифференциальной защиты"],
  ], { normative_source_id: KG_ACCEPT }),
]);

const LIGHTING = Object.freeze([
  ...rows("lighting", "Светотехническое оборудование", "material", "item", "PRIMARY_EQUIPMENT", [
    ["luminaire", "Светильник точного типа, оптики, мощности и IP"], ["led_module", "Светодиодный модуль"],
    ["driver", "Драйвер светильника"], ["emergency_module", "Аварийный модуль"], ["battery", "Аккумулятор аварийного светильника"],
    ["charger", "Зарядное устройство аварийного модуля"], ["protective_guard", "Защитная решётка светильника"],
  ], { minimal: true, normative_source_id: EAEU_LV }),
  ...rows("lighting", "Крепление светильника", "material", "item", "SUPPORTS_EMBEDMENTS", [
    ["bracket", "Монтажный кронштейн"], ["suspension", "Регулируемый подвес"], ["mounting_rail", "Монтажная рейка"],
    ["safety_wire", "Страховочный трос"], ["anchor", "Анкер точного основания"],
  ]),
  ...rows("lighting", "Подключение и управление", "material", "item", "INTERNAL_WIRING_TERMINALS", [
    ["junction_box", "Ответвительная коробка"], ["cable_tail", "Кабельный хвост подключения"], ["connector", "Разъём светильника"],
    ["pe_jumper", "PE-перемычка корпуса"], ["sensor", "Датчик управления освещением"], ["control_relay", "Реле управления"],
    ["dali_component", "Адресный компонент управления освещением"], ["emergency_test_key", "Устройство тестирования аварийного режима"],
  ]),
  ...rows("lighting", "Монтаж освещения", "labor", "man_hour", "INSTALL_REPAIR_OPERATIONS", [
    ["point_survey", "Обследование отдельной точки установки"], ["marking", "Разметка точки и креплений"], ["fixing", "Монтаж креплений"],
    ["mount", "Установка светильника"], ["connect", "Подключение проводников"], ["bond", "Присоединение защитного проводника"],
    ["address", "Адресация устройства управления"], ["aim", "Ориентация и наведение светильника"], ["clean", "Очистка оптической части"],
  ]),
  ...rows("lighting_test", "Светотехнические испытания", "testing", "test", "FUNCTIONAL_TESTS", [
    ["continuity", "Проверка непрерывности PE"], ["polarity", "Проверка полярности цепи"], ["switching", "Проверка штатного управления"],
    ["illuminance", "Измерение освещённости в контрольной точке"], ["emergency_transfer", "Проверка перехода в аварийный режим"],
    ["autonomy", "Испытание длительности автономной работы"], ["addressing", "Проверка адресации и сценария управления"],
  ], { normative_source_id: KG_ACCEPT }),
  ...rows("lighting_doc", "Документы освещения", "documentation", "document", "RECORDS_DRAWINGS_PROTOCOLS", [
    ["schedule", "Актуализированная ведомость светильников"], ["illuminance_protocol", "Протокол измерения освещённости"],
    ["emergency_protocol", "Протокол испытания аварийного освещения"], ["control_map", "Карта групп и адресов управления"],
  ]),
]);

const PANEL = Object.freeze([
  ...rows("panel", "Корпус и конструкция щита", "material", "item", "PRIMARY_EQUIPMENT", [
    ["enclosure", "Корпус точных габаритов, IP и IK"], ["plinth", "Цоколь корпуса"], ["mounting_plate", "Монтажная панель"],
    ["door", "Дверь корпуса"], ["gland_plate", "Панель кабельных вводов"], ["lock", "Замок двери"],
    ["vent_filter", "Вентиляционный фильтр"], ["fan", "Вентилятор шкафа"], ["heater", "Антиконденсатный нагреватель"],
    ["thermostat", "Термостат шкафа"], ["lighting", "Светильник внутреннего обслуживания"], ["socket", "Сервисная розетка шкафа"],
  ], { minimal: true, normative_source_id: EAEU_LV }),
  ...rows("panel", "Шины и внутренний монтаж", "material", "item", "INTERNAL_WIRING_TERMINALS", [
    ["main_bus", "Главная фазная шина расчётного номинала"], ["neutral_bus", "Нейтральная шина"], ["pe_bus", "Защитная PE-шина"],
    ["door_bond", "Гибкая перемычка двери"], ["din_rail", "DIN-рейка"], ["wire_duct", "Внутренний кабельный канал"],
    ["terminal_power", "Силовая клемма точного сечения"], ["terminal_control", "Клемма цепи управления"],
    ["terminal_pe", "PE-клемма"], ["end_stop", "Концевой стопор клемм"], ["terminal_jumper", "Перемычка клемм"],
    ["terminal_marker", "Маркер клеммы"], ["internal_phase_wire", "Внутренний фазный провод точного сечения"],
    ["internal_neutral_wire", "Внутренний нейтральный провод"], ["internal_pe_wire", "Внутренний защитный провод"],
    ["control_wire", "Провод цепи управления"], ["wire_ferrule", "Втулочный наконечник внутреннего провода"],
  ]),
  ...rows("panel", "Коммутационные аппараты", "material", "item", "PRIMARY_EQUIPMENT", [
    ["incomer_breaker", "Вводной автоматический выключатель"], ["outgoing_breaker", "Отходящий автоматический выключатель точного типа"],
    ["fuse_switch", "Выключатель-разъединитель с предохранителями"], ["isolator", "Разъединитель"], ["contactor", "Контактор"],
    ["motor_starter", "Пускатель двигателя"], ["overload_relay", "Реле перегрузки"], ["time_relay", "Реле времени"],
    ["intermediate_relay", "Промежуточное реле"], ["rcd", "Устройство защитного отключения"], ["rcbo", "Дифференциальный автомат"],
    ["spd", "Устройство защиты от импульсных перенапряжений"], ["spd_backup", "Резервная защита SPD"],
  ]),
  ...rows("panel", "Учёт, управление и индикация", "material", "item", "PRIMARY_EQUIPMENT", [
    ["meter", "Многофункциональный измерительный прибор"], ["current_transformer", "Трансформатор тока точного коэффициента"],
    ["voltage_transformer", "Трансформатор напряжения точного коэффициента"], ["selector", "Переключатель режима"],
    ["pushbutton", "Кнопка управления"], ["indicator", "Сигнальная лампа"], ["buzzer", "Звуковой сигнализатор"],
    ["communication_module", "Коммуникационный модуль"], ["power_supply", "Блок питания цепей управления"],
  ]),
  ...rows("panel", "Вводы и маркировка", "material", "item", "GLANDS_SEALS_PENETRATIONS", [
    ["gland", "Кабельный ввод точного диаметра"], ["blanking_plug", "Герметичная заглушка неиспользуемого ввода"],
    ["warning_label", "Предупреждающая табличка"], ["device_label", "Маркировка каждого аппарата"],
    ["circuit_directory", "Ведомость цепей на двери щита"], ["nameplate", "Паспортная табличка щита"],
  ]),
  ...rows("panel", "Сборка и монтаж щита", "labor", "man_hour", "INSTALL_REPAIR_OPERATIONS", [
    ["bom_reconcile", "Сверка nested BOM со схемой"], ["mechanical_assembly", "Механическая сборка корпуса"],
    ["rail_install", "Монтаж DIN-реек и каналов"], ["bus_install", "Монтаж и изоляция шин"], ["device_install", "Монтаж каждого аппарата"],
    ["internal_wiring", "Изготовление внутренней проводки"], ["terminal_install", "Монтаж и маркировка клемм"],
    ["panel_position", "Разметка и позиционирование щита"], ["panel_anchor", "Анкеровка корпуса"],
    ["cable_entry", "Подготовка и герметизация кабельных вводов"], ["power_termination", "Подключение силовых кабелей"],
    ["control_termination", "Подключение контрольных кабелей"], ["torque", "Контроль момента каждого силового соединения"],
    ["wire_check", "Поточечная проверка внутреннего монтажа"], ["clean", "Очистка щита перед включением"],
  ]),
  ...rows("panel_calc", "Расчёты и координация", "subcontract_service", "service", "PROTECTION_SELECTIVITY", [
    ["load", "Расчёт подключённой и расчётной нагрузки"], ["demand", "Проверка коэффициентов спроса и одновременности"],
    ["voltage_drop", "Расчёт падения напряжения"], ["fault_current", "Расчёт ожидаемого тока короткого замыкания"],
    ["breaking_capacity", "Проверка отключающей способности"], ["bus_rating", "Проверка токовой стойкости шин"],
    ["selectivity", "Исследование селективности защит"], ["thermal", "Проверка теплового режима шкафа"],
  ]),
  ...rows("panel_test", "Испытания щита", "testing", "test", "FUNCTIONAL_TESTS", [
    ["visual", "Визуальный и механический контроль сборки"], ["wiring", "Проверка соответствия соединений схеме"],
    ["continuity", "Проверка непрерывности защитной цепи"], ["insulation", "Измерение сопротивления изоляции"],
    ["dielectric", "Испытание электрической прочности по применимости"], ["torque_audit", "Выборочный аудит момента соединений"],
    ["device_operation", "Функциональная проверка каждого аппарата"], ["interlock", "Проверка механических и электрических блокировок"],
    ["metering", "Проверка измерительных цепей"], ["communication", "Проверка коммуникационного интерфейса"],
    ["fat", "Заводское приёмочное испытание по проектной программе"], ["sat", "Объектовое приёмочное испытание"],
    ["pre_energization", "Проверка готовности к подаче напряжения"], ["energization", "Контролируемое первое включение"],
  ], { normative_source_id: KG_PNR }),
  ...rows("panel_doc", "Документы щита", "documentation", "document", "RECORDS_DRAWINGS_PROTOCOLS", [
    ["passport", "Индивидуальный паспорт щита"], ["single_line", "Исполнительная однолинейная схема"],
    ["wiring_diagram", "Исполнительная схема вторичных соединений"], ["terminal_schedule", "Клеммная ведомость"],
    ["settings", "Ведомость уставок"], ["test_protocol", "Протокол испытаний щита"],
  ]),
]);

const GROUNDING = Object.freeze([
  ...rows("earth", "Заземляющее устройство", "material", "m", "EARTHING_BONDING", [
    ["strip", "Заземляющая полоса точного материала и сечения"], ["round_conductor", "Круглый заземляющий проводник"],
    ["insulated_conductor", "Изолированный защитный проводник"], ["down_conductor", "Токоотвод молниезащиты"],
  ], { minimal: true }),
  ...rows("earth", "Элементы заземления", "material", "item", "EARTHING_BONDING", [
    ["rod_electrode", "Стержневой заземлитель точной длины"], ["deep_electrode", "Глубинный заземлитель"],
    ["main_bar", "Главная заземляющая шина"], ["local_bar", "Локальная шина уравнивания потенциалов"],
    ["test_joint", "Разъёмное контрольное соединение"], ["disconnect_link", "Разъединительная перемычка"],
    ["inspection_pit", "Контрольный колодец заземления"], ["pit_cover", "Крышка контрольного колодца"],
    ["bonding_clamp", "Зажим уравнивания потенциалов"], ["bimetal_connector", "Биметаллический соединитель"],
    ["cable_lug", "Наконечник защитного проводника"], ["route_marker", "Маркер подземной трассы заземления"],
  ]),
  ...rows("lightning", "Молниезащита", "material", "item", "EARTHING_BONDING", [
    ["air_terminal", "Стержневой молниеприёмник"], ["mesh_holder", "Держатель молниеприёмной сетки"],
    ["down_holder", "Держатель токоотвода"], ["roof_interface", "Герметичный узел крепления к кровле"],
    ["expansion_joint", "Компенсационное соединение проводника"], ["warning_label", "Предупреждающая табличка молниезащиты"],
  ]),
  ...rows("earth_consumable", "Соединения и защита", "material", "item", "TERMINATIONS_JOINTS", [
    ["exothermic_charge", "Материал отдельного экзотермического соединения"], ["weld_electrode", "Сварочный электрод точного типа"],
    ["mechanical_joint", "Разборное механическое соединение"], ["corrosion_tape", "Антикоррозионная лента соединения"],
    ["protective_coating", "Антикоррозионное покрытие места соединения"],
  ]),
  ...rows("earth_work", "Монтаж заземления", "labor", "man_hour", "INSTALL_REPAIR_OPERATIONS", [
    ["route_setout", "Разбивка трассы заземления"], ["local_excavation", "Локальная разработка грунта по трассе"],
    ["electrode_drive", "Погружение каждого электрода"], ["strip_lay", "Укладка заземляющего проводника"],
    ["weld", "Выполнение отдельного сварного соединения"], ["exothermic", "Выполнение отдельного экзотермического соединения"],
    ["bond", "Присоединение отдельной металлической части"], ["test_joint_install", "Монтаж контрольного соединения"],
    ["corrosion_protect", "Антикоррозионная обработка соединений"], ["backfill", "Обратная засыпка локальной траншеи"],
    ["compact", "Послойное уплотнение обратной засыпки"], ["roof_install", "Монтаж молниезащиты на кровле"],
  ]),
  ...rows("earth_machine", "Механизмы", "machinery", "machine_hour", "RIGGING_MACHINERY", [
    ["electrode_driver", "Механизм погружения заземлителей"], ["welding_machine", "Сварочный источник"],
    ["mini_excavator", "Мини-экскаватор для локальной траншеи"], ["compactor", "Механизм уплотнения обратной засыпки"],
  ]),
  ...rows("earth_test", "Испытания заземления", "testing", "test", "ELECTRICAL_TESTS", [
    ["continuity", "Измерение непрерывности защитной цепи"], ["resistance", "Измерение сопротивления заземляющего устройства"],
    ["bond", "Измерение сопротивления отдельного bonding-соединения"], ["weld_visual", "Визуальный контроль сварных соединений"],
    ["lightning_visual", "Контроль геометрии и непрерывности молниезащиты"],
  ], { normative_source_id: KG_ACCEPT }),
  ...rows("earth_doc", "Документы заземления", "documentation", "document", "RECORDS_DRAWINGS_PROTOCOLS", [
    ["connection_ledger", "Реестр точек уравнивания потенциалов"], ["test_protocol", "Протокол измерения сопротивления заземления"],
    ["asbuilt", "Исполнительный план заземляющего устройства"], ["lightning_passport", "Паспорт системы молниезащиты"],
  ]),
]);

const EXTERNAL_CIVIL_INTERFACE = Object.freeze([
  ...rows("external_civil", "Civil typed-child interface", "subcontract_service", "service", "TYPED_CHILD_INTERFACES", [
    ["survey_handover", "Передача Civil-владельцу точной разбивки и отметок кабельной трассы"],
    ["excavation_interface", "Передача объёмов разработки грунта по категориям и методам"],
    ["shoring_interface", "Передача требований к креплению стенок траншеи"],
    ["dewatering_interface", "Передача расхода и режима строительного водоотлива"],
    ["reinstatement_interface", "Передача границ восстановления покрытия"],
  ], { owner: "CIVIL_TYPED_CHILD", applicability: "Информационная quantity-interface строка; стоимость Civil-работ не включается в Electrical BOQ." }),
]);

const EXTERNAL_NETWORK = Object.freeze([
  ...rows("external", "Геодезия и разрешения", "subcontract_service", "service", "SPECIAL_SERVICES_COORDINATION", [
    ["geodetic_setout", "Геодезическая разбивка кабельной трассы"], ["utility_locator", "Инструментальное обнаружение существующих коммуникаций"],
    ["permit", "Оформление разрешения на земляные работы"], ["traffic_plan", "Согласование схемы движения и ограждения"],
    ["crossing_coordination", "Координация каждого пересечения с владельцем сети"],
  ]),
  ...EXTERNAL_CIVIL_INTERFACE,
  ...rows("external", "Кабельные сооружения", "material", "m", "CONTAINMENT", [
    ["duct", "Кабельная труба точного материала и диаметра"], ["reserve_duct", "Резервная кабельная труба по проекту"],
    ["sleeve", "Защитный футляр пересечения"], ["bedding", "Песчаное основание кабельного сооружения"],
    ["selected_backfill", "Отобранный материал защитной засыпки"], ["warning_tape", "Сигнальная лента точной ширины"],
  ]),
  ...rows("external", "Кабельные сооружения", "material", "item", "SUPPORTS_EMBEDMENTS", [
    ["duct_spacer", "Дистанционная вставка пакета труб"], ["end_bell", "Раструб ввода трубы"],
    ["pulling_rope", "Протяжной канат в резервной трубе"], ["sealing_plug", "Герметичная заглушка трубы"],
    ["manhole", "Кабельный колодец точного типа"], ["manhole_cover", "Крышка кабельного колодца требуемого класса"],
    ["entry_seal", "Герметизация ввода в колодец"], ["cable_support", "Кабельная консоль в колодце"],
    ["route_post", "Опознавательный столбик кабельной трассы"], ["joint_marker", "Маркер кабельной муфты"],
  ]),
  ...CABLE,
  ...rows("external_work", "Наружные монтажные операции", "labor", "man_hour", "INSTALL_REPAIR_OPERATIONS", [
    ["route_acceptance", "Приёмка готовой траншеи и отметок"], ["bedding_check", "Контроль толщины и профиля основания"],
    ["duct_assembly", "Сборка и укладка кабельных труб"], ["duct_test", "Проверка проходимости каждой трубы"],
    ["manhole_install", "Электротехническое оснащение кабельного колодца"], ["cable_pull", "Протяжка кабеля по наружной трассе"],
    ["joint_install", "Монтаж отдельной кабельной муфты"], ["termination_install", "Монтаж наружной концевой муфты"],
    ["route_marker_install", "Установка маркеров трассы"], ["warning_tape_check", "Контроль положения сигнальной ленты"],
    ["layer_acceptance", "Поэтапная приёмка скрываемых слоёв"],
  ]),
  ...rows("external_machine", "Земляные механизмы interface", "machinery", "machine_hour", "RIGGING_MACHINERY", [
    ["excavator", "Экскаватор по подтверждённому объёму Electrical-owned траншеи"], ["truck", "Самосвал по подтверждённому балансу грунта"],
    ["dewatering_pump", "Насос строительного водоотлива"], ["plate_compactor", "Виброплита послойного уплотнения"],
    ["cable_winch", "Кабельная лебёдка наружной трассы"], ["drum_trailer", "Кабельный транспортёр барабана"],
  ]),
  ...rows("external_test", "Контроль наружной трассы", "testing", "test", "INCOMING_COMPONENT_TESTS", [
    ["duct_mandrel", "Проверка трубы калибром"], ["compaction", "Контроль коэффициента уплотнения слоя"],
    ["depth", "Контроль глубины заложения"], ["separation", "Контроль нормативных расстояний в пересечении"],
    ["sheath", "Испытание оболочки уложенного кабеля"],
  ], { normative_source_id: KG_ACCEPT }),
  ...rows("external_doc", "Документы наружной сети", "documentation", "document", "RECORDS_DRAWINGS_PROTOCOLS", [
    ["utility_act", "Акт обнаружения и защиты существующих коммуникаций"], ["trench_act", "Акт готовности траншеи"],
    ["layer_act", "Акт скрытых работ каждого слоя"], ["compaction_record", "Ведомость результатов уплотнения"],
    ["joint_log", "Журнал кабельных муфт"], ["geodetic_asbuilt", "Исполнительная геодезическая съёмка трассы"],
  ]),
]);

const OVERHEAD_LINE = Object.freeze([
  ...rows("ohl", "Опоры и линейная арматура", "material", "item", "PRIMARY_EQUIPMENT", [
    ["pole", "Опора точного материала, класса и высоты"], ["crossarm", "Траверса точной конфигурации"],
    ["insulator", "Изолятор требуемого класса напряжения"], ["suspension_clamp", "Поддерживающий зажим"],
    ["deadend_clamp", "Анкерный зажим"], ["connector", "Соединительный зажим провода"],
    ["vibration_damper", "Гаситель вибрации провода"], ["guy", "Оттяжка опоры"], ["guy_anchor", "Анкер оттяжки"],
    ["pole_band", "Бандажная лента опоры"], ["pole_label", "Номерная табличка опоры"],
  ], { minimal: true }),
  ...rows("ohl", "Провода воздушной линии", "material", "m", "CABLES_CONDUCTORS", [
    ["phase_conductor", "Фазный провод точной марки и сечения"], ["neutral_conductor", "Нулевой проводник"],
    ["earth_wire", "Грозозащитный трос"], ["service_conductor", "Ответвительный провод"],
  ]),
  ...rows("ohl", "Защита линии", "material", "item", "PRIMARY_EQUIPMENT", [
    ["surge_arrester", "Ограничитель перенапряжений"], ["dropout_fuse", "Линейный предохранитель"],
    ["sectionalizer", "Секционирующий аппарат"], ["pole_earthing", "Заземляющее устройство опоры"],
    ["bird_guard", "Защитное устройство от птиц"], ["warning_sign", "Предупреждающий знак высокого напряжения"],
  ]),
  ...rows("ohl_work", "Монтаж воздушной линии", "labor", "man_hour", "INSTALL_REPAIR_OPERATIONS", [
    ["setout", "Разбивка мест установки опор"], ["pole_acceptance", "Входной контроль опоры"],
    ["pole_erection", "Подъём и установка опоры"], ["alignment", "Выверка вертикальности опоры"],
    ["hardware_install", "Монтаж траверс и линейной арматуры"], ["insulator_install", "Монтаж изоляторов"],
    ["conductor_stringing", "Раскатка проводов"], ["sagging", "Регулирование стрелы провеса"],
    ["clipping", "Закрепление провода в зажимах"], ["jointing", "Соединение провода"],
    ["earthing", "Присоединение заземления опоры"], ["phase_marking", "Фазная маркировка линии"],
  ]),
  ...rows("ohl_machine", "Механизмы воздушной линии", "machinery", "machine_hour", "RIGGING_MACHINERY", [
    ["auger", "Бурильно-крановая машина"], ["crane", "Автокран установки опор"], ["bucket", "Автогидроподъёмник"],
    ["tensioner", "Тормозная машина для раскатки проводов"], ["puller", "Тяговая машина для раскатки проводов"],
    ["dynamometer", "Динамометр контроля тяжения"],
  ]),
  ...rows("ohl_test", "Контроль воздушной линии", "testing", "test", "ELECTRICAL_TESTS", [
    ["clearance", "Измерение габаритов и расстояний"], ["sag", "Измерение стрелы провеса"],
    ["phase", "Проверка фазировки"], ["earthing", "Измерение сопротивления заземления опоры"],
    ["hardware", "Контроль линейной арматуры"], ["energization", "Контролируемое опробование линии напряжением"],
  ], { normative_source_id: KG_ACCEPT }),
  ...rows("ohl_doc", "Документы воздушной линии", "documentation", "document", "RECORDS_DRAWINGS_PROTOCOLS", [
    ["pole_schedule", "Исполнительная ведомость опор"], ["sag_record", "Ведомость стрел провеса"],
    ["crossing_record", "Ведомость пересечений"], ["asbuilt", "Исполнительный профиль и план линии"],
  ]),
]);

const RZA = Object.freeze([
  ...rows("rza", "Устройства РЗА и автоматики", "material", "item", "PRIMARY_EQUIPMENT", [
    ["protection_terminal", "Терминал релейной защиты точной функции"], ["bay_controller", "Контроллер присоединения"],
    ["io_module", "Модуль дискретного ввода-вывода"], ["analog_module", "Модуль аналоговых измерений"],
    ["trip_relay", "Выходное реле отключения"], ["close_relay", "Выходное реле включения"],
    ["lockout_relay", "Реле блокировки повторного включения"], ["interposing_relay", "Промежуточное реле"],
    ["trip_supervision", "Устройство контроля цепи отключения"], ["test_block", "Испытательный блок токовых и напряженческих цепей"],
    ["dc_mcb", "Аппарат защиты оперативного постоянного тока"], ["control_fuse", "Предохранитель цепи управления"],
    ["time_sync", "Приёмник синхронизации времени"], ["event_recorder", "Регистратор аварийных событий"],
    ["gateway", "Шлюз диспетчерского протокола"], ["managed_switch", "Промышленный сетевой коммутатор"],
  ], { minimal: true }),
  ...rows("rza", "Измерительные и оперативные цепи", "material", "item", "INTERNAL_WIRING_TERMINALS", [
    ["ct_terminal", "Размыкаемая клемма цепи трансформатора тока"], ["vt_terminal", "Клемма цепи трансформатора напряжения"],
    ["trip_terminal", "Клемма цепи отключения"], ["close_terminal", "Клемма цепи включения"],
    ["test_socket", "Испытательное гнездо вторичной цепи"], ["terminal_jumper", "Функциональная перемычка клемм"],
    ["control_wire", "Провод вторичной цепи точного сечения"], ["shielded_cable", "Экранированный контрольный кабель"],
    ["fiber_patch", "Оптический соединительный шнур"], ["network_patch", "Промышленный сетевой соединительный шнур"],
    ["ferrule", "Втулочный наконечник вторичной цепи"], ["wire_marker", "Маркер каждого проводника вторичной цепи"],
  ]),
  ...rows("rza_engineering", "Расчёты РЗА", "subcontract_service", "service", "PROTECTION_SELECTIVITY", [
    ["fault_study", "Расчёт токов короткого замыкания для РЗА"], ["coordination", "Исследование селективности и координации защит"],
    ["setting_calculation", "Расчёт уставок каждой функции защиты"], ["ct_check", "Проверка выбора и насыщения трансформаторов тока"],
    ["vt_check", "Проверка нагрузки цепей трансформаторов напряжения"], ["trip_circuit_check", "Расчёт надёжности цепи отключения"],
    ["dc_load", "Расчёт нагрузки оперативного постоянного тока"], ["logic_design", "Разработка функциональной логики защит"],
    ["cause_effect", "Разработка матрицы воздействий"], ["protocol_mapping", "Разработка карты диспетчерских сигналов"],
    ["cyber_boundary", "Согласование границы доступа и конфигурации сети"], ["settings_approval", "Согласование уставок с владельцем сети"],
  ], { normative_source_id: KG_PNR }),
  ...rows("rza_config", "Конфигурирование", "labor", "man_hour", "INSTALL_REPAIR_OPERATIONS", [
    ["firmware", "Проверка и фиксация версии встроенного ПО"], ["parameterize", "Ввод утверждённых уставок"],
    ["logic", "Конфигурирование логики"], ["io_map", "Настройка карты входов и выходов"],
    ["communications", "Настройка коммуникационного протокола"], ["time_sync", "Настройка синхронизации времени"],
    ["event_record", "Настройка осциллографии и журнала событий"], ["access_control", "Настройка ролей доступа"],
    ["backup", "Создание резервной копии конфигурации"], ["checksum", "Фиксация контрольной суммы файлов конфигурации"],
  ]),
  ...rows("rza_test", "Испытания РЗА", "testing", "test", "FUNCTIONAL_TESTS", [
    ["ct_continuity", "Проверка непрерывности токовой цепи"], ["ct_polarity", "Проверка полярности токовой цепи"],
    ["vt_continuity", "Проверка цепи напряжения"], ["trip_continuity", "Проверка цепи отключения"],
    ["close_continuity", "Проверка цепи включения"], ["binary_input", "Проверка каждого дискретного входа"],
    ["binary_output", "Проверка каждого дискретного выхода"], ["analog_scaling", "Проверка масштабирования аналоговых величин"],
    ["secondary_current", "Вторичная инъекция токовой функции"], ["secondary_voltage", "Вторичная инъекция функции напряжения"],
    ["directional", "Проверка направленной функции защиты"], ["differential", "Проверка дифференциальной функции"],
    ["distance", "Проверка дистанционной функции"], ["earth_fault", "Проверка защиты от замыкания на землю"],
    ["overcurrent", "Проверка максимальной токовой защиты"], ["under_voltage", "Проверка минимального напряжения"],
    ["over_voltage", "Проверка максимального напряжения"], ["frequency", "Проверка частотной функции"],
    ["breaker_failure", "Проверка УРОВ"], ["auto_reclose", "Проверка автоматического повторного включения"],
    ["intertrip", "Проверка межобъектной команды отключения"], ["interlock", "Проверка логических блокировок"],
    ["trip_coil", "Проверка воздействия на катушку отключения"], ["close_coil", "Проверка воздействия на катушку включения"],
    ["scada_point", "End-to-end проверка диспетчерского сигнала"], ["soe", "Проверка последовательности событий"],
    ["time_accuracy", "Проверка точности синхронизации времени"], ["failover", "Проверка отказоустойчивого коммуникационного пути"],
  ], { normative_source_id: KG_PNR }),
  ...rows("rza_instrument", "Специальные приборы РЗА", "equipment", "machine_hour", "MEASUREMENT_CALIBRATION", [
    ["secondary_injection", "Поверенная установка вторичной инъекции"], ["primary_injection", "Установка первичного тока по применимости"],
    ["protocol_analyzer", "Анализатор промышленного протокола"], ["time_analyzer", "Анализатор времени срабатывания"],
    ["fiber_meter", "Измеритель оптического канала"], ["dc_load", "Регулируемая нагрузка оперативного тока"],
  ], { normative_source_id: KG_PNR }),
  ...rows("rza_doc", "Документы РЗА", "documentation", "document", "RECORDS_DRAWINGS_PROTOCOLS", [
    ["settings_file", "Утверждённый файл уставок"], ["settings_record", "Ведомость фактически введённых уставок"],
    ["logic_diagram", "Исполнительная логическая схема"], ["cause_effect", "Исполнительная матрица воздействий"],
    ["io_schedule", "Исполнительная ведомость входов и выходов"], ["signal_list", "Исполнительный перечень диспетчерских сигналов"],
    ["test_protocol", "Протокол проверки каждой функции защиты"], ["end_to_end", "Протокол end-to-end испытаний"],
    ["configuration_backup", "Архив конфигурации с контрольной суммой"], ["commissioning_report", "Отчёт комплексного опробования РЗА"],
  ]),
]);

const UPS_STORAGE = Object.freeze([
  ...rows("ups", "Преобразовательное оборудование", "material", "item", "PRIMARY_EQUIPMENT", [
    ["rectifier", "Выпрямительный модуль точной мощности"], ["inverter", "Инверторный модуль точной мощности"],
    ["static_bypass", "Статический байпас"], ["manual_bypass", "Ручной сервисный байпас"],
    ["input_breaker", "Входной аппарат защиты"], ["output_breaker", "Выходной аппарат защиты"],
    ["battery_breaker", "Аппарат защиты батарейной цепи"], ["dc_fuse", "Предохранитель батарейной ветви"],
    ["isolation_transformer", "Изолирующий трансформатор по проекту"], ["output_distribution", "Выходное распределительное устройство"],
    ["monitor", "Панель локального мониторинга"], ["communication", "Коммуникационный интерфейс UPS"],
  ], { minimal: true, normative_source_id: EAEU_LV }),
  ...rows("battery", "Аккумуляторная система", "material", "item", "PRIMARY_EQUIPMENT", [
    ["cell", "Аккумуляторный элемент точной химии и ёмкости"], ["module", "Аккумуляторный модуль"],
    ["rack", "Аккумуляторная стойка"], ["cabinet", "Аккумуляторный шкаф"], ["tray", "Лоток аккумуляторного модуля"],
    ["interlink", "Межэлементная перемычка"], ["tier_link", "Межъярусная перемычка"], ["string_link", "Межстринговая перемычка"],
    ["terminal_cover", "Изолирующая крышка вывода"], ["rack_insulator", "Изолятор аккумуляторной стойки"],
    ["temperature_sensor", "Датчик температуры батареи"], ["string_monitor", "Монитор аккумуляторной ветви"],
    ["bms_controller", "Контроллер управления батареей"], ["electrolyte_tray", "Поддон удержания электролита по применимости"],
    ["warning_label", "Предупреждающая маркировка батарейной системы"],
  ]),
  ...CABLE,
  r({ candidate_id: "ups_interface_ventilation", title_ru: "Передача HVAC-владельцу тепловыделений и требований вентиляции", section_ru: "Typed-child interfaces", category: "subcontract_service", unit_id: "service", completeness_slot_v2: "TYPED_CHILD_INTERFACES", owner: "HVAC_TYPED_CHILD", applicability: "Информационный interface без повторной стоимости HVAC." }),
  r({ candidate_id: "ups_interface_fire", title_ru: "Передача Fire-владельцу характеристик батарейной опасности", section_ru: "Typed-child interfaces", category: "subcontract_service", unit_id: "service", completeness_slot_v2: "TYPED_CHILD_INTERFACES", owner: "FIRE_TYPED_CHILD", applicability: "Информационный interface без повторной стоимости Fire." }),
  r({ candidate_id: "ups_interface_floor", title_ru: "Передача Structural-владельцу точечных и распределённых нагрузок", section_ru: "Typed-child interfaces", category: "subcontract_service", unit_id: "service", completeness_slot_v2: "TYPED_CHILD_INTERFACES", owner: "STRUCTURAL_TYPED_CHILD", applicability: "Информационный interface без повторной стоимости Structural." }),
  r({ candidate_id: "ups_interface_controls", title_ru: "Передача Controls-владельцу точек мониторинга", section_ru: "Typed-child interfaces", category: "subcontract_service", unit_id: "service", completeness_slot_v2: "TYPED_CHILD_INTERFACES", owner: "CONTROLS_TYPED_CHILD", applicability: "Информационный interface без повторной стоимости Controls." }),
  ...rows("ups_engineering", "Расчёты резервного питания", "subcontract_service", "service", "SPECIAL_SERVICES_COORDINATION", [
    ["critical_load", "Расчёт критической нагрузки"], ["demand", "Расчёт расчётной мощности UPS"],
    ["redundancy", "Проверка требуемой резервируемости"], ["autonomy", "Расчёт требуемой автономии"],
    ["battery_capacity", "Расчёт ёмкости батареи с температурой и старением"], ["dc_current", "Расчёт максимального постоянного тока"],
    ["short_circuit", "Расчёт тока короткого замыкания батареи"], ["cable_drop", "Расчёт падения напряжения DC-соединений"],
    ["heat_release", "Расчёт тепловыделений оборудования"], ["floor_load", "Расчёт нагрузки на перекрытие"],
  ]),
  ...rows("ups_work", "Монтаж резервного питания", "labor", "man_hour", "INSTALL_REPAIR_OPERATIONS", [
    ["delivery_acceptance", "Приёмка оборудования и проверка индикаторов транспортировки"], ["unpack", "Контролируемая распаковка"],
    ["position", "Такелаж и позиционирование модулей"], ["anchor", "Анкеровка шкафов и стоек"],
    ["module_assembly", "Сборка преобразовательных модулей"], ["rack_assembly", "Сборка аккумуляторных стоек"],
    ["cell_install", "Установка каждого аккумуляторного элемента"], ["interlink", "Монтаж межэлементных перемычек"],
    ["torque", "Контроль момента каждого DC-соединения"], ["polarity", "Проверка полярности до замыкания цепи"],
    ["power_connect", "Подключение входных и выходных силовых цепей"], ["control_connect", "Подключение мониторинга и управления"],
    ["earth", "Заземление шкафов и стоек"], ["settings", "Ввод проектных настроек"],
    ["initial_charge", "Первоначальный контролируемый заряд батареи"], ["clean", "Очистка и подготовка к пуску"],
  ]),
  ...rows("ups_test", "Испытания резервного питания", "testing", "test", "INTEGRATED_COMMISSIONING", [
    ["visual", "Визуальный контроль оборудования и батарей"], ["torque", "Аудит момента DC-соединений"],
    ["insulation", "Измерение сопротивления изоляции силовых цепей"], ["polarity", "Проверка полярности батарейной системы"],
    ["cell_voltage", "Измерение напряжения каждого элемента"], ["string_voltage", "Измерение напряжения каждой батарейной ветви"],
    ["startup", "Первичный запуск UPS"], ["no_load", "Функциональная проверка без нагрузки"],
    ["load_25", "Испытание при контрольной частичной нагрузке"], ["load_50", "Испытание при средней нагрузке"],
    ["load_100", "Испытание при расчётной нагрузке"], ["mains_failure", "Имитация отказа основного питания"],
    ["battery_transfer", "Проверка перехода на батарею"], ["static_bypass", "Проверка статического байпаса"],
    ["manual_bypass", "Проверка сервисного байпаса"], ["recovery", "Проверка восстановления после возврата сети"],
    ["alarm", "Проверка каждой предусмотренной сигнализации"], ["communication", "Проверка передачи параметров мониторинга"],
    ["autonomy", "Испытание подтверждённой длительности автономии"], ["recharge", "Контроль восстановления заряда"],
    ["thermal", "Тепловизионный контроль под нагрузкой"], ["failover", "Проверка резервирования модулей"],
  ], { normative_source_id: KG_PNR }),
  ...rows("ups_doc", "Документы резервного питания", "documentation", "document", "RECORDS_DRAWINGS_PROTOCOLS", [
    ["battery_record", "Индивидуальная ведомость аккумуляторных элементов"], ["torque_record", "Ведомость моментов DC-соединений"],
    ["settings", "Ведомость настроек UPS"], ["load_protocol", "Протокол нагрузочного испытания"],
    ["autonomy_protocol", "Протокол испытания автономии"], ["alarm_matrix", "Исполнительная матрица сигналов"],
    ["single_line", "Исполнительная однолинейная схема резервного питания"], ["om_manual", "Инструкция эксплуатации и обслуживания"],
    ["warranty", "Реестр гарантийных сроков модулей и батарей"], ["spares", "Передаточная ведомость запасных частей"],
  ]),
]);

const SUBSTATION = Object.freeze([
  ...rows("substation", "Силовые трансформаторы", "material", "item", "PRIMARY_EQUIPMENT", [
    ["transformer", "Силовой трансформатор точной мощности, класса напряжения и схемы соединения"],
    ["hv_bushing", "Ввод высокого напряжения трансформатора"], ["lv_bushing", "Ввод низкого напряжения трансформатора"],
    ["neutral_bushing", "Нейтральный ввод трансформатора"], ["tap_changer", "Устройство регулирования напряжения"],
    ["temperature_indicator", "Указатель температуры трансформатора"], ["pressure_device", "Устройство контроля давления"],
    ["gas_relay", "Газовое реле маслонаполненного трансформатора"], ["oil_level", "Указатель уровня масла"],
    ["breather", "Воздухоосушитель трансформатора"], ["cooling_fan", "Вентилятор охлаждения трансформатора"],
    ["marshalling_box", "Шкаф вторичных соединений трансформатора"], ["wheel_stop", "Упор перемещения трансформатора"],
  ], { minimal: true, normative_source_id: EAEU_LV }),
  ...rows("substation", "Распределительное устройство", "material", "item", "PRIMARY_EQUIPMENT", [
    ["incoming_cell", "Вводная ячейка распределительного устройства"], ["outgoing_cell", "Отходящая ячейка распределительного устройства"],
    ["transformer_cell", "Ячейка присоединения трансформатора"], ["section_cell", "Секционная ячейка"],
    ["metering_cell", "Измерительная ячейка"], ["bus_riser_cell", "Ячейка подъёма шин"],
    ["circuit_breaker", "Высоковольтный выключатель точного типа"], ["disconnector", "Разъединитель"],
    ["earthing_switch", "Заземляющий разъединитель"], ["load_break_switch", "Выключатель нагрузки"],
    ["hv_fuse", "Высоковольтный предохранитель"], ["surge_arrester", "Ограничитель перенапряжений"],
    ["current_transformer", "Трансформатор тока"], ["voltage_transformer", "Трансформатор напряжения"],
    ["arc_protection", "Датчик дуговой защиты"], ["mechanical_interlock", "Механическая блокировка коммутационных аппаратов"],
  ]),
  ...rows("substation", "Шины и силовые соединения", "material", "m", "CABLES_CONDUCTORS", [
    ["hv_bus", "Шина высокого напряжения точного сечения"], ["lv_bus", "Шина низкого напряжения точного сечения"],
    ["neutral_bus", "Нейтральная шина"], ["earth_bus", "Магистральная шина заземления"],
    ["busduct", "Шинопровод точного номинала"], ["flexible_link", "Гибкая силовая связь"],
  ]),
  ...rows("substation", "Собственные нужды", "material", "item", "PRIMARY_EQUIPMENT", [
    ["ac_board", "Щит переменного тока собственных нужд"], ["dc_board", "Щит оперативного постоянного тока"],
    ["battery_charger", "Зарядное устройство оперативного тока"], ["station_battery", "Аккумуляторная батарея оперативного тока"],
    ["aux_transformer", "Трансформатор собственных нужд"], ["emergency_lighting", "Аварийное освещение помещения РУ"],
    ["space_heater", "Антиконденсатный обогрев ячейки"], ["socket_service", "Сервисная розетка обслуживания"],
  ]),
  r({ candidate_id: "substation_interface_foundation", title_ru: "Передача Structural-владельцу нагрузок и анкерного плана", section_ru: "Typed-child interfaces", category: "subcontract_service", unit_id: "service", completeness_slot_v2: "TYPED_CHILD_INTERFACES", owner: "STRUCTURAL_TYPED_CHILD", applicability: "Информационный interface без повторной стоимости Structural." }),
  r({ candidate_id: "substation_interface_oil_containment", title_ru: "Передача Civil-владельцу объёма маслоприёмного устройства", section_ru: "Typed-child interfaces", category: "subcontract_service", unit_id: "service", completeness_slot_v2: "TYPED_CHILD_INTERFACES", owner: "CIVIL_TYPED_CHILD", applicability: "Информационный interface без повторной стоимости Civil." }),
  r({ candidate_id: "substation_interface_ventilation", title_ru: "Передача HVAC-владельцу тепловыделений и воздухообмена", section_ru: "Typed-child interfaces", category: "subcontract_service", unit_id: "service", completeness_slot_v2: "TYPED_CHILD_INTERFACES", owner: "HVAC_TYPED_CHILD", applicability: "Информационный interface без повторной стоимости HVAC." }),
  r({ candidate_id: "substation_interface_fire", title_ru: "Передача Fire-владельцу сценариев и пожарной нагрузки", section_ru: "Typed-child interfaces", category: "subcontract_service", unit_id: "service", completeness_slot_v2: "TYPED_CHILD_INTERFACES", owner: "FIRE_TYPED_CHILD", applicability: "Информационный interface без повторной стоимости Fire." }),
  r({ candidate_id: "substation_interface_controls", title_ru: "Передача Controls-владельцу диспетчерских точек", section_ru: "Typed-child interfaces", category: "subcontract_service", unit_id: "service", completeness_slot_v2: "TYPED_CHILD_INTERFACES", owner: "CONTROLS_TYPED_CHILD", applicability: "Информационный interface без повторной стоимости Controls." }),
  ...rows("substation_work", "Монтаж подстанции", "labor", "man_hour", "INSTALL_REPAIR_OPERATIONS", [
    ["delivery_acceptance", "Приёмка тяжёлого оборудования по транспортным индикаторам"], ["unpack", "Контролируемая распаковка оборудования"],
    ["rigging_plan", "Реализация утверждённого плана такелажа"], ["transformer_position", "Позиционирование силового трансформатора"],
    ["switchgear_position", "Позиционирование секций распределительного устройства"], ["alignment", "Геодезическая выверка оборудования"],
    ["anchor", "Анкеровка оборудования"], ["cell_join", "Механическое соединение секций РУ"],
    ["bus_assembly", "Сборка и соединение главных шин"], ["bus_torque", "Контроль момента каждого шинного соединения"],
    ["transformer_assembly", "Монтаж транспортно-снятых узлов трансформатора"], ["oil_operation", "Подготовка и обработка изоляционного масла по применимости"],
    ["hv_connect", "Подключение цепей высокого напряжения"], ["lv_connect", "Подключение цепей низкого напряжения"],
    ["control_connect", "Подключение вторичных цепей"], ["earthing", "Заземление каждого корпуса и нейтрали"],
    ["auxiliary_connect", "Подключение собственных нужд"], ["label", "Маркировка оборудования, приводов и цепей"],
    ["mechanical_check", "Механическая проверка приводов"], ["clean", "Очистка изоляции и внутренних отсеков"],
  ]),
  ...rows("substation_test", "Испытания трансформатора", "testing", "test", "ELECTRICAL_TESTS", [
    ["insulation", "Измерение сопротивления изоляции обмоток"], ["ratio", "Измерение коэффициента трансформации"],
    ["winding_resistance", "Измерение сопротивления обмоток постоянному току"], ["vector_group", "Проверка группы соединения обмоток"],
    ["tan_delta", "Измерение тангенса угла диэлектрических потерь по применимости"], ["oil_breakdown", "Испытание пробивного напряжения масла"],
    ["oil_lab", "Лабораторный анализ изоляционного масла"], ["bushing", "Испытание вводов трансформатора"],
    ["core_earth", "Проверка заземления магнитопровода"], ["tap_changer", "Проверка устройства регулирования"],
    ["protection", "Проверка технологических защит трансформатора"], ["cooling", "Проверка системы охлаждения"],
  ], { normative_source_id: KG_PNR }),
  ...rows("substation_test", "Испытания распределительного устройства", "testing", "test", "FUNCTIONAL_TESTS", [
    ["bus_insulation", "Измерение сопротивления изоляции шин"], ["contact_resistance", "Измерение переходного сопротивления главной цепи"],
    ["breaker_timing", "Измерение времени включения и отключения выключателя"], ["breaker_travel", "Проверка хода механизма выключателя"],
    ["ct_ratio", "Проверка коэффициента трансформации и полярности ТТ"], ["vt_ratio", "Проверка коэффициента трансформации и полярности ТН"],
    ["interlock", "Проверка механических и электрических блокировок"], ["earthing_switch", "Проверка заземляющего разъединителя"],
    ["partial_discharge", "Контроль частичных разрядов по применимости"], ["withstand", "Испытание повышенным напряжением по применимости"],
    ["arc_protection", "Проверка дуговой защиты"], ["remote_control", "Проверка дистанционного управления"],
  ], { normative_source_id: KG_PNR }),
  ...rows("substation_commission", "Комплексное опробование", "testing", "test", "INTEGRATED_COMMISSIONING", [
    ["phase_check", "Проверка фазировки перед включением"], ["protection_settings", "Проверка утверждённых уставок защит"],
    ["trip_matrix", "Проверка матрицы отключений"], ["alarm_matrix", "Проверка матрицы сигнализации"],
    ["scada", "End-to-end проверка диспетчерского управления"], ["pre_energization", "Комиссионная проверка готовности к включению"],
    ["phased_energization", "Поэтапная подача напряжения"], ["no_load_monitor", "Наблюдение трансформатора на холостом ходу"],
    ["load_monitor", "Наблюдение под расчётной нагрузкой"], ["thermal_scan", "Тепловизионный контроль под нагрузкой"],
    ["noise_vibration", "Контроль шума и вибрации"], ["final_trip", "Контрольное отключение защитой"],
  ], { normative_source_id: KG_PNR }),
  ...rows("substation_doc", "Документы подстанции", "documentation", "document", "RECORDS_DRAWINGS_PROTOCOLS", [
    ["equipment_register", "Исполнительный реестр оборудования и серийных номеров"], ["transformer_passport", "Паспорт силового трансформатора"],
    ["switchgear_passport", "Паспорт распределительного устройства"], ["bus_torque", "Ведомость моментов шинных соединений"],
    ["oil_record", "Журнал операций с изоляционным маслом"], ["test_package", "Сводный комплект протоколов электрических испытаний"],
    ["settings", "Ведомость уставок защит"], ["single_line", "Исполнительная однолинейная схема"],
    ["secondary_diagrams", "Исполнительные схемы вторичных соединений"], ["cable_schedule", "Исполнительная кабельная ведомость"],
    ["energization_program", "Утверждённая программа включения"], ["commissioning_report", "Отчёт комплексного опробования"],
    ["training_record", "Протокол обучения эксплуатационного персонала"], ["spares", "Передаточная ведомость запасных частей"],
  ]),
]);

const COMMISSIONING_ONLY = Object.freeze([
  ...RZA,
  ...rows("commission", "Программа испытаний", "subcontract_service", "service", "SPECIAL_SERVICES_COORDINATION", [
    ["scope", "Разработка точной программы электрических испытаний"], ["risk", "Оценка рисков испытаний и подачи напряжения"],
    ["permit", "Координация допуска к испытаниям"], ["witness", "Организация присутствия владельца и заинтересованных сторон"],
    ["criteria", "Фиксация критериев приёмки каждого испытания"],
  ], { normative_source_id: KG_PNR }),
]);

const OPERATION_ROWS: Readonly<Record<string, readonly ElectricalMaximumResourceCandidateV2[]>> = Object.freeze({
  PREPARE: rows("op_prepare", "Подготовительные операции", "labor", "man_hour", "INSTALL_REPAIR_OPERATIONS", [
    ["document", "Проверка исходных данных выбранной операции"], ["survey", "Обследование рабочей зоны"],
    ["setout", "Разметка точек и границ работы"], ["protection", "Защита действующих систем и отделки"],
    ["material_stage", "Комплектование материалов по проектной позиции"], ["handover", "Передача подготовленного фронта владельцу следующей операции"],
  ], { minimal: true }),
  INSTALL: rows("op_install", "Монтажные операции", "labor", "man_hour", "INSTALL_REPAIR_OPERATIONS", [
    ["accept", "Приёмка основания и изделия"], ["mark", "Точная разметка креплений"], ["prepare", "Подготовка основания"],
    ["fix", "Монтаж креплений"], ["position", "Установка и позиционирование изделия"], ["align", "Выравнивание изделия"],
    ["secure", "Окончательное закрепление"], ["torque", "Контроль момента соединений"], ["label", "Маркировка установленного изделия"],
    ["inspect", "Операционный контроль монтажа"],
  ], { minimal: true }),
  LAY: rows("op_lay", "Прокладка", "labor", "man_hour", "INSTALL_REPAIR_OPERATIONS", [
    ["route", "Приёмка и разметка трассы"], ["uncoil", "Раскатка линейного материала"], ["pull", "Протяжка по подготовленной трассе"],
    ["lay", "Укладка с контролем геометрии"], ["fix", "Крепление с проектным шагом"], ["bend", "Контроль радиусов изгиба"],
    ["end", "Оформление концов линейного участка"], ["inspect", "Операционный контроль проложенного участка"],
  ], { minimal: true }),
  CONNECT: rows("op_connect", "Подключение", "labor", "man_hour", "INSTALL_REPAIR_OPERATIONS", [
    ["identify", "Идентификация цепи и точки подключения"], ["prepare", "Разделка и подготовка проводников"],
    ["terminate", "Оконцевание каждого проводника"], ["connect", "Подключение каждого проводника"],
    ["torque", "Контроль момента клеммного соединения"], ["bond", "Присоединение защитного проводника"],
    ["mark", "Маркировка каждого конца"], ["point_check", "Поточечная проверка подключения"],
  ], { minimal: true }),
  MARK: rows("op_mark", "Маркировка", "labor", "man_hour", "INSTALL_REPAIR_OPERATIONS", [
    ["schedule", "Сверка маркировочной ведомости"], ["prepare", "Подготовка поверхности маркировки"],
    ["print", "Изготовление стойкой маркировки"], ["install", "Установка маркировки"], ["verify", "Поточечная сверка с исполнительной схемой"],
    ["update", "Актуализация ведомости маркировки"],
  ], { minimal: true }),
  TEST: rows("op_test", "Электроизмерительные операции", "labor", "man_hour", "ELECTRICAL_TESTS", [
    ["program", "Проверка программы и критериев испытаний"], ["isolate", "Подготовка безопасной схемы испытания"],
    ["instrument", "Подключение поверенного прибора"], ["measure", "Выполнение отдельного измерения"],
    ["evaluate", "Сопоставление результата с критерием"], ["restore", "Восстановление штатной схемы"],
    ["protocol", "Оформление протокола с данными прибора"],
  ], { minimal: true, normative_source_id: KG_ACCEPT }),
  COMMISSION: rows("op_commission", "Пусконаладочные операции", "labor", "man_hour", "INTEGRATED_COMMISSIONING", [
    ["program", "Разработка программы функционального опробования"], ["precheck", "Предпусковая проверка монтажа"],
    ["settings", "Ввод утверждённых настроек"], ["function", "Проверка штатной функции"],
    ["failure", "Проверка предусмотренного отказного режима"], ["interlock", "Проверка блокировок"],
    ["energize", "Контролируемая подача напряжения"], ["monitor", "Наблюдение в рабочем режиме"],
    ["record", "Оформление результатов наладки"], ["handover", "Передача владельцу системы"],
  ], { minimal: true, normative_source_id: KG_PNR }),
  REPLACE: rows("op_replace", "Ремонт и замена", "labor", "man_hour", "INSTALL_REPAIR_OPERATIONS", [
    ["diagnose", "Диагностика причины дефекта"], ["trace", "Идентификация всех связанных цепей"],
    ["temporary", "Организация согласованной временной схемы по применимости"], ["isolate", "Безопасное отключение заменяемого участка"],
    ["record", "Фотофиксация исходного состояния"], ["disconnect", "Маркировка и отключение проводников"],
    ["dismantle", "Контролируемый демонтаж дефектного изделия"], ["sort", "Сортировка демонтированных материалов"],
    ["base_repair", "Восстановление монтажного основания"], ["install", "Монтаж нового изделия"],
    ["reconnect", "Восстановление подключений"], ["test", "Повторные электрические испытания"],
    ["restore", "Восстановление штатного режима"], ["closeout", "Оформление дефектной и исполнительной ведомости"],
  ], { minimal: true }),
});

const CONTAINMENT_FAMILIES = new Set(["CABLE_CHANNEL", "cable_ducts"]);
const CABLE_FAMILIES = new Set(["POWER_CABLE", "VVG_CABLE", "cable_pulling"]);
const PROTECTION_FAMILIES = new Set(["BREAKER", "RCD"]);
const DEVICE_FAMILIES = new Set(["SOCKET", "SWITCH"]);
const LIGHTING_FAMILIES = new Set(["LIGHTING", "LED_STRIP"]);
const PANEL_FAMILIES = new Set(["PANEL", "distribution_board_outdoor"]);
const EXTERNAL_FAMILIES = new Set(["cable_trench", "cable_trench_energy", "underground_cable_line"]);
const POLE_FAMILIES = new Set([
  "electrical_poles_04kv", "electrical_poles_10kv", "electrical_poles_35kv", "electrical_poles_110kv",
  "overhead_power_line_04kv", "overhead_power_line_10kv", "overhead_power_line_35kv", "overhead_power_line_110kv",
  "street_lighting_poles",
]);
const SUBSTATION_FAMILIES = new Set([
  "distribution_substation", "outdoor_switchgear", "package_transformer_substation",
  "substation_10kv", "substation_35kv", "substation_110kv", "transformer_substation",
]);

function familyRows(family: string): readonly ElectricalMaximumResourceCandidateV2[] {
  if (CONTAINMENT_FAMILIES.has(family)) return CONTAINMENT;
  if (CABLE_FAMILIES.has(family)) return CABLE;
  if (PROTECTION_FAMILIES.has(family)) return PROTECTION_DEVICE;
  if (DEVICE_FAMILIES.has(family)) return SMALL_DEVICE;
  if (LIGHTING_FAMILIES.has(family)) return LIGHTING;
  if (PANEL_FAMILIES.has(family)) return PANEL;
  if (family === "grounding_system") return GROUNDING.filter((item) => !item.candidate_id.startsWith("lightning_"));
  if (family === "lightning_protection") return GROUNDING;
  if (EXTERNAL_FAMILIES.has(family)) return EXTERNAL_NETWORK;
  if (POLE_FAMILIES.has(family)) return OVERHEAD_LINE;
  if (family === "relay_protection_automation") return RZA;
  if (family === "battery_energy_storage") return UPS_STORAGE;
  if (SUBSTATION_FAMILIES.has(family)) return [...PANEL, ...CABLE, ...GROUNDING, ...RZA, ...SUBSTATION];
  if (family === "electrical_testing_commissioning") return COMMISSIONING_ONLY;
  return [];
}

function baseOperationFamilyRows(row: ElectricalDomainInventoryRow): readonly ElectricalMaximumResourceCandidateV2[] {
  const family = familyRows(row.electrical_family);
  if (row.operation_class === "PREPARE") return family.filter((item) => ["DESIGN_INPUT_BASIS", "SURVEY_PREPARATION", "MARKING_WARNINGS", "PRIMARY_EQUIPMENT"].includes(item.completeness_slot_v2)).slice(0, 10);
  if (row.operation_class === "MARK") return family.filter((item) => ["MARKING_WARNINGS", "RECORDS_DRAWINGS_PROTOCOLS", "INTERNAL_WIRING_TERMINALS"].includes(item.completeness_slot_v2)).slice(0, 14);
  if (row.operation_class === "TEST") return family.filter((item) => item.category === "testing" || item.completeness_slot_v2 === "MEASUREMENT_CALIBRATION" || item.completeness_slot_v2 === "PROTECTION_SELECTIVITY");
  if (row.operation_class === "COMMISSION") return family.filter((item) => item.category === "testing" || item.category === "documentation" || item.completeness_slot_v2 === "PROTECTION_SELECTIVITY");
  if (row.operation_class === "CONNECT") return family.filter((item) => item.candidate_id === "lighting_safety_wire" || ["TERMINATIONS_JOINTS", "GLANDS_SEALS_PENETRATIONS", "INTERNAL_WIRING_TERMINALS", "EARTHING_BONDING", "INSTALL_REPAIR_OPERATIONS", "ELECTRICAL_TESTS"].includes(item.completeness_slot_v2));
  if (row.operation_class === "LAY") return family.filter((item) => ["PRIMARY_EQUIPMENT", "CABLES_CONDUCTORS", "CONTAINMENT", "SUPPORTS_EMBEDMENTS", "FASTENERS", "INSTALL_REPAIR_OPERATIONS", "RIGGING_MACHINERY", "MARKING_WARNINGS"].includes(item.completeness_slot_v2));
  return family;
}

function deduplicate(values: readonly ElectricalMaximumResourceCandidateV2[]): ElectricalMaximumResourceCandidateV2[] {
  const result = new Map<string, ElectricalMaximumResourceCandidateV2>();
  for (const value of values) if (!result.has(value.candidate_id)) result.set(value.candidate_id, value);
  return [...result.values()];
}

function identitySpecificCandidateV2(row: ElectricalDomainInventoryRow, candidate: ElectricalMaximumResourceCandidateV2): ElectricalMaximumResourceCandidateV2 {
  const operationIdentityCandidate: Readonly<Record<string, string>> = Object.freeze({
    PREPARE: "op_prepare_document",
    INSTALL: "op_install_accept",
    LAY: "op_lay_route",
    CONNECT: "op_connect_identify",
    MARK: "op_mark_schedule",
    TEST: "op_test_program",
    COMMISSION: "op_commission_program",
    REPLACE: "op_replace_diagnose",
  });
  if (candidate.candidate_id === operationIdentityCandidate[row.operation_class]) {
    const familyIdentity = row.electrical_family.replace(/[^a-z0-9]+/giu, "_").replace(/^_+|_+$/gu, "").toLocaleLowerCase("en-US");
    const familyLabelRu = electricalFamilyLabelRuV2(row.electrical_family);
    return {
      ...candidate,
      candidate_id: `${candidate.candidate_id}_${familyIdentity}`,
      title_ru: `${candidate.title_ru} — ${familyLabelRu}`,
      applicability: `${candidate.applicability} Exact operation object: ${row.electrical_family}.`,
    };
  }
  const replacements: Readonly<Record<string, Readonly<Record<string, string>>>> = Object.freeze({
    BREAKER: { protection_device: "protection_breaker_device" },
    RCD: { protection_device: "protection_rcd_device" },
    SOCKET: { device_mechanism: "device_socket_mechanism" },
    SWITCH: { device_mechanism: "device_switch_mechanism" },
    LED_STRIP: { lighting_luminaire: "lighting_led_strip_system" },
    VVG_CABLE: { cable_power: "cable_vvg" },
  });
  const candidateId = replacements[row.electrical_family]?.[candidate.candidate_id];
  if (!candidateId) return candidate;
  const familyLabelRu = electricalFamilyLabelRuV2(row.electrical_family);
  return {
    ...candidate,
    candidate_id: candidateId,
    title_ru: `${candidate.title_ru} — ${familyLabelRu}`,
    applicability: `${candidate.applicability} Exact physical identity: ${row.electrical_family}.`,
  };
}

export function electricalComplexityClassV2(row: ElectricalDomainInventoryRow): ElectricalComplexityClassV2 {
  if (row.operation_class === "REPLACE") return "E_INTEGRATED_REPAIR_RETROFIT";
  if (SUBSTATION_FAMILIES.has(row.electrical_family)) return "E_SUBSTATION_TRANSFORMER";
  if (row.electrical_family === "battery_energy_storage") return "E_UPS_STORAGE_BACKUP";
  if (row.electrical_family === "relay_protection_automation" || row.electrical_family === "electrical_testing_commissioning") return "E_PROTECTION_AUTOMATION_METERING";
  if (EXTERNAL_FAMILIES.has(row.electrical_family) || POLE_FAMILIES.has(row.electrical_family)) return "E_EXTERNAL_NETWORK";
  if (row.electrical_family === "grounding_system" || row.electrical_family === "lightning_protection") return "E_GROUNDING_LIGHTNING";
  if (PANEL_FAMILIES.has(row.electrical_family)) return "E_PANEL_SWITCHBOARD";
  if (LIGHTING_FAMILIES.has(row.electrical_family)) return "E_LIGHTING_SYSTEM";
  if (CABLE_FAMILIES.has(row.electrical_family)) return "E_CABLE_FEEDER";
  if (CONTAINMENT_FAMILIES.has(row.electrical_family)) return "E_CONTAINMENT_SYSTEM";
  if (["PREPARE", "MARK", "TEST"].includes(row.operation_class)) return "E_ATOMIC";
  return "E_SMALL_ASSEMBLY";
}

export function electricalMaximumResourceCandidatesForV2(row: ElectricalDomainInventoryRow): readonly ElectricalMaximumResourceCandidateV2[] {
  const expanded = row.source_domain_id.startsWith("expanded:");
  const family = expanded ? familyRows(row.electrical_family) : baseOperationFamilyRows(row);
  const operation = expanded ? [] : (OPERATION_ROWS[row.operation_class] ?? []);
  const core = expanded || row.operation_class === "REPLACE" ? CORE_FULL : CORE_COMPACT;
  return Object.freeze(deduplicate([...core, ...operation, ...family]).map((rawCandidate) => {
    const candidate = identitySpecificCandidateV2(row, rawCandidate);
    return {
      ...candidate,
      normative_source_id: PRODUCTION_NORMATIVE_SOURCE_OVERRIDES_V2[candidate.candidate_id] ?? candidate.normative_source_id,
    };
  }));
}

export type ElectricalCandidateDispositionV2 =
  | "INCLUDED_AS_SEPARATE_ROW"
  | "INCLUDED_AS_EXPLICIT_COMPONENT_OF_VERIFIED_MANUFACTURER_BOM"
  | "PROJECT_INPUT_REQUIRED"
  | "OWNED_BY_EXACT_TYPED_CHILD"
  | "OWNED_BY_EXACT_PARENT"
  | "MUTUALLY_EXCLUSIVE_VARIANT_NOT_SELECTED"
  | "NOT_APPLICABLE_WITH_REASON";

export type ElectricalCompletenessDecisionV2 = {
  catalog_id: string;
  slot: ElectricalCompletenessSlotV2;
  disposition: ElectricalCandidateDispositionV2;
  candidate_ids: readonly string[];
  reason_ru: string;
};

const PARAMETER_ONLY_SLOTS = new Set<ElectricalCompletenessSlotV2>([
  "IDENTITY_PHYSICAL_RESULT", "TOPOLOGY_ROUTE_GEOMETRY", "LOAD_DEMAND_DUTY",
]);

export function electricalCompletenessDecisionsV2(row: ElectricalDomainInventoryRow): readonly ElectricalCompletenessDecisionV2[] {
  const candidates = electricalMaximumResourceCandidatesForV2(row);
  return Object.freeze(ELECTRICAL_COMPLETENESS_SLOTS_V2.map((slot) => {
    const matched = candidates.filter((candidate) => candidate.completeness_slot_v2 === slot);
    if (matched.length > 0) {
      const typedOnly = matched.every((candidate) => candidate.owner !== "ELECTRICAL");
      return {
        catalog_id: row.catalog_id,
        slot,
        disposition: typedOnly ? "OWNED_BY_EXACT_TYPED_CHILD" as const : "INCLUDED_AS_SEPARATE_ROW" as const,
        candidate_ids: matched.map((candidate) => candidate.candidate_id),
        reason_ru: typedOnly
          ? "Зафиксирована точная quantity/interface граница; стоимость принадлежит указанному typed child."
          : `Отдельно прослежено применимых ресурсов: ${matched.length}.`,
      };
    }
    if (PARAMETER_ONLY_SLOTS.has(slot)) return {
      catalog_id: row.catalog_id,
      slot,
      disposition: "PROJECT_INPUT_REQUIRED" as const,
      candidate_ids: [],
      reason_ru: "Слот задаёт идентичность или расчётный контекст и прослеживается через обязательный редактируемый PROJECT_INPUT, а не через фиктивную BOQ-строку.",
    };
    return {
      catalog_id: row.catalog_id,
      slot,
      disposition: "NOT_APPLICABLE_WITH_REASON" as const,
      candidate_ids: [],
      reason_ru: `Для операции ${row.operation_class} и результата ${row.electrical_family} отдельный ресурс этого слота физически не возникает; решение не наследуется от соседней работы.`,
    };
  }));
}

export function assertElectricalMaximumScopeV2(row: ElectricalDomainInventoryRow): void {
  const candidates = electricalMaximumResourceCandidatesForV2(row);
  const decisions = electricalCompletenessDecisionsV2(row);
  if (candidates.length === 0) throw new Error(`ELECTRICAL_V2_EMPTY_SCOPE:${row.catalog_id}`);
  if (new Set(candidates.map((candidate) => candidate.candidate_id)).size !== candidates.length) throw new Error(`ELECTRICAL_V2_DUPLICATE_CANDIDATE:${row.catalog_id}`);
  if (decisions.length !== 36 || decisions.some((decision) => !decision.disposition || !decision.reason_ru)) throw new Error(`ELECTRICAL_V2_COMPLETENESS_INVALID:${row.catalog_id}`);
  if (candidates.some((candidate) => /^(комплект|прочие материалы|кабель и комплектующие|щит в комплекте|электроизмерения)$/iu.test(candidate.title_ru.trim()))) {
    throw new Error(`ELECTRICAL_V2_FORBIDDEN_AGGREGATE:${row.catalog_id}`);
  }
}
