import type { BoqCategoryV4 } from "../../professionalEstimateV4Contract";
import type { ElectricalDomainInventoryRow } from "./inventory";

export const ELECTRICAL_COMPLETENESS_SLOTS = Object.freeze([
  "PRIMARY_EQUIPMENT_OR_MATERIAL", "ACCESSORIES_AND_COMPONENTS", "CONSUMABLES", "FASTENERS",
  "SUPPORTS_AND_PENETRATIONS", "INSTALLATION_OPERATIONS", "SPECIALIST_LABOR", "MACHINERY",
  "POWER_TOOLS", "MEASUREMENT_INSTRUMENTS", "TEMPORARY_WORKS", "DELIVERY", "LOADING",
  "UNLOADING", "HORIZONTAL_HANDLING", "LIFTING", "HSE", "INSPECTION_AND_TESTS",
  "COMMISSIONING", "WASTE", "EXECUTIVE_DOCUMENTATION", "FINAL_ACCEPTANCE",
] as const);

export type ElectricalCompletenessSlot = typeof ELECTRICAL_COMPLETENESS_SLOTS[number];

export type ElectricalResourceCandidate = {
  candidate_id: string;
  title_ru: string;
  section_ru: string;
  category: BoqCategoryV4;
  unit_id: string;
  completeness_slot: ElectricalCompletenessSlot;
  minimal: boolean;
  normative_source_id: string;
  owner: "ELECTRICAL" | "CIVIL_TYPED_CHILD" | "STRUCTURAL_TYPED_CHILD" | "FIRE_TYPED_CHILD" | "CONTROLS_TYPED_CHILD";
  applicability: string;
};

type Seed = Omit<ElectricalResourceCandidate, "normative_source_id" | "owner" | "applicability"> &
  Partial<Pick<ElectricalResourceCandidate, "normative_source_id" | "owner" | "applicability">>;

function c(seed: Seed): ElectricalResourceCandidate {
  return {
    normative_source_id: "KG_KRERM_08_2015_ELECTRICAL",
    owner: "ELECTRICAL",
    applicability: "Применяется только при подтверждённом проектном количестве и точной спецификации выбранной работы.",
    ...seed,
  };
}

const COMMON: readonly ElectricalResourceCandidate[] = Object.freeze([
  c({ candidate_id: "project_document_review", title_ru: "Проверка рабочей документации, однолинейной схемы и границ владельцев", section_ru: "Инженерная подготовка", category: "subcontract_service", unit_id: "service", completeness_slot: "SPECIALIST_LABOR", minimal: true }),
  c({ candidate_id: "existing_services_detection", title_ru: "Обнаружение скрытых инженерных сетей трассоискателем", section_ru: "Инженерная подготовка", category: "testing", unit_id: "service", completeness_slot: "MEASUREMENT_INSTRUMENTS", minimal: false, normative_source_id: "KG_ELECTRICAL_SAFETY_2023" }),
  c({ candidate_id: "incoming_product_inspection", title_ru: "Входной контроль каждого типа электротехнического изделия и сертификата соответствия", section_ru: "Входной контроль", category: "testing", unit_id: "item", completeness_slot: "INSPECTION_AND_TESTS", minimal: true, normative_source_id: "EAEU_TR_TS_004_2011" }),
  c({ candidate_id: "electrical_installer_labor", title_ru: "Труд электромонтажника по точной операции", section_ru: "Труд", category: "labor", unit_id: "man_hour", completeness_slot: "INSTALLATION_OPERATIONS", minimal: true }),
  c({ candidate_id: "electrical_supervisor_labor", title_ru: "Труд ответственного производителя электротехнических работ", section_ru: "Труд", category: "labor", unit_id: "man_hour", completeness_slot: "SPECIALIST_LABOR", minimal: false, normative_source_id: "KG_ELECTRICAL_SAFETY_2023" }),
  c({ candidate_id: "stainless_fasteners", title_ru: "Коррозионностойкий крепёж проектного типа", section_ru: "Крепёж", category: "material", unit_id: "item", completeness_slot: "FASTENERS", minimal: true }),
  c({ candidate_id: "equipment_identification_labels", title_ru: "Стойкие идентификационные таблички и маркировочные бирки", section_ru: "Маркировка", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: true }),
  c({ candidate_id: "heat_shrink_identifier", title_ru: "Термоусаживаемый маркировочный элемент точного размера", section_ru: "Расходные материалы", category: "material", unit_id: "item", completeness_slot: "CONSUMABLES", minimal: false }),
  c({ candidate_id: "drilling_consumable", title_ru: "Сверло или коронка точного диаметра для основания по проекту", section_ru: "Расходные материалы", category: "material", unit_id: "item", completeness_slot: "CONSUMABLES", minimal: false }),
  c({ candidate_id: "support_bracket", title_ru: "Консоль или кронштейн точного типоразмера", section_ru: "Опоры и проходки", category: "material", unit_id: "item", completeness_slot: "SUPPORTS_AND_PENETRATIONS", minimal: false }),
  c({ candidate_id: "firestop_penetration", title_ru: "Сертифицированная противопожарная заделка отдельной кабельной проходки", section_ru: "Опоры и проходки", category: "material", unit_id: "item", completeness_slot: "SUPPORTS_AND_PENETRATIONS", minimal: false, normative_source_id: "KG_FIRE_SAFETY_RULES_2025", owner: "FIRE_TYPED_CHILD", applicability: "Включается только для подтверждённой ограждающей конструкции с требуемым пределом огнестойкости; не дублирует Fire-domain system work." }),
  c({ candidate_id: "cordless_drill_driver", title_ru: "Шуруповёрт с контролем момента", section_ru: "Инструмент", category: "equipment", unit_id: "machine_hour", completeness_slot: "POWER_TOOLS", minimal: false }),
  c({ candidate_id: "rotary_hammer", title_ru: "Перфоратор с системой пылеудаления", section_ru: "Инструмент", category: "equipment", unit_id: "machine_hour", completeness_slot: "POWER_TOOLS", minimal: false }),
  c({ candidate_id: "mobile_dust_extractor", title_ru: "Передвижная установка пылеудаления для сверления и резки", section_ru: "Машины и механизмы", category: "machinery", unit_id: "machine_hour", completeness_slot: "MACHINERY", minimal: false }),
  c({ candidate_id: "calibrated_torque_tool", title_ru: "Калиброванный динамометрический инструмент", section_ru: "Контрольный инструмент", category: "equipment", unit_id: "machine_hour", completeness_slot: "MEASUREMENT_INSTRUMENTS", minimal: false }),
  c({ candidate_id: "multifunction_installation_tester", title_ru: "Поверенный многофункциональный измеритель электроустановок", section_ru: "Измерительные приборы", category: "equipment", unit_id: "machine_hour", completeness_slot: "MEASUREMENT_INSTRUMENTS", minimal: false, normative_source_id: "KG_ELECTRICAL_ACCEPTANCE_2023" }),
  c({ candidate_id: "mobile_tower_or_lift", title_ru: "Доставка, монтаж, эксплуатация и демонтаж средства доступа проектной высоты", section_ru: "Временные работы", category: "temporary_work", unit_id: "shift", completeness_slot: "TEMPORARY_WORKS", minimal: false, applicability: "Только при подтверждённой высоте и выбранном безопасном средстве доступа." }),
  c({ candidate_id: "temporary_protection", title_ru: "Защита отделки, оборудования и рабочей зоны", section_ru: "Временные работы", category: "temporary_work", unit_id: "m2", completeness_slot: "TEMPORARY_WORKS", minimal: false }),
  c({ candidate_id: "lockout_tagout", title_ru: "Отключение, блокировка, проверка отсутствия напряжения и маркировка LOTO", section_ru: "HSE", category: "temporary_work", unit_id: "service", completeness_slot: "HSE", minimal: true, normative_source_id: "KG_ELECTRICAL_SAFETY_2023" }),
  c({ candidate_id: "work_zone_barrier", title_ru: "Ограждение и знаки электротехнической рабочей зоны", section_ru: "HSE", category: "temporary_work", unit_id: "shift", completeness_slot: "HSE", minimal: false, normative_source_id: "KG_ELECTRICAL_SAFETY_2023" }),
  c({ candidate_id: "material_delivery", title_ru: "Доставка электротехнических материалов отдельным рейсом", section_ru: "Логистика", category: "transport", unit_id: "vehicle_km", completeness_slot: "DELIVERY", minimal: false }),
  c({ candidate_id: "loading_labor", title_ru: "Погрузка электротехнических материалов", section_ru: "Логистика", category: "labor", unit_id: "man_hour", completeness_slot: "LOADING", minimal: false }),
  c({ candidate_id: "unloading_labor", title_ru: "Разгрузка электротехнических материалов", section_ru: "Логистика", category: "labor", unit_id: "man_hour", completeness_slot: "UNLOADING", minimal: false }),
  c({ candidate_id: "horizontal_handling", title_ru: "Горизонтальное внутриплощадочное перемещение", section_ru: "Логистика", category: "machinery", unit_id: "machine_hour", completeness_slot: "HORIZONTAL_HANDLING", minimal: false }),
  c({ candidate_id: "vertical_lifting", title_ru: "Подъём материалов на проектную отметку", section_ru: "Логистика", category: "machinery", unit_id: "machine_hour", completeness_slot: "LIFTING", minimal: false }),
  c({ candidate_id: "continuity_test", title_ru: "Измерение непрерывности защитных и рабочих проводников", section_ru: "Испытания", category: "testing", unit_id: "test", completeness_slot: "INSPECTION_AND_TESTS", minimal: false, normative_source_id: "KG_ELECTRICAL_ACCEPTANCE_2023" }),
  c({ candidate_id: "insulation_resistance_test", title_ru: "Измерение сопротивления изоляции отдельной цепи", section_ru: "Испытания", category: "testing", unit_id: "test", completeness_slot: "INSPECTION_AND_TESTS", minimal: false, normative_source_id: "KG_ELECTRICAL_ACCEPTANCE_2023" }),
  c({ candidate_id: "polarity_phase_sequence_test", title_ru: "Проверка полярности и чередования фаз", section_ru: "Испытания", category: "testing", unit_id: "test", completeness_slot: "INSPECTION_AND_TESTS", minimal: false, normative_source_id: "KG_ELECTRICAL_ACCEPTANCE_2023" }),
  c({ candidate_id: "functional_commissioning", title_ru: "Функциональная проверка и ввод выбранной электрической функции", section_ru: "Пусконаладка", category: "testing", unit_id: "test", completeness_slot: "COMMISSIONING", minimal: false, normative_source_id: "KG_KRERP_01_2015_ELECTRICAL" }),
  c({ candidate_id: "waste_sorting", title_ru: "Раздельная сортировка кабеля, металла, пластика и упаковки", section_ru: "Отходы", category: "waste", unit_id: "kg", completeness_slot: "WASTE", minimal: false }),
  c({ candidate_id: "waste_haul", title_ru: "Вывоз подтверждённой массы электротехнических отходов", section_ru: "Отходы", category: "transport", unit_id: "ton_km", completeness_slot: "WASTE", minimal: false }),
  c({ candidate_id: "photo_record", title_ru: "Фотофиксация скрытых и завершённых электротехнических работ", section_ru: "Исполнительная документация", category: "documentation", unit_id: "document", completeness_slot: "EXECUTIVE_DOCUMENTATION", minimal: false }),
  c({ candidate_id: "concealed_work_act", title_ru: "Акт освидетельствования скрытых электротехнических работ", section_ru: "Исполнительная документация", category: "documentation", unit_id: "document", completeness_slot: "EXECUTIVE_DOCUMENTATION", minimal: false }),
  c({ candidate_id: "measurement_protocol", title_ru: "Протокол электрических измерений с прибором, датой поверки и критериями", section_ru: "Исполнительная документация", category: "documentation", unit_id: "document", completeness_slot: "EXECUTIVE_DOCUMENTATION", minimal: false, normative_source_id: "KG_ELECTRICAL_ACCEPTANCE_2023" }),
  c({ candidate_id: "as_built_drawing", title_ru: "Исполнительная схема трассы, цепи или оборудования", section_ru: "Исполнительная документация", category: "documentation", unit_id: "document", completeness_slot: "EXECUTIVE_DOCUMENTATION", minimal: false }),
  c({ candidate_id: "final_acceptance", title_ru: "Итоговая приёмка электротехнической работы владельцем системы", section_ru: "Приёмка", category: "subcontract_service", unit_id: "service", completeness_slot: "FINAL_ACCEPTANCE", minimal: true, normative_source_id: "KG_ELECTRICAL_ACCEPTANCE_2023" }),
]);

const FAMILY: Readonly<Record<string, readonly ElectricalResourceCandidate[]>> = Object.freeze({
  CABLE_CHANNEL: Object.freeze([
    c({ candidate_id: "channel_body", title_ru: "Кабельный канал точного сечения и материала", section_ru: "Кабеленесущая система", category: "material", unit_id: "m", completeness_slot: "PRIMARY_EQUIPMENT_OR_MATERIAL", minimal: true }),
    c({ candidate_id: "channel_cover", title_ru: "Крышка кабельного канала точного типа", section_ru: "Кабеленесущая система", category: "material", unit_id: "m", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: true }),
    c({ candidate_id: "channel_internal_corner", title_ru: "Внутренний угол кабельного канала", section_ru: "Фасонные элементы", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: false }),
    c({ candidate_id: "channel_external_corner", title_ru: "Наружный угол кабельного канала", section_ru: "Фасонные элементы", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: false }),
    c({ candidate_id: "channel_flat_corner", title_ru: "Плоский угол кабельного канала", section_ru: "Фасонные элементы", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: false }),
    c({ candidate_id: "channel_tee", title_ru: "Тройник кабельного канала", section_ru: "Фасонные элементы", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: false }),
    c({ candidate_id: "channel_joint", title_ru: "Соединитель кабельного канала", section_ru: "Фасонные элементы", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: false }),
    c({ candidate_id: "channel_end_cap", title_ru: "Торцевая заглушка кабельного канала", section_ru: "Фасонные элементы", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: false }),
  ]),
  POWER_CABLE: Object.freeze([
    c({ candidate_id: "power_cable", title_ru: "Силовой кабель точной марки, числа жил и сечения", section_ru: "Кабельная линия", category: "material", unit_id: "m", completeness_slot: "PRIMARY_EQUIPMENT_OR_MATERIAL", minimal: true, normative_source_id: "EAEU_TR_TS_004_2011" }),
    c({ candidate_id: "termination_allowance_cable", title_ru: "Кабельный запас на оконцевание по каждому концу", section_ru: "Кабельная линия", category: "material", unit_id: "m", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: false }),
    c({ candidate_id: "cable_lug", title_ru: "Кабельный наконечник точного материала и сечения", section_ru: "Оконцевание", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: true }),
    c({ candidate_id: "cable_gland", title_ru: "Кабельный ввод точного диаметра и степени защиты", section_ru: "Оконцевание", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: true }),
    c({ candidate_id: "cable_joint", title_ru: "Соединительная кабельная муфта проектного класса", section_ru: "Соединения", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: false }),
    c({ candidate_id: "cable_cleat", title_ru: "Кабельный хомут с расчётной удерживающей способностью", section_ru: "Крепление", category: "material", unit_id: "item", completeness_slot: "SUPPORTS_AND_PENETRATIONS", minimal: false }),
    c({ candidate_id: "drum_jacks", title_ru: "Кабельные домкраты расчётной грузоподъёмности", section_ru: "Механизмы", category: "machinery", unit_id: "machine_hour", completeness_slot: "MACHINERY", minimal: false }),
    c({ candidate_id: "cable_rollers", title_ru: "Кабельные ролики проектного типа", section_ru: "Механизмы", category: "equipment", unit_id: "machine_hour", completeness_slot: "MACHINERY", minimal: false }),
    c({ candidate_id: "pulling_winch", title_ru: "Кабельная лебёдка с контролем тягового усилия", section_ru: "Механизмы", category: "machinery", unit_id: "machine_hour", completeness_slot: "MACHINERY", minimal: false }),
    c({ candidate_id: "hydraulic_crimper", title_ru: "Пресс-инструмент с матрицей точного сечения", section_ru: "Инструмент", category: "equipment", unit_id: "machine_hour", completeness_slot: "POWER_TOOLS", minimal: false }),
    c({ candidate_id: "cable_log", title_ru: "Кабельный журнал с барабаном, длиной, концами и результатами испытаний", section_ru: "Исполнительная документация", category: "documentation", unit_id: "document", completeness_slot: "EXECUTIVE_DOCUMENTATION", minimal: false }),
  ]),
  VVG_CABLE: Object.freeze([]),
  BREAKER: Object.freeze([
    c({ candidate_id: "circuit_breaker", title_ru: "Автоматический выключатель точной полюсности, характеристики и отключающей способности", section_ru: "Аппараты защиты", category: "material", unit_id: "item", completeness_slot: "PRIMARY_EQUIPMENT_OR_MATERIAL", minimal: true, normative_source_id: "EAEU_TR_TS_004_2011" }),
    c({ candidate_id: "breaker_auxiliary_contact", title_ru: "Вспомогательный контакт автоматического выключателя", section_ru: "Аппараты защиты", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: false }),
    c({ candidate_id: "breaker_bus_comb", title_ru: "Гребенчатая шина точного шага и сечения", section_ru: "Аппараты защиты", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: false }),
  ]),
  RCD: Object.freeze([
    c({ candidate_id: "rcd_rcbo", title_ru: "УЗО или дифавтомат точного типа, тока и чувствительности", section_ru: "Дифференциальная защита", category: "material", unit_id: "item", completeness_slot: "PRIMARY_EQUIPMENT_OR_MATERIAL", minimal: true, normative_source_id: "EAEU_TR_TS_004_2011" }),
    c({ candidate_id: "rcd_test", title_ru: "Измерение времени и тока срабатывания УЗО", section_ru: "Испытания", category: "testing", unit_id: "test", completeness_slot: "INSPECTION_AND_TESTS", minimal: true, normative_source_id: "KG_ELECTRICAL_ACCEPTANCE_2023" }),
  ]),
  PANEL: Object.freeze([
    c({ candidate_id: "panel_enclosure", title_ru: "Корпус щита точных габаритов, IP/IK и климатического исполнения", section_ru: "Щит", category: "material", unit_id: "item", completeness_slot: "PRIMARY_EQUIPMENT_OR_MATERIAL", minimal: true, normative_source_id: "EAEU_TR_TS_004_2011" }),
    c({ candidate_id: "panel_main_busbar", title_ru: "Главные фазные шины расчётного материала и сечения", section_ru: "Щит", category: "material", unit_id: "m", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: true }),
    c({ candidate_id: "panel_pe_busbar", title_ru: "Защитная PE-шина расчётного сечения", section_ru: "Щит", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: true }),
    c({ candidate_id: "panel_neutral_busbar", title_ru: "Нулевая N-шина расчётного сечения", section_ru: "Щит", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: true }),
    c({ candidate_id: "panel_din_rail", title_ru: "DIN-рейка точной длины", section_ru: "Щит", category: "material", unit_id: "m", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: false }),
    c({ candidate_id: "panel_main_device", title_ru: "Вводной коммутационно-защитный аппарат точного типа", section_ru: "Щит", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: true }),
    c({ candidate_id: "panel_outgoing_breaker", title_ru: "Отходящий автоматический выключатель отдельного номинала", section_ru: "Щит", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: false }),
    c({ candidate_id: "panel_rcd_rcbo", title_ru: "Щитовое УЗО или RCBO отдельного типа", section_ru: "Щит", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: false }),
    c({ candidate_id: "panel_spd", title_ru: "УЗИП точного класса с устройством резервной защиты", section_ru: "Щит", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: false }),
    c({ candidate_id: "panel_contactor", title_ru: "Контактор точной категории применения", section_ru: "Щит", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: false }),
    c({ candidate_id: "panel_terminal", title_ru: "Клемма точного сечения и назначения", section_ru: "Щит", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: false }),
    c({ candidate_id: "panel_internal_wire", title_ru: "Внутренняя проводка щита точного сечения и цвета", section_ru: "Щит", category: "material", unit_id: "m", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: false }),
    c({ candidate_id: "panel_single_line_diagram", title_ru: "Исполнительная однолинейная схема щита", section_ru: "Исполнительная документация", category: "documentation", unit_id: "document", completeness_slot: "EXECUTIVE_DOCUMENTATION", minimal: false }),
  ]),
  LIGHTING: Object.freeze([
    c({ candidate_id: "luminaire", title_ru: "Светильник точного типа, мощности, фотометрии, IP/IK и класса защиты", section_ru: "Освещение", category: "material", unit_id: "item", completeness_slot: "PRIMARY_EQUIPMENT_OR_MATERIAL", minimal: true, normative_source_id: "EAEU_TR_TS_004_2011" }),
    c({ candidate_id: "luminaire_driver", title_ru: "Драйвер светильника точной мощности и способа управления", section_ru: "Освещение", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: false }),
    c({ candidate_id: "emergency_battery", title_ru: "Блок аварийного питания с проектной автономностью", section_ru: "Освещение", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: false }),
    c({ candidate_id: "lighting_suspension", title_ru: "Индивидуальный подвес или кронштейн светильника", section_ru: "Освещение", category: "material", unit_id: "item", completeness_slot: "SUPPORTS_AND_PENETRATIONS", minimal: false }),
    c({ candidate_id: "illuminance_measurement", title_ru: "Измерение освещённости поверенным люксметром", section_ru: "Испытания", category: "testing", unit_id: "test", completeness_slot: "INSPECTION_AND_TESTS", minimal: false }),
  ]),
  LED_STRIP: Object.freeze([
    c({ candidate_id: "led_strip", title_ru: "Светодиодная лента точной мощности, CCT, CRI и степени защиты", section_ru: "Светодиодная система", category: "material", unit_id: "m", completeness_slot: "PRIMARY_EQUIPMENT_OR_MATERIAL", minimal: true, normative_source_id: "EAEU_TR_TS_004_2011" }),
    c({ candidate_id: "led_profile", title_ru: "Алюминиевый профиль точного типа", section_ru: "Светодиодная система", category: "material", unit_id: "m", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: true }),
    c({ candidate_id: "led_diffuser", title_ru: "Рассеиватель точного профиля", section_ru: "Светодиодная система", category: "material", unit_id: "m", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: false }),
    c({ candidate_id: "led_power_supply", title_ru: "Источник питания с расчётным запасом мощности", section_ru: "Светодиодная система", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: true }),
    c({ candidate_id: "led_connector", title_ru: "Соединитель или пайка отдельного участка ленты", section_ru: "Светодиодная система", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: false }),
  ]),
  SOCKET: Object.freeze([
    c({ candidate_id: "socket_device", title_ru: "Розетка точного типа, номинала, IP/IK и способа монтажа", section_ru: "Установочное изделие", category: "material", unit_id: "item", completeness_slot: "PRIMARY_EQUIPMENT_OR_MATERIAL", minimal: true, normative_source_id: "EAEU_TR_TS_004_2011" }),
    c({ candidate_id: "socket_box", title_ru: "Монтажная коробка точной глубины и материала", section_ru: "Установочное изделие", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: true }),
    c({ candidate_id: "socket_frame", title_ru: "Рамка точного числа постов", section_ru: "Установочное изделие", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: false }),
    c({ candidate_id: "socket_pe_test", title_ru: "Проверка защитного контакта розетки", section_ru: "Испытания", category: "testing", unit_id: "test", completeness_slot: "INSPECTION_AND_TESTS", minimal: false }),
  ]),
  SWITCH: Object.freeze([
    c({ candidate_id: "switch_device", title_ru: "Выключатель или пост управления точного типа и номинала", section_ru: "Установочное изделие", category: "material", unit_id: "item", completeness_slot: "PRIMARY_EQUIPMENT_OR_MATERIAL", minimal: true, normative_source_id: "EAEU_TR_TS_004_2011" }),
    c({ candidate_id: "switch_box", title_ru: "Монтажная коробка точной глубины и материала", section_ru: "Установочное изделие", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: true }),
    c({ candidate_id: "switch_frame", title_ru: "Рамка точного числа постов", section_ru: "Установочное изделие", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: false }),
  ]),
});

const EXPANDED_ROUTE_FAMILIES = new Set(["cable_ducts", "cable_pulling", "cable_trench", "cable_trench_energy", "underground_cable_line", "overhead_power_line_04kv", "overhead_power_line_10kv", "overhead_power_line_35kv", "overhead_power_line_110kv"]);
const EXPANDED_POLE_FAMILIES = new Set(["electrical_poles_04kv", "electrical_poles_10kv", "electrical_poles_35kv", "electrical_poles_110kv", "street_lighting_poles"]);
const EXPANDED_SUBSTATION_FAMILIES = new Set(["distribution_board_outdoor", "distribution_substation", "outdoor_switchgear", "package_transformer_substation", "substation_10kv", "substation_35kv", "substation_110kv", "transformer_substation"]);

function expandedCandidates(family: string): readonly ElectricalResourceCandidate[] {
  if (EXPANDED_ROUTE_FAMILIES.has(family)) return [
    c({ candidate_id: "route_primary_conductor_or_duct", title_ru: "Основной кабель, провод или кабельный блок точной проектной спецификации", section_ru: "Наружная электрическая линия", category: "material", unit_id: "m", completeness_slot: "PRIMARY_EQUIPMENT_OR_MATERIAL", minimal: true }),
    c({ candidate_id: "route_joint", title_ru: "Муфта или соединительный узел точного класса напряжения", section_ru: "Наружная электрическая линия", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: true }),
    c({ candidate_id: "route_warning_tape", title_ru: "Сигнальная лента с идентификацией электрической линии", section_ru: "Наружная электрическая линия", category: "material", unit_id: "m", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: false }),
    c({ candidate_id: "route_survey", title_ru: "Геодезическая разбивка и исполнительная съёмка трассы", section_ru: "Геодезия", category: "subcontract_service", unit_id: "m", completeness_slot: "SPECIALIST_LABOR", minimal: false }),
    c({ candidate_id: "civil_trench_child", title_ru: "Разработка, крепление, водоотлив, основание и обратная засыпка траншеи", section_ru: "Civil typed child", category: "work", unit_id: "m3", completeness_slot: "MACHINERY", minimal: false, owner: "CIVIL_TYPED_CHILD", applicability: "Только когда траншея включена в договор Electrical system package; стоимость принадлежит Civil typed child и не дублируется." }),
    c({ candidate_id: "surface_restoration_child", title_ru: "Восстановление покрытия над кабельной линией", section_ru: "Civil typed child", category: "work", unit_id: "m2", completeness_slot: "FINAL_ACCEPTANCE", minimal: false, owner: "CIVIL_TYPED_CHILD", applicability: "Только при подтверждённом нарушении покрытия и договорной границе Civil typed child." }),
  ];
  if (EXPANDED_POLE_FAMILIES.has(family)) return [
    c({ candidate_id: "electrical_pole", title_ru: "Опора электросети точного класса, материала и длины", section_ru: "Воздушная линия", category: "material", unit_id: "item", completeness_slot: "PRIMARY_EQUIPMENT_OR_MATERIAL", minimal: true }),
    c({ candidate_id: "pole_crossarm", title_ru: "Траверса точной схемы", section_ru: "Воздушная линия", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: true }),
    c({ candidate_id: "pole_insulator", title_ru: "Изолятор точного класса напряжения", section_ru: "Воздушная линия", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: true }),
    c({ candidate_id: "pole_conductor", title_ru: "Провод воздушной линии точной марки и сечения", section_ru: "Воздушная линия", category: "material", unit_id: "m", completeness_slot: "PRIMARY_EQUIPMENT_OR_MATERIAL", minimal: false }),
    c({ candidate_id: "pole_earthing", title_ru: "Заземляющий проводник и присоединение опоры", section_ru: "Заземление", category: "material", unit_id: "item", completeness_slot: "SUPPORTS_AND_PENETRATIONS", minimal: false }),
    c({ candidate_id: "pole_crane", title_ru: "Автокран расчётной грузоподъёмности для установки опоры", section_ru: "Механизмы", category: "machinery", unit_id: "machine_hour", completeness_slot: "MACHINERY", minimal: false }),
    c({ candidate_id: "pole_foundation_child", title_ru: "Фундамент или заделка опоры по конструктивному проекту", section_ru: "Structural typed child", category: "work", unit_id: "m3", completeness_slot: "SUPPORTS_AND_PENETRATIONS", minimal: false, owner: "STRUCTURAL_TYPED_CHILD", applicability: "Только при договорной границе Electrical system package; расчёт и стоимость сохраняются за Structural typed child." }),
  ];
  if (EXPANDED_SUBSTATION_FAMILIES.has(family)) return [
    c({ candidate_id: "substation_enclosure", title_ru: "Корпус или оболочка электроустановки точного исполнения", section_ru: "Подстанция", category: "material", unit_id: "item", completeness_slot: "PRIMARY_EQUIPMENT_OR_MATERIAL", minimal: true }),
    c({ candidate_id: "power_transformer", title_ru: "Силовой трансформатор точной мощности, класса напряжения и схемы соединения", section_ru: "Подстанция", category: "material", unit_id: "item", completeness_slot: "PRIMARY_EQUIPMENT_OR_MATERIAL", minimal: true }),
    c({ candidate_id: "hv_switchgear_cell", title_ru: "Ячейка РУ точного назначения и класса напряжения", section_ru: "Подстанция", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: true }),
    c({ candidate_id: "lv_switchboard", title_ru: "Низковольтное распределительное устройство точной конфигурации", section_ru: "Подстанция", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: true }),
    c({ candidate_id: "protection_relay", title_ru: "Устройство релейной защиты точной функции", section_ru: "Подстанция", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: false }),
    c({ candidate_id: "current_transformer", title_ru: "Трансформатор тока точного коэффициента и класса точности", section_ru: "Подстанция", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: false }),
    c({ candidate_id: "voltage_transformer", title_ru: "Трансформатор напряжения точного коэффициента и класса точности", section_ru: "Подстанция", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: false }),
    c({ candidate_id: "oil_or_gas_test", title_ru: "Лабораторное испытание изоляционной среды оборудования", section_ru: "Испытания", category: "subcontract_service", unit_id: "test", completeness_slot: "INSPECTION_AND_TESTS", minimal: false }),
    c({ candidate_id: "heavy_lift_crane", title_ru: "Кран расчётной грузоподъёмности для монтажа оборудования", section_ru: "Механизмы", category: "machinery", unit_id: "machine_hour", completeness_slot: "MACHINERY", minimal: false }),
    c({ candidate_id: "substation_foundation_child", title_ru: "Фундамент электрооборудования по конструктивному проекту", section_ru: "Structural typed child", category: "work", unit_id: "m3", completeness_slot: "SUPPORTS_AND_PENETRATIONS", minimal: false, owner: "STRUCTURAL_TYPED_CHILD", applicability: "Только при договорной границе Electrical system package; Structural owner сохраняется." }),
  ];
  if (family === "grounding_system" || family === "lightning_protection") return [
    c({ candidate_id: "earthing_conductor", title_ru: "Заземляющий или молниезащитный проводник точного материала и сечения", section_ru: "Заземление и молниезащита", category: "material", unit_id: "m", completeness_slot: "PRIMARY_EQUIPMENT_OR_MATERIAL", minimal: true }),
    c({ candidate_id: "earth_electrode", title_ru: "Заземлитель точного материала, сечения и длины", section_ru: "Заземление и молниезащита", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: true }),
    c({ candidate_id: "test_joint", title_ru: "Разъёмное контрольное соединение", section_ru: "Заземление и молниезащита", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: false }),
    c({ candidate_id: "exothermic_weld", title_ru: "Комплект отдельного экзотермического соединения точного типа", section_ru: "Соединения", category: "material", unit_id: "item", completeness_slot: "CONSUMABLES", minimal: false }),
    c({ candidate_id: "earth_resistance_test", title_ru: "Измерение сопротивления заземляющего устройства", section_ru: "Испытания", category: "testing", unit_id: "test", completeness_slot: "INSPECTION_AND_TESTS", minimal: true, normative_source_id: "KG_ELECTRICAL_ACCEPTANCE_2023" }),
  ];
  if (family === "battery_energy_storage") return [
    c({ candidate_id: "battery_module", title_ru: "Аккумуляторный модуль точной химии, ёмкости и напряжения", section_ru: "Накопитель энергии", category: "material", unit_id: "item", completeness_slot: "PRIMARY_EQUIPMENT_OR_MATERIAL", minimal: true, normative_source_id: "EAEU_TR_TS_004_2011" }),
    c({ candidate_id: "battery_rack", title_ru: "Стойка аккумуляторных модулей точной конфигурации", section_ru: "Накопитель энергии", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: true }),
    c({ candidate_id: "battery_management_system", title_ru: "BMS аккумуляторной системы с точным числом контролируемых модулей", section_ru: "Накопитель энергии", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: true, owner: "CONTROLS_TYPED_CHILD", applicability: "Electrical supplies and connects the BMS hardware; higher-level integration remains Controls typed child." }),
    c({ candidate_id: "battery_dc_protection", title_ru: "Аппарат DC-защиты точного номинала", section_ru: "Накопитель энергии", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: false }),
    c({ candidate_id: "battery_ventilation_interface", title_ru: "Интерфейс блокировки с вентиляцией помещения батарей", section_ru: "Typed-child interface", category: "subcontract_service", unit_id: "service", completeness_slot: "COMMISSIONING", minimal: false, owner: "CONTROLS_TYPED_CHILD", applicability: "Только cause-and-effect интерфейс; воздуховоды и вентиляционное оборудование принадлежат HVAC." }),
  ];
  if (family === "relay_protection_automation") return [
    c({ candidate_id: "relay_terminal", title_ru: "Терминал релейной защиты точной функции и протокола", section_ru: "Релейная защита", category: "material", unit_id: "item", completeness_slot: "PRIMARY_EQUIPMENT_OR_MATERIAL", minimal: true }),
    c({ candidate_id: "relay_test_set", title_ru: "Комплект вторичного впрыска для проверки защит", section_ru: "Измерительные приборы", category: "equipment", unit_id: "machine_hour", completeness_slot: "MEASUREMENT_INSTRUMENTS", minimal: true }),
    c({ candidate_id: "protection_setting_calculation", title_ru: "Расчёт и согласование уставок релейной защиты", section_ru: "Инженерные услуги", category: "subcontract_service", unit_id: "service", completeness_slot: "SPECIALIST_LABOR", minimal: true }),
    c({ candidate_id: "cause_effect_test", title_ru: "Проверка матрицы воздействий защит на коммутационные аппараты", section_ru: "Пусконаладка", category: "testing", unit_id: "test", completeness_slot: "COMMISSIONING", minimal: false }),
  ];
  return [
    c({ candidate_id: "system_primary_equipment", title_ru: "Основное электротехническое изделие точной проектной спецификации", section_ru: "Электротехническая система", category: "material", unit_id: "item", completeness_slot: "PRIMARY_EQUIPMENT_OR_MATERIAL", minimal: true }),
    c({ candidate_id: "system_connection_component", title_ru: "Соединительный компонент точного типа и класса", section_ru: "Электротехническая система", category: "material", unit_id: "item", completeness_slot: "ACCESSORIES_AND_COMPONENTS", minimal: true }),
    c({ candidate_id: "system_special_test", title_ru: "Специализированное испытание точной функции системы", section_ru: "Испытания", category: "testing", unit_id: "test", completeness_slot: "INSPECTION_AND_TESTS", minimal: true, normative_source_id: "KG_ELECTRICAL_ACCEPTANCE_2023" }),
  ];
}

const OPERATION: Readonly<Record<string, readonly ElectricalResourceCandidate[]>> = Object.freeze({
  PREPARE: [c({ candidate_id: "laser_route_marking", title_ru: "Лазерная разметка точной трассы и отметок", section_ru: "Подготовительные операции", category: "labor", unit_id: "man_hour", completeness_slot: "INSTALLATION_OPERATIONS", minimal: true })],
  INSTALL: [c({ candidate_id: "exact_component_installation", title_ru: "Монтаж каждого точного компонента по проектной позиции", section_ru: "Монтажные операции", category: "labor", unit_id: "man_hour", completeness_slot: "INSTALLATION_OPERATIONS", minimal: true })],
  LAY: [c({ candidate_id: "route_laying_labor", title_ru: "Раскладка, протяжка, укладка и крепление по трассе", section_ru: "Монтажные операции", category: "labor", unit_id: "man_hour", completeness_slot: "INSTALLATION_OPERATIONS", minimal: true })],
  CONNECT: [c({ candidate_id: "termination_connection_labor", title_ru: "Разделка, оконцевание, подключение и контроль момента", section_ru: "Монтажные операции", category: "labor", unit_id: "man_hour", completeness_slot: "INSTALLATION_OPERATIONS", minimal: true })],
  MARK: [c({ candidate_id: "circuit_marking_labor", title_ru: "Маркировка каждой цепи, жилы, аппарата и конца", section_ru: "Монтажные операции", category: "labor", unit_id: "man_hour", completeness_slot: "INSTALLATION_OPERATIONS", minimal: true })],
  TEST: [c({ candidate_id: "electrical_test_engineer", title_ru: "Труд инженера электролаборатории по программе испытаний", section_ru: "Испытания", category: "labor", unit_id: "man_hour", completeness_slot: "SPECIALIST_LABOR", minimal: true, normative_source_id: "KG_ELECTRICAL_ACCEPTANCE_2023" })],
  COMMISSION: [c({ candidate_id: "commissioning_engineer", title_ru: "Труд инженера-наладчика по функциональной программе", section_ru: "Пусконаладка", category: "labor", unit_id: "man_hour", completeness_slot: "COMMISSIONING", minimal: true, normative_source_id: "KG_KRERP_01_2015_ELECTRICAL" })],
  REPLACE: [
    c({ candidate_id: "isolation_and_diagnosis", title_ru: "Диагностика, идентификация и безопасное отключение заменяемой цепи", section_ru: "Ремонт", category: "labor", unit_id: "man_hour", completeness_slot: "SPECIALIST_LABOR", minimal: true, normative_source_id: "KG_ELECTRICAL_SAFETY_2023" }),
    c({ candidate_id: "controlled_dismantling", title_ru: "Контролируемый демонтаж отдельного электротехнического изделия", section_ru: "Ремонт", category: "labor", unit_id: "man_hour", completeness_slot: "INSTALLATION_OPERATIONS", minimal: true }),
    c({ candidate_id: "removed_electrical_waste", title_ru: "Демонтированное электротехническое изделие по фактической массе", section_ru: "Отходы", category: "waste", unit_id: "kg", completeness_slot: "WASTE", minimal: false }),
  ],
});

function deduplicate(candidates: readonly ElectricalResourceCandidate[]): ElectricalResourceCandidate[] {
  const result = new Map<string, ElectricalResourceCandidate>();
  for (const candidate of candidates) if (!result.has(candidate.candidate_id)) result.set(candidate.candidate_id, candidate);
  return [...result.values()];
}

export function electricalResourceCandidatesFor(row: ElectricalDomainInventoryRow): readonly ElectricalResourceCandidate[] {
  const family = row.electrical_family;
  const base = FAMILY[family] ?? expandedCandidates(family);
  const operation = OPERATION[row.operation_class] ?? [];
  const inheritedCable = family === "VVG_CABLE" ? FAMILY.POWER_CABLE : [];
  return Object.freeze(deduplicate([...base, ...inheritedCable, ...operation, ...COMMON]));
}

export function assertElectricalCompletenessSlots(row: ElectricalDomainInventoryRow): void {
  const present = new Set(electricalResourceCandidatesFor(row).map((candidate) => candidate.completeness_slot));
  const missing = ELECTRICAL_COMPLETENESS_SLOTS.filter((slot) => !present.has(slot));
  if (missing.length) throw new Error(`ELECTRICAL_COMPLETENESS_SLOT_MISSING:${row.catalog_id}:${missing.join(",")}`);
}
