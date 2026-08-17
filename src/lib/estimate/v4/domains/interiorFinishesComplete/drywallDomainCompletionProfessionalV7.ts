import type {
  ProfessionalAssemblyFormulaV4,
  ProfessionalAssemblyParameterDefinitionV4,
  ProfessionalAssemblyParameterRoleV4,
  ProfessionalAssemblyRowDefinitionV4,
  ProfessionalChildAssemblyV4,
  ProfessionalEstimateScopeModeV4,
  ProfessionalNormativeRowTraceV3,
} from "../../professionalProjectAssemblyV4";
import type {
  ProfessionalDomainParameterDefinitionV1,
  ProfessionalDomainParameterSchemaV1,
  ProfessionalNormativeProfileV1,
  ProfessionalResourceCompletenessPolicyV1,
} from "../../domainFactory";
import { estimateDeterministicHash } from "../../../estimateDeterministicHash";
import { DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3 } from "./drywallCeilingBulkheadProfessionalV3";
import { DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4 } from "./drywallArchitecturalElementsProfessionalV4";
import { DRYWALL_FLAT_CEILING_PROFESSIONAL_CATALOG_IDS_V6 } from "./drywallFlatCeilingExpectedScopeV6";
import { INTERIOR_FINISHES_DOMAIN_INVENTORY, type InteriorFinishesDomainInventoryRow } from "./inventory";

export type DrywallDomainCompletionOperationV7 =
  | "PREPARE" | "FRAME" | "ALIGN" | "INSULATE" | "CLAD" | "FINISH_JOINT" | "REPAIR" | "INSTALL";
export type DrywallDomainCompletionFamilyV7 =
  | "bulkhead" | "curve" | "drywall_ceiling" | "drywall_partition" | "fire_partition" | "joint"
  | "moisture_partition" | "niche" | "revision_hatch" | "shaft" | "sound_partition" | "wall_cladding";
export type DrywallDomainCompletionVariantV7 = "standard" | "large_area" | "small_area" | "technical_room" | "wet_zone" | "high_load";

const priorOwners = new Set<string>([
  ...DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3,
  ...DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4,
  ...DRYWALL_FLAT_CEILING_PROFESSIONAL_CATALOG_IDS_V6,
]);

export const DRYWALL_DOMAIN_COMPLETION_CATALOG_IDS_V7: readonly string[] = Object.freeze(
  INTERIOR_FINISHES_DOMAIN_INVENTORY
    .filter((row) => row.source_domain_id === "drywall_ceiling" && !priorOwners.has(row.catalog_id))
    .map((row) => row.catalog_id),
);
const AUTHORIZED = new Set(DRYWALL_DOMAIN_COMPLETION_CATALOG_IDS_V7);
if (DRYWALL_DOMAIN_COMPLETION_CATALOG_IDS_V7.length !== 393 || new Set(DRYWALL_DOMAIN_COMPLETION_CATALOG_IDS_V7).size !== 393) {
  throw new Error(`DRYWALL_DOMAIN_COMPLETION_DENOMINATOR_RED:${DRYWALL_DOMAIN_COMPLETION_CATALOG_IDS_V7.length}`);
}

const BOTH_SCOPES = ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"] as const;
const FULL_SCOPE = ["FULL_APPLICABLE_SCOPE"] as const;
const ALWAYS = { kind: "ALWAYS" } as const;
const FULL_ONLY = { kind: "EQUALS", parameter_id: "estimate_scope_mode", value: "FULL_APPLICABLE_SCOPE" } as const;
const KG_SP = "KG_SP_KR_65_101_2025";
const KG_KRER = "KG_KRER_10_05_011";
const KG_KRERR = "kg_krerr_2015_application_guidance";
const KG_SAFETY = "KG_SN_KR_12_01_2018";
const KG_MATERIAL = "KG_DRYWALL_MATERIAL_CONFORMITY_ROUTE";

type Category = ProfessionalAssemblyRowDefinitionV4["category"];
export type DrywallDomainExpectedCandidateV7 = {
  candidateId: string;
  titleRu: string;
  completenessSlot: number;
  category: Category;
  unitId: string;
  scope: "BOTH" | "FULL";
  sourceLocator: string;
};
type CandidateTuple = readonly [string, string, number, Category, string];

const locator = (slot: number): string => slot === 20
  ? "СН КР 12-01:2018 §§6.1.6, 6.2.2"
  : slot >= 17
    ? "СП КР 65-101:2025 §§4.4–4.9, 7.7.1–7.7.5, табл.7.8"
    : "КРЕР 10, табл.10-05-011 + открытый проектный ресурсный расчет";
const candidates = (rows: readonly CandidateTuple[], scope: "BOTH" | "FULL" = "BOTH"): DrywallDomainExpectedCandidateV7[] => rows.map((row) => ({
  candidateId: row[0], titleRu: row[1], completenessSlot: row[2], category: row[3], unitId: row[4], scope, sourceLocator: locator(row[2]),
}));

const COMMON = candidates([
  ["delivery_to_site", "Доставка материалов на объект", 12, "transport", "t_km"], ["supplier_loading", "Погрузка у поставщика", 13, "labor", "man_hour"],
  ["site_unloading", "Разгрузка на объекте", 14, "labor", "man_hour"], ["horizontal_movement", "Горизонтальное перемещение", 15, "labor", "man_hour"],
  ["vertical_lift", "Вертикальный подъем к рабочему горизонту", 15, "equipment", "machine_hour"], ["protected_storage", "Защищенное хранение комплектной системы", 16, "temporary_work", "service"],
  ["access_delivery", "Доставка средств подмащивания", 12, "transport", "trip"], ["access_assembly", "Монтаж и приемка подмащивания", 16, "temporary_work", "service"],
  ["access_operation", "Эксплуатация и перестановка подмащивания", 11, "equipment", "machine_hour"], ["access_dismantle", "Демонтаж и возврат подмащивания", 16, "temporary_work", "service"],
  ["incoming_material_control", "Входной контроль материалов", 17, "testing", "test"], ["independent_quality_measurement", "Инструментальный контроль самостоятельной стадии", 17, "testing", "test"],
  ["system_engineering_review", "Инженерная проверка системы и рабочей раскладки", 18, "subcontract_service", "service"], ["mep_interface_coordination", "Координация проемов и инженерных интерфейсов", 18, "subcontract_service", "service"],
  ["waste_collection", "Сбор отходов по месту образования", 19, "labor", "man_hour"], ["waste_sorting", "Сортировка отходов и возвратных ресурсов", 19, "labor", "man_hour"],
  ["waste_loading", "Погрузка отходов", 19, "labor", "man_hour"], ["waste_haul", "Вывоз отходов", 19, "transport", "t_km"], ["waste_receiver", "Прием отходов подтвержденным получателем", 19, "waste", "t"],
  ["ppe_consumables", "СИЗ дыхания, глаз, рук и слуха", 20, "material", "person_shift"], ["barriers_and_signs", "Ограждения и предупреждающие знаки", 20, "material", "set"],
  ["dust_extraction_control", "Локальное пылеудаление и контроль чистоты", 20, "equipment", "machine_hour"], ["task_safety_briefing", "Целевой инструктаж и допуск", 20, "labor", "person"],
  ["material_certificate_register", "Реестр сертификатов и паспортов", 21, "documentation", "document"], ["work_journal_record", "Запись в журнале работ", 21, "documentation", "document"],
  ["hidden_stage_photo_record", "Фотофиксация скрытой стадии", 21, "documentation", "document"], ["executive_measurement_scheme", "Исполнительная схема и карта замеров", 21, "documentation", "document"],
  ["hidden_or_stage_act", "Акт скрытых или самостоятельных работ", 22, "documentation", "document"], ["final_handover", "Итоговая приемка и передача владельцу следующей стадии", 22, "testing", "test"],
] as const, "FULL");

const OPERATION: Readonly<Record<DrywallDomainCompletionOperationV7, readonly DrywallDomainExpectedCandidateV7[]>> = {
  PREPARE: candidates([
    ["prepare_substrate_primer", "Совместимая грунтовка основания", 1, "material", "kg"], ["prepare_repair_compound", "Состав локального ремонта основания", 2, "material", "kg"],
    ["prepare_masking_tape", "Лента герметизации защитных укрытий", 3, "material", "m"], ["prepare_control_markers", "Реперы и контрольные метки", 4, "material", "item"],
    ["prepare_condition_survey_labor", "Обследование и дефектная ведомость", 5, "labor", "man_hour"], ["prepare_room_protection", "Устройство защиты помещения", 6, "labor", "man_hour"],
    ["prepare_surface_cleaning", "Очистка и обеспыливание основания", 7, "labor", "m2"], ["prepare_local_repair", "Локальное восстановление допустимых дефектов", 7, "labor", "m2"],
    ["prepare_priming", "Нанесение грунтовки", 7, "labor", "m2"], ["prepare_final_dust_control", "Финишное обеспыливание", 8, "labor", "m2"],
    ["prepare_vacuum", "Промышленный пылесос", 9, "equipment", "machine_hour"], ["prepare_hand_tools", "Инструмент очистки и локального ремонта", 10, "equipment", "machine_hour"],
    ["prepare_laser", "Лазерный построитель осей и отметок", 11, "equipment", "machine_hour"], ["prepare_moisture_meter", "Измеритель влажности основания", 11, "equipment", "machine_hour"],
  ] as const),
  FRAME: candidates([
    ["frame_primary_track", "Направляющий профиль проектного типа", 1, "material", "m"], ["frame_stud_or_ceiling_profile", "Стоечный/потолочный профиль проектного типа", 1, "material", "m"],
    ["frame_connectors", "Соединители и удлинители профилей", 2, "material", "item"], ["frame_anchors", "Анкеры по типу основания", 3, "material", "item"],
    ["frame_metal_screws", "Винты металл-металл", 3, "material", "item"], ["frame_supports_hangers", "Подвесы, консоли или опоры", 4, "material", "item"],
    ["frame_installer_labor", "Труд монтажника каркаса", 5, "labor", "man_hour"], ["frame_axis_layout", "Разметка осей и узлов крепления", 6, "labor", "point"],
    ["frame_anchor_drilling", "Сверление отверстий с пылеудалением", 7, "labor", "hole"], ["frame_profile_cutting", "Раскрой профилей", 7, "labor", "m"],
    ["frame_track_installation", "Монтаж направляющих", 7, "labor", "m"], ["frame_vertical_installation", "Монтаж стоек/несущих профилей", 7, "labor", "item"],
    ["frame_cross_member_installation", "Монтаж перемычек и соединителей", 7, "labor", "item"], ["frame_corrosion_treatment", "Антикоррозионная обработка мест реза", 8, "labor", "point"],
    ["frame_drilling_machine", "Перфоратор или установка сверления", 9, "equipment", "machine_hour"], ["frame_cutting_tool", "Инструмент раскроя профиля", 10, "equipment", "machine_hour"],
    ["frame_driver", "Шуруповерт", 10, "equipment", "machine_hour"], ["frame_laser", "Лазерный нивелир", 11, "equipment", "machine_hour"],
  ] as const),
  ALIGN: candidates([
    ["align_corrective_connectors", "Корректирующие соединители", 1, "material", "item"], ["align_shims", "Системные регулировочные прокладки", 2, "material", "item"],
    ["align_fasteners", "Крепеж корректирующих элементов", 3, "material", "item"], ["align_local_reinforcement", "Локальные усиления каркаса", 4, "material", "m"],
    ["align_specialist_labor", "Труд специалиста по геометрии", 5, "labor", "man_hour"], ["align_reference_grid", "Разбивка контрольной сетки", 6, "labor", "m2"],
    ["align_node_release", "Контролируемое ослабление корректируемых узлов", 7, "labor", "connection"], ["align_adjustment", "Регулировка и перефиксация каркаса", 7, "labor", "connection"],
    ["align_torque_finish", "Окончательная фиксация соединений", 8, "labor", "connection"], ["align_laser", "Лазерный построитель плоскостей", 9, "equipment", "machine_hour"],
    ["align_hand_gauge", "Контрольная рейка и измерительный инструмент", 10, "equipment", "machine_hour"], ["align_total_station", "Прибор инструментальной съемки", 11, "equipment", "machine_hour"],
  ] as const),
  INSULATE: candidates([
    ["insulate_primary_layer", "Изоляция проектного типа, плотности и толщины", 1, "material", "m3"], ["insulate_membrane", "Акустическая/пароограничивающая мембрана", 2, "material", "m2"],
    ["insulate_disc_fasteners", "Системные фиксаторы изоляции", 3, "material", "item"], ["insulate_support_mesh", "Поддерживающая сетка или штифты", 4, "material", "m2"],
    ["insulate_installer_labor", "Труд монтажника изоляции", 5, "labor", "man_hour"], ["insulate_cavity_preparation", "Очистка и контроль полости", 6, "labor", "m2"],
    ["insulate_cutting", "Точный раскрой изоляции", 7, "labor", "m2"], ["insulate_layer_installation", "Послойная установка без щелей", 7, "labor", "m2"],
    ["insulate_perimeter_sealing", "Герметизация периметра и проходок", 8, "labor", "m"], ["insulate_cutting_machine", "Механизированный инструмент раскроя", 9, "equipment", "machine_hour"],
    ["insulate_hand_knife", "Специализированный ручной инструмент", 10, "equipment", "machine_hour"], ["insulate_density_gauge", "Контрольный измерительный комплект", 11, "equipment", "machine_hour"],
  ] as const),
  CLAD: candidates([
    ["clad_first_board_layer", "Плиты первого проектного слоя", 1, "material", "m2"], ["clad_additional_board_layers", "Плиты дополнительных слоев", 1, "material", "m2"],
    ["clad_separation_tape", "Разделительная лента примыканий", 2, "material", "m"], ["clad_layer_screws", "Винты каждого проектного слоя", 3, "material", "item"],
    ["clad_opening_reinforcement", "Обрамление проемов и закладные", 4, "material", "m"], ["clad_installer_labor", "Труд монтажника листовой обшивки", 5, "labor", "man_hour"],
    ["clad_layout", "Раскладка листов и смещение стыков", 6, "labor", "m2"], ["clad_board_cutting", "Раскрой каждого типа плит", 7, "labor", "m2"],
    ["clad_layer_fixing", "Монтаж и крепление каждого слоя", 7, "labor", "m2"], ["clad_edge_processing", "Обработка кромок и отверстий", 8, "labor", "m"],
    ["clad_board_lifter", "Подъемник листов", 9, "equipment", "machine_hour"], ["clad_cutting_tool", "Инструмент раскроя листов", 10, "equipment", "machine_hour"],
    ["clad_depth_driver", "Шуруповерт с контролем глубины", 10, "equipment", "machine_hour"], ["clad_fixing_gauge", "Шаблон шага и глубины крепежа", 11, "equipment", "machine_hour"],
  ] as const),
  FINISH_JOINT: candidates([
    ["finish_joint_filler", "Системная шпаклевка швов", 1, "material", "kg"], ["finish_reinforcement_tape", "Армирующая лента стыков", 2, "material", "m"],
    ["finish_corner_fasteners", "Крепеж угловых и примыкающих профилей", 3, "material", "item"], ["finish_corner_bead", "Угловой или примыкающий профиль", 4, "material", "m"],
    ["finish_specialist_labor", "Труд отделочника сухих систем", 5, "labor", "man_hour"], ["finish_joint_preparation", "Подготовка кромок и обеспыливание", 6, "labor", "m"],
    ["finish_tape_bedding", "Укладка ленты в базовый слой", 7, "labor", "m"], ["finish_successive_coats", "Нанесение последовательных слоев Q1–Q4", 7, "labor", "m2"],
    ["finish_sanding_priming", "Шлифование, обеспыливание и грунтование", 8, "labor", "m2"], ["finish_mixer", "Миксер для шпаклевочного состава", 9, "equipment", "machine_hour"],
    ["finish_hand_tools", "Шпатели и системный инструмент", 10, "equipment", "machine_hour"], ["finish_sander_vacuum", "Шлифовальная машина с пылеудалением", 11, "equipment", "machine_hour"],
  ] as const),
  REPAIR: candidates([
    ["repair_replacement_board", "Плиты замены по дефектной ведомости", 1, "material", "m2"], ["repair_joint_and_patch_compounds", "Ремонтные и шовные составы", 2, "material", "kg"],
    ["repair_fasteners", "Крепеж ремонтных карт", 3, "material", "item"], ["repair_reinforcement_profile", "Профиль усиления ремонтной карты", 4, "material", "m"],
    ["repair_diagnostic_labor", "Диагностика причины дефекта", 5, "labor", "man_hour"], ["repair_protection_and_isolation", "Защита зоны и отключение интерфейсов", 6, "labor", "man_hour"],
    ["repair_opening_up", "Контролируемое вскрытие конструкции", 7, "labor", "m2"], ["repair_selective_demolition", "Раздельный демонтаж поврежденных слоев", 7, "labor", "m2"],
    ["repair_frame_restoration", "Восстановление каркаса и закладных", 7, "labor", "m"], ["repair_insulation_restoration", "Восстановление изоляции и мембран", 7, "labor", "m2"],
    ["repair_cladding_restoration", "Восстановление послойной обшивки", 7, "labor", "m2"], ["repair_joint_restoration", "Восстановление швов и углов", 8, "labor", "m"],
    ["repair_surface_blending", "Сведение ремонтной карты с существующей поверхностью", 8, "labor", "m2"], ["repair_multitool", "Осциллирующий инструмент вскрытия", 9, "equipment", "machine_hour"],
    ["repair_cutting_hand_tools", "Ручной инструмент селективного демонтажа", 10, "equipment", "machine_hour"], ["repair_diagnostic_instruments", "Измерительный комплект диагностики", 11, "equipment", "machine_hour"],
  ] as const),
  INSTALL: candidates([
    ["install_tracks", "Направляющие профили комплектной системы", 1, "material", "m"], ["install_studs_profiles", "Стоечные/несущие профили", 1, "material", "m"],
    ["install_boards_each_type", "Плиты каждого проектного типа и слоя", 1, "material", "m2"], ["install_insulation", "Изоляция проектного типа", 1, "material", "m3"],
    ["install_joint_materials", "Шпаклевка и армирующая лента", 2, "material", "kg"], ["install_sealants_membranes", "Герметики, ленты и мембраны", 2, "material", "m2"],
    ["install_anchors", "Анкеры к основаниям", 3, "material", "item"], ["install_screws_each_layer", "Винты каждого слоя и соединения", 3, "material", "item"],
    ["install_hangers_backing", "Подвесы, закладные и усиления", 4, "material", "item"], ["install_multiskill_labor", "Труд бригады комплектной системы", 5, "labor", "man_hour"],
    ["install_survey_and_layout", "Обследование и полная разбивка", 6, "labor", "m2"], ["install_frame_stage", "Сборка и выверка каркаса", 7, "labor", "m2"],
    ["install_insulation_stage", "Монтаж изоляции и мембран", 7, "labor", "m2"], ["install_cladding_stage", "Послойная обшивка", 7, "labor", "m2"],
    ["install_joint_stage", "Заделка швов и подготовка поверхности", 8, "labor", "m2"], ["install_drilling_cutting_machines", "Комплект механизированного сверления и раскроя", 9, "equipment", "machine_hour"],
    ["install_hand_tool_set", "Комплект ручного монтажного инструмента", 10, "equipment", "machine_hour"], ["install_laser_lifter_vacuum", "Лазер, подъемник листов и пылеудаление", 11, "equipment", "machine_hour"],
  ] as const),
};

const SYSTEM: Readonly<Record<DrywallDomainCompletionFamilyV7, readonly DrywallDomainExpectedCandidateV7[]>> = {
  bulkhead: candidates([["bulkhead_flexible_track", "Гибкий/сегментируемый профиль короба", 1, "material", "m"], ["bulkhead_return_profiles", "Профили торцов и возвратов", 4, "material", "m"], ["bulkhead_geometry_template", "Шаблон сечения короба", 10, "temporary_work", "item"], ["bulkhead_geometry_test", "Контроль сечения и отметки короба", 17, "testing", "test"]] as const),
  curve: candidates([["curve_flexible_profile", "Гибкий профиль проектного радиуса", 1, "material", "m"], ["curve_forming_template", "Формовочный шаблон проектного радиуса", 4, "temporary_work", "item"], ["curve_radius_forming", "Формирование элементов по радиусу", 7, "labor", "m"], ["curve_radius_survey", "Инструментальная съемка радиуса и плавности", 17, "testing", "test"]] as const),
  drywall_ceiling: candidates([["ceiling_primary_secondary_profiles", "Профили первого и второго уровня потолка", 1, "material", "m"], ["ceiling_adjustable_hangers", "Регулируемые потолочные подвесы и тяги", 4, "material", "item"], ["ceiling_board_lift", "Подъемник листов к потолку", 11, "equipment", "machine_hour"], ["ceiling_plane_survey", "Съемка отметки и плоскости потолка", 17, "testing", "test"]] as const),
  drywall_partition: candidates([["partition_floor_ceiling_tracks", "Направляющие пола и потолка", 1, "material", "m"], ["partition_studs", "Стоечные профили перегородки", 1, "material", "m"], ["partition_jamb_reinforcement", "Усиление дверных и инженерных проемов", 4, "material", "m"], ["partition_acoustic_perimeter_seal", "Акустическая герметизация периметра", 8, "material", "m"]] as const),
  fire_partition: candidates([["fire_rated_boards", "Огнестойкие плиты каждого слоя", 1, "material", "m2"], ["fire_rated_insulation", "Негорючая изоляция расчетной плотности", 2, "material", "m3"], ["fire_rated_sealant", "Огнестойкий системный герметик примыканий", 8, "material", "kg"], ["fire_system_configuration_check", "Проверка комплектности огнестойкой системы", 17, "testing", "test"], ["fire_rating_evidence_package", "Пакет доказательств требуемого предела огнестойкости", 22, "documentation", "document"]] as const),
  joint: candidates([["joint_edge_condition_material", "Материал подготовки разных типов кромок", 2, "material", "kg"], ["joint_reinforcement_tape_type", "Лента по типу конкретного стыка", 1, "material", "m"], ["joint_control_sample", "Контрольный образец качества Q1–Q4", 4, "temporary_work", "item"], ["joint_light_raking_test", "Контроль поверхности боковым светом", 17, "testing", "test"]] as const),
  moisture_partition: candidates([["moisture_resistant_boards", "Влагостойкие плиты проектного типа", 1, "material", "m2"], ["waterproof_membrane", "Влагозащитная мембрана мокрой зоны", 2, "material", "m2"], ["wet_zone_sealing_tape", "Системная лента углов и примыканий", 8, "material", "m"], ["moisture_continuity_test", "Контроль непрерывности влагозащиты", 17, "testing", "test"]] as const),
  niche: candidates([["niche_return_boards", "Плиты откосов и возвратов ниши", 1, "material", "m2"], ["niche_corner_beads", "Угловые профили граней ниши", 2, "material", "m"], ["niche_backing", "Закладные для оборудования ниши", 4, "material", "m"], ["niche_dimension_test", "Контроль внутренних размеров и диагоналей", 17, "testing", "test"]] as const),
  revision_hatch: candidates([["hatch_product", "Ревизионный люк точного типа и размера", 1, "material", "item"], ["hatch_reinforcement_frame", "Рама усиления проема люка", 4, "material", "m"], ["hatch_dedicated_fasteners", "Крепеж люка по паспорту", 3, "material", "item"], ["hatch_function_test", "Проверка открывания, зазоров и доступа", 17, "testing", "test"]] as const),
  shaft: candidates([["shaft_liner_boards", "Шахтные плиты одностороннего монтажа", 1, "material", "m2"], ["shaft_ch_studs_tracks", "C-H/J-профили шахтной системы", 4, "material", "m"], ["shaft_perimeter_seal", "Системная герметизация шахтных примыканий", 8, "material", "m"], ["shaft_one_side_access_tooling", "Оснастка одностороннего доступа", 11, "equipment", "machine_hour"]] as const),
  sound_partition: candidates([["acoustic_boards", "Акустические плиты каждого слоя", 1, "material", "m2"], ["acoustic_mineral_wool", "Звукопоглощающая изоляция расчетной плотности", 2, "material", "m3"], ["acoustic_resilient_tape", "Виброразвязывающая лента примыканий", 8, "material", "m"], ["acoustic_continuity_check", "Контроль отсутствия акустических мостиков", 17, "testing", "test"]] as const),
  wall_cladding: candidates([["wall_furring_profiles", "Профили пристенной облицовки", 1, "material", "m"], ["wall_direct_hangers", "Прямые подвесы/кронштейны облицовки", 4, "material", "item"], ["wall_service_backing", "Закладные для навесного оборудования", 4, "material", "m"], ["wall_plane_verticality_test", "Контроль вертикальности и плоскости облицовки", 17, "testing", "test"]] as const),
};

const VARIANT: Readonly<Record<DrywallDomainCompletionVariantV7, readonly DrywallDomainExpectedCandidateV7[]>> = {
  standard: candidates([["variant_standard_configuration_record", "Фиксация стандартной проектной конфигурации", 21, "documentation", "document"]] as const, "FULL"),
  large_area: candidates([["variant_large_area_zoning", "Разбивка на технологические захватки", 6, "labor", "m2"], ["variant_large_area_material_handler", "Механизированная подача паллет/пакетов", 11, "equipment", "machine_hour"]] as const, "FULL"),
  small_area: candidates([["variant_small_area_separate_mobilization", "Отдельная мобилизация малой площади", 12, "transport", "trip"], ["variant_small_area_hand_detail", "Ручная доводка малых участков", 7, "labor", "man_hour"]] as const, "FULL"),
  technical_room: candidates([["variant_technical_corrosion_protection", "Коррозионностойкая защита технического помещения", 2, "material", "kg"], ["variant_technical_interface_service", "Координация плотных инженерных интерфейсов", 18, "subcontract_service", "service"]] as const, "FULL"),
  wet_zone: candidates([["variant_wet_zone_barrier", "Дополнительный влагозащитный барьер", 2, "material", "m2"], ["variant_wet_zone_sealant", "Герметик мокрой зоны", 8, "material", "kg"], ["variant_wet_zone_test", "Контроль влажности и непрерывности защиты", 17, "testing", "test"]] as const, "FULL"),
  high_load: candidates([["variant_high_load_reinforcement", "Дополнительное усиление высокой нагрузки", 4, "material", "m"], ["variant_high_load_board", "Усиленная плита зоны нагрузки", 1, "material", "m2"], ["variant_high_load_pull_test", "Контроль креплений высокой нагрузки", 17, "testing", "test"]] as const, "FULL"),
};

function parseCatalogId(catalogId: string): { family: DrywallDomainCompletionFamilyV7; operation: DrywallDomainCompletionOperationV7; variant: DrywallDomainCompletionVariantV7 } {
  const match = catalogId.match(/^drywall_ceiling_interior_(.+)_(prepare|frame|align|insulate|clad|finish_joint|repair|install)_(large_area|small_area|standard|technical_room|wet_zone|high_load)$/u);
  if (!match) throw new Error(`DRYWALL_DOMAIN_COMPLETION_ID_PARSE_RED:${catalogId}`);
  return { family: match[1] as DrywallDomainCompletionFamilyV7, operation: match[2].toUpperCase() as DrywallDomainCompletionOperationV7, variant: match[3] as DrywallDomainCompletionVariantV7 };
}

export function drywallDomainExpectedCandidatesV7(catalogId: string): readonly DrywallDomainExpectedCandidateV7[] {
  if (!AUTHORIZED.has(catalogId)) throw new Error(`DRYWALL_DOMAIN_COMPLETION_EXPECTED_OUTSIDE_SCOPE:${catalogId}`);
  const parsed = parseCatalogId(catalogId);
  const result = [...COMMON, ...OPERATION[parsed.operation], ...SYSTEM[parsed.family], ...VARIANT[parsed.variant]];
  if (new Set(result.map((row) => row.candidateId)).size !== result.length) throw new Error(`DRYWALL_DOMAIN_COMPLETION_CANDIDATE_DUPLICATE:${catalogId}`);
  return result;
}

export type DrywallDomainWorkContractV7 = {
  schemaVersion: "DrywallDomainWorkContractV7";
  catalogId: string;
  titleRu: string;
  family: DrywallDomainCompletionFamilyV7;
  group: DrywallDomainCompletionOperationV7;
  operation: DrywallDomainCompletionOperationV7;
  variant: DrywallDomainCompletionVariantV7;
  ownedCostScope: readonly string[];
  forbiddenCostScope: readonly string[];
  nonCostDependencies: readonly string[];
  normativeSourceIds: readonly string[];
};

export type DrywallDomainProfessionalPackagePartsV7 = {
  contract: DrywallDomainWorkContractV7;
  schema: ProfessionalDomainParameterSchemaV1;
  child_assemblies: readonly ProfessionalChildAssemblyV4[];
  normative_profile: ProfessionalNormativeProfileV1;
  required_stages: readonly string[];
  optional_stages: readonly string[];
  resource_policy: ProfessionalResourceCompletenessPolicyV1;
};

export type IndividualDrywallEstimatePassportV7 = {
  schemaVersion: "IndividualDrywallEstimatePassportV7";
  catalogId: string;
  titleRu: string;
  family: DrywallDomainCompletionFamilyV7;
  operation: DrywallDomainCompletionOperationV7;
  variant: DrywallDomainCompletionVariantV7;
  productionOwnerId: string;
  calculationStrategyId: string;
  parameterSchemaId: string;
  formulaGraphId: string;
  resourceGraphId: string;
  rowCount: number;
  expectedApplicableCount: number;
  completenessSlots: 22;
  candidateCoveragePercent: 100;
  hiddenAggregateRows: 0;
  preliminaryFactorRows: 0;
  identityHash: string;
  parameterSchemaHash: string;
  formulaGraphHash: string;
  resourceGraphHash: string;
};

export function isDrywallDomainCompletionCatalogIdV7(catalogId: string): boolean { return AUTHORIZED.has(catalogId); }
export function drywallDomainProfessionalOwnerIdV7(catalogId: string): string {
  if (!AUTHORIZED.has(catalogId)) throw new Error(`DRYWALL_DOMAIN_OWNER_OUTSIDE_SCOPE:${catalogId}`);
  return `domain-passport:drywall-domain-completion-v7:${catalogId}`;
}
export function drywallDomainCalculationStrategyIdV7(catalogId: string): string {
  if (!AUTHORIZED.has(catalogId)) throw new Error(`DRYWALL_DOMAIN_STRATEGY_OUTSIDE_SCOPE:${catalogId}`);
  return `drywall-domain-completion-v7:${catalogId}:calculation-strategy`;
}

function parameter(
  parameter_id: string,
  label_ru: string,
  input_type: ProfessionalDomainParameterDefinitionV1["input_type"],
  unit_id: string | null,
  role: ProfessionalAssemblyParameterRoleV4,
  required_for: readonly ProfessionalEstimateScopeModeV4[],
  consumers: readonly string[],
  options: { minimum?: number; maximum?: number; choices?: readonly { value: string; label_ru: string }[] } = {},
): ProfessionalDomainParameterDefinitionV1 & { assembly_role: ProfessionalAssemblyParameterRoleV4; required_for: readonly ProfessionalEstimateScopeModeV4[] } {
  const condition = required_for === FULL_SCOPE ? FULL_ONLY : ALWAYS;
  return {
    parameter_id, label_ru, input_type, unit_id, assembly_role: role, required_for, priority: required_for === FULL_SCOPE ? "P1" : "P0",
    visible_when: condition, required_when: condition, formula_consumers: consumers,
    source_ownership: ["USER_EXPLICIT", "PROJECT_DOCUMENT", "MATERIAL_PASSPORT", "APPLICABLE_NORM"], ...options,
  };
}

const dependenciesByOperation: Readonly<Record<DrywallDomainCompletionOperationV7, readonly string[]>> = {
  PREPARE: [], FRAME: ["accepted_prepare_revision_id"], ALIGN: ["accepted_frame_revision_id"],
  INSULATE: ["accepted_frame_revision_id"], CLAD: ["accepted_frame_revision_id", "accepted_alignment_revision_id"],
  FINISH_JOINT: ["accepted_cladding_revision_id"], REPAIR: ["condition_survey_record_id", "accepted_repair_detail_id"],
  INSTALL: ["alternative_route_selection_record_id"],
};

function normativeTrace(contract: DrywallDomainWorkContractV7, candidate: DrywallDomainExpectedCandidateV7): readonly ProfessionalNormativeRowTraceV3[] {
  const rateId = contract.operation === "REPAIR" ? KG_KRERR : KG_KRER;
  return [
    { source_id: rateId, document_code: contract.operation === "REPAIR" ? "КРЕРр-2015" : "КРЕР 10-05-011", edition: contract.operation === "REPAIR" ? "официальные указания 2015" : "приказ №52-нпа от 28.04.2022", exact_locator: contract.operation === "REPAIR" ? "Указания §3.3; демонтаж и восстановление по раздельным owners" : "Раздел 5, таблица 10-05-011, PDF 97–99; только применимая часть состава", source_role: candidate.category === "testing" || candidate.category === "documentation" ? "QUALITY_ACCEPTANCE" : "QUANTITY_NORM", applicability: "Точный объем и цена остаются явными project inputs; расценка не используется как скрытый полный состав.", foreign_mandatory_for_kg: false },
    { source_id: KG_SP, document_code: "СП КР 65-101:2025", edition: "официальное издание 2025", exact_locator: candidate.sourceLocator, source_role: candidate.category === "testing" || candidate.category === "documentation" ? "QUALITY_ACCEPTANCE" : "WORK_EXECUTION", applicability: `Drywall family ${contract.family}, operation ${contract.operation}; только доказанная роль.`, foreign_mandatory_for_kg: false },
    { source_id: KG_SAFETY, document_code: "СН КР 12-01:2018", edition: "официальное издание 2018", exact_locator: "§§6.1.6, 6.2.2; ППР/рабочие места/СИЗ", source_role: "WORK_EXECUTION", applicability: "HSE, доступ, ограждение, чистота и пылеудаление вынесены в отдельные semantic rows.", foreign_mandatory_for_kg: false },
    { source_id: KG_MATERIAL, document_code: "Реестр сертификатов строительных материалов КР", edition: "live registry + project passport", exact_locator: "material_certificate_reference + system_passport_reference + exact party", source_role: "PROJECT_INPUT", applicability: "Подтверждает выбранную партию и совместимость; не подставляет скрытый расход.", foreign_mandatory_for_kg: false },
  ];
}

export function buildDrywallDomainCompletionProfessionalPackagePartsV7(inventory: InteriorFinishesDomainInventoryRow): DrywallDomainProfessionalPackagePartsV7 | null {
  if (!AUTHORIZED.has(inventory.catalog_id)) return null;
  const parsed = parseCatalogId(inventory.catalog_id);
  const expected = drywallDomainExpectedCandidatesV7(inventory.catalog_id);
  const contract: DrywallDomainWorkContractV7 = {
    schemaVersion: "DrywallDomainWorkContractV7", catalogId: inventory.catalog_id, titleRu: inventory.localized_name_ru,
    ...parsed, group: parsed.operation,
    ownedCostScope: [`${parsed.family}:${parsed.operation}:physical resources`, `${parsed.family}:${parsed.operation}:labor/equipment`, `${parsed.family}:${parsed.operation}:QA/logistics/documents`],
    forbiddenCostScope: ["electrical devices/cables", "MEP equipment", "final decorative painting", "load-bearing structure", "firestop typed child", parsed.operation === "INSTALL" ? "simultaneous staged-route cost ownership" : "umbrella INSTALL route in same cost scenario"],
    nonCostDependencies: dependenciesByOperation[parsed.operation],
    normativeSourceIds: [KG_SP, parsed.operation === "REPAIR" ? KG_KRERR : KG_KRER, KG_SAFETY, KG_MATERIAL],
  };
  const owner = drywallDomainProfessionalOwnerIdV7(inventory.catalog_id);
  const namespace = `${inventory.catalog_id}:drywall-domain-v7`;
  const parameters: (ProfessionalDomainParameterDefinitionV1 & { assembly_role: ProfessionalAssemblyParameterRoleV4; required_for: readonly ProfessionalEstimateScopeModeV4[] })[] = [
    parameter("work_included", "Включить работу", "boolean", null, "PROJECT_QUANTITY", BOTH_SCOPES, ["scope"]),
    parameter("estimate_scope_mode", "Режим профессиональной полноты", "choice", null, "PROJECT_QUANTITY", BOTH_SCOPES, ["scope"], { choices: [{ value: "MINIMAL_EXPLICIT_SCOPE", label_ru: "Минимальный явный" }, { value: "FULL_APPLICABLE_SCOPE", label_ru: "Полный применимый" }] }),
    parameter("funding_source", "Источник финансирования", "choice", null, "PROJECT_QUANTITY", BOTH_SCOPES, ["normative"], { choices: [{ value: "PRIVATE_RECOMMENDED", label_ru: "Частный проект" }, { value: "PUBLIC_MANDATORY", label_ru: "Бюджетный проект" }] }),
    parameter("project_type", "Тип объекта", "text", null, "PROJECT_QUANTITY", BOTH_SCOPES, ["normative"]),
    parameter("area_m2", "Расчетная площадь системы", "number", "m2", "PROJECT_QUANTITY", BOTH_SCOPES, ["geometry_area_control"], { minimum: 0.000001, maximum: 10_000_000 }),
    parameter("working_height_m", "Монтажная высота", "number", "m", "PROJECT_QUANTITY", BOTH_SCOPES, ["working_height_control"], { minimum: 0, maximum: 300 }),
    parameter("material_certificate_reference", "Сертификат точной партии", "text", null, "MATERIAL_PASSPORT_VALUE", BOTH_SCOPES, ["normative"]),
    parameter("system_passport_reference", "Паспорт комплектной системы", "text", null, "MATERIAL_PASSPORT_VALUE", BOTH_SCOPES, ["normative"]),
    parameter("normative_rate_code", "Применимый код КРЕР или проектный ресурсный расчет", "text", null, "NORM_RATE", BOTH_SCOPES, ["normative"]),
    parameter("price_basis_reference", "Основание цены", "text", null, "PRICE_INPUT", BOTH_SCOPES, ["price-route"]),
    parameter("price_basis_date", "Дата основания цены", "text", null, "PRICE_INPUT", BOTH_SCOPES, ["price-route"]),
    ...contract.nonCostDependencies.map((id) => parameter(id, `Принятая non-cost dependency: ${id}`, "text", null, "DEPENDENCY_REFERENCE", BOTH_SCOPES, ["dependency"])),
    ...expected.flatMap((candidate) => {
      const modes = candidate.scope === "FULL" ? FULL_SCOPE : BOTH_SCOPES;
      return [
        parameter(`quantity_${candidate.candidateId}`, `Количество: ${candidate.titleRu}`, "number", candidate.unitId, candidate.category === "testing" || candidate.category === "documentation" ? "CONTROL_PLAN_VALUE" : "PROJECT_QUANTITY", modes, [candidate.candidateId], { minimum: 0.000001, maximum: 1_000_000_000 }),
        parameter(`unit_price_${candidate.candidateId}_kgs`, `Цена: ${candidate.titleRu}`, "number", `KGS_per_${candidate.unitId}`, "PRICE_INPUT", modes, [candidate.candidateId], { minimum: 0.01, maximum: 1_000_000_000_000 }),
      ];
    }),
  ];
  if (new Set(parameters.map((item) => item.parameter_id)).size !== parameters.length) throw new Error(`DRYWALL_DOMAIN_PARAMETER_DUPLICATE:${inventory.catalog_id}`);
  const schema: ProfessionalDomainParameterSchemaV1 = {
    schema_id: `${inventory.catalog_id}:drywall-domain-parameter-schema:v7`, schema_version: "7.0.0", technology_id: inventory.canonical_technology_id,
    parameters, quantity_alternatives: [["area_m2"]], derived_parameter_rules: [],
  };
  const assemblyParameter = (id: string): ProfessionalAssemblyParameterDefinitionV4 => {
    const spec = parameters.find((item) => item.parameter_id === id);
    if (!spec) throw new Error(`DRYWALL_DOMAIN_ASSEMBLY_PARAMETER_MISSING:${inventory.catalog_id}:${id}`);
    return { parameter_id: id, title_ru: spec.label_ru, role: spec.assembly_role, unit_id: spec.unit_id, required_for: spec.priority === "P1" ? FULL_SCOPE : BOTH_SCOPES };
  };
  const assemblyRow = (candidate: DrywallDomainExpectedCandidateV7): ProfessionalAssemblyRowDefinitionV4 => {
    const quantityId = `quantity_${candidate.candidateId}`;
    const priceId = `unit_price_${candidate.candidateId}_kgs`;
    const formula: ProfessionalAssemblyFormulaV4 = { formula_id: `${namespace}:${candidate.candidateId}:FormulaGraphV7`, expression: quantityId, input_parameter_ids: [quantityId], output_unit_id: candidate.unitId, calculate: (values) => values[quantityId] };
    return {
      row_id: `${namespace}:row:${candidate.candidateId}`, section: `Drywall ${parsed.family} / ${parsed.operation}`, category: candidate.category,
      title_ru: candidate.titleRu, formula, cost_ownership: "priced_resource", cost_owner_id: `DRYWALL_DOMAIN_V7:${inventory.catalog_id}:${candidate.candidateId}`,
      semantic_owner: `${owner}:row:${candidate.candidateId}`, normative_source_ids: contract.normativeSourceIds,
      inclusion_condition: candidate.scope === "FULL" ? "work_included=true AND scope_mode=FULL_APPLICABLE_SCOPE" : "work_included=true",
      procurement_eligible: candidate.category === "material" || candidate.category === "transport",
      normative_trace_v3: normativeTrace(contract, candidate),
      price_route_v3: { kind: "RUNTIME_VALIDATED_INPUT", unit_price_parameter_id: priceId, price_basis_reference_parameter_id: "price_basis_reference", price_basis_date_parameter_id: "price_basis_date", currency_from_request: true, minimum_exclusive: 0 },
      resource_graph_node_v3: { graph_version: "ProfessionalResourceGraphV3", typed_child_boundary: parsed.operation === "INSTALL" ? "CLAD" : parsed.operation, resource_class: `DRYWALL_DOMAIN_V7:${parsed.family}:${candidate.category}:${candidate.candidateId}`, dependency_ids: contract.nonCostDependencies, non_cost_dependencies_only: contract.nonCostDependencies.length > 0, context_parameter_ids: ["area_m2", "working_height_m", "material_certificate_reference", "system_passport_reference"], forbidden_cost_scopes: contract.forbiddenCostScope },
      normative_proof_bundle_id_v3: `WorkNormativeProofBundleV7:${inventory.catalog_id}`,
      professional_proof_bundle_id_v3: `WorkProfessionalProofBundleV7:${inventory.catalog_id}`,
    };
  };
  const child = (suffix: "core" | "full", modes: readonly ProfessionalEstimateScopeModeV4[], rows: readonly DrywallDomainExpectedCandidateV7[]): ProfessionalChildAssemblyV4 => {
    const parameterIds = [...new Set(rows.flatMap((row) => [`quantity_${row.candidateId}`, `unit_price_${row.candidateId}_kgs`]).concat(["work_included", "estimate_scope_mode", "area_m2", "working_height_m", "price_basis_reference", "price_basis_date", ...contract.nonCostDependencies]))];
    return { child_passport_id: `${namespace}:${suffix}-passport`, child_passport_version: "7.0.0", domain_owner: "interior_finishes_complete_v1", assembly_id: `${namespace}:${suffix}-assembly`, title_ru: `${suffix === "core" ? "Основной" : "Полный"} состав: ${inventory.localized_name_ru}`, scope_trigger_parameter: "work_included", scope_trigger_values: [true], supported_scope_modes: modes, parameters: parameterIds.map(assemblyParameter), rows: rows.map(assemblyRow) };
  };
  const coreRows = expected.filter((row) => row.scope === "BOTH");
  const fullRows = expected.filter((row) => row.scope === "FULL");
  const rateId = parsed.operation === "REPAIR" ? KG_KRERR : KG_KRER;
  return {
    contract, schema, child_assemblies: [child("core", BOTH_SCOPES, coreRows), child("full", FULL_SCOPE, fullRows)],
    normative_profile: { profile_id: `${namespace}:kg-profile`, profile_version: "7.0.0", technology_id: inventory.canonical_technology_id, jurisdiction: "KG", requested_source_ids: [KG_SP, rateId, KG_SAFETY, KG_MATERIAL], requested_source_types: ["WORK_EXECUTION_STANDARD", "RESOURCE_ESTIMATE_NORM", "MATERIAL_STANDARD"], rejected_foreign_source_ids: ["RU_SP_163", "RU_GESN_10", "ISO_6308_WITHDRAWN", "ASTM_C1396", "EN_520"] },
    required_stages: ["PROJECT_SYSTEM_REVIEW", `${parsed.operation}_SCOPE_CONFIRMATION`, `${parsed.operation}_EXECUTION`, `${parsed.operation}_QUALITY_CONTROL`, "LOGISTICS", "WASTE_CLOSEOUT", "DOCUMENTATION"],
    optional_stages: ["HIGH_WORKING_LEVEL_ACCESS", "MEP_INTERFACE_COORDINATION", "FIRE_OR_ACOUSTIC_SYSTEM_CHECK"],
    resource_policy: { policy_id: `${namespace}:resource-policy`, technology_id: inventory.canonical_technology_id, required_categories: ["material", "labor", "equipment", "transport", "waste", "testing", "documentation"], optional_categories: ["subcontract_service", "temporary_work"], forbidden_generic_rows: ["Материалы", "Работы", "Оборудование", "Другое", "Комплект работ", "Основные материалы", "Прочие материалы", "Комплект оборудования", "Доставка и подъем", "Испытания", "Исполнительная документация"], one_bundle_resource_replacement_forbidden: true },
  };
}

export function buildIndividualDrywallEstimatePassportV7(
  inventory: InteriorFinishesDomainInventoryRow,
  parts: DrywallDomainProfessionalPackagePartsV7 | null = buildDrywallDomainCompletionProfessionalPackagePartsV7(inventory),
): IndividualDrywallEstimatePassportV7 {
  if (!parts) throw new Error(`DRYWALL_DOMAIN_PASSPORT_OUTSIDE_SCOPE:${inventory.catalog_id}`);
  const rows = parts.child_assemblies.flatMap((child) => child.rows);
  const formulas = rows.map((row) => ({ id: row.formula.formula_id, expression: row.formula.expression, inputs: row.formula.input_parameter_ids, unit: row.formula.output_unit_id }));
  const resources = rows.map((row) => ({ id: row.row_id, owner: row.cost_owner_id, category: row.category, graph: row.resource_graph_node_v3 }));
  return {
    schemaVersion: "IndividualDrywallEstimatePassportV7", catalogId: inventory.catalog_id, titleRu: inventory.localized_name_ru,
    family: parts.contract.family, operation: parts.contract.operation, variant: parts.contract.variant,
    productionOwnerId: drywallDomainProfessionalOwnerIdV7(inventory.catalog_id), calculationStrategyId: drywallDomainCalculationStrategyIdV7(inventory.catalog_id),
    parameterSchemaId: parts.schema.schema_id, formulaGraphId: `FormulaGraphV7:${inventory.catalog_id}`, resourceGraphId: `ResourceGraphV7:${inventory.catalog_id}`,
    rowCount: rows.length, expectedApplicableCount: drywallDomainExpectedCandidatesV7(inventory.catalog_id).length,
    completenessSlots: 22, candidateCoveragePercent: 100, hiddenAggregateRows: 0, preliminaryFactorRows: 0,
    identityHash: estimateDeterministicHash({ catalogId: inventory.catalog_id, titleRu: inventory.localized_name_ru, ...parseCatalogId(inventory.catalog_id) }),
    parameterSchemaHash: estimateDeterministicHash(parts.schema), formulaGraphHash: estimateDeterministicHash(formulas), resourceGraphHash: estimateDeterministicHash(resources),
  };
}
