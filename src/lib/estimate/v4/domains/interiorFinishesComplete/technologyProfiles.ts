import type {
  InteriorFinishesDomainInventoryRow,
  InteriorFinishesOwnedSourceDomain,
  InteriorFinishesScopeCapability,
} from "./inventory";

export type InteriorFormulaKind = "LAYER_KG" | "COAT_KG" | "AREA_MATERIAL" | "MASS_PER_AREA";

export type InteriorOperationProfile = {
  formula_kind: InteriorFormulaKind;
  operation_label_ru: string;
  main_resource_ru: string;
  equipment_ru: string;
  required_stages: readonly string[];
  optional_stages: readonly string[];
};

const profile = (
  formula_kind: InteriorFormulaKind,
  operation_label_ru: string,
  main_resource_ru: string,
  equipment_ru: string,
  required_stages: readonly string[],
  optional_stages: readonly string[] = [],
): InteriorOperationProfile => ({
  formula_kind,
  operation_label_ru,
  main_resource_ru,
  equipment_ru,
  required_stages,
  optional_stages,
});

const OPERATION_PROFILES: Readonly<Record<InteriorFinishesOwnedSourceDomain, Readonly<Record<string, InteriorOperationProfile>>>> = {
  plaster_paint: {
    FINISH: profile("COAT_KG", "Финишная отделка", "финишный состав", "миксер и финишно-шлифовальное оборудование", ["SUBSTRATE_ACCEPTANCE", "FINISH_MATERIAL_PREPARATION", "FINISH_APPLICATION", "FINISH_CLASS_CONTROL"], ["PRIMER", "SANDING"]),
    LEVEL: profile("LAYER_KG", "Выравнивание поверхности", "выравнивающая смесь", "растворосмеситель и инструмент выравнивания", ["SUBSTRATE_SURVEY", "LEVEL_REFERENCE_SETUP", "LEVELING_APPLICATION", "GEOMETRY_CONTROL"], ["BEACONS", "REINFORCEMENT_MESH"]),
    PAINT: profile("COAT_KG", "Окраска поверхности", "лакокрасочный состав", "малярная установка или комплект валиков", ["SUBSTRATE_ACCEPTANCE", "PAINT_PREPARATION", "COAT_APPLICATION", "COVERAGE_CONTROL"], ["MASKING", "ACCESS_EQUIPMENT"]),
    PREPARE: profile("MASS_PER_AREA", "Подготовка поверхности", "очистной и ремонтно-подготовительный состав", "пылеудаляющее и подготовительное оборудование", ["CONDITION_SURVEY", "CONTAMINATION_REMOVAL", "LOCAL_DEFECT_PREPARATION", "READINESS_CONTROL"], ["CRACK_REPAIR", "DUST_EXTRACTION"]),
    PRIME: profile("COAT_KG", "Грунтование поверхности", "грунтовочный состав", "оборудование нанесения грунтовки", ["CLEANLINESS_CONTROL", "PRIMER_PREPARATION", "PRIMER_APPLICATION", "DRYING_CONTROL"], ["SECOND_COAT", "MASKING"]),
    REPAIR: profile("LAYER_KG", "Локальный ремонт отделки", "ремонтный состав", "ремонтно-смесительное оборудование", ["DEFECT_MAPPING", "UNSOUND_LAYER_REMOVAL", "REPAIR_APPLICATION", "BOND_CONTROL"], ["REINFORCEMENT", "CURING_PROTECTION"]),
    SAND: profile("MASS_PER_AREA", "Шлифование поверхности", "абразивы и пылеулавливающие расходники", "шлифовальная машина с пылеудалением", ["FINISH_CLASS_REVIEW", "ABRASIVE_SELECTION", "SURFACE_SANDING", "DUST_AND_ROUGHNESS_CONTROL"], ["EDGE_HAND_SANDING"]),
  },
  drywall_ceiling: {
    ALIGN: profile("AREA_MATERIAL", "Выравнивание системы", "выравнивающие элементы каркаса", "лазерный нивелир и монтажный инструмент", ["GEOMETRY_SURVEY", "REFERENCE_PLANE_SETUP", "SYSTEM_ALIGNMENT", "PLANE_CONTROL"]),
    CLAD: profile("AREA_MATERIAL", "Обшивка листами", "листы, крепёж и сопрягающие элементы", "листовой подъёмник и шуруповёрт", ["FRAME_ACCEPTANCE", "SHEET_CUTTING", "SHEET_FIXING", "JOINT_GEOMETRY_CONTROL"], ["SECOND_SHEET_LAYER", "OPENING_DETAILS"]),
    FINISH_JOINT: profile("MASS_PER_AREA", "Обработка швов", "шовная шпаклёвка, лента и уголки", "миксер и шлифовально-пылеулавливающее оборудование", ["JOINT_INSPECTION", "TAPE_INSTALLATION", "JOINT_FILLING", "FINISH_CLASS_CONTROL"], ["SECOND_FILL", "CORNER_PROFILE"]),
    FRAME: profile("AREA_MATERIAL", "Монтаж каркаса", "профили, подвесы, соединители и крепёж", "лазерный нивелир, перфоратор и монтажный инструмент", ["SETTING_OUT", "PERIMETER_PROFILE_INSTALL", "PRIMARY_FRAME_INSTALL", "FRAME_GEOMETRY_CONTROL"], ["REINFORCEMENT", "SERVICE_OPENINGS"]),
    INSTALL: profile("AREA_MATERIAL", "Монтаж системы", "компоненты выбранной листовой или потолочной системы", "подъёмно-монтажный инструмент", ["BASE_ACCEPTANCE", "SYSTEM_SETTING_OUT", "COMPONENT_INSTALLATION", "INSTALLATION_CONTROL"], ["ACCESS_HATCH", "PERIMETER_DETAIL"]),
    INSULATE: profile("AREA_MATERIAL", "Заполнение изоляцией", "плиты или маты проектной изоляции", "раскройный и монтажный инструмент", ["CAVITY_ACCEPTANCE", "INSULATION_CUTTING", "CAVITY_FILLING", "CONTINUITY_CONTROL"], ["VAPOR_LAYER", "ACOUSTIC_SEAL"]),
    PREPARE: profile("MASS_PER_AREA", "Подготовка к монтажу", "разметочные, защитные и подготовительные расходники", "измерительное и пылеудаляющее оборудование", ["BASE_SURVEY", "SETTING_OUT", "LOCAL_BASE_PREPARATION", "READINESS_ACCEPTANCE"]),
    REPAIR: profile("AREA_MATERIAL", "Ремонт листовой системы", "заменяемые листы, профили и крепёж", "демонтажно-монтажный инструмент с пылеудалением", ["DAMAGE_MAPPING", "DAMAGED_COMPONENT_REMOVAL", "SYSTEM_REINSTATEMENT", "REPAIR_ACCEPTANCE"], ["INSULATION_REINSTATEMENT", "JOINT_FINISH"]),
  },
  flooring: {
    FINISH: profile("COAT_KG", "Финишная обработка пола", "финишный защитный состав", "шлифовально-наносное оборудование", ["SURFACE_ACCEPTANCE", "FINISH_PREPARATION", "FINISH_APPLICATION", "CURING_CONTROL"]),
    GLUE: profile("MASS_PER_AREA", "Приклеивание покрытия", "клеевой состав выбранной системы", "миксер и зубчатый распределительный инструмент", ["BASE_ACCEPTANCE", "ADHESIVE_PREPARATION", "ADHESIVE_APPLICATION", "BOND_CONTROL"]),
    INSTALL: profile("AREA_MATERIAL", "Монтаж напольной системы", "покрытие, подложка и системные аксессуары", "раскройно-монтажное оборудование", ["BASE_ACCEPTANCE", "LAYOUT_SETTING", "SYSTEM_INSTALLATION", "INSTALLATION_CONTROL"], ["UNDERLAY", "PERIMETER_GAP"]),
    LAY: profile("AREA_MATERIAL", "Укладка напольного покрытия", "напольное покрытие проектного типа", "раскройный инструмент и оборудование укладки", ["MATERIAL_CONDITIONING", "LAYOUT_SETTING", "COVERING_LAYING", "JOINT_AND_PLANE_CONTROL"], ["PATTERN_MATCHING", "ROLLING"]),
    PREPARE: profile("LAYER_KG", "Подготовка основания пола", "ремонтно-выравнивающая смесь основания", "шлифовально-пылеулавливающее и смесительное оборудование", ["BASE_SURVEY", "MOISTURE_CONTROL", "BASE_PREPARATION", "READINESS_ACCEPTANCE"], ["CRACK_REPAIR", "PRIMER"]),
    REPAIR: profile("AREA_MATERIAL", "Локальный ремонт пола", "ремонтные элементы покрытия и совместимые составы", "ремонтно-раскройное оборудование", ["DAMAGE_MAPPING", "LOCAL_REMOVAL", "REPAIR_INSTALLATION", "REPAIR_ACCEPTANCE"]),
    REPLACE: profile("AREA_MATERIAL", "Замена напольного покрытия", "новое покрытие и системные аксессуары", "демонтажно-укладочное оборудование", ["REPLACEMENT_BOUNDARY_SETUP", "OLD_COVERING_REMOVAL", "NEW_COVERING_INSTALLATION", "FINAL_ACCEPTANCE"]),
    TRIM: profile("MASS_PER_AREA", "Финишная подрезка и примыкания", "профили, пороги и расходники примыканий", "торцовочный и ручной монтажный инструмент", ["JUNCTION_SURVEY", "PROFILE_CUTTING", "PROFILE_FIXING", "JUNCTION_CONTROL"]),
  },
  tile_stone: {
    ALIGN: profile("LAYER_KG", "Выравнивание основания облицовки", "выравнивающая смесь", "смесительное и выравнивающее оборудование", ["BASE_SURVEY", "REFERENCE_PLANE_SETUP", "LEVELING_APPLICATION", "PLANE_CONTROL"], ["PRIMER", "REINFORCEMENT"]),
    CUT: profile("AREA_MATERIAL", "Раскрой облицовки", "плитка или камень с учётом проектного раскроя", "плиткорез с пыле- или водоподавлением", ["LAYOUT_REVIEW", "CUTTING_MAP", "MATERIAL_CUTTING", "CUT_EDGE_CONTROL"]),
    GROUT: profile("MASS_PER_AREA", "Заполнение швов", "затирочный состав и герметики швов", "смеситель и инструмент заполнения швов", ["JOINT_CLEANING", "GROUT_PREPARATION", "JOINT_FILLING", "JOINT_ACCEPTANCE"], ["ELASTIC_JOINT_SEAL"]),
    LAY: profile("AREA_MATERIAL", "Укладка плитки или камня", "плитка или камень проектного типа", "плиткорез, миксер и укладочный инструмент", ["BASE_ACCEPTANCE", "LAYOUT_SETTING", "ADHESIVE_AND_TILE_INSTALLATION", "PLANE_AND_JOINT_CONTROL"], ["LEVELING_SYSTEM", "COMPLEX_PATTERN"]),
    PREPARE: profile("MASS_PER_AREA", "Подготовка основания облицовки", "подготовительный и контактный состав", "шлифовально-пылеулавливающее оборудование", ["BASE_SURVEY", "CONTAMINATION_REMOVAL", "LOCAL_PREPARATION", "READINESS_ACCEPTANCE"]),
    REPAIR: profile("AREA_MATERIAL", "Локальный ремонт облицовки", "сменные элементы облицовки и совместимые составы", "демонтажно-укладочный инструмент", ["DEFECT_MAPPING", "LOCAL_REMOVAL", "REPAIR_INSTALLATION", "REPAIR_ACCEPTANCE"]),
    REPLACE: profile("AREA_MATERIAL", "Замена облицовки", "новая облицовка, клей и затирка", "демонтажное и плиткорезное оборудование", ["REPLACEMENT_BOUNDARY_SETUP", "OLD_FINISH_REMOVAL", "NEW_FINISH_INSTALLATION", "FINAL_ACCEPTANCE"]),
    WATERPROOF: profile("COAT_KG", "Гидроизоляционная подготовка мокрой зоны", "обмазочная гидроизоляция и системные ленты", "смесительное и наносное оборудование", ["BASE_MOISTURE_CONTROL", "JUNCTION_TAPE_INSTALLATION", "WATERPROOF_COAT_APPLICATION", "CONTINUITY_TEST"], ["PIPE_COLLARS", "SECOND_COAT"]),
  },
};

const MATERIAL_LABELS_RU: Readonly<Record<string, string>> = Object.freeze({
  CEILING_PLASTER: "потолочной штукатурки", CORNER: "углов и примыканий", DECOR_PLASTER: "декоративной штукатурки",
  FINISH_LAYER: "финишного слоя", GLASS_FIBER: "стеклохолста", PAINT_CEILING: "окраски потолка", PAINT_WALL: "окраски стен",
  PRIMER: "грунтования", REPAIR_LAYER: "ремонтного слоя", TEXTURE: "фактурного покрытия", WALL_PLASTER: "штукатурки стен", WALL_PUTTY: "шпаклёвки стен",
  BULKHEAD: "короба", CURVE: "криволинейной системы", DRYWALL_CEILING: "гипсокартонного потолка", DRYWALL_PARTITION: "гипсокартонной перегородки",
  FIRE_PARTITION: "огнестойкой перегородки", JOINT: "швов листовой системы", MOISTURE_PARTITION: "влагостойкой перегородки", NICHE: "ниши",
  REVISION_HATCH: "ревизионного люка", SHAFT: "обшивки шахты", SOUND_PARTITION: "звукоизоляционной перегородки", WALL_CLADDING: "облицовки стены",
  BASEBOARD: "плинтуса", CARPET: "коврового покрытия", COMMERCIAL_FLOOR: "коммерческого покрытия", ENGINEERED_BOARD: "инженерной доски",
  LAMINATE: "ламината", LINOLEUM: "линолеума", PARQUET: "паркета", QUARTZ_VINYL: "кварц-винилового покрытия", STAIR_COVER: "покрытия лестницы",
  SUBFLOOR: "чернового пола", THRESHOLD: "порога", VINYL_TILE: "виниловой плитки",
  BASE_TILE: "базовой плиточной системы", CERAMIC_TILE: "керамической плитки", GROUT_JOINT: "межплиточных швов", MOSAIC: "мозаики",
  PORCELAIN_TILE: "керамогранита", SHOWER_TILE: "облицовки душевой", STAIR_TILE: "облицовки лестницы", STONE_CLADDING: "каменной облицовки",
  TERRACE_TILE: "террасной плитки", TILE_FLOOR: "плиточного пола", TILE_PROFILE: "плиточного профиля", TILE_WALL: "облицовки стены плиткой",
});

export const INTERIOR_SCOPE_LABELS_RU: Readonly<Record<InteriorFinishesScopeCapability, string>> = Object.freeze({
  standard: "стандартная зона",
  small_area: "малая площадь",
  large_area: "большая площадь",
  wet_zone: "мокрая зона",
  technical_room: "техническое помещение",
  high_load: "повышенная эксплуатационная нагрузка",
  repair: "ремонт существующей отделки",
});

export function interiorOperationProfile(row: InteriorFinishesDomainInventoryRow): InteriorOperationProfile {
  const operation = OPERATION_PROFILES[row.source_domain_id][row.work_type.toUpperCase()];
  if (!operation) throw new Error(`INTERIOR_OPERATION_PROFILE_MISSING:${row.source_domain_id}:${row.work_type}`);
  return operation;
}

export function interiorMaterialSystemKey(row: InteriorFinishesDomainInventoryRow): string {
  const marker = `${row.source_domain_id}_interior_`;
  const scopeSuffix = `_${row.scope_capability}`;
  const operationSuffix = `_${row.work_type}`;
  const canonical = row.work_key.slice(marker.length, -scopeSuffix.length);
  return canonical.endsWith(operationSuffix)
    ? canonical.slice(0, -operationSuffix.length).toUpperCase()
    : canonical.toUpperCase();
}

export function interiorMaterialLabelRu(row: InteriorFinishesDomainInventoryRow): string {
  const materialKey = interiorMaterialSystemKey(row);
  const label = MATERIAL_LABELS_RU[materialKey];
  if (!label) throw new Error(`INTERIOR_MATERIAL_LABEL_MISSING:${row.catalog_id}:${materialKey}`);
  return label;
}
