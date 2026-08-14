import type { ElectricalDomainInventoryRow } from "./inventory";

/**
 * Independent expected-scope ontology.
 *
 * This module intentionally does not import maximumResourceScopeV2, the domain
 * package, compiled BOQ rows, or any production builder. Its rules start from
 * catalog identity, family and operation, then state the physical resources
 * which an independently reconstructed Electrical scope must expose.
 */

export type IndependentElectricalExpectedResourceV2 = {
  semantic_key: string;
  reason_ru: string;
  expected_owner: "ELECTRICAL" | "CIVIL_TYPED_CHILD" | "STRUCTURAL_TYPED_CHILD" | "FIRE_TYPED_CHILD" | "CONTROLS_TYPED_CHILD" | "HVAC_TYPED_CHILD";
  normative_route: readonly string[];
  expected_slot: string;
};

export type IndependentElectricalExpectedResourceCatalogV2 = {
  schema_version: "IndependentElectricalExpectedResourceCatalogV2";
  group_id: string;
  catalog_identity: string;
  family: string;
  operation: string;
  physical_result_ru: string;
  reconstruction_basis: readonly string[];
  required_resources: readonly IndependentElectricalExpectedResourceV2[];
  required_slots: readonly string[];
  minimum_justified_rows: number;
  permitted_shared_graph_group_id: string;
  production_legitimacy_rules: readonly IndependentElectricalProductionLegitimacyRuleV2[];
};

export type IndependentElectricalProductionLegitimacyRuleV2 = {
  rule_id: string;
  semantic_prefix: string;
  physical_stage: string;
  applicability: string;
};

const RATE = "KG_KRERM_08_2015_ELECTRICAL";
const PNR = "KG_KRERP_01_2015_ELECTRICAL";
const SAFE = "KG_ELECTRICAL_SAFETY_2023";
const ACCEPT = "KG_ELECTRICAL_ACCEPTANCE_2023";
const PRODUCT = "EAEU_TR_TS_004_2011";

type RequirementSeed = readonly [semanticKey: string, reasonRu: string, owner?: IndependentElectricalExpectedResourceV2["expected_owner"], routes?: readonly string[]];

function resources(seeds: readonly RequirementSeed[]): IndependentElectricalExpectedResourceV2[] {
  return seeds.map(([semantic_key, reason_ru, expected_owner = "ELECTRICAL", normative_route = [RATE]]) => ({
    semantic_key,
    reason_ru,
    expected_owner,
    normative_route,
    expected_slot: independentElectricalCompletenessSlotForSemanticKeyV2(semantic_key),
  }));
}

export const INDEPENDENT_ELECTRICAL_COMPLETENESS_SLOTS_V2 = Object.freeze([
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

export type IndependentElectricalCompletenessDecisionV2 = {
  catalog_id: string;
  slot: typeof INDEPENDENT_ELECTRICAL_COMPLETENESS_SLOTS_V2[number];
  disposition: "INCLUDED_AS_SEPARATE_ROW" | "PROJECT_INPUT_REQUIRED" | "OWNED_BY_EXACT_TYPED_CHILD" | "NOT_APPLICABLE_WITH_REASON";
  expected_candidate_ids: readonly string[];
  exact_typed_child_owners: readonly string[];
  reason: string;
};

export function independentElectricalCompletenessSlotForSemanticKeyV2(semanticKey: string): string {
  if (semanticKey.startsWith("core_design_") || semanticKey.startsWith("core_scope_") || semanticKey.startsWith("core_product_") || semanticKey.startsWith("panel_calc_") || semanticKey.startsWith("rza_engineering_") || semanticKey.startsWith("ups_engineering_")) return "DESIGN_INPUT_BASIS";
  if (semanticKey.startsWith("core_") || semanticKey.startsWith("op_prepare_")) return "SURVEY_PREPARATION";
  if (semanticKey.startsWith("tool_")) return "HAND_POWER_TOOLS";
  if (semanticKey.startsWith("measure_")) return "MEASUREMENT_CALIBRATION";
  if (semanticKey === "logistics_delivery") return "DELIVERY";
  if (semanticKey === "logistics_loading") return "LOADING";
  if (semanticKey === "logistics_unloading") return "UNLOADING";
  if (semanticKey.startsWith("logistics_")) return "SITE_HANDLING_LIFTING";
  if (semanticKey.startsWith("hse_")) return "TEMP_POWER_LOTO_HSE";
  if (semanticKey.startsWith("waste_")) return "WASTE_RETURN_MATERIALS";
  if (semanticKey.startsWith("doc_") || semanticKey.includes("_doc_")) return "RECORDS_DRAWINGS_PROTOCOLS";
  if (semanticKey.startsWith("handover_") || semanticKey.endsWith("_handover")) return "ACCEPTANCE_TRAINING_HANDOVER";
  if (semanticKey.startsWith("qa_")) return semanticKey.includes("functional") || semanticKey.includes("interlock") || semanticKey.includes("alarm") ? "FUNCTIONAL_TESTS" : "INCOMING_COMPONENT_TESTS";
  if (semanticKey.startsWith("op_commission_")) return "INTEGRATED_COMMISSIONING";
  if (semanticKey.startsWith("op_test_") || semanticKey.includes("_test_")) return "ELECTRICAL_TESTS";
  if (semanticKey.startsWith("op_")) return "INSTALL_REPAIR_OPERATIONS";
  if (semanticKey.startsWith("external_civil_") || semanticKey.startsWith("substation_interface_") || semanticKey.startsWith("ups_interface_")) return "TYPED_CHILD_INTERFACES";
  if (semanticKey.startsWith("containment_")) return "CONTAINMENT";
  if (semanticKey.startsWith("cable_")) {
    if (/lug|joint|termination|ferrule|crimp/u.test(semanticKey)) return "TERMINATIONS_JOINTS";
    if (/gland|seal|firestop|shroud/u.test(semanticKey)) return "GLANDS_SEALS_PENETRATIONS";
    return "CABLES_CONDUCTORS";
  }
  if (semanticKey.startsWith("earth_") || semanticKey.startsWith("lightning_")) return "EARTHING_BONDING";
  if (semanticKey.startsWith("protection_") || semanticKey.startsWith("panel_") || semanticKey.startsWith("device_") || semanticKey.startsWith("lighting_") || semanticKey.startsWith("ups_") || semanticKey.startsWith("battery_") || semanticKey.startsWith("substation_") || semanticKey.startsWith("ohl_")) return "PRIMARY_EQUIPMENT";
  if (semanticKey.startsWith("external_")) return "CONTAINMENT";
  if (semanticKey.startsWith("rza_")) return "PROTECTION_SELECTIVITY";
  return "SPECIAL_SERVICES_COORDINATION";
}

const COMMON = resources([
  ["core_design_review", "Работа должна начинаться с точной рабочей документации и однолинейной схемы."],
  ["core_scope_boundary_review", "Стоимость и quantity interfaces смежных владельцев должны быть определены до расчёта."],
  ["core_product_schedule_review", "Точная спецификация и паспорта изделий являются входом продуктового соответствия.", "ELECTRICAL", [PRODUCT]],
  ["core_site_survey", "Фактическое место выполнения проверяется до выбора метода монтажа."],
  ["core_existing_network_identification", "Действующие цепи и оборудование должны быть идентифицированы до отключения.", "ELECTRICAL", [SAFE]],
  ["tool_insulated_hand", "Электротехническая операция требует изолированного ручного инструмента.", "ELECTRICAL", [SAFE]],
  ["measure_voltage_detector", "Безопасное отключение требует поверенного указателя напряжения.", "ELECTRICAL", [SAFE]],
  ["logistics_delivery", "Доставка является отдельным измеримым логистическим ресурсом."],
  ["logistics_loading", "Погрузка не скрывается в доставке."],
  ["logistics_unloading", "Разгрузка и входной осмотр упаковки учитываются отдельно."],
  ["logistics_horizontal_handling", "Внутриплощадочное перемещение отделено от внешней доставки."],
  ["hse_isolation", "Отключение источника — самостоятельная safety-операция.", "ELECTRICAL", [SAFE]],
  ["hse_lockout_tagout", "LOTO обязателен в границе работы.", "ELECTRICAL", [SAFE]],
  ["hse_absence_voltage", "Отсутствие напряжения подтверждается перед началом работ.", "ELECTRICAL", [SAFE]],
  ["qa_certificate_check", "Документ соответствия изделия проверяется отдельно.", "ELECTRICAL", [PRODUCT]],
  ["qa_incoming_visual", "Физическое состояние изделия подтверждается входным контролем.", "ELECTRICAL", [PRODUCT]],
  ["waste_segregation", "Отходы кабеля, металла, пластика и упаковки разделяются."],
  ["doc_photo_record", "Скрытые и завершённые работы должны быть доступны в durable history.", "ELECTRICAL", [ACCEPT]],
  ["doc_measurement_protocol", "Результат электрического контроля оформляется с прибором и критерием.", "ELECTRICAL", [ACCEPT]],
  ["handover_final_acceptance", "Физический результат передаётся владельцу системы.", "ELECTRICAL", [ACCEPT]],
]);

const OPERATION: Readonly<Record<string, readonly IndependentElectricalExpectedResourceV2[]>> = Object.freeze({
  PREPARE: resources([
    ["op_prepare_document", "Исходные данные выбранной операции проверяются до разметки."],
    ["op_prepare_survey", "Подготовка требует обследования рабочей зоны."],
    ["op_prepare_setout", "Точки и границы работы размечаются отдельно."],
    ["op_prepare_handover", "Подготовленный фронт передаётся следующему технологическому владельцу."],
  ]),
  INSTALL: resources([
    ["op_install_accept", "Основание и изделие принимаются до установки."],
    ["op_install_fix", "Крепление является отдельной физической операцией."],
    ["op_install_position", "Изделие устанавливается и позиционируется."],
    ["op_install_torque", "Момент соединений контролируется."],
    ["op_install_inspect", "Монтаж проходит операционный контроль."],
  ]),
  LAY: resources([
    ["op_lay_route", "Трасса принимается и размечается до прокладки."],
    ["op_lay_pull", "Протяжка выделяется из укладки."],
    ["op_lay_lay", "Укладка и геометрия учитываются отдельно."],
    ["op_lay_fix", "Крепление выполняется с проектным шагом."],
    ["op_lay_bend", "Радиус изгиба контролируется."],
  ]),
  CONNECT: resources([
    ["op_connect_identify", "Точка и цепь идентифицируются до разделки."],
    ["op_connect_prepare", "Подготовка проводников отделена от подключения."],
    ["op_connect_terminate", "Каждый проводник получает точное оконцевание."],
    ["op_connect_connect", "Подключение является отдельной операцией."],
    ["op_connect_torque", "Момент клеммного соединения контролируется."],
    ["op_connect_point_check", "Поточечная проверка завершает подключение."],
  ]),
  MARK: resources([
    ["op_mark_schedule", "Маркировка сверяется с ведомостью."],
    ["op_mark_print", "Стойкая маркировка изготавливается отдельно."],
    ["op_mark_install", "Каждый маркер устанавливается на физический объект."],
    ["op_mark_verify", "Маркер сверяется с исполнительной схемой."],
  ]),
  TEST: resources([
    ["op_test_program", "Программа и критерии испытания определяются до измерения.", "ELECTRICAL", [ACCEPT]],
    ["op_test_instrument", "Применяется поверенный прибор.", "ELECTRICAL", [ACCEPT]],
    ["op_test_measure", "Отдельное измерение имеет самостоятельный результат.", "ELECTRICAL", [ACCEPT]],
    ["op_test_evaluate", "Результат сопоставляется с критерием.", "ELECTRICAL", [ACCEPT]],
    ["op_test_protocol", "Испытание завершается точным протоколом.", "ELECTRICAL", [ACCEPT]],
  ]),
  COMMISSION: resources([
    ["op_commission_program", "Пусконаладка выполняется по утверждённой программе.", "ELECTRICAL", [PNR]],
    ["op_commission_precheck", "Монтаж проверяется до подачи напряжения.", "ELECTRICAL", [PNR]],
    ["op_commission_settings", "Настройки вводятся по утверждённым значениям.", "ELECTRICAL", [PNR]],
    ["op_commission_function", "Штатная функция проверяется отдельно.", "ELECTRICAL", [PNR]],
    ["op_commission_energize", "Подача напряжения является контролируемым этапом.", "ELECTRICAL", [PNR]],
    ["op_commission_record", "Результат наладки оформляется документом.", "ELECTRICAL", [PNR]],
  ]),
  REPLACE: resources([
    ["op_replace_diagnose", "Замена начинается с диагностики причины дефекта."],
    ["op_replace_trace", "Связанные цепи идентифицируются до демонтажа."],
    ["op_replace_isolate", "Заменяемый участок безопасно отключается.", "ELECTRICAL", [SAFE]],
    ["op_replace_disconnect", "Проводники маркируются и отключаются отдельно."],
    ["op_replace_dismantle", "Дефектное изделие демонтируется контролируемо."],
    ["op_replace_sort", "Демонтированные ресурсы получают возвратную или отходную судьбу."],
    ["op_replace_install", "Новое изделие монтируется как отдельный этап."],
    ["op_replace_reconnect", "Подключения восстанавливаются по исполнительной схеме."],
    ["op_replace_test", "После ремонта повторяются необходимые испытания.", "ELECTRICAL", [ACCEPT]],
    ["op_replace_closeout", "Дефектная и исполнительная ведомости закрывают ремонт."],
  ]),
});

const FAMILY: Readonly<Record<string, readonly IndependentElectricalExpectedResourceV2[]>> = Object.freeze({
  CONTAINMENT: resources([
    ["containment_straight", "Трасса имеет отдельную прямую секцию точного размера."],
    ["containment_cover", "Крышка является самостоятельным изделием."],
    ["containment_joint_plate", "Секции соединяются отдельными пластинами."],
    ["containment_wall_bracket", "Несущая консоль не скрывается в секции."],
    ["containment_threaded_rod", "Подвес имеет отдельную шпильку."],
    ["containment_concrete_anchor", "Крепление к основанию учитывается физически."],
    ["containment_bonding_jumper", "Металлические секции получают bonding."],
    ["containment_support_install", "Опоры монтируются отдельно."],
    ["containment_section_assembly", "Секции и фасонные элементы собираются отдельно."],
    ["containment_torque_control", "Болтовые соединения проходят torque-control."],
  ]),
  CABLE: resources([
    ["cable_power", "Силовой кабель точной марки и сечения является основным ресурсом.", "ELECTRICAL", [PRODUCT]],
    ["cable_lug_phase", "Фазная жила получает наконечник точного сечения."],
    ["cable_gland", "Ввод имеет точный диаметр и IP."],
    ["cable_end_tag", "Каждый конец кабеля маркируется."],
    ["cable_drum_acceptance", "Барабан принимается до раскатки."],
    ["cable_pulling", "Протяжка выделяется в самостоятельную операцию."],
    ["cable_end_preparation", "Разделка каждого конца учитывается отдельно."],
    ["cable_crimp", "Опрессовка не агрегируется с подключением."],
    ["cable_test_insulation", "Изоляция кабеля измеряется отдельно.", "ELECTRICAL", [ACCEPT]],
    ["cable_doc_log", "Кабельный журнал сохраняет барабан, длину и концы."],
  ]),
  PROTECTION: resources([
    ["protection_device", "Аппарат защиты задаётся точным типом, номиналом и характеристикой.", "ELECTRICAL", [PRODUCT]],
    ["protection_line_lug", "Входной проводник имеет собственное оконцевание."],
    ["protection_mount", "Аппарат устанавливается отдельно."],
    ["protection_torque", "Силовые клеммы проходят torque-control."],
    ["protection_test_breaking", "Отключающая способность проверяется против расчётного КЗ.", "ELECTRICAL", [ACCEPT]],
    ["protection_test_selectivity", "Селективность с вышестоящей защитой подтверждается.", "ELECTRICAL", [ACCEPT]],
  ]),
  DEVICE: resources([
    ["device_mechanism", "Механизм изделия имеет точный тип, номинал и IP.", "ELECTRICAL", [PRODUCT]],
    ["device_back_box", "Монтажная коробка является отдельным изделием.", "ELECTRICAL", [PRODUCT]],
    ["device_terminal", "Подключение выполняется через точную клемму."],
    ["device_pe_tail", "Защитная перемычка учитывается отдельно."],
    ["device_box_install", "Коробка устанавливается и выравнивается."],
    ["device_connect", "Каждый проводник подключается отдельно."],
    ["device_test_operation", "Функция изделия проверяется после монтажа.", "ELECTRICAL", [ACCEPT]],
  ]),
  LIGHTING: resources([
    ["lighting_luminaire", "Светильник задаётся точным оптическим и environmental классом.", "ELECTRICAL", [PRODUCT]],
    ["lighting_driver", "Драйвер является самостоятельным компонентом.", "ELECTRICAL", [PRODUCT]],
    ["lighting_bracket", "Крепление светильника не скрывается в изделии."],
    ["lighting_safety_wire", "Страховочный трос учитывается отдельно."],
    ["lighting_junction_box", "Ответвительная коробка является самостоятельным компонентом."],
    ["lighting_pe_jumper", "Корпус получает PE-перемычку."],
    ["lighting_mount", "Установка светильника выделяется отдельно."],
    ["lighting_test_illuminance", "Освещённость измеряется в контрольных точках.", "ELECTRICAL", [ACCEPT]],
    ["lighting_doc_schedule", "Ведомость светильников актуализируется."],
  ]),
  PANEL: resources([
    ["panel_enclosure", "Корпус имеет точные габариты, IP и IK.", "ELECTRICAL", [PRODUCT]],
    ["panel_main_bus", "Главная шина задаётся номиналом и стойкостью."],
    ["panel_neutral_bus", "N-шина учитывается отдельно."],
    ["panel_pe_bus", "PE-шина учитывается отдельно."],
    ["panel_incomer_breaker", "Вводной аппарат имеет самостоятельную строку."],
    ["panel_outgoing_breaker", "Отходящие аппараты разделяются по типам и номиналам."],
    ["panel_spd", "SPD и его backup protection не скрываются."],
    ["panel_terminal_power", "Силовые клеммы учитываются отдельно."],
    ["panel_internal_phase_wire", "Внутренняя силовая проводка учитывается по сечению."],
    ["panel_mechanical_assembly", "Механическая сборка отделена от внутреннего монтажа."],
    ["panel_internal_wiring", "Изготовление внутренней проводки является отдельной операцией."],
    ["panel_calc_fault_current", "Ток КЗ рассчитывается до выбора защиты.", "ELECTRICAL", [ACCEPT]],
    ["panel_calc_selectivity", "Селективность подтверждается расчётом.", "ELECTRICAL", [ACCEPT]],
    ["panel_test_wiring", "Соединения проверяются против схемы.", "ELECTRICAL", [PNR]],
    ["panel_test_energization", "Первое включение является отдельным commissioning этапом.", "ELECTRICAL", [PNR]],
    ["panel_doc_single_line", "Исполнительная однолинейная схема входит в handover."],
  ]),
  GROUNDING: resources([
    ["earth_strip", "Заземляющий проводник задаётся материалом и сечением."],
    ["earth_rod_electrode", "Каждый электрод является отдельным физическим ресурсом."],
    ["earth_main_bar", "Главная заземляющая шина учитывается отдельно."],
    ["earth_test_joint", "Контрольное соединение физически выделяется."],
    ["earth_work_electrode_drive", "Погружение электродов является отдельной операцией."],
    ["earth_work_bond", "Каждая bonding-точка присоединяется отдельно."],
    ["earth_test_resistance", "Сопротивление заземления измеряется поверенным прибором.", "ELECTRICAL", [ACCEPT]],
    ["earth_doc_asbuilt", "Исполнительный план фиксирует скрытую трассу."],
  ]),
  EXTERNAL: resources([
    ["external_geodetic_setout", "Наружная трасса начинается с геодезической разбивки."],
    ["external_utility_locator", "Существующие коммуникации обнаруживаются инструментально."],
    ["external_civil_excavation_interface", "Объём траншеи передаётся точному Civil owner.", "CIVIL_TYPED_CHILD"],
    ["external_duct", "Каждая кабельная труба имеет точный материал и диаметр."],
    ["external_warning_tape", "Сигнальная лента является отдельным материалом."],
    ["external_manhole", "Кабельный колодец учитывается отдельным сооружением."],
    ["external_test_duct_mandrel", "Проходимость каждой трубы проверяется.", "ELECTRICAL", [ACCEPT]],
    ["external_test_compaction", "Уплотнение скрываемых слоёв контролируется.", "ELECTRICAL", [ACCEPT]],
    ["external_doc_geodetic_asbuilt", "Трасса закрывается исполнительной геодезической съёмкой."],
  ]),
  OHL: resources([
    ["ohl_pole", "Опора задаётся материалом, классом и высотой."],
    ["ohl_crossarm", "Траверса является отдельной конструкцией."],
    ["ohl_insulator", "Изолятор выбирается по классу напряжения."],
    ["ohl_phase_conductor", "Фазный провод учитывается по марке и сечению."],
    ["ohl_pole_earthing", "Каждая опора получает точное заземление."],
    ["ohl_work_pole_erection", "Установка опоры выделяется из такелажа."],
    ["ohl_work_sagging", "Стрела провеса регулируется отдельно."],
    ["ohl_machine_crane", "Кран учитывается по расчётной грузоподъёмности."],
    ["ohl_test_clearance", "Габариты линии измеряются.", "ELECTRICAL", [ACCEPT]],
    ["ohl_doc_asbuilt", "Исполнительный профиль и план передаются владельцу."],
  ]),
  RZA: resources([
    ["rza_protection_terminal", "Терминал задаётся точной защитной функцией."],
    ["rza_io_module", "Дискретные I/O физически выделены."],
    ["rza_test_block", "Тестовый блок вторичных цепей учитывается отдельно."],
    ["rza_engineering_fault_study", "Уставки основаны на расчёте токов КЗ.", "ELECTRICAL", [PNR]],
    ["rza_engineering_setting_calculation", "Каждая функция получает расчёт уставок.", "ELECTRICAL", [PNR]],
    ["rza_config_parameterize", "Утверждённые уставки вводятся отдельно."],
    ["rza_test_secondary_current", "Токовая функция проверяется вторичной инъекцией.", "ELECTRICAL", [PNR]],
    ["rza_test_trip_coil", "Воздействие на катушку отключения проверяется.", "ELECTRICAL", [PNR]],
    ["rza_test_scada_point", "Диспетчерский сигнал проходит end-to-end проверку.", "ELECTRICAL", [PNR]],
    ["rza_doc_settings_file", "Файл уставок входит в durable handover."],
  ]),
  UPS: resources([
    ["ups_rectifier", "Выпрямительный модуль учитывается отдельно.", "ELECTRICAL", [PRODUCT]],
    ["ups_inverter", "Инверторный модуль учитывается отдельно.", "ELECTRICAL", [PRODUCT]],
    ["ups_static_bypass", "Статический байпас не агрегируется с UPS.", "ELECTRICAL", [PRODUCT]],
    ["battery_cell", "Каждый аккумуляторный элемент имеет паспортную ёмкость."],
    ["battery_interlink", "Межэлементные соединения учитываются отдельно."],
    ["ups_interface_ventilation", "Тепловыделения передаются HVAC owner.", "HVAC_TYPED_CHILD"],
    ["ups_interface_fire", "Пожарная характеристика передаётся Fire owner.", "FIRE_TYPED_CHILD"],
    ["ups_engineering_battery_capacity", "Ёмкость рассчитывается с температурой и старением."],
    ["ups_work_torque", "Каждое DC-соединение проходит torque-control."],
    ["ups_test_autonomy", "Фактическая автономия испытывается под нагрузкой.", "ELECTRICAL", [PNR]],
    ["ups_doc_battery_record", "Каждый элемент входит в батарейную ведомость."],
  ]),
  SUBSTATION: resources([
    ["substation_transformer", "Силовой трансформатор имеет точный rating и vector group.", "ELECTRICAL", [PRODUCT]],
    ["substation_incoming_cell", "Вводная ячейка учитывается отдельно."],
    ["substation_circuit_breaker", "Высоковольтный выключатель является отдельным аппаратом."],
    ["substation_hv_bus", "Шины ВН учитываются по сечению."],
    ["substation_ac_board", "Собственные нужды AC имеют отдельный щит."],
    ["substation_interface_foundation", "Нагрузки и анкеры передаются Structural owner.", "STRUCTURAL_TYPED_CHILD"],
    ["substation_interface_oil_containment", "Маслоприёмное устройство передаётся Civil owner.", "CIVIL_TYPED_CHILD"],
    ["substation_interface_ventilation", "Тепловыделения передаются HVAC owner.", "HVAC_TYPED_CHILD"],
    ["substation_interface_fire", "Пожарные сценарии передаются Fire owner.", "FIRE_TYPED_CHILD"],
    ["substation_work_transformer_position", "Трансформатор позиционируется отдельной такелажной операцией."],
    ["substation_work_bus_torque", "Каждое шинное соединение проходит torque-control."],
    ["substation_test_ratio", "Коэффициент трансформации измеряется.", "ELECTRICAL", [PNR]],
    ["substation_test_breaker_timing", "Время работы выключателя измеряется.", "ELECTRICAL", [PNR]],
    ["substation_commission_phased_energization", "Подача напряжения выполняется поэтапно.", "ELECTRICAL", [PNR]],
    ["substation_doc_energization_program", "Утверждённая программа включения входит в handover."],
  ]),
});

const CONTAINMENT_FAMILIES = new Set(["CABLE_CHANNEL", "cable_ducts"]);
const CABLE_FAMILIES = new Set(["POWER_CABLE", "VVG_CABLE", "cable_pulling"]);
const PROTECTION_FAMILIES = new Set(["BREAKER", "RCD"]);
const DEVICE_FAMILIES = new Set(["SOCKET", "SWITCH"]);
const LIGHTING_FAMILIES = new Set(["LIGHTING", "LED_STRIP"]);
const PANEL_FAMILIES = new Set(["PANEL", "distribution_board_outdoor"]);
const EXTERNAL_FAMILIES = new Set(["cable_trench", "cable_trench_energy", "underground_cable_line"]);
const OHL_FAMILIES = new Set(["electrical_poles_04kv", "electrical_poles_10kv", "electrical_poles_35kv", "electrical_poles_110kv", "overhead_power_line_04kv", "overhead_power_line_10kv", "overhead_power_line_35kv", "overhead_power_line_110kv", "street_lighting_poles"]);
const SUBSTATION_FAMILIES = new Set(["distribution_substation", "outdoor_switchgear", "package_transformer_substation", "substation_10kv", "substation_35kv", "substation_110kv", "transformer_substation"]);

const COMMON_LEGITIMACY_RULES: readonly IndependentElectricalProductionLegitimacyRuleV2[] = Object.freeze([
  { rule_id: "INDEPENDENT:DESIGN", semantic_prefix: "core_", physical_stage: "DESIGN_AND_SURVEY", applicability: "Independent design, workfront and interface preparation." },
  { rule_id: "INDEPENDENT:TOOLS", semantic_prefix: "tool_", physical_stage: "TOOLS", applicability: "A separately identifiable electrical installation tool." },
  { rule_id: "INDEPENDENT:MEASUREMENT", semantic_prefix: "measure_", physical_stage: "CALIBRATED_MEASUREMENT", applicability: "A separately identifiable calibrated measuring instrument or calibration check." },
  { rule_id: "INDEPENDENT:LOGISTICS", semantic_prefix: "logistics_", physical_stage: "LOGISTICS", applicability: "A separate delivery, loading, unloading, handling or storage operation." },
  { rule_id: "INDEPENDENT:HSE", semantic_prefix: "hse_", physical_stage: "ELECTRICAL_SAFETY", applicability: "A separate isolation, LOTO, temporary protection or HSE operation." },
  { rule_id: "INDEPENDENT:ACCESS", semantic_prefix: "access_", physical_stage: "ACCESS", applicability: "A separate access or work-at-height resource." },
  { rule_id: "INDEPENDENT:RIGGING", semantic_prefix: "rigging_", physical_stage: "RIGGING", applicability: "A separate lifting or rigging machine/resource." },
  { rule_id: "INDEPENDENT:QA", semantic_prefix: "qa_", physical_stage: "QA_AND_TEST", applicability: "A distinct incoming, electrical or functional control." },
  { rule_id: "INDEPENDENT:WASTE", semantic_prefix: "waste_", physical_stage: "WASTE_AND_RETURNS", applicability: "A distinct waste, returnable-material or haulage fate." },
  { rule_id: "INDEPENDENT:DOCUMENT", semantic_prefix: "doc_", physical_stage: "RECORDS", applicability: "A distinct durable record, drawing, act or protocol." },
  { rule_id: "INDEPENDENT:HANDOVER", semantic_prefix: "handover_", physical_stage: "HANDOVER", applicability: "A distinct acceptance, briefing or handover deliverable." },
]);

function rule(rule_id: string, semantic_prefix: string, physical_stage: string): IndependentElectricalProductionLegitimacyRuleV2 {
  return { rule_id, semantic_prefix, physical_stage, applicability: `Independent ${physical_stage} obligation for ${semantic_prefix} semantic resources.` };
}

function familyLegitimacyRules(row: ElectricalDomainInventoryRow): readonly IndependentElectricalProductionLegitimacyRuleV2[] {
  const family = row.electrical_family;
  if (CONTAINMENT_FAMILIES.has(family)) return [rule("INDEPENDENT:CONTAINMENT", "containment_", "CONTAINMENT_SYSTEM")];
  if (CABLE_FAMILIES.has(family)) return [rule("INDEPENDENT:CABLE", "cable_", "CABLE_FEEDER")];
  if (PROTECTION_FAMILIES.has(family)) return [rule("INDEPENDENT:PROTECTION", "protection_", "PROTECTION_DEVICE")];
  if (DEVICE_FAMILIES.has(family)) return [rule("INDEPENDENT:DEVICE", "device_", "INSTALLATION_DEVICE")];
  if (LIGHTING_FAMILIES.has(family)) return [rule("INDEPENDENT:LIGHTING", "lighting_", "LIGHTING_SYSTEM")];
  if (PANEL_FAMILIES.has(family)) return [rule("INDEPENDENT:PANEL", "panel_", "PANEL_SWITCHBOARD")];
  if (family === "grounding_system") return [rule("INDEPENDENT:EARTHING", "earth_", "EARTHING_SYSTEM")];
  if (family === "lightning_protection") return [rule("INDEPENDENT:EARTHING", "earth_", "EARTHING_SYSTEM"), rule("INDEPENDENT:LIGHTNING", "lightning_", "LIGHTNING_PROTECTION")];
  if (EXTERNAL_FAMILIES.has(family)) return [rule("INDEPENDENT:EXTERNAL", "external_", "EXTERNAL_NETWORK"), rule("INDEPENDENT:CABLE", "cable_", "CABLE_FEEDER")];
  if (OHL_FAMILIES.has(family)) return [rule("INDEPENDENT:OHL", "ohl_", "OVERHEAD_LINE")];
  if (family === "relay_protection_automation") return [rule("INDEPENDENT:RZA", "rza_", "PROTECTION_AUTOMATION")];
  if (family === "electrical_testing_commissioning") return [rule("INDEPENDENT:RZA", "rza_", "PROTECTION_AUTOMATION"), rule("INDEPENDENT:COMMISSION", "commission_", "COMMISSIONING")];
  if (family === "battery_energy_storage") return [rule("INDEPENDENT:UPS", "ups_", "UPS_SYSTEM"), rule("INDEPENDENT:BATTERY", "battery_", "BATTERY_SYSTEM"), rule("INDEPENDENT:CABLE", "cable_", "CABLE_FEEDER")];
  if (SUBSTATION_FAMILIES.has(family)) return [
    rule("INDEPENDENT:SUBSTATION", "substation_", "SUBSTATION"),
    rule("INDEPENDENT:PANEL", "panel_", "PANEL_SWITCHBOARD"),
    rule("INDEPENDENT:CABLE", "cable_", "CABLE_FEEDER"),
    rule("INDEPENDENT:EARTHING", "earth_", "EARTHING_SYSTEM"),
    rule("INDEPENDENT:LIGHTNING", "lightning_", "LIGHTNING_PROTECTION"),
    rule("INDEPENDENT:RZA", "rza_", "PROTECTION_AUTOMATION"),
  ];
  return [];
}

const TYPED_CHILD_EXPECTED_OWNERS: Readonly<Record<string, IndependentElectricalExpectedResourceV2["expected_owner"]>> = Object.freeze({
  external_civil_dewatering_interface: "CIVIL_TYPED_CHILD",
  external_civil_excavation_interface: "CIVIL_TYPED_CHILD",
  external_civil_reinstatement_interface: "CIVIL_TYPED_CHILD",
  external_civil_shoring_interface: "CIVIL_TYPED_CHILD",
  external_civil_survey_handover: "CIVIL_TYPED_CHILD",
  substation_interface_controls: "CONTROLS_TYPED_CHILD",
  substation_interface_fire: "FIRE_TYPED_CHILD",
  substation_interface_foundation: "STRUCTURAL_TYPED_CHILD",
  substation_interface_oil_containment: "CIVIL_TYPED_CHILD",
  substation_interface_ventilation: "HVAC_TYPED_CHILD",
  ups_interface_controls: "CONTROLS_TYPED_CHILD",
  ups_interface_fire: "FIRE_TYPED_CHILD",
  ups_interface_floor: "STRUCTURAL_TYPED_CHILD",
  ups_interface_ventilation: "HVAC_TYPED_CHILD",
});

export function independentElectricalExpectedOwnerForSemanticKeyV2(semanticKey: string): IndependentElectricalExpectedResourceV2["expected_owner"] {
  return TYPED_CHILD_EXPECTED_OWNERS[semanticKey] ?? "ELECTRICAL";
}

export function independentElectricalNormativeRoutesForSemanticKeyV2(semanticKey: string, category: string): readonly string[] {
  if (semanticKey === "core_product_schedule_review" || ["qa_certificate_check", "qa_incoming_visual", "qa_nameplate_reconciliation", "qa_storage_condition"].includes(semanticKey)) return [PRODUCT];
  if (semanticKey === "measure_voltage_detector" || semanticKey === "tool_insulated_hand" || semanticKey.startsWith("hse_") || semanticKey === "op_replace_isolate") return [SAFE];
  if (semanticKey === "core_existing_network_identification") return [SAFE];
  if (semanticKey.startsWith("measure_")) return [ACCEPT];
  if (semanticKey.startsWith("rza_engineering_") || semanticKey.startsWith("rza_instrument_")) return [PNR];
  if (semanticKey.includes("_calc_")) return [ACCEPT, RATE];
  if (category === "material" || category === "equipment") return [RATE, PRODUCT];
  if (semanticKey.startsWith("op_commission_") || semanticKey.startsWith("commission_")) return [PNR, ACCEPT, RATE];
  if (category === "testing" || /(^|_)test_|^measure_|^qa_|_commission_|^op_test_|^op_replace_test$/u.test(semanticKey)) return [ACCEPT, PNR, RATE];
  if (/^doc_|_doc_|^handover_/u.test(semanticKey)) return [RATE, ACCEPT, PNR];
  if (/^logistics_|^access_|^rigging_|^waste_|^core_|^op_|_work_|_machine_|_install|_lay|_pull|_connect|_torque|_mark/u.test(semanticKey)) return [RATE, ACCEPT];
  return [RATE, PRODUCT];
}

export function independentElectricalOperationAllowsProductionSemanticV2(
  row: ElectricalDomainInventoryRow,
  semanticKey: string,
  slot: string,
  category: string,
): boolean {
  if (COMMON_LEGITIMACY_RULES.some((candidateRule) => semanticKey.startsWith(candidateRule.semantic_prefix))) return true;
  if (semanticKey.startsWith(`op_${row.operation_class.toLocaleLowerCase("en-US")}_`)) return true;
  if (row.source_domain_id.startsWith("expanded:")) return true;
  if (row.operation_class === "PREPARE") return ["DESIGN_INPUT_BASIS", "SURVEY_PREPARATION", "MARKING_WARNINGS", "PRIMARY_EQUIPMENT"].includes(slot);
  if (row.operation_class === "MARK") return ["MARKING_WARNINGS", "RECORDS_DRAWINGS_PROTOCOLS", "INTERNAL_WIRING_TERMINALS"].includes(slot);
  if (row.operation_class === "TEST") return category === "testing" || ["MEASUREMENT_CALIBRATION", "PROTECTION_SELECTIVITY"].includes(slot);
  if (row.operation_class === "COMMISSION") return ["testing", "documentation"].includes(category) || slot === "PROTECTION_SELECTIVITY";
  if (row.operation_class === "CONNECT") return semanticKey === "lighting_safety_wire" || ["TERMINATIONS_JOINTS", "GLANDS_SEALS_PENETRATIONS", "INTERNAL_WIRING_TERMINALS", "EARTHING_BONDING", "INSTALL_REPAIR_OPERATIONS", "ELECTRICAL_TESTS"].includes(slot);
  if (row.operation_class === "LAY") return ["PRIMARY_EQUIPMENT", "CABLES_CONDUCTORS", "CONTAINMENT", "SUPPORTS_EMBEDMENTS", "FASTENERS", "INSTALL_REPAIR_OPERATIONS", "RIGGING_MACHINERY", "MARKING_WARNINGS"].includes(slot);
  return true;
}

function familyRequirements(row: ElectricalDomainInventoryRow): readonly IndependentElectricalExpectedResourceV2[] {
  const family = row.electrical_family;
  if (CONTAINMENT_FAMILIES.has(family)) return FAMILY.CONTAINMENT;
  if (CABLE_FAMILIES.has(family)) return FAMILY.CABLE;
  if (PROTECTION_FAMILIES.has(family)) return FAMILY.PROTECTION;
  if (DEVICE_FAMILIES.has(family)) return FAMILY.DEVICE;
  if (LIGHTING_FAMILIES.has(family)) return FAMILY.LIGHTING;
  if (PANEL_FAMILIES.has(family)) return FAMILY.PANEL;
  if (family === "grounding_system" || family === "lightning_protection") return FAMILY.GROUNDING;
  if (EXTERNAL_FAMILIES.has(family)) return [...FAMILY.EXTERNAL, ...FAMILY.CABLE];
  if (OHL_FAMILIES.has(family)) return FAMILY.OHL;
  if (family === "relay_protection_automation" || family === "electrical_testing_commissioning") return FAMILY.RZA;
  if (family === "battery_energy_storage") return [...FAMILY.UPS, ...FAMILY.CABLE];
  if (SUBSTATION_FAMILIES.has(family)) return [...FAMILY.SUBSTATION, ...FAMILY.PANEL, ...FAMILY.CABLE, ...FAMILY.GROUNDING, ...FAMILY.RZA];
  return [];
}

function operationFilteredFamilyRequirements(row: ElectricalDomainInventoryRow): readonly IndependentElectricalExpectedResourceV2[] {
  const expected = familyRequirements(row);
  if (row.source_domain_id.startsWith("expanded:")) return expected;
  if (row.operation_class === "PREPARE" || row.operation_class === "MARK") return [];
  if (row.operation_class === "TEST" || row.operation_class === "COMMISSION") return expected.filter((resource) => /test|calc|commission|setting|protocol|measure/iu.test(resource.semantic_key));
  if (row.operation_class === "CONNECT") return expected.filter((resource) => /lug|gland|terminal|connect|torque|bond|pe_|wire|safety_wire/iu.test(resource.semantic_key));
  if (row.operation_class === "LAY") return expected.filter((resource) => /straight|cable_(power|vvg)|route|lay|pull|fix|support|bracket|conductor|pole|duct/iu.test(resource.semantic_key));
  return expected;
}

function identitySpecificExpectedResourceV2(row: ElectricalDomainInventoryRow, resource: IndependentElectricalExpectedResourceV2): IndependentElectricalExpectedResourceV2 {
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
  if (resource.semantic_key === operationIdentityCandidate[row.operation_class]) {
    const familyIdentity = row.electrical_family.replace(/[^a-z0-9]+/giu, "_").replace(/^_+|_+$/gu, "").toLocaleLowerCase("en-US");
    return { ...resource, semantic_key: `${resource.semantic_key}_${familyIdentity}` };
  }
  const replacements: Readonly<Record<string, Readonly<Record<string, string>>>> = Object.freeze({
    BREAKER: { protection_device: "protection_breaker_device" },
    RCD: { protection_device: "protection_rcd_device" },
    SOCKET: { device_mechanism: "device_socket_mechanism" },
    SWITCH: { device_mechanism: "device_switch_mechanism" },
    LED_STRIP: { lighting_luminaire: "lighting_led_strip_system" },
    VVG_CABLE: { cable_power: "cable_vvg" },
  });
  const semanticKey = replacements[row.electrical_family]?.[resource.semantic_key];
  return semanticKey ? { ...resource, semantic_key: semanticKey } : resource;
}

function minimumRows(row: ElectricalDomainInventoryRow): number {
  if (!row.source_domain_id.startsWith("expanded:")) {
    if (row.operation_class === "REPLACE") return 100;
    if (["INSTALL", "CONNECT", "LAY"].includes(row.operation_class)) return 60;
    return 50;
  }
  const family = row.electrical_family;
  if (SUBSTATION_FAMILIES.has(family)) return 450;
  if (family === "battery_energy_storage") return 210;
  if (family === "relay_protection_automation" || family === "electrical_testing_commissioning") return 160;
  if (EXTERNAL_FAMILIES.has(family)) return 175;
  if (OHL_FAMILIES.has(family)) return 120;
  if (family === "grounding_system" || family === "lightning_protection") return 120;
  if (PANEL_FAMILIES.has(family)) return 160;
  if (CABLE_FAMILIES.has(family)) return 125;
  if (CONTAINMENT_FAMILIES.has(family)) return 120;
  if (LIGHTING_FAMILIES.has(family)) return 90;
  return 60;
}

export function reconstructIndependentElectricalExpectedResourceCatalogV2(row: ElectricalDomainInventoryRow): IndependentElectricalExpectedResourceCatalogV2 {
  const required = resources([]);
  required.push(...COMMON, ...(OPERATION[row.operation_class] ?? []), ...operationFilteredFamilyRequirements(row));
  const identitySpecificRequired = required.map((resource) => identitySpecificExpectedResourceV2(row, resource));
  const unique = new Map(identitySpecificRequired.map((resource) => [resource.semantic_key, resource]));
  return {
    schema_version: "IndependentElectricalExpectedResourceCatalogV2",
    group_id: row.candidate_canonical_technology_id,
    catalog_identity: row.catalog_id,
    family: row.electrical_family,
    operation: row.operation_class,
    physical_result_ru: `${row.localized_name_ru}: exact ${row.electrical_family} physical result`,
    reconstruction_basis: [
      "catalog identity and physical deliverable",
      "family topology and interfaces",
      "operation or estimate maturity",
      "KG installation, safety, acceptance and estimate routes",
      "EAEU product conformity route",
      "typed-child single cost ownership",
    ],
    required_resources: Object.freeze([...unique.values()]),
    required_slots: Object.freeze(["DESIGN_INPUT_BASIS", "SURVEY_PREPARATION", "HAND_POWER_TOOLS", "MEASUREMENT_CALIBRATION", "DELIVERY", "LOADING", "UNLOADING", "SITE_HANDLING_LIFTING", "TEMP_POWER_LOTO_HSE", "INCOMING_COMPONENT_TESTS", "WASTE_RETURN_MATERIALS", "RECORDS_DRAWINGS_PROTOCOLS", "ACCEPTANCE_TRAINING_HANDOVER"]),
    minimum_justified_rows: minimumRows(row),
    permitted_shared_graph_group_id: row.candidate_canonical_technology_id,
    production_legitimacy_rules: Object.freeze([
      ...COMMON_LEGITIMACY_RULES,
      ...(OPERATION[row.operation_class] ? [rule(`INDEPENDENT:OPERATION:${row.operation_class}`, `op_${row.operation_class.toLocaleLowerCase("en-US")}_`, "WORK_OPERATION")] : []),
      ...familyLegitimacyRules(row),
    ]),
  };
}

export function independentElectricalCompletenessDecisionsV2(row: ElectricalDomainInventoryRow): readonly IndependentElectricalCompletenessDecisionV2[] {
  const expected = reconstructIndependentElectricalExpectedResourceCatalogV2(row);
  return Object.freeze(INDEPENDENT_ELECTRICAL_COMPLETENESS_SLOTS_V2.map((slot) => {
    const matched = expected.required_resources.filter((resource) => resource.expected_slot === slot);
    if (matched.length > 0) {
      const typedOwners = [...new Set(matched.filter((resource) => resource.expected_owner !== "ELECTRICAL").map((resource) => resource.expected_owner))];
      const typedOnly = typedOwners.length > 0 && matched.every((resource) => resource.expected_owner !== "ELECTRICAL");
      return {
        catalog_id: row.catalog_id,
        slot,
        disposition: typedOnly ? "OWNED_BY_EXACT_TYPED_CHILD" as const : "INCLUDED_AS_SEPARATE_ROW" as const,
        expected_candidate_ids: Object.freeze(matched.map((resource) => resource.semantic_key)),
        exact_typed_child_owners: Object.freeze(typedOwners),
        reason: typedOnly
          ? `Independent technology reconstruction assigns ${matched.length} exact interface obligation(s) to ${typedOwners.join(", ")}.`
          : `Independent technology reconstruction requires ${matched.length} separately reconciled resource/stage obligation(s).`,
      };
    }
    if (["IDENTITY_PHYSICAL_RESULT", "TOPOLOGY_ROUTE_GEOMETRY", "LOAD_DEMAND_DUTY"].includes(slot)) return {
      catalog_id: row.catalog_id,
      slot,
      disposition: "PROJECT_INPUT_REQUIRED" as const,
      expected_candidate_ids: Object.freeze([]),
      exact_typed_child_owners: Object.freeze([]),
      reason: `The ${slot} obligation is a visible editable project input for ${row.catalog_id}; it must not be padded with a fictitious BOQ row.`,
    };
    return {
      catalog_id: row.catalog_id,
      slot,
      disposition: "NOT_APPLICABLE_WITH_REASON" as const,
      expected_candidate_ids: Object.freeze([]),
      exact_typed_child_owners: Object.freeze([]),
      reason: `Independent ${row.electrical_family}/${row.operation_class} reconstruction produced no separate physical resource in ${slot}; adjacent-family scope is not inherited.`,
    };
  }));
}
