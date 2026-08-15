import type { GlobalCatalogInventoryRowV1 } from "../../../src/lib/estimate/v4/domainFactory/globalCatalogInventoryV1";

export type WaterR5Complexity = "L1" | "L2" | "L3" | "L4" | "L5";
export type WaterR5RowType = "material" | "labor" | "equipment" | "service" | "waste" | "other";
export type WaterR5Condition =
  | { kind: "literal"; value: boolean }
  | { kind: "parameter"; id: string }
  | { kind: "equals"; parameterId: string; value: unknown }
  | { kind: "and"; operands: WaterR5Condition[] };

export type WaterR5Input = {
  parameterId: string;
  valueType: "decimal" | "integer" | "boolean" | "enum" | "text";
  unitId: string | null;
  titleRu: string;
  required: boolean;
  defaultValue: unknown;
  constraints: Record<string, unknown>;
};

export type WaterR5Obligation = {
  key: string;
  section: string;
  category: string;
  titleRu: string;
  rowType: WaterR5RowType;
  unitId: string;
  expression: string;
  condition: WaterR5Condition;
  procurementEligible: boolean;
  semanticOwner: string;
  sourceId: string;
  locator: string;
  priceSourceId: string;
  applicability: string;
  componentKey: string;
  actionKey: string;
  componentRole: ComponentRole;
};

export type WaterR5Plan = {
  complexity: WaterR5Complexity;
  estimateMaturity: EstimateMaturity;
  requiredStages: string[];
  optionalStages: string[];
  components: Component[];
  inputs: WaterR5Input[];
  obligations: WaterR5Obligation[];
  obligationUniverse: Array<{
    componentKey: string;
    componentTitleRu: string;
    role: ComponentRole;
    required: boolean;
    detailLevel: number;
    disposition: "INCLUDED";
  }>;
};

type EstimateMaturity = "TASK" | "ROM_CONCEPT" | "PRELIMINARY_BOQ" | "TENDER_BOQ" | "DETAILED_BOQ" | "AS_BUILT";
type ComponentRole =
  | "MATERIAL"
  | "FITTING"
  | "VALVE"
  | "EQUIPMENT"
  | "PROCESS"
  | "CIVIL_INTERFACE"
  | "ELECTRICAL_INTERFACE"
  | "TEST"
  | "DOCUMENT"
  | "LOGISTICS"
  | "DEMOLITION";

type Component = {
  key: string;
  titleRu: string;
  role: ComponentRole;
  unitId: "m" | "m2" | "m3" | "item" | "kg" | "set" | "test";
  detailLevel: 1 | 2 | 3 | 4;
  required: boolean;
};

type R5ProfileView = {
  kind: string;
  outputParameterId: "route_length_m" | "component_count" | "process_unit_count";
  outputUnitId: "m" | "item";
  networkLocation: "INTERNAL" | "EXTERNAL" | "FACILITY";
  fluid: string;
  materialVariants: readonly string[];
  primaryNormSourceId: string;
  priceSourceId: string;
};

const c = (
  key: string,
  titleRu: string,
  role: ComponentRole,
  unitId: Component["unitId"] = "item",
  detailLevel: Component["detailLevel"] = 2,
  required = true,
): Component => ({ key, titleRu, role, unitId, detailLevel, required });

const PREPARATION_COMPONENTS: readonly Component[] = [
  c("project_scope_review", "Проверка рабочей документации, спецификации и границ смежных владельцев", "DOCUMENT", "set", 1),
  c("work_area_acceptance", "Приёмка зоны производства работ и доступов", "CIVIL_INTERFACE", "set", 1),
  c("existing_services_detection", "Выявление существующих инженерных коммуникаций", "CIVIL_INTERFACE", "set", 2, false),
  c("setting_out", "Разбивка осей, отметок и точек подключения", "CIVIL_INTERFACE", "set", 1),
  c("safe_isolation", "Безопасное отключение, слив и блокировка действующей системы", "PROCESS", "item", 1, false),
  c("temporary_protection", "Защита отделки, оборудования и открытых концов", "MATERIAL", "set", 2),
  c("incoming_inspection", "Входной контроль материалов, паспортов и комплектности", "DOCUMENT", "set", 1),
  c("method_statement", "Технологическая карта и план контроля качества", "DOCUMENT", "set", 2),
];

const CONNECTION_COMPONENTS: readonly Component[] = [
  c("connection_spool", "Соединительный патрубок проектного диаметра", "MATERIAL", "item", 1),
  c("transition_adapter", "Переход на материал и диаметр существующей системы", "FITTING", "item", 1),
  c("union_or_flange", "Разъёмное муфтовое или фланцевое соединение", "FITTING", "item", 2),
  c("joint_seal", "Прокладка, уплотнительное кольцо или герметик соединения", "MATERIAL", "item", 1),
  c("joint_fasteners", "Комплект крепежа соединения", "MATERIAL", "set", 2),
  c("local_isolation_valve", "Локальная запорная арматура", "VALVE", "item", 2, false),
  c("connection_support", "Опора или крепление узла подключения", "MATERIAL", "item", 2),
  c("connection_label", "Маркировка точки подключения", "MATERIAL", "item", 3),
  c("connection_integrity_test", "Проверка герметичности точки подключения", "TEST", "test", 1),
];

const TEST_COMPONENTS: readonly Component[] = [
  c("test_boundary_review", "Проверка границ и готовности испытательного участка", "DOCUMENT", "set", 1),
  c("temporary_test_caps", "Временные заглушки испытательного участка", "MATERIAL", "item", 1),
  c("calibrated_test_gauge", "Поверенный манометр или измерительный комплект", "EQUIPMENT", "item", 1),
  c("test_pump_or_fill_unit", "Испытательный насос или установка заполнения", "EQUIPMENT", "item", 1),
  c("test_water_or_medium", "Испытательная вода или допустимая среда", "PROCESS", "m3", 2),
  c("air_release_during_fill", "Удаление воздуха при заполнении", "PROCESS", "item", 2),
  c("pressure_holding_test", "Выдержка давления и контроль падения", "TEST", "test", 1),
  c("leak_inspection", "Осмотр стыков и соединений на утечки", "TEST", "test", 1),
  c("controlled_drainage", "Контролируемый слив испытательной среды", "PROCESS", "m3", 2),
  c("test_protocol", "Протокол испытания с идентификацией приборов", "DOCUMENT", "set", 1),
];

const SEAL_COMPONENTS: readonly Component[] = [
  c("joint_surface_preparation", "Очистка и подготовка поверхностей соединения", "PROCESS", "item", 1),
  c("primary_sealing_element", "Основное уплотнительное кольцо или прокладка", "MATERIAL", "item", 1),
  c("thread_seal", "Резьбовой уплотнительный материал", "MATERIAL", "set", 2, false),
  c("sanitary_sealant", "Эластичный санитарный герметик", "MATERIAL", "m", 2, false),
  c("flange_fastener_set", "Крепёж фланцевого соединения", "MATERIAL", "set", 2, false),
  c("torque_control", "Контроль затяжки крепежа", "TEST", "test", 2),
  c("sealed_joint_test", "Проверка герметичности уплотнённого соединения", "TEST", "test", 1),
  c("seal_work_record", "Запись материала и результата герметизации", "DOCUMENT", "set", 2),
];

const FIXTURE_COMPONENTS: readonly Component[] = [
  c("fixture_body", "Корпус санитарно-технического прибора", "EQUIPMENT", "item", 1),
  c("mounting_frame", "Несущая рама или монтажная траверса", "MATERIAL", "item", 2, false),
  c("mounting_kit", "Штатный монтажный комплект", "MATERIAL", "set", 1),
  c("cold_water_connector", "Подводка холодной воды", "FITTING", "item", 2, false),
  c("hot_water_connector", "Подводка горячей воды", "FITTING", "item", 2, false),
  c("fixture_isolation_valve", "Запорный кран прибора", "VALVE", "item", 2, false),
  c("fixture_trap", "Сифон или гидрозатвор", "EQUIPMENT", "item", 2, false),
  c("waste_connector", "Выпуск и канализационный соединитель", "FITTING", "item", 2, false),
  c("wall_or_floor_fixings", "Крепления к стене или полу", "MATERIAL", "set", 2),
  c("acoustic_separation_pad", "Акустическая разделительная прокладка", "MATERIAL", "item", 3, false),
  c("sanitary_perimeter_seal", "Санитарная герметизация примыкания", "MATERIAL", "m", 2),
  c("waterproofing_interface", "Приёмка гидроизоляции в зоне примыкания", "CIVIL_INTERFACE", "set", 3, false),
  c("access_panel_interface", "Координация ревизионного доступа", "CIVIL_INTERFACE", "item", 3, false),
  c("fixture_functional_test", "Функциональная проверка подачи и отвода воды", "TEST", "test", 1),
  c("fixture_passport", "Паспорт, гарантия и акт установки прибора", "DOCUMENT", "set", 2),
];

const INTERNAL_NETWORK_COMPONENTS: readonly Component[] = [
  c("carrier_pipe", "Трубопровод проектного материала и диаметра", "MATERIAL", "m", 1),
  c("branch_pipe", "Ответвление трубопровода", "MATERIAL", "m", 2, false),
  c("elbow_90", "Отвод 90 градусов", "FITTING", "item", 2),
  c("elbow_45", "Отвод 45 градусов", "FITTING", "item", 2, false),
  c("equal_tee", "Тройник равнопроходной", "FITTING", "item", 2, false),
  c("reducing_tee", "Тройник переходной", "FITTING", "item", 3, false),
  c("reducer", "Переход диаметра", "FITTING", "item", 2, false),
  c("coupling", "Соединительная муфта", "FITTING", "item", 2),
  c("repair_coupling", "Ремонтная муфта", "FITTING", "item", 3, false),
  c("union", "Разъёмное соединение", "FITTING", "item", 3, false),
  c("flanged_joint", "Фланцевое соединение", "FITTING", "item", 3, false),
  c("joint_sealing_set", "Уплотнения стыков", "MATERIAL", "set", 2),
  c("isolation_valve", "Запорная арматура", "VALVE", "item", 2, false),
  c("check_valve", "Обратная арматура", "VALVE", "item", 3, false),
  c("regulating_valve", "Регулирующая арматура", "VALVE", "item", 3, false),
  c("drain_valve", "Дренажная арматура", "VALVE", "item", 3, false),
  c("air_release", "Устройство выпуска воздуха", "VALVE", "item", 3, false),
  c("support_bracket", "Несущий кронштейн", "MATERIAL", "item", 2),
  c("pipe_clamp", "Хомут с проектной вкладкой", "MATERIAL", "item", 2),
  c("anchor_fixing", "Анкер крепления", "MATERIAL", "item", 2),
  c("fixed_point", "Неподвижная опора", "MATERIAL", "item", 3, false),
  c("guide_support", "Направляющая опора", "MATERIAL", "item", 3, false),
  c("penetration_sleeve", "Гильза проходки", "MATERIAL", "item", 2, false),
  c("penetration_seal", "Водо- и газонепроницаемая заделка проходки", "MATERIAL", "item", 2, false),
  c("firestop_interface", "Граница противопожарной заделки", "CIVIL_INTERFACE", "item", 3, false),
  c("thermal_or_acoustic_insulation", "Проектная изоляция трубопровода", "MATERIAL", "m2", 3, false),
  c("protective_cover", "Защитный покров изоляции", "MATERIAL", "m2", 4, false),
  c("pipeline_identification", "Маркировка трубопровода и направления потока", "MATERIAL", "item", 3),
  c("route_as_built_survey", "Исполнительная съёмка трассы и отметок", "DOCUMENT", "set", 3),
  c("network_integrity_test", "Гидравлическое или герметичностное испытание", "TEST", "test", 1),
  c("network_flushing", "Промывка смонтированной сети", "TEST", "test", 2),
  c("network_disinfection", "Дезинфекция сети питьевой воды", "TEST", "test", 3, false),
];

const INTERNAL_EQUIPMENT_COMPONENTS: readonly Component[] = [
  c("duty_unit", "Основной агрегат проектной производительности", "EQUIPMENT", "item", 1),
  c("standby_unit", "Резервный агрегат", "EQUIPMENT", "item", 3, false),
  c("equipment_frame", "Монтажная рама или салазки", "MATERIAL", "item", 2),
  c("anchor_set", "Анкерный комплект", "MATERIAL", "set", 2),
  c("vibration_mount", "Виброопора", "MATERIAL", "item", 3, false),
  c("flexible_connector", "Гибкая вставка", "FITTING", "item", 3, false),
  c("suction_spool", "Всасывающий патрубок", "MATERIAL", "item", 2, false),
  c("discharge_spool", "Напорный патрубок", "MATERIAL", "item", 2, false),
  c("equipment_isolation_valve", "Запорная арматура обвязки", "VALVE", "item", 2),
  c("equipment_check_valve", "Обратная арматура обвязки", "VALVE", "item", 2, false),
  c("equipment_strainer", "Сетчатый фильтр обвязки", "EQUIPMENT", "item", 3, false),
  c("pressure_gauge", "Манометр с отборным устройством", "EQUIPMENT", "item", 3, false),
  c("drain_connection", "Дренажное присоединение", "FITTING", "item", 3, false),
  c("bypass_line", "Байпасная линия", "MATERIAL", "m", 3, false),
  c("electrical_supply_boundary", "Граница силового питания", "ELECTRICAL_INTERFACE", "item", 2, false),
  c("automation_io_boundary", "Граница сигналов автоматики", "ELECTRICAL_INTERFACE", "item", 3, false),
  c("equipment_individual_test", "Индивидуальное испытание агрегата", "TEST", "test", 1),
  c("equipment_integrated_test", "Комплексное испытание в составе системы", "TEST", "test", 2),
  c("equipment_oem_documents", "Заводская документация, паспорт и гарантия", "DOCUMENT", "set", 2),
  c("operator_instruction", "Инструктаж эксплуатационного персонала", "DOCUMENT", "set", 3),
];

const SYSTEM_COMPONENTS: Readonly<Record<string, readonly Component[]>> = Object.freeze({
  BATH: [c("bath_overflow_set", "Слив-перелив ванны", "EQUIPMENT", "set", 2), c("bath_support_legs", "Регулируемые опоры ванны", "MATERIAL", "set", 2)],
  MIXER: [c("mixer_cartridge", "Рабочий картридж смесителя", "EQUIPMENT", "item", 2), c("mixer_eccentric_set", "Эксцентрики подключения смесителя", "FITTING", "set", 2)],
  SHOWER: [c("shower_tray_or_channel", "Душевой поддон или канал", "EQUIPMENT", "item", 2), c("shower_drain_set", "Сливной комплект душевой", "EQUIPMENT", "set", 2)],
  SINK: [c("sink_bowl", "Чаша раковины", "EQUIPMENT", "item", 1), c("sink_overflow", "Перелив раковины", "EQUIPMENT", "item", 2, false)],
  TOILET: [c("toilet_cistern", "Смывной бачок или скрытая арматура", "EQUIPMENT", "item", 1), c("toilet_pan_connector", "Манжета выпуска унитаза", "FITTING", "item", 2)],
  PPR_PIPE: [c("socket_fusion_joint", "Муфтовый термосварной стык PPR", "FITTING", "item", 1), c("fusion_machine", "Аппарат раструбной сварки PPR", "EQUIPMENT", "item", 2)],
  PND_PIPE: [c("electrofusion_joint", "Электромуфтовый стык ПНД", "FITTING", "item", 1), c("electrofusion_control_record", "Протокол параметров электромуфтовой сварки", "DOCUMENT", "set", 2)],
  WATER_PIPE: [c("threaded_or_pressed_joint", "Резьбовой или прессовый стык водопровода", "FITTING", "item", 1), c("corrosion_protection", "Защита металлического стыка от коррозии", "MATERIAL", "m2", 3, false)],
  RISER: [c("riser_fixed_point", "Неподвижная опора стояка", "MATERIAL", "item", 1), c("riser_expansion_allowance", "Узел компенсации температурного удлинения", "FITTING", "item", 2), c("shaft_access_interface", "Граница ревизионного доступа в шахте", "CIVIL_INTERFACE", "item", 3)],
  SEWER: [c("sewer_cleanout", "Ревизия внутренней канализации", "EQUIPMENT", "item", 1), c("sewer_slope_marker", "Контрольная отметка уклона", "MATERIAL", "item", 2), c("sewer_vent_connection", "Присоединение вентиляционной части стояка", "FITTING", "item", 3, false)],
  BOILER: [c("temperature_pressure_relief", "Предохранительный клапан водонагревателя", "VALVE", "item", 1), c("expansion_vessel", "Расширительный бак водонагревателя", "EQUIPMENT", "item", 2, false)],
  COLLECTOR: [c("collector_body", "Распределительный коллектор", "EQUIPMENT", "item", 1), c("collector_branch_valves", "Арматура ответвлений коллектора", "VALVE", "item", 2), c("collector_cabinet", "Шкаф коллектора", "EQUIPMENT", "item", 2, false)],
  FILTER: [c("filter_element", "Сменный фильтрующий элемент", "EQUIPMENT", "item", 1), c("filter_flush_connection", "Присоединение промывки фильтра", "FITTING", "item", 2, false)],
  INSTALLATION: [c("concealed_frame", "Несущая рама инсталляции", "EQUIPMENT", "item", 1), c("concealed_cistern", "Скрытый смывной бачок", "EQUIPMENT", "item", 2), c("service_access", "Сервисный доступ к арматуре", "CIVIL_INTERFACE", "item", 2)],
  METER: [c("meter_straight_spool", "Прямой участок до и после счётчика", "MATERIAL", "set", 1), c("meter_seal_set", "Комплект пломбирования", "MATERIAL", "set", 2), c("meter_verification_record", "Свидетельство поверки", "DOCUMENT", "set", 1)],
  PUMP: [c("pump_coupling", "Муфта привода насоса", "EQUIPMENT", "item", 2, false), c("pump_dry_run_sensor", "Датчик защиты насоса от сухого хода", "ELECTRICAL_INTERFACE", "item", 2)],
});

const SCOPE_COMPONENTS: Readonly<Record<string, readonly Component[]>> = Object.freeze({
  small_area: [c("restricted_access_plan", "План работ и перемещения в стеснённой зоне", "LOGISTICS", "set", 1)],
  large_area: [c("distributed_site_handling", "Распределённое внутриплощадочное перемещение по большой зоне", "LOGISTICS", "set", 1)],
  standard: [c("standard_access_acceptance", "Приёмка стандартного доступа и рабочей зоны", "CIVIL_INTERFACE", "set", 1)],
  technical_room: [c("technical_room_permit", "Допуск и координация работ в техническом помещении", "DOCUMENT", "set", 1)],
  wet_zone: [c("wet_zone_waterproofing_acceptance", "Приёмка гидроизоляции влажной зоны", "CIVIL_INTERFACE", "set", 1)],
  high_load: [c("high_load_support_verification", "Проверка усиленных опор и креплений", "CIVIL_INTERFACE", "set", 1), c("high_load_lifting_plan", "План подъёма тяжёлого элемента", "LOGISTICS", "set", 2)],
});

const EXTERNAL_NETWORK_COMPONENTS: readonly Component[] = [
  c("survey_control_network", "Геодезическая опорная сеть и разбивка трассы", "CIVIL_INTERFACE", "set", 1),
  c("route_clearance", "Подготовка полосы работ", "CIVIL_INTERFACE", "m", 2),
  c("carrier_pipeline", "Основной трубопровод проектного материала и диаметра", "MATERIAL", "m", 1),
  c("factory_pipe_joint", "Штатное соединение труб", "FITTING", "item", 2),
  c("field_weld_or_socket", "Полевой сварной или раструбный стык", "FITTING", "item", 2),
  c("horizontal_bend", "Горизонтальный отвод", "FITTING", "item", 2, false),
  c("vertical_bend", "Вертикальный отвод", "FITTING", "item", 3, false),
  c("branch_tee", "Ответвительный тройник", "FITTING", "item", 2, false),
  c("diameter_transition", "Переход диаметра", "FITTING", "item", 3, false),
  c("material_transition", "Переход между материалами", "FITTING", "item", 3, false),
  c("section_isolation_valve", "Секционная запорная арматура", "VALVE", "item", 2, false),
  c("non_return_valve", "Обратная арматура", "VALVE", "item", 3, false),
  c("air_valve", "Воздушный клапан", "VALVE", "item", 3, false),
  c("washout_valve", "Промывная или дренажная арматура", "VALVE", "item", 3, false),
  c("valve_extension_spindle", "Удлинитель шпинделя арматуры", "MATERIAL", "item", 4, false),
  c("valve_surface_box", "Ковер или лючок управления арматурой", "MATERIAL", "item", 3, false),
  c("open_trench_excavation", "Траншея проектного профиля", "CIVIL_INTERFACE", "m3", 1),
  c("trench_shoring", "Крепление стенок траншеи", "CIVIL_INTERFACE", "m2", 3, false),
  c("groundwater_control", "Водоотлив и контроль грунтовых вод", "CIVIL_INTERFACE", "set", 3, false),
  c("pipe_bedding", "Постель трубопровода", "CIVIL_INTERFACE", "m3", 2),
  c("pipe_haunching", "Заполнение пазух трубопровода", "CIVIL_INTERFACE", "m3", 3),
  c("initial_backfill", "Первичная защитная засыпка", "CIVIL_INTERFACE", "m3", 2),
  c("general_backfill", "Обратная засыпка", "CIVIL_INTERFACE", "m3", 2),
  c("backfill_compaction", "Послойное уплотнение обратной засыпки", "CIVIL_INTERFACE", "m3", 2),
  c("warning_tape", "Сигнальная лента трассы", "MATERIAL", "m", 3),
  c("tracer_wire", "Трассировочный провод неметаллической трубы", "MATERIAL", "m", 3, false),
  c("pipeline_marker", "Наземный указатель трассы", "MATERIAL", "item", 3),
  c("thrust_restraint", "Упор или система восприятия осевых усилий", "CIVIL_INTERFACE", "item", 3, false),
  c("utility_crossing_case", "Футляр пересечения коммуникации", "MATERIAL", "m", 3, false),
  c("road_crossing_interface", "Граница восстановления дорожной одежды", "CIVIL_INTERFACE", "m2", 3, false),
  c("trenchless_pilot_bore", "Пилотное управляемое бурение", "CIVIL_INTERFACE", "m", 4, false),
  c("trenchless_reaming", "Расширение скважины", "CIVIL_INTERFACE", "m", 4, false),
  c("trenchless_pullback", "Протяжка трубопровода", "CIVIL_INTERFACE", "m", 4, false),
  c("pressure_or_leak_test", "Испытание прочности и герметичности", "TEST", "test", 1),
  c("pipeline_flushing", "Промывка наружного трубопровода", "TEST", "test", 2),
  c("pipeline_disinfection", "Дезинфекция сети питьевой воды", "TEST", "test", 3, false),
  c("water_quality_sample", "Отбор и лабораторный анализ воды", "TEST", "test", 3, false),
  c("cctv_acceptance", "CCTV-инспекция самотечного трубопровода", "TEST", "test", 3, false),
  c("route_as_built", "Исполнительная съёмка трассы, стыков и отметок", "DOCUMENT", "set", 2),
  c("hidden_work_records", "Акты скрытых работ по основанию, стыкам и засыпке", "DOCUMENT", "set", 2),
];

const CHAMBER_COMPONENTS: readonly Component[] = [
  c("chamber_setting_out", "Разбивка оси и отметок камеры", "CIVIL_INTERFACE", "set", 1),
  c("chamber_excavation", "Котлован камеры", "CIVIL_INTERFACE", "m3", 1),
  c("chamber_groundwater_control", "Водоотлив котлована", "CIVIL_INTERFACE", "set", 3, false),
  c("chamber_base_preparation", "Подготовка основания", "CIVIL_INTERFACE", "m3", 2),
  c("chamber_base_slab", "Плита основания", "CIVIL_INTERFACE", "item", 2),
  c("chamber_wall_sections", "Стеновые элементы камеры", "MATERIAL", "item", 1),
  c("chamber_cover_slab", "Плита перекрытия", "MATERIAL", "item", 2),
  c("chamber_neck", "Горловина камеры", "MATERIAL", "item", 2),
  c("access_hatch", "Люк проектного класса нагрузки", "EQUIPMENT", "item", 1),
  c("access_steps", "Ступени или лестница доступа", "MATERIAL", "item", 2),
  c("pipe_wall_sleeve", "Гильза прохода трубопровода", "MATERIAL", "item", 2),
  c("wall_penetration_seal", "Герметизация прохода", "MATERIAL", "item", 2),
  c("internal_pipe_spool", "Внутрикамерный патрубок", "MATERIAL", "item", 2, false),
  c("chamber_isolation_valve", "Запорная арматура камеры", "VALVE", "item", 2, false),
  c("chamber_check_valve", "Обратная арматура камеры", "VALVE", "item", 3, false),
  c("flow_meter", "Узел измерения расхода", "EQUIPMENT", "item", 3, false),
  c("pressure_takeoff", "Отбор давления и манометр", "EQUIPMENT", "item", 3, false),
  c("drain_sump", "Дренажный приямок", "CIVIL_INTERFACE", "item", 3, false),
  c("ventilation_pipe", "Вентиляционная труба камеры", "MATERIAL", "item", 3, false),
  c("internal_waterproofing", "Внутренняя гидроизоляция", "CIVIL_INTERFACE", "m2", 3, false),
  c("external_waterproofing", "Наружная гидроизоляция", "CIVIL_INTERFACE", "m2", 3),
  c("thermal_insulation", "Теплоизоляция камеры", "CIVIL_INTERFACE", "m2", 4, false),
  c("chamber_backfill", "Обратная засыпка пазух", "CIVIL_INTERFACE", "m3", 2),
  c("surface_adjustment", "Регулировка люка по проектной отметке", "CIVIL_INTERFACE", "item", 2),
  c("fall_protection", "Ограждение или решётка безопасности", "MATERIAL", "item", 4, false),
  c("confined_space_label", "Маркировка замкнутого пространства", "MATERIAL", "item", 3),
  c("chamber_leak_test", "Испытание камеры на водонепроницаемость", "TEST", "test", 2),
  c("chamber_function_test", "Функциональная проверка арматуры и доступа", "TEST", "test", 2),
  c("chamber_as_built", "Исполнительная схема камеры и привязок", "DOCUMENT", "set", 2),
];

const PUMP_FACILITY_COMPONENTS: readonly Component[] = [
  c("hydraulic_duty_review", "Проверка расчётной подачи, напора и рабочей точки", "DOCUMENT", "set", 1),
  c("duty_pump", "Рабочий насосный агрегат", "EQUIPMENT", "item", 1),
  c("standby_pump", "Резервный насосный агрегат", "EQUIPMENT", "item", 2),
  c("pump_base_frame", "Общая фундаментная рама", "MATERIAL", "item", 2),
  c("pump_foundation_interface", "Приёмка фундамента и закладных деталей", "CIVIL_INTERFACE", "item", 2),
  c("anchor_bolts", "Анкерные болты насосного агрегата", "MATERIAL", "set", 2),
  c("non_shrink_grout_interface", "Подливка рамы безусадочным составом", "CIVIL_INTERFACE", "m3", 3),
  c("vibration_isolator", "Виброизолирующая опора", "MATERIAL", "item", 3, false),
  c("suction_header", "Всасывающий коллектор", "MATERIAL", "m", 2),
  c("discharge_header", "Напорный коллектор", "MATERIAL", "m", 2),
  c("pump_suction_spool", "Всасывающий патрубок насоса", "MATERIAL", "item", 2),
  c("pump_discharge_spool", "Напорный патрубок насоса", "MATERIAL", "item", 2),
  c("suction_isolation_valve", "Запорная арматура на всасывании", "VALVE", "item", 2),
  c("discharge_isolation_valve", "Запорная арматура на напоре", "VALVE", "item", 2),
  c("discharge_check_valve", "Обратный клапан на напоре", "VALVE", "item", 2),
  c("flexible_joint", "Гибкая вставка", "FITTING", "item", 3, false),
  c("dismantling_joint", "Демонтажная вставка", "FITTING", "item", 3),
  c("suction_strainer", "Фильтр или сетка на всасывании", "EQUIPMENT", "item", 3, false),
  c("pressure_gauge_set", "Комплект измерения давления", "EQUIPMENT", "set", 2),
  c("flow_meter_set", "Комплект измерения расхода", "EQUIPMENT", "set", 3, false),
  c("level_transmitter", "Измерение уровня", "ELECTRICAL_INTERFACE", "item", 2, false),
  c("dry_run_protection", "Защита от сухого хода", "ELECTRICAL_INTERFACE", "item", 2),
  c("motor_power_boundary", "Силовое подключение электродвигателя", "ELECTRICAL_INTERFACE", "item", 2),
  c("local_control_station", "Местный пост управления", "ELECTRICAL_INTERFACE", "item", 3),
  c("automation_panel_boundary", "Граница шкафа автоматики", "ELECTRICAL_INTERFACE", "item", 3),
  c("alarm_signal_boundary", "Граница аварийной сигнализации", "ELECTRICAL_INTERFACE", "item", 3),
  c("lifting_beam", "Траверса или монорельс обслуживания", "EQUIPMENT", "item", 3, false),
  c("pump_removal_chain", "Цепь или направляющие извлечения насоса", "MATERIAL", "set", 3, false),
  c("floor_drain", "Дренаж пола насосного помещения", "PROCESS", "item", 3),
  c("sump_pump", "Дренажный насос приямка", "EQUIPMENT", "item", 3, false),
  c("ventilation_boundary", "Граница технологической вентиляции", "CIVIL_INTERFACE", "set", 3),
  c("potable_service_water", "Линия технической или промывной воды", "MATERIAL", "m", 3, false),
  c("equipment_drain_line", "Линия дренажа оборудования", "MATERIAL", "m", 3),
  c("surge_protection_interface", "Граница защиты от гидроудара", "PROCESS", "set", 4, false),
  c("pump_alignment", "Центровка агрегата", "TEST", "test", 2),
  c("rotation_check", "Проверка направления вращения", "TEST", "test", 2),
  c("vibration_test", "Измерение вибрации", "TEST", "test", 3),
  c("individual_run_test", "Индивидуальный пробный пуск", "TEST", "test", 1),
  c("duty_point_test", "Испытание в рабочей точке", "TEST", "test", 2),
  c("duty_standby_changeover", "Проверка автоматического чередования агрегатов", "TEST", "test", 3),
  c("integrated_station_test", "Комплексное испытание насосной станции", "TEST", "test", 1),
  c("pump_oem_dossier", "Паспорта и протоколы изготовителя", "DOCUMENT", "set", 2),
  c("pump_station_operating_manual", "Руководство эксплуатации станции", "DOCUMENT", "set", 3),
  c("operator_training", "Обучение эксплуатационного персонала", "DOCUMENT", "set", 3),
];

const STORAGE_FACILITY_COMPONENTS: readonly Component[] = [
  c("capacity_and_level_review", "Проверка полезного объёма и уровней", "DOCUMENT", "set", 1),
  c("foundation_interface", "Приёмка основания и фундамента", "CIVIL_INTERFACE", "set", 1),
  c("tank_shell_or_structure", "Несущая конструкция резервуара", "EQUIPMENT", "item", 1),
  c("tank_roof", "Покрытие или кровля резервуара", "MATERIAL", "item", 2),
  c("tank_floor", "Днище резервуара", "MATERIAL", "item", 2),
  c("internal_lining", "Внутреннее защитное покрытие", "MATERIAL", "m2", 2),
  c("external_coating", "Наружное защитное покрытие", "MATERIAL", "m2", 2),
  c("thermal_insulation", "Тепловая изоляция", "MATERIAL", "m2", 3, false),
  c("inlet_pipe", "Впускной трубопровод", "MATERIAL", "m", 2),
  c("outlet_pipe", "Выпускной трубопровод", "MATERIAL", "m", 2),
  c("overflow_pipe", "Переливной трубопровод", "MATERIAL", "m", 2),
  c("washout_pipe", "Грязевой или промывной трубопровод", "MATERIAL", "m", 2),
  c("inlet_isolation_valve", "Запорная арматура впуска", "VALVE", "item", 2),
  c("outlet_isolation_valve", "Запорная арматура выпуска", "VALVE", "item", 2),
  c("washout_valve", "Промывная арматура", "VALVE", "item", 2),
  c("level_gauge", "Указатель уровня", "EQUIPMENT", "item", 2),
  c("level_transmitter_boundary", "Граница дистанционного измерения уровня", "ELECTRICAL_INTERFACE", "item", 3, false),
  c("sample_tap", "Пробоотборный кран", "VALVE", "item", 3),
  c("air_vent", "Вентиляционное устройство", "EQUIPMENT", "item", 2),
  c("insect_screen", "Защитная сетка вентиляции и перелива", "MATERIAL", "item", 3),
  c("access_hatch", "Герметичный люк доступа", "EQUIPMENT", "item", 2),
  c("internal_ladder", "Внутренняя лестница", "MATERIAL", "item", 2),
  c("external_ladder", "Наружная лестница", "MATERIAL", "item", 2),
  c("fall_arrest_system", "Система защиты от падения", "MATERIAL", "set", 3),
  c("roof_guardrail", "Ограждение площадки обслуживания", "MATERIAL", "m", 3),
  c("maintenance_platform", "Площадка обслуживания", "MATERIAL", "item", 3),
  c("drainage_around_structure", "Поверхностный водоотвод", "CIVIL_INTERFACE", "set", 3),
  c("security_fence_interface", "Граница ограждения и контроля доступа", "CIVIL_INTERFACE", "set", 4, false),
  c("watertightness_test", "Испытание на водонепроницаемость", "TEST", "test", 1),
  c("cleaning", "Механическая очистка внутренних поверхностей", "TEST", "test", 2),
  c("disinfection", "Дезинфекция резервуара", "TEST", "test", 2),
  c("water_quality_sampling", "Лабораторный контроль качества воды", "TEST", "test", 2),
  c("capacity_calibration", "Тарировка объёма и отметок", "TEST", "test", 3),
  c("facility_as_built", "Исполнительная документация сооружения", "DOCUMENT", "set", 2),
  c("sanitary_dossier", "Санитарный паспорт и протокол допуска", "DOCUMENT", "set", 3),
];

const TREATMENT_FACILITY_COMPONENTS: readonly Component[] = [
  c("process_design_review", "Проверка технологической схемы, расходов и качества исходной воды", "DOCUMENT", "set", 1),
  c("hydraulic_profile", "Гидравлический профиль сооружений", "DOCUMENT", "set", 1),
  c("raw_water_inlet", "Узел подачи исходной воды или стоков", "PROCESS", "item", 1),
  c("inlet_isolation", "Входная запорная арматура", "VALVE", "item", 2),
  c("coarse_screen", "Решётка грубой очистки", "EQUIPMENT", "item", 2, false),
  c("fine_screen", "Решётка тонкой очистки", "EQUIPMENT", "item", 2, false),
  c("screenings_conveyor", "Транспортёр отбросов", "EQUIPMENT", "item", 3, false),
  c("grit_removal_unit", "Песколовка или узел удаления песка", "PROCESS", "item", 2, false),
  c("flow_equalization", "Усреднительная ёмкость", "PROCESS", "item", 2, false),
  c("equalization_mixer", "Мешалка усреднителя", "EQUIPMENT", "item", 3, false),
  c("transfer_pump", "Насос перекачки между стадиями", "EQUIPMENT", "item", 2),
  c("process_feed_header", "Распределительный коллектор", "MATERIAL", "m", 2),
  c("process_return_header", "Сборный коллектор", "MATERIAL", "m", 2),
  c("process_isolation_valves", "Технологическая запорная арматура", "VALVE", "item", 2),
  c("process_control_valves", "Регулирующая арматура", "VALVE", "item", 3),
  c("flow_measurement", "Измерение расхода", "EQUIPMENT", "item", 2),
  c("pressure_measurement", "Измерение давления", "EQUIPMENT", "item", 3, false),
  c("level_measurement", "Измерение уровня", "EQUIPMENT", "item", 2),
  c("ph_measurement", "Измерение pH", "EQUIPMENT", "item", 3, false),
  c("turbidity_measurement", "Измерение мутности", "EQUIPMENT", "item", 3, false),
  c("conductivity_measurement", "Измерение электропроводности", "EQUIPMENT", "item", 4, false),
  c("dissolved_oxygen_measurement", "Измерение растворённого кислорода", "EQUIPMENT", "item", 3, false),
  c("temperature_measurement", "Измерение температуры", "EQUIPMENT", "item", 3, false),
  c("chemical_storage_tank", "Расходная ёмкость реагента", "EQUIPMENT", "item", 2, false),
  c("chemical_transfer_pump", "Насос перекачки реагента", "EQUIPMENT", "item", 3, false),
  c("chemical_dosing_pump", "Насос-дозатор", "EQUIPMENT", "item", 2, false),
  c("chemical_injection_quill", "Узел ввода реагента", "FITTING", "item", 3, false),
  c("chemical_bundle", "Пусковой запас проектного реагента", "PROCESS", "kg", 2, false),
  c("rapid_mixer", "Смеситель быстрого смешения", "EQUIPMENT", "item", 3, false),
  c("flocculation_unit", "Камера хлопьеобразования", "PROCESS", "item", 2, false),
  c("clarifier", "Отстойник или осветлитель", "PROCESS", "item", 2, false),
  c("clarifier_scraper", "Скребковый механизм", "EQUIPMENT", "item", 3, false),
  c("filter_vessel", "Фильтровальный аппарат", "EQUIPMENT", "item", 2, false),
  c("filter_underdrain", "Дренажная система фильтра", "PROCESS", "set", 3, false),
  c("filter_media", "Фильтрующая загрузка", "PROCESS", "kg", 2, false),
  c("backwash_pump", "Насос промывки фильтра", "EQUIPMENT", "item", 3, false),
  c("backwash_air_blower", "Воздуходувка промывки", "EQUIPMENT", "item", 3, false),
  c("backwash_water_tank", "Резервуар промывной воды", "PROCESS", "item", 3, false),
  c("aeration_blower", "Технологическая воздуходувка", "EQUIPMENT", "item", 2, false),
  c("air_distribution_header", "Воздушный коллектор", "MATERIAL", "m", 3, false),
  c("air_diffuser", "Аэрационный диффузор", "EQUIPMENT", "item", 2, false),
  c("biological_reactor", "Биологический реактор", "PROCESS", "item", 2, false),
  c("media_carrier", "Носитель прикреплённой биомассы", "PROCESS", "m3", 3, false),
  c("secondary_clarifier", "Вторичный отстойник", "PROCESS", "item", 2, false),
  c("return_sludge_pump", "Насос возвратного ила", "EQUIPMENT", "item", 3, false),
  c("waste_sludge_pump", "Насос избыточного ила", "EQUIPMENT", "item", 3, false),
  c("sludge_thickener", "Сгуститель осадка", "PROCESS", "item", 3, false),
  c("sludge_dewatering_unit", "Установка обезвоживания осадка", "EQUIPMENT", "item", 2, false),
  c("polymer_makeup_unit", "Узел приготовления флокулянта", "EQUIPMENT", "item", 3, false),
  c("dewatered_cake_conveyor", "Транспортёр обезвоженного осадка", "EQUIPMENT", "item", 3, false),
  c("cake_container", "Контейнер осадка", "EQUIPMENT", "item", 3, false),
  c("disinfection_contact_tank", "Контактная ёмкость обеззараживания", "PROCESS", "item", 2, false),
  c("uv_disinfection_unit", "Ультрафиолетовая установка", "EQUIPMENT", "item", 3, false),
  c("chlorine_dosing_unit", "Установка дозирования хлорсодержащего реагента", "EQUIPMENT", "item", 3, false),
  c("treated_water_outlet", "Узел отвода очищенной воды", "PROCESS", "item", 1),
  c("process_drainage", "Технологический дренаж", "MATERIAL", "m", 2),
  c("sample_points", "Точки технологического пробоотбора", "VALVE", "item", 2),
  c("laboratory_equipment_boundary", "Граница лабораторного оснащения", "ELECTRICAL_INTERFACE", "set", 3, false),
  c("mcc_power_boundary", "Граница силовых шкафов и электропитания", "ELECTRICAL_INTERFACE", "set", 2),
  c("plc_control_boundary", "Граница ПЛК и алгоритмов управления", "ELECTRICAL_INTERFACE", "set", 2),
  c("instrument_io_schedule", "Ведомость входов и выходов КИПиА", "ELECTRICAL_INTERFACE", "set", 3),
  c("scada_boundary", "Граница диспетчеризации", "ELECTRICAL_INTERFACE", "set", 3, false),
  c("earthing_boundary", "Граница защитного заземления", "ELECTRICAL_INTERFACE", "set", 3),
  c("building_foundations_boundary", "Граница фундаментов оборудования", "CIVIL_INTERFACE", "set", 2),
  c("access_platforms", "Площадки обслуживания", "MATERIAL", "set", 3),
  c("guardrails", "Технологические ограждения", "MATERIAL", "m", 3),
  c("lifting_facilities", "Подъёмные средства обслуживания", "EQUIPMENT", "set", 3, false),
  c("ventilation_boundary", "Граница технологической вентиляции", "CIVIL_INTERFACE", "set", 3),
  c("odor_control_boundary", "Граница системы удаления запахов", "PROCESS", "set", 4, false),
  c("potable_service_water", "Сеть служебной воды", "MATERIAL", "m", 3),
  c("compressed_air", "Сеть технологического воздуха", "MATERIAL", "m", 3, false),
  c("process_flushing", "Промывка технологических трубопроводов", "TEST", "test", 2),
  c("hydrostatic_test", "Гидравлические испытания ёмкостей и трубопроводов", "TEST", "test", 2),
  c("instrument_calibration", "Калибровка средств измерения", "TEST", "test", 2),
  c("dry_function_test", "Холостое функциональное испытание", "TEST", "test", 2),
  c("wet_commissioning", "Пуск с рабочей средой", "TEST", "test", 1),
  c("process_performance_test", "Испытание технологической эффективности", "TEST", "test", 1),
  c("laboratory_performance_sampling", "Лабораторное подтверждение показателей", "TEST", "test", 1),
  c("reliability_run", "Комплексная непрерывная обкатка", "TEST", "test", 2),
  c("process_oem_dossiers", "Паспорта технологического оборудования", "DOCUMENT", "set", 2),
  c("commissioning_program", "Программа пусконаладочных работ", "DOCUMENT", "set", 2),
  c("commissioning_protocols", "Протоколы индивидуальных и комплексных испытаний", "DOCUMENT", "set", 2),
  c("operating_manuals", "Эксплуатационные регламенты", "DOCUMENT", "set", 2),
  c("operator_training", "Обучение операторов", "DOCUMENT", "set", 2),
  c("spares_and_consumables", "Комплект пусковых запасных частей и расходных материалов", "MATERIAL", "set", 3),
  c("treatment_as_built", "Исполнительная технологическая документация", "DOCUMENT", "set", 3),
];

const DRAINAGE_COMPONENTS: readonly Component[] = [
  c("drainage_alignment", "Разбивка оси и уклона дренажа", "CIVIL_INTERFACE", "set", 1),
  c("drainage_excavation", "Разработка дренажной выемки", "CIVIL_INTERFACE", "m3", 1),
  c("separation_geotextile", "Разделительный геотекстиль", "MATERIAL", "m2", 2),
  c("graded_filter_layer", "Градуированный фильтрующий слой", "MATERIAL", "m3", 1),
  c("drainage_pipe", "Перфорированная дренажная труба", "MATERIAL", "m", 2, false),
  c("drainage_coupling", "Соединитель дренажной трубы", "FITTING", "item", 2, false),
  c("cleanout", "Прочистка дренажа", "EQUIPMENT", "item", 3, false),
  c("collector_pipe", "Сборный коллектор", "MATERIAL", "m", 3, false),
  c("outlet_headwall_interface", "Граница выпускного оголовка", "CIVIL_INTERFACE", "item", 3, false),
  c("erosion_protection", "Противоэрозионная защита выпуска", "CIVIL_INTERFACE", "m2", 3, false),
  c("filter_backfill", "Фильтрующая обратная засыпка", "MATERIAL", "m3", 2),
  c("surface_reinstatement", "Восстановление поверхности", "CIVIL_INTERFACE", "m2", 3),
  c("drainage_flush", "Промывка дренажной системы", "TEST", "test", 2),
  c("flow_test", "Проверка свободного протока", "TEST", "test", 1),
  c("slope_survey", "Исполнительный контроль уклонов", "TEST", "test", 2),
  c("drainage_as_built", "Исполнительная схема дренажа", "DOCUMENT", "set", 2),
];

const TESTING_SCOPE_COMPONENTS: readonly Component[] = [
  ...TEST_COMPONENTS,
  c("flushing_water_supply", "Источник воды для промывки", "PROCESS", "m3", 2),
  c("flushing_velocity_control", "Контроль скорости промывки", "TEST", "test", 2),
  c("disinfectant_solution", "Дезинфицирующий раствор заданной концентрации", "PROCESS", "kg", 2),
  c("contact_time_control", "Контроль времени контакта", "TEST", "test", 2),
  c("neutralization_agent", "Реагент нейтрализации", "PROCESS", "kg", 3, false),
  c("flushing_discharge_route", "Согласованный отвод промывной воды", "CIVIL_INTERFACE", "set", 2),
  c("microbiology_sample", "Микробиологический анализ", "TEST", "test", 2),
  c("residual_disinfectant_sample", "Контроль остаточного реагента", "TEST", "test", 2),
  c("release_to_service", "Акт допуска системы в эксплуатацию", "DOCUMENT", "set", 1),
];

const FAMILY_ADDITIONS: Readonly<Record<string, readonly Component[]>> = Object.freeze({
  aeration_tanks: [c("aeration_basin", "Аэротенк", "PROCESS", "item", 1), c("anoxic_zone", "Аноксидная зона", "PROCESS", "item", 3, false), c("aeration_grid", "Аэрационная решётка", "EQUIPMENT", "set", 2), c("mixed_liquor_recycle", "Рециркуляция иловой смеси", "EQUIPMENT", "set", 3)],
  booster_pumping_station: [c("pressure_vessel", "Мембранный напорный бак", "EQUIPMENT", "item", 2), c("pressure_switch", "Реле давления", "ELECTRICAL_INTERFACE", "item", 3), c("minimum_flow_bypass", "Линия минимального расхода", "MATERIAL", "m", 3)],
  borehole_water_supply: [c("borehole_pump", "Скважинный насос", "EQUIPMENT", "item", 1), c("rising_main", "Водоподъёмная колонна", "MATERIAL", "m", 2), c("wellhead", "Герметичный оголовок скважины", "EQUIPMENT", "item", 2), c("raw_water_sample", "Анализ воды источника", "TEST", "test", 2)],
  chlorination_station: [c("chlorine_room_safety", "Комплект безопасности реагентного помещения", "EQUIPMENT", "set", 2), c("duty_dosing_skid", "Рабочая установка дозирования", "EQUIPMENT", "item", 1), c("standby_dosing_skid", "Резервная установка дозирования", "EQUIPMENT", "item", 2), c("residual_chlorine_analyzer", "Анализатор остаточного хлора", "EQUIPMENT", "item", 3)],
  distribution_pipeline: [c("service_connection_saddle", "Седловой отвод подключения", "FITTING", "item", 3, false), c("network_hydrant_boundary", "Граница пожарного гидранта", "CIVIL_INTERFACE", "item", 4, false)],
  drainage_channel: [c("channel_lining", "Облицовка дренажного канала", "MATERIAL", "m2", 2), c("channel_joint", "Деформационный шов канала", "MATERIAL", "m", 3), c("channel_grating", "Защитная решётка канала", "MATERIAL", "m", 3, false)],
  drainage_prism: [c("graded_core", "Зернистое ядро дренажной призмы", "MATERIAL", "m3", 1), c("transition_filter", "Переходный фильтрующий слой", "MATERIAL", "m3", 2), c("toe_drain", "Подошвенный дренаж", "MATERIAL", "m", 2)],
  filtration_station: [c("duty_filter", "Рабочий фильтр", "EQUIPMENT", "item", 1), c("standby_filter", "Резервный фильтр", "EQUIPMENT", "item", 2), c("air_scour_system", "Система воздушной промывки", "EQUIPMENT", "set", 3), c("filter_to_waste_line", "Линия сброса первого фильтрата", "MATERIAL", "m", 3)],
  flushing_disinfection: [c("temporary_injection_point", "Временная точка ввода реагента", "FITTING", "item", 2), c("temporary_sampling_point", "Временная точка пробоотбора", "FITTING", "item", 2)],
  gravity_sewer_collector: [c("drop_connection", "Перепадное присоединение", "FITTING", "item", 3, false), c("collector_vent", "Вентиляция коллектора", "MATERIAL", "item", 4, false)],
  house_connection_water: [c("main_tapping_saddle", "Седловой отвод от уличной сети", "FITTING", "item", 2), c("property_boundary_valve", "Арматура на границе участка", "VALVE", "item", 2), c("meter_boundary", "Граница узла учёта", "CIVIL_INTERFACE", "item", 3)],
  inspection_chambers: [c("channel_benching", "Лотковая часть и банкетка", "CIVIL_INTERFACE", "item", 2)],
  inspection_wells: [c("well_channel", "Формованный лоток колодца", "CIVIL_INTERFACE", "item", 2)],
  manholes: [c("manhole_channel", "Лоток смотрового колодца", "CIVIL_INTERFACE", "item", 2), c("drop_pipe", "Перепадная труба", "MATERIAL", "item", 3, false)],
  outfall_structure: [c("outfall_headwall", "Оголовок выпуска", "CIVIL_INTERFACE", "item", 1), c("flap_valve", "Обратный затвор выпуска", "VALVE", "item", 2, false), c("energy_dissipation", "Гашение энергии потока", "CIVIL_INTERFACE", "set", 2), c("bank_protection", "Укрепление русла и откоса", "CIVIL_INTERFACE", "m2", 2)],
  pressure_pipeline: [c("surge_air_vessel_boundary", "Граница противоударной ёмкости", "PROCESS", "item", 4, false)],
  pressure_sewer_pipeline: [c("sewage_air_valve", "Канализационный воздушный клапан", "VALVE", "item", 3), c("sewage_washout", "Промывной узел напорной канализации", "VALVE", "item", 3)],
  pressure_testing_disinfection: [c("test_section_isolation", "Изоляция испытательного участка", "VALVE", "item", 2), c("bacteriological_clearance", "Бактериологический допуск", "DOCUMENT", "set", 2)],
  pumping_station: [c("wet_well_boundary", "Граница приёмного резервуара", "CIVIL_INTERFACE", "item", 2), c("intake_screen", "Приёмная сетка", "EQUIPMENT", "item", 3, false)],
  rainwater_inlets: [c("inlet_grating", "Дождеприёмная решётка", "EQUIPMENT", "item", 1), c("silt_bucket", "Корзина для осадка", "EQUIPMENT", "item", 2), c("outlet_trap", "Гидрозатвор выпуска", "EQUIPMENT", "item", 3, false)],
  reservoir_clean_water: [c("separate_cells", "Переключаемые секции резервуара", "PROCESS", "item", 3), c("sanitary_air_gap", "Санитарный разрыв перелива", "FITTING", "item", 3)],
  septic_treatment_facility: [c("septic_compartment", "Секция септика", "PROCESS", "item", 1), c("inlet_baffle", "Входной успокоитель", "MATERIAL", "item", 2), c("effluent_filter", "Фильтр на выпуске", "EQUIPMENT", "item", 2), c("sludge_access", "Доступ для удаления осадка", "EQUIPMENT", "item", 2)],
  settlement_water_network: [c("district_meter_boundary", "Граница зонального учёта", "CIVIL_INTERFACE", "item", 3), c("public_standpipe", "Водоразборная колонка", "EQUIPMENT", "item", 3, false)],
  sewage_treatment_tanks: [c("primary_tank", "Первичная технологическая ёмкость", "PROCESS", "item", 1), c("secondary_tank", "Вторичная технологическая ёмкость", "PROCESS", "item", 2), c("intertank_transfer", "Межсекционная перекачка", "EQUIPMENT", "set", 3)],
  sewer_pumping_station: [c("wet_well", "Приёмный резервуар КНС", "PROCESS", "item", 1), c("guide_rail", "Направляющие погружного насоса", "MATERIAL", "set", 2), c("coupling_foot", "Автоматическая трубная муфта", "EQUIPMENT", "item", 2), c("odor_vent_boundary", "Граница удаления запахов", "CIVIL_INTERFACE", "set", 3)],
  site_sewer_connection: [c("property_inspection_chamber", "Контрольный колодец на границе", "CIVIL_INTERFACE", "item", 2), c("main_sewer_connection", "Присоединение к коллектору", "FITTING", "item", 1)],
  site_water_connection: [c("main_tapping", "Врезка в наружную сеть", "FITTING", "item", 1), c("boundary_valve", "Запорная арматура на границе", "VALVE", "item", 2), c("service_meter_boundary", "Граница коммерческого учёта", "CIVIL_INTERFACE", "item", 3)],
  sludge_dewatering: [c("sludge_feed_pump", "Насос подачи осадка", "EQUIPMENT", "item", 1), c("dewatering_press", "Пресс обезвоживания", "EQUIPMENT", "item", 1), c("filtrate_return", "Линия возврата фильтрата", "MATERIAL", "m", 2), c("cake_weighing_boundary", "Граница учёта обезвоженного осадка", "ELECTRICAL_INTERFACE", "set", 3)],
  stormwater_drainage: [c("storm_inlet_connection", "Присоединение дождеприёмника", "FITTING", "item", 2), c("oil_grit_separator", "Песко-нефтеуловитель", "EQUIPMENT", "item", 3, false)],
  valves_chambers: [c("valve_support", "Опора арматуры", "CIVIL_INTERFACE", "item", 2), c("dismantling_spool", "Демонтажная вставка", "FITTING", "item", 2)],
  village_sewer_network: [c("simplified_inspection_point", "Смотровая точка малой сети", "CIVIL_INTERFACE", "item", 3), c("septic_interface", "Граница локального очистного сооружения", "CIVIL_INTERFACE", "item", 4, false)],
  village_water_supply: [c("community_standpipe", "Общественная водоразборная точка", "EQUIPMENT", "item", 2, false), c("source_sanitary_zone_boundary", "Граница зоны санитарной охраны", "CIVIL_INTERFACE", "set", 3)],
  wastewater_treatment_plant: [c("plant_inlet_laboratory", "Входной лабораторный контроль", "TEST", "test", 2), c("effluent_compliance_monitoring", "Контроль соответствия очищенных стоков", "TEST", "test", 2), c("sludge_mass_balance", "Материальный баланс осадка", "DOCUMENT", "set", 3)],
  water_intake: [c("intake_screen", "Водоприёмная решётка", "EQUIPMENT", "item", 1), c("fish_protection_boundary", "Граница рыбозащитного устройства", "CIVIL_INTERFACE", "set", 3, false), c("raw_water_pump", "Насос исходной воды", "EQUIPMENT", "item", 2)],
  water_meter_chambers: [c("meter_straight_length", "Прямой участок узла учёта", "MATERIAL", "m", 2), c("water_meter", "Счётчик воды", "EQUIPMENT", "item", 1), c("meter_bypass", "Байпас узла учёта", "MATERIAL", "m", 3, false), c("meter_seal_points", "Точки пломбирования", "MATERIAL", "set", 3)],
  water_reservoir: [c("dual_cell_manifold", "Коллектор переключения секций", "MATERIAL", "set", 3), c("chlorine_residual_sample", "Контроль остаточного хлора", "TEST", "test", 3)],
  water_tower: [c("tower_support_interface", "Граница несущей башни", "CIVIL_INTERFACE", "set", 1), c("riser_pipe", "Водоподъёмный стояк", "MATERIAL", "m", 2), c("ice_protection", "Защита от замерзания", "MATERIAL", "set", 3)],
  water_treatment_plant: [c("raw_water_characterization", "Расширенный анализ исходной воды", "TEST", "test", 1), c("treated_water_compliance", "Подтверждение качества питьевой воды", "TEST", "test", 1), c("filter_backwash_recovery", "Возврат промывной воды", "PROCESS", "set", 3, false)],
  well_construction: [c("well_casing", "Обсадная колонна", "MATERIAL", "m", 1), c("well_screen", "Фильтровая колонна", "MATERIAL", "m", 1), c("gravel_pack", "Гравийная обсыпка", "MATERIAL", "m3", 2), c("annular_grout", "Тампонирование затрубного пространства", "MATERIAL", "m3", 2), c("development_pumping", "Опытная откачка и освоение", "TEST", "test", 1)],
});

function family(row: GlobalCatalogInventoryRowV1): string | null {
  return row.domain_id.startsWith("expanded:") ? row.domain_id.slice("expanded:".length) : null;
}

function maturity(row: GlobalCatalogInventoryRowV1): EstimateMaturity {
  switch (row.operation_class) {
    case "ROM_CONCEPT": return "ROM_CONCEPT";
    case "PRELIMINARY_BOQ": return "PRELIMINARY_BOQ";
    case "TENDER_BOQ": return "TENDER_BOQ";
    case "DETAILED_BOQ_FROM_DRAWINGS": return "DETAILED_BOQ";
    case "AS_BUILT_ESTIMATE": return "AS_BUILT";
    default: return "TASK";
  }
}

function componentDetailLimit(value: EstimateMaturity): 1 | 2 | 3 | 4 {
  if (value === "ROM_CONCEPT") return 2;
  if (value === "PRELIMINARY_BOQ" || value === "TENDER_BOQ") return 3;
  return 4;
}

function actionDetailLimit(value: EstimateMaturity): 1 | 2 | 3 | 4 {
  if (value === "ROM_CONCEPT") return 2;
  if (value === "PRELIMINARY_BOQ") return 3;
  return 4;
}

function expandedBase(profile: R5ProfileView): readonly Component[] {
  if (profile.kind === "CHAMBER") return CHAMBER_COMPONENTS;
  if (profile.kind === "PUMP") return PUMP_FACILITY_COMPONENTS;
  if (profile.kind === "TREATMENT") return TREATMENT_FACILITY_COMPONENTS;
  if (profile.kind === "STORAGE") return STORAGE_FACILITY_COMPONENTS;
  if (profile.kind === "DRAINAGE") return DRAINAGE_COMPONENTS;
  if (profile.kind === "TESTING") return TESTING_SCOPE_COMPONENTS;
  return EXTERNAL_NETWORK_COMPONENTS;
}

function plumbingComponents(row: GlobalCatalogInventoryRowV1): readonly Component[] {
  const scope = row.scope_capabilities.flatMap((capability) => SCOPE_COMPONENTS[capability] ?? []);
  const system = row.primary_material_or_system;
  const systemComponents = SYSTEM_COMPONENTS[system] ?? [];
  const identityComponents = systemComponents.slice(0, 1);
  if (row.operation_class === "PREPARE") return [...PREPARATION_COMPONENTS, ...identityComponents, ...scope];
  if (row.operation_class === "PRESSURE_TEST") return [...TEST_COMPONENTS, ...identityComponents, ...scope];
  if (row.operation_class === "SEAL") return [...SEAL_COMPONENTS, ...identityComponents, ...scope];
  const shared = ["BATH", "MIXER", "SHOWER", "SINK", "TOILET"].includes(system)
    ? FIXTURE_COMPONENTS
    : ["PPR_PIPE", "PND_PIPE", "WATER_PIPE", "RISER", "SEWER"].includes(system)
      ? INTERNAL_NETWORK_COMPONENTS
      : INTERNAL_EQUIPMENT_COMPONENTS;
  const base = [...shared, ...systemComponents, ...scope];
  if (row.operation_class === "CONNECT") {
    return [...CONNECTION_COMPONENTS, ...base.filter((component) => component.detailLevel <= 2 && ["FITTING", "VALVE", "TEST", "DOCUMENT", "CIVIL_INTERFACE", "LOGISTICS"].includes(component.role)), ...identityComponents];
  }
  if (row.operation_class === "ROUTE") {
    return [...base.filter((component) => ["MATERIAL", "FITTING", "CIVIL_INTERFACE", "DOCUMENT", "TEST", "LOGISTICS"].includes(component.role)), ...identityComponents];
  }
  if (row.operation_class === "REPAIR") {
    return [
      c("fault_diagnostics", "Диагностика дефекта и уточнение границ ремонта", "TEST", "test", 1),
      c("local_dismantling", "Локальная разборка дефектного участка", "DEMOLITION", "item", 1),
      ...base.filter((component) => component.detailLevel <= 3),
      c("repair_waste_transfer", "Передача демонтированных материалов в подтверждённый маршрут отходов", "DEMOLITION", "kg", 2),
    ];
  }
  if (row.operation_class === "REPLACE") {
    return [
      c("existing_asset_isolation", "Отключение заменяемого элемента", "DEMOLITION", "item", 1),
      c("existing_asset_removal", "Демонтаж заменяемого элемента", "DEMOLITION", "item", 1),
      c("demolition_waste_sorting", "Сортировка демонтированных материалов", "DEMOLITION", "kg", 2),
      ...base,
    ];
  }
  return base;
}

function plumbingDetailLimit(row: GlobalCatalogInventoryRowV1): 1 | 2 | 3 | 4 {
  if (["PREPARE", "PRESSURE_TEST", "SEAL", "CONNECT"].includes(row.operation_class)) return 2;
  if (["INSTALL", "ROUTE"].includes(row.operation_class)) return row.scope_capabilities.includes("high_load") ? 4 : 3;
  return 4;
}

function complexityFor(row: GlobalCatalogInventoryRowV1, profile: R5ProfileView, value: EstimateMaturity): WaterR5Complexity {
  if (value === "TASK") {
    if (["PREPARE", "PRESSURE_TEST", "SEAL", "CONNECT"].includes(row.operation_class)) return "L1";
    if (["PUMP", "BOILER", "COLLECTOR", "FILTER", "INSTALLATION", "METER"].includes(row.primary_material_or_system) && ["INSTALL", "REPAIR", "REPLACE"].includes(row.operation_class)) return "L3";
    return "L2";
  }
  if (profile.kind === "TREATMENT") return value === "ROM_CONCEPT" ? "L4" : "L5";
  if (["PUMP", "STORAGE"].includes(profile.kind)) return ["DETAILED_BOQ", "AS_BUILT"].includes(value) ? "L5" : "L4";
  if (value === "ROM_CONCEPT") return "L3";
  return ["DETAILED_BOQ", "AS_BUILT"].includes(value) ? "L4" : "L3";
}

function deduplicateComponents(values: readonly Component[]): Component[] {
  const map = new Map<string, Component>();
  for (const value of values) {
    const previous = map.get(value.key);
    if (!previous || value.detailLevel < previous.detailLevel) map.set(value.key, value);
  }
  return [...map.values()];
}

function input(
  parameterId: string,
  valueType: WaterR5Input["valueType"],
  unitId: string | null,
  titleRu: string,
  constraints: Record<string, unknown>,
  defaultValue: unknown = null,
): WaterR5Input {
  return {
    parameterId,
    valueType,
    unitId,
    titleRu,
    required: true,
    defaultValue,
    constraints: {
      ...constraints,
      engineeringInputPolicy: "EXPLICIT_PROJECT_OR_SIGNED_NORM_INPUT",
      hiddenEngineeringDefault: false,
    },
  };
}

function sourceLocator(profile: R5ProfileView, component: Component, row: GlobalCatalogInventoryRowV1): { sourceId: string; locator: string; priceSourceId: string } {
  if (profile.networkLocation === "INTERNAL") {
    if (["BATH", "MIXER", "SHOWER", "SINK", "TOILET"].includes(row.primary_material_or_system)) {
      const table = row.primary_material_or_system === "TOILET" ? "17-01-002" : row.primary_material_or_system === "MIXER" ? "17-01-003" : "17-01-001";
      return { sourceId: "kg_krer17_2015", locator: `table:${table};resource_or_operation:${component.key}`, priceSourceId: profile.priceSourceId };
    }
    const table = profile.kind === "INTERNAL_GRAVITY" ? "16-04-001" : component.role === "VALVE" ? "16-05-001" : "16-02-001";
    return { sourceId: "kg_krer16_2015", locator: `table:${table};resource_or_operation:${component.key}`, priceSourceId: profile.priceSourceId };
  }
  if (profile.kind === "TREATMENT" || profile.kind === "PUMP") {
    return { sourceId: "kg_krerp09_2015", locator: `collection:09;commissioning_position:${component.key}`, priceSourceId: component.role === "EQUIPMENT" ? profile.priceSourceId : "kg_krerp09_2015" };
  }
  if (["EXTERNAL_GRAVITY", "DRAINAGE", "CHAMBER"].includes(profile.kind)) {
    const table = component.role === "CIVIL_INTERFACE" || profile.kind === "CHAMBER" ? "23-02-001" : "23-01-001";
    return { sourceId: "kg_krer23_2015", locator: `table:${table};resource_or_operation:${component.key}`, priceSourceId: profile.priceSourceId };
  }
  const table = component.role === "VALVE" ? "22-03-001" : component.role === "CIVIL_INTERFACE" ? "22-04-001" : "22-01-001";
  return { sourceId: "kg_krer22_2015", locator: `table:${table};resource_or_operation:${component.key}`, priceSourceId: profile.priceSourceId };
}

type Action = {
  key: string;
  minDetail: 1 | 2 | 3 | 4;
  section: string;
  category: string;
  titlePrefix: string;
  rowType: WaterR5RowType;
  unitId: string;
  inputSuffix?: "labor" | "machine" | "mass" | "handling" | "inspection" | "waste";
  procurement: boolean;
};

const ACTIONS: Readonly<Record<ComponentRole, readonly Action[]>> = Object.freeze({
  MATERIAL: [
    { key: "supply", minDetail: 1, section: "Материалы", category: "supply", titlePrefix: "Поставка", rowType: "material", unitId: "COMPONENT", procurement: true },
    { key: "install_labor", minDetail: 1, section: "Монтаж", category: "labor", titlePrefix: "Монтаж", rowType: "labor", unitId: "man_hour", inputSuffix: "labor", procurement: false },
    { key: "installation_machine", minDetail: 2, section: "Механизмы", category: "equipment", titlePrefix: "Механизированное выполнение", rowType: "equipment", unitId: "machine_hour", inputSuffix: "machine", procurement: false },
    { key: "delivery", minDetail: 2, section: "Логистика", category: "transport", titlePrefix: "Доставка", rowType: "service", unitId: "t_km", inputSuffix: "mass", procurement: false },
    { key: "handling", minDetail: 3, section: "Логистика", category: "handling", titlePrefix: "Приёмка и внутриплощадочное перемещение", rowType: "labor", unitId: "man_hour", inputSuffix: "handling", procurement: false },
    { key: "inspection", minDetail: 3, section: "Контроль качества", category: "inspection", titlePrefix: "Контроль качества", rowType: "service", unitId: "test", inputSuffix: "inspection", procurement: false },
    { key: "waste", minDetail: 3, section: "Отходы", category: "waste", titlePrefix: "Учёт технологических обрезков", rowType: "waste", unitId: "kg", inputSuffix: "waste", procurement: false },
    { key: "passport", minDetail: 4, section: "Документация", category: "passport", titlePrefix: "Паспорт и сертификат", rowType: "service", unitId: "set", procurement: false },
  ],
  FITTING: [
    { key: "supply", minDetail: 1, section: "Фасонные части", category: "supply", titlePrefix: "Поставка", rowType: "material", unitId: "COMPONENT", procurement: true },
    { key: "joint_labor", minDetail: 1, section: "Соединения", category: "labor", titlePrefix: "Сборка соединения", rowType: "labor", unitId: "man_hour", inputSuffix: "labor", procurement: false },
    { key: "joint_tool", minDetail: 2, section: "Механизмы", category: "equipment", titlePrefix: "Инструмент для соединения", rowType: "equipment", unitId: "machine_hour", inputSuffix: "machine", procurement: false },
    { key: "delivery", minDetail: 2, section: "Логистика", category: "transport", titlePrefix: "Доставка", rowType: "service", unitId: "t_km", inputSuffix: "mass", procurement: false },
    { key: "joint_inspection", minDetail: 3, section: "Контроль качества", category: "inspection", titlePrefix: "Осмотр соединения", rowType: "service", unitId: "test", inputSuffix: "inspection", procurement: false },
    { key: "waste", minDetail: 3, section: "Отходы", category: "waste", titlePrefix: "Учёт отходов соединения", rowType: "waste", unitId: "kg", inputSuffix: "waste", procurement: false },
    { key: "joint_record", minDetail: 4, section: "Документация", category: "record", titlePrefix: "Запись соединения", rowType: "service", unitId: "set", procurement: false },
  ],
  VALVE: [
    { key: "supply", minDetail: 1, section: "Арматура", category: "supply", titlePrefix: "Поставка", rowType: "material", unitId: "COMPONENT", procurement: true },
    { key: "install_labor", minDetail: 1, section: "Арматура", category: "labor", titlePrefix: "Монтаж", rowType: "labor", unitId: "man_hour", inputSuffix: "labor", procurement: false },
    { key: "lifting", minDetail: 2, section: "Механизмы", category: "lifting", titlePrefix: "Подъём и позиционирование", rowType: "equipment", unitId: "machine_hour", inputSuffix: "machine", procurement: false },
    { key: "delivery", minDetail: 2, section: "Логистика", category: "transport", titlePrefix: "Доставка", rowType: "service", unitId: "t_km", inputSuffix: "mass", procurement: false },
    { key: "functional_test", minDetail: 2, section: "Испытания", category: "testing", titlePrefix: "Функциональная проверка", rowType: "service", unitId: "test", inputSuffix: "inspection", procurement: false },
    { key: "passport", minDetail: 3, section: "Документация", category: "passport", titlePrefix: "Паспорт и настройка", rowType: "service", unitId: "set", procurement: false },
    { key: "waste", minDetail: 4, section: "Отходы", category: "waste", titlePrefix: "Учёт упаковки и заменяемых уплотнений", rowType: "waste", unitId: "kg", inputSuffix: "waste", procurement: false },
  ],
  EQUIPMENT: [
    { key: "supply", minDetail: 1, section: "Оборудование", category: "supply", titlePrefix: "Поставка", rowType: "equipment", unitId: "COMPONENT", procurement: true },
    { key: "incoming_inspection", minDetail: 2, section: "Контроль качества", category: "incoming", titlePrefix: "Входной контроль", rowType: "service", unitId: "test", inputSuffix: "inspection", procurement: false },
    { key: "install_labor", minDetail: 1, section: "Монтаж оборудования", category: "labor", titlePrefix: "Монтаж", rowType: "labor", unitId: "man_hour", inputSuffix: "labor", procurement: false },
    { key: "lifting", minDetail: 2, section: "Механизмы", category: "lifting", titlePrefix: "Подъём и позиционирование", rowType: "equipment", unitId: "machine_hour", inputSuffix: "machine", procurement: false },
    { key: "delivery", minDetail: 2, section: "Логистика", category: "transport", titlePrefix: "Доставка", rowType: "service", unitId: "t_km", inputSuffix: "mass", procurement: false },
    { key: "alignment", minDetail: 3, section: "Монтаж оборудования", category: "alignment", titlePrefix: "Выверка и центровка", rowType: "service", unitId: "test", inputSuffix: "inspection", procurement: false },
    { key: "individual_test", minDetail: 2, section: "Пусконаладка", category: "individual_test", titlePrefix: "Индивидуальное испытание", rowType: "service", unitId: "test", inputSuffix: "inspection", procurement: false },
    { key: "passport", minDetail: 3, section: "Документация", category: "passport", titlePrefix: "Паспорт, гарантия и протокол", rowType: "service", unitId: "set", procurement: false },
    { key: "waste", minDetail: 4, section: "Отходы", category: "waste", titlePrefix: "Учёт упаковки и пусковых отходов", rowType: "waste", unitId: "kg", inputSuffix: "waste", procurement: false },
  ],
  PROCESS: [
    { key: "process_scope", minDetail: 1, section: "Технологический процесс", category: "scope", titlePrefix: "Технологический объём", rowType: "service", unitId: "COMPONENT", procurement: false },
    { key: "process_material", minDetail: 2, section: "Технологический процесс", category: "material", titlePrefix: "Материал или рабочая среда", rowType: "material", unitId: "COMPONENT", procurement: true },
    { key: "process_labor", minDetail: 1, section: "Технологический процесс", category: "labor", titlePrefix: "Выполнение операции", rowType: "labor", unitId: "man_hour", inputSuffix: "labor", procurement: false },
    { key: "process_equipment", minDetail: 2, section: "Механизмы", category: "equipment", titlePrefix: "Технологическое оборудование", rowType: "equipment", unitId: "machine_hour", inputSuffix: "machine", procurement: false },
    { key: "process_control", minDetail: 2, section: "Контроль качества", category: "inspection", titlePrefix: "Контроль параметров", rowType: "service", unitId: "test", inputSuffix: "inspection", procurement: false },
    { key: "delivery", minDetail: 3, section: "Логистика", category: "transport", titlePrefix: "Доставка рабочей среды", rowType: "service", unitId: "t_km", inputSuffix: "mass", procurement: false },
    { key: "process_waste", minDetail: 3, section: "Отходы", category: "waste", titlePrefix: "Отвод фактических технологических отходов", rowType: "waste", unitId: "kg", inputSuffix: "waste", procurement: false },
    { key: "process_protocol", minDetail: 4, section: "Документация", category: "protocol", titlePrefix: "Протокол операции", rowType: "service", unitId: "set", procurement: false },
  ],
  CIVIL_INTERFACE: [
    { key: "scope_transfer", minDetail: 1, section: "Граница смежного владельца", category: "typed_child", titlePrefix: "Передача объёма без повторного учёта", rowType: "service", unitId: "COMPONENT", procurement: false },
    { key: "coordination", minDetail: 2, section: "Граница смежного владельца", category: "coordination", titlePrefix: "Координация геометрии и готовности", rowType: "service", unitId: "test", inputSuffix: "inspection", procurement: false },
    { key: "acceptance", minDetail: 3, section: "Контроль качества", category: "acceptance", titlePrefix: "Приёмка результата смежного владельца", rowType: "service", unitId: "test", inputSuffix: "inspection", procurement: false },
    { key: "interface_record", minDetail: 4, section: "Документация", category: "record", titlePrefix: "Акт границы ответственности", rowType: "service", unitId: "set", procurement: false },
  ],
  ELECTRICAL_INTERFACE: [
    { key: "load_or_signal_schedule", minDetail: 1, section: "Электрика и автоматика", category: "typed_child", titlePrefix: "Задание смежному владельцу", rowType: "service", unitId: "COMPONENT", procurement: false },
    { key: "interface_coordination", minDetail: 2, section: "Электрика и автоматика", category: "coordination", titlePrefix: "Координация интерфейса", rowType: "service", unitId: "test", inputSuffix: "inspection", procurement: false },
    { key: "functional_interface_test", minDetail: 3, section: "Пусконаладка", category: "interface_test", titlePrefix: "Совместное функциональное испытание", rowType: "service", unitId: "test", inputSuffix: "inspection", procurement: false },
    { key: "interface_protocol", minDetail: 4, section: "Документация", category: "protocol", titlePrefix: "Протокол интерфейса", rowType: "service", unitId: "set", procurement: false },
  ],
  TEST: [
    { key: "test_service", minDetail: 1, section: "Испытания", category: "testing", titlePrefix: "Выполнение", rowType: "service", unitId: "test", inputSuffix: "inspection", procurement: false },
    { key: "test_labor", minDetail: 1, section: "Испытания", category: "labor", titlePrefix: "Труд испытательной бригады", rowType: "labor", unitId: "man_hour", inputSuffix: "labor", procurement: false },
    { key: "test_equipment", minDetail: 2, section: "Испытания", category: "equipment", titlePrefix: "Испытательные приборы", rowType: "equipment", unitId: "machine_hour", inputSuffix: "machine", procurement: false },
    { key: "test_consumable", minDetail: 3, section: "Испытания", category: "consumable", titlePrefix: "Подтверждённый расходный материал", rowType: "material", unitId: "kg", inputSuffix: "waste", procurement: true },
    { key: "test_protocol", minDetail: 2, section: "Документация", category: "protocol", titlePrefix: "Протокол", rowType: "service", unitId: "set", procurement: false },
  ],
  DOCUMENT: [
    { key: "document", minDetail: 1, section: "Документация", category: "document", titlePrefix: "Подготовка и проверка", rowType: "service", unitId: "set", procurement: false },
    { key: "document_review", minDetail: 3, section: "Документация", category: "review", titlePrefix: "Независимая проверка", rowType: "service", unitId: "test", inputSuffix: "inspection", procurement: false },
  ],
  LOGISTICS: [
    { key: "logistics_service", minDetail: 1, section: "Логистика", category: "transport", titlePrefix: "Логистическая операция", rowType: "service", unitId: "t_km", inputSuffix: "mass", procurement: false },
    { key: "logistics_handling", minDetail: 2, section: "Логистика", category: "handling", titlePrefix: "Погрузочно-разгрузочная операция", rowType: "labor", unitId: "man_hour", inputSuffix: "handling", procurement: false },
  ],
  DEMOLITION: [
    { key: "dismantling_labor", minDetail: 1, section: "Демонтаж", category: "labor", titlePrefix: "Демонтаж", rowType: "labor", unitId: "man_hour", inputSuffix: "labor", procurement: false },
    { key: "dismantling_machine", minDetail: 2, section: "Демонтаж", category: "equipment", titlePrefix: "Механизмы демонтажа", rowType: "equipment", unitId: "machine_hour", inputSuffix: "machine", procurement: false },
    { key: "demolition_waste", minDetail: 1, section: "Отходы", category: "waste", titlePrefix: "Раздельный учёт демонтированного материала", rowType: "waste", unitId: "kg", inputSuffix: "waste", procurement: false },
    { key: "waste_haul", minDetail: 2, section: "Логистика", category: "waste_transport", titlePrefix: "Вывоз по подтверждённому маршруту", rowType: "service", unitId: "t_km", inputSuffix: "mass", procurement: false },
    { key: "demolition_record", minDetail: 3, section: "Документация", category: "record", titlePrefix: "Акт демонтажа и передачи отходов", rowType: "service", unitId: "set", procurement: false },
  ],
});

function componentActions(component: Component, actionDepth: 1 | 2 | 3 | 4): readonly Action[] {
  return ACTIONS[component.role].filter((action) => action.minDetail <= actionDepth);
}

function combineCondition(...conditions: WaterR5Condition[]): WaterR5Condition {
  const applicable = conditions.filter((condition) => condition.kind !== "literal" || condition.value);
  if (!applicable.length) return { kind: "literal", value: true };
  if (applicable.length === 1) return applicable[0];
  return { kind: "and", operands: applicable };
}

function parameterExpression(
  outputParameterId: string,
  quantityParameterId: string,
  action: Action,
  component: Component,
): string {
  const quantity = `${outputParameterId} * ${quantityParameterId}`;
  if (!action.inputSuffix) return quantity;
  const suffix = `${action.inputSuffix}_${component.key}_per_unit`;
  if (action.inputSuffix === "mass") return `${quantity} * ${suffix} * delivery_distance_km`;
  return `${quantity} * ${suffix}`;
}

function actionInput(component: Component, suffix: NonNullable<Action["inputSuffix"]>): WaterR5Input {
  const specs: Record<NonNullable<Action["inputSuffix"]>, { unit: string; title: string; sample: number }> = {
    labor: { unit: "man_hour/item", title: "Трудоёмкость на единицу", sample: 1.25 },
    machine: { unit: "machine_hour/item", title: "Машиноёмкость на единицу", sample: 0.35 },
    mass: { unit: "t/item", title: "Масса на единицу", sample: 0.05 },
    handling: { unit: "man_hour/item", title: "Трудоёмкость перемещения на единицу", sample: 0.15 },
    inspection: { unit: "test/item", title: "Количество контрольных операций на единицу", sample: 1 },
    waste: { unit: "kg/item", title: "Подтверждённая масса отхода или расходного материала на единицу", sample: 0.1 },
  };
  const spec = specs[suffix];
  return input(`${suffix}_${component.key}_per_unit`, "decimal", spec.unit, `${spec.title}: ${component.titleRu}`, {
    min: suffix === "waste" ? 0 : 0.000001,
    admissionSampleValue: spec.sample,
    quantityBasis: "PROJECT_BOQ_OR_SIGNED_RATE_RESOURCE_COMPOSITION",
  });
}

export function buildWaterR5ProfessionalPlan(row: GlobalCatalogInventoryRowV1, profile: R5ProfileView): WaterR5Plan {
  const estimateMaturity = maturity(row);
  const expandedFamily = family(row);
  const limit = expandedFamily ? componentDetailLimit(estimateMaturity) : plumbingDetailLimit(row);
  const actionDepth = expandedFamily ? actionDetailLimit(estimateMaturity) : plumbingDetailLimit(row);
  const familyComponents = expandedFamily ? FAMILY_ADDITIONS[expandedFamily] ?? [] : [];
  const maturityComponent = expandedFamily ? [
    estimateMaturity === "ROM_CONCEPT"
      ? c("rom_basis_record", "Ведомость исходных допущений концептуальной оценки", "DOCUMENT", "set", 1)
      : estimateMaturity === "PRELIMINARY_BOQ"
        ? c("preliminary_quantity_basis", "Ведомость предварительных объёмов и исходных данных", "DOCUMENT", "set", 1)
        : estimateMaturity === "TENDER_BOQ"
          ? c("tender_scope_allocation", "Тендерная ведомость границ, включений и исключений", "DOCUMENT", "set", 1)
          : estimateMaturity === "DETAILED_BOQ"
            ? c("drawing_quantity_reconciliation", "Сверка объёмов с рабочими чертежами и спецификациями", "DOCUMENT", "set", 1)
            : c("as_built_quantity_reconciliation", "Сверка сметы с исполнительными объёмами", "DOCUMENT", "set", 1),
  ] : [];
  const familyIdentity = familyComponents.length ? [{ ...familyComponents[0], detailLevel: 1 as const }] : [];
  const rawComponents = expandedFamily
    ? [...expandedBase(profile), ...familyIdentity, ...familyComponents, ...maturityComponent]
    : plumbingComponents(row);
  const components = deduplicateComponents(rawComponents).filter((component) => component.detailLevel <= limit);
  if (!components.length) throw new Error(`WATER_R5_EMPTY_OBLIGATION_UNIVERSE:${row.catalog_id}`);

  const inputs = new Map<string, WaterR5Input>();
  const addInput = (value: WaterR5Input): void => { if (!inputs.has(value.parameterId)) inputs.set(value.parameterId, value); };
  const outputSample = profile.outputUnitId === "m" ? 100 : 1;
  addInput(input(profile.outputParameterId, "decimal", profile.outputUnitId, "Проектный объём основной единицы результата", {
    min: 0.000001,
    admissionSampleValue: outputSample,
    quantityBasis: "PROJECT_BOQ_OR_MEASURED_AS_BUILT_QUANTITY",
  }));
  const obligations: WaterR5Obligation[] = [];
  for (const component of components) {
    const quantityParameterId = `qty_${component.key}_per_output`;
    const includeParameterId = `include_${component.key}`;
    if (!component.required) {
      addInput({
        parameterId: includeParameterId,
        valueType: "boolean",
        unitId: null,
        titleRu: `Применимость: ${component.titleRu}`,
        required: true,
        defaultValue: false,
        constraints: { admissionSampleValue: true, applicabilityDecision: "EXPLICIT_PROJECT_INPUT", hiddenEngineeringDefault: false },
      });
    }
    addInput({ ...input(quantityParameterId, "decimal", `${component.unitId}/${profile.outputUnitId}`, `Количество на единицу результата: ${component.titleRu}`, {
      min: 0.000001,
      admissionSampleValue: component.unitId === "m" ? 1 : 1,
      requiredWhen: component.required ? undefined : { parameterId: includeParameterId, equals: true },
      forbiddenWhen: component.required ? undefined : { parameterId: includeParameterId, equals: false },
      quantityBasis: "PROJECT_BOQ_OR_MEASURED_AS_BUILT_QUANTITY",
    }), required: component.required });
    const baseCondition: WaterR5Condition = component.required
      ? { kind: "literal", value: true }
      : { kind: "parameter", id: includeParameterId };
    const norm = sourceLocator(profile, component, row);
    for (const action of componentActions(component, actionDepth)) {
      if (action.inputSuffix) {
        const actionParameter = actionInput(component, action.inputSuffix);
        addInput(component.required ? actionParameter : {
          ...actionParameter,
          required: false,
          constraints: {
            ...actionParameter.constraints,
            requiredWhen: { parameterId: includeParameterId, equals: true },
            forbiddenWhen: { parameterId: includeParameterId, equals: false },
          },
        });
        if (action.inputSuffix === "mass") {
          addInput(input("delivery_distance_km", "decimal", "km", "Подтверждённое плечо доставки", {
            min: 0,
            admissionSampleValue: 25,
            routePolicy: "SUPPLIER_OR_WASTE_ROUTE_DOCUMENT",
          }));
        }
      }
      const variantEligible = action.key === "supply" && ["MATERIAL", "EQUIPMENT"].includes(component.role);
      if (variantEligible) {
        addInput(input("material_variant", "enum", null, "Проектный вариант основного материала или оборудования", {
          values: profile.materialVariants,
          admissionSampleValue: profile.materialVariants[0],
          selectionPolicy: "EXPLICIT_PROJECT_SPECIFICATION",
        }));
      }
      const variants = variantEligible ? profile.materialVariants : [null];
      for (const variant of variants) {
        const variantKey = variant ? `_${String(variant).toLocaleLowerCase("en-US")}` : "";
        const variantCondition: WaterR5Condition = variant
          ? { kind: "equals", parameterId: "material_variant", value: variant }
          : { kind: "literal", value: true };
        const expression = parameterExpression(profile.outputParameterId, quantityParameterId, action, component);
        const unitId = action.unitId === "COMPONENT" ? component.unitId : action.unitId;
        const ownerPrefix = component.role === "CIVIL_INTERFACE"
          ? "typed-child:CIVIL_EARTHWORKS_CONCRETE_SURFACE"
          : component.role === "ELECTRICAL_INTERFACE"
            ? "typed-child:ELECTRICAL_AUTOMATION"
            : component.role === "DEMOLITION"
              ? "water:demolition"
              : "water";
        obligations.push({
          key: `${component.key}:${action.key}${variantKey}`,
          section: action.section,
          category: action.category,
          titleRu: `${action.titlePrefix}: ${component.titleRu}${variant ? ` — ${variant}` : ""}`,
          rowType: action.rowType,
          unitId,
          expression,
          condition: combineCondition(baseCondition, variantCondition),
          procurementEligible: action.procurement,
          semanticOwner: `${ownerPrefix}:${component.key}:${action.key}${variantKey}`,
          sourceId: norm.sourceId,
          locator: norm.locator,
          priceSourceId: norm.priceSourceId,
          applicability: `catalog_id=${row.catalog_id};operation=${row.operation_class};scope=${row.scope_capabilities.join(",")};component=${component.key};action=${action.key}`,
          componentKey: component.key,
          actionKey: action.key,
          componentRole: component.role,
        });
      }
    }
    if (estimateMaturity === "AS_BUILT") {
      obligations.push({
        key: `${component.key}:as_built_trace`,
        section: "Исполнительная документация",
        category: "as_built_trace",
        titleRu: `Фактическая исполнительная запись: ${component.titleRu}`,
        rowType: "service",
        unitId: "set",
        expression: `${profile.outputParameterId} * ${quantityParameterId}`,
        condition: baseCondition,
        procurementEligible: false,
        semanticOwner: `water:as-built:${component.key}`,
        sourceId: norm.sourceId,
        locator: norm.locator,
        priceSourceId: norm.priceSourceId,
        applicability: `catalog_id=${row.catalog_id};as_built_actual_component=${component.key}`,
        componentKey: component.key,
        actionKey: "as_built_trace",
        componentRole: component.role,
      });
    }
  }

  const stages = [...new Set(obligations.map((obligation) => obligation.section))];
  const optionalStages = [...new Set(obligations.filter((obligation) => obligation.condition.kind !== "literal").map((obligation) => obligation.section))];
  return {
    complexity: complexityFor(row, profile, estimateMaturity),
    estimateMaturity,
    requiredStages: stages.filter((stage) => !optionalStages.includes(stage)),
    optionalStages,
    components,
    inputs: [...inputs.values()],
    obligations,
    obligationUniverse: components.map((component) => ({
      componentKey: component.key,
      componentTitleRu: component.titleRu,
      role: component.role,
      required: component.required,
      detailLevel: component.detailLevel,
      disposition: "INCLUDED" as const,
    })),
  };
}
