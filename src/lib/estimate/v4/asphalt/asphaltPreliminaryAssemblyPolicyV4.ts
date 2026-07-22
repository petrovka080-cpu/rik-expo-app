export type AsphaltAssemblyProfileIdV4 =
  | "surfacing_on_prepared_base"
  | "new_full_road_pavement"
  | "rehabilitation_with_milling"
  | "overlay_on_existing_pavement"
  | "local_patch_repair"
  | "parking_full_construction"
  | "parking_surfacing_only";

export type AsphaltDeclaredAssumptionV4 = {
  parameter_id: string;
  canonical_key: string;
  value: unknown;
  unit_id: string | null;
  source_id: string;
  reason_ru: string;
  confidence: "medium";
  user_confirmed: false;
  affected_row_ids: string[];
};

export type AsphaltPreliminaryAssemblyPolicyV4 = {
  policy_id: "asphalt_preliminary_assembly_policy_v1";
  policy_version: "1.0.0";
  assembly_id: string;
  profile_id: AsphaltAssemblyProfileIdV4;
  profile_title_ru: string;
  summary_ru: string;
  assumptions: AsphaltDeclaredAssumptionV4[];
};

type AssumptionSeed = Omit<AsphaltDeclaredAssumptionV4, "parameter_id" | "source_id" | "confidence" | "user_confirmed">;

const POLICY_ID = "asphalt_preliminary_assembly_policy_v1" as const;
const SOURCE_PREFIX = "engineering_assumption:asphalt-preliminary-assembly:v1";

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  return true;
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value.replace(/\s+/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function profileFor(rawText: string, values: ReadonlyMap<string, unknown>): AsphaltAssemblyProfileIdV4 {
  const text = rawText.normalize("NFKC").toLocaleLowerCase("ru-RU");
  const persistedProfile = values.get("scope_profile");
  if (
    persistedProfile === "surfacing_on_prepared_base" ||
    persistedProfile === "new_full_road_pavement" ||
    persistedProfile === "rehabilitation_with_milling" ||
    persistedProfile === "overlay_on_existing_pavement" ||
    persistedProfile === "local_patch_repair" ||
    persistedProfile === "parking_full_construction" ||
    persistedProfile === "parking_surfacing_only"
  ) return persistedProfile;
  const constructionMode = values.get("construction_mode");
  const purpose = values.get("purpose");
  const parking = purpose === "yard_parking" || /парков|автостоян/iu.test(text);
  const milling = values.get("milling_required") === true || /фрезерован/iu.test(text);
  const patchRepair = /ямоч|локальн\w*\s+ремонт|ремонт\w*\s+карт/iu.test(text);
  const overlay = /усилен|обнов|поверх\s+существ|по\s+существующ|оверлей/iu.test(text);
  const preparedBase = /готов\w*\s+основан|подготовлен\w*\s+основан/iu.test(text);
  const fullConstruction = constructionMode === "new_construction" || /строительств|построи|нов(?:ая|ое|ый|ого|ую)\s+(?:парков|дорог|площад)|нов(?:ое|ого)\s+основан/iu.test(text);
  if (patchRepair) return "local_patch_repair";
  if (milling) return "rehabilitation_with_milling";
  if (overlay) return "overlay_on_existing_pavement";
  if (parking && fullConstruction) return "parking_full_construction";
  if (parking) return "parking_surfacing_only";
  if (fullConstruction && !preparedBase) return "new_full_road_pavement";
  if (constructionMode === "repair" || /ремонт|восстановлен|реконструкц/iu.test(text)) return "overlay_on_existing_pavement";
  return "surfacing_on_prepared_base";
}

function baseSeeds(profile: AsphaltAssemblyProfileIdV4): AssumptionSeed[] {
  const fullConstruction = profile === "new_full_road_pavement" || profile === "parking_full_construction";
  const common: AssumptionSeed[] = [
    { canonical_key: "scope_profile", value: profile, unit_id: null, reason_ru: `Профессиональный ScopeResolver выбрал профиль ${profile}; пользователь может изменить профиль уточнением.`, affected_row_ids: [] },
    { canonical_key: "asphalt_layer_count", value: 2, unit_id: "pcs", reason_ru: "Для предварительного расчёта принято двухслойное асфальтобетонное покрытие; состав подлежит замене данными проекта.", affected_row_ids: ["asphalt_layer_1_material", "asphalt_layer_2_material"] },
    { canonical_key: "asphalt_layer_1_mixture_type", value: "coarse_lower", unit_id: null, reason_ru: "Нижний слой предварительно задан как связующий; точный тип и марка определяются проектом.", affected_row_ids: ["asphalt_layer_1_material"] },
    { canonical_key: "asphalt_layer_1_thickness_mm", value: 60, unit_id: "mm", reason_ru: "Толщина нижнего слоя 60 мм является изменяемым инженерным допущением предварительной сборки.", affected_row_ids: ["asphalt_layer_1_material", "asphalt_layer_1_paving"] },
    { canonical_key: "asphalt_layer_1_density_t_m3", value: 2.35, unit_id: "t_m3", reason_ru: "Расчётная плотность 2,35 т/м³ принята только как изменяемое инженерное допущение до паспорта смеси.", affected_row_ids: ["asphalt_layer_1_material"] },
    { canonical_key: "asphalt_layer_1_waste_percent", value: 2, unit_id: "percent", reason_ru: "Технологический запас 2 % принят как изменяемое инженерное допущение.", affected_row_ids: ["asphalt_layer_1_material"] },
    { canonical_key: "asphalt_layer_2_mixture_type", value: "dense_fine", unit_id: null, reason_ru: "Верхний слой предварительно задан как плотный мелкозернистый; точный тип и марка определяются проектом.", affected_row_ids: ["asphalt_layer_2_material"] },
    { canonical_key: "asphalt_layer_2_thickness_mm", value: 40, unit_id: "mm", reason_ru: "Толщина верхнего слоя 40 мм является изменяемым инженерным допущением предварительной сборки.", affected_row_ids: ["asphalt_layer_2_material", "asphalt_layer_2_paving"] },
    { canonical_key: "asphalt_layer_2_density_t_m3", value: 2.35, unit_id: "t_m3", reason_ru: "Расчётная плотность 2,35 т/м³ принята только как изменяемое инженерное допущение до паспорта смеси.", affected_row_ids: ["asphalt_layer_2_material"] },
    { canonical_key: "asphalt_layer_2_waste_percent", value: 2, unit_id: "percent", reason_ru: "Технологический запас 2 % принят как изменяемое инженерное допущение.", affected_row_ids: ["asphalt_layer_2_material"] },
    { canonical_key: "emulsion_measurement_basis", value: "litre", unit_id: null, reason_ru: "Для предварительной закупочной ведомости эмульсия измеряется в литрах; единица изменяется вместе с нормой.", affected_row_ids: ["base_emulsion_material", "emulsion_interface_1_2"] },
    { canonical_key: "base_emulsion_rate_l_m2", value: 0.6, unit_id: "l_m2", reason_ru: "Норма подгрунтовки 0,6 л/м² принята как инженерное допущение и требует техкарты выбранной эмульсии.", affected_row_ids: ["base_emulsion_material", "base_emulsion_application"] },
    { canonical_key: "emulsion_rate_l_m2", value: 0.3, unit_id: "l_m2", reason_ru: "Норма межслойного розлива 0,3 л/м² принята как инженерное допущение и требует техкарты выбранной эмульсии.", affected_row_ids: ["emulsion_interface_1_2", "emulsion_interface_1_2_application"] },
    { canonical_key: "paver_working_width_m", value: 4, unit_id: "m", reason_ru: "Рабочая ширина укладки 4 м принята для предварительного расчёта продольных стыков.", affected_row_ids: ["longitudinal_joints", "joint_sealing_material", "edge_treatment"] },
    { canonical_key: "paving_shift_length_m", value: 500, unit_id: "m", reason_ru: "Длина захватки 500 м принята для предварительного расчёта поперечных стыков.", affected_row_ids: ["transverse_joints", "joint_sealing_material", "edge_treatment"] },
    { canonical_key: "surface_cleaner_productivity_m2_per_machine_hour", value: 1000, unit_id: "m2_machine_hour", reason_ru: "Производительность очистительной техники 1000 м²/маш.-ч является изменяемым инженерным допущением.", affected_row_ids: ["surface_cleaner"] },
    { canonical_key: "bitumen_distributor_productivity_m2_per_machine_hour", value: 500, unit_id: "m2_machine_hour", reason_ru: "Производительность автогудронатора 500 м²/маш.-ч является изменяемым инженерным допущением.", affected_row_ids: ["bitumen_distributor"] },
    { canonical_key: "paver_productivity_m2_per_machine_hour", value: 180, unit_id: "m2_machine_hour", reason_ru: "Производительность асфальтоукладчика 180 м²/маш.-ч является изменяемым инженерным допущением.", affected_row_ids: ["asphalt_paver_layer_1", "asphalt_paver_layer_2"] },
    { canonical_key: "roller_productivity_m2_per_machine_hour", value: 150, unit_id: "m2_machine_hour", reason_ru: "Производительность гладковальцового катка 150 м²/маш.-ч является изменяемым инженерным допущением.", affected_row_ids: ["smooth_roller_layer_1", "smooth_roller_layer_2"] },
    { canonical_key: "pneumatic_roller_productivity_m2_per_machine_hour", value: 200, unit_id: "m2_machine_hour", reason_ru: "Производительность пневмоколёсного катка 200 м²/маш.-ч является изменяемым инженерным допущением.", affected_row_ids: ["pneumatic_roller_layer_1", "pneumatic_roller_layer_2"] },
    { canonical_key: "road_worker_productivity_m2_per_man_hour", value: 12, unit_id: "m2_man_hour", reason_ru: "Производительность звена 12 м²/чел.-ч является изменяемым инженерным допущением.", affected_row_ids: ["road_workers"] },
    { canonical_key: "asphalt_plant_distance_km", value: 20, unit_id: "km", reason_ru: "Расстояние до АБЗ 20 км принято только для предварительного расчёта логистики.", affected_row_ids: ["asphalt_layer_1_delivery", "asphalt_layer_2_delivery"] },
    { canonical_key: "truck_payload_t", value: 15, unit_id: "t_trip", reason_ru: "Полезная загрузка самосвала 15 т/рейс принята для предварительного расчёта рейсов.", affected_row_ids: ["asphalt_layer_1_truck_trips", "asphalt_layer_2_truck_trips", "dump_trucks_layer_1", "dump_trucks_layer_2"] },
    { canonical_key: "truck_average_speed_km_per_machine_hour", value: 40, unit_id: "km_machine_hour", reason_ru: "Средняя расчётная скорость самосвала 40 км/маш.-ч принята как изменяемое допущение для предварительных машино-часов.", affected_row_ids: ["dump_trucks_layer_1", "dump_trucks_layer_2"] },
    { canonical_key: "truck_turnaround_machine_hours", value: 0.75, unit_id: "machine_hour", reason_ru: "Погрузка, ожидание и разгрузка одного рейса приняты как 0,75 маш.-ч до подтверждения логистической схемы.", affected_row_ids: ["dump_trucks_layer_1", "dump_trucks_layer_2"] },
    { canonical_key: "laboratory_control", value: "contractor", unit_id: null, reason_ru: "В предварительную смету включён лабораторный контроль подрядчика; программа уточняется проектом.", affected_row_ids: ["laboratory_tests"] },
    { canonical_key: "laboratory_test_interval_m2_per_test", value: 5000, unit_id: "m2_test", reason_ru: "Один комплект испытаний на 5000 м² принят как инженерное допущение до утверждения программы контроля.", affected_row_ids: ["laboratory_tests"] },
    { canonical_key: "incoming_control_interval_m2_per_test", value: 10000, unit_id: "m2_test", reason_ru: "Входной контроль материалов принят по одному комплекту на 10000 м² каждого слоя до утверждения программы контроля.", affected_row_ids: ["incoming_material_control"] },
    { canonical_key: "temperature_control_trips_per_test", value: 5, unit_id: "trip_test", reason_ru: "Контроль температуры смеси принят не реже одного измерения на 5 рейсов до утверждения технологической карты.", affected_row_ids: ["asphalt_temperature_control"] },
    { canonical_key: "compaction_control_interval_m2_per_test", value: 5000, unit_id: "m2_test", reason_ru: "Контроль коэффициента уплотнения принят по одному измерению на 5000 м² каждого слоя до утверждения программы.", affected_row_ids: ["asphalt_compaction_control"] },
    { canonical_key: "core_sampling_interval_m2_per_test", value: 10000, unit_id: "m2_test", reason_ru: "Отбор кернов принят по одной точке на 10000 м² каждого слоя как изменяемое предварительное допущение.", affected_row_ids: ["asphalt_core_sampling"] },
    { canonical_key: "thickness_control_interval_m2_per_test", value: 5000, unit_id: "m2_test", reason_ru: "Контроль толщины принят по одной точке на 5000 м² каждого слоя до утверждения программы.", affected_row_ids: ["pavement_thickness_control"] },
    { canonical_key: "smoothness_control_interval_m2_per_test", value: 5000, unit_id: "m2_test", reason_ru: "Контроль ровности принят по одному измерительному участку на 5000 м² до утверждения программы.", affected_row_ids: ["surface_smoothness_control"] },
    { canonical_key: "laboratory_protocol_count", value: 1, unit_id: "document", reason_ru: "Итоговый комплект лабораторных протоколов принят как один документированный комплект на объект.", affected_row_ids: ["laboratory_protocol"] },
    { canonical_key: "initial_data_analysis_service_count", value: 1, unit_id: "service", reason_ru: "Анализ исходных данных принят одной услугой на объект предварительной сметы.", affected_row_ids: ["initial_data_analysis"] },
    { canonical_key: "field_survey_service_count", value: 1, unit_id: "service", reason_ru: "Выездное обследование принято одной услугой на объект предварительной сметы.", affected_row_ids: ["field_site_survey"] },
    { canonical_key: "geodetic_layout_service_count", value: 1, unit_id: "service", reason_ru: "Геодезическая разбивка принята одной услугой на объект предварительной сметы.", affected_row_ids: ["geodetic_layout"] },
    { canonical_key: "axes_marks_fixing_service_count", value: 1, unit_id: "service", reason_ru: "Закрепление осей и высотных отметок принято одной измеримой услугой на объект.", affected_row_ids: ["axes_marks_fixing"] },
    { canonical_key: "mobilization_service_count", value: 1, unit_id: "service", reason_ru: "Мобилизация и демобилизация приняты одной комплексной услугой на объект.", affected_row_ids: ["mobilization_demobilization"] },
    { canonical_key: "work_zone_service_count", value: 1, unit_id: "service", reason_ru: "Организация рабочей зоны принята одной услугой на объект без стоимости до коммерческого предложения.", affected_row_ids: ["work_zone_organization"] },
    { canonical_key: "executive_survey_service_count", value: 1, unit_id: "service", reason_ru: "Исполнительная геодезическая съёмка принята одной услугой на объект.", affected_row_ids: ["executive_survey"] },
    { canonical_key: "execution_documentation_count", value: 1, unit_id: "document", reason_ru: "Комплект исполнительной документации принят как один документированный комплект.", affected_row_ids: ["execution_documentation"] },
    { canonical_key: "milling_required", value: false, unit_id: null, reason_ru: "Фрезерование не включено без признаков ремонта или прямого указания пользователя.", affected_row_ids: ["milling"] },
    { canonical_key: "geotextile_required", value: false, unit_id: null, reason_ru: "Геотекстиль не включён без проектного или пользовательского подтверждения.", affected_row_ids: ["geotextile_material"] },
    { canonical_key: "curb_required", value: false, unit_id: null, reason_ru: "Бортовой камень не включён без подтверждённого объёма.", affected_row_ids: ["curb_material"] },
    { canonical_key: "drainage_required", value: false, unit_id: null, reason_ru: "Новый водоотвод не включён без подтверждённого объёма.", affected_row_ids: ["drainage_material"] },
    { canonical_key: "utility_pipes_required", value: false, unit_id: null, reason_ru: "Трубы и футляры не включены без подтверждённого объёма.", affected_row_ids: ["utility_pipes_material"] },
    { canonical_key: "traffic_signs_required", value: false, unit_id: null, reason_ru: "Дорожные знаки не включены без проекта организации движения.", affected_row_ids: ["traffic_signs_material"] },
    { canonical_key: "road_marking_required", value: false, unit_id: null, reason_ru: "Разметка не включена без подтверждённой схемы и площади.", affected_row_ids: ["road_marking"] },
    { canonical_key: "guardrail_required", value: false, unit_id: null, reason_ru: "Ограждение не включено без проекта безопасности и длины.", affected_row_ids: ["guardrail_material"] },
    { canonical_key: "constrained_site", value: false, unit_id: null, reason_ru: "Стеснённые условия не применены без указания пользователя.", affected_row_ids: [] },
    { canonical_key: "night_work_required", value: false, unit_id: null, reason_ru: "Ночные работы не применены без указания пользователя.", affected_row_ids: [] },
    { canonical_key: "live_traffic_required", value: false, unit_id: null, reason_ru: "Работы при действующем движении не включены без указания пользователя.", affected_row_ids: [] },
  ];
  if (fullConstruction) {
    return [
      ...common,
      { canonical_key: "construction_mode", value: "new_construction", unit_id: null, reason_ru: "По формулировке о новом строительстве выбран полный профиль земляного полотна, основания и покрытия.", affected_row_ids: ["topsoil_stripping", "subgrade_excavation", "sand_material", "crushed_layer_1_material", "crushed_layer_2_material"] },
      { canonical_key: "purpose", value: profile === "parking_full_construction" ? "yard_parking" : "public_road", unit_id: null, reason_ru: profile === "parking_full_construction" ? "Объект распознан как парковка полного строительства." : "Объект распознан как дорога полного строительства.", affected_row_ids: [] },
      { canonical_key: "base_condition", value: "new_project", unit_id: null, reason_ru: "Для нового строительства основание предварительно принято новым; конструкция заменяется проектной.", affected_row_ids: ["sand_material", "crushed_layer_1_material", "crushed_layer_2_material"] },
      { canonical_key: "earthwork_required", value: true, unit_id: null, reason_ru: "В полном профиле нового строительства раскрыт предварительный земляной WBS; объёмы заменяются проектной ведомостью.", affected_row_ids: ["topsoil_stripping", "subgrade_excavation", "soil_loading", "soil_haul", "subgrade_profiling", "subgrade_compaction"] },
      { canonical_key: "topsoil_thickness_mm", value: 150, unit_id: "mm", reason_ru: "Снятие растительного слоя 150 мм принято как явное предварительное допущение.", affected_row_ids: ["topsoil_stripping"] },
      { canonical_key: "subgrade_excavation_depth_mm", value: 300, unit_id: "mm", reason_ru: "Разработка земляного полотна глубиной 300 мм принята как явное предварительное допущение.", affected_row_ids: ["subgrade_excavation", "soil_loading", "soil_haul"] },
      { canonical_key: "excavated_soil_density_t_m3", value: 1.6, unit_id: "t_m3", reason_ru: "Расчётная плотность вывозимого грунта 1,60 т/м³ требует подтверждения изысканиями.", affected_row_ids: ["soil_loading", "soil_haul"] },
      { canonical_key: "earthwork_haul_distance_km", value: 15, unit_id: "km", reason_ru: "Плечо вывоза грунта 15 км принято только для предварительной логистики.", affected_row_ids: ["soil_haul", "soil_trips"] },
      { canonical_key: "subgrade_density_test_interval_m2", value: 2000, unit_id: "m2_test", reason_ru: "Периодичность контроля плотности земляного полотна 1 точка на 2000 м² является изменяемым допущением до программы контроля.", affected_row_ids: ["subgrade_density_control"] },
      { canonical_key: "temporary_traffic_service_count", value: 1, unit_id: "service", reason_ru: "Временная организация движения принята одной услугой на объект; схема и стоимость требуют проекта.", affected_row_ids: ["temporary_traffic_management"] },
      { canonical_key: "site_clearing_factor", value: 1, unit_id: "one", reason_ru: "Расчистка и подготовка территории предварительно приняты по всей площади объекта.", affected_row_ids: ["site_clearing", "site_preparation"] },
      { canonical_key: "excavator_productivity_m3_per_machine_hour", value: 40, unit_id: "m3_machine_hour", reason_ru: "Производительность экскаватора 40 м³/маш.-ч является изменяемым допущением до ППР.", affected_row_ids: ["excavator"] },
      { canonical_key: "loader_productivity_m3_per_machine_hour", value: 60, unit_id: "m3_machine_hour", reason_ru: "Производительность фронтального погрузчика 60 м³/маш.-ч является изменяемым допущением.", affected_row_ids: ["wheel_loader"] },
      { canonical_key: "bulldozer_productivity_m2_per_machine_hour", value: 500, unit_id: "m2_machine_hour", reason_ru: "Производительность бульдозера 500 м²/маш.-ч принята предварительно.", affected_row_ids: ["bulldozer"] },
      { canonical_key: "subgrade_roller_productivity_m2_per_machine_hour", value: 250, unit_id: "m2_machine_hour", reason_ru: "Производительность катка земляного полотна 250 м²/маш.-ч является изменяемым допущением.", affected_row_ids: ["subgrade_roller"] },
      { canonical_key: "base_roller_productivity_m2_per_machine_hour", value: 200, unit_id: "m2_machine_hour", reason_ru: "Производительность катка основания 200 м²/маш.-ч является изменяемым допущением.", affected_row_ids: ["base_roller"] },
      { canonical_key: "water_truck_productivity_m2_per_machine_hour", value: 500, unit_id: "m2_machine_hour", reason_ru: "Производительность поливомоечной машины 500 м²/маш.-ч является изменяемым допущением.", affected_row_ids: ["water_truck"] },
      { canonical_key: "preparation_worker_productivity_m2_per_man_hour", value: 50, unit_id: "m2_man_hour", reason_ru: "Производительность рабочих подготовительного этапа 50 м²/чел.-ч является изменяемым допущением.", affected_row_ids: ["preparation_workers"] },
      { canonical_key: "earthwork_worker_productivity_m2_per_man_hour", value: 20, unit_id: "m2_man_hour", reason_ru: "Производительность рабочих земляного этапа 20 м²/чел.-ч является изменяемым допущением.", affected_row_ids: ["earthwork_workers"] },
      { canonical_key: "base_worker_productivity_m2_per_man_hour", value: 15, unit_id: "m2_man_hour", reason_ru: "Производительность рабочих по устройству основания 15 м²/чел.-ч является изменяемым допущением.", affected_row_ids: ["base_workers"] },
      { canonical_key: "sand_layer_required", value: true, unit_id: null, reason_ru: "Для предварительного профиля нового основания включён песчаный слой.", affected_row_ids: ["sand_material", "sand_placement"] },
      { canonical_key: "sand_thickness_mm", value: 150, unit_id: "mm", reason_ru: "Толщина песчаного слоя 150 мм является инженерным допущением предварительной сборки.", affected_row_ids: ["sand_material", "sand_placement"] },
      { canonical_key: "sand_compaction_factor", value: 1.15, unit_id: "one", reason_ru: "Коэффициент поставки песка 1,15 является изменяемым инженерным допущением.", affected_row_ids: ["sand_material"] },
      { canonical_key: "sand_waste_percent", value: 3, unit_id: "percent", reason_ru: "Запас песка 3 % является изменяемым инженерным допущением.", affected_row_ids: ["sand_material"] },
      { canonical_key: "sand_density_t_m3", value: 1.6, unit_id: "t_m3", reason_ru: "Насыпная плотность песка 1,60 т/м³ принята для предварительной логистики и требует подтверждения поставщиком.", affected_row_ids: ["sand_delivery", "sand_trips"] },
      { canonical_key: "aggregate_source_distance_km", value: 25, unit_id: "km", reason_ru: "Плечо доставки песка и щебня 25 км принято как изменяемое логистическое допущение.", affected_row_ids: ["sand_delivery", "crushed_layer_1_delivery", "crushed_layer_2_delivery"] },
      { canonical_key: "sand_water_rate_m3_m3", value: 0.04, unit_id: "one", reason_ru: "Технологическая вода 0,04 м³ на 1 м³ уплотнённого песка является предварительным допущением.", affected_row_ids: ["sand_moistening_water", "sand_moistening"] },
      { canonical_key: "crushed_layer_count", value: 2, unit_id: "pcs", reason_ru: "Для нового основания предварительно приняты два щебёночных слоя.", affected_row_ids: ["crushed_layer_1_material", "crushed_layer_2_material"] },
      { canonical_key: "crushed_layer_1_fraction", value: "40_70", unit_id: null, reason_ru: "Фракция нижнего щебёночного слоя является предварительным инженерным допущением.", affected_row_ids: ["crushed_layer_1_material"] },
      { canonical_key: "crushed_layer_1_thickness_mm", value: 180, unit_id: "mm", reason_ru: "Толщина нижнего щебёночного слоя 180 мм является предварительным допущением.", affected_row_ids: ["crushed_layer_1_material"] },
      { canonical_key: "crushed_layer_1_compaction_factor", value: 1.18, unit_id: "one", reason_ru: "Коэффициент поставки нижнего щебёночного слоя 1,18 является допущением.", affected_row_ids: ["crushed_layer_1_material"] },
      { canonical_key: "crushed_layer_1_waste_percent", value: 3, unit_id: "percent", reason_ru: "Запас нижнего щебёночного слоя 3 % является допущением.", affected_row_ids: ["crushed_layer_1_material"] },
      { canonical_key: "crushed_layer_2_fraction", value: "20_40", unit_id: null, reason_ru: "Фракция верхнего щебёночного слоя является предварительным инженерным допущением.", affected_row_ids: ["crushed_layer_2_material"] },
      { canonical_key: "crushed_layer_2_thickness_mm", value: 120, unit_id: "mm", reason_ru: "Толщина верхнего щебёночного слоя 120 мм является предварительным допущением.", affected_row_ids: ["crushed_layer_2_material"] },
      { canonical_key: "crushed_layer_2_compaction_factor", value: 1.16, unit_id: "one", reason_ru: "Коэффициент поставки верхнего щебёночного слоя 1,16 является допущением.", affected_row_ids: ["crushed_layer_2_material"] },
      { canonical_key: "crushed_layer_2_waste_percent", value: 3, unit_id: "percent", reason_ru: "Запас верхнего щебёночного слоя 3 % является допущением.", affected_row_ids: ["crushed_layer_2_material"] },
      { canonical_key: "crushed_density_t_m3", value: 1.5, unit_id: "t_m3", reason_ru: "Насыпная плотность щебня 1,50 т/м³ принята только для предварительной транспортной работы.", affected_row_ids: ["crushed_layer_1_delivery", "crushed_layer_2_delivery"] },
      { canonical_key: "crushed_water_rate_m3_m3", value: 0.02, unit_id: "one", reason_ru: "Технологическая вода 0,02 м³ на 1 м³ уплотнённого щебёночного слоя принята предварительно.", affected_row_ids: ["crushed_layer_1_moistening_water", "crushed_layer_2_moistening_water", "crushed_layer_1_moistening", "crushed_layer_2_moistening"] },
      { canonical_key: "base_density_test_interval_m2", value: 2000, unit_id: "m2_test", reason_ru: "Контроль плотности основания принят по одному измерению на 2000 м² каждого слоя до утверждения программы контроля.", affected_row_ids: ["sand_density_control", "crushed_layer_1_density_control", "crushed_layer_2_density_control"] },
      { canonical_key: "geotextile_required", value: true, unit_id: null, reason_ru: "В предварительную полную конструкцию включён разделительный геотекстиль; применимость должен подтвердить проект.", affected_row_ids: ["geotextile_material", "geotextile_installation"] },
      { canonical_key: "geotextile_type", value: "separation", unit_id: null, reason_ru: "Тип геотекстиля предварительно принят разделительным без назначения марки.", affected_row_ids: ["geotextile_material"] },
      { canonical_key: "geotextile_overlap_percent", value: 10, unit_id: "percent", reason_ru: "Нахлёст геотекстиля 10 % принят как изменяемое допущение до схемы раскладки.", affected_row_ids: ["geotextile_material", "geotextile_installation"] },
      { canonical_key: "grader_productivity_m2_per_machine_hour", value: 220, unit_id: "m2_machine_hour", reason_ru: "Производительность автогрейдера 220 м²/маш.-ч является изменяемым инженерным допущением.", affected_row_ids: ["grader"] },
    ];
  }
  if (profile === "rehabilitation_with_milling") {
    return [
      ...common,
      { canonical_key: "construction_mode", value: "repair", unit_id: null, reason_ru: "По запросу выбран ремонтный профиль с фрезерованием.", affected_row_ids: ["milling"] },
      { canonical_key: "milling_required", value: true, unit_id: null, reason_ru: "Фрезерование включено по прямому смыслу ремонтного запроса.", affected_row_ids: ["milling", "milling_machine", "milled_material_loading", "milled_material_transport", "milled_material_disposal"] },
      { canonical_key: "milling_depth_mm", value: 50, unit_id: "mm", reason_ru: "Глубина фрезерования 50 мм является предварительным инженерным допущением.", affected_row_ids: ["milling", "milling_machine", "milled_material_loading", "milled_material_transport", "milled_material_disposal"] },
      { canonical_key: "milling_productivity_m3_per_machine_hour", value: 25, unit_id: "m3_machine_hour", reason_ru: "Производительность фрезы 25 м³/маш.-ч является предварительным инженерным допущением.", affected_row_ids: ["milling_machine"] },
      { canonical_key: "disposal_distance_km", value: 15, unit_id: "km", reason_ru: "Расстояние вывоза 15 км является предварительным логистическим допущением.", affected_row_ids: ["milled_material_transport", "milled_material_disposal"] },
    ];
  }
  if (profile === "local_patch_repair") {
    return [
      ...common,
      { canonical_key: "construction_mode", value: "repair", unit_id: null, reason_ru: "Выбран локальный ремонт существующего покрытия.", affected_row_ids: ["local_patch_saw_cutting", "local_patch_removal", "local_patch_placement"] },
      { canonical_key: "base_condition", value: "local_repair", unit_id: null, reason_ru: "Основание считается требующим локальной подготовки только в границах ремонтных карт.", affected_row_ids: ["local_patch_base_preparation"] },
      { canonical_key: "asphalt_layer_count", value: 1, unit_id: "pcs", reason_ru: "Для предварительного локального ремонта принят один восстанавливаемый слой; фактическая глубина уточняется обследованием.", affected_row_ids: ["asphalt_layer_1_material", "asphalt_layer_1_paving"] },
      { canonical_key: "asphalt_layer_1_thickness_mm", value: 50, unit_id: "mm", reason_ru: "Толщина локального восстановления 50 мм является явным предварительным допущением.", affected_row_ids: ["asphalt_layer_1_material", "asphalt_layer_1_paving"] },
      { canonical_key: "sand_layer_required", value: false, unit_id: null, reason_ru: "Сплошной песчаный слой не входит в локальный ремонт.", affected_row_ids: [] },
      { canonical_key: "crushed_layer_count", value: 0, unit_id: "pcs", reason_ru: "Сплошные новые щебёночные слои не входят в локальный ремонт.", affected_row_ids: [] },
    ];
  }
  if (profile === "overlay_on_existing_pavement") {
    return [
      ...common,
      { canonical_key: "construction_mode", value: "repair", unit_id: null, reason_ru: "Выбран профиль усиления существующего покрытия без автоматического сплошного фрезерования.", affected_row_ids: ["existing_pavement_repairs"] },
      { canonical_key: "base_condition", value: "strengthening", unit_id: null, reason_ru: "Существующее покрытие предварительно принято требующим подготовки и усиления.", affected_row_ids: ["existing_pavement_repairs", "mechanized_surface_cleaning"] },
      { canonical_key: "asphalt_layer_count", value: 1, unit_id: "pcs", reason_ru: "Для предварительного усиления принят один новый слой; конструкция заменяется проектной.", affected_row_ids: ["asphalt_layer_1_material", "asphalt_layer_1_paving"] },
      { canonical_key: "sand_layer_required", value: false, unit_id: null, reason_ru: "Новый песчаный слой не включён в усиление существующего покрытия.", affected_row_ids: [] },
      { canonical_key: "crushed_layer_count", value: 0, unit_id: "pcs", reason_ru: "Новые сплошные щебёночные слои не включены без проекта усиления основания.", affected_row_ids: [] },
    ];
  }
  return [
    ...common,
    { canonical_key: "construction_mode", value: ["overlay_on_existing_pavement", "local_patch_repair"].includes(profile) ? "repair" : "new_construction", unit_id: null, reason_ru: ["overlay_on_existing_pavement", "local_patch_repair"].includes(profile) ? "По запросу выбран ремонтный профиль без автоматического фрезерования всей площади." : "Для покрытия по готовому основанию принят режим устройства нового покрытия.", affected_row_ids: [] },
    { canonical_key: "purpose", value: profile === "parking_surfacing_only" ? "yard_parking" : "public_road", unit_id: null, reason_ru: profile === "parking_surfacing_only" ? "Объект распознан как парковка по подготовленному основанию." : "Объект распознан как дорожное покрытие.", affected_row_ids: [] },
    { canonical_key: "base_condition", value: "good", unit_id: null, reason_ru: "Основание предварительно принято подготовленным и пригодным; новые слои основания не включены.", affected_row_ids: ["base_acceptance", "mechanized_surface_cleaning"] },
    { canonical_key: "sand_layer_required", value: false, unit_id: null, reason_ru: "Новый песчаный слой не включён в профиль по подготовленному основанию.", affected_row_ids: ["sand_material"] },
    { canonical_key: "crushed_layer_count", value: 0, unit_id: "pcs", reason_ru: "Новые щебёночные слои не включены в профиль по подготовленному основанию.", affected_row_ids: ["crushed_layer_1_material"] },
  ];
}

export function buildAsphaltPreliminaryAssemblyPolicyV4(input: {
  raw_text: string;
  existing_values: ReadonlyMap<string, unknown>;
  persisted_assumption_keys?: ReadonlySet<string>;
}): AsphaltPreliminaryAssemblyPolicyV4 {
  const profile = profileFor(input.raw_text, input.existing_values);
  const seeds = baseSeeds(profile);
  const assumptions: AsphaltDeclaredAssumptionV4[] = [];
  const length = numberValue(input.existing_values.get("length_m"));
  const width = numberValue(input.existing_values.get("width_m"));
  const area = numberValue(input.existing_values.get("area_m2"));
  const geometrySeeds: AssumptionSeed[] = [];
  if (length != null && length > 0 && width != null && width > 0 && !hasValue(input.existing_values.get("exclusions_m2"))) {
    geometrySeeds.push({ canonical_key: "exclusions_m2", value: 0, unit_id: "m2", reason_ru: "Исключаемая площадь предварительно принята равной 0 м²; пользователь может указать островки и иные исключения.", affected_row_ids: ["asphalt_area"] });
  } else if (!(area != null && area > 0) && !(length != null && length > 0 && width != null && width > 0)) {
    geometrySeeds.push(
      { canonical_key: "geometry_method", value: "direct_area", unit_id: null, reason_ru: "При отсутствии объёма выбран явный reference-basis.", affected_row_ids: ["asphalt_area"] },
      { canonical_key: "area_m2", value: 1000, unit_id: "m2", reason_ru: "Reference-смета рассчитана на 1000 м² и заменяется геометрией объекта после уточнения.", affected_row_ids: ["asphalt_area"] },
    );
  }
  const effectiveSeeds = new Map<string, AssumptionSeed>();
  for (const seed of [...geometrySeeds, ...seeds]) effectiveSeeds.set(seed.canonical_key, seed);
  for (const seed of effectiveSeeds.values()) {
    const existing = input.existing_values.get(seed.canonical_key);
    const persisted = input.persisted_assumption_keys?.has(seed.canonical_key) === true;
    if (hasValue(existing) && !persisted) continue;
    const value = persisted && hasValue(existing) ? existing : seed.value;
    assumptions.push({
      ...seed,
      value,
      parameter_id: `asphalt_concrete_pavement:parameter:${seed.canonical_key}:v4`,
      source_id: `${SOURCE_PREFIX}:${seed.canonical_key}`,
      confidence: "medium",
      user_confirmed: false,
    });
  }
  const titles: Record<AsphaltAssemblyProfileIdV4, string> = {
    surfacing_on_prepared_base: "двухслойное дорожное покрытие по подготовленному основанию",
    new_full_road_pavement: "полное строительство дороги с земляным полотном, основанием и покрытием",
    rehabilitation_with_milling: "ремонт дороги с фрезерованием и восстановлением покрытия",
    overlay_on_existing_pavement: "усиление существующего покрытия без сплошного фрезерования",
    local_patch_repair: "локальный ремонт покрытия",
    parking_full_construction: "полное строительство парковки с основанием и покрытием",
    parking_surfacing_only: "покрытие парковки по подготовленному основанию",
  };
  return {
    policy_id: POLICY_ID,
    policy_version: "1.0.0",
    assembly_id: `${profile}_preliminary_v1`,
    profile_id: profile,
    profile_title_ru: titles[profile],
    summary_ru: `Предварительно принято: ${titles[profile]}. Допущения можно изменить в уточняющих параметрах.`,
    assumptions,
  };
}
