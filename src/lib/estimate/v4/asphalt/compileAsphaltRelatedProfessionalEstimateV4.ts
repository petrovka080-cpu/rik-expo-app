import { formatEstimateUnitLabel } from "../../../ai/globalEstimate/formatEstimateUnitLabel";
import type { ConsumerRepairAiDraft, ConsumerRepairItemType } from "../../../consumerRequests/consumerRequestTypes";
import type { BuildEstimateFromInlineWorkPromptInput } from "../../buildEstimateFromInlineWorkPrompt";
import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import { applyProfessionalBoqRuntimeContract } from "../../professionalBoqAssumptions";
import type { DomainResolutionReadiness } from "../../estimateDraftRevisionContract";
import {
  ASPHALT_RELATED_SEMANTIC_REGISTRY_VERSION_V4,
  asphaltRelatedCatalogBindingV4,
  asphaltRelatedParameterKeysForProfileV4,
  getAsphaltRelatedProfileByCatalogRecordIdV4,
  type AsphaltRelatedOperationClassV4,
  type AsphaltRelatedProfileV4,
} from "./asphaltRelatedSemanticRegistryV4";
import { getAsphaltRelatedProfessionalPassportV4 } from "./asphaltRelatedProfessionalPassportsV4";
import { resolveAsphaltM1NormativeBindingV1 } from "./asphaltM1NormativeBindingsV1";
import {
  ASPHALT_MINIMAL_RESOURCE_REQUIRED_KEYS_V4,
  compileAsphaltRemovalThroughCoreV4,
  compileAsphaltRelatedThroughCoreV4,
  type AsphaltRelatedCoreRowV4,
} from "./compileAsphaltRelatedThroughCoreV4";
import type { ProfessionalEstimateScopeModeV4 } from "../professionalProjectAssemblyV4";

export type AsphaltRelatedParameterTierV4 = "P0" | "P1" | "P2";

export type AsphaltRelatedParameterMetadataV4 = {
  labelRu: string;
  tier: AsphaltRelatedParameterTierV4;
  unit?: string;
  allowedValues?: readonly (string | boolean)[];
  minimum?: number;
  maximum?: number;
  integer?: boolean;
};

export const ASPHALT_RELATED_PARAMETER_METADATA_V4: Readonly<Record<string, AsphaltRelatedParameterMetadataV4>> = Object.freeze({
  area_m2: { labelRu: "Площадь покрытия", tier: "P0", unit: "m2" },
  length_m: { labelRu: "Длина участка", tier: "P0", unit: "m" },
  width_m: { labelRu: "Ширина участка", tier: "P0", unit: "m" },
  removal_area_m2: { labelRu: "Площадь демонтируемого покрытия", tier: "P0", unit: "m2" },
  total_area_m2: { labelRu: "Общая площадь покрытия", tier: "P0", unit: "m2" },
  removal_share: { labelRu: "Доля площади частичного снятия", tier: "P0", minimum: Number.EPSILON, maximum: 1 },
  existing_total_thickness_mm: { labelRu: "Общая фактическая толщина существующего покрытия", tier: "P0", unit: "mm" },
  removal_depth_mm: { labelRu: "Глубина удаления", tier: "P0", unit: "mm" },
  removal_method: {
    labelRu: "Способ удаления",
    tier: "P0",
    allowedValues: ["COLD_MILLING", "MECHANICAL_BREAKOUT", "MANUAL_BREAKOUT", "COMBINED"],
  },
  removal_extent: {
    labelRu: "Полный или частичный демонтаж",
    tier: "P0",
    allowedValues: ["FULL", "PARTIAL"],
  },
  material_destination: {
    labelRu: "Дальнейшая судьба демонтированного материала",
    tier: "P0",
    allowedValues: ["RECYCLING", "RECOVERED_MATERIAL", "TEMPORARY_STORAGE", "DISPOSAL"],
  },
  haul_required: {
    labelRu: "Требуется вывоз демонтированного материала",
    tier: "P0",
    allowedValues: [true, false],
  },
  haul_distance_km: { labelRu: "Расстояние транспортирования", tier: "P0", unit: "km" },
  truck_payload_t: { labelRu: "Полезная загрузка транспорта", tier: "P0", unit: "t" },
  existing_asphalt_density_t_m3: { labelRu: "Плотность существующего асфальтобетона с источником", tier: "P1", unit: "t/m3" },
  boundary_cut_length_m: { labelRu: "Длина границ резки", tier: "P1", unit: "m" },
  cut_map_geometry: { labelRu: "Схема границ и карт демонтажа", tier: "P1" },
  number_of_cards: { labelRu: "Количество карт", tier: "P1", unit: "pcs" },
  number_of_passes: { labelRu: "Количество проходов фрезы", tier: "P1", unit: "pcs", integer: true },
  milling_width_m: { labelRu: "Рабочая ширина фрезы или ширина полосы прохода", tier: "P1", unit: "m" },
  loading_required: { labelRu: "Требуется погрузка снятого материала", tier: "P1", allowedValues: [true, false] },
  base_cleaning_required: { labelRu: "Требуется очистка основания после снятия", tier: "P1", allowedValues: [true, false] },
  base_disposition: { labelRu: "Сохранение или демонтаж основания", tier: "P1" },
  base_condition_after_removal: { labelRu: "Состояние основания после снятия", tier: "P1" },
  traffic_constraint: { labelRu: "Ограничения движения и стеснённость", tier: "P1" },
  dust_suppression_required: { labelRu: "Необходимость пылеподавления", tier: "P1", allowedValues: [true, false] },
  contamination_reject_t: { labelRu: "Масса загрязнённого брака", tier: "P1", unit: "t" },
  disposal_loss_t: { labelRu: "Потери при обращении с материалом", tier: "P1", unit: "t" },
  payload_utilization_factor: { labelRu: "Коэффициент полезной загрузки", tier: "P1" },
  work_scope: {
    labelRu: "Состав работ",
    tier: "P0",
    allowedValues: ["PURE_DEMOLITION", "DEMOLITION_AND_REINSTATEMENT"],
  },
  reinstatement_depth_mm: { labelRu: "Толщина восстанавливаемого слоя", tier: "P0", unit: "mm" },
  new_asphalt_density_t_m3: { labelRu: "Плотность новой смеси по проекту/паспорту", tier: "P0", unit: "t/m3" },
  wearing_layer_thickness_mm: { labelRu: "Толщина верхнего слоя", tier: "P0", unit: "mm", minimum: 20, maximum: 150 },
  binder_layer_thickness_mm: { labelRu: "Толщина нижнего слоя", tier: "P0", unit: "mm", minimum: 20, maximum: 250 },
  asphalt_density_t_m3: { labelRu: "Плотность смеси по проекту/паспорту", tier: "P0", unit: "t/m3", minimum: 1.8, maximum: 2.8 },
  prepared_base_confirmed: { labelRu: "Подготовленное основание подтверждено", tier: "P0", allowedValues: [true] },
  bridge_deck_system_confirmed: { labelRu: "Система покрытия мостовой плиты подтверждена проектом", tier: "P0", allowedValues: [true] },
  traffic_class_confirmed: { labelRu: "Класс транспортной нагрузки подтверждён", tier: "P0", allowedValues: [true] },
  traffic_class: { labelRu: "Класс транспортной нагрузки", tier: "P0", allowedValues: ["LIGHT", "MEDIUM", "HEAVY", "VERY_HEAVY", "PROJECT_SPECIFIED"] },
  parking_purpose: { labelRu: "Назначение парковки", tier: "P0", allowedValues: ["PASSENGER_CARS", "MIXED", "TRUCKS", "SPECIAL_EQUIPMENT"] },
  vehicle_type: { labelRu: "Расчётный тип транспорта", tier: "P0", allowedValues: ["PASSENGER_CARS", "LIGHT_COMMERCIAL", "TRUCKS", "SPECIAL_EQUIPMENT"] },
  base_condition: { labelRu: "Состояние основания", tier: "P0", allowedValues: ["ACCEPTED", "LOCAL_REPAIR_REQUIRED", "NEW_BASE_REQUIRED"] },
  underlying_layer_condition: { labelRu: "Состояние нижележащего слоя", tier: "P0", allowedValues: ["ACCEPTED", "LOCAL_REPAIR_REQUIRED", "RECONSTRUCTION_REQUIRED"] },
  existing_surface_condition: { labelRu: "Состояние существующего покрытия", tier: "P0", allowedValues: ["SOUND", "DEFECTS_REQUIRE_REPAIR", "PROFILE_MILLING_REQUIRED"] },
  wearing_mix_type: { labelRu: "Тип смеси верхнего слоя по проекту", tier: "P0", allowedValues: ["DENSE_FINE_GRAINED", "STONE_MASTIC", "POROUS", "PROJECT_SPECIFIED"] },
  binder_mix_type: { labelRu: "Тип смеси нижнего слоя по проекту", tier: "P1", allowedValues: ["DENSE_COARSE_GRAINED", "POROUS", "PROJECT_SPECIFIED"] },
  tack_coat_required: { labelRu: "Требуется подгрунтовка или межслойный розлив", tier: "P1", allowedValues: [true, false] },
  tack_coat_rate_l_m2: { labelRu: "Проектная норма розлива вяжущего", tier: "P1", unit: "l_m2", minimum: Number.EPSILON },
  binder_layer_required: { labelRu: "Требуется нижний асфальтовый слой", tier: "P1", allowedValues: [true, false] },
  base_construction_required: { labelRu: "Требуется устройство основания", tier: "P1", allowedValues: [true, false] },
  base_layer_thickness_mm: { labelRu: "Толщина слоя основания", tier: "P1", unit: "mm", minimum: 20 },
  base_material_type: { labelRu: "Материал основания по проекту", tier: "P1", allowedValues: ["CRUSHED_STONE", "SAND_GRAVEL", "ASPHALT_GRANULATE", "PROJECT_SPECIFIED"] },
  base_material_compaction_factor: { labelRu: "Коэффициент запаса материала основания по проекту", tier: "P1", minimum: 1, maximum: 1.5 },
  subbase_required: { labelRu: "Требуется отдельный подстилающий слой", tier: "P1", allowedValues: [true, false] },
  subbase_layer_thickness_mm: { labelRu: "Толщина подстилающего слоя", tier: "P1", unit: "mm", minimum: 20, maximum: 1000 },
  subbase_material_type: { labelRu: "Материал подстилающего слоя по проекту", tier: "P1", allowedValues: ["SAND", "SAND_GRAVEL", "PROJECT_SPECIFIED"] },
  subbase_material_compaction_factor: { labelRu: "Коэффициент запаса материала подстилающего слоя по проекту", tier: "P1", minimum: 1, maximum: 1.5 },
  base_repair_area_m2: { labelRu: "Площадь локального ремонта основания", tier: "P1", unit: "m2", minimum: Number.EPSILON },
  curb_required: { labelRu: "Требуется бортовой камень", tier: "P1", allowedValues: [true, false] },
  curb_length_m: { labelRu: "Длина бортового камня", tier: "P1", unit: "m", minimum: Number.EPSILON },
  curb_type: { labelRu: "Тип бортового камня", tier: "P1", allowedValues: ["ROAD_CURB", "PARKING_CURB", "PROJECT_SPECIFIED"] },
  drainage_required: { labelRu: "Требуется водоотвод", tier: "P1", allowedValues: [true, false] },
  drainage_length_m: { labelRu: "Длина элементов водоотвода", tier: "P1", unit: "m", minimum: Number.EPSILON },
  drainage_inlet_count: { labelRu: "Количество точечных дождеприёмников", tier: "P1", unit: "pcs", minimum: 1, integer: true },
  drainage_type: { labelRu: "Тип водоотвода", tier: "P1", allowedValues: ["SURFACE_CHANNEL", "TRAY", "POINT_INLETS", "PROJECT_SPECIFIED"] },
  marking_required: { labelRu: "Требуется дорожная разметка", tier: "P1", allowedValues: [true, false] },
  marking_area_m2: { labelRu: "Площадь разметки", tier: "P1", unit: "m2", minimum: Number.EPSILON },
  marking_material_type: { labelRu: "Материал дорожной разметки по проекту", tier: "P1", allowedValues: ["ROAD_PAINT", "THERMOPLASTIC", "COLD_PLASTIC", "PROJECT_SPECIFIED"] },
  marking_material_rate_kg_m2: { labelRu: "Проектный расход материала разметки", tier: "P1", unit: "kg_m2", minimum: 0.01, maximum: 10 },
  marking_glass_beads_required: { labelRu: "Требуются световозвращающие стеклошарики", tier: "P1", allowedValues: [true, false] },
  marking_glass_beads_rate_kg_m2: { labelRu: "Проектный расход стеклошариков", tier: "P1", unit: "kg_m2", minimum: 0.01, maximum: 5 },
  accessible_parking_required: { labelRu: "Требуются доступные парковочные места", tier: "P1", allowedValues: [true, false] },
  parking_geometry_required: { labelRu: "Требуется проектная разбивка парковки", tier: "P1", allowedValues: [true, false] },
  parking_space_count: { labelRu: "Количество машино-мест по проекту", tier: "P1", unit: "pcs", minimum: 1, integer: true },
  parking_aisle_length_m: { labelRu: "Длина маневровых проездов по проекту", tier: "P1", unit: "m", minimum: Number.EPSILON },
  parking_entry_exit_count: { labelRu: "Количество въездов-выездов по проекту", tier: "P1", unit: "pcs", minimum: 1, integer: true },
  parking_layout_consumable_kg_per_space: { labelRu: "Расход разбивочного материала на машино-место", tier: "P1", unit: "kg_pcs", minimum: Number.EPSILON },
  parking_layout_productivity_space_per_man_hour: { labelRu: "Производительность разбивочного звена парковки", tier: "P1", unit: "pcs_man_hour", minimum: Number.EPSILON },
  parking_survey_productivity_space_per_machine_hour: { labelRu: "Производительность геодезического прибора", tier: "P1", unit: "pcs_machine_hour", minimum: Number.EPSILON },
  parking_geometry_control_interval_m2_per_test: { labelRu: "Площадь на один контроль геометрии парковки", tier: "P1", unit: "m2_test", minimum: Number.EPSILON },
  accessible_space_count: { labelRu: "Количество доступных парковочных мест", tier: "P1", unit: "pcs", minimum: 1, integer: true },
  accessible_sign_count: { labelRu: "Количество знаков доступной парковки по проекту", tier: "P1", unit: "pcs", minimum: 1, integer: true },
  accessible_sign_post_count: { labelRu: "Количество стоек знаков доступной парковки", tier: "P1", unit: "pcs", minimum: 1, integer: true },
  accessible_sign_foundation_concrete_m3_per_post: { labelRu: "Расход бетона фундамента стойки знака доступной парковки", tier: "P1", unit: "m3_pcs", minimum: Number.EPSILON },
  accessible_symbol_area_m2: { labelRu: "Проектная площадь символов и зон доступной парковки", tier: "P1", unit: "m2", minimum: Number.EPSILON },
  accessible_symbol_compound_kg_m2: { labelRu: "Расход материала разметки доступной парковки", tier: "P1", unit: "kg_m2", minimum: Number.EPSILON },
  accessible_symbol_beads_kg_m2: { labelRu: "Расход стеклошариков разметки доступной парковки", tier: "P1", unit: "kg_m2", minimum: Number.EPSILON },
  accessible_marking_productivity_m2_per_man_hour: { labelRu: "Производительность труда разметки доступной парковки", tier: "P1", unit: "m2_man_hour", minimum: Number.EPSILON },
  accessible_sign_installation_pcs_per_man_hour: { labelRu: "Производительность монтажа знаков доступной парковки", tier: "P1", unit: "pcs_man_hour", minimum: Number.EPSILON },
  accessible_sign_drill_pcs_per_machine_hour: { labelRu: "Производительность буровой машины для стоек доступной парковки", tier: "P1", unit: "pcs_machine_hour", minimum: Number.EPSILON },
  accessible_marking_machine_productivity_m2_per_machine_hour: { labelRu: "Производительность разметочной машины доступной парковки", tier: "P1", unit: "m2_machine_hour", minimum: Number.EPSILON },
  signing_required: { labelRu: "Требуются дорожные знаки парковки", tier: "P1", allowedValues: [true, false] },
  sign_count: { labelRu: "Количество дорожных знаков", tier: "P1", unit: "pcs", minimum: 1, integer: true },
  lighting_required: { labelRu: "Требуется наружное освещение парковки", tier: "P1", allowedValues: [true, false] },
  lighting_pole_count: { labelRu: "Количество опор наружного освещения", tier: "P1", unit: "pcs", minimum: 1, integer: true },
  lighting_luminaire_count: { labelRu: "Количество наружных светильников", tier: "P1", unit: "pcs", minimum: 1, integer: true },
  lighting_cable_length_m: { labelRu: "Проектная длина кабельной трассы освещения", tier: "P1", unit: "m", minimum: Number.EPSILON },
  lighting_cabinet_count: { labelRu: "Количество шкафов управления освещением", tier: "P1", unit: "pcs", minimum: 1, integer: true },
  project_scope: { labelRu: "Границы проектного состава работ", tier: "P0", allowedValues: ["SURFACING_ONLY", "PAVEMENT_STRUCTURE", "FULL_ROAD_INFRASTRUCTURE", "TURNKEY_PARKING_WITH_SITE_FEATURES", "REHABILITATION"] },
  estimate_scope_mode: { labelRu: "Режим состава профессиональной сметы", tier: "P0", allowedValues: ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"] },
  asphalt_waste_percent: { labelRu: "Технологический запас асфальтобетонной смеси по проекту или норме", tier: "P0", unit: "percent", minimum: 0, maximum: 25 },
  base_emulsion_rate_l_m2: { labelRu: "Норма розлива эмульсии по основанию из проекта или техкарты", tier: "P0", unit: "l_m2", minimum: Number.EPSILON },
  emulsion_rate_l_m2: { labelRu: "Норма межслойного розлива эмульсии из проекта или техкарты", tier: "P1", unit: "l_m2", minimum: Number.EPSILON },
  paver_working_width_m: { labelRu: "Рабочая ширина прохода асфальтоукладчика по ППР", tier: "P1", unit: "m", minimum: Number.EPSILON },
  paving_shift_length_m: { labelRu: "Длина сменной захватки по ППР", tier: "P1", unit: "m", minimum: Number.EPSILON },
  surface_cleaner_productivity_m2_per_machine_hour: { labelRu: "Производительность очистительной машины по техкарте", tier: "P0", unit: "m2_machine_hour", minimum: Number.EPSILON },
  bitumen_distributor_productivity_m2_per_machine_hour: { labelRu: "Производительность автогудронатора по техкарте", tier: "P0", unit: "m2_machine_hour", minimum: Number.EPSILON },
  paver_productivity_m2_per_machine_hour: { labelRu: "Производительность асфальтоукладчика по ППР или техкарте", tier: "P0", unit: "m2_machine_hour", minimum: Number.EPSILON },
  roller_productivity_m2_per_machine_hour: { labelRu: "Производительность гладковальцового катка по схеме уплотнения", tier: "P0", unit: "m2_machine_hour", minimum: Number.EPSILON },
  pneumatic_roller_productivity_m2_per_machine_hour: { labelRu: "Производительность пневмоколёсного катка по схеме уплотнения", tier: "P0", unit: "m2_machine_hour", minimum: Number.EPSILON },
  road_worker_productivity_m2_per_man_hour: { labelRu: "Нормативная производительность труда дорожных рабочих", tier: "P0", unit: "m2_man_hour", minimum: Number.EPSILON },
  asphalt_plant_distance_km: { labelRu: "Расстояние от асфальтобетонного завода", tier: "P0", unit: "km", minimum: Number.EPSILON },
  truck_average_speed_km_per_machine_hour: { labelRu: "Расчётная средняя скорость самосвала по транспортной схеме", tier: "P0", unit: "km_machine_hour", minimum: Number.EPSILON },
  truck_turnaround_machine_hours: { labelRu: "Время погрузки, ожидания и разгрузки одного рейса", tier: "P0", unit: "machine_hour", minimum: Number.EPSILON },
  laboratory_control: { labelRu: "Программа лабораторного контроля", tier: "P0", allowedValues: ["contractor", "independent", "project_spec"] },
  incoming_control_interval_m2_per_test: { labelRu: "Периодичность входного контроля материалов по программе качества", tier: "P0", unit: "m2_test", minimum: Number.EPSILON },
  compaction_control_interval_m2_per_test: { labelRu: "Периодичность контроля уплотнения по программе качества", tier: "P0", unit: "m2_test", minimum: Number.EPSILON },
  core_sampling_interval_m2_per_test: { labelRu: "Периодичность отбора кернов по программе качества", tier: "P0", unit: "m2_test", minimum: Number.EPSILON },
  laboratory_test_interval_m2_per_test: { labelRu: "Периодичность лабораторных испытаний по программе качества", tier: "P0", unit: "m2_test", minimum: Number.EPSILON },
  temperature_control_trips_per_test: { labelRu: "Количество рейсов на одно измерение температуры смеси", tier: "P0", unit: "trip_test", minimum: 1, integer: true },
  smoothness_control_interval_m2_per_test: { labelRu: "Периодичность контроля ровности и отметок", tier: "P0", unit: "m2_test", minimum: Number.EPSILON },
  thickness_control_interval_m2_per_test: { labelRu: "Периодичность контроля толщины покрытия", tier: "P0", unit: "m2_test", minimum: Number.EPSILON },
  laboratory_protocol_count: { labelRu: "Количество комплектов лабораторных протоколов по программе сдачи", tier: "P0", unit: "document", minimum: 1, integer: true },
  executive_survey_service_count: { labelRu: "Количество исполнительных геодезических съёмок по заданию", tier: "P0", unit: "service", minimum: 1, integer: true },
  execution_documentation_count: { labelRu: "Количество комплектов исполнительной документации по договору", tier: "P0", unit: "document", minimum: 1, integer: true },
  sand_layer_required: { labelRu: "Требуется песчаный подстилающий слой по проекту", tier: "P1", allowedValues: [true, false] },
  sand_thickness_mm: { labelRu: "Проектная толщина песчаного слоя", tier: "P1", unit: "mm", minimum: Number.EPSILON },
  sand_compaction_factor: { labelRu: "Коэффициент поставки песка к уплотнённому объёму", tier: "P1", minimum: 1 },
  sand_waste_percent: { labelRu: "Технологический запас песка по норме", tier: "P1", unit: "percent", minimum: 0, maximum: 25 },
  sand_density_t_m3: { labelRu: "Насыпная плотность песка по паспорту", tier: "P1", unit: "t_m3", minimum: Number.EPSILON },
  sand_water_rate_m3_m3: { labelRu: "Расход воды на увлажнение песка по техкарте и фактической влажности", tier: "P1", unit: "m3_m3", minimum: Number.EPSILON },
  aggregate_source_distance_km: { labelRu: "Расстояние перевозки песка и щебня по транспортной схеме", tier: "P1", unit: "km", minimum: Number.EPSILON },
  crushed_layer_count: { labelRu: "Количество щебёночных слоёв по проекту", tier: "P1", unit: "pcs", minimum: 0, maximum: 2, integer: true },
  crushed_layer_1_fraction: { labelRu: "Фракция щебня первого слоя по проекту", tier: "P1" },
  crushed_layer_1_thickness_mm: { labelRu: "Толщина первого щебёночного слоя", tier: "P1", unit: "mm", minimum: Number.EPSILON },
  crushed_layer_1_compaction_factor: { labelRu: "Коэффициент поставки щебня первого слоя", tier: "P1", minimum: 1 },
  crushed_layer_1_waste_percent: { labelRu: "Технологический запас щебня первого слоя", tier: "P1", unit: "percent", minimum: 0, maximum: 25 },
  crushed_layer_2_fraction: { labelRu: "Фракция щебня второго слоя по проекту", tier: "P1" },
  crushed_layer_2_thickness_mm: { labelRu: "Толщина второго щебёночного слоя", tier: "P1", unit: "mm", minimum: Number.EPSILON },
  crushed_layer_2_compaction_factor: { labelRu: "Коэффициент поставки щебня второго слоя", tier: "P1", minimum: 1 },
  crushed_layer_2_waste_percent: { labelRu: "Технологический запас щебня второго слоя", tier: "P1", unit: "percent", minimum: 0, maximum: 25 },
  crushed_density_t_m3: { labelRu: "Насыпная плотность щебня по паспорту", tier: "P1", unit: "t_m3", minimum: Number.EPSILON },
  crushed_water_rate_m3_m3: { labelRu: "Расход воды на уплотнение щебёночного основания", tier: "P1", unit: "m3_m3", minimum: Number.EPSILON },
  base_density_test_interval_m2: { labelRu: "Периодичность контроля плотности основания", tier: "P1", unit: "m2_test", minimum: Number.EPSILON },
  grader_productivity_m2_per_machine_hour: { labelRu: "Производительность автогрейдера по ППР", tier: "P1", unit: "m2_machine_hour", minimum: Number.EPSILON },
  base_roller_productivity_m2_per_machine_hour: { labelRu: "Производительность катка основания по ППР", tier: "P1", unit: "m2_machine_hour", minimum: Number.EPSILON },
  water_truck_productivity_m2_per_machine_hour: { labelRu: "Производительность поливомоечной машины по ППР", tier: "P1", unit: "m2_machine_hour", minimum: Number.EPSILON },
  base_worker_productivity_m2_per_man_hour: { labelRu: "Нормативная производительность труда рабочих основания", tier: "P1", unit: "m2_man_hour", minimum: Number.EPSILON },
  geotextile_required: { labelRu: "Требуется геотекстиль или геосетка по проекту", tier: "P1", allowedValues: [true, false] },
  geotextile_type: { labelRu: "Тип и марка геотекстиля или геосетки по проекту", tier: "P1" },
  geotextile_overlap_percent: { labelRu: "Запас на нахлёсты геотекстиля по раскладке", tier: "P1", unit: "percent", minimum: 0, maximum: 50 },
  curb_bedding_concrete_m3_per_m: { labelRu: "Расход бетона подготовки на 1 м бордюра по узлу", tier: "P1", unit: "m3_m", minimum: Number.EPSILON },
  curb_haunch_concrete_m3_per_m: { labelRu: "Расход бетона обоймы на 1 м бордюра по узлу", tier: "P1", unit: "m3_m", minimum: Number.EPSILON },
  curb_joint_material_kg_per_m: { labelRu: "Расход материала швов бордюра по спецификации", tier: "P1", unit: "kg_m", minimum: Number.EPSILON },
  curb_installation_m_per_man_hour: { labelRu: "Нормативная производительность труда установки бордюра", tier: "P1", unit: "m_man_hour", minimum: Number.EPSILON },
  curb_excavator_m_per_machine_hour: { labelRu: "Производительность экскаватора на бордюрной траншее", tier: "P1", unit: "m_machine_hour", minimum: Number.EPSILON },
  curb_compactor_m_per_machine_hour: { labelRu: "Производительность уплотняющей машины бордюрного узла", tier: "P1", unit: "m_machine_hour", minimum: Number.EPSILON },
  drainage_pipe_length_m: { labelRu: "Проектная длина труб подключения водоотвода", tier: "P1", unit: "m", minimum: Number.EPSILON },
  drainage_bedding_m3_per_m: { labelRu: "Расход подготовки на 1 м водоотвода по узлу", tier: "P1", unit: "m3_m", minimum: Number.EPSILON },
  drainage_excavation_m3_per_m: { labelRu: "Объём траншеи на 1 м водоотвода по профилю", tier: "P1", unit: "m3_m", minimum: Number.EPSILON },
  drainage_installation_m_per_man_hour: { labelRu: "Нормативная производительность труда монтажа водоотвода", tier: "P1", unit: "m_man_hour", minimum: Number.EPSILON },
  drainage_excavator_m3_per_machine_hour: { labelRu: "Производительность экскаватора на траншее водоотвода", tier: "P1", unit: "m3_machine_hour", minimum: Number.EPSILON },
  marking_productivity_m2_per_man_hour: { labelRu: "Нормативная производительность труда разметочного звена", tier: "P1", unit: "m2_man_hour", minimum: Number.EPSILON },
  marking_machine_productivity_m2_per_machine_hour: { labelRu: "Производительность разметочной машины", tier: "P1", unit: "m2_machine_hour", minimum: Number.EPSILON },
  sign_post_count: { labelRu: "Количество стоек дорожных знаков по ПОДД", tier: "P1", unit: "pcs", minimum: 1, integer: true },
  sign_foundation_concrete_m3_per_post: { labelRu: "Расход бетона фундамента на одну стойку знака", tier: "P1", unit: "m3_pcs", minimum: Number.EPSILON },
  sign_installation_pcs_per_man_hour: { labelRu: "Нормативная производительность труда монтажа знаков", tier: "P1", unit: "pcs_man_hour", minimum: Number.EPSILON },
  sign_drill_pcs_per_machine_hour: { labelRu: "Производительность буровой машины для стоек знаков", tier: "P1", unit: "pcs_machine_hour", minimum: Number.EPSILON },
  lighting_foundation_concrete_m3: { labelRu: "Проектный объём бетона фундаментов опор освещения", tier: "P1", unit: "m3", minimum: Number.EPSILON },
  lighting_earthing_conductor_length_m: { labelRu: "Проектная длина заземляющего проводника", tier: "P1", unit: "m", minimum: Number.EPSILON },
  lighting_labor_man_hours: { labelRu: "Трудозатраты электромонтажного звена по норме или ППР", tier: "P1", unit: "man_hour", minimum: Number.EPSILON },
  lighting_crane_machine_hours: { labelRu: "Машино-часы автокрана по норме или ППР", tier: "P1", unit: "machine_hour", minimum: Number.EPSILON },
  lighting_test_count: { labelRu: "Количество электрических измерений и испытаний по программе", tier: "P1", unit: "test", minimum: 1, integer: true },
  bridge_deck_package_required: { labelRu: "Включить мостовую гидроизоляцию, защитный слой и сопряжения", tier: "P0", allowedValues: [true, false] },
  waterproofing_material_kg_m2: { labelRu: "Расход мостового гидроизоляционного материала по проекту", tier: "P0", unit: "kg_m2", minimum: Number.EPSILON },
  protective_layer_density_t_m3: { labelRu: "Плотность материала защитного слоя по паспорту", tier: "P0", unit: "t_m3", minimum: Number.EPSILON },
  expansion_joint_sealant_kg_m: { labelRu: "Расход герметика сопряжений у деформационных швов", tier: "P0", unit: "kg_m", minimum: Number.EPSILON },
  bridge_waterproofing_productivity_m2_per_man_hour: { labelRu: "Нормативная производительность труда гидроизоляционных работ", tier: "P0", unit: "m2_man_hour", minimum: Number.EPSILON },
  bridge_waterproofing_machine_productivity_m2_per_machine_hour: { labelRu: "Производительность установки нанесения мостовой гидроизоляции", tier: "P0", unit: "m2_machine_hour", minimum: Number.EPSILON },
  asphalt_removal_package_required: { labelRu: "Включить ресурсный пакет демонтажа асфальтобетона", tier: "P0", allowedValues: [true] },
  removal_labor_productivity_m2_per_man_hour: { labelRu: "Нормативная производительность труда демонтажного звена", tier: "P0", unit: "m2_man_hour", minimum: Number.EPSILON },
  removal_control_interval_m2_per_test: { labelRu: "Периодичность контроля границ, глубины и основания после удаления", tier: "P0", unit: "m2_test", minimum: Number.EPSILON },
  removal_documentation_count: { labelRu: "Количество комплектов исполнительной документации демонтажа", tier: "P0", unit: "document", minimum: 1, integer: true },
  milling_productivity_m3_per_machine_hour: { labelRu: "Производительность дорожной фрезы по ППР", tier: "P0", unit: "m3_machine_hour", minimum: Number.EPSILON },
  breakout_productivity_m3_per_machine_hour: { labelRu: "Производительность механизированного разрушения покрытия", tier: "P0", unit: "m3_machine_hour", minimum: Number.EPSILON },
  manual_breakout_productivity_m3_per_machine_hour: { labelRu: "Производительность малой механизации ручного демонтажа", tier: "P0", unit: "m3_machine_hour", minimum: Number.EPSILON },
  combined_removal_productivity_m3_per_machine_hour: { labelRu: "Производительность комбинированного демонтажного комплекта", tier: "P0", unit: "m3_machine_hour", minimum: Number.EPSILON },
  loader_productivity_t_per_machine_hour: { labelRu: "Производительность погрузчика снятого асфальтобетона", tier: "P0", unit: "t_machine_hour", minimum: Number.EPSILON },
  dust_suppression_water_l_m2: { labelRu: "Расход воды на пылеподавление по экологическому плану", tier: "P1", unit: "l_m2", minimum: Number.EPSILON },
  base_cleaning_productivity_m2_per_man_hour: { labelRu: "Нормативная производительность труда очистки вскрытого основания", tier: "P0", unit: "m2_man_hour", minimum: Number.EPSILON },
  boundary_cut_consumable_kg_m: { labelRu: "Расход материалов резки на 1 м границы", tier: "P1", unit: "kg_m", minimum: Number.EPSILON },
  boundary_cut_productivity_m_per_man_hour: { labelRu: "Нормативная производительность труда резки границ", tier: "P1", unit: "m_man_hour", minimum: Number.EPSILON },
  boundary_saw_productivity_m_per_machine_hour: { labelRu: "Производительность нарезчика швов", tier: "P1", unit: "m_machine_hour", minimum: Number.EPSILON },
  connection_width_m: { labelRu: "Ширина примыкания заезда", tier: "P0", unit: "m", minimum: Number.EPSILON },
  old_pavement_removal_required: { labelRu: "Требуется снять старое покрытие", tier: "P1", allowedValues: [true, false] },
  milling_required: { labelRu: "Требуется фрезерование существующего покрытия", tier: "P1", allowedValues: [true, false] },
  milling_depth_mm: { labelRu: "Глубина фрезерования перед устройством слоя", tier: "P1", unit: "mm", minimum: 1 },
  defect_repair_required: { labelRu: "Требуется ремонт дефектов перед укладкой", tier: "P1", allowedValues: [true, false] },
  repair_method: { labelRu: "Метод ямочного ремонта", tier: "P0", allowedValues: ["SAW_CUT_AND_REPLACE", "MILL_AND_REPLACE", "INFRARED_REPAIR", "PROJECT_SPECIFIED"] },
  boundary_cut_required: { labelRu: "Требуется резка границ карт ремонта или демонтажа", tier: "P1", allowedValues: [true, false] },
  waterproofing_type: { labelRu: "Тип гидроизоляции мостового полотна", tier: "P0", allowedValues: ["ROLLED", "MASTIC", "SPRAY_APPLIED", "PROJECT_SPECIFIED"] },
  waterproofing_condition: { labelRu: "Состояние гидроизоляции", tier: "P0", allowedValues: ["ACCEPTED", "LOCAL_REPAIR_REQUIRED", "REPLACEMENT_REQUIRED"] },
  waterproofing_repair_area_m2: { labelRu: "Площадь ремонта или замены гидроизоляции", tier: "P1", unit: "m2", minimum: Number.EPSILON },
  waterproofing_primer_rate_l_m2: { labelRu: "Проектный расход грунтовочного состава гидроизоляции", tier: "P1", unit: "l_m2", minimum: 0.01, maximum: 5 },
  protective_layer_thickness_mm: { labelRu: "Толщина защитного слоя мостового полотна", tier: "P0", unit: "mm", minimum: 10 },
  expansion_joint_length_m: { labelRu: "Длина сопряжений у деформационных швов", tier: "P1", unit: "m", minimum: Number.EPSILON },
  number_of_compaction_passes: { labelRu: "Количество проходов катка по проекту уплотнения", tier: "P1", unit: "pcs", integer: true, minimum: 1 },
  edge_treatment_length_m: { labelRu: "Длина кромок и сопряжений", tier: "P1", unit: "m", minimum: Number.EPSILON },
});

type ExactParameterSet = {
  values: Record<string, unknown>;
  missingRequired: string[];
  missingNormative: string[];
  assumptionKeys: string[];
};

type ExactBoqSeed = {
  rowId: string;
  itemType: ConsumerRepairItemType;
  titleRu: string;
  quantity: number;
  unit: string;
  category: string;
  formulaId: string;
  quantityFormula: string;
  calculationTrace: string;
  affectedBy: readonly string[];
  semanticOwner: string;
  phaseOwner: "PHASE_1_DEMOLITION" | "PHASE_2_BASE_INSPECTION_OR_REPAIR" | "PHASE_2_INSTALLATION" | "PHASE_3_REINSTATEMENT" | "SINGLE_OPERATION";
  includedInProcurement: boolean;
  materialKey?: string | null;
  inclusionCondition?: string;
  rounding?: string;
  formulaInputValues?: Readonly<Record<string, number>>;
  costOwnership?: string;
  costOwnerId?: string;
  normativeSourceIds?: readonly string[];
  parameterSourceIds?: readonly string[];
  childPassportId?: string | null;
  childRevisionId?: string | null;
  scopeTriggerParameter?: string | null;
  assumptionIds?: readonly string[];
};

function explicitOverride(input: BuildEstimateFromInlineWorkPromptInput, key: string): unknown {
  const override = input.paramOverrides?.[key];
  if (!override || override.source === "default_assumption") return undefined;
  return override.value;
}

function numberFromRawInput(text: string, patterns: readonly RegExp[]): number | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const value = Number(match[1].replace(/\s/g, "").replace(",", "."));
    if (Number.isFinite(value) && value > 0) return value;
  }
  return undefined;
}

function rawDimensions(text: string): { length: number; width: number } | undefined {
  const dimensions = text.match(/(\d+(?:[.,]\d+)?)\s*(?:м)?\s*[xх×*]\s*(\d+(?:[.,]\d+)?)\s*м/iu);
  if (!dimensions?.[1] || !dimensions[2]) return undefined;
  const length = Number(dimensions[1].replace(",", "."));
  const width = Number(dimensions[2].replace(",", "."));
  return Number.isFinite(length) && Number.isFinite(width) && length > 0 && width > 0
    ? { length, width }
    : undefined;
}

function rawArea(text: string): number | undefined {
  const directArea = numberFromRawInput(text, [
    /(\d[\d\s]*(?:[.,]\d+)?)\s*(?:м2|м²|кв(?:адратн\p{L}*)?\s*м)/iu,
    /площад\p{L}*\s*(?:—|:|=)?\s*(\d[\d\s]*(?:[.,]\d+)?)/iu,
  ]);
  if (directArea) return directArea;
  const dimensions = rawDimensions(text);
  return dimensions ? round(dimensions.length * dimensions.width) : undefined;
}

function rawDepth(text: string): number | undefined {
  return numberFromRawInput(text, [
    /(?:глубин\p{L}*|снят\p{L}*|фрезер\p{L}*)\s*(?:—|:|=)?\s*(\d+(?:[.,]\d+)?)\s*мм/iu,
    /(?:толщин\p{L}*\s+удален\p{L}*)\s*(?:—|:|=)?\s*(\d+(?:[.,]\d+)?)\s*мм/iu,
  ]);
}

function inferredString(input: BuildEstimateFromInlineWorkPromptInput, key: string): string | undefined {
  const explicit = explicitOverride(input, key);
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
  const text = input.rawInput.toLocaleLowerCase("ru-RU");
  if (key === "removal_method") {
    if (/фрезер|milling/.test(text)) return "COLD_MILLING";
    if (/ручн/.test(text)) return "MANUAL_BREAKOUT";
    if (/комбинирован/.test(text)) return "COMBINED";
    if (/механическ|breakout/.test(text)) return "MECHANICAL_BREAKOUT";
  }
  if (key === "removal_extent") {
    if (/частичн/.test(text)) return "PARTIAL";
    if (/полн\p{L}*\s+(?:демонтаж|снят|удален)/u.test(text)) return "FULL";
  }
  if (key === "material_destination") {
    if (/переработ|recycl/.test(text)) return "RECYCLING";
    if (/возвратн|повторн\p{L}*\s+использ/u.test(text)) return "RECOVERED_MATERIAL";
    if (/временн\p{L}*\s+склад/u.test(text)) return "TEMPORARY_STORAGE";
    if (/утилиз|полигон|disposal/.test(text)) return "DISPOSAL";
  }
  if (key === "work_scope") {
    if (/восстанов|заново\s+улож|reinstate/.test(text)) return "DEMOLITION_AND_REINSTATEMENT";
  }
  return undefined;
}

function parameterValue(input: BuildEstimateFromInlineWorkPromptInput, key: string): unknown {
  const direct = explicitOverride(input, key);
  if (direct !== undefined && direct !== null && direct !== "") return direct;
  if (key === "area_m2" || key === "removal_area_m2") {
    const counterpart = key === "area_m2" ? "removal_area_m2" : "area_m2";
    const other = explicitOverride(input, counterpart);
    const length = explicitOverride(input, "length_m");
    const width = explicitOverride(input, "width_m");
    const derivedArea = typeof length === "number" && typeof width === "number" && length > 0 && width > 0
      ? round(length * width)
      : undefined;
    return other ?? derivedArea ?? rawArea(input.rawInput);
  }
  if (key === "length_m") return rawDimensions(input.rawInput)?.length;
  if (key === "width_m") return rawDimensions(input.rawInput)?.width;
  if (key === "removal_depth_mm") return rawDepth(input.rawInput);
  if (key === "haul_required") {
    const text = input.rawInput.toLocaleLowerCase("ru-RU");
    if (/без\s+вывоз|вывоз\s+не\s+треб|no\s+haul/u.test(text)) return false;
    if (/(?:^|\s)вывоз\p{L}*|транспортирован|haul/u.test(text)) return true;
  }
  return inferredString(input, key);
}

function validParameter(key: string, value: unknown): boolean {
  const metadata = ASPHALT_RELATED_PARAMETER_METADATA_V4[key];
  if (metadata?.allowedValues) return metadata.allowedValues.includes(value as never);
  if (typeof value === "number") {
    if (!Number.isFinite(value) || (metadata?.minimum === 0 ? value < 0 : value <= 0)) return false;
    if (metadata?.minimum != null && value < metadata.minimum) return false;
    if (metadata?.maximum != null && value > metadata.maximum) return false;
    if (metadata?.integer && !Number.isInteger(value)) return false;
    return true;
  }
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "boolean") return value;
  return false;
}

function extractParameters(
  input: BuildEstimateFromInlineWorkPromptInput,
  profile: AsphaltRelatedProfileV4,
): ExactParameterSet {
  const parameterKeys = asphaltRelatedParameterKeysForProfileV4(profile);
  const values = Object.fromEntries(parameterKeys.map((key) => [key, parameterValue(input, key)]));
  for (const key of [
    "asphalt_reference_design_id", "asphalt_reference_design_sha256",
    "asphalt_reference_design_manifest", "asphalt_reference_design_fingerprint",
  ] as const) {
    const value = explicitOverride(input, key);
    if (typeof value === "string" && value.trim()) values[key] = value;
  }
  if ([
    "FULL_DEPTH_DEMOLITION", "PARTIAL_DEPTH_MILLING", "PARTIAL_DEPTH_REMOVAL", "COLD_MILLING",
    "LOCAL_BREAKUP", "MECHANICAL_BREAKOUT", "REMOVE_AND_HAUL", "RECYCLE_OR_REGENERATE",
  ].includes(profile.operationClass)) {
    values.asphalt_removal_package_required = true;
  }
  if (profile.canonicalWorkKey === "asphalt_milling") {
    values.removal_method = "COLD_MILLING";
  }
  const reinstate = values.work_scope === "DEMOLITION_AND_REINSTATEMENT";
  const reinstatementRequired = reinstate ? ["reinstatement_depth_mm", "new_asphalt_density_t_m3"] : [];
  const haulRequired = values.haul_required === true;
  const haulParameters = haulRequired ? ["haul_distance_km", "truck_payload_t"] : [];
  const partialAreaParameters = values.removal_extent === "PARTIAL"
    ? ["total_area_m2", "removal_share"]
    : [];
  const structureConditionalParameters = [
    ...(values.tack_coat_required === true ? ["tack_coat_rate_l_m2"] : []),
    ...(values.binder_layer_required === true ? ["binder_layer_thickness_mm", "binder_mix_type"] : []),
    ...(values.base_construction_required === true
      ? ["base_layer_thickness_mm", "base_material_type", "base_material_compaction_factor"]
      : []),
    ...(values.subbase_required === true
      ? ["subbase_layer_thickness_mm", "subbase_material_type", "subbase_material_compaction_factor"]
      : []),
    ...(values.base_condition === "LOCAL_REPAIR_REQUIRED"
      ? ["base_repair_area_m2", "base_layer_thickness_mm", "base_material_type", "base_material_compaction_factor"]
      : []),
    ...(values.curb_required === true ? ["curb_length_m", "curb_type"] : []),
    ...(values.drainage_required === true
      ? [
        "drainage_type",
        values.drainage_type === "POINT_INLETS" ? "drainage_inlet_count" : "drainage_length_m",
      ]
      : []),
    ...(values.marking_required === true
      ? ["marking_area_m2", "marking_material_type", "marking_material_rate_kg_m2", "marking_glass_beads_required"]
      : []),
    ...(values.marking_glass_beads_required === true ? ["marking_glass_beads_rate_kg_m2"] : []),
    ...(values.accessible_parking_required === true ? [
      "accessible_space_count", "accessible_sign_count", "accessible_sign_post_count",
      "accessible_symbol_area_m2",
    ] : []),
    ...(values.parking_geometry_required === true
      ? ["parking_space_count", "parking_aisle_length_m", "parking_entry_exit_count"]
      : []),
    ...(values.signing_required === true ? ["sign_count"] : []),
    ...(values.lighting_required === true
      ? ["lighting_pole_count", "lighting_luminaire_count", "lighting_cable_length_m", "lighting_cabinet_count"]
      : []),
    ...(values.waterproofing_condition === "LOCAL_REPAIR_REQUIRED" || values.waterproofing_condition === "REPLACEMENT_REQUIRED"
      ? ["waterproofing_repair_area_m2", "waterproofing_primer_rate_l_m2"]
      : []),
    ...(values.milling_required === true ? ["milling_depth_mm", "number_of_passes"] : []),
    ...(values.boundary_cut_required === true ? ["boundary_cut_length_m"] : []),
  ].filter((key) => parameterKeys.includes(key));
  const installation = ![
    "FULL_DEPTH_DEMOLITION",
    "PARTIAL_DEPTH_MILLING",
    "PARTIAL_DEPTH_REMOVAL",
    "COLD_MILLING",
    "LOCAL_BREAKUP",
    "MECHANICAL_BREAKOUT",
    "REMOVE_AND_HAUL",
  ].includes(profile.operationClass);
  const reinstatement = profile.canonicalWorkKey === "asphalt_demolition" && values.work_scope === "DEMOLITION_AND_REINSTATEMENT";
  const installationAssemblyRequired = installation || reinstatement;
  const fullScope = values.estimate_scope_mode === "FULL_APPLICABLE_SCOPE";
  const broadScopeConfirmation = installation && ["PARKING", "YARD_OR_SITE"].includes(profile.applicationContext)
    ? ["project_scope"]
    : [];
  const minimalResourceKeys = installationAssemblyRequired ? [...ASPHALT_MINIMAL_RESOURCE_REQUIRED_KEYS_V4] : [];
  const fullScopeDecisionKeys = installationAssemblyRequired && fullScope
    ? [
      "sand_layer_required", "crushed_layer_count", "geotextile_required", "curb_required", "drainage_required",
      "marking_required", "signing_required", "lighting_required",
      ...(profile.applicationContext === "PARKING" ? ["parking_geometry_required", "accessible_parking_required"] : []),
      ...(profile.applicationContext === "BRIDGE_OR_STRUCTURE" ? ["bridge_deck_package_required"] : []),
    ].filter((key) => parameterKeys.includes(key))
    : [];
  const fullStructureKeys = installationAssemblyRequired && fullScope
    ? [
      ...(values.sand_layer_required === true
        ? ["sand_thickness_mm", "sand_compaction_factor", "sand_waste_percent", "sand_density_t_m3", "aggregate_source_distance_km"]
        : []),
      ...(typeof values.crushed_layer_count === "number" && values.crushed_layer_count > 0
        ? ["crushed_layer_1_fraction", "crushed_layer_1_thickness_mm", "crushed_layer_1_compaction_factor", "crushed_layer_1_waste_percent", "crushed_density_t_m3", "crushed_water_rate_m3_m3", "base_density_test_interval_m2", "grader_productivity_m2_per_machine_hour", "aggregate_source_distance_km"]
        : []),
      ...(typeof values.crushed_layer_count === "number" && values.crushed_layer_count > 1
        ? ["crushed_layer_2_fraction", "crushed_layer_2_thickness_mm", "crushed_layer_2_compaction_factor", "crushed_layer_2_waste_percent"]
        : []),
      ...(values.geotextile_required === true ? ["geotextile_type", "geotextile_overlap_percent"] : []),
    ]
    : [];
  const childProjectKeys = installationAssemblyRequired && fullScope
    ? [
      ...(values.curb_required === true ? ["curb_length_m"] : []),
      ...(values.drainage_required === true ? ["drainage_length_m", "drainage_inlet_count", "drainage_pipe_length_m"] : []),
      ...(values.marking_required === true ? ["marking_area_m2"] : []),
      ...(values.signing_required === true ? ["sign_count", "sign_post_count"] : []),
      ...(values.lighting_required === true ? ["lighting_pole_count", "lighting_luminaire_count", "lighting_cable_length_m", "lighting_cabinet_count", "lighting_foundation_concrete_m3", "lighting_earthing_conductor_length_m", "lighting_test_count"] : []),
      ...(values.accessible_parking_required === true
        ? ["accessible_space_count", "accessible_sign_count", "accessible_sign_post_count", "accessible_symbol_area_m2"]
        : []),
      ...(values.parking_geometry_required === true
        ? ["parking_space_count", "parking_aisle_length_m", "parking_entry_exit_count"]
        : []),
      ...(profile.applicationContext === "BRIDGE_OR_STRUCTURE" && values.bridge_deck_package_required === true
        ? ["waterproofing_repair_area_m2", "protective_layer_thickness_mm", "expansion_joint_length_m"]
        : []),
    ]
    : profile.applicationContext === "BRIDGE_OR_STRUCTURE" && values.bridge_deck_package_required === true
      ? ["waterproofing_repair_area_m2", "protective_layer_thickness_mm", "expansion_joint_length_m"]
      : [];
  const normativeKeys = installationAssemblyRequired
    ? [
      "asphalt_waste_percent", "base_emulsion_rate_l_m2", "surface_cleaner_productivity_m2_per_machine_hour",
      "bitumen_distributor_productivity_m2_per_machine_hour", "paver_productivity_m2_per_machine_hour",
      "roller_productivity_m2_per_machine_hour", "pneumatic_roller_productivity_m2_per_machine_hour",
      "road_worker_productivity_m2_per_man_hour", "truck_average_speed_km_per_machine_hour",
      "truck_turnaround_machine_hours", "incoming_control_interval_m2_per_test",
      "compaction_control_interval_m2_per_test", "core_sampling_interval_m2_per_test",
      "laboratory_test_interval_m2_per_test", "temperature_control_trips_per_test",
      "smoothness_control_interval_m2_per_test", "thickness_control_interval_m2_per_test",
      ...(fullScope && (values.sand_layer_required === true || (typeof values.crushed_layer_count === "number" && values.crushed_layer_count > 0))
        ? ["base_worker_productivity_m2_per_man_hour", "base_roller_productivity_m2_per_machine_hour", "water_truck_productivity_m2_per_machine_hour"]
        : []),
      ...(fullScope && values.sand_layer_required === true ? ["sand_water_rate_m3_m3"] : []),
      ...(fullScope && values.curb_required === true ? ["curb_bedding_concrete_m3_per_m", "curb_haunch_concrete_m3_per_m", "curb_joint_material_kg_per_m", "curb_installation_m_per_man_hour", "curb_excavator_m_per_machine_hour", "curb_compactor_m_per_machine_hour"] : []),
      ...(fullScope && values.drainage_required === true ? ["drainage_bedding_m3_per_m", "drainage_excavation_m3_per_m", "drainage_installation_m_per_man_hour", "drainage_excavator_m3_per_machine_hour"] : []),
      ...(fullScope && values.marking_required === true ? ["marking_material_rate_kg_m2", "marking_glass_beads_rate_kg_m2", "marking_productivity_m2_per_man_hour", "marking_machine_productivity_m2_per_machine_hour"] : []),
      ...(fullScope && values.signing_required === true ? ["sign_foundation_concrete_m3_per_post", "sign_installation_pcs_per_man_hour", "sign_drill_pcs_per_machine_hour"] : []),
      ...(fullScope && values.lighting_required === true ? ["lighting_labor_man_hours", "lighting_crane_machine_hours"] : []),
      ...(fullScope && values.accessible_parking_required === true ? [
        "accessible_sign_foundation_concrete_m3_per_post", "accessible_symbol_compound_kg_m2",
        "accessible_symbol_beads_kg_m2", "accessible_marking_productivity_m2_per_man_hour",
        "accessible_sign_installation_pcs_per_man_hour", "accessible_sign_drill_pcs_per_machine_hour",
        "accessible_marking_machine_productivity_m2_per_machine_hour",
      ] : []),
      ...(fullScope && values.parking_geometry_required === true ? [
        "parking_layout_consumable_kg_per_space", "parking_layout_productivity_space_per_man_hour",
        "parking_survey_productivity_space_per_machine_hour", "parking_geometry_control_interval_m2_per_test",
      ] : []),
      ...(profile.applicationContext === "BRIDGE_OR_STRUCTURE" && values.bridge_deck_package_required === true
        ? ["waterproofing_material_kg_m2", "waterproofing_primer_rate_l_m2", "protective_layer_density_t_m3", "expansion_joint_sealant_kg_m", "bridge_waterproofing_productivity_m2_per_man_hour", "bridge_waterproofing_machine_productivity_m2_per_machine_hour"]
        : []),
      ...(reinstatement ? [
        "removal_labor_productivity_m2_per_man_hour",
        ...(values.removal_method === "COLD_MILLING" ? ["milling_productivity_m3_per_machine_hour"] : []),
        ...(values.removal_method === "MECHANICAL_BREAKOUT" ? ["breakout_productivity_m3_per_machine_hour"] : []),
        ...(values.removal_method === "MANUAL_BREAKOUT" ? ["manual_breakout_productivity_m3_per_machine_hour"] : []),
        ...(values.removal_method === "COMBINED" ? ["combined_removal_productivity_m3_per_machine_hour"] : []),
        ...(values.loading_required === true ? ["loader_productivity_t_per_machine_hour"] : []),
        ...(values.base_cleaning_required === true ? ["base_cleaning_productivity_m2_per_man_hour", "surface_cleaner_productivity_m2_per_machine_hour"] : []),
        ...(values.dust_suppression_required === true ? ["dust_suppression_water_l_m2", "water_truck_productivity_m2_per_machine_hour"] : []),
        ...(values.boundary_cut_required === true ? ["boundary_cut_consumable_kg_m", "boundary_cut_productivity_m_per_man_hour", "boundary_saw_productivity_m_per_machine_hour"] : []),
      ] : []),
    ]
    : [
      "removal_labor_productivity_m2_per_man_hour",
      ...(values.removal_method === "COLD_MILLING" ? ["milling_productivity_m3_per_machine_hour"] : []),
      ...(values.removal_method === "MECHANICAL_BREAKOUT" ? ["breakout_productivity_m3_per_machine_hour"] : []),
      ...(values.removal_method === "MANUAL_BREAKOUT" ? ["manual_breakout_productivity_m3_per_machine_hour"] : []),
      ...(values.removal_method === "COMBINED" ? ["combined_removal_productivity_m3_per_machine_hour"] : []),
      ...(values.loading_required === true ? ["loader_productivity_t_per_machine_hour"] : []),
      ...(values.base_cleaning_required === true ? ["base_cleaning_productivity_m2_per_man_hour", "surface_cleaner_productivity_m2_per_machine_hour"] : []),
      ...(values.dust_suppression_required === true ? ["dust_suppression_water_l_m2", "water_truck_productivity_m2_per_machine_hour"] : []),
      ...(values.boundary_cut_required === true ? ["boundary_cut_consumable_kg_m", "boundary_cut_productivity_m_per_man_hour", "boundary_saw_productivity_m_per_machine_hour"] : []),
    ];
  const normativeKeySet = new Set(normativeKeys);
  const missingRequired = [
    ...profile.requiredParameters,
    ...(profile.canonicalWorkKey === "asphalt_demolition" ? ["work_scope"] : []),
    ...(reinstatement ? ["wearing_mix_type", "prepared_base_confirmed"] : []),
    "estimate_scope_mode",
    ...broadScopeConfirmation,
    ...haulParameters,
    ...reinstatementRequired,
    ...partialAreaParameters,
    ...structureConditionalParameters,
    ...minimalResourceKeys.filter((key) => !normativeKeySet.has(key)),
    ...fullScopeDecisionKeys,
    ...fullStructureKeys.filter((key) => !normativeKeySet.has(key)),
    ...childProjectKeys,
    ...(!installation ? [
      "removal_control_interval_m2_per_test",
      "removal_documentation_count",
      ...(fullScope ? ["dust_suppression_required", "boundary_cut_required"] : []),
      ...(values.haul_required === true ? ["truck_average_speed_km_per_machine_hour", "truck_turnaround_machine_hours"] : []),
    ] : []),
  ]
    .filter((key, index, all) => all.indexOf(key) === index && !validParameter(key, values[key]));
  const missingNormative = normativeKeys
    .filter((key, index, all) => all.indexOf(key) === index && !validParameter(key, values[key]));
  return {
    values,
    missingRequired,
    missingNormative,
    assumptionKeys: [...missingRequired, ...missingNormative],
  };
}

function positiveNumber(values: Record<string, unknown>, key: string): number {
  const value = values[key];
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function itemTypeForCoreRow(row: AsphaltRelatedCoreRowV4): ConsumerRepairItemType {
  if (row.category === "material") return "material";
  if (row.category === "work" || row.category === "labor" || row.category === "temporary_work") return "work";
  if (row.category === "documentation") return "document";
  return "service";
}

function coreRowsToSeeds(rows: readonly AsphaltRelatedCoreRowV4[]): ExactBoqSeed[] {
  return rows.map((row) => ({
    rowId: row.rowId,
    itemType: itemTypeForCoreRow(row),
    titleRu: row.titleRu,
    quantity: row.quantity,
    unit: row.unit,
    category: row.category,
    formulaId: row.formulaId,
    quantityFormula: row.formulaExpression,
    calculationTrace: row.calculationTrace,
    affectedBy: Object.keys(row.formulaInputValues),
    semanticOwner: row.semanticOwner,
    phaseOwner: "PHASE_2_INSTALLATION",
    includedInProcurement: row.includedInProcurement,
    materialKey: row.category === "material" ? row.semanticOwner : null,
    inclusionCondition: row.scopeTriggerParameter
      ? `${row.scopeTriggerParameter}=true; typed child assembly ${row.childPassportId}`
      : "EXACT_ASPHALT_CORE_RESOURCE_ASSEMBLY",
    rounding: "ROUND_HALF_UP_6",
    formulaInputValues: row.formulaInputValues,
    costOwnership: row.costOwnership,
    costOwnerId: row.costOwnerId,
    normativeSourceIds: row.normativeSourceIds,
    parameterSourceIds: row.parameterSourceIds,
    childPassportId: row.childPassportId,
    childRevisionId: row.childRevisionId,
    scopeTriggerParameter: row.scopeTriggerParameter,
    assumptionIds: row.assumptionIds,
  }));
}

function asphaltStageIdForRowV1(workKey: string, rowId: string, category: string): string {
  const id = rowId.toLocaleLowerCase("en-US");
  let stage = "TECHNOLOGICAL_OPERATION";
  if (/removal:survey_scope/u.test(id)) stage = "EXISTING_PAVEMENT_SURVEY";
  else if (/(?:^|:)parking_geometry:|parking_scope_acceptance/u.test(id)) stage = "PARKING_GEOMETRY_AND_MANOEUVRING";
  else if (/initial_data|field_site_survey|geodetic|setting_out|axes_marks/u.test(id)) stage = "SURVEY_AND_LAYOUT";
  else if (/mobilization|work_zone|temporary_/u.test(id)) stage = "TEMPORARY_AND_PROTECTIVE_WORKS";
  else if (/removal:(?:volume|mechanical|manual|combined|material_stream)/u.test(id)) stage = "PAVEMENT_REMOVAL";
  else if (/removal:(?:loading|haul|destination)|soil_(?:loading|movement|haul|trips|disposal)/u.test(id)) stage = "WASTE_AND_EARTH_LOGISTICS";
  else if (/removal:dust/u.test(id)) stage = "DUST_SUPPRESSION";
  else if (/removal:base_cleaning/u.test(id)) stage = "BASE_CLEANING";
  else if (/removal:boundary/u.test(id)) stage = "BOUNDARY_CUTTING";
  else if (/site_clear|site_prepar|topsoil|subgrade|earthwork|\bsoil_/u.test(id)) stage = "EARTHWORK_AND_SUBGRADE";
  else if (/sand_|crushed_|geotextile|base_emulsion|\bbase_/u.test(id)) stage = "SUBBASE_AND_BASE";
  else if (/curb/u.test(id)) stage = "CURBS";
  else if (/drainage|storm_/u.test(id)) stage = "DRAINAGE";
  else if (/(?:^|:)accessible:|accessible_/u.test(id)) stage = "ACCESSIBLE_PARKING";
  else if (/marking/u.test(id)) stage = "ROAD_MARKING";
  else if (/\bsign[:_]|traffic_sign/u.test(id)) stage = "ROAD_SIGNS";
  else if (/lighting|power_cable|grounding/u.test(id)) stage = "OUTDOOR_LIGHTING";
  else if (/asphalt|emulsion|joint|paver|roller|road_worker/u.test(id)) stage = "ASPHALT_PAVEMENT";
  else if (/delivery|trip|transport|dump_truck|haul/u.test(id)) stage = "MATERIAL_LOGISTICS";
  else if (/documentation|document|protocol|passport|register/u.test(id) || category === "documentation") stage = "EXECUTION_DOCUMENTATION";
  else if (/test|control|sampling|survey|acceptance/u.test(id) || category === "testing") stage = "QUALITY_CONTROL_AND_TESTING";
  else if (category === "labor") stage = "DIRECT_LABOR";
  else if (category === "machinery") stage = "CONSTRUCTION_MACHINERY";
  else if (category === "material" || category === "equipment") stage = "MATERIALS_AND_EQUIPMENT";
  return `asphalt:${workKey}:${stage.toLocaleLowerCase("en-US")}`;
}

export type AsphaltRelatedResolvedOperationClassV4 =
  | AsphaltRelatedOperationClassV4
  | "PARTIAL_DEPTH_REMOVAL"
  | "COLD_MILLING"
  | "LOCAL_BREAKUP"
  | "DEMOLITION_AND_REINSTATEMENT";

export function resolveAsphaltRelatedOperationClassV4(
  profile: AsphaltRelatedProfileV4,
  values: Readonly<Record<string, unknown>>,
): AsphaltRelatedResolvedOperationClassV4 {
  if (values.work_scope === "DEMOLITION_AND_REINSTATEMENT") {
    return "DEMOLITION_AND_REINSTATEMENT";
  }
  if (profile.canonicalWorkKey === "asphalt_milling" || values.removal_method === "COLD_MILLING") {
    return "COLD_MILLING";
  }
  if (profile.canonicalWorkKey === "asphalt_demolition" && values.removal_extent === "PARTIAL") {
    return values.removal_method === "MANUAL_BREAKOUT" || values.removal_method === "MECHANICAL_BREAKOUT"
      ? "LOCAL_BREAKUP"
      : "PARTIAL_DEPTH_REMOVAL";
  }
  return profile.operationClass;
}

function demolitionRows(
  profile: AsphaltRelatedProfileV4,
  values: Record<string, unknown>,
  resolvedOperationClass: AsphaltRelatedResolvedOperationClassV4,
): ExactBoqSeed[] {
  const totalArea = positiveNumber(values, "total_area_m2");
  const removalShare = positiveNumber(values, "removal_share");
  const partialArea = totalArea > 0 && removalShare > 0
    ? round(totalArea * removalShare)
    : 0;
  const area = (
    resolvedOperationClass === "PARTIAL_DEPTH_REMOVAL" || resolvedOperationClass === "LOCAL_BREAKUP"
  ) && partialArea > 0
    ? partialArea
    : positiveNumber(values, "removal_area_m2") || positiveNumber(values, "area_m2");
  const depthMm = positiveNumber(values, "removal_depth_mm");
  const depthM = depthMm / 1000;
  const density = positiveNumber(values, "existing_asphalt_density_t_m3") || positiveNumber(values, "asphalt_density_t_m3");
  const removedVolume = round(area * depthM);
  const removedMass = round(removedVolume * density);
  const haulDistance = positiveNumber(values, "haul_distance_km");
  const payload = positiveNumber(values, "truck_payload_t");
  const haulTkm = round(removedMass * haulDistance);
  const trips = payload > 0 ? Math.ceil(removedMass / payload) : 0;
  const contaminationReject = positiveNumber(values, "contamination_reject_t");
  const disposalLoss = positiveNumber(values, "disposal_loss_t");
  const recoveredMass = round(Math.max(0, removedMass - contaminationReject - disposalLoss));
  const boundary = positiveNumber(values, "boundary_cut_length_m");
  const numberOfPasses = positiveNumber(values, "number_of_passes");
  const method = String(values.removal_method ?? (resolvedOperationClass === "COLD_MILLING" ? "COLD_MILLING" : "UNCONFIRMED"));
  const destination = String(values.material_destination ?? "UNCONFIRMED");
  const haulRequired = values.haul_required === true;
  const removalTitle = resolvedOperationClass === "COLD_MILLING"
    ? "Холодное фрезерование асфальтобетонного покрытия"
    : resolvedOperationClass === "LOCAL_BREAKUP"
      ? "Локальная разборка асфальтобетонного покрытия"
      : resolvedOperationClass === "PARTIAL_DEPTH_REMOVAL"
        ? "Частичное снятие асфальтобетонного покрытия"
        : "Полный демонтаж асфальтобетонного покрытия";
  const primaryEquipmentTitle = resolvedOperationClass === "COLD_MILLING"
    ? "Дорожная фреза подтверждённого класса для снятия покрытия"
    : method === "MANUAL_BREAKOUT"
      ? "Компрессор для ручного отбойного инструмента"
      : "Экскаватор с навесным гидромолотом для разборки покрытия";
  const rows: ExactBoqSeed[] = [
    {
      rowId: `${profile.canonicalWorkKey}:survey_and_marking`, itemType: "work",
      titleRu: "Обследование, приёмка исходного покрытия и разметка границ удаления",
      quantity: area, unit: "m2", category: "work",
      formulaId: partialArea > 0 ? "effective_partial_removal_area_v1" : "confirmed_removal_area_v1",
      quantityFormula: partialArea > 0 ? "Q = total_area_m2 * removal_share" : "Q = removal_area_m2",
      calculationTrace: partialArea > 0
        ? `${totalArea} m2 * ${removalShare} = ${area} m2`
        : `removal_area_m2=${area}`,
      affectedBy: partialArea > 0 ? ["total_area_m2", "removal_share"] : ["removal_area_m2"],
      semanticOwner: "DEMOLITION_BOUNDARY_AND_SURVEY", phaseOwner: "PHASE_1_DEMOLITION", includedInProcurement: false,
    },
    ...(boundary > 0 ? ([{
      rowId: `${profile.canonicalWorkKey}:boundary_cutting`, itemType: "work" as const,
      titleRu: "Резка границ асфальтобетонного покрытия", quantity: boundary, unit: "m", category: "work",
      formulaId: "confirmed_boundary_cut_length_v1", quantityFormula: "Q = boundary_cut_length_m",
      calculationTrace: `boundary_cut_length_m=${boundary}`, affectedBy: ["boundary_cut_length_m"],
      semanticOwner: "DEMOLITION_BOUNDARY_CUTTING", phaseOwner: "PHASE_1_DEMOLITION" as const, includedInProcurement: false,
    }] satisfies ExactBoqSeed[]) : []),
    {
      rowId: `${profile.canonicalWorkKey}:removal`, itemType: "work",
      titleRu: removalTitle,
      quantity: removedVolume, unit: "m3", category: "work",
      formulaId: resolvedOperationClass === "COLD_MILLING" ? "milled_volume_geometry_v1" : "removed_volume_geometry_v1",
      quantityFormula: partialArea > 0
        ? "Q = total_area_m2 * removal_share * removal_depth_mm / 1000"
        : "Q = removal_area_m2 * removal_depth_mm / 1000",
      calculationTrace: `${area} m2 * ${depthMm} mm / 1000 = ${removedVolume} m3; method=${method}; passes=${numberOfPasses || "not_set"}`,
      affectedBy: [
        ...(partialArea > 0 ? ["total_area_m2", "removal_share"] : ["removal_area_m2"]),
        "removal_depth_mm",
        "removal_method",
        ...(resolvedOperationClass === "COLD_MILLING" ? ["number_of_passes"] : []),
      ],
      semanticOwner: resolvedOperationClass,
      phaseOwner: "PHASE_1_DEMOLITION", includedInProcurement: false,
    },
    {
      rowId: `${profile.canonicalWorkKey}:demolition_workers`, itemType: "work",
      titleRu: "Труд дорожных рабочих при разметке, разборке и очистке покрытия",
      quantity: 1, unit: "set", category: "labor",
      formulaId: "demolition_workers_scope_set_v3", quantityFormula: "Q = 1 состав звена на выбранный фронт; человеко-часы определяются нормой или ППР",
      calculationTrace: `one demolition-worker crew scope for ${removedVolume} m3; man-hours are not invented`,
      affectedBy: ["removal_area_m2", "removal_depth_mm", "removal_method"], semanticOwner: "DEMOLITION_WORKERS_SCOPE",
      phaseOwner: "PHASE_1_DEMOLITION", includedInProcurement: false,
    },
    {
      rowId: `${profile.canonicalWorkKey}:demolition_operators`, itemType: "work",
      titleRu: "Труд машинистов и операторов оборудования при снятии покрытия",
      quantity: 1, unit: "set", category: "labor",
      formulaId: "demolition_operators_scope_set_v3", quantityFormula: "Q = 1 состав операторов на выбранный фронт; человеко-часы определяются нормой или ППР",
      calculationTrace: `one demolition-operator scope for ${removedVolume} m3; method=${method}; operator-hours are not invented`,
      affectedBy: ["removal_area_m2", "removal_depth_mm", "removal_method"], semanticOwner: "DEMOLITION_OPERATORS_SCOPE",
      phaseOwner: "PHASE_1_DEMOLITION", includedInProcurement: false,
    },
    {
      rowId: `${profile.canonicalWorkKey}:primary_demolition_equipment`, itemType: "service",
      titleRu: primaryEquipmentTitle,
      quantity: 1, unit: "set", category: "equipment",
      formulaId: "primary_demolition_equipment_scope_set_v3", quantityFormula: "Q = 1 функциональный комплект; машино-часы определяются нормой или ППР",
      calculationTrace: `one primary-equipment scope for ${removedVolume} m3; method=${method}; machine-hours are not invented`,
      affectedBy: ["removal_area_m2", "removal_depth_mm", "removal_method"], semanticOwner: resolvedOperationClass === "COLD_MILLING" ? "ROAD_MILLING_MACHINE_SCOPE" : "PRIMARY_BREAKOUT_EQUIPMENT_SCOPE",
      phaseOwner: "PHASE_1_DEMOLITION", includedInProcurement: true,
    },
    ...(values.loading_required === true ? [{
      rowId: `${profile.canonicalWorkKey}:loader_equipment`, itemType: "service",
      titleRu: "Фронтальный погрузчик для сбора и погрузки снятого асфальтобетона",
      quantity: 1, unit: "set", category: "equipment",
      formulaId: "loader_equipment_scope_set_v2", quantityFormula: "Q = 1 функциональный комплект; машино-часы определяются нормой или ППР",
      calculationTrace: `one loader-equipment scope for ${removedMass} t; machine-hours are not invented`,
      affectedBy: ["removal_area_m2", "removal_depth_mm", "existing_asphalt_density_t_m3"], semanticOwner: "DEMOLITION_LOADER_EQUIPMENT_SCOPE",
      phaseOwner: "PHASE_1_DEMOLITION", includedInProcurement: true,
    }] satisfies ExactBoqSeed[] : []),
    {
      rowId: `${profile.canonicalWorkKey}:removed_material`, itemType: "other",
      titleRu: "Демонтированный асфальтобетон (поток возвратного материала/отхода)",
      quantity: removedMass, unit: "t", category: "recovered_material",
      formulaId: resolvedOperationClass === "COLD_MILLING" ? "milled_mass_geometry_density_v1" : "removed_mass_geometry_density_v1",
      quantityFormula: resolvedOperationClass === "COLD_MILLING"
        ? "Q = milled_volume_m3 * existing_asphalt_density_t_m3"
        : "Q = removed_volume_m3 * existing_asphalt_density_t_m3",
      calculationTrace: `${removedVolume} m3 * ${density} t/m3 = ${removedMass} t`,
      affectedBy: ["removal_area_m2", "removal_depth_mm", "existing_asphalt_density_t_m3"], semanticOwner: "RECOVERED_OR_WASTE_ASPHALT",
      phaseOwner: "PHASE_1_DEMOLITION", includedInProcurement: false, materialKey: null,
    },
    ...(values.loading_required === true ? [{
      rowId: `${profile.canonicalWorkKey}:loading`, itemType: "service",
      titleRu: "Погрузка демонтированного асфальтобетона", quantity: removedMass, unit: "t", category: "service",
      formulaId: "loading_mass_balance_v1", quantityFormula: "Q = removed_mass_t",
      calculationTrace: `loading_mass=${removedMass} t`, affectedBy: ["existing_asphalt_density_t_m3", "loading_required"], semanticOwner: "DEMOLITION_LOADING",
      phaseOwner: "PHASE_1_DEMOLITION", includedInProcurement: true,
    }] satisfies ExactBoqSeed[] : []),
    ...(haulRequired ? ([{
      rowId: `${profile.canonicalWorkKey}:haul_trucks`, itemType: "service",
      titleRu: "Парк самосвалов подтверждённой грузоподъёмности для вывоза снятого материала", quantity: 1, unit: "set", category: "equipment",
      formulaId: "haul_truck_fleet_scope_set_v2", quantityFormula: "Q = 1 функциональный парк; число рейсов рассчитано отдельной строкой",
      calculationTrace: `one haul-fleet scope for ${removedMass} t; payload=${payload} t; trips=${trips}`, affectedBy: ["truck_payload_t"],
      semanticOwner: "DEMOLITION_HAUL_TRUCK_SCOPE", phaseOwner: "PHASE_1_DEMOLITION" as const, includedInProcurement: true,
    }, {
      rowId: `${profile.canonicalWorkKey}:haul`, itemType: "service",
      titleRu: "Транспортная работа по вывозу демонтированного материала", quantity: haulTkm, unit: "t*km", category: "logistics",
      formulaId: "removed_material_haul_v1", quantityFormula: "Q = removed_mass_t * haul_distance_km",
      calculationTrace: `${removedMass} t * ${haulDistance} km = ${haulTkm} t*km`,
      affectedBy: ["existing_asphalt_density_t_m3", "haul_distance_km"], semanticOwner: "DEMOLITION_HAUL",
      phaseOwner: "PHASE_1_DEMOLITION" as const, includedInProcurement: true,
    }, {
      rowId: `${profile.canonicalWorkKey}:truck_trips`, itemType: "service",
      titleRu: "Рейсы транспорта для вывоза демонтированного материала", quantity: trips, unit: "pcs", category: "logistics",
      formulaId: "truck_trip_ceiling_v1", quantityFormula: "Q = ceil(removed_mass_t / truck_payload_t)",
      calculationTrace: `ceil(${removedMass} t / ${payload} t) = ${trips}`, affectedBy: ["truck_payload_t"],
      semanticOwner: "DEMOLITION_TRUCK_TRIPS", phaseOwner: "PHASE_1_DEMOLITION" as const, includedInProcurement: true,
    }] satisfies ExactBoqSeed[]) : []),
    {
      rowId: `${profile.canonicalWorkKey}:destination`, itemType: "service",
      titleRu: destination === "RECYCLING" || destination === "RECOVERED_MATERIAL"
        ? "Передача асфальтогранулята на переработку или повторное использование"
        : "Передача демонтированного материала на подтверждённую площадку обращения с отходами",
      quantity: recoveredMass, unit: "t", category: "waste_stream",
      formulaId: "recovered_material_mass_balance_v1",
      quantityFormula: "Q = removed_mass_t - contamination_reject_t - disposal_loss_t",
      calculationTrace: `${removedMass} - ${contaminationReject} - ${disposalLoss} = ${recoveredMass} t; destination=${destination}`,
      affectedBy: ["material_destination", "contamination_reject_t", "disposal_loss_t"], semanticOwner: "ASPHALT_MATERIAL_DESTINATION",
      phaseOwner: "PHASE_1_DEMOLITION", includedInProcurement: true,
    },
    ...(values.base_cleaning_required === true ? [{
      rowId: `${profile.canonicalWorkKey}:base_cleaning`, itemType: "work",
      titleRu: "Механизированная и ручная очистка основания после снятия покрытия", quantity: area, unit: "m2", category: "work",
      formulaId: "post_demolition_base_cleaning_area_v1", quantityFormula: "Q = removal_area_m2",
      calculationTrace: `cleaned_base_area=${area} m2`, affectedBy: ["removal_area_m2", "base_cleaning_required"],
      semanticOwner: "POST_DEMOLITION_BASE_CLEANING", phaseOwner: "PHASE_2_BASE_INSPECTION_OR_REPAIR", includedInProcurement: false,
    }] satisfies ExactBoqSeed[] : []),
    {
      rowId: `${profile.canonicalWorkKey}:base_acceptance`, itemType: "document",
      titleRu: "Осмотр и приёмка основания после снятия покрытия", quantity: area, unit: "m2", category: "quality_control",
      formulaId: "base_acceptance_area_v1", quantityFormula: "Q = removal_area_m2",
      calculationTrace: `accepted_base_area=${area} m2`, affectedBy: ["removal_area_m2", "base_condition_after_removal"],
      semanticOwner: "POST_DEMOLITION_BASE_ACCEPTANCE", phaseOwner: "PHASE_2_BASE_INSPECTION_OR_REPAIR", includedInProcurement: false,
    },
    {
      rowId: `${profile.canonicalWorkKey}:quantity_act`, itemType: "document",
      titleRu: "Акт освидетельствования и подтверждения объёмов снятого покрытия", quantity: 1, unit: "set", category: "documentation",
      formulaId: "demolition_quantity_act_set_v1", quantityFormula: "Q = 1 set",
      calculationTrace: "one traceable demolition quantity act", affectedBy: ["removal_area_m2", "removal_depth_mm"], semanticOwner: "DEMOLITION_QUANTITY_ACT",
      phaseOwner: "PHASE_1_DEMOLITION", includedInProcurement: false,
    },
    {
      rowId: `${profile.canonicalWorkKey}:material_movement_documents`, itemType: "document",
      titleRu: "Документы погрузки, перевозки и передачи возвратного материала или отхода", quantity: 1, unit: "set", category: "documentation",
      formulaId: "material_movement_document_set_v1", quantityFormula: "Q = 1 set",
      calculationTrace: `one material movement register; destination=${destination}`, affectedBy: ["material_destination", "haul_required"], semanticOwner: "DEMOLITION_MATERIAL_MOVEMENT_DOCUMENTS",
      phaseOwner: "PHASE_1_DEMOLITION", includedInProcurement: false,
    },
    {
      rowId: `${profile.canonicalWorkKey}:documentation`, itemType: "document",
      titleRu: "Исполнительная схема границ, отметок и состояния основания после демонтажа", quantity: 1, unit: "set", category: "documentation",
      formulaId: "demolition_as_built_document_set_v2", quantityFormula: "Q = 1 set",
      calculationTrace: "one traceable as-built demolition document set", affectedBy: ["cut_map_geometry"], semanticOwner: "DEMOLITION_AS_BUILT_DOCUMENTATION",
      phaseOwner: "PHASE_1_DEMOLITION", includedInProcurement: false,
    },
  ];
  if (values.work_scope === "DEMOLITION_AND_REINSTATEMENT") {
    const newDepthMm = positiveNumber(values, "reinstatement_depth_mm");
    const newDensity = positiveNumber(values, "new_asphalt_density_t_m3");
    rows.push(...compileInstallationBlueprintRows(profile, {
      ...values,
      area_m2: area,
      wearing_layer_thickness_mm: newDepthMm,
      asphalt_density_t_m3: newDensity,
      binder_layer_thickness_mm: 0,
    }).map((row) => ({ ...row, phaseOwner: "PHASE_2_INSTALLATION" as const })));
  }
  return rows;
}

function profileSpecificInstallationRows(
  profile: AsphaltRelatedProfileV4,
  values: Record<string, unknown>,
  area: number,
  phaseOwner: ExactBoqSeed["phaseOwner"],
): ExactBoqSeed[] {
  const seed = (input: Omit<ExactBoqSeed, "phaseOwner" | "includedInProcurement">): ExactBoqSeed => ({
    ...input,
    phaseOwner,
    includedInProcurement: false,
  });
  if (profile.canonicalWorkKey === "asphalt_parking_lot") {
    return [seed({
      rowId: `${profile.canonicalWorkKey}:parking_scope_acceptance`, itemType: "document",
      titleRu: "Подтверждение назначения парковки, класса нагрузки и состояния основания",
      quantity: area, unit: "m2", category: "quality_control", formulaId: "parking_scope_area_v1",
      quantityFormula: "Q = area_m2", calculationTrace: `parking_area=${area} m2; purpose=${String(values.parking_purpose)}; traffic=${String(values.traffic_class)}; base=${String(values.base_condition)}`,
      affectedBy: ["area_m2", "parking_purpose", "traffic_class", "base_condition"],
      semanticOwner: "PARKING_SCOPE_AND_TRAFFIC_ACCEPTANCE",
    })];
  }
  if (profile.canonicalWorkKey === "asphalt_driveway") {
    const connectionWidth = positiveNumber(values, "connection_width_m");
    return [seed({
      rowId: `${profile.canonicalWorkKey}:junction_preparation`, itemType: "work",
      titleRu: "Подготовка и обработка примыкания заезда к существующему покрытию",
      quantity: connectionWidth, unit: "m", category: "work", formulaId: "driveway_connection_width_v1",
      quantityFormula: "Q = connection_width_m", calculationTrace: `connection_width=${connectionWidth} m; vehicle=${String(values.vehicle_type)}; traffic=${String(values.traffic_class)}`,
      affectedBy: ["connection_width_m", "vehicle_type", "traffic_class", "base_condition"],
      semanticOwner: "DRIVEWAY_JUNCTION_PREPARATION",
    })];
  }
  if (profile.canonicalWorkKey === "asphalt_overlay") {
    return [seed({
      rowId: `${profile.canonicalWorkKey}:existing_surface_assessment`, itemType: "document",
      titleRu: "Обследование и приёмка существующей поверхности перед устройством overlay",
      quantity: area, unit: "m2", category: "quality_control", formulaId: "overlay_existing_surface_area_v1",
      quantityFormula: "Q = area_m2", calculationTrace: `assessed_surface=${area} m2; condition=${String(values.existing_surface_condition)}; milling=${String(values.milling_required)}`,
      affectedBy: ["area_m2", "existing_surface_condition", "milling_required", "defect_repair_required"],
      semanticOwner: "OVERLAY_EXISTING_SURFACE_ACCEPTANCE",
    })];
  }
  if (profile.canonicalWorkKey === "asphalt_base_layer") {
    return [seed({
      rowId: `${profile.canonicalWorkKey}:underlying_layer_acceptance`, itemType: "document",
      titleRu: "Приёмка нижележащего слоя перед устройством связующего асфальтобетонного слоя",
      quantity: area, unit: "m2", category: "quality_control", formulaId: "binder_underlying_layer_area_v1",
      quantityFormula: "Q = area_m2", calculationTrace: `underlying_layer_area=${area} m2; condition=${String(values.underlying_layer_condition)}; traffic=${String(values.traffic_class)}`,
      affectedBy: ["area_m2", "underlying_layer_condition", "traffic_class", "prepared_base_confirmed"],
      semanticOwner: "BINDER_UNDERLYING_LAYER_ACCEPTANCE",
    })];
  }
  return [];
}

function conditionalSiteFeatureRows(
  profile: AsphaltRelatedProfileV4,
  values: Record<string, unknown>,
  area: number,
  phaseOwner: ExactBoqSeed["phaseOwner"],
): ExactBoqSeed[] {
  const rows: ExactBoqSeed[] = [];
  const push = (input: Omit<ExactBoqSeed, "phaseOwner">) => rows.push({ ...input, phaseOwner });
  const tackRate = positiveNumber(values, "tack_coat_rate_l_m2");
  if (values.tack_coat_required === true && tackRate > 0) {
    push({
      rowId: `${profile.canonicalWorkKey}:tack_coat_material`, itemType: "material",
      titleRu: "Вяжущий материал для подгрунтовки или межслойного розлива подтверждённого типа",
      quantity: round(area * tackRate), unit: "l", category: "material", formulaId: "tack_coat_material_quantity_v1",
      quantityFormula: "Q = area_m2 * tack_coat_rate_l_m2", calculationTrace: `${area} * ${tackRate} = ${round(area * tackRate)} l`,
      affectedBy: ["area_m2", "tack_coat_required", "tack_coat_rate_l_m2"], semanticOwner: "TACK_COAT_BINDER_MATERIAL",
      includedInProcurement: true, materialKey: `${profile.canonicalWorkKey}:tack_coat_material`,
    });
  }
  if (values.base_construction_required === true) {
    const thickness = positiveNumber(values, "base_layer_thickness_mm");
    const volume = round(area * thickness / 1000);
    push({
      rowId: `${profile.canonicalWorkKey}:base_material`, itemType: "material", titleRu: "Материал основания подтверждённого проектом типа",
      quantity: volume, unit: "m3", category: "material", formulaId: "base_material_volume_v1",
      quantityFormula: "Q = area_m2 * base_layer_thickness_mm / 1000", calculationTrace: `${area} * ${thickness} / 1000 = ${volume} m3; type=${String(values.base_material_type)}`,
      affectedBy: ["area_m2", "base_layer_thickness_mm", "base_material_type"], semanticOwner: "PROJECT_BASE_MATERIAL",
      includedInProcurement: true, materialKey: `${profile.canonicalWorkKey}:base_material`,
    });
    push({
      rowId: `${profile.canonicalWorkKey}:base_placement`, itemType: "work", titleRu: "Устройство и уплотнение проектного слоя основания",
      quantity: area, unit: "m2", category: "work", formulaId: "base_placement_area_v1", quantityFormula: "Q = area_m2",
      calculationTrace: `base_placement_area=${area} m2; thickness=${thickness} mm`, affectedBy: ["area_m2", "base_layer_thickness_mm", "base_material_type"],
      semanticOwner: "PROJECT_BASE_PLACEMENT", includedInProcurement: false,
    });
  }
  const curbLength = positiveNumber(values, "curb_length_m");
  if (values.curb_required === true && curbLength > 0) {
    for (const [suffix, itemType, category, titleRu, procurement] of [
      ["curb_material", "material", "material", "Бортовой камень подтверждённого проектом типа", true],
      ["curb_installation", "work", "work", "Установка бортового камня по подтверждённой длине", false],
    ] as const) push({
      rowId: `${profile.canonicalWorkKey}:${suffix}`, itemType, titleRu, quantity: curbLength, unit: "m", category,
      formulaId: `${suffix}_length_v1`, quantityFormula: "Q = curb_length_m", calculationTrace: `curb_length=${curbLength} m; type=${String(values.curb_type)}`,
      affectedBy: ["curb_required", "curb_length_m", "curb_type"], semanticOwner: suffix.toUpperCase(), includedInProcurement: procurement,
      materialKey: itemType === "material" ? `${profile.canonicalWorkKey}:curb` : undefined,
    });
  }
  const drainageLength = positiveNumber(values, "drainage_length_m");
  if (values.drainage_required === true && drainageLength > 0) {
    for (const [suffix, itemType, category, titleRu, procurement] of [
      ["drainage_material", "material", "material", "Элементы водоотвода подтверждённого проектом типа", true],
      ["drainage_installation", "work", "work", "Устройство выбранных элементов водоотвода", false],
    ] as const) push({
      rowId: `${profile.canonicalWorkKey}:${suffix}`, itemType, titleRu, quantity: drainageLength, unit: "m", category,
      formulaId: `${suffix}_length_v1`, quantityFormula: "Q = drainage_length_m", calculationTrace: `drainage_length=${drainageLength} m; type=${String(values.drainage_type)}`,
      affectedBy: ["drainage_required", "drainage_length_m", "drainage_type"], semanticOwner: suffix.toUpperCase(), includedInProcurement: procurement,
      materialKey: itemType === "material" ? `${profile.canonicalWorkKey}:drainage` : undefined,
    });
  }
  const markingArea = positiveNumber(values, "marking_area_m2");
  if (values.marking_required === true && markingArea > 0) {
    push({
      rowId: `${profile.canonicalWorkKey}:marking_application`, itemType: "work", titleRu: "Нанесение дорожной разметки по подтверждённой площади",
      quantity: markingArea, unit: "m2", category: "work", formulaId: "marking_area_v1", quantityFormula: "Q = marking_area_m2",
      calculationTrace: `marking_area=${markingArea} m2`, affectedBy: ["marking_required", "marking_area_m2"], semanticOwner: "MARKING_APPLICATION",
      includedInProcurement: false,
    });
  }
  return rows;
}

function compileInstallationBlueprintRows(profile: AsphaltRelatedProfileV4, values: Record<string, unknown>): ExactBoqSeed[] {
  const area = positiveNumber(values, "area_m2") || positiveNumber(values, "removal_area_m2");
  const density = positiveNumber(values, "asphalt_density_t_m3") || positiveNumber(values, "existing_asphalt_density_t_m3");
  const isRepair = profile.operationClass === "LOCAL_PATCH_REPAIR";
  const binderDepth = profile.operationClass === "INSTALL_BINDER_LAYER" || values.binder_layer_required === true
    ? positiveNumber(values, "binder_layer_thickness_mm")
    : 0;
  const wearingDepth = profile.operationClass === "INSTALL_BINDER_LAYER"
    ? 0
    : positiveNumber(values, "wearing_layer_thickness_mm") || (isRepair ? positiveNumber(values, "removal_depth_mm") : 0);
  const binderMass = round(area * binderDepth / 1000 * density);
  const wearingMass = round(area * wearingDepth / 1000 * density);
  const totalMixMass = round(binderMass + wearingMass);
  const haulDistance = positiveNumber(values, "haul_distance_km");
  const deliveryQuantity = haulDistance > 0 ? round(totalMixMass * haulDistance) : totalMixMass;
  const deliveryUnit = haulDistance > 0 ? "t*km" : "t";
  const compactionPasses = positiveNumber(values, "number_of_compaction_passes");
  const edgeLength = positiveNumber(values, "edge_treatment_length_m");
  const installationPhase: ExactBoqSeed["phaseOwner"] = isRepair ? "PHASE_3_REINSTATEMENT" : "SINGLE_OPERATION";
  const specificRows = profileSpecificInstallationRows(profile, values, area, installationPhase);
  const siteFeatureRows = conditionalSiteFeatureRows(profile, values, area, installationPhase);
  const removalRows = isRepair
    ? demolitionRows(
      profile,
      { ...values, removal_area_m2: area, removal_depth_mm: wearingDepth, haul_required: false },
      "LOCAL_BREAKUP",
    ).filter((row) => [
      "DEMOLITION_BOUNDARY_AND_SURVEY",
      "DEMOLITION_BOUNDARY_CUTTING",
      "LOCAL_BREAKUP",
      "DEMOLITION_WORKERS_SCOPE",
      "DEMOLITION_OPERATORS_SCOPE",
      "PRIMARY_BREAKOUT_EQUIPMENT_SCOPE",
      "DEMOLITION_LOADER_EQUIPMENT_SCOPE",
      "RECOVERED_OR_WASTE_ASPHALT",
      "DEMOLITION_LOADING",
      "ASPHALT_MATERIAL_DESTINATION",
      "POST_DEMOLITION_BASE_CLEANING",
      "POST_DEMOLITION_BASE_ACCEPTANCE",
    ].includes(row.semanticOwner))
    : [];
  return [
    {
      rowId: `${profile.canonicalWorkKey}:scope_acceptance`, itemType: "document", titleRu: "Приёмка основания, границ и проектного состава дорожной одежды",
      quantity: area, unit: "m2", category: "quality_control", formulaId: "confirmed_work_area_v1", quantityFormula: "Q = area_m2",
      calculationTrace: `confirmed_area=${area} m2`, affectedBy: ["area_m2", "prepared_base_confirmed"], semanticOwner: "INSTALLATION_SCOPE_ACCEPTANCE",
      phaseOwner: installationPhase, includedInProcurement: false,
    },
    ...(profile.applicationContext === "BRIDGE_OR_STRUCTURE" ? ([{
      rowId: `${profile.canonicalWorkKey}:bridge_deck_acceptance`, itemType: "document" as const,
      titleRu: "Приёмка гидроизоляции, защитного слоя и сопряжений мостовой плиты",
      quantity: area, unit: "m2", category: "quality_control", formulaId: "confirmed_bridge_deck_area_v1",
      quantityFormula: "Q = area_m2", calculationTrace: `confirmed_bridge_deck_area=${area} m2`,
      affectedBy: ["area_m2", "bridge_deck_system_confirmed"], semanticOwner: "BRIDGE_DECK_SYSTEM_ACCEPTANCE",
      phaseOwner: installationPhase, includedInProcurement: false,
    }, {
      rowId: `${profile.canonicalWorkKey}:waterproofing_acceptance`, itemType: "document" as const,
      titleRu: "Входной контроль типа и состояния гидроизоляции мостового полотна",
      quantity: 1, unit: "set", category: "quality_control", formulaId: "bridge_waterproofing_acceptance_set_v1",
      quantityFormula: "Q = 1 комплект контроля на выбранный объект",
      calculationTrace: `waterproofing_type=${String(values.waterproofing_type)}; condition=${String(values.waterproofing_condition)}`,
      affectedBy: ["waterproofing_type", "waterproofing_condition", "bridge_deck_system_confirmed"], semanticOwner: "BRIDGE_WATERPROOFING_ACCEPTANCE",
      phaseOwner: installationPhase, includedInProcurement: false,
    }, {
      rowId: `${profile.canonicalWorkKey}:protective_layer_geometry_control`, itemType: "document" as const,
      titleRu: "Контроль проектной толщины защитного слоя мостовой плиты",
      quantity: round(area * positiveNumber(values, "protective_layer_thickness_mm") / 1000), unit: "m3", category: "quality_control",
      formulaId: "bridge_protective_layer_control_volume_v1",
      quantityFormula: "Q = area_m2 * protective_layer_thickness_mm / 1000",
      calculationTrace: `${area} * ${positiveNumber(values, "protective_layer_thickness_mm")} / 1000 = ${round(area * positiveNumber(values, "protective_layer_thickness_mm") / 1000)} m3 control volume`,
      affectedBy: ["area_m2", "protective_layer_thickness_mm"], semanticOwner: "BRIDGE_PROTECTIVE_LAYER_GEOMETRY_CONTROL",
      phaseOwner: installationPhase, includedInProcurement: false,
    }] satisfies ExactBoqSeed[]) : []),
    ...specificRows,
    ...removalRows,
    {
      rowId: `${profile.canonicalWorkKey}:setting_out`, itemType: "work", titleRu: "Геодезическая разбивка, закрепление отметок и границ укладки",
      quantity: area, unit: "m2", category: "work", formulaId: "installation_setting_out_area_v1", quantityFormula: "Q = area_m2",
      calculationTrace: `setting_out_area=${area} m2`, affectedBy: ["area_m2"], semanticOwner: "INSTALLATION_SETTING_OUT",
      phaseOwner: installationPhase, includedInProcurement: false,
    },
    {
      rowId: `${profile.canonicalWorkKey}:base_preparation`, itemType: "work", titleRu: "Очистка, локальная подготовка и обеспыливание основания перед укладкой",
      quantity: area, unit: "m2", category: "work", formulaId: "prepared_base_area_v1", quantityFormula: "Q = area_m2",
      calculationTrace: `prepared_base_area=${area} m2`, affectedBy: ["area_m2", "prepared_base_confirmed"], semanticOwner: "BASE_SURFACE_PREPARATION",
      phaseOwner: installationPhase, includedInProcurement: false,
    },
    ...(values.tack_coat_required === true ? [{
      rowId: `${profile.canonicalWorkKey}:tack_coat_application`, itemType: "work", titleRu: "Розлив подгрунтовочного или межслойного вяжущего подтверждённого проектом типа",
      quantity: area, unit: "m2", category: "work", formulaId: "tack_coat_application_area_v1", quantityFormula: "Q = area_m2",
      calculationTrace: `tack_coat_application_area=${area} m2; rate=${positiveNumber(values, "tack_coat_rate_l_m2")} l/m2`, affectedBy: ["area_m2", "tack_coat_required", "tack_coat_rate_l_m2"],
      semanticOwner: "TACK_OR_PRIME_COAT_APPLICATION", phaseOwner: installationPhase, includedInProcurement: false,
    }] satisfies ExactBoqSeed[] : []),
    ...siteFeatureRows,
    ...(binderMass > 0 ? ([{
      rowId: `${profile.canonicalWorkKey}:binder_mix`, itemType: "material" as const, titleRu: "Асфальтобетонная смесь нижнего (связующего) слоя подтверждённого проектом типа",
      quantity: binderMass, unit: "t", category: "material", formulaId: "binder_asphalt_mix_mass_v2",
      quantityFormula: "Q = area_m2 * binder_layer_thickness_mm / 1000 * asphalt_density_t_m3",
      calculationTrace: `${area} * ${binderDepth} / 1000 * ${density} = ${binderMass} t`, affectedBy: ["area_m2", "binder_layer_thickness_mm", "asphalt_density_t_m3"],
      semanticOwner: "BINDER_LAYER_ASPHALT_MIX", phaseOwner: installationPhase, includedInProcurement: true,
      materialKey: `${profile.canonicalWorkKey}:binder_mix`,
    }, {
      rowId: `${profile.canonicalWorkKey}:binder_placement`, itemType: "work" as const, titleRu: "Укладка нижнего (связующего) слоя асфальтобетона",
      quantity: area, unit: "m2", category: "work", formulaId: "binder_layer_placement_area_v2", quantityFormula: "Q = area_m2",
      calculationTrace: `binder_layer_area=${area} m2; thickness=${binderDepth} mm`, affectedBy: ["area_m2", "binder_layer_thickness_mm"],
      semanticOwner: "BINDER_LAYER_PLACEMENT", phaseOwner: installationPhase, includedInProcurement: false,
    }] satisfies ExactBoqSeed[]) : []),
    ...(wearingMass > 0 ? ([{
      rowId: `${profile.canonicalWorkKey}:wearing_mix`, itemType: "material" as const, titleRu: "Асфальтобетонная смесь верхнего слоя подтверждённого проектом типа",
      quantity: wearingMass, unit: "t", category: "material", formulaId: "wearing_asphalt_mix_mass_v2",
      quantityFormula: isRepair
        ? "Q = area_m2 * removal_depth_mm / 1000 * asphalt_density_t_m3"
        : "Q = area_m2 * wearing_layer_thickness_mm / 1000 * asphalt_density_t_m3",
      calculationTrace: `${area} * ${wearingDepth} / 1000 * ${density} = ${wearingMass} t`,
      affectedBy: ["area_m2", isRepair ? "removal_depth_mm" : "wearing_layer_thickness_mm", "asphalt_density_t_m3"],
      semanticOwner: "WEARING_LAYER_ASPHALT_MIX", phaseOwner: installationPhase, includedInProcurement: true,
      materialKey: `${profile.canonicalWorkKey}:wearing_mix`,
    }, {
      rowId: `${profile.canonicalWorkKey}:wearing_placement`, itemType: "work" as const,
      titleRu: isRepair ? "Послойное восстановление асфальтобетона в ремонтных картах" : "Укладка верхнего слоя асфальтобетона",
      quantity: area, unit: "m2", category: "work", formulaId: "wearing_layer_placement_area_v2", quantityFormula: "Q = area_m2",
      calculationTrace: `wearing_layer_area=${area} m2; thickness=${wearingDepth} mm`,
      affectedBy: ["area_m2", isRepair ? "removal_depth_mm" : "wearing_layer_thickness_mm"],
      semanticOwner: isRepair ? "PATCH_REINSTATEMENT_PLACEMENT" : "WEARING_LAYER_PLACEMENT", phaseOwner: installationPhase, includedInProcurement: false,
    }] satisfies ExactBoqSeed[]) : []),
    {
      rowId: `${profile.canonicalWorkKey}:mix_delivery`, itemType: "service", titleRu: "Доставка асфальтобетонной смеси специализированным транспортом с сохранением температуры",
      quantity: deliveryQuantity, unit: deliveryUnit, category: "logistics", formulaId: haulDistance > 0 ? "asphalt_mix_transport_work_v2" : "asphalt_mix_delivery_mass_scope_v2",
      quantityFormula: haulDistance > 0 ? "Q = total_mix_mass_t * haul_distance_km" : "Q = total_mix_mass_t (distance rate not supplied)",
      calculationTrace: haulDistance > 0 ? `${totalMixMass} t * ${haulDistance} km = ${deliveryQuantity} t*km` : `delivery_mass_scope=${totalMixMass} t; distance requires supplier route`,
      affectedBy: ["area_m2", "asphalt_density_t_m3", "haul_distance_km"], semanticOwner: "ASPHALT_MIX_DELIVERY",
      phaseOwner: installationPhase, includedInProcurement: true,
    },
    {
      rowId: `${profile.canonicalWorkKey}:mix_receiving_and_unloading`, itemType: "work",
      titleRu: "Приёмка, разгрузка и непрерывная подача асфальтобетонной смеси в укладочный поток",
      quantity: totalMixMass, unit: "t", category: "work", formulaId: "asphalt_mix_receiving_mass_v1",
      quantityFormula: "Q = binder_mix_mass_t + wearing_mix_mass_t",
      calculationTrace: `received_mix_mass=${binderMass}+${wearingMass}=${totalMixMass} t`,
      affectedBy: ["area_m2", "binder_layer_thickness_mm", "wearing_layer_thickness_mm", "asphalt_density_t_m3"],
      semanticOwner: "ASPHALT_MIX_RECEIVING_AND_UNLOADING",
      phaseOwner: installationPhase, includedInProcurement: false,
    },
    {
      rowId: `${profile.canonicalWorkKey}:surface_cleaning_equipment`, itemType: "service",
      titleRu: "Очистительная машина и воздушное оборудование для подготовки основания",
      quantity: 1, unit: "set", category: "equipment", formulaId: "surface_cleaning_equipment_scope_set_v1",
      quantityFormula: "Q = 1 функциональный комплект на выбранный фронт работ; продолжительность определяется ППР",
      calculationTrace: `one cleaning-equipment scope for ${area} m2; machine-hours are not invented`,
      affectedBy: ["area_m2", "prepared_base_confirmed"], semanticOwner: "BASE_CLEANING_EQUIPMENT_SCOPE",
      phaseOwner: installationPhase, includedInProcurement: true,
    },
    {
      rowId: `${profile.canonicalWorkKey}:paver_scope`, itemType: "service", titleRu: isRepair
        ? "Асфальтоукладчик или малая механизация для распределения смеси в ремонтных картах"
        : "Асфальтоукладчик для механизированного распределения смеси по профилю и толщине",
      quantity: 1, unit: "set", category: "equipment", formulaId: "paver_equipment_scope_set_v3",
      quantityFormula: "Q = 1 функциональный комплект на выбранный фронт работ; машино-часы определяются по ППР",
      calculationTrace: `one paver-equipment scope for ${area} m2; machine-hours are not invented`, affectedBy: ["area_m2"], semanticOwner: "ASPHALT_PAVER_EQUIPMENT_SCOPE",
      phaseOwner: installationPhase, includedInProcurement: true,
    },
    {
      rowId: `${profile.canonicalWorkKey}:breakdown_roller_scope`, itemType: "service",
      titleRu: "Каток для предварительного уплотнения непосредственно за укладчиком",
      quantity: 1, unit: "set", category: "equipment", formulaId: "breakdown_roller_scope_set_v1",
      quantityFormula: "Q = 1 функциональный комплект; тип и машино-часы определяются схемой уплотнения",
      calculationTrace: `one breakdown-roller scope for ${area} m2`,
      affectedBy: ["area_m2", "number_of_compaction_passes"], semanticOwner: "ASPHALT_BREAKDOWN_ROLLER_EQUIPMENT_SCOPE",
      phaseOwner: installationPhase, includedInProcurement: true,
    },
    {
      rowId: `${profile.canonicalWorkKey}:intermediate_roller_scope`, itemType: "service",
      titleRu: "Каток для основного уплотнения асфальтобетонного слоя",
      quantity: 1, unit: "set", category: "equipment", formulaId: "intermediate_roller_scope_set_v1",
      quantityFormula: "Q = 1 функциональный комплект; тип и машино-часы определяются схемой уплотнения",
      calculationTrace: `one intermediate-roller scope for ${area} m2; approved_passes=${compactionPasses || "project_control_plan_required"}`,
      affectedBy: ["area_m2", "number_of_compaction_passes"], semanticOwner: "ASPHALT_INTERMEDIATE_ROLLER_EQUIPMENT_SCOPE",
      phaseOwner: installationPhase, includedInProcurement: true,
    },
    {
      rowId: `${profile.canonicalWorkKey}:finish_roller_scope`, itemType: "service",
      titleRu: "Каток для окончательного уплотнения и устранения следов проходов",
      quantity: 1, unit: "set", category: "equipment", formulaId: "finish_roller_scope_set_v1",
      quantityFormula: "Q = 1 функциональный комплект; тип и машино-часы определяются схемой уплотнения",
      calculationTrace: `one finish-roller scope for ${area} m2`,
      affectedBy: ["area_m2", "number_of_compaction_passes"], semanticOwner: "ASPHALT_FINISH_ROLLER_EQUIPMENT_SCOPE",
      phaseOwner: installationPhase, includedInProcurement: true,
    },
    {
      rowId: `${profile.canonicalWorkKey}:breakdown_compaction`, itemType: "work",
      titleRu: "Предварительное уплотнение уложенной смеси непосредственно за укладчиком",
      quantity: area, unit: "m2", category: "work", formulaId: "breakdown_compaction_area_v1", quantityFormula: "Q = area_m2",
      calculationTrace: `breakdown_compaction_area=${area} m2`, affectedBy: ["area_m2", "number_of_compaction_passes"], semanticOwner: "ASPHALT_BREAKDOWN_COMPACTION",
      phaseOwner: installationPhase, includedInProcurement: false,
    },
    {
      rowId: `${profile.canonicalWorkKey}:intermediate_compaction`, itemType: "work",
      titleRu: "Основное уплотнение асфальтобетонного слоя по утверждённой схеме проходов",
      quantity: area, unit: "m2", category: "work", formulaId: "intermediate_compaction_area_v1", quantityFormula: "Q = area_m2",
      calculationTrace: `intermediate_compaction_area=${area} m2; approved_passes=${compactionPasses || "project_control_plan_required"}`,
      affectedBy: ["area_m2", "number_of_compaction_passes"], semanticOwner: "ASPHALT_INTERMEDIATE_COMPACTION",
      phaseOwner: installationPhase, includedInProcurement: false,
    },
    {
      rowId: `${profile.canonicalWorkKey}:finish_compaction`, itemType: "work",
      titleRu: "Окончательное уплотнение и финишная обработка поверхности покрытия",
      quantity: area, unit: "m2", category: "work", formulaId: "finish_compaction_area_v1", quantityFormula: "Q = area_m2",
      calculationTrace: `finish_compaction_area=${area} m2`, affectedBy: ["area_m2"], semanticOwner: "ASPHALT_FINISH_COMPACTION",
      phaseOwner: installationPhase, includedInProcurement: false,
    },
    ...(edgeLength > 0 ? ([{
      rowId: `${profile.canonicalWorkKey}:edge_and_joint_treatment`, itemType: "work" as const, titleRu: "Обработка продольных и поперечных сопряжений и кромок",
      quantity: edgeLength, unit: "m", category: "work", formulaId: "confirmed_edge_treatment_length_v1", quantityFormula: "Q = edge_treatment_length_m",
      calculationTrace: `edge_treatment_length=${edgeLength} m`, affectedBy: ["edge_treatment_length_m"], semanticOwner: "ASPHALT_EDGE_AND_JOINT_TREATMENT",
      phaseOwner: installationPhase, includedInProcurement: false,
    }] satisfies ExactBoqSeed[]) : []),
    {
      rowId: `${profile.canonicalWorkKey}:manual_finishing`, itemType: "work", titleRu: "Ручная доводка кромок, сопряжений и недоступных механизации участков",
      quantity: area, unit: "m2", category: "work", formulaId: "manual_finishing_area_scope_v1", quantityFormula: "Q = area_m2 (work-front scope; exact labor rate requires work method)",
      calculationTrace: `manual_finishing_work_front=${area} m2`, affectedBy: ["area_m2"], semanticOwner: "ASPHALT_MANUAL_FINISHING_SCOPE",
      phaseOwner: installationPhase, includedInProcurement: false,
    },
    {
      rowId: `${profile.canonicalWorkKey}:road_worker_labor`, itemType: "work", titleRu: "Труд дорожных рабочих при приёмке смеси, ручной доводке и обработке сопряжений",
      quantity: 1, unit: "set", category: "labor", formulaId: "road_worker_labor_scope_set_v1",
      quantityFormula: "Q = 1 состав звена на выбранный фронт; человеко-часы определяются нормой или ППР",
      calculationTrace: `one road-worker crew scope for ${area} m2; man-hours are not invented`, affectedBy: ["area_m2"], semanticOwner: "ASPHALT_ROAD_WORKER_LABOR_SCOPE",
      phaseOwner: installationPhase, includedInProcurement: false,
    },
    {
      rowId: `${profile.canonicalWorkKey}:paver_operator_labor`, itemType: "work", titleRu: "Труд машиниста и операторов асфальтоукладчика",
      quantity: 1, unit: "set", category: "labor", formulaId: "paver_operator_labor_scope_set_v1",
      quantityFormula: "Q = 1 состав операторов на выбранный фронт; человеко-часы определяются нормой или ППР",
      calculationTrace: `one paver-operator scope for ${area} m2; man-hours are not invented`, affectedBy: ["area_m2"], semanticOwner: "ASPHALT_PAVER_OPERATOR_LABOR_SCOPE",
      phaseOwner: installationPhase, includedInProcurement: false,
    },
    {
      rowId: `${profile.canonicalWorkKey}:roller_operator_labor`, itemType: "work", titleRu: "Труд машинистов катков на стадиях предварительного, основного и окончательного уплотнения",
      quantity: 1, unit: "set", category: "labor", formulaId: "roller_operator_labor_scope_set_v1",
      quantityFormula: "Q = 1 состав машинистов на выбранный фронт; человеко-часы определяются нормой или ППР",
      calculationTrace: `one roller-operator scope for ${area} m2; man-hours are not invented`, affectedBy: ["area_m2", "number_of_compaction_passes"], semanticOwner: "ASPHALT_ROLLER_OPERATOR_LABOR_SCOPE",
      phaseOwner: installationPhase, includedInProcurement: false,
    },
    {
      rowId: `${profile.canonicalWorkKey}:incoming_mix_control`, itemType: "document",
      titleRu: "Входной контроль паспортов, типа, однородности и состояния асфальтобетонной смеси",
      quantity: 1, unit: "set", category: "quality_control", formulaId: "incoming_mix_control_set_v1", quantityFormula: "Q = 1 комплект входного контроля на объект",
      calculationTrace: `one incoming-control register for ${totalMixMass} t`, affectedBy: ["wearing_mix_type", "binder_mix_type", "asphalt_density_t_m3"], semanticOwner: "ASPHALT_INCOMING_MIX_CONTROL",
      phaseOwner: installationPhase, includedInProcurement: false,
    },
    {
      rowId: `${profile.canonicalWorkKey}:temperature_control`, itemType: "document", titleRu: "Входной и операционный контроль температуры смеси при доставке и укладке",
      quantity: 1, unit: "set", category: "quality_control", formulaId: "temperature_control_document_set_v1", quantityFormula: "Q = 1 set",
      calculationTrace: "one traceable temperature-control register", affectedBy: [], semanticOwner: "ASPHALT_TEMPERATURE_CONTROL",
      phaseOwner: installationPhase, includedInProcurement: false,
    },
    {
      rowId: `${profile.canonicalWorkKey}:compaction_control`, itemType: "document", titleRu: "Операционный контроль схемы проходов и степени уплотнения покрытия",
      quantity: area, unit: "m2", category: "quality_control", formulaId: "compaction_quality_area_v2", quantityFormula: "Q = area_m2",
      calculationTrace: `controlled_compaction_area=${area} m2`, affectedBy: ["area_m2", "number_of_compaction_passes"], semanticOwner: "ASPHALT_COMPACTION_CONTROL",
      phaseOwner: installationPhase, includedInProcurement: false,
    },
    {
      rowId: `${profile.canonicalWorkKey}:geometry_control`, itemType: "document", titleRu: "Контроль толщины, ровности, поперечного профиля и высотных отметок покрытия",
      quantity: area, unit: "m2", category: "quality_control", formulaId: "pavement_geometry_control_area_v1", quantityFormula: "Q = area_m2",
      calculationTrace: `controlled_geometry_area=${area} m2`, affectedBy: ["area_m2", "wearing_layer_thickness_mm", "binder_layer_thickness_mm"], semanticOwner: "ASPHALT_PAVEMENT_GEOMETRY_CONTROL",
      phaseOwner: installationPhase, includedInProcurement: false,
    },
    {
      rowId: `${profile.canonicalWorkKey}:laboratory_testing`, itemType: "service", titleRu: "Отбор проб и лабораторные испытания асфальтобетонной смеси и покрытия",
      quantity: 1, unit: "set", category: "laboratory", formulaId: "laboratory_test_scope_v1", quantityFormula: "Q = 1 lot per estimate; sampling frequency requires the approved control plan",
      calculationTrace: "one priced laboratory-control lot; test count is not invented", affectedBy: [], semanticOwner: "ASPHALT_LABORATORY_TESTING",
      phaseOwner: installationPhase, includedInProcurement: true,
    },
    {
      rowId: `${profile.canonicalWorkKey}:hidden_work_acts`, itemType: "document", titleRu: "Акты освидетельствования основания, скрытых работ и послойной приёмки",
      quantity: 1, unit: "set", category: "documentation", formulaId: "hidden_work_act_set_v1", quantityFormula: "Q = 1 комплект на объект",
      calculationTrace: "one traceable hidden-work and layer-acceptance set", affectedBy: ["prepared_base_confirmed"], semanticOwner: "INSTALLATION_HIDDEN_WORK_ACTS",
      phaseOwner: installationPhase, includedInProcurement: false,
    },
    {
      rowId: `${profile.canonicalWorkKey}:as_built_survey`, itemType: "document", titleRu: "Исполнительная геодезическая съёмка границ, профиля и отметок покрытия",
      quantity: 1, unit: "set", category: "documentation", formulaId: "as_built_survey_set_v1", quantityFormula: "Q = 1 комплект на объект",
      calculationTrace: "one traceable as-built survey set", affectedBy: ["area_m2"], semanticOwner: "INSTALLATION_AS_BUILT_SURVEY",
      phaseOwner: installationPhase, includedInProcurement: false,
    },
    {
      rowId: `${profile.canonicalWorkKey}:material_passports`, itemType: "document", titleRu: "Паспорта, сертификаты и реестр поставок асфальтобетонной смеси",
      quantity: 1, unit: "set", category: "documentation", formulaId: "material_passport_register_set_v1", quantityFormula: "Q = 1 реестр на объект",
      calculationTrace: `one material-passport register for ${totalMixMass} t`, affectedBy: ["wearing_mix_type", "binder_mix_type"], semanticOwner: "INSTALLATION_MATERIAL_PASSPORT_REGISTER",
      phaseOwner: installationPhase, includedInProcurement: false,
    },
    {
      rowId: `${profile.canonicalWorkKey}:quality_documentation`, itemType: "document", titleRu: "Итоговый комплект лабораторных протоколов, журналов и документов сдачи покрытия",
      quantity: 1, unit: "set", category: "documentation", formulaId: "required_document_set_v3", quantityFormula: "Q = 1 комплект на объект",
      calculationTrace: "one traceable final acceptance document set", affectedBy: [], semanticOwner: "INSTALLATION_QUALITY_DOCUMENTATION",
      phaseOwner: installationPhase, includedInProcurement: false,
    },
  ];
}

function readinessFor(parameters: ExactParameterSet): DomainResolutionReadiness {
  if (parameters.missingRequired.length > 0) return "NEEDS_REQUIRED_INPUTS";
  if (parameters.missingNormative.length > 0) return "NORMATIVE_SOURCE_GAP";
  return "CALCULATION_READY";
}

function readinessLabelRu(readiness: DomainResolutionReadiness): string {
  if (readiness === "NEEDS_REQUIRED_INPUTS") return "нужно заполнить обязательные параметры";
  if (readiness === "CALCULATION_READY") return "готово к расчёту";
  return "требуется уточнение исходных данных";
}

function metadataFor(profile: AsphaltRelatedProfileV4): Record<string, AsphaltRelatedParameterMetadataV4> {
  return Object.fromEntries(
    asphaltRelatedParameterKeysForProfileV4(profile)
      .map((key) => [key, ASPHALT_RELATED_PARAMETER_METADATA_V4[key] ?? { labelRu: key, tier: profile.requiredParameters.includes(key) ? "P0" : "P1" }]),
  );
}

/**
 * V4 domain compiler for exact asphalt-related passports. Persistence,
 * revision creation, history, PDF and procurement remain owned by the shared
 * estimate platform; this function only compiles typed parameters to BOQ.
 */
export function compileAsphaltRelatedProfessionalEstimateV4(
  input: BuildEstimateFromInlineWorkPromptInput,
): {
  draft: ConsumerRepairAiDraft;
  profile: AsphaltRelatedProfileV4;
  requestedCatalogRecordId: string;
  passport: NonNullable<ReturnType<typeof getAsphaltRelatedProfessionalPassportV4>>;
  readiness: DomainResolutionReadiness;
  resolvedOperationClass: AsphaltRelatedResolvedOperationClassV4;
} | null {
  const requestedCatalogRecordId = input.selectedWorkKey?.trim() || input.selectedTemplateId?.trim() || "";
  const profile = getAsphaltRelatedProfileByCatalogRecordIdV4(requestedCatalogRecordId);
  if (!profile) return null;
  const passport = getAsphaltRelatedProfessionalPassportV4(requestedCatalogRecordId);
  if (!passport) throw new Error(`ASPHALT_RELATED_PASSPORT_NOT_FOUND:${requestedCatalogRecordId}`);
  const catalogBinding = asphaltRelatedCatalogBindingV4(profile, requestedCatalogRecordId);
  const parameters = extractParameters(input, profile);
  const resolvedOperationClass = resolveAsphaltRelatedOperationClassV4(profile, parameters.values);
  const removalOperation = [
    "FULL_DEPTH_DEMOLITION",
    "PARTIAL_DEPTH_REMOVAL",
    "COLD_MILLING",
    "LOCAL_BREAKUP",
    "DEMOLITION_AND_REINSTATEMENT",
  ].includes(resolvedOperationClass);
  const precompileReadiness = readinessFor(parameters);
  const scopeMode = parameters.values.estimate_scope_mode as ProfessionalEstimateScopeModeV4 | undefined;
  const reinstatementOperation = parameters.values.work_scope === "DEMOLITION_AND_REINSTATEMENT";
  const coreCompilation = precompileReadiness === "CALCULATION_READY" && (!removalOperation || reinstatementOperation) && scopeMode
    ? compileAsphaltRelatedThroughCoreV4({
      sourceInput: input,
      profile,
      values: parameters.values,
      scopeMode,
    })
    : null;
  const removalCompilation = precompileReadiness === "CALCULATION_READY" && removalOperation && scopeMode
    ? compileAsphaltRemovalThroughCoreV4({
      sourceInput: input,
      profile,
      values: parameters.values,
      scopeMode,
    })
    : null;
  if (coreCompilation?.baseCompilation.compile_blockers.length) {
    throw new Error(`ASPHALT_CORE_COMPILE_BLOCKED:${coreCompilation.baseCompilation.compile_blockers.join("|")}`);
  }
  if (coreCompilation?.blockers.length) {
    throw new Error(`ASPHALT_CORE_REQUIREMENTS_UNMAPPED:${coreCompilation.blockers.join("|")}`);
  }
  if (removalCompilation?.blockers.length) {
    throw new Error(`ASPHALT_REMOVAL_REQUIREMENTS_UNMAPPED:${removalCompilation.blockers.join("|")}`);
  }
  const readiness = readinessFor(parameters);
  const executable = readiness === "CALCULATION_READY";
  const seeds = executable
    ? removalOperation
      ? coreRowsToSeeds([
        ...(removalCompilation?.rows ?? []),
        ...(reinstatementOperation ? coreCompilation?.rows ?? [] : []),
      ])
      : coreRowsToSeeds(coreCompilation?.rows ?? [])
    : [];
  if (executable && seeds.length === 0) {
    throw new Error(`ASPHALT_COMPILED_BOQ_EMPTY:${requestedCatalogRecordId}:${profile.canonicalWorkKey}`);
  }
  const parameterMetadata = metadataFor(profile);
  const semanticFingerprint = estimateDeterministicHash({
    requestedCatalogRecordId,
    canonicalWorkKey: profile.canonicalWorkKey,
    operationClass: resolvedOperationClass,
    applicationContext: profile.applicationContext,
    passportId: passport.passportId,
    catalogBinding,
    strategyId: passport.calculation.calculationStrategyId,
    formulaGraphVersion: passport.calculation.formulaGraphVersion,
    parameters: parameters.values,
  });
  const currency = input.currency ?? "KGS";
  const draft: ConsumerRepairAiDraft = {
    titleRu: executable
      ? `Предварительная профессиональная смета: ${profile.professionalNameRu}`
      : `${profile.professionalNameRu}: требуются обязательные исходные данные`,
    summaryRu: executable
      ? `Точная операция «${profile.professionalNameRu}»; сформировано ${seeds.length} профессиональных позиций без подмены универсальным расчётом.`
      : `Точная операция сохранена: ${readinessLabelRu(readiness)}. Укладочный профиль вместо выбранной операции не применяется.`,
    repairType: profile.canonicalWorkKey,
    selectedWork: {
      selectedCatalogWorkId: requestedCatalogRecordId,
      selectedWorkKey: profile.canonicalWorkKey,
      selectedWorkTitleRu: profile.professionalNameRu,
      selectedWorkCategoryKey: profile.uiGroup === "DEMOLITION_WORKS" ? "demolition" : "roadworks",
      selectedWorkCategoryTitleRu: profile.uiGroup === "DEMOLITION_WORKS" ? "Демонтаж" : "Дорожные работы",
      selectedWorkRawInput: input.rawInput,
      selectedWorkSource: "user_selected",
      selectedWorkResolverReGuessed: false,
    },
    dangerousDiyBlocked: false,
    missingData: [...parameters.missingRequired, ...parameters.missingNormative]
      .map((key) => parameterMetadata[key]?.labelRu ?? key),
    items: seeds.map((seed, index) => {
      const stageId = asphaltStageIdForRowV1(profile.canonicalWorkKey, seed.rowId, seed.category);
      const normativeBinding = resolveAsphaltM1NormativeBindingV1({
        rowId: `${profile.canonicalWorkKey}:${seed.rowId}`,
        existingSourceIds: seed.normativeSourceIds ?? [],
        referenceDesignId: typeof parameters.values.asphalt_reference_design_id === "string"
          ? parameters.values.asphalt_reference_design_id
          : null,
        referenceDesignSha256: typeof parameters.values.asphalt_reference_design_sha256 === "string"
          ? parameters.values.asphalt_reference_design_sha256
          : null,
        referenceDesignManifest: typeof parameters.values.asphalt_reference_design_manifest === "string"
          ? parameters.values.asphalt_reference_design_manifest
          : null,
        referenceDesignFingerprint: typeof parameters.values.asphalt_reference_design_fingerprint === "string"
          ? parameters.values.asphalt_reference_design_fingerprint
          : null,
      });
      return ({
      itemType: seed.itemType,
      titleRu: seed.titleRu,
      quantity: seed.quantity,
      unit: seed.unit,
      unitLabel: formatEstimateUnitLabel(seed.unit),
      unitPrice: null,
      currency,
      source: "reference_price_book",
      category: seed.category,
      sourceId: "asphalt-related-professional-estimate-compiler-v4",
      sourceLabel: "Точная семантическая привязка; цена не выбрана",
      formulaId: seed.formulaId,
      quantityFormula: seed.quantityFormula,
      calculationTrace: seed.calculationTrace,
      sourceParameters: {
        asphaltRelatedV4: true,
        requestedCatalogWorkId: requestedCatalogRecordId,
        selectedWorkId: profile.canonicalWorkKey,
        canonicalWorkId: profile.canonicalWorkKey,
        canonicalModelId: profile.canonicalWorkKey,
        canonicalModelVersion: ASPHALT_RELATED_SEMANTIC_REGISTRY_VERSION_V4,
        operationClass: resolvedOperationClass,
        catalogOperationClass: profile.operationClass,
        applicationContext: profile.applicationContext,
        professionalNameRu: profile.professionalNameRu,
        semanticDomains: profile.semanticDomains,
        surfaceMaterial: profile.surfaceMaterial,
        semanticOwner: passport.passportId,
        professionalEstimatePassportId: passport.passportId,
        professionalEstimatePassportVersion: passport.version,
        calculationStrategyId: passport.calculation.calculationStrategyId,
        calculationProfileId: profile.calculationProfileId,
        calculationProfileVersion: ASPHALT_RELATED_SEMANTIC_REGISTRY_VERSION_V4,
        boqBlueprintId: catalogBinding.boqBlueprintId,
        parameterSchemaId: catalogBinding.parameterSchemaId,
        parameterSchemaVersion: ASPHALT_RELATED_SEMANTIC_REGISTRY_VERSION_V4,
        canonicalParameterSchemaId: profile.parameterSchemaId,
        formulaBindingId: catalogBinding.formulaBindingId,
        formulaGraphVersion: profile.formulaGraphVersion,
        normativeCompositionId: catalogBinding.normApplicabilityProfileId,
        canonicalNormativeCompositionId: profile.normativeCompositionId,
        normApplicabilityProfileId: catalogBinding.normApplicabilityProfileId,
        deterministicFixtureId: catalogBinding.deterministicFixtureId,
        semanticFingerprint,
        positiveVectorId: profile.positiveVectorId,
        forbiddenOwnerSetId: profile.forbiddenOwnerSetId,
        domainResolutionReadiness: readiness,
        exactSelectionGenericFallbackUsed: false,
        exactSelectionUnsupported: false,
        phaseOwner: seed.phaseOwner,
        stageId,
        boqSemanticOwner: seed.semanticOwner,
        boqSection: seed.category,
        quantityBasis: seed.quantityFormula,
        rounding: seed.rounding ?? (seed.formulaId.includes("ceiling") ? "CEIL_POSITIVE" : "ROUND_HALF_UP_4"),
        parameterSources: seed.affectedBy,
        normativeSources: normativeBinding.sourceIds,
        normativeSourceRoles: normativeBinding.sourceRoles,
        kgStatusSourceIds: normativeBinding.kgStatusSourceIds,
        kgApplicabilitySourceIds: normativeBinding.kgApplicabilitySourceIds,
        constructionNormLocatorIds: normativeBinding.constructionNormLocatorIds,
        normativeLocatorReviewStatus: normativeBinding.locatorReviewStatus,
        inclusionCondition: seed.inclusionCondition ?? "MANDATORY_OR_APPLICABLE_STAGE_OF_SELECTED_BLUEPRINT",
        estimateScopeMode: scopeMode ?? null,
        professionalAssemblyContractVersion: coreCompilation || removalCompilation ? "professional-project-assembly:v4.1" : null,
        // This legacy counter is consumed as a hidden-default gate. Core
        // preliminary assumptions are not hidden: their full versioned
        // records are persisted below on the first revision row.
        professionalAssemblyAssumptionsCount: coreCompilation?.childCompilation.assumptions_count ?? removalCompilation?.childCompilation.assumptions_count ?? 0,
        professionalAssemblyHiddenQuantityDefaults: coreCompilation?.childCompilation.hidden_quantity_defaults ?? removalCompilation?.childCompilation.hidden_quantity_defaults ?? 0,
        asphaltCoreVisibleAssumptionIds: seed.assumptionIds,
        asphaltCoreVisibleAssumptionsCount: coreCompilation?.baseCompilation.preliminary_assembly_policy.assumptions.length ?? 0,
        asphaltCoreVisibleAssumptions: index === 0 && coreCompilation
          ? coreCompilation.baseCompilation.preliminary_assembly_policy.assumptions
          : undefined,
        formulaInputValues: seed.formulaInputValues,
        costOwnership: seed.costOwnership,
        costOwnerId: seed.costOwnerId,
        doubleCountGuardKey: seed.costOwnerId,
        normativeSourceIds: normativeBinding.sourceIds,
        parameterSourceIds: seed.parameterSourceIds,
        childPassportId: seed.childPassportId,
        childRevisionId: seed.childRevisionId,
        scopeTriggerParameter: seed.scopeTriggerParameter,
        procurementClassification: seed.includedInProcurement ? "PROCUREMENT_OR_SUBCONTRACT_SCOPE" : "NON_PROCUREMENT_WORK_OR_CONTROL_SCOPE",
        includedInProcurement: seed.includedInProcurement,
        parameterSnapshot: index === 0 ? parameters.values : undefined,
        assumptionKeys: index === 0 ? parameters.assumptionKeys : undefined,
        asphaltRelatedParameterMetadata: index === 0 ? parameterMetadata : undefined,
        asphaltV4QuantityBasis: index === 0 ? {
          basis_type: "project",
          length_m: null,
          width_m: null,
          area_m2: positiveNumber(parameters.values, "removal_area_m2") || positiveNumber(parameters.values, "area_m2"),
          source: "confirmed_parameter",
          formula_trace: "area_m2 = confirmed exact-operation area",
          assumption_ids: [],
        } : undefined,
        affectedBy: seed.affectedBy,
        formulaSourceTrace: `${profile.formulaGraphVersion}:${seed.formulaId}`,
        normativeSourceId: normativeBinding.sourceIds[0] ?? "KRER_APPLICABILITY_REVIEW_REQUIRED_NO_INVENTED_NUMERIC_RATE",
        normativeReviewStatus: normativeBinding.normativeReviewStatus,
        normativeApplicability: normativeBinding.applicability,
        applicabilityPredicate: seed.inclusionCondition ?? "MANDATORY_OR_APPLICABLE_STAGE_OF_SELECTED_BLUEPRINT",
        formulaVersion: profile.formulaGraphVersion,
        wasteOrLossRule: "EXPLICIT_FORMULA_INPUT_OR_NOT_APPLICABLE",
        roundingRule: seed.rounding ?? (seed.formulaId.includes("ceiling") ? "CEIL_POSITIVE" : "ROUND_HALF_UP_4"),
        demolitionMassBalance: removalOperation && executable ? "PASS" : undefined,
        newMaterialBalance: parameters.values.work_scope === "DEMOLITION_AND_REINSTATEMENT" && executable ? "PASS" : undefined,
        sameOperationDoubleCount: 0,
        wasteAndProcurementMixing: 0,
      },
      templateId: catalogBinding.boqBlueprintId,
      templateVersion: ASPHALT_RELATED_SEMANTIC_REGISTRY_VERSION_V4,
      normId: `${catalogBinding.normApplicabilityProfileId}:${seed.rowId}`,
      normFamilyId: "asphalt-related-kr-applicability",
      normSourceId: normativeBinding.sourceIds[0] ?? "KRER_APPLICABILITY_REVIEW_REQUIRED_NO_INVENTED_NUMERIC_RATE",
      normSourceTitle: normativeBinding.accepted
        ? "Официальная область применения и exact versioned benchmark-fixture inputs подтверждены"
        : "Официальная область применения КРЕР; числовая норма требует точного выбора таблицы",
      normVersion: "reviewed-2026-08-10",
      normReviewStatus: normativeBinding.accepted ? "benchmark_fixture_inputs_confirmed" : "exact_rate_review_required_before_contract_price",
      priceStatus: "PRICE_MISSING",
      priceSource: "missing",
      priceSourceId: null,
      priceSourceLabel: "Цена не заполнена",
      confidence: executable ? "high" : "medium",
      addedBy: "ai",
      materialKey: seed.materialKey ?? null,
      rateKey: `${profile.canonicalWorkKey}:${seed.rowId}`,
      });
    }),
  };
  const exactMissingData = [...draft.missingData];
  const contractedDraft = applyProfessionalBoqRuntimeContract(draft, { prompt: input.rawInput });
  contractedDraft.missingData = exactMissingData;
  return {
    draft: contractedDraft,
    profile,
    passport,
    requestedCatalogRecordId,
    readiness,
    resolvedOperationClass,
  };
}

export function isExactAsphaltRelatedConsumerDraftV4(
  draft: ConsumerRepairAiDraft | null,
): boolean {
  if (!draft || draft.selectedWork?.selectedWorkResolverReGuessed !== false) return false;
  const selectedId = draft.selectedWork.selectedCatalogWorkId ?? draft.selectedWork.selectedWorkKey;
  const profile = getAsphaltRelatedProfileByCatalogRecordIdV4(selectedId);
  if (!profile || profile.canonicalWorkKey !== draft.selectedWork.selectedWorkKey) return false;
  return draft.items.length === 0 ||
    draft.items.every((item) => item.sourceParameters?.asphaltRelatedV4 === true);
}
