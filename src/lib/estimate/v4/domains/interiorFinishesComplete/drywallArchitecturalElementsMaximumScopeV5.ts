import { estimateDeterministicHash } from "../../../estimateDeterministicHash";
import type { ProfessionalAssemblyParameterRoleV4 } from "../../professionalProjectAssemblyV4";
import type {
  DrywallArchitecturalElementOperationV4,
  DrywallArchitecturalElementProfessionalPackagePartsV4,
  DrywallArchitecturalElementVariantV4,
} from "./drywallArchitecturalElementsProfessionalV4";

export type DrywallMaximumScopeLineV5 = {
  key: string;
  section: string;
  category: "material" | "labor" | "equipment" | "transport" | "waste" | "testing" | "documentation" | "subcontract_service" | "temporary_work";
  title_ru: string;
  quantity_parameter_id: string;
  quantity_label_ru: string;
  unit_id: string;
  parameter_role: ProfessionalAssemblyParameterRoleV4;
  resource_class: string;
  procurement_eligible: boolean;
  candidate_family: "material" | "operation" | "machine" | "service" | "test" | "logistics" | "waste_hse_document";
};

const line = (
  key: string,
  section: string,
  category: DrywallMaximumScopeLineV5["category"],
  title_ru: string,
  unit_id: string,
  candidate_family: DrywallMaximumScopeLineV5["candidate_family"],
  resource_class = key,
): DrywallMaximumScopeLineV5 => ({
  key,
  section,
  category,
  title_ru,
  quantity_parameter_id: `quantity_${key}`,
  quantity_label_ru: `Проектное/нормативное количество: ${title_ru}`,
  unit_id,
  parameter_role: category === "testing" || category === "documentation" ? "CONTROL_PLAN_VALUE" : "PROJECT_QUANTITY",
  resource_class,
  procurement_eligible: category === "material" || category === "transport",
  candidate_family,
});

const COMMON: readonly DrywallMaximumScopeLineV5[] = Object.freeze([
  line("access_delivery_trip", "Средства доступа", "transport", "Доставка средств подмащивания на объект", "trip", "logistics"),
  line("access_assembly", "Средства доступа", "temporary_work", "Монтаж и первичная приемка средств подмащивания", "service", "operation"),
  line("access_reposition", "Средства доступа", "equipment", "Эксплуатация и перестановка средств подмащивания", "machine_hour", "machine"),
  line("access_dismantle_return", "Средства доступа", "temporary_work", "Демонтаж и возврат средств подмащивания", "service", "operation"),
  line("horizontal_material_movement", "Логистика", "transport", "Горизонтальное перемещение материалов по объекту", "t_m", "logistics"),
  line("work_zone_distribution", "Логистика", "labor", "Распределение ресурсов по отдельным рабочим зонам", "t", "logistics"),
  line("storage_material_protection", "Логистика", "temporary_work", "Организация хранения и защиты материалов от влаги и повреждения", "service", "logistics"),
  line("reusable_packaging_return", "Логистика", "transport", "Возврат многооборотной упаковки поставщику", "t", "logistics"),
  line("warning_signs_barriers", "HSE", "material", "Ограждения и предупреждающие знаки рабочей зоны", "set", "waste_hse_document"),
  line("ppe_consumables", "HSE", "material", "СИЗ органов дыхания, глаз и рук", "person_shift", "waste_hse_document"),
  line("fall_protection_equipment", "HSE", "equipment", "Система защиты от падения при применимой высоте", "machine_hour", "waste_hse_document"),
  line("temporary_power_distribution", "HSE", "equipment", "Временное защищенное электроснабжение инструмента", "machine_hour", "waste_hse_document"),
  line("safety_briefing", "HSE", "labor", "Целевой инструктаж и допуск исполнителей", "person", "waste_hse_document"),
  line("intermediate_housekeeping", "HSE", "labor", "Промежуточное поддержание чистоты рабочей зоны", "m2", "waste_hse_document"),
  line("hidden_work_photo_record", "Исполнительная документация", "documentation", "Фотофиксация скрытых и контрольных стадий", "document", "waste_hse_document"),
  line("work_journal_record", "Исполнительная документация", "documentation", "Запись в журнале производства работ", "document", "waste_hse_document"),
  line("environment_waste_record", "Исполнительная документация", "documentation", "Запись о сортировке и передаче отходов", "document", "waste_hse_document"),
  line("final_visual_acceptance", "Приемка", "testing", "Итоговый визуальный контроль и приемка самостоятельной стадии", "test", "test"),
]);

const PREPARE: readonly DrywallMaximumScopeLineV5[] = Object.freeze([
  line("prepare_protective_film", "Защита помещения", "material", "Защитная пленка существующей отделки", "m2", "material"),
  line("prepare_floor_protection_board", "Защита помещения", "material", "Защитный картон или плита для пола", "m2", "material"),
  line("prepare_masking_tape", "Защита помещения", "material", "Малярная лента герметизации укрытий", "m", "material"),
  line("prepare_dust_screen", "Защита помещения", "material", "Локальный пылезащитный экран", "m2", "material"),
  line("prepare_layout_consumables", "Разбивка", "material", "Разметочный шнур, краска и маркеры", "set", "material"),
  line("prepare_control_markers", "Разбивка", "material", "Временные реперы и контрольные метки", "item", "material"),
  line("prepare_template_material", "Разбивка", "material", "Материал пробного участка, шаблона или лекала", "item", "material"),
  line("prepare_substrate_primer", "Подготовка основания", "material", "Совместимая грунтовка основания", "kg", "material"),
  line("prepare_substrate_repair_compound", "Подготовка основания", "material", "Состав локального ремонта допустимых дефектов основания", "kg", "material"),
  line("prepare_cleaner", "Подготовка основания", "material", "Очиститель или обезжириватель основания", "kg", "material"),
  line("prepare_mep_caps", "Защита MEP", "material", "Временные заглушки и защита инженерных элементов", "item", "material"),
  line("prepare_substrate_survey", "Обследование", "testing", "Обследование основания и рабочей зоны", "test", "test"),
  line("prepare_control_measurements", "Обследование", "testing", "Контрольные замеры проектной геометрии", "test", "test"),
  line("prepare_laser_setout", "Разбивка", "labor", "Лазерная разбивка осей, высот и примыканий", "m", "operation"),
  line("prepare_template_fabrication", "Разбивка", "labor", "Построение дуги, шаблона или лекала", "item", "operation"),
  line("prepare_hidden_utility_detection", "Инженерные интерфейсы", "equipment", "Трассоискатель скрытых коммуникаций", "machine_hour", "machine"),
  line("prepare_moisture_meter", "Обследование", "equipment", "Измеритель влажности основания", "machine_hour", "machine"),
  line("prepare_local_cleaning", "Подготовка основания", "labor", "Локальная очистка и обеспыливание основания", "m2", "operation"),
  line("prepare_local_defect_repair", "Подготовка основания", "labor", "Устранение допустимых локальных дефектов основания", "m2", "operation"),
  line("prepare_trial_area", "Подготовка основания", "labor", "Устройство и оценка пробного участка", "m2", "operation"),
  line("prepare_base_readiness_act", "Исполнительная документация", "documentation", "Акт готовности основания к следующей стадии", "document", "waste_hse_document"),
  line("prepare_layout_scheme", "Исполнительная документация", "documentation", "Схема разбивки осей и контрольных реперов", "document", "waste_hse_document"),
  line("prepare_control_point_journal", "Исполнительная документация", "documentation", "Журнал контрольных точек геометрии", "document", "waste_hse_document"),
]);

const FRAME: readonly DrywallMaximumScopeLineV5[] = Object.freeze([
  line("frame_flexible_track", "Материалы каркаса", "material", "Выбранный гибкий или сегментируемый направляющий профиль", "m", "material"),
  line("frame_straight_return_track", "Материалы каркаса", "material", "Прямой направляющий профиль торцов и возвратов", "m", "material"),
  line("frame_vertical_profiles", "Материалы каркаса", "material", "Стоечный профиль вертикальных элементов", "m", "material"),
  line("frame_cross_profiles", "Материалы каркаса", "material", "Профиль поперечных перемычек", "m", "material"),
  line("frame_profile_connectors", "Материалы каркаса", "material", "Соединители профилей выбранной системы", "item", "material"),
  line("frame_profile_extensions", "Материалы каркаса", "material", "Удлинители профилей по карте стыков", "item", "material"),
  line("frame_adjustable_hangers", "Материалы каркаса", "material", "Регулируемые подвесы выбранного типа", "item", "material"),
  line("frame_hanger_rods", "Материалы каркаса", "material", "Тяги или резьбовые шпильки подвесов", "m", "material"),
  line("frame_hanger_clips", "Материалы каркаса", "material", "Пружинные элементы и зажимы подвесов", "item", "material"),
  line("frame_track_anchors", "Крепеж каркаса", "material", "Анкеры направляющих по типу основания", "item", "material"),
  line("frame_hanger_anchors", "Крепеж каркаса", "material", "Анкеры подвесов по типу основания", "item", "material"),
  line("frame_metal_screws", "Крепеж каркаса", "material", "Винты металл-металл выбранного коррозионного класса", "item", "material"),
  line("frame_washers", "Крепеж каркаса", "material", "Шайбы узлов подвесов и усилений", "item", "material"),
  line("frame_locknuts", "Крепеж каркаса", "material", "Гайки и контргайки регулируемых узлов", "set", "material"),
  line("frame_acoustic_tape", "Материалы каркаса", "material", "Уплотнительная или акустическая лента примыканий", "m", "material"),
  line("frame_hatch_reinforcement", "Усиления", "material", "Профиль усиления ревизионных люков", "m", "material"),
  line("frame_mep_reinforcement", "Усиления", "material", "Профиль усиления инженерных пересечений", "m", "material"),
  line("frame_reinforcement_connectors", "Усиления", "material", "Дополнительные соединители усилений", "item", "material"),
  line("frame_cut_corrosion_protection", "Коррозионная защита", "material", "Состав защиты мест реза профиля", "l", "material"),
  line("frame_hidden_labels", "Маркировка", "material", "Бирки и маркировка скрытых элементов", "item", "material"),
  line("frame_template_development", "Изготовление каркаса", "labor", "Изготовление точного шаблона кривой", "item", "operation"),
  line("frame_anchor_point_layout", "Изготовление каркаса", "labor", "Разметка точек анкеров направляющих и подвесов", "point", "operation"),
  line("frame_anchor_drilling", "Изготовление каркаса", "labor", "Сверление отверстий с локальным пылеудалением", "hole", "operation"),
  line("frame_anchor_installation", "Изготовление каркаса", "labor", "Установка анкеров направляющих и подвесов", "item", "operation"),
  line("frame_profile_cutting", "Изготовление каркаса", "labor", "Резка профилей по карте раскроя", "m", "operation"),
  line("frame_profile_segmentation", "Изготовление каркаса", "labor", "Перфорация или сегментация криволинейного профиля", "m", "operation"),
  line("frame_radius_forming", "Изготовление каркаса", "labor", "Формирование профиля по точному шаблону", "m", "operation"),
  line("frame_track_installation", "Монтаж каркаса", "labor", "Монтаж криволинейных и прямых направляющих", "m", "operation"),
  line("frame_hanger_installation", "Монтаж каркаса", "labor", "Монтаж и предварительная регулировка подвесов", "item", "operation"),
  line("frame_vertical_profile_installation", "Монтаж каркаса", "labor", "Монтаж вертикальных профилей", "item", "operation"),
  line("frame_cross_member_installation", "Монтаж каркаса", "labor", "Монтаж поперечных элементов", "item", "operation"),
  line("frame_hatch_reinforcement_installation", "Монтаж каркаса", "labor", "Усиление проемов ревизионных люков", "item", "operation"),
  line("frame_mep_reinforcement_installation", "Монтаж каркаса", "labor", "Усиление мест инженерных пересечений", "item", "operation"),
  line("frame_three_dimensional_adjustment", "Монтаж каркаса", "labor", "Пространственное выравнивание каркаса по шаблону", "m", "operation"),
  line("frame_connection_torque_control", "Контроль качества", "testing", "Контроль и окончательная фиксация соединений", "connection", "test"),
  line("frame_cut_treatment_labor", "Коррозионная защита", "labor", "Обработка мест реза профиля", "point", "operation"),
  line("frame_hidden_element_marking", "Маркировка", "labor", "Маркировка скрытых элементов и узлов", "item", "operation"),
  line("frame_laser", "Инструмент каркаса", "equipment", "Лазерный уровень или нивелир", "machine_hour", "machine"),
  line("frame_perforator", "Инструмент каркаса", "equipment", "Перфоратор для анкеровки", "machine_hour", "machine"),
  line("frame_dust_extractor", "Инструмент каркаса", "equipment", "Промышленная установка пылеудаления", "machine_hour", "machine"),
  line("frame_cutting_tool", "Инструмент каркаса", "equipment", "Инструмент резки и просечки профиля", "machine_hour", "machine"),
  line("frame_driver", "Инструмент каркаса", "equipment", "Шуруповерт монтажа соединений", "machine_hour", "machine"),
  line("frame_torque_tool", "Инструмент каркаса", "equipment", "Контрольный инструмент затяжки", "machine_hour", "machine"),
  line("frame_template_tooling", "Инструмент каркаса", "temporary_work", "Шаблон и формовочная оснастка", "item", "machine"),
  line("frame_anchor_spacing_test", "Контроль качества", "testing", "Контроль шага анкеров и подвесов", "point", "test"),
  line("frame_radius_level_survey", "Контроль качества", "testing", "Инструментальная съемка радиуса, уровня и плавности", "test", "test"),
  line("frame_measurement_map", "Исполнительная документация", "documentation", "Карта контрольных замеров каркаса", "document", "waste_hse_document"),
  line("frame_handover_to_cladding", "Приемка", "documentation", "Передача принятого каркаса владельцу обшивки", "document", "waste_hse_document"),
]);

const ALIGN: readonly DrywallMaximumScopeLineV5[] = Object.freeze([
  line("align_adjustable_hanger_parts", "Коррекция каркаса", "material", "Регулировочные детали принятых подвесов", "item", "material"),
  line("align_corrective_connectors", "Коррекция каркаса", "material", "Корректирующие соединители", "item", "material"),
  line("align_shim_plates", "Коррекция каркаса", "material", "Системные регулировочные прокладки", "item", "material"),
  line("align_local_cross_members", "Коррекция каркаса", "material", "Дополнительные локальные перемычки", "m", "material"),
  line("align_local_reinforcement", "Коррекция каркаса", "material", "Профиль локального усиления", "m", "material"),
  line("align_correction_fasteners", "Коррекция каркаса", "material", "Крепеж корректирующих элементов", "item", "material"),
  line("align_control_markers", "Контроль геометрии", "material", "Контрольные маяки и реперы", "item", "material"),
  line("align_instrument_survey", "Контроль геометрии", "testing", "Исходная инструментальная съемка принятого каркаса", "test", "test"),
  line("align_reference_radius", "Контроль геометрии", "labor", "Построение контрольного радиуса или плоскости", "m", "operation"),
  line("align_node_release", "Коррекция каркаса", "labor", "Контролируемое ослабление корректируемых узлов", "connection", "operation"),
  line("align_hanger_adjustment", "Коррекция каркаса", "labor", "Регулировка подвесов и тяг", "item", "operation"),
  line("align_corrective_element_install", "Коррекция каркаса", "labor", "Установка корректирующих элементов", "item", "operation"),
  line("align_local_reinforcement_install", "Коррекция каркаса", "labor", "Монтаж локальных усилений", "m", "operation"),
  line("align_node_refastening", "Коррекция каркаса", "labor", "Повторная фиксация и torque-control узлов", "connection", "operation"),
  line("align_laser_instrument", "Инструмент выверки", "equipment", "Лазерный уровень и построитель плоскостей", "machine_hour", "machine"),
  line("align_radius_template", "Инструмент выверки", "temporary_work", "Контрольный шаблон радиуса", "item", "machine"),
  line("align_final_deviation_survey", "Контроль качества", "testing", "Итоговая съемка уровня, радиуса и плавности", "test", "test"),
  line("align_deviation_map", "Исполнительная документация", "documentation", "Карта исходных и исправленных отклонений", "document", "waste_hse_document"),
]);

const INSULATE: readonly DrywallMaximumScopeLineV5[] = Object.freeze([
  line("insulate_primary_layer", "Изоляция", "material", "Первый слой изоляции выбранного назначения и плотности", "m3", "material"),
  line("insulate_additional_layers", "Изоляция", "material", "Дополнительные слои изоляции", "m3", "material"),
  line("insulate_flexible_curved_mat", "Изоляция", "material", "Гибкий материал криволинейной полости", "m3", "material"),
  line("insulate_acoustic_membrane", "Мембраны", "material", "Акустическая мембрана по проектному расчету", "m2", "material"),
  line("insulate_vapour_membrane", "Мембраны", "material", "Пароограничивающая мембрана по расчету", "m2", "material"),
  line("insulate_support_mesh", "Фиксация изоляции", "material", "Поддерживающая сетка от сползания и провисания", "m2", "material"),
  line("insulate_disc_fasteners", "Фиксация изоляции", "material", "Тарельчатые фиксаторы, штифты или клипсы", "item", "material"),
  line("insulate_membrane_tape", "Мембраны", "material", "Системная лента стыков мембраны", "m", "material"),
  line("insulate_perimeter_sealant", "Герметизация", "material", "Акустический или системный герметик примыканий", "kg", "material"),
  line("insulate_penetration_cuffs", "Герметизация", "material", "Манжеты и sleeves инженерных проходок", "item", "material"),
  line("insulate_hidden_labels", "Маркировка", "material", "Маркировка скрытого изоляционного слоя", "item", "material"),
  line("insulate_cavity_dryness_test", "Контроль основания", "testing", "Проверка сухости и чистоты полости", "test", "test"),
  line("insulate_cell_cutting", "Монтаж изоляции", "labor", "Раскрой изоляции по фактическим ячейкам", "m2", "operation"),
  line("insulate_mep_fitting", "Монтаж изоляции", "labor", "Подгонка изоляции вокруг профилей и MEP", "item", "operation"),
  line("insulate_layer_installation", "Монтаж изоляции", "labor", "Послойная укладка без пустот и смятия", "m3", "operation"),
  line("insulate_mechanical_fixing", "Монтаж изоляции", "labor", "Механическая фиксация изоляции", "item", "operation"),
  line("insulate_mesh_installation", "Монтаж изоляции", "labor", "Монтаж поддерживающей сетки", "m2", "operation"),
  line("insulate_membrane_installation", "Монтаж мембраны", "labor", "Монтаж и герметизация мембраны", "m2", "operation"),
  line("insulate_penetration_sealing", "Герметизация", "labor", "Герметизация примыканий и проходок", "item", "operation"),
  line("insulate_cutting_tool", "Инструмент изоляции", "equipment", "Режущий инструмент изоляции", "machine_hour", "machine"),
  line("insulate_dust_extractor", "Инструмент изоляции", "equipment", "Пылеудаление волокнистых материалов", "machine_hour", "machine"),
  line("insulate_moisture_meter", "Контроль качества", "equipment", "Измеритель влажности полости", "machine_hour", "machine"),
  line("insulate_continuity_test", "Контроль качества", "testing", "Контроль непрерывности и толщины скрытого слоя", "test", "test"),
  line("insulate_membrane_integrity_test", "Контроль качества", "testing", "Контроль целостности и герметичности мембраны", "test", "test"),
  line("insulate_hidden_layer_act", "Исполнительная документация", "documentation", "Акт освидетельствования скрытого слоя изоляции", "document", "waste_hse_document"),
]);

const CLAD: readonly DrywallMaximumScopeLineV5[] = Object.freeze([
  line("clad_first_layer_board", "Обшивка", "material", "Плита первого слоя выбранного типа и толщины", "m2", "material"),
  line("clad_additional_layer_board", "Обшивка", "material", "Плита последующих слоев выбранного типа", "m2", "material"),
  line("clad_factory_curved_elements", "Обшивка", "material", "Заводские криволинейные элементы по проекту", "item", "material"),
  line("clad_first_layer_screws", "Крепеж обшивки", "material", "Винты первого слоя требуемой длины", "item", "material"),
  line("clad_additional_layer_screws", "Крепеж обшивки", "material", "Винты последующих слоев требуемой длины", "item", "material"),
  line("clad_system_adhesive", "Обшивка", "material", "Клей системного решения криволинейного элемента", "kg", "material"),
  line("clad_forming_water", "Формование", "material", "Вода или увлажняющий материал допустимого мокрого формования", "l", "material"),
  line("clad_separation_tape", "Примыкания", "material", "Разделительная лента примыканий", "m", "material"),
  line("clad_elastic_sealant", "Примыкания", "material", "Акустический или эластичный герметик", "kg", "material"),
  line("clad_opening_sleeves", "Отверстия", "material", "Sleeves и усиления технологических отверстий", "item", "material"),
  line("clad_arch_profile", "Примыкания", "material", "Арочный или угловой профиль обшивки", "m", "material"),
  line("clad_forming_straps", "Формование", "temporary_work", "Временные формовочные ремни и шаблоны", "item", "machine"),
  line("clad_surface_protection", "Защита обшивки", "material", "Защита принятой поверхности до finish stage", "m2", "material"),
  line("clad_frame_readiness_survey", "Контроль основания", "testing", "Проверка радиуса и готовности принятого каркаса", "test", "test"),
  line("clad_board_layout", "Раскладка", "subcontract_service", "Разработка раскладки листов со смещением стыков", "document", "service"),
  line("clad_template_fabrication", "Раскладка", "labor", "Изготовление шаблонов раскроя и формования", "item", "operation"),
  line("clad_board_cutting", "Обшивка", "labor", "Раскрой плит по карте раскладки", "m", "operation"),
  line("clad_board_forming", "Формование", "labor", "Сухое или мокрое формование по допустимой технологии", "m2", "operation"),
  line("clad_formed_element_conditioning", "Формование", "temporary_work", "Технологическая выдержка формованного элемента", "hour", "operation"),
  line("clad_first_layer_installation", "Обшивка", "labor", "Монтаж первого слоя плит", "m2", "operation"),
  line("clad_additional_layer_installation", "Обшивка", "labor", "Монтаж последующих слоев со смещением стыков", "m2", "operation"),
  line("clad_opening_cutouts", "Отверстия", "labor", "Вырезы отверстий, проходок и люков", "item", "operation"),
  line("clad_end_return_formation", "Обшивка", "labor", "Формирование торцов, возвратов и примыканий", "m", "operation"),
  line("clad_board_saw", "Инструмент обшивки", "equipment", "Пила или нож для плит с пылеудалением", "machine_hour", "machine"),
  line("clad_driver", "Инструмент обшивки", "equipment", "Шуруповерт с ограничителем глубины", "machine_hour", "machine"),
  line("clad_forming_tool", "Инструмент обшивки", "equipment", "Инструмент перфорации и формования плит", "machine_hour", "machine"),
  line("clad_fastener_depth_test", "Контроль качества", "testing", "Контроль шага и утопления крепежа по слоям", "test", "test"),
  line("clad_layer_stagger_test", "Контроль качества", "testing", "Контроль числа слоев и смещения стыков", "test", "test"),
  line("clad_handover_to_joint_owner", "Приемка", "documentation", "Передача принятой обшивки владельцу заделки швов", "document", "waste_hse_document"),
]);

const FINISH_JOINT: readonly DrywallMaximumScopeLineV5[] = Object.freeze([
  line("joint_edge_primer", "Швы", "material", "Грунтовка применимых обрезных кромок", "kg", "material"),
  line("joint_base_compound", "Швы", "material", "Базовая шпаклевка швов", "kg", "material"),
  line("joint_finish_compound", "Швы", "material", "Финишная шпаклевка швов", "kg", "material"),
  line("joint_paper_tape", "Швы", "material", "Бумажная или армирующая лента", "m", "material"),
  line("joint_flexible_tape", "Углы", "material", "Гибкая лента криволинейных сопряжений", "m", "material"),
  line("joint_external_corner_profile", "Углы", "material", "Наружный угловой или арочный профиль", "m", "material"),
  line("joint_internal_corner_reinforcement", "Углы", "material", "Армирование внутренних углов", "m", "material"),
  line("joint_separation_tape", "Примыкания", "material", "Разделительная лента примыканий", "m", "material"),
  line("joint_elastic_sealant", "Примыкания", "material", "Эластичный или акустический герметик", "kg", "material"),
  line("joint_screw_head_compound", "Крепеж", "material", "Состав для головок крепежа", "kg", "material"),
  line("joint_coarse_abrasive", "Шлифование", "material", "Абразив первого прохода", "item", "material"),
  line("joint_fine_abrasive", "Шлифование", "material", "Абразив финишного прохода", "item", "material"),
  line("joint_control_primer", "Контроль поверхности", "material", "Контрольная грунтовка готовой поверхности", "kg", "material"),
  line("joint_edge_fastener_moisture_check", "Контроль основания", "testing", "Проверка листов, кромок, крепежа и влажности", "test", "test"),
  line("joint_cut_edge_bevel", "Подготовка швов", "labor", "Подготовка фаски обрезных кромок", "m", "operation"),
  line("joint_edge_dedusting", "Подготовка швов", "labor", "Обеспыливание кромок и швов", "m", "operation"),
  line("joint_gap_prefill", "Швы", "labor", "Предварительное заполнение проектных зазоров", "m", "operation"),
  line("joint_base_layer_application", "Швы", "labor", "Нанесение базового слоя состава", "m", "operation"),
  line("joint_tape_embedding", "Швы", "labor", "Втапливание армирующей ленты", "m", "operation"),
  line("joint_second_layer_application", "Швы", "labor", "Нанесение второго выравнивающего слоя", "m", "operation"),
  line("joint_finish_layer_application", "Швы", "labor", "Нанесение финишного слоя швов", "m", "operation"),
  line("joint_screw_head_treatment", "Крепеж", "labor", "Послойная обработка головок крепежа", "item", "operation"),
  line("joint_internal_corner_treatment", "Углы", "labor", "Обработка внутренних углов", "m", "operation"),
  line("joint_external_arch_corner_treatment", "Углы", "labor", "Обработка наружных и арочных углов", "m", "operation"),
  line("joint_perimeter_sealing", "Примыкания", "labor", "Герметизация примыканий", "m", "operation"),
  line("joint_technological_drying", "Технологические паузы", "temporary_work", "Технологическая сушка между слоями", "hour", "operation"),
  line("joint_coarse_sanding", "Шлифование", "labor", "Шлифование первого прохода с пылеудалением", "m2", "operation"),
  line("joint_finish_sanding", "Шлифование", "labor", "Финишное шлифование с пылеудалением", "m2", "operation"),
  line("joint_mixer_tool", "Инструмент швов", "equipment", "Миксер приготовления составов", "machine_hour", "machine"),
  line("joint_sander_dust_extraction", "Инструмент швов", "equipment", "Шлифовальная машина с промышленным пылеудалением", "machine_hour", "machine"),
  line("joint_surface_quality_test", "Контроль качества", "testing", "Контроль плавности, плоскостности и уровня качества", "test", "test"),
  line("joint_quality_protocol", "Исполнительная документация", "documentation", "Протокол приемки швов и углов", "document", "waste_hse_document"),
]);

const REPAIR: readonly DrywallMaximumScopeLineV5[] = Object.freeze([
  line("repair_defect_survey", "Диагностика", "subcontract_service", "Обследование дефекта и построение defect map", "service", "service"),
  line("repair_cause_determination", "Диагностика", "subcontract_service", "Определение и подтверждение причины дефекта", "service", "service"),
  line("repair_moisture_survey", "Диагностика", "testing", "Измерение влажности и поиск источника увлажнения", "test", "test"),
  line("repair_frame_support_survey", "Диагностика", "testing", "Проверка состояния каркаса, анкеров и подвесов", "test", "test"),
  line("repair_mep_coordination", "Инженерные интерфейсы", "subcontract_service", "Координация ремонтного доступа с владельцами MEP", "service", "service"),
  line("repair_equipment_protection", "Защита", "material", "Защита действующего оборудования и отделки", "m2", "material"),
  line("repair_dust_enclosure", "Защита", "temporary_work", "Локальная герметичная пылезащитная зона", "m2", "waste_hse_document"),
  line("repair_temporary_support", "Временное усиление", "temporary_work", "Временная подпорка или усиление поврежденной системы", "service", "operation"),
  line("repair_demolition_boundary_marking", "Демонтаж", "labor", "Разметка точных границ вскрытия и демонтажа", "m", "operation"),
  line("repair_local_opening", "Демонтаж", "labor", "Контролируемое локальное вскрытие для диагностики", "m2", "operation"),
  line("repair_finish_removal", "Демонтаж", "labor", "Демонтаж отделочного слоя в подтвержденной owner-границе", "m2", "operation"),
  line("repair_board_layer_removal", "Демонтаж", "labor", "Послойная вырезка поврежденных плит", "m2", "operation"),
  line("repair_joint_corner_removal", "Демонтаж", "labor", "Демонтаж поврежденных лент и угловых элементов", "m", "operation"),
  line("repair_insulation_removal", "Демонтаж", "labor", "Извлечение загрязненной или поврежденной изоляции", "m3", "operation"),
  line("repair_fastener_removal", "Демонтаж", "labor", "Демонтаж поврежденного крепежа", "item", "operation"),
  line("repair_profile_removal", "Демонтаж", "labor", "Демонтаж поврежденных профилей", "m", "operation"),
  line("repair_profile_straightening", "Демонтаж", "labor", "Правка доказанно сохраняемых профилей", "m", "operation"),
  line("repair_reusable_sorting", "Демонтаж", "labor", "Отделение и учет возвратных материалов", "kg", "waste_hse_document"),
  line("repair_removed_board_waste", "Отходы", "waste", "Масса невозвратных демонтированных плит", "kg", "waste_hse_document"),
  line("repair_removed_metal_waste", "Отходы", "waste", "Масса невозвратного металлического профиля", "kg", "waste_hse_document"),
  line("repair_removed_insulation_waste", "Отходы", "waste", "Масса загрязненной изоляции", "kg", "waste_hse_document"),
  line("repair_new_profile", "Восстановление каркаса", "material", "Новый профиль точного типа", "m", "material"),
  line("repair_new_connectors", "Восстановление каркаса", "material", "Новые соединители ремонтного контура", "item", "material"),
  line("repair_new_anchors_hangers", "Восстановление каркаса", "material", "Новые анкеры и подвесы подтвержденного типа", "item", "material"),
  line("repair_contour_reinforcement", "Восстановление каркаса", "material", "Профиль усиления ремонтного контура", "m", "material"),
  line("repair_new_insulation", "Восстановление изоляции", "material", "Новая изоляция выбранного типа и плотности", "m3", "material"),
  line("repair_new_membrane", "Восстановление изоляции", "material", "Новая мембрана и лента герметизации", "m2", "material"),
  line("repair_first_board_layer", "Восстановление обшивки", "material", "Плита первого восстанавливаемого слоя", "m2", "material"),
  line("repair_additional_board_layers", "Восстановление обшивки", "material", "Плиты последующих восстанавливаемых слоев", "m2", "material"),
  line("repair_layer_fasteners", "Восстановление обшивки", "material", "Крепеж восстановленных слоев", "item", "material"),
  line("repair_joint_tape_profile", "Восстановление швов", "material", "Лента и угловой профиль ремонтных швов", "m", "material"),
  line("repair_base_compound", "Восстановление швов", "material", "Базовый ремонтный состав", "kg", "material"),
  line("repair_finish_compound", "Восстановление швов", "material", "Финишный ремонтный состав", "kg", "material"),
  line("repair_mep_sealant", "Восстановление примыканий", "material", "Герметик MEP-примыканий", "kg", "material"),
  line("repair_compatible_primer", "Восстановление отделки", "material", "Совместимая грунтовка ремонтной карты", "kg", "material"),
  line("repair_frame_reinstatement", "Восстановление каркаса", "labor", "Восстановление профилей, подвесов и ремонтного контура", "m", "operation"),
  line("repair_insulation_reinstatement", "Восстановление изоляции", "labor", "Восстановление изоляции и мембран", "m3", "operation"),
  line("repair_board_reinstatement", "Восстановление обшивки", "labor", "Послойное восстановление обшивки", "m2", "operation"),
  line("repair_joint_reinstatement", "Восстановление швов", "labor", "Восстановление швов, углов и примыканий", "m", "operation"),
  line("repair_finish_reinstatement", "Восстановление отделки", "labor", "Локальное восстановление finish только в подтвержденной owner-границе", "m2", "operation"),
  line("repair_demolition_saw", "Инструмент ремонта", "equipment", "Пила контролируемого вскрытия с пылеудалением", "machine_hour", "machine"),
  line("repair_dust_extractor", "Инструмент ремонта", "equipment", "Промышленное пылеудаление ремонта", "machine_hour", "machine"),
  line("repair_moisture_meter", "Инструмент ремонта", "equipment", "Измеритель влажности", "machine_hour", "machine"),
  line("repair_frame_tool", "Инструмент ремонта", "equipment", "Инструмент восстановления каркаса", "machine_hour", "machine"),
  line("repair_board_tool", "Инструмент ремонта", "equipment", "Инструмент раскроя и крепления плит", "machine_hour", "machine"),
  line("repair_mixer_sander", "Инструмент ремонта", "equipment", "Миксер и шлифовальная машина", "machine_hour", "machine"),
  line("repair_cause_elimination_test", "Контроль ремонта", "testing", "Подтверждение устранения причины дефекта", "test", "test"),
  line("repair_preclosure_moisture_test", "Контроль ремонта", "testing", "Контроль влажности перед закрытием", "test", "test"),
  line("repair_anchor_support_test", "Контроль ремонта", "testing", "Контроль анкеров, подвесов и временных усилений", "test", "test"),
  line("repair_geometry_radius_test", "Контроль ремонта", "testing", "Контроль геометрии, радиуса и плоскостности", "test", "test"),
  line("repair_hidden_layer_test", "Контроль ремонта", "testing", "Контроль восстановленных скрытых слоев", "test", "test"),
  line("repair_before_during_after_photo", "Исполнительная документация", "documentation", "Фотофиксация до, во время и после ремонта", "document", "waste_hse_document"),
  line("repair_hidden_work_act", "Исполнительная документация", "documentation", "Акт скрытых ремонтных работ", "document", "waste_hse_document"),
  line("repair_replaced_reused_schedule", "Исполнительная документация", "documentation", "Ведомость замененных и сохраненных материалов", "document", "waste_hse_document"),
  line("repair_as_built_record", "Исполнительная документация", "documentation", "Исполнительная запись ремонтного контура", "document", "waste_hse_document"),
  line("repair_final_acceptance", "Приемка", "testing", "Итоговая приемка устраненного дефекта", "test", "test"),
]);

const VARIANT: Readonly<Record<DrywallArchitecturalElementVariantV4, readonly DrywallMaximumScopeLineV5[]>> = Object.freeze({
  standard: [],
  large_area: [
    line("variant_large_control_zones", "Вариант большой площади", "testing", "Дополнительные контрольные зоны и реперы", "test", "test"),
    line("variant_large_deformation_joint_decision", "Вариант большой площади", "subcontract_service", "Проектная проверка деформационных и контрольных швов", "service", "service"),
    line("variant_large_internal_logistics", "Вариант большой площади", "transport", "Внутренняя логистика между захватками", "t_m", "logistics"),
    line("variant_large_batch_storage", "Вариант большой площади", "temporary_work", "Раздельное хранение партий по захваткам", "service", "logistics"),
  ],
  small_area: [
    line("variant_small_manual_delivery", "Вариант малой площади", "labor", "Ручная подача материалов в стесненной зоне", "t", "logistics"),
    line("variant_small_confined_cutting", "Вариант малой площади", "labor", "Локальный раскрой в стесненной зоне", "service", "operation"),
    line("variant_small_dust_enclosure", "Вариант малой площади", "temporary_work", "Компактная пылезащитная зона", "service", "waste_hse_document"),
  ],
  technical_room: [
    line("variant_technical_loto_permit", "Техническое помещение", "documentation", "Permit/LOTO решение владельца оборудования", "document", "waste_hse_document"),
    line("variant_technical_equipment_protection", "Техническое помещение", "material", "Защита действующего оборудования", "m2", "material"),
    line("variant_technical_utility_detection", "Техническое помещение", "equipment", "Поиск скрытых коммуникаций", "machine_hour", "machine"),
    line("variant_technical_fire_acoustic_sealing", "Техническое помещение", "material", "Противопожарная или акустическая герметизация проходок по проекту", "kg", "material"),
    line("variant_technical_as_built_mep", "Техническое помещение", "documentation", "Исполнительная схема MEP-интерфейсов", "document", "waste_hse_document"),
  ],
  wet_zone: [
    line("variant_wet_compatible_material_check", "Влажная зона", "testing", "Проверка совместимости материалов влажной зоны", "test", "test"),
    line("variant_wet_corrosion_protection", "Влажная зона", "material", "Коррозионностойкие расходники и защита мест обработки", "kg", "material"),
    line("variant_wet_moisture_meter", "Влажная зона", "equipment", "Контроль влажности основания и полости", "machine_hour", "machine"),
    line("variant_wet_penetration_sealing", "Влажная зона", "material", "Герметизация кромок и проходок влажной зоны", "kg", "material"),
    line("variant_wet_moisture_protocol", "Влажная зона", "documentation", "Протокол влажности и условий закрытия", "document", "waste_hse_document"),
  ],
});

const OPERATION: Readonly<Record<DrywallArchitecturalElementOperationV4, readonly DrywallMaximumScopeLineV5[]>> = Object.freeze({
  PREPARE, FRAME, ALIGN, INSULATE, CLAD, FINISH_JOINT, REPAIR,
});

export function drywallMaximumScopeLinesV5(operation: DrywallArchitecturalElementOperationV4, variant: DrywallArchitecturalElementVariantV4): readonly DrywallMaximumScopeLineV5[] {
  return [...COMMON, ...OPERATION[operation], ...VARIANT[variant]];
}

export const DRYWALL_AGGREGATE_SKELETON_ROW_KEYS_V4: Readonly<Record<DrywallArchitecturalElementOperationV4, readonly string[]>> = Object.freeze({
  FRAME: ["profiles", "frame_fasteners", "frame_labor", "frame_tools"],
  ALIGN: ["alignment_labor", "alignment_tools"],
  CLAD: ["boards", "board_screws", "cladding_labor", "cladding_tools"],
  FINISH_JOINT: ["joint_filler", "joint_labor", "joint_mixer"],
  INSULATE: ["insulation", "insulation_labor", "insulation_tools"],
  PREPARE: ["preparation_labor", "preparation_tools"],
  REPAIR: ["replacement_board", "patch_profiles", "repair_fasteners", "repair_filler", "repair_labor", "repair_tools"],
});

type CandidateDecisionV5 = {
  candidate_id: string;
  label_ru: string;
  decision: "INCLUDED" | "PROJECT_INPUT" | "OWNED_BY_EXACT_TYPED_CHILD" | "N_A_WITH_REASON";
  reason: string;
  row_id: string | null;
};

function typedChildExclusions(operation: DrywallArchitecturalElementOperationV4): CandidateDecisionV5[] {
  const candidates = [
    ["frame-system", "Профили, подвесы и анкеры", "FRAME"],
    ["insulation-system", "Изоляция и мембраны", "INSULATE"],
    ["cladding-system", "Плиты и послойный крепеж", "CLAD"],
    ["joint-system", "Шпаклевки, ленты и углы", "FINISH_JOINT"],
    ["surface-finish", "Сплошное финишное покрытие и окраска", "DOWNSTREAM_FINISH"],
  ] as const;
  return candidates.filter(([, , owner]) => owner !== operation).map(([id, label, owner]) => ({
    candidate_id: `typed-child:${id}`,
    label_ru: label,
    decision: "OWNED_BY_EXACT_TYPED_CHILD" as const,
    reason: `Стоимость принадлежит exact typed child ${owner}; повторное включение запрещено.`,
    row_id: null,
  }));
}

export type DrywallIndividualProfessionalEstimatePassportV5 = {
  schemaVersion: "DrywallIndividualProfessionalEstimatePassportV5";
  catalogId: string;
  displayNameRu: string;
  groupId: string;
  systemType: string;
  operationType: string;
  variantType: string;
  workResult: string;
  inScope: readonly string[];
  outOfScope: readonly string[];
  upstreamOwners: readonly string[];
  downstreamOwners: readonly string[];
  typedChildOwners: readonly string[];
  parameterSchema: { schemaId: string; parameterIds: readonly string[]; parameterSchemaHash: string };
  geometryFormulaGraph: readonly { rowId: string; formulaId: string; expression: string; inputs: readonly string[] }[];
  materialCandidateDecisions: readonly CandidateDecisionV5[];
  operationCandidateDecisions: readonly CandidateDecisionV5[];
  machineCandidateDecisions: readonly CandidateDecisionV5[];
  serviceCandidateDecisions: readonly CandidateDecisionV5[];
  testCandidateDecisions: readonly CandidateDecisionV5[];
  logisticsCandidateDecisions: readonly CandidateDecisionV5[];
  wasteHseDocumentCandidateDecisions: readonly CandidateDecisionV5[];
  boqSemanticSetHash: string;
  resourceGraphHash: string;
  formulaGraphHash: string;
  normativeProofHash: string;
  candidateDecisionCoverage: 100;
  silentOmission: 0;
  unresolvedNA: 0;
  unexplainedBoqAlias: 0;
};

export function buildDrywallIndividualProfessionalEstimatePassportV5(parts: DrywallArchitecturalElementProfessionalPackagePartsV4): DrywallIndividualProfessionalEstimatePassportV5 {
  const rows = parts.child_assemblies.flatMap((child) => child.rows);
  const rowByKey = new Map(rows.map((row) => [row.row_id.split(":row:")[1], row]));
  const decisions = drywallMaximumScopeLinesV5(parts.contract.operation, parts.contract.variant).map((candidate): CandidateDecisionV5 => {
    const row = rowByKey.get(candidate.key);
    return {
      candidate_id: candidate.key,
      label_ru: candidate.title_ru,
      decision: row ? "INCLUDED" : "PROJECT_INPUT",
      reason: row ? "Отдельная semantic row присутствует в канонической смете." : "Кандидат остается явным project decision; скрытое включение запрещено.",
      row_id: row?.row_id ?? null,
    };
  });
  const byFamily = (family: DrywallMaximumScopeLineV5["candidate_family"]) => decisions.filter((decision) =>
    drywallMaximumScopeLinesV5(parts.contract.operation, parts.contract.variant)
      .find((candidate) => candidate.key === decision.candidate_id)?.candidate_family === family);
  const exclusions = typedChildExclusions(parts.contract.operation);
  const parameterIds = parts.schema.parameters.map((parameter) => parameter.parameter_id);
  const geometry = rows.filter((row) => row.category === "work" && row.cost_ownership === "informational_output").map((row) => ({ rowId: row.row_id, formulaId: row.formula.formula_id, expression: row.formula.expression, inputs: row.formula.input_parameter_ids }));
  return {
    schemaVersion: "DrywallIndividualProfessionalEstimatePassportV5",
    catalogId: parts.contract.catalog_id,
    displayNameRu: parts.contract.title_ru,
    groupId: parts.contract.group_key,
    systemType: parts.contract.system,
    operationType: parts.contract.operation,
    variantType: parts.contract.variant,
    workResult: `Принятая самостоятельная стадия ${parts.contract.operation} системы ${parts.contract.system}`,
    inScope: parts.contract.owned_cost_scope,
    outOfScope: parts.contract.forbidden_cost_scope,
    upstreamOwners: parts.contract.non_cost_dependencies,
    downstreamOwners: parts.contract.operation === "FRAME" ? ["CLAD", "INSULATE"] : parts.contract.operation === "CLAD" ? ["FINISH_JOINT"] : parts.contract.operation === "FINISH_JOINT" ? ["DOWNSTREAM_FINISH"] : [],
    typedChildOwners: exclusions.map((candidate) => candidate.candidate_id),
    parameterSchema: { schemaId: parts.schema.schema_id, parameterIds, parameterSchemaHash: estimateDeterministicHash(parameterIds) },
    geometryFormulaGraph: geometry,
    materialCandidateDecisions: [...byFamily("material"), ...exclusions],
    operationCandidateDecisions: byFamily("operation"),
    machineCandidateDecisions: byFamily("machine"),
    serviceCandidateDecisions: byFamily("service"),
    testCandidateDecisions: byFamily("test"),
    logisticsCandidateDecisions: byFamily("logistics"),
    wasteHseDocumentCandidateDecisions: byFamily("waste_hse_document"),
    boqSemanticSetHash: estimateDeterministicHash(rows.map((row) => row.row_id).sort()),
    resourceGraphHash: estimateDeterministicHash(rows.map((row) => row.resource_graph_node_v3).filter(Boolean)),
    formulaGraphHash: estimateDeterministicHash(rows.map((row) => row.formula)),
    normativeProofHash: estimateDeterministicHash(rows.map((row) => row.normative_trace_v3)),
    candidateDecisionCoverage: 100,
    silentOmission: 0,
    unresolvedNA: 0,
    unexplainedBoqAlias: 0,
  };
}
