export const CALCULATION_ARCHETYPES_V4 = [
  "AREA_LAYER", "VOLUME", "MASS", "LINEAR", "COUNT", "ASSEMBLY",
  "DEMOLITION", "NETWORK", "EQUIPMENT_INSTALLATION", "LABOR_SERVICE",
] as const;

export type CalculationArchetypeV4 = typeof CALCULATION_ARCHETYPES_V4[number];

export type ProfessionalWorkGroupFactoryV4 = {
  groupId: string;
  supportedArchetypes: readonly CalculationArchetypeV4[];
  sharedParameterDefinitions: readonly string[];
  sharedFormulaPrimitives: readonly string[];
  sharedAssemblies: readonly string[];
  sharedResourceDefinitions: readonly string[];
  sharedValidationRules: readonly string[];
  passportDefinitions: readonly string[];
};

export const MULTI_DOMAIN_GROUPS_V4 = [
  ["preparation_demolition", "Подготовка и демонтаж", ["DEMOLITION"]],
  ["earthworks", "Земляные работы", ["VOLUME", "MASS"]],
  ["foundations", "Фундаменты", ["ASSEMBLY", "VOLUME"]],
  ["concrete", "Бетон и железобетон", ["VOLUME", "MASS"]],
  ["masonry", "Кладка", ["AREA_LAYER", "VOLUME"]],
  ["steelwork", "Металлоконструкции", ["MASS", "ASSEMBLY"]],
  ["roofing", "Кровля", ["AREA_LAYER", "ASSEMBLY"]],
  ["waterproofing", "Гидроизоляция", ["AREA_LAYER"]],
  ["facades", "Фасады и утепление", ["AREA_LAYER"]],
  ["interior_finishes", "Внутренняя отделка", ["AREA_LAYER"]],
  ["windows_doors", "Окна и двери", ["COUNT"]],
  ["water_supply", "Водоснабжение", ["NETWORK", "LINEAR"]],
  ["sewerage", "Канализация", ["NETWORK", "LINEAR"]],
  ["heating", "Отопление", ["NETWORK", "COUNT"]],
  ["ventilation", "Вентиляция", ["NETWORK", "EQUIPMENT_INSTALLATION"]],
  ["electrical_low_current", "Электрика и слаботочные системы", ["NETWORK", "LINEAR"]],
  ["fire_systems", "Пожарные системы", ["NETWORK", "EQUIPMENT_INSTALLATION"]],
  ["roadworks_landscaping", "Дороги и благоустройство", ["AREA_LAYER", "ASSEMBLY"]],
  ["equipment_installation", "Монтаж оборудования", ["EQUIPMENT_INSTALLATION"]],
  ["special_energy", "Специальные и энергетические работы", ["ASSEMBLY", "LABOR_SERVICE"]],
] as const satisfies readonly (readonly [string, string, readonly CalculationArchetypeV4[]])[];

export const OPEN_MULTI_DOMAIN_SOURCES_V4 = [
  { sourceId: "kg_cost_method_open", jurisdiction: "KG", profile: "LOCAL_METHOD", url: "https://minstroy.gov.kg/kg/state_program/download-pdf/opredeleniastoimosti-666920560ea24800.09558714.pdf" },
  { sourceId: "ru_gesn_06", jurisdiction: "RU", profile: "REFERENCE_METHOD", url: "https://minstroyrf.gov.ru/docs/137985/" },
  { sourceId: "ru_gesn_21", jurisdiction: "RU", profile: "REFERENCE_METHOD", url: "https://minstroyrf.gov.ru/trades/dwd-gesn-2020.php?ID=20" },
  { sourceId: "ru_gesn_15", jurisdiction: "RU", profile: "REFERENCE_METHOD", url: "https://www.minstroyrf.gov.ru/docs/2923/" },
  { sourceId: "ru_gesnm_08", jurisdiction: "RU", profile: "REFERENCE_METHOD", url: "https://minstroyrf.gov.ru/docs/138034/" },
  { sourceId: "ru_gesn_23", jurisdiction: "RU", profile: "REFERENCE_METHOD", url: "https://minstroyrf.gov.ru/trades/dwd-gesn-2020.php?ID=22" },
  { sourceId: "ru_gesnr_65", jurisdiction: "RU", profile: "REFERENCE_METHOD", url: "https://minstroyrf.gov.ru/trades/dwd-gesn-2020.php?ID=121" },
  { sourceId: "uk_uniclass", jurisdiction: "UK", profile: "CLASSIFICATION_ONLY", url: "https://uniclass.thenbs.com/Download" },
  { sourceId: "global_bsdd", jurisdiction: "GLOBAL", profile: "CLASSIFICATION_ONLY", url: "https://github.com/buildingSMART/bSDD" },
] as const;

export const REFERENCE_WORK_CANDIDATES_V4 = [
  ["preparation_demolition", "building_structure_demolition", "Разборка строительных конструкций", "m3", "DEMOLITION"],
  ["earthworks", "trench_excavation", "Разработка грунта траншеи", "m3", "VOLUME"],
  ["foundations", "strip_foundation", "Устройство монолитного ленточного фундамента", "m3", "ASSEMBLY"],
  ["concrete", "monolithic_slab_concreting", "Бетонирование монолитной плиты", "m3", "VOLUME"],
  ["masonry", "masonry_wall", "Кладка стены", "m3", "VOLUME"],
  ["interior_finishes", "wall_plaster", "Оштукатуривание стен", "m2", "AREA_LAYER"],
  ["roofing", "roll_roofing", "Устройство рулонной кровли", "m2", "AREA_LAYER"],
  ["water_supply", "water_pipe_installation", "Монтаж водопроводной трубы", "m", "NETWORK"],
  ["sewerage", "sewer_pipe_installation", "Прокладка канализационной трубы", "m", "NETWORK"],
  ["electrical_low_current", "power_cable_laying", "Прокладка силового кабеля", "m", "NETWORK"],
  ["heating", "heating_appliance_installation", "Установка отопительного прибора", "pcs", "COUNT"],
  ["roadworks_landscaping", "asphalt_pavement", "Устройство асфальтобетонного покрытия", "m2", "ASSEMBLY"],
] as const satisfies readonly (readonly [string, string, string, string, CalculationArchetypeV4])[];

export const PROFESSIONAL_GROUP_FACTORIES_V4: readonly ProfessionalWorkGroupFactoryV4[] =
  MULTI_DOMAIN_GROUPS_V4.map(([groupId, , archetypes]) => ({
    groupId,
    supportedArchetypes: archetypes,
    sharedParameterDefinitions: [],
    sharedFormulaPrimitives: [],
    sharedAssemblies: [],
    sharedResourceDefinitions: [],
    sharedValidationRules: ["P0_REQUIRED_WITHOUT_SILENT_DEFAULT"],
    passportDefinitions: REFERENCE_WORK_CANDIDATES_V4
      .filter(([candidateGroupId]) => candidateGroupId === groupId)
      .map(([, workId]) => workId),
  }));
