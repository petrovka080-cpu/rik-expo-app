import {
  evaluateProductionFormulaDsl,
} from "./productionFormulaDsl";
import {
  buildEstimateNormItemForTemplateRow,
  formulaContextFromEstimateNormItem,
} from "./productionNormKnowledgeBaseCore";
import {
  evaluateProductionProjectTemplateGroupQuantityFormula,
  getProductionProjectTemplateGroup10000,
  type ProductionProjectTemplateGroup,
  type ProductionProjectTemplateGroupChild,
  type ProductionProjectTemplateGroupRowOverride,
} from "./productionProjectTemplateGroups";

export const PRODUCTION_TEMPLATE_10000_WAVE =
  "S_AI_ESTIMATE_10000_PROFESSIONAL_EXPANDED_WORK_TEMPLATES_CLOSEOUT_POINT_OF_NO_RETURN";

export const PRODUCTION_TEMPLATE_10000_READY_STATUS =
  "GREEN_AI_ESTIMATE_10000_PROFESSIONAL_EXPANDED_WORK_TEMPLATES_READY";

export const PRODUCTION_TEMPLATE_10000_ARTIFACT_DIR =
  "artifacts/S_AI_ESTIMATE_10000_PROFESSIONAL_EXPANDED_WORK_TEMPLATES";

export const REQUIRED_CATEGORY_DISTRIBUTION_10000 = {
  demolition: 350,
  earthworks: 550,
  concrete_foundation: 650,
  masonry: 500,
  waterproofing: 450,
  roofing: 500,
  insulation: 400,
  facade: 550,
  plaster_paint: 650,
  drywall_ceiling: 500,
  tile_stone: 500,
  flooring: 600,
  doors_windows: 400,
  carpentry_metal: 400,
  electrical: 750,
  plumbing: 650,
  heating_hvac: 550,
  ventilation: 300,
  paving_roads_landscape: 550,
  special_repair: 200,
} as const;

export type ProductionTemplate10000Category = keyof typeof REQUIRED_CATEGORY_DISTRIBUTION_10000;

export type ProductionDefaultUnit =
  | "m2"
  | "m3"
  | "linear_m"
  | "piece"
  | "set"
  | "kg"
  | "l"
  | "ton"
  | "trip"
  | "point"
  | "hour"
  | "day";

export type ProductionTemplateSection =
  | "materials"
  | "components"
  | "consumables"
  | "labor"
  | "preparation"
  | "equipment"
  | "logistics"
  | "waste"
  | "quality_control"
  | "overhead"
  | "tax";

export type ProductionSupportStatus =
  | "SUPPORTED"
  | "RECIPE_MISSING"
  | "MATERIAL_RECIPE_MISSING"
  | "PRICEBOOK_SCOPE_MISSING"
  | "UNSUPPORTED";

export type ProductionPriceSourcePriority =
  | "catalog"
  | "ratebook"
  | "supplier"
  | "regional_default"
  | "manual_required";

export type ProductionWorkDefinition = {
  workKey: string;
  visibleNameRu: string;
  visibleNameEn?: string;
  category: ProductionTemplate10000Category;
  subcategory: string;
  systemKey?: string;
  elementKey?: string;
  operationKey: string;
  defaultUnit: ProductionDefaultUnit;
  expectedUnits: ProductionDefaultUnit[];
  supportStatus: ProductionSupportStatus;
  materialRecipeScope: string;
  pricebookScope: string;
  regionalPricebookScopes: Record<"KG" | "KZ" | "RU" | "UZ", string>;
  templateKey: string;
  templateFamily: string;
  complexity: "simple" | "standard" | "complex" | "mep_system";
  minimumRows: number;
  isActive: boolean;
};

export type ProductionWorkAlias = {
  workKey: string;
  language: "ru";
  alias: string;
  normalizedAlias: string;
};

export type ProductionExpandedTemplateRow = {
  rowCode: string;
  titleRu: string;
  section: ProductionTemplateSection;
  lineType: "material" | "work" | "service" | "equipment";
  recipeId: string;
  formulaDefinitionId: string;
  quantityFormula: string;
  unit: ProductionDefaultUnit;
  required: boolean;
  optional: boolean;
  includedByDefault: boolean;
  includedInEstimate: boolean;
  includedInProcurement: boolean;
  editable: boolean;
  materialKey?: string;
  catalogSearchLabelRu?: string;
  pricebookItemKey?: string;
  laborRateKey?: string;
  priceSourcePriority: ProductionPriceSourcePriority[];
  warningIfMissingPrice: string;
  normId: string;
  normFamilyId: string;
  normSourceId: string;
  normSourceTitle: string;
  normVersion: string;
  normReviewStatus: string;
};

export type ProductionExpandedEstimateTemplate = {
  templateKey: string;
  workKey: string;
  detailLevel: "professional_expanded";
  templateFamily: string;
  version: string;
  requiredInputs: {
    key: string;
    labelRu: string;
    unit: ProductionDefaultUnit;
    required: boolean;
  }[];
  rows: ProductionExpandedTemplateRow[];
};

export type ProductionCompiledExpandedRow = ProductionExpandedTemplateRow & {
  quantity: number;
  displayUnit: string;
  unitPrice: null;
  total: null;
  currency: string;
  priceStatus: "PRICE_MISSING";
  missingPriceHandledHonestly: true;
  formulaId: string;
  calculationTrace: string;
  sourceParameters: Record<string, unknown>;
  templateId: string;
  templateVersion: string;
  normId: string;
  normFamilyId: string;
  normSourceId: string;
  normSourceTitle: string;
  normVersion: string;
  normReviewStatus: string;
};

export type ProductionCompiledExpandedEstimate = {
  workKey: string;
  templateKey: string;
  detailLevel: "professional_expanded";
  visibleNameRu: string;
  category: ProductionTemplate10000Category;
  rows: ProductionCompiledExpandedRow[];
  currency: string;
  totals: {
    grandTotal: null;
    priceStatus: "PRICE_MISSING";
  };
  compiledHash: string;
};

type Term = { key: string; ru: string; alias?: string };

type CategoryPack = {
  category: ProductionTemplate10000Category;
  subcategory: string;
  templateFamily: string;
  defaultUnit: ProductionDefaultUnit;
  expectedUnits: ProductionDefaultUnit[];
  complexity: ProductionWorkDefinition["complexity"];
  systems: Term[];
  elements: Term[];
  operations: Term[];
  modifiers: Term[];
  materialTerms: string[];
  componentTerms: string[];
  consumableTerms: string[];
  preparationTerms: string[];
  laborTerms: string[];
  equipmentTerms: string[];
  logisticsTerms: string[];
  wasteTerms: string[];
  qualityTerms: string[];
};

const COMMON_MODIFIERS: Term[] = [
  { key: "standard", ru: "в стандартной зоне", alias: "стандартный объем" },
  { key: "small_area", ru: "на малой площади", alias: "малый объем" },
  { key: "large_area", ru: "на большой площади", alias: "крупный объем" },
  { key: "wet_zone", ru: "во влажной зоне", alias: "влажная зона" },
  { key: "technical_room", ru: "в техническом помещении", alias: "техническое помещение" },
  { key: "high_load", ru: "для высокой нагрузки", alias: "усиленное исполнение" },
  { key: "repair", ru: "с локальным ремонтом основания", alias: "с ремонтом основания" },
  { key: "access_limited", ru: "при ограниченном доступе", alias: "сложный доступ" },
  { key: "finish_ready", ru: "под чистовую сдачу", alias: "чистовая сдача" },
  { key: "commercial", ru: "для коммерческого объекта", alias: "коммерческий объект" },
];

const SYSTEMS: Term[] = [
  { key: "interior", ru: "внутренние работы" },
  { key: "exterior", ru: "наружные работы" },
  { key: "utility", ru: "инженерная зона" },
  { key: "site", ru: "площадка объекта" },
];

function terms(items: [string, string, string?][]): Term[] {
  return items.map(([key, ru, alias]) => ({ key, ru, alias }));
}

function pack(input: Omit<CategoryPack, "systems" | "modifiers"> & {
  systems?: Term[];
  modifiers?: Term[];
}): CategoryPack {
  return {
    systems: input.systems ?? SYSTEMS,
    modifiers: input.modifiers ?? COMMON_MODIFIERS,
    ...input,
  };
}

const CATEGORY_PACKS: Record<ProductionTemplate10000Category, CategoryPack> = {
  demolition: pack({
    category: "demolition",
    subcategory: "demolition",
    templateFamily: "demolition_bom_wbs",
    defaultUnit: "m2",
    expectedUnits: ["m2", "m3", "linear_m", "piece", "set"],
    complexity: "standard",
    elements: terms([
      ["tile", "плиточного покрытия"], ["partition", "перегородок"], ["screed", "стяжки пола"], ["plaster", "старой штукатурки"],
      ["flooring", "напольного покрытия"], ["ceiling", "подвесного потолка"], ["door_block", "дверного блока"], ["window_block", "оконного блока"],
      ["facade_layer", "фасадного слоя"], ["roof_layer", "кровельного слоя"], ["sanitary_fixture", "сантехнического прибора"], ["metal_frame", "металлического каркаса"],
    ]),
    operations: terms([
      ["remove", "демонтаж"], ["dismantle", "разборка"], ["strip", "снятие"], ["open", "вскрытие"],
      ["clean_after", "очистка после демонтажа"], ["sort", "сортировка демонтированного"], ["load", "погрузка демонтированного"], ["prepare_repair", "подготовка после демонтажа"],
    ]),
    materialTerms: ["защитная пленка", "мешки строительные", "укрывной материал", "пылезащита проемов", "контейнерная тара", "сигнальная лента"],
    componentTerms: ["ограждение зоны", "временный настил", "крепеж защиты", "защитные щиты"],
    consumableTerms: ["диски и пики", "фильтры пылесоса", "средства индивидуальной защиты"],
    preparationTerms: ["осмотр зоны", "отключение коммуникаций", "защита смежных поверхностей", "организация проходов"],
    laborTerms: ["разборка слоя", "снятие крепежа", "сортировка отходов", "погрузка отходов", "черновая уборка", "пылеудаление", "подготовка к следующему этапу"],
    equipmentTerms: ["перфоратор", "отбойный инструмент", "строительный пылесос"],
    logisticsTerms: ["вывоз отходов", "подача контейнера"],
    wasteTerms: ["контейнерный запас", "расход мешков"],
    qualityTerms: ["контроль скрытых повреждений", "проверка готовности основания", "фотофиксация зоны"],
  }),
  earthworks: pack({
    category: "earthworks",
    subcategory: "earthworks",
    templateFamily: "earthworks_bom_wbs",
    defaultUnit: "m3",
    expectedUnits: ["m3", "m2", "linear_m", "set"],
    complexity: "complex",
    elements: terms([
      ["trench", "траншеи"], ["pit", "котлована"], ["soil", "грунта"], ["sand_base", "песчаного основания"],
      ["gravel_base", "щебеночного основания"], ["backfill", "обратной засыпки"], ["grading", "планировки участка"], ["drainage", "дренажной канавы"],
      ["geotextile", "геотекстиля"], ["slope", "откоса"], ["roadbed", "земляного полотна"], ["utility_channel", "канала под коммуникации"],
    ]),
    operations: terms([
      ["excavate", "разработка"], ["grade", "планировка"], ["compact", "уплотнение"], ["backfill", "обратная засыпка"],
      ["level", "выравнивание"], ["prepare", "подготовка"], ["profile", "профилирование"], ["stabilize", "стабилизация"],
    ]),
    materialTerms: ["геотекстиль", "песок", "щебень", "сигнальная лента", "дренажная труба", "разделительный слой"],
    componentTerms: ["маяки высот", "колышки разбивки", "дренажные элементы", "борта временного крепления"],
    consumableTerms: ["разметочный шнур", "топливо техники", "средства индивидуальной защиты"],
    preparationTerms: ["геодезическая разбивка", "проверка отметок", "организация водоотвода", "подготовка подъезда"],
    laborTerms: ["разработка грунта", "перемещение грунта", "послойная отсыпка", "уплотнение слоя", "профилирование поверхности", "зачистка отметок", "подготовка к приемке"],
    equipmentTerms: ["экскаватор", "виброплита", "мини-погрузчик"],
    logisticsTerms: ["вывоз грунта", "доставка инертных материалов"],
    wasteTerms: ["коэффициент разрыхления", "резерв инертных материалов"],
    qualityTerms: ["контроль отметок", "контроль уплотнения", "акт скрытых работ"],
  }),
  concrete_foundation: pack({
    category: "concrete_foundation",
    subcategory: "concrete_and_foundation",
    templateFamily: "concrete_foundation_bom_wbs",
    defaultUnit: "m3",
    expectedUnits: ["m3", "m2", "linear_m", "kg", "ton", "set"],
    complexity: "complex",
    elements: terms([
      ["strip_foundation", "ленточного фундамента"], ["slab_foundation", "плитного фундамента"], ["pile_cap", "ростверка"], ["column_base", "столбчатого основания"],
      ["reinforcement_frame", "армокаркаса"], ["formwork", "опалубки"], ["concrete_slab", "бетонной плиты"], ["stairs_concrete", "бетонной лестницы"],
      ["pedestal", "бетонного пьедестала"], ["belt", "монолитного пояса"], ["anchor_group", "анкерной группы"], ["joint", "деформационного шва"],
    ]),
    operations: terms([
      ["pour", "бетонирование"], ["reinforce", "армирование"], ["form", "устройство"], ["vibrate", "вибрирование"],
      ["repair", "ремонт"], ["level", "выравнивание"], ["anchor", "монтаж закладных для"], ["cure", "уход за"],
    ]),
    materialTerms: ["бетонная смесь", "арматура", "опалубочный материал", "песчаная подготовка", "щебеночная подготовка", "гидроизоляционная отсечка"],
    componentTerms: ["фиксаторы защитного слоя", "вязальная проволока", "закладные элементы", "крепеж опалубки"],
    consumableTerms: ["пленка для ухода", "расход вибратора", "средства индивидуальной защиты"],
    preparationTerms: ["разбивка осей", "подготовка основания", "сборка опалубки", "проверка армирования"],
    laborTerms: ["вязка арматуры", "прием смеси", "укладка смеси", "вибрирование", "выравнивание верха", "уход за смесью", "распалубка"],
    equipmentTerms: ["бетононасос", "глубинный вибратор", "лазерный нивелир"],
    logisticsTerms: ["доставка смеси", "доставка арматуры"],
    wasteTerms: ["резерв смеси", "отходы опалубки"],
    qualityTerms: ["контроль геометрии", "контроль защитного слоя", "акт скрытых работ"],
  }),
  masonry: pack({
    category: "masonry",
    subcategory: "masonry",
    templateFamily: "masonry_bom_wbs",
    defaultUnit: "m2",
    expectedUnits: ["m2", "m3", "piece", "set"],
    complexity: "standard",
    elements: terms([
      ["brick_wall", "кирпичной стены"], ["block_wall", "блочной стены"], ["gas_block", "газоблочной кладки"], ["partition", "каменной перегородки"],
      ["chimney", "дымоходного канала"], ["column", "кладочного столба"], ["opening", "проема в кладке"], ["lintel", "перемычки"],
      ["facing", "облицовочной кладки"], ["parapet", "парапета"], ["base_course", "цокольной кладки"], ["reinforced_course", "армированного ряда"],
    ]),
    operations: terms([
      ["lay", "кладка"], ["repair", "ремонт"], ["reinforce", "армирование"], ["joint", "расшивка"],
      ["align", "выравнивание"], ["prepare", "подготовка"], ["install_lintel", "устройство"], ["clean", "очистка"],
    ]),
    materialTerms: ["кладочный материал", "кладочный раствор", "кладочная сетка", "перемычки", "отсечная изоляция", "анкера"],
    componentTerms: ["гибкие связи", "закладные детали", "защитные уголки", "профили примыкания"],
    consumableTerms: ["шнур причалка", "режущие диски", "средства индивидуальной защиты"],
    preparationTerms: ["разметка рядов", "подготовка основания", "вынос осей", "приготовление раствора"],
    laborTerms: ["кладка первого ряда", "кладка основного поля", "перевязка рядов", "устройство углов", "обход проемов", "расшивка швов", "очистка поверхности"],
    equipmentTerms: ["растворосмеситель", "леса", "режущий инструмент"],
    logisticsTerms: ["доставка кладочных материалов", "разгрузка"],
    wasteTerms: ["резерв на бой", "вывоз боя"],
    qualityTerms: ["контроль перевязки", "контроль вертикальности", "приемка кладки"],
  }),
  waterproofing: pack({
    category: "waterproofing",
    subcategory: "waterproofing",
    templateFamily: "waterproofing_bom_wbs",
    defaultUnit: "m2",
    expectedUnits: ["m2", "linear_m", "set"],
    complexity: "standard",
    elements: terms([
      ["bathroom", "гидроизоляции ванной"], ["foundation", "гидроизоляции фундамента"], ["roof", "гидроизоляции кровли"], ["balcony", "гидроизоляции балкона"],
      ["basement", "гидроизоляции подвала"], ["pool", "гидроизоляции бассейна"], ["terrace", "гидроизоляции террасы"], ["wet_zone", "гидроизоляции мокрой зоны"],
      ["joint", "герметизации швов"], ["penetration", "узлов проходок"], ["membrane", "мембранного слоя"], ["coating", "обмазочного слоя"],
    ]),
    operations: terms([
      ["apply", "устройство"], ["repair", "ремонт"], ["prime", "праймирование"], ["seal", "герметизация"],
      ["protect", "защита"], ["test", "проверка"], ["restore", "восстановление"], ["prepare", "подготовка"],
    ]),
    materialTerms: ["гидроизоляционный материал", "праймер", "мастика", "лента примыкания", "герметик", "защитный слой"],
    componentTerms: ["прижимные планки", "крепеж", "узлы проходок", "угловые элементы"],
    consumableTerms: ["кисти и валики", "газ или топливо", "средства индивидуальной защиты"],
    preparationTerms: ["очистка основания", "ремонт дефектов", "просушка", "грунтование"],
    laborTerms: ["нанесение праймера", "устройство основного слоя", "герметизация примыканий", "обработка проходок", "защитный слой", "финишная обработка", "уборка"],
    equipmentTerms: ["горелка или фен", "ручной каток", "страховка доступа"],
    logisticsTerms: ["доставка изоляции", "подъем материалов"],
    wasteTerms: ["запас на нахлест", "отходы обрезки"],
    qualityTerms: ["проверка нахлестов", "проверка герметичности", "фотофиксация скрытых работ"],
  }),
  roofing: pack({
    category: "roofing",
    subcategory: "roofing",
    templateFamily: "roofing_bom_wbs",
    defaultUnit: "m2",
    expectedUnits: ["m2", "linear_m", "set"],
    complexity: "complex",
    elements: terms([
      ["metal_roof", "металлической кровли"], ["soft_roof", "мягкой кровли"], ["pitched_roof", "скатной кровли"], ["flat_roof", "плоской кровли"],
      ["gutter", "водосточной системы"], ["ridge", "конькового узла"], ["valley", "ендовы"], ["parapet", "парапета кровли"],
      ["cornice", "карнизного узла"], ["roof_window", "кровельного окна"], ["snow_guard", "снегозадержания"], ["roof_repair", "ремонтного участка кровли"],
    ]),
    operations: terms([
      ["install", "монтаж"], ["repair", "ремонт"], ["replace", "замена"], ["seal", "герметизация"],
      ["prepare", "подготовка"], ["strengthen", "усиление"], ["align", "выравнивание"], ["inspect", "обследование"],
    ]),
    materialTerms: ["кровельное покрытие", "подкровельный слой", "обрешетка", "доборные элементы", "крепеж", "водоотводные элементы"],
    componentTerms: ["коньковые элементы", "ендовые элементы", "карнизные планки", "узлы примыкания"],
    consumableTerms: ["антисептик", "диски и биты", "средства защиты для высоты"],
    preparationTerms: ["обмер кровли", "проверка основания", "разметка скатов", "организация безопасности"],
    laborTerms: ["монтаж основания", "монтаж подкровельного слоя", "монтаж обрешетки", "монтаж покрытия", "монтаж доборов", "монтаж водостока", "герметизация примыканий"],
    equipmentTerms: ["леса и страховка", "подъемник", "электроинструмент"],
    logisticsTerms: ["доставка кровельных материалов", "подъем на кровлю"],
    wasteTerms: ["запас покрытия", "вывоз старого слоя"],
    qualityTerms: ["контроль нахлестов", "проверка крепежа", "проверка водоотвода"],
  }),
  insulation: pack({
    category: "insulation",
    subcategory: "insulation",
    templateFamily: "insulation_bom_wbs",
    defaultUnit: "m2",
    expectedUnits: ["m2", "m3", "linear_m", "set"],
    complexity: "standard",
    elements: terms([
      ["wall", "утепления стен"], ["facade", "утепления фасада"], ["roof", "утепления кровли"], ["floor", "утепления пола"],
      ["ceiling", "утепления потолка"], ["attic", "утепления чердака"], ["pipe", "изоляции труб"], ["duct", "изоляции воздуховодов"],
      ["basement", "утепления подвала"], ["balcony", "утепления балкона"], ["thermal_joint", "теплового шва"], ["sound_layer", "звукоизоляционного слоя"],
    ]),
    operations: terms([
      ["install", "монтаж"], ["replace", "замена"], ["repair", "ремонт"], ["seal", "герметизация"],
      ["prepare", "подготовка"], ["protect", "защита"], ["cut", "раскрой"], ["finish", "финишная обработка"],
    ]),
    materialTerms: ["утеплитель", "пароизоляция", "ветрозащита", "клей или крепеж", "армирующая сетка", "герметик швов"],
    componentTerms: ["дюбели", "профили", "ленты примыкания", "угловые элементы"],
    consumableTerms: ["ножи и резаки", "клейкие ленты", "средства индивидуальной защиты"],
    preparationTerms: ["подготовка основания", "разметка слоя", "очистка поверхности", "проверка влажности"],
    laborTerms: ["раскрой утеплителя", "монтаж утеплителя", "устройство пароизоляции", "герметизация швов", "монтаж защиты", "обработка примыканий", "финишная проверка"],
    equipmentTerms: ["режущий инструмент", "леса или стремянки", "пылесос"],
    logisticsTerms: ["доставка утеплителя", "подъем материалов"],
    wasteTerms: ["запас на подрезку", "отходы упаковки"],
    qualityTerms: ["контроль мостиков холода", "контроль примыканий", "фотофиксация"],
  }),
  facade: pack({
    category: "facade",
    subcategory: "facade",
    templateFamily: "facade_bom_wbs",
    defaultUnit: "m2",
    expectedUnits: ["m2", "linear_m", "set"],
    complexity: "complex",
    elements: terms([
      ["wet_facade", "мокрого фасада"], ["vent_facade", "вентилируемого фасада"], ["facade_plaster", "фасадной штукатурки"], ["facade_paint", "окраски фасада"],
      ["cladding", "фасадной облицовки"], ["cornice", "фасадного карниза"], ["slope", "наружного откоса"], ["base", "цокольной части"],
      ["joint", "фасадного шва"], ["decor", "декоративного элемента"], ["mesh_layer", "армирующего слоя"], ["panel", "фасадной панели"],
    ]),
    operations: terms([
      ["install", "монтаж"], ["apply", "нанесение"], ["repair", "ремонт"], ["replace", "замена"],
      ["prime", "грунтование"], ["seal", "герметизация"], ["align", "выравнивание"], ["prepare", "подготовка"],
    ]),
    materialTerms: ["фасадная система", "утеплитель", "фасадный клей", "армирующая сетка", "декоративный слой", "фасадная грунтовка"],
    componentTerms: ["фасадные дюбели", "угловые профили", "цокольный профиль", "узлы примыкания"],
    consumableTerms: ["малярная лента", "защитная пленка", "средства защиты"],
    preparationTerms: ["подготовка фасада", "проверка основания", "организация лесов", "разметка плоскости"],
    laborTerms: ["монтаж утеплителя", "армирующий слой", "грунтование", "финишный слой", "обработка примыканий", "уборка лесов", "финишная приемка"],
    equipmentTerms: ["леса", "подъемник", "миксер"],
    logisticsTerms: ["доставка фасадных материалов", "подъем на фасад"],
    wasteTerms: ["запас материала", "вывоз упаковки"],
    qualityTerms: ["контроль плоскости", "контроль адгезии", "контроль внешнего вида"],
  }),
  plaster_paint: pack({
    category: "plaster_paint",
    subcategory: "plaster_paint",
    templateFamily: "plaster_paint_bom_wbs",
    defaultUnit: "m2",
    expectedUnits: ["m2", "linear_m", "set"],
    complexity: "standard",
    elements: terms([
      ["wall_plaster", "штукатурки стен"], ["ceiling_plaster", "штукатурки потолка"], ["wall_putty", "шпаклевки стен"], ["paint_wall", "покраски стен"],
      ["paint_ceiling", "покраски потолка"], ["decor_plaster", "декоративной штукатурки"], ["primer", "грунтования поверхности"], ["repair_layer", "ремонтного слоя"],
      ["corner", "углов и примыканий"], ["texture", "фактурного покрытия"], ["glass_fiber", "стеклохолста"], ["finish_layer", "финишного слоя"],
    ]),
    operations: terms([
      ["apply", "нанесение"], ["level", "выравнивание"], ["paint", "окраска"], ["prime", "грунтование"],
      ["sand", "шлифовка"], ["repair", "ремонт"], ["prepare", "подготовка"], ["finish", "финишная отделка"],
    ]),
    materialTerms: ["смесь или краска", "грунтовка", "армирующий слой", "защитная пленка", "угловой профиль", "абразив"],
    componentTerms: ["маяки", "уголки", "лента примыкания", "терки и шпатели"],
    consumableTerms: ["валики", "кисти", "лотки"],
    preparationTerms: ["осмотр поверхности", "очистка", "локальный ремонт", "разметка зоны"],
    laborTerms: ["подготовка основания", "грунтование", "нанесение первого слоя", "нанесение второго слоя", "шлифовка", "обработка углов", "финишная зачистка"],
    equipmentTerms: ["ручной инструмент", "лазерный уровень", "пылесос"],
    logisticsTerms: ["доставка материалов", "подъем материалов"],
    wasteTerms: ["запас материала", "вывоз упаковки"],
    qualityTerms: ["контроль плоскости", "проверка готовности к сдаче", "финишная приемка"],
  }),
  drywall_ceiling: pack({
    category: "drywall_ceiling",
    subcategory: "drywall_ceiling",
    templateFamily: "drywall_ceiling_bom_wbs",
    defaultUnit: "m2",
    expectedUnits: ["m2", "linear_m", "piece", "set"],
    complexity: "standard",
    elements: terms([
      ["drywall_partition", "перегородки из гипсокартона"], ["drywall_ceiling", "потолка из гипсокартона"], ["wall_cladding", "обшивки стены гипсокартоном"], ["shaft", "короба из гипсокартона"],
      ["niche", "ниши из гипсокартона"], ["bulkhead", "потолочного короба"], ["sound_partition", "звукоизоляционной перегородки"], ["fire_partition", "огнестойкой перегородки"],
      ["moisture_partition", "влагостойкой перегородки"], ["revision_hatch", "ревизионного узла"], ["curve", "криволинейного элемента"], ["joint", "швов гипсокартона"],
    ]),
    operations: terms([
      ["install", "монтаж"], ["clad", "обшивка"], ["frame", "устройство каркаса"], ["insulate", "заполнение изоляцией"],
      ["finish_joint", "заделка швов"], ["repair", "ремонт"], ["prepare", "подготовка"], ["align", "выравнивание"],
    ]),
    materialTerms: ["листы гипсокартона", "направляющий профиль", "стоечный профиль", "изоляция", "шпаклевка швов", "лента швов"],
    componentTerms: ["саморезы", "дюбели", "угловой профиль", "уплотнительная лента"],
    consumableTerms: ["биты", "ножи", "средства индивидуальной защиты"],
    preparationTerms: ["разметка каркаса", "проверка основания", "подготовка примыканий", "организация доступа"],
    laborTerms: ["монтаж направляющих", "монтаж стоек", "укладка изоляции", "обшивка листами", "заделка швов", "шлифовка", "финишная проверка"],
    equipmentTerms: ["перфоратор", "шуруповерт", "лазерный уровень"],
    logisticsTerms: ["доставка листов", "подъем листов"],
    wasteTerms: ["запас листов", "вывоз обрезков"],
    qualityTerms: ["контроль каркаса", "контроль плоскости", "проверка швов"],
  }),
  tile_stone: pack({
    category: "tile_stone",
    subcategory: "tile_stone",
    templateFamily: "tile_stone_bom_wbs",
    defaultUnit: "m2",
    expectedUnits: ["m2", "linear_m", "piece", "set"],
    complexity: "standard",
    elements: terms([
      ["ceramic_tile", "керамической плитки"], ["porcelain_tile", "керамогранита"], ["stone_cladding", "каменной облицовки"], ["mosaic", "мозаики"],
      ["tile_floor", "плиточного пола"], ["tile_wall", "плиточной стены"], ["shower_tile", "плитки душевой"], ["stair_tile", "плитки лестницы"],
      ["terrace_tile", "уличной плитки"], ["base_tile", "цокольной плитки"], ["grout_joint", "межплиточных швов"], ["tile_profile", "профиля плитки"],
    ]),
    operations: terms([
      ["lay", "укладка"], ["repair", "ремонт"], ["replace", "замена"], ["grout", "затирка"],
      ["cut", "подрезка"], ["prepare", "подготовка"], ["waterproof", "подготовка гидроизоляции для"], ["align", "выравнивание под"],
    ]),
    materialTerms: ["плитка или камень", "плиточный клей", "затирка", "грунтовка", "изоляционный слой", "профили примыкания"],
    componentTerms: ["система выравнивания", "угловые профили", "клинья", "коронки и диски"],
    consumableTerms: ["губки", "крестики", "средства защиты"],
    preparationTerms: ["разметка раскладки", "подготовка основания", "грунтование", "проверка плоскости"],
    laborTerms: ["нанесение клея", "укладка поля", "подрезка", "обход углов", "затирка швов", "очистка поверхности", "приемка раскладки"],
    equipmentTerms: ["плиткорез", "миксер", "лазерный уровень"],
    logisticsTerms: ["доставка плитки", "подъем плитки"],
    wasteTerms: ["запас на подрезку", "отходы боя"],
    qualityTerms: ["контроль швов", "контроль уклона", "проверка пустот"],
  }),
  flooring: pack({
    category: "flooring",
    subcategory: "flooring",
    templateFamily: "flooring_bom_wbs",
    defaultUnit: "m2",
    expectedUnits: ["m2", "linear_m", "piece", "set"],
    complexity: "standard",
    elements: terms([
      ["laminate", "ламината"], ["carpet", "ковролина"], ["linoleum", "линолеума"], ["vinyl_tile", "виниловой плитки"],
      ["quartz_vinyl", "кварцвинила"], ["parquet", "паркета"], ["engineered_board", "инженерной доски"], ["baseboard", "плинтуса"],
      ["threshold", "порожков"], ["subfloor", "основания под покрытие"], ["commercial_floor", "коммерческого покрытия"], ["stair_cover", "покрытия лестницы"],
    ]),
    operations: terms([
      ["lay", "укладка"], ["install", "монтаж"], ["repair", "ремонт"], ["replace", "замена"],
      ["prepare", "подготовка"], ["glue", "приклейка"], ["trim", "подрезка"], ["finish", "финишная сдача"],
    ]),
    materialTerms: ["напольное покрытие", "подложка", "грунтовка основания", "профили перехода", "клей или лента", "защитный слой"],
    componentTerms: ["уголки плинтуса", "соединители", "заглушки", "крепеж"],
    consumableTerms: ["клинья", "режущие лезвия", "герметик примыканий"],
    preparationTerms: ["проверка перепадов", "очистка основания", "локальный ремонт", "разметка раскладки"],
    laborTerms: ["укладка подложки", "монтаж покрытия", "подрезка у стен", "обход проемов", "монтаж переходов", "монтаж плинтуса", "уборка после настила"],
    equipmentTerms: ["инструмент для резки", "лазерный уровень", "пылесос"],
    logisticsTerms: ["доставка покрытия", "подъем материалов"],
    wasteTerms: ["запас на подрезку", "вывоз упаковки"],
    qualityTerms: ["проверка зазоров", "проверка замков", "финишная приемка"],
  }),
  doors_windows: pack({
    category: "doors_windows",
    subcategory: "doors_windows",
    templateFamily: "doors_windows_bom_wbs",
    defaultUnit: "piece",
    expectedUnits: ["piece", "linear_m", "m2", "set"],
    complexity: "standard",
    elements: terms([
      ["interior_door", "межкомнатной двери"], ["entry_door", "входной двери"], ["door_frame", "дверной коробки"], ["trim", "наличников"],
      ["extension", "доборов"], ["window", "окна"], ["window_sill", "подоконника"], ["slope", "откосов"],
      ["drip", "отлива"], ["hardware", "фурнитуры"], ["glass_unit", "стеклопакета"], ["opening_seal", "герметизации проема"],
    ]),
    operations: terms([
      ["install", "установка"], ["replace", "замена"], ["adjust", "регулировка"], ["seal", "герметизация"],
      ["prepare", "подготовка"], ["repair", "ремонт"], ["foam", "запенивание"], ["finish", "чистовая отделка"],
    ]),
    materialTerms: ["блок изделия", "доборные элементы", "монтажная пена", "герметик", "ленты примыкания", "фурнитура"],
    componentTerms: ["анкера", "крепежные пластины", "клинья", "заглушки"],
    consumableTerms: ["расход инструмента", "защитная пленка", "уборочные расходники"],
    preparationTerms: ["замер проема", "подготовка проема", "проверка уровня", "защита примыканий"],
    laborTerms: ["установка блока", "выставление по уровню", "крепление", "запенивание", "монтаж доборов", "герметизация", "регулировка фурнитуры"],
    equipmentTerms: ["перфоратор", "шуруповерт", "лазерный уровень"],
    logisticsTerms: ["доставка изделия", "подъем изделия"],
    wasteTerms: ["запас пены", "вывоз упаковки"],
    qualityTerms: ["проверка геометрии", "проверка открывания", "финишная приемка"],
  }),
  carpentry_metal: pack({
    category: "carpentry_metal",
    subcategory: "carpentry_metal",
    templateFamily: "carpentry_metal_bom_wbs",
    defaultUnit: "m2",
    expectedUnits: ["m2", "linear_m", "piece", "kg", "set"],
    complexity: "standard",
    elements: terms([
      ["metal_frame", "металлокаркаса"], ["canopy", "навеса"], ["railing", "перил"], ["stairs", "лестницы"],
      ["gate", "ворот"], ["fence", "забора"], ["wicket", "калитки"], ["beam", "металлической балки"],
      ["embedded", "закладной детали"], ["wood_frame", "деревянного каркаса"], ["wood_cladding", "обшивки деревом"], ["deck", "настила"],
    ]),
    operations: terms([
      ["install", "монтаж"], ["weld", "сварка"], ["assemble", "сборка"], ["repair", "ремонт"],
      ["paint", "защитная окраска"], ["anchor", "крепление"], ["cut", "раскрой"], ["finish", "финишная обработка"],
    ]),
    materialTerms: ["профиль или пиломатериал", "крепеж", "защитный состав", "метизы", "настил", "грунтовка"],
    componentTerms: ["анкера", "пластины", "уголки", "соединители"],
    consumableTerms: ["электроды или диски", "биты", "средства защиты"],
    preparationTerms: ["замер", "разметка", "подготовка основания", "подготовка креплений"],
    laborTerms: ["раскрой", "сборка", "крепление", "сварка или соединение", "шлифовка", "защитная обработка", "приемка"],
    equipmentTerms: ["сварочный аппарат", "болгарка", "подъемное оборудование"],
    logisticsTerms: ["доставка материалов", "подача на место монтажа"],
    wasteTerms: ["запас материала", "отходы резки"],
    qualityTerms: ["контроль креплений", "контроль геометрии", "проверка защитного слоя"],
  }),
  electrical: pack({
    category: "electrical",
    subcategory: "electrical",
    templateFamily: "electrical_bom_wbs",
    defaultUnit: "point",
    expectedUnits: ["point", "linear_m", "piece", "set"],
    complexity: "mep_system",
    elements: terms([
      ["socket", "розеток"], ["switch", "выключателей"], ["power_cable", "силовой электропроводки"], ["vvg_cable", "кабеля ВВГнг-LS"],
      ["panel", "распределительного щита"], ["breaker", "автоматов"], ["rcd", "УЗО"], ["lighting", "освещения"],
      ["led_strip", "светодиодной ленты"], ["cable_channel", "кабель-канала"], ["low_voltage", "слаботочной линии"], ["internet", "интернет-кабеля"],
      ["video", "видеонаблюдения"], ["intercom", "домофона"], ["fire_alarm", "пожарной сигнализации"], ["access_control", "СКУД"],
    ]),
    operations: terms([
      ["install", "монтаж"], ["lay", "прокладка"], ["connect", "подключение"], ["replace", "замена"],
      ["test", "испытание"], ["mark", "маркировка"], ["commission", "пусконаладка"], ["prepare", "подготовка"],
    ]),
    materialTerms: ["кабель", "гофротруба", "кабельный канал", "клеммы", "щитовой элемент", "маркировка"],
    componentTerms: ["механизмы", "рамки", "автоматика", "распределительные коробки"],
    consumableTerms: ["наконечники", "стяжки", "изолента"],
    preparationTerms: ["обследование трасс", "разметка точек", "проверка питания", "подготовка штроб"],
    laborTerms: ["прокладка линии", "монтаж точки", "подключение", "маркировка", "проверка цепей", "сборка узла", "сдача схемы"],
    equipmentTerms: ["штроборез", "перфоратор", "тестер"],
    logisticsTerms: ["доставка кабеля", "доставка оборудования"],
    wasteTerms: ["запас кабеля", "отходы обрезки"],
    qualityTerms: ["прозвонка", "измерение сопротивления", "пусконаладка", "исполнительная схема", "проверка защиты", "маркировка линий", "сдача заказчику"],
  }),
  plumbing: pack({
    category: "plumbing",
    subcategory: "plumbing",
    templateFamily: "plumbing_bom_wbs",
    defaultUnit: "point",
    expectedUnits: ["point", "linear_m", "piece", "set"],
    complexity: "mep_system",
    elements: terms([
      ["water_pipe", "водопровода"], ["sewer", "канализации"], ["riser", "стояка"], ["ppr_pipe", "труб ППР"],
      ["pnd_pipe", "труб ПНД"], ["toilet", "унитаза"], ["sink", "раковины"], ["mixer", "смесителя"],
      ["bath", "ванны"], ["shower", "душевой"], ["pump", "насоса"], ["boiler", "бойлера"],
      ["filter", "фильтра"], ["collector", "коллектора"], ["meter", "счетчика воды"], ["installation", "инсталляции"],
    ]),
    operations: terms([
      ["install", "монтаж"], ["replace", "замена"], ["connect", "подключение"], ["pressure_test", "опрессовка"],
      ["repair", "ремонт"], ["route", "прокладка"], ["seal", "герметизация"], ["prepare", "подготовка"],
    ]),
    materialTerms: ["трубы", "фитинги", "уплотнители", "крепеж труб", "запорные элементы", "изоляция труб"],
    componentTerms: ["муфты", "угольники", "кронштейны", "сифоны"],
    consumableTerms: ["лента уплотнения", "паяльные расходники", "средства защиты"],
    preparationTerms: ["осмотр точки", "разметка трассы", "перекрытие воды", "подготовка проходок"],
    laborTerms: ["сборка линии", "крепление труб", "подключение прибора", "герметизация", "опрессовка", "промывка", "сдача узла"],
    equipmentTerms: ["паяльник", "пресс-инструмент", "опрессовочный насос"],
    logisticsTerms: ["доставка труб", "доставка приборов"],
    wasteTerms: ["запас фитингов", "вывоз упаковки"],
    qualityTerms: ["проверка герметичности", "опрессовка", "акт испытания", "проверка уклонов", "проверка креплений", "проверка узлов подключения", "сдача заказчику"],
  }),
  heating_hvac: pack({
    category: "heating_hvac",
    subcategory: "heating_hvac",
    templateFamily: "heating_hvac_bom_wbs",
    defaultUnit: "piece",
    expectedUnits: ["piece", "linear_m", "point", "set", "m2"],
    complexity: "mep_system",
    elements: terms([
      ["radiator", "радиатора"], ["warm_floor", "теплого пола"], ["boiler", "котла"], ["heating_pump", "насоса отопления"],
      ["collector", "коллектора отопления"], ["heating_pipe", "труб отопления"], ["heat_station", "теплового пункта"], ["conditioner", "кондиционера"],
      ["split", "сплит-системы"], ["chiller", "чиллера"], ["fancoil", "фанкойла"], ["air_curtain", "тепловой завесы"],
      ["chimney", "дымохода"], ["thermostat", "термостата"], ["balancing", "балансировочного узла"], ["insulation", "теплоизоляции системы"],
    ]),
    operations: terms([
      ["install", "монтаж"], ["replace", "замена"], ["connect", "подключение"], ["balance", "балансировка"],
      ["commission", "пусконаладка"], ["repair", "ремонт"], ["route", "прокладка"], ["prepare", "подготовка"],
    ]),
    materialTerms: ["оборудование", "трубы системы", "изоляция", "крепеж", "соединители", "контрольные элементы"],
    componentTerms: ["кронштейны", "краны", "датчики", "коллекторные элементы"],
    consumableTerms: ["уплотнители", "расход пайки", "средства защиты"],
    preparationTerms: ["обследование системы", "разметка трасс", "подготовка креплений", "проверка питания"],
    laborTerms: ["монтаж оборудования", "прокладка линии", "подключение", "изоляция", "заполнение системы", "балансировка", "пуск"],
    equipmentTerms: ["пресс-инструмент", "опрессовщик", "тепловизор"],
    logisticsTerms: ["доставка оборудования", "подъем оборудования"],
    wasteTerms: ["запас фитингов", "вывоз упаковки"],
    qualityTerms: ["опрессовка", "проверка герметичности", "пусконаладка", "балансировка", "измерение параметров", "проверка автоматики", "сдача заказчику"],
  }),
  ventilation: pack({
    category: "ventilation",
    subcategory: "ventilation",
    templateFamily: "ventilation_bom_wbs",
    defaultUnit: "set",
    expectedUnits: ["set", "linear_m", "piece", "point", "m2"],
    complexity: "mep_system",
    elements: terms([
      ["duct", "воздуховодов"], ["vent_channel", "вентканалов"], ["fan", "вентилятора"], ["hood", "вытяжки"],
      ["supply", "приточной вентиляции"], ["exhaust", "вытяжной вентиляции"], ["recuperator", "рекуператора"], ["silencer", "шумоглушителя"],
      ["diffuser", "диффузоров"], ["grille", "решеток"], ["duct_insulation", "изоляции воздуховодов"], ["commissioning", "пусконаладки вентиляции"],
    ]),
    operations: terms([
      ["install", "монтаж"], ["connect", "подключение"], ["balance", "балансировка"], ["seal", "герметизация"],
      ["insulate", "изоляция"], ["repair", "ремонт"], ["commission", "пусконаладка"], ["prepare", "подготовка"],
    ]),
    materialTerms: ["воздуховод", "крепеж подвесов", "уплотнительная лента", "шумоизоляция", "решетка", "регулирующий элемент"],
    componentTerms: ["фланцы", "хомуты", "подвесы", "диффузоры"],
    consumableTerms: ["герметик", "заклепки", "средства защиты"],
    preparationTerms: ["обследование трассы", "разметка подвесов", "проверка проемов", "подготовка доступа"],
    laborTerms: ["сборка участка", "монтаж подвесов", "монтаж воздуховода", "герметизация стыков", "изоляция", "подключение оборудования", "регулировка"],
    equipmentTerms: ["подъемник", "заклепочник", "измеритель расхода"],
    logisticsTerms: ["доставка воздуховодов", "подъем секций"],
    wasteTerms: ["запас секций", "отходы резки"],
    qualityTerms: ["проверка герметичности", "замер расхода", "балансировка", "пусконаладка", "исполнительная схема", "проверка шумовых параметров", "сдача заказчику"],
  }),
  paving_roads_landscape: pack({
    category: "paving_roads_landscape",
    subcategory: "paving_roads_landscape",
    templateFamily: "paving_roads_landscape_bom_wbs",
    defaultUnit: "m2",
    expectedUnits: ["m2", "linear_m", "m3", "piece", "set"],
    complexity: "complex",
    elements: terms([
      ["asphalt", "асфальтового покрытия"], ["paving_slab", "тротуарной плитки"], ["curb", "бордюра"], ["edge", "поребрика"],
      ["gravel_base", "щебеночного основания"], ["sand_base", "песчаного основания"], ["geotextile", "геотекстиля"], ["paver", "брусчатки"],
      ["concrete_path", "бетонной дорожки"], ["drainage", "дренажа участка"], ["lawn", "газона"], ["irrigation", "полива"],
      ["site_grading", "планировки участка"], ["road_marking", "разметки покрытия"], ["storm_tray", "ливневого лотка"], ["retaining", "подпорного элемента"],
    ]),
    operations: terms([
      ["install", "устройство"], ["lay", "укладка"], ["compact", "уплотнение"], ["repair", "ремонт"],
      ["prepare", "подготовка"], ["level", "выравнивание"], ["drain", "водоотвод для"], ["finish", "финишная сдача"],
    ]),
    materialTerms: ["основной материал покрытия", "песок", "щебень", "геотекстиль", "кромочный элемент", "дренажный элемент"],
    componentTerms: ["бордюрные элементы", "крепеж лотков", "маяки уклона", "разделители"],
    consumableTerms: ["топливо техники", "разметочный шнур", "средства защиты"],
    preparationTerms: ["разбивка отметок", "подготовка основания", "планировка", "проверка уклонов"],
    laborTerms: ["устройство основания", "послойное уплотнение", "укладка покрытия", "подрезка", "заполнение швов", "очистка", "приемка"],
    equipmentTerms: ["каток", "виброплита", "мини-погрузчик"],
    logisticsTerms: ["доставка инертных материалов", "вывоз отходов"],
    wasteTerms: ["запас покрытия", "отходы подрезки"],
    qualityTerms: ["контроль уклонов", "контроль уплотнения", "проверка водоотвода"],
  }),
  special_repair: pack({
    category: "special_repair",
    subcategory: "special_repair",
    templateFamily: "special_repair_bom_wbs",
    defaultUnit: "m2",
    expectedUnits: ["m2", "linear_m", "m3", "kg", "set"],
    complexity: "complex",
    elements: terms([
      ["joint_seal", "герметизации швов"], ["crack_repair", "ремонта трещин"], ["structure_strength", "усиления конструкций"], ["injection", "инъектирования"],
      ["anti_corrosion", "антикоррозийной защиты"], ["fireproof", "огнезащиты"], ["hydro_clean", "гидроабразивной очистки"], ["industrial_floor", "ремонта промышленных полов"],
      ["tank_repair", "ремонта резервуара"], ["technical_room", "ремонта технического помещения"], ["carbon_lamella", "композитного усиления"], ["chemical_anchor", "химического анкера"],
    ]),
    operations: terms([
      ["repair", "ремонт"], ["protect", "защита"], ["strengthen", "усиление"], ["inject", "инъектирование"],
      ["clean", "очистка"], ["seal", "герметизация"], ["prepare", "подготовка"], ["test", "испытание"],
    ]),
    materialTerms: ["ремонтный состав", "грунтовка", "защитный состав", "армирующий материал", "герметик", "инъекционный материал"],
    componentTerms: ["пакеры", "анкера", "ленты усиления", "крепеж"],
    consumableTerms: ["сопла", "абразив", "средства защиты"],
    preparationTerms: ["обследование дефекта", "подготовка поверхности", "раскрытие зоны", "защита смежных элементов"],
    laborTerms: ["очистка", "нанесение грунта", "заполнение дефекта", "усиление", "защитная обработка", "финишная зачистка", "сдача участка"],
    equipmentTerms: ["инъекционный насос", "шлифовальный инструмент", "измерительный прибор"],
    logisticsTerms: ["доставка спецматериалов", "подготовка зоны хранения"],
    wasteTerms: ["технологический запас", "отходы очистки"],
    qualityTerms: ["контроль адгезии", "контроль заполнения", "испытание участка"],
  }),
};

const CATEGORY_PACK_ARRAY = Object.values(CATEGORY_PACKS);
const DISTRIBUTION_TOTAL = Object.values(REQUIRED_CATEGORY_DISTRIBUTION_10000).reduce((sum, value) => sum + value, 0);

function normalizeAlias(value: string): string {
  return value.toLocaleLowerCase("ru-RU").replace(/\s+/g, " ").trim();
}

function pricebookCategoryCode(category: ProductionTemplate10000Category): string {
  return category.toUpperCase();
}

function minimumRowsFor(complexity: ProductionWorkDefinition["complexity"]): number {
  if (complexity === "simple") return 18;
  if (complexity === "complex") return 35;
  if (complexity === "mep_system") return 40;
  return 25;
}

function makeWorkKey(packItem: CategoryPack, system: Term, element: Term, operation: Term, modifier: Term): string {
  return `${packItem.category}_${system.key}_${element.key}_${operation.key}_${modifier.key}`;
}

function makeDefinition(packItem: CategoryPack, index: number): ProductionWorkDefinition {
  const element = packItem.elements[index % packItem.elements.length];
  const operation = packItem.operations[Math.floor(index / packItem.elements.length) % packItem.operations.length];
  const modifier = packItem.modifiers[
    Math.floor(index / (packItem.elements.length * packItem.operations.length)) % packItem.modifiers.length
  ];
  const system = packItem.systems[
    Math.floor(index / (packItem.elements.length * packItem.operations.length * packItem.modifiers.length)) % packItem.systems.length
  ];
  const workKey = makeWorkKey(packItem, system, element, operation, modifier);
  const scopeBase = workKey.toUpperCase();
  const categoryCode = pricebookCategoryCode(packItem.category);
  return {
    workKey,
    visibleNameRu: `${operation.ru} ${element.ru} ${modifier.ru}`,
    category: packItem.category,
    subcategory: packItem.subcategory,
    systemKey: system.key,
    elementKey: element.key,
    operationKey: operation.key,
    defaultUnit: packItem.defaultUnit,
    expectedUnits: packItem.expectedUnits,
    supportStatus: "SUPPORTED",
    materialRecipeScope: `${workKey}_material_recipe`,
    pricebookScope: `KG_${categoryCode}_${scopeBase}_MATERIALS`,
    regionalPricebookScopes: {
      KG: `KG_${categoryCode}_${scopeBase}_MATERIALS`,
      KZ: `KZ_${categoryCode}_${scopeBase}_MATERIALS`,
      RU: `RU_${categoryCode}_${scopeBase}_MATERIALS`,
      UZ: `UZ_${categoryCode}_${scopeBase}_MATERIALS`,
    },
    templateKey: `${workKey}_professional_expanded_v1`,
    templateFamily: packItem.templateFamily,
    complexity: packItem.complexity,
    minimumRows: minimumRowsFor(packItem.complexity),
    isActive: true,
  };
}

function buildDefinitions(): ProductionWorkDefinition[] {
  if (DISTRIBUTION_TOTAL !== 10000) {
    throw new Error(`PRODUCTION_TEMPLATE_10000_DISTRIBUTION_INVALID:${DISTRIBUTION_TOTAL}`);
  }
  return CATEGORY_PACK_ARRAY.flatMap((packItem) =>
    Array.from({ length: REQUIRED_CATEGORY_DISTRIBUTION_10000[packItem.category] }, (_, index) =>
      makeDefinition(packItem, index),
    ),
  );
}

export const PRODUCTION_WORK_DEFINITIONS_10000: readonly ProductionWorkDefinition[] = Object.freeze(buildDefinitions());

const DEFINITION_BY_WORK_KEY = new Map(PRODUCTION_WORK_DEFINITIONS_10000.map((definition) => [definition.workKey, definition]));
const EXPANDED_TEMPLATE_CACHE = new Map<string, ProductionExpandedEstimateTemplate>();
const COMPILED_ESTIMATE_CACHE = new Map<string, ProductionCompiledExpandedEstimate>();

function aliasTermsFor(definition: ProductionWorkDefinition): { element: Term; operation: Term; modifier: Term } {
  const packItem = CATEGORY_PACKS[definition.category];
  const element = packItem.elements.find((item) => item.key === definition.elementKey) ?? packItem.elements[0];
  const operation = packItem.operations.find((item) => item.key === definition.operationKey) ?? packItem.operations[0];
  const modifier = packItem.modifiers.find((item) => definition.visibleNameRu.endsWith(item.ru)) ?? packItem.modifiers[0];
  return { element, operation, modifier };
}

function aliasesForDefinition(definition: ProductionWorkDefinition): ProductionWorkAlias[] {
  const { element, operation, modifier } = aliasTermsFor(definition);
  const aliases = [
    definition.visibleNameRu,
    `${operation.ru} ${element.alias ?? element.ru}`,
    `${element.ru} ${modifier.alias ?? modifier.ru}`,
  ];
  return aliases.map((alias) => ({
    workKey: definition.workKey,
    language: "ru" as const,
    alias,
    normalizedAlias: normalizeAlias(alias),
  }));
}

export const PRODUCTION_WORK_ALIASES_10000: readonly ProductionWorkAlias[] = Object.freeze(
  PRODUCTION_WORK_DEFINITIONS_10000.flatMap(aliasesForDefinition),
);

const ALIAS_TO_WORK_KEY = new Map(PRODUCTION_WORK_ALIASES_10000.map((alias) => [alias.normalizedAlias, alias.workKey]));

function sourcePriorityFor(section: ProductionTemplateSection): ProductionPriceSourcePriority[] {
  if (section === "labor" || section === "preparation" || section === "quality_control") {
    return ["ratebook", "regional_default", "manual_required"];
  }
  if (section === "overhead" || section === "tax") {
    return ["ratebook", "manual_required"];
  }
  return ["catalog", "supplier", "ratebook", "regional_default", "manual_required"];
}

function allowedUnit(definition: ProductionWorkDefinition, ...candidates: ProductionDefaultUnit[]): ProductionDefaultUnit {
  return candidates.find((candidate) => definition.expectedUnits.includes(candidate)) ?? definition.defaultUnit;
}

function semanticProductionUnit(
  section: ProductionTemplateSection,
  term: string,
  definition: ProductionWorkDefinition,
): ProductionDefaultUnit {
  const name = term.toLocaleLowerCase("ru-RU");
  if (
    definition.elementKey === "baseboard" &&
    (section === "materials" || section === "labor" || section === "preparation" || section === "waste")
  ) {
    return allowedUnit(definition, "linear_m", definition.defaultUnit, "set");
  }
  if (section === "tax" || section === "overhead") return "set";
  if (section === "equipment") return allowedUnit(definition, "day", "hour", "set");
  if (section === "logistics") {
    if (/вывоз|грунт|инерт|смес|щеб|пес|бетон/.test(name)) return allowedUnit(definition, "m3", "ton", "set");
    return allowedUnit(definition, "set");
  }
  if (/кабел|труб|гофр|канал|лоток|профил|лента|шнур|водосток|трасс/.test(name)) {
    return allowedUnit(definition, "linear_m", "set");
  }
  if (/арматур|металл|проволок|электрод|крепеж|крепёж/.test(name)) {
    return allowedUnit(definition, "kg", "piece", "set");
  }
  if (/бетон|раствор|песок|щеб|грунт|смес/.test(name)) {
    return allowedUnit(definition, "m3", "kg", "ton", definition.defaultUnit, "set");
  }
  if (/плит|лист|панел|пленк|геотекст|утепл|мембран|покрыти|защит|настил|опалуб/.test(name)) {
    return allowedUnit(definition, "m2", definition.defaultUnit, "set");
  }
  if (/розет|выключ|точк|датчик|извещател|светильник|двер|окн|люк|прибор|клапан|вентилятор|радиатор|кран|фурнитур|фиксат|маяк|колыш|анк/.test(name)) {
    return allowedUnit(definition, "point", "piece", "set");
  }
  if (section === "components") return allowedUnit(definition, "piece", "linear_m", "kg", "set");
  if (section === "consumables") return allowedUnit(definition, "set", "piece", "kg");
  if (section === "preparation" && /осмотр|провер|организац|подготов|разбивк|обмер|отключ|акт|фото/.test(name)) return "set";
  if (section === "quality_control" && /контроль|провер|акт|прием|приём|фото|документ/.test(name)) return "set";
  if (section === "labor") return allowedUnit(definition, definition.defaultUnit, "point", "linear_m", "piece", "m2", "set");
  return allowedUnit(definition, definition.defaultUnit, "set");
}

function quantityFormulaFor(section: ProductionTemplateSection, unit: ProductionDefaultUnit): string {
  if (section === "components") {
    if (unit === "linear_m") return "round_to(q * normFactor, 4)";
    if (unit === "kg") return "round_to(q * normFactor * wasteFactor, 4)";
    return "max(minQty, ceil(q / packageSize))";
  }
  if (section === "consumables") {
    if (unit === "kg") return "round_to(q * normFactor * wasteFactor, 4)";
    if (unit === "linear_m") return "round_to(q * normFactor, 4)";
    return "max(minQty, ceil(q / packageSize))";
  }
  if (section === "equipment") return "max(minQty, ceil(q / packageSize))";
  if (section === "logistics") return "max(minQty, ceil(q / packageSize))";
  if (section === "waste") {
    if (unit === "kg") return "round_to(q * wasteRatio * wasteFactor, 4)";
    if (unit === "m3" || unit === "ton") return "round_to(q * wasteRatio, 4)";
    return "round_to(q * wasteRatio, 4)";
  }
  if (section === "overhead" || section === "tax") return "minQty";
  if (unit === "piece" || unit === "point") return "max(minQty, ceil(q / packageSize))";
  if (unit === "kg") return "round_to(q * normFactor * wasteFactor, 4)";
  if (unit === "linear_m") return "round_to(q * normFactor, 4)";
  if (unit === "m3" || unit === "ton") return "round_to(unit_convert(q, unitConversionFactor) * normFactor, 4)";
  return "round_to(q * normFactor, 4)";
}

function lineTypeForSection(section: ProductionTemplateSection): ProductionExpandedTemplateRow["lineType"] {
  if (section === "labor" || section === "preparation" || section === "quality_control") return "work";
  if (section === "equipment") return "equipment";
  if (section === "logistics" || section === "overhead" || section === "tax") return "service";
  return "material";
}

function displayUnitForProductionTemplate(unit: ProductionDefaultUnit): string {
  if (unit === "l") return "l";
  if (unit === "m2") return "м²";
  if (unit === "m3") return "м³";
  if (unit === "linear_m") return "пог. м";
  if (unit === "piece") return "шт";
  if (unit === "point") return "точка";
  if (unit === "set") return "компл.";
  if (unit === "kg") return "кг";
  if (unit === "ton") return "т";
  if (unit === "trip") return "рейс";
  if (unit === "hour") return "ч";
  if (unit === "day") return "день";
  return unit;
}

function rowTermsFor(packItem: CategoryPack): { section: ProductionTemplateSection; terms: string[] }[] {
  return [
    { section: "materials", terms: packItem.materialTerms },
    { section: "components", terms: packItem.componentTerms },
    { section: "consumables", terms: packItem.consumableTerms },
    { section: "preparation", terms: packItem.preparationTerms },
    { section: "labor", terms: packItem.laborTerms },
    { section: "equipment", terms: packItem.equipmentTerms },
    { section: "logistics", terms: packItem.logisticsTerms },
    { section: "waste", terms: packItem.wasteTerms },
    { section: "quality_control", terms: packItem.qualityTerms },
    { section: "overhead", terms: ["сметное сопровождение и проверка объема"] },
    { section: "tax", terms: ["налоговая строка по региональному правилу"] },
  ];
}

export function getProductionWorkDefinition10000(workKey: string): ProductionWorkDefinition | undefined {
  return DEFINITION_BY_WORK_KEY.get(workKey);
}

export function resolveProductionWorkDefinition10000(input: string): ProductionWorkDefinition | undefined {
  const exact = DEFINITION_BY_WORK_KEY.get(input);
  if (exact) return exact;
  const workKey = ALIAS_TO_WORK_KEY.get(normalizeAlias(input));
  return workKey ? DEFINITION_BY_WORK_KEY.get(workKey) : undefined;
}

function projectGroupRowCode(childTemplateId: string, rowCode: string): string {
  return `${childTemplateId}_${rowCode}`;
}

function matchingProjectGroupRowOverride(input: {
  group: ProductionProjectTemplateGroup;
  child: ProductionProjectTemplateGroupChild;
  row: ProductionCompiledExpandedRow;
}): ProductionProjectTemplateGroupRowOverride | null {
  return input.group.rowOverrides?.find((override) =>
    override.childTemplateId === input.child.childTemplateId &&
    override.sourceSection === input.row.section &&
    input.row.rowCode.endsWith(override.sourceRowCodeSuffix)
  ) ?? null;
}

function projectGroupRowOverride(input: {
  group: ProductionProjectTemplateGroup;
  child: ProductionProjectTemplateGroupChild;
  row: ProductionCompiledExpandedRow;
  projectQuantity: number;
}): {
  rowCode: string;
  titleRu: string;
  quantity: number;
  quantityFormula: string;
  unit: ProductionDefaultUnit;
} | null {
  const override = matchingProjectGroupRowOverride(input);
  if (!override) return null;
  const childQuantity = evaluateProductionProjectTemplateGroupQuantityFormula(input.child.quantityFormula, input.projectQuantity);
  if (override.quantitySource === "project_delivery_trip") {
    return {
      rowCode: override.rowCode,
      titleRu: override.titleRu,
      quantity: Math.max(1, Math.ceil(input.projectQuantity / 80)),
      quantityFormula: override.quantityFormula ?? "max(1, ceil(q / 80))",
      unit: override.unit ?? input.row.unit,
    };
  }
  if (override.quantitySource === "child_quantity") {
    return {
      rowCode: override.rowCode,
      titleRu: override.titleRu,
      quantity: childQuantity,
      quantityFormula: override.quantityFormula ?? input.child.quantityFormula,
      unit: override.unit ?? input.row.unit,
    };
  }
  return {
    rowCode: override.rowCode,
    titleRu: override.titleRu,
    quantity: input.row.quantity,
    quantityFormula: override.quantityFormula ?? input.row.quantityFormula,
    unit: override.unit ?? input.row.unit,
  };
}

function getProductionProjectGroupExpandedTemplate10000(
  group: ProductionProjectTemplateGroup,
): ProductionExpandedEstimateTemplate {
  const cached = EXPANDED_TEMPLATE_CACHE.get(group.workKey);
  if (cached) return cached;
  const rows: ProductionExpandedTemplateRow[] = group.children.flatMap((child) => {
    const childTemplate = getProductionExpandedTemplate10000(child.workKey);
    return childTemplate.rows.map((row) => ({
      ...row,
      rowCode: projectGroupRowCode(child.childTemplateId, row.rowCode),
      titleRu: `${child.childTemplateId}: ${row.titleRu}`,
      recipeId: `${group.templateKey}_${child.childTemplateId}_${row.recipeId}`,
      formulaDefinitionId: `${group.templateKey}_${child.childTemplateId}_${row.formulaDefinitionId}`,
      materialKey: row.materialKey ? `${group.templateKey}_${child.childTemplateId}_${row.materialKey}` : undefined,
      catalogSearchLabelRu: row.catalogSearchLabelRu ? `${child.childTemplateId}: ${row.catalogSearchLabelRu}` : undefined,
      pricebookItemKey: `${group.templateKey}_${child.childTemplateId}_${row.pricebookItemKey}`,
      laborRateKey: row.laborRateKey ? `${group.templateKey}_${child.childTemplateId}_${row.laborRateKey}` : undefined,
    }));
  });
  const template: ProductionExpandedEstimateTemplate = {
    templateKey: group.templateKey,
    workKey: group.workKey,
    detailLevel: "professional_expanded",
    templateFamily: group.templateFamily,
    version: group.version,
    requiredInputs: [{
      key: "q",
      labelRu: "Project base area",
      unit: group.defaultUnit,
      required: true,
    }],
    rows,
  };
  const frozenTemplate = freezeExpandedTemplate(template);
  EXPANDED_TEMPLATE_CACHE.set(group.workKey, frozenTemplate);
  return frozenTemplate;
}

export function getProductionExpandedTemplate10000(workKey: string): ProductionExpandedEstimateTemplate {
  const cached = EXPANDED_TEMPLATE_CACHE.get(workKey);
  if (cached) return cached;
  const definition = getProductionWorkDefinition10000(workKey);
  const projectGroup = getProductionProjectTemplateGroup10000(workKey);
  if (!definition && projectGroup) return getProductionProjectGroupExpandedTemplate10000(projectGroup);
  if (!definition) throw new Error(`PRODUCTION_TEMPLATE_10000_WORK_NOT_FOUND:${workKey}`);
  const packItem = CATEGORY_PACKS[definition.category];
  const elementLabel = aliasTermsFor(definition).element.ru;
  let rowIndex = 0;
  const rows = rowTermsFor(packItem).flatMap(({ section, terms }) =>
    terms.map((term) => {
      rowIndex += 1;
      const unit = semanticProductionUnit(section, term, definition);
      const materialLike = ["materials", "components", "consumables", "waste"].includes(section);
      const laborLike = ["labor", "preparation", "quality_control", "overhead"].includes(section);
      const rowCode = `${definition.workKey}_${section}_${String(rowIndex).padStart(2, "0")}`;
      const lineType = lineTypeForSection(section);
      const rowBase = {
        rowCode,
        titleRu: `${term} для ${elementLabel}`,
        section,
        lineType,
        recipeId: `${definition.templateKey}_${section}_recipe_v1`,
        formulaDefinitionId: `${definition.templateKey}_${section}_quantity_formula_v1`,
        quantityFormula: quantityFormulaFor(section, unit),
        unit,
        required: true,
        optional: false,
        includedByDefault: true,
        includedInEstimate: true,
        includedInProcurement: materialLike,
        editable: true,
        materialKey: materialLike ? `${definition.materialRecipeScope}_${section}_${rowIndex}` : undefined,
        catalogSearchLabelRu: materialLike ? `${term} ${elementLabel}` : undefined,
        pricebookItemKey: `${definition.regionalPricebookScopes.KG}_${rowCode.toUpperCase()}`,
        laborRateKey: laborLike ? `${definition.workKey}_${section}_labor_rate_${rowIndex}` : undefined,
        priceSourcePriority: sourcePriorityFor(section),
        warningIfMissingPrice: "Цена не подтверждена pricebook/catalog; требуется ручное подтверждение перед коммерческим предложением.",
      };
      const norm = buildEstimateNormItemForTemplateRow(definition, rowBase);
      return {
        ...rowBase,
        normId: norm.norm_id,
        normFamilyId: norm.norm_family_id,
        normSourceId: norm.source_id,
        normSourceTitle: norm.source_title,
        normVersion: norm.norm_version,
        normReviewStatus: norm.review_status,
      } satisfies ProductionExpandedTemplateRow;
    }),
  );
  const template: ProductionExpandedEstimateTemplate = {
    templateKey: definition.templateKey,
    workKey: definition.workKey,
    detailLevel: "professional_expanded",
    templateFamily: definition.templateFamily,
    version: "1.0.0",
    requiredInputs: [{
      key: "q",
      labelRu: "Объем работ",
      unit: definition.defaultUnit,
      required: true,
    }],
    rows,
  };
  const frozenTemplate = freezeExpandedTemplate(template);
  EXPANDED_TEMPLATE_CACHE.set(workKey, frozenTemplate);
  return frozenTemplate;
}

function stableHash(value: unknown): string {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function freezeTemplateRow(row: ProductionExpandedTemplateRow): ProductionExpandedTemplateRow {
  Object.freeze(row.priceSourcePriority);
  return Object.freeze(row);
}

function freezeExpandedTemplate(template: ProductionExpandedEstimateTemplate): ProductionExpandedEstimateTemplate {
  template.requiredInputs.forEach((input) => Object.freeze(input));
  Object.freeze(template.requiredInputs);
  template.rows.forEach(freezeTemplateRow);
  Object.freeze(template.rows);
  return Object.freeze(template);
}

function freezeCompiledRow(row: ProductionCompiledExpandedRow): ProductionCompiledExpandedRow {
  if (Array.isArray(row.sourceParameters.formulaVariables)) {
    Object.freeze(row.sourceParameters.formulaVariables);
  }
  if (Array.isArray(row.sourceParameters.formulaFunctions)) {
    Object.freeze(row.sourceParameters.formulaFunctions);
  }
  const formulaContext = row.sourceParameters.formulaContext;
  if (formulaContext && typeof formulaContext === "object" && !Array.isArray(formulaContext)) {
    Object.freeze(formulaContext);
  }
  Object.freeze(row.sourceParameters);
  return Object.freeze(row);
}

function freezeCompiledEstimate(estimate: ProductionCompiledExpandedEstimate): ProductionCompiledExpandedEstimate {
  estimate.rows.forEach(freezeCompiledRow);
  Object.freeze(estimate.rows);
  Object.freeze(estimate.totals);
  return Object.freeze(estimate);
}

export function currencyForProductionTemplateRegion(countryCode: string): string {
  const normalized = countryCode.toUpperCase();
  if (normalized === "KG") return "KGS";
  if (normalized === "KZ") return "KZT";
  if (normalized === "RU") return "RUB";
  if (normalized === "UZ") return "UZS";
  return "KGS";
}

function compileProductionProjectTemplateGroup10000(input: {
  group: ProductionProjectTemplateGroup;
  quantity?: number;
  countryCode?: string;
}): ProductionCompiledExpandedEstimate {
  const quantity = input.quantity && Number.isFinite(input.quantity) && input.quantity > 0
    ? input.quantity
    : input.group.defaultQuantity;
  const cacheKey = `${input.group.workKey}:${quantity}:${input.countryCode ?? "KG"}`;
  const cached = COMPILED_ESTIMATE_CACHE.get(cacheKey);
  if (cached) return cached;
  const currency = currencyForProductionTemplateRegion(input.countryCode ?? "KG");
  const rows: ProductionCompiledExpandedRow[] = input.group.children.flatMap((child) => {
    const childQuantity = evaluateProductionProjectTemplateGroupQuantityFormula(child.quantityFormula, quantity);
    const childCompiled = compileProductionExpandedEstimate10000({
      workKey: child.workKey,
      quantity: childQuantity,
      countryCode: input.countryCode,
    });
    return childCompiled.rows.map((row) => {
      const rowOverride = projectGroupRowOverride({
        group: input.group,
        child,
        row,
        projectQuantity: quantity,
      });
      const rowCode = rowOverride?.rowCode ?? projectGroupRowCode(child.childTemplateId, row.rowCode);
      const unit = rowOverride?.unit ?? row.unit;
      const rowQuantity = rowOverride?.quantity ?? row.quantity;
      const quantityFormula = rowOverride?.quantityFormula ?? row.quantityFormula;
      return {
        ...row,
        rowCode,
        titleRu: rowOverride?.titleRu ?? `${child.childTemplateId}: ${row.titleRu}`,
        quantity: rowQuantity,
        quantityFormula,
        unit,
        displayUnit: displayUnitForProductionTemplate(unit),
        recipeId: `${input.group.templateKey}_${child.childTemplateId}_${row.recipeId}`,
        formulaDefinitionId: `${input.group.templateKey}_${child.childTemplateId}_${row.formulaDefinitionId}`,
        formulaId: `${input.group.templateKey}_${child.childTemplateId}_${row.formulaId}`,
        calculationTrace: [
          `template=${input.group.templateKey}`,
          `templateVersion=${input.group.version}`,
          `projectTemplateGroup=${input.group.workKey}`,
          `projectBaseQuantity=${quantity} ${input.group.defaultUnit}`,
          `childTemplateId=${child.childTemplateId}`,
          `childWorkKey=${child.workKey}`,
          `childQuantityFormula=${child.quantityFormula}`,
          `childBaseQuantity=${childQuantity} ${child.unit}`,
          rowOverride ? `projectGroupOverrideRowCode=${rowOverride.rowCode}` : null,
          row.calculationTrace,
        ].filter(Boolean).join("; "),
        sourceParameters: {
          ...row.sourceParameters,
          baseQuantity: quantity,
          baseUnit: input.group.defaultUnit,
          workKey: input.group.workKey,
          rowCode,
          projectTemplateGroupKey: input.group.workKey,
          projectTemplateGroupTemplateKey: input.group.templateKey,
          projectTemplateGroupVersion: input.group.version,
          projectGroupOverrideRowCode: rowOverride?.rowCode,
          projectTemplateGroupChildId: child.childTemplateId,
          projectTemplateGroupChildRole: child.role,
          childWorkKey: child.workKey,
          childTemplateKey: childCompiled.templateKey,
          childBaseQuantity: childQuantity,
          childBaseUnit: child.unit,
          childQuantityFormula: child.quantityFormula,
          rowUnit: unit,
          displayUnit: displayUnitForProductionTemplate(unit),
          quantityFormula,
        },
        templateId: input.group.templateKey,
        templateVersion: input.group.version,
      };
    });
  });
  const compiled: ProductionCompiledExpandedEstimate = {
    workKey: input.group.workKey,
    templateKey: input.group.templateKey,
    detailLevel: "professional_expanded",
    visibleNameRu: input.group.visibleNameRu,
    category: input.group.category,
    rows,
    currency,
    totals: {
      grandTotal: null,
      priceStatus: "PRICE_MISSING",
    },
    compiledHash: stableHash({
      workKey: input.group.workKey,
      rowCodes: rows.map((row) => row.rowCode),
      sections: rows.map((row) => row.section),
      currency,
    }),
  };
  const frozenCompiled = freezeCompiledEstimate(compiled);
  COMPILED_ESTIMATE_CACHE.set(cacheKey, frozenCompiled);
  return frozenCompiled;
}

export function compileProductionExpandedEstimate10000(input: {
  workKey: string;
  quantity?: number;
  countryCode?: string;
}): ProductionCompiledExpandedEstimate {
  const definition = getProductionWorkDefinition10000(input.workKey);
  const projectGroup = getProductionProjectTemplateGroup10000(input.workKey);
  if (!definition && projectGroup) {
    return compileProductionProjectTemplateGroup10000({
      group: projectGroup,
      quantity: input.quantity,
      countryCode: input.countryCode,
    });
  }
  if (!definition) throw new Error(`PRODUCTION_TEMPLATE_10000_WORK_NOT_FOUND:${input.workKey}`);
  const template = getProductionExpandedTemplate10000(input.workKey);
  const quantity = input.quantity && Number.isFinite(input.quantity) && input.quantity > 0 ? input.quantity : 100;
  const cacheKey = `${definition.workKey}:${quantity}:${input.countryCode ?? "KG"}`;
  const cached = COMPILED_ESTIMATE_CACHE.get(cacheKey);
  if (cached) return cached;
  const currency = currencyForProductionTemplateRegion(input.countryCode ?? "KG");
  const rows: ProductionCompiledExpandedRow[] = template.rows.map((row) => {
    const norm = buildEstimateNormItemForTemplateRow(definition, row);
    const formulaContext = formulaContextFromEstimateNormItem(norm, quantity);
    const formulaResult = evaluateProductionFormulaDsl(row.quantityFormula, formulaContext);
    const rowQuantity = formulaResult.value;
    const outputUnit = norm.unit as ProductionDefaultUnit;
    const templateId = template.templateKey;
    const templateVersion = template.version;
    const formulaId = `${row.formulaDefinitionId}_${row.rowCode}`;
    return {
      ...row,
      unit: outputUnit,
      quantity: rowQuantity,
      displayUnit: displayUnitForProductionTemplate(outputUnit),
      unitPrice: null,
      total: null,
      currency,
      priceStatus: "PRICE_MISSING",
      missingPriceHandledHonestly: true,
      formulaId,
      calculationTrace: [
        `template=${templateId}`,
        `templateVersion=${templateVersion}`,
        `baseQuantity=${quantity} ${definition.defaultUnit}`,
        `formula=${row.quantityFormula}`,
        formulaResult.trace,
        `normId=${norm.norm_id}`,
        `normVersion=${norm.norm_version}`,
        `normSource=${norm.source_id}`,
        `normFamily=${norm.norm_family_id}`,
        `normRate=${norm.consumption_rate}`,
        `normFactor=${formulaContext.normFactor}`,
        `wastePercent=${formulaContext.wastePercent}`,
        `normReviewStatus=${norm.review_status}`,
        `normProvenance=${norm.source_provenance}`,
        `rounding=round_to_4`,
        `result=${rowQuantity} ${outputUnit}`,
      ].join("; "),
      sourceParameters: {
        baseQuantity: quantity,
        baseUnit: definition.defaultUnit,
        templateRowUnit: row.unit,
        rowUnit: outputUnit,
        displayUnit: displayUnitForProductionTemplate(outputUnit),
        workKey: definition.workKey,
        rowCode: row.rowCode,
        recipeId: row.recipeId,
        formulaDefinitionId: row.formulaDefinitionId,
        formulaVariables: formulaResult.variablesUsed,
        formulaFunctions: formulaResult.functionsUsed,
        formulaContext,
        normId: norm.norm_id,
        normFamilyId: norm.norm_family_id,
        normVersion: norm.norm_version,
        normSourceId: norm.source_id,
        normSourceTitle: norm.source_title,
        normSourceType: norm.source_type,
        normSourceDocumentVersion: norm.source_document_version,
        normSourceProvenance: norm.source_provenance,
        normReviewStatus: norm.review_status,
        normLicenseStatus: norm.license_status,
        normQualityStatus: norm.quality_status,
        normUnit: norm.unit,
        normBaseUnit: norm.base_unit,
        normFormulaInputs: norm.formula_inputs,
        normParameterRequirements: norm.parameter_requirements,
      },
      templateId,
      templateVersion,
      normId: norm.norm_id,
      normFamilyId: norm.norm_family_id,
      normSourceId: norm.source_id,
      normSourceTitle: norm.source_title,
      normVersion: norm.norm_version,
      normReviewStatus: norm.review_status,
    };
  });
  const compiled: ProductionCompiledExpandedEstimate = {
    workKey: definition.workKey,
    templateKey: template.templateKey,
    detailLevel: "professional_expanded",
    visibleNameRu: definition.visibleNameRu,
    category: definition.category,
    rows,
    currency,
    totals: {
      grandTotal: null,
      priceStatus: "PRICE_MISSING",
    },
    compiledHash: stableHash({
      workKey: definition.workKey,
      rowCodes: rows.map((row) => row.rowCode),
      sections: rows.map((row) => row.section),
      currency,
    }),
  };
  const frozenCompiled = freezeCompiledEstimate(compiled);
  COMPILED_ESTIMATE_CACHE.set(cacheKey, frozenCompiled);
  return frozenCompiled;
}

export const PRODUCTION_EXPANDED_TEMPLATE_KEYS_10000: readonly string[] = Object.freeze(
  PRODUCTION_WORK_DEFINITIONS_10000.map((definition) => definition.templateKey),
);
