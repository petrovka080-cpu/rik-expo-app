import type {
  EstimateDraftRevisionParamSource,
  EstimateDraftRevisionSource,
} from "./estimateDraftRevisionContract";

export type AiEstimateRuParameterDictionaryEntry = {
  key: string;
  labelRu: string;
  shortLabelRu?: string;
  unit?: string | null;
  aliasesRu: string[];
  promptPhraseRu: string;
  descriptionRu: string;
};

const PARAMETER_DICTIONARY: Record<string, AiEstimateRuParameterDictionaryEntry> = {
  q: entry("q", "Объем работ", null, ["количество работ", "объем", "объём"], "объем работ", "Базовый объем из выбранного шаблона."),
  work_package: entry("work_package", "Комплекс работ", "pcs", ["комплекс работ", "пакет работ"], "комплекс работ", "Количество типовых комплексов или узлов в расчете."),
  area_m2: entry("area_m2", "Площадь", "m2", ["площадь", "квадратные метры"], "площадь", "Площадь участка, помещения или поверхности."),
  facade_area_m2: entry("facade_area_m2", "Площадь фасада", "m2", ["фасад", "площадь фасада"], "площадь фасада", "Площадь фасадных поверхностей."),
  dry_floor_area_m2: entry("dry_floor_area_m2", "Площадь сухих помещений", "m2", ["сухая площадь"], "площадь сухих помещений", "Площадь помещений без мокрых зон."),
  bathroom_floor_area_m2: entry("bathroom_floor_area_m2", "Площадь санузлов", "m2", ["площадь ванной", "площадь мокрых зон"], "площадь санузлов", "Площадь пола санузлов и мокрых зон."),
  bathroom_wall_tile_area_m2: entry("bathroom_wall_tile_area_m2", "Плитка на стены санузлов", "m2", ["площадь плитки на стенах"], "площадь плитки на стенах санузлов", "Площадь стен санузлов под плитку."),
  net_wall_area_m2: entry("net_wall_area_m2", "Площадь стен", "m2", ["чистая площадь стен"], "площадь стен", "Площадь стен после вычета проемов."),
  paint_total_area_m2: entry("paint_total_area_m2", "Площадь окраски", "m2", ["окраска стен и потолков"], "площадь окраски", "Суммарная площадь окрашиваемых поверхностей."),
  glazing_area_m2: entry("glazing_area_m2", "Площадь остекления", "m2", ["окна", "витражи"], "площадь остекления", "Площадь окон, витражей или фасадного остекления."),
  roof_area_m2: entry("roof_area_m2", "Площадь кровли", "m2", ["кровля", "крыша"], "площадь кровли", "Площадь скатов или покрытия кровли."),
  deck_area_m2: entry("deck_area_m2", "Площадь настила", "m2", ["площадь плиты", "настил"], "площадь настила", "Площадь плиты, настила или мостового полотна."),
  section_m2: entry("section_m2", "Площадь сечения", "m2", ["сечение"], "площадь сечения", "Расчетное сечение тоннеля, трубы или канала."),
  wall_face_area_m2: entry("wall_face_area_m2", "Площадь стены", "m2", ["лицевая площадь стены"], "площадь стены", "Лицевая площадь стены или подпорной конструкции."),
  length_m: entry("length_m", "Длина", "m", ["длина", "протяженность", "трасса"], "длина", "Длина элемента, трассы или участка работ."),
  line_length_m: entry("line_length_m", "Длина линии", "m", ["длина линии", "протяженность линии"], "длина линии", "Длина инженерной линии или трассы."),
  channel_length_m: entry("channel_length_m", "Длина канала", "m", ["длина канала"], "длина канала", "Длина канала или деривационного участка."),
  baseboard_lm: entry("baseboard_lm", "Длина плинтуса", "m", ["плинтус"], "длина плинтуса", "Погонная длина плинтусов."),
  width_m: entry("width_m", "Ширина", "m", ["ширина"], "ширина", "Ширина помещения, дороги, канала или конструкции."),
  trench_width_m: entry("trench_width_m", "Ширина траншеи", "m", ["ширина траншеи"], "ширина траншеи", "Ширина траншеи для земляных работ."),
  crest_width_m: entry("crest_width_m", "Ширина гребня", "m", ["ширина гребня"], "ширина гребня", "Ширина гребня дамбы или насыпи."),
  height_m: entry("height_m", "Высота", "m", ["высота"], "высота", "Высота конструкции, этажа или стены."),
  ceiling_height_m: entry("ceiling_height_m", "Высота потолка", "m", ["потолок", "высота потолка"], "высота потолка", "Высота потолка для расчета стен, отделки и инженерии."),
  thickness_m: entry("thickness_m", "Толщина", "m", ["толщина"], "толщина", "Толщина слоя, стены, покрытия или конструкции."),
  insulation_thickness_mm: entry("insulation_thickness_mm", "Толщина утепления", "mm", ["утепление", "толщина утеплителя"], "толщина утепления", "Толщина теплоизоляции."),
  insulation_mm: entry("insulation_mm", "Толщина утеплителя", "mm", ["утеплитель"], "толщина утеплителя", "Толщина утеплителя в миллиметрах."),
  depth_mm: entry("depth_mm", "Глубина", "mm", ["глубина"], "глубина", "Глубина штробы, отверстия, слоя или узла."),
  trench_depth_m: entry("trench_depth_m", "Глубина траншеи", "m", ["глубина траншеи"], "глубина траншеи", "Глубина траншеи для земляных работ."),
  diameter_mm: entry("diameter_mm", "Диаметр", "mm", ["диаметр", "DN", "сечение"], "диаметр", "Диаметр трубы, отверстия или инженерного элемента."),
  volume_m3: entry("volume_m3", "Объем", "m3", ["объем", "кубатура"], "объем", "Объем материалов, грунта или конструкций."),
  volume_each_m3: entry("volume_each_m3", "Объем одного элемента", "m3", ["объем элемента"], "объем одного элемента", "Объем одного повторяющегося элемента."),
  count: entry("count", "Количество", "pcs", ["количество", "штук"], "количество", "Количество изделий, узлов или повторов."),
  bathrooms_count: entry("bathrooms_count", "Количество санузлов", "pcs", ["санузлы", "ванные"], "количество санузлов", "Количество санузлов и мокрых зон."),
  doors_count: entry("doors_count", "Количество дверей", "pcs", ["двери"], "количество дверей", "Количество дверей или проемов."),
  roof_windows_count: entry("roof_windows_count", "Количество мансардных окон", "pcs", ["мансардные окна"], "количество мансардных окон", "Количество окон в кровле."),
  poles_count: entry("poles_count", "Количество опор", "pcs", ["опоры"], "количество опор", "Количество опор линии или конструкции."),
  house_connections: entry("house_connections", "Подключения домов", "pcs", ["вводы", "подключения"], "количество подключений", "Количество подключений к сети."),
  electrical_points: entry("electrical_points", "Электроточки", "pcs", ["розетки", "выключатели", "электроточки"], "количество электроточек", "Количество розеток, выключателей и выводов."),
  water_points: entry("water_points", "Точки водоснабжения", "pcs", ["водоточки"], "количество водоточек", "Количество точек подключения воды."),
  sewer_points: entry("sewer_points", "Точки канализации", "pcs", ["канализационные точки"], "количество точек канализации", "Количество выпусков канализации."),
  phases: entry("phases", "Количество фаз", "pcs", ["фазы"], "количество фаз", "Количество фаз электрической линии."),
  pole_step_m: entry("pole_step_m", "Шаг опор", "m", ["шаг опор"], "шаг опор", "Расстояние между опорами."),
  voltage_kv: entry("voltage_kv", "Напряжение", "kV", ["напряжение"], "напряжение", "Напряжение инженерной сети."),
  power_kw: entry("power_kw", "Мощность", "kW", ["мощность"], "мощность", "Мощность оборудования или объекта."),
  power_mw: entry("power_mw", "Мощность", "MW", ["мощность"], "мощность", "Мощность крупного энергетического объекта."),
  capacity: entry("capacity", "Мощность или производительность", null, ["производительность"], "мощность", "Производительность или мощность объекта."),
  capacity_mw: entry("capacity_mw", "Мощность", "MW", ["мощность"], "мощность", "Установленная мощность объекта."),
  cable_section: entry("cable_section", "Сечение кабеля", "cores_x_mm2", ["кабель", "сечение кабеля"], "сечение кабеля", "Марка или сечение кабеля."),
  material_specification: entry("material_specification", "Материал и марка", null, ["материал", "марка"], "материал и марка", "Материал, марка, класс или тип изделия."),
  equipment_specification: entry("equipment_specification", "Спецификация оборудования", null, ["оборудование"], "спецификация оборудования", "Состав и параметры оборудования."),
  drawings_or_specification: entry("drawings_or_specification", "Проект или спецификация", null, ["проект", "спецификация"], "проект или спецификация", "Проектные листы, ведомости и спецификации."),
  project_location: entry("project_location", "Город или площадка", null, ["город", "площадка"], "город или площадка", "Место выполнения работ."),
  geology_profile: entry("geology_profile", "Геология и профиль", null, ["геология", "профиль"], "геология и профиль", "Геология, профиль трассы или основания."),
  loads: entry("loads", "Нагрузки", null, ["нагрузки"], "нагрузки", "Эксплуатационные и расчетные нагрузки."),
  site_access: entry("site_access", "Доступ на площадку", null, ["доступ", "логистика"], "доступ на площадку", "Условия подъезда, подъема и складирования."),
  work_complexity: entry("work_complexity", "Сложность работ", null, ["сложность"], "сложность работ", "Ограничения, высотность, стесненность и режим работ."),
  waste_volume_m3: entry("waste_volume_m3", "Объем мусора", "m3", ["мусор", "вывоз"], "объем мусора", "Объем демонтажного или строительного мусора."),
  package_mode: entry("package_mode", "Формат работ", null, ["под ключ", "комплектация"], "формат работ", "Формат выполнения: отдельные работы или под ключ."),
};

const TECHNICAL_HIDDEN_KEYS = new Set([
  "estimate_level",
  "prices",
  "source_prompt",
  "round_to",
  "baseQuantity",
  "baseUnit",
  "templateRowUnit",
  "rowUnit",
  "displayUnit",
  "workKey",
  "recipeId",
  "formulaDefinitionId",
]);

const UNIT_LABELS: Record<string, string> = {
  m2: "м²",
  sq_m: "м²",
  sqm: "м²",
  m3: "м³",
  cubic_m: "м³",
  m: "м",
  lm: "пог. м",
  linear_m: "пог. м",
  mm: "мм",
  cm: "см",
  pcs: "шт",
  piece: "шт",
  point: "точка",
  set: "компл.",
  bag: "мешок",
  kg: "кг",
  t: "т",
  ton: "т",
  hour: "ч",
  shift: "смена",
  kV: "кВ",
  kv: "кВ",
  kW: "кВт",
  kw: "кВт",
  MW: "МВт",
  mw: "МВт",
  cores_x_mm2: "жилы x мм²",
};

const TOKEN_LABELS: Record<string, string> = {
  area: "площадь",
  facade: "фасад",
  road: "дорога",
  deck: "настил",
  glazing: "остекление",
  length: "длина",
  line: "линия",
  channel: "канал",
  width: "ширина",
  height: "высота",
  ceiling: "потолок",
  thickness: "толщина",
  depth: "глубина",
  trench: "траншея",
  diameter: "диаметр",
  section: "сечение",
  volume: "объем",
  count: "количество",
  bathrooms: "санузлы",
  bathroom: "санузел",
  wall: "стена",
  floor: "пол",
  tile: "плитка",
  roof: "кровля",
  windows: "окна",
  doors: "двери",
  water: "вода",
  sewer: "канализация",
  electrical: "электрика",
  points: "точки",
  pole: "опора",
  poles: "опоры",
  step: "шаг",
  power: "мощность",
  voltage: "напряжение",
  capacity: "производительность",
  material: "материал",
  equipment: "оборудование",
  specification: "спецификация",
  project: "проект",
  location: "площадка",
  geology: "геология",
  profile: "профиль",
  loads: "нагрузки",
  access: "доступ",
  waste: "мусор",
  baseboard: "плинтус",
  dry: "сухие помещения",
  net: "чистая",
  paint: "окраска",
  total: "общая",
  each: "одного элемента",
  face: "лицевая",
  crest: "гребень",
  phases: "фазы",
  package: "формат",
  mode: "работ",
};

function entry(
  key: string,
  labelRu: string,
  unit: string | null,
  aliasesRu: string[],
  promptPhraseRu: string,
  descriptionRu: string,
): AiEstimateRuParameterDictionaryEntry {
  return { key, labelRu, unit, aliasesRu, promptPhraseRu, descriptionRu };
}

function looksTechnical(value: string): boolean {
  return /[_{}[\];=]|PRICE_MISSING|PRELIMINARY_BOQ|better_accuracy|contract_ready|safety_review|user_input|edited_by_user|default_assumption/i.test(value);
}

function hasCyrillic(value: string): boolean {
  return /[а-яё]/i.test(value);
}

function titleCaseRu(value: string): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed ? trimmed.charAt(0).toLocaleUpperCase("ru-RU") + trimmed.slice(1) : trimmed;
}

function fallbackLabelFromKey(key: string): string {
  const withoutUnit = key
    .replace(/_(m2|m3|mm|m|lm|kw|kv|mw|pcs)$/i, "")
    .replace(/^q$/, "объем работ");
  const translated = withoutUnit
    .split("_")
    .map((token) => TOKEN_LABELS[token] ?? "")
    .filter(Boolean)
    .join(" ");
  return titleCaseRu(translated || "Дополнительный параметр расчета");
}

export function isAiEstimateTechnicalHiddenParam(key: string): boolean {
  return TECHNICAL_HIDDEN_KEYS.has(key);
}

export function aiEstimateRuDictionaryEntry(key: string): AiEstimateRuParameterDictionaryEntry | null {
  return PARAMETER_DICTIONARY[key] ?? null;
}

export function aiEstimateRuLabelForParameter(key: string, fallback?: string | null): string {
  const dictionary = PARAMETER_DICTIONARY[key];
  if (dictionary) return dictionary.labelRu;
  const cleanFallback = String(fallback ?? "").replace(/\s+/g, " ").trim();
  if (cleanFallback && hasCyrillic(cleanFallback) && !looksTechnical(cleanFallback)) return cleanFallback;
  return fallbackLabelFromKey(key);
}

export function aiEstimateRuPromptPhraseForParameter(key: string): string {
  return PARAMETER_DICTIONARY[key]?.promptPhraseRu ?? fallbackLabelFromKey(key).toLocaleLowerCase("ru-RU");
}

export function aiEstimateRuUnitForParameter(key: string, unit?: string | null): string {
  const resolved = unit ?? PARAMETER_DICTIONARY[key]?.unit ?? unitFromKey(key);
  if (!resolved) return "";
  return UNIT_LABELS[resolved] ?? resolved;
}

export function aiEstimateCanonicalUnitForParameter(key: string, unit?: string | null): string | undefined {
  const resolved = unit ?? PARAMETER_DICTIONARY[key]?.unit ?? unitFromKey(key);
  return resolved ?? undefined;
}

export function aiEstimateRuSourceLabel(source: EstimateDraftRevisionParamSource | string): string {
  if (source === "user_input" || source === "user_prompt") return "из запроса";
  if (source === "edited_by_user" || source === "manual_override") return "изменено вручную";
  if (source === "default_assumption" || source === "catalog_default") return "принято по умолчанию";
  if (source === "derived" || source === "formula_derived") return "рассчитано";
  if (source === "schema_missing") return "нужно уточнить";
  return "параметр сметы";
}

export function aiEstimateRuRevisionSourceLabel(source: EstimateDraftRevisionSource): string {
  if (source === "initial_prompt") return "первичный запрос";
  if (source === "param_edit") return "изменение параметра";
  if (source === "param_add") return "добавление параметра";
  if (source === "template_change") return "смена работы";
  if (source === "assumption_override") return "замена допущения";
  return "ревизия сметы";
}

export function aiEstimateRequiredForRuLabel(value: "better_accuracy" | "contract_ready" | "safety_review" | string): string {
  if (value === "contract_ready") return "для рабочей сметы";
  if (value === "safety_review") return "для проверки безопасности";
  return "для точного расчета";
}

export function aiEstimateRuAssumptionLabel(key: string): string {
  if (key === "estimate_level") return "Уровень сметы";
  if (key === "prices") return "Статус цен";
  return aiEstimateRuLabelForParameter(key);
}

export function aiEstimateRuAssumptionValue(key: string, value: unknown): string {
  const text = String(value ?? "");
  if (key === "prices" && text === "PRICE_MISSING") return "источник цен не выбран";
  if (key === "estimate_level" && text === "PRELIMINARY_BOQ") return "предварительная профессиональная ведомость";
  return looksTechnical(text) ? "уточняется" : text;
}

export function aiEstimateRuAssumptionReason(reason: string, replacedByUserInput?: boolean): string {
  if (replacedByUserInput) return "заменено вводом пользователя";
  const text = String(reason ?? "");
  if (/price/i.test(text)) return "цены не подставляются без выбранного источника";
  if (/preliminary|contract-ready|project review|professional defaults/i.test(text)) {
    return "предварительный расчет; для рабочей сметы нужны уточнения";
  }
  if (/derived/i.test(text)) return "рассчитано из введенных размеров";
  return looksTechnical(text) ? "профессиональное допущение показано пользователю" : text;
}

export function containsForbiddenAiEstimateVisibleToken(value: string): boolean {
  return /PRICE_MISSING|PRELIMINARY_BOQ|better_accuracy|contract_ready|safety_review|user_input|edited_by_user|default_assumption|source_prompt|estimate_level|prices:|PDF\/buyer handoff|buyer handoff|raw input|work prompt/i.test(value);
}

export function unitFromKey(key: string): string | null {
  if (/_m2$/.test(key)) return "m2";
  if (/_m3$/.test(key)) return "m3";
  if (/_mm$/.test(key)) return "mm";
  if (/_lm$/.test(key)) return "m";
  if (/_m$/.test(key)) return "m";
  if (/_kv$/.test(key)) return "kV";
  if (/_kw$/.test(key)) return "kW";
  if (/_mw$/.test(key)) return "MW";
  if (/_count$|_points$|_pcs$/.test(key)) return "pcs";
  return null;
}
