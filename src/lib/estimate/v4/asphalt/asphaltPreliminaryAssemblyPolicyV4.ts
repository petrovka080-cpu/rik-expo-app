export type AsphaltAssemblyProfileIdV4 =
  | "asphalt_parking_on_prepared_base"
  | "asphalt_parking_new_construction"
  | "asphalt_pavement_repair"
  | "asphalt_resurfacing_with_milling";

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
  const milling = values.get("milling_required") === true || /фрезерован/iu.test(text);
  const repair = values.get("construction_mode") === "repair" || /ремонт|восстановлен|реконструкц/iu.test(text);
  if (repair && milling) return "asphalt_resurfacing_with_milling";
  if (repair) return "asphalt_pavement_repair";
  if (/нов(?:ая|ое|ый|ого|ую)\s+(?:парков|дорог|площад)|строительств|нов(?:ое|ого)\s+основан/iu.test(text)) {
    return "asphalt_parking_new_construction";
  }
  return "asphalt_parking_on_prepared_base";
}

function baseSeeds(profile: AsphaltAssemblyProfileIdV4): AssumptionSeed[] {
  const common: AssumptionSeed[] = [
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
  if (profile === "asphalt_parking_new_construction") {
    return [
      ...common,
      { canonical_key: "construction_mode", value: "new_construction", unit_id: null, reason_ru: "По формулировке о новом строительстве выбран профиль устройства нового основания.", affected_row_ids: ["sand_material", "crushed_layer_1_material", "crushed_layer_2_material"] },
      { canonical_key: "base_condition", value: "new_project", unit_id: null, reason_ru: "Для нового строительства основание предварительно принято новым; конструкция заменяется проектной.", affected_row_ids: ["sand_material", "crushed_layer_1_material", "crushed_layer_2_material"] },
      { canonical_key: "sand_layer_required", value: true, unit_id: null, reason_ru: "Для предварительного профиля нового основания включён песчаный слой.", affected_row_ids: ["sand_material", "sand_placement"] },
      { canonical_key: "sand_thickness_mm", value: 150, unit_id: "mm", reason_ru: "Толщина песчаного слоя 150 мм является инженерным допущением предварительной сборки.", affected_row_ids: ["sand_material", "sand_placement"] },
      { canonical_key: "sand_compaction_factor", value: 1.15, unit_id: "one", reason_ru: "Коэффициент поставки песка 1,15 является изменяемым инженерным допущением.", affected_row_ids: ["sand_material"] },
      { canonical_key: "sand_waste_percent", value: 3, unit_id: "percent", reason_ru: "Запас песка 3 % является изменяемым инженерным допущением.", affected_row_ids: ["sand_material"] },
      { canonical_key: "crushed_layer_count", value: 2, unit_id: "pcs", reason_ru: "Для нового основания предварительно приняты два щебёночных слоя.", affected_row_ids: ["crushed_layer_1_material", "crushed_layer_2_material"] },
      { canonical_key: "crushed_layer_1_fraction", value: "40_70", unit_id: null, reason_ru: "Фракция нижнего щебёночного слоя является предварительным инженерным допущением.", affected_row_ids: ["crushed_layer_1_material"] },
      { canonical_key: "crushed_layer_1_thickness_mm", value: 180, unit_id: "mm", reason_ru: "Толщина нижнего щебёночного слоя 180 мм является предварительным допущением.", affected_row_ids: ["crushed_layer_1_material"] },
      { canonical_key: "crushed_layer_1_compaction_factor", value: 1.18, unit_id: "one", reason_ru: "Коэффициент поставки нижнего щебёночного слоя 1,18 является допущением.", affected_row_ids: ["crushed_layer_1_material"] },
      { canonical_key: "crushed_layer_1_waste_percent", value: 3, unit_id: "percent", reason_ru: "Запас нижнего щебёночного слоя 3 % является допущением.", affected_row_ids: ["crushed_layer_1_material"] },
      { canonical_key: "crushed_layer_2_fraction", value: "20_40", unit_id: null, reason_ru: "Фракция верхнего щебёночного слоя является предварительным инженерным допущением.", affected_row_ids: ["crushed_layer_2_material"] },
      { canonical_key: "crushed_layer_2_thickness_mm", value: 120, unit_id: "mm", reason_ru: "Толщина верхнего щебёночного слоя 120 мм является предварительным допущением.", affected_row_ids: ["crushed_layer_2_material"] },
      { canonical_key: "crushed_layer_2_compaction_factor", value: 1.16, unit_id: "one", reason_ru: "Коэффициент поставки верхнего щебёночного слоя 1,16 является допущением.", affected_row_ids: ["crushed_layer_2_material"] },
      { canonical_key: "crushed_layer_2_waste_percent", value: 3, unit_id: "percent", reason_ru: "Запас верхнего щебёночного слоя 3 % является допущением.", affected_row_ids: ["crushed_layer_2_material"] },
      { canonical_key: "grader_productivity_m2_per_machine_hour", value: 220, unit_id: "m2_machine_hour", reason_ru: "Производительность автогрейдера 220 м²/маш.-ч является изменяемым инженерным допущением.", affected_row_ids: ["grader"] },
    ];
  }
  if (profile === "asphalt_resurfacing_with_milling") {
    return [
      ...common,
      { canonical_key: "construction_mode", value: "repair", unit_id: null, reason_ru: "По запросу выбран ремонтный профиль с фрезерованием.", affected_row_ids: ["milling"] },
      { canonical_key: "milling_required", value: true, unit_id: null, reason_ru: "Фрезерование включено по прямому смыслу ремонтного запроса.", affected_row_ids: ["milling", "milling_machine"] },
      { canonical_key: "milling_depth_mm", value: 50, unit_id: "mm", reason_ru: "Глубина фрезерования 50 мм является предварительным инженерным допущением.", affected_row_ids: ["milling", "milling_machine"] },
      { canonical_key: "milling_productivity_m3_per_machine_hour", value: 25, unit_id: "m3_machine_hour", reason_ru: "Производительность фрезы 25 м³/маш.-ч является предварительным инженерным допущением.", affected_row_ids: ["milling_machine"] },
      { canonical_key: "disposal_distance_km", value: 15, unit_id: "km", reason_ru: "Расстояние вывоза 15 км является предварительным логистическим допущением.", affected_row_ids: ["milled_material_transport"] },
    ];
  }
  return [
    ...common,
    { canonical_key: "construction_mode", value: profile === "asphalt_pavement_repair" ? "repair" : "new_construction", unit_id: null, reason_ru: profile === "asphalt_pavement_repair" ? "По запросу выбран ремонт без автоматического фрезерования." : "Для покрытия по готовому основанию принят режим устройства нового покрытия.", affected_row_ids: [] },
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
    asphalt_parking_on_prepared_base: "двухслойное покрытие по подготовленному основанию",
    asphalt_parking_new_construction: "новая дорожная одежда с основанием и двухслойным покрытием",
    asphalt_pavement_repair: "ремонт покрытия без автоматического фрезерования",
    asphalt_resurfacing_with_milling: "ремонт покрытия с фрезерованием",
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
