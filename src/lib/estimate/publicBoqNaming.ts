export type PublicBoqProcurementNamingProjection = {
  publicNameRu: string;
  specificationRu: string;
  procurementSearchNameRu: string;
  catalogOrPriceListReference: string;
  canBeProcuredByName: boolean;
};

const GENERIC_OR_UNBUYABLE_NAME = [
  /^(?:прочее|материалы|оборудование|изделия)$/iu,
  /технологический запас/iu,
  /основн(?:ые|ых) материал/iu,
  /расходн(?:ые|ых) материал/iu,
  /комплект(?: ручного)? инструмента/iu,
  /универсальн/iu,
  /узл(?:ы|ов) соединения/iu,
  /закладные и доборные элементы/iu,
  /креп[её]ж,? метизы и фиксаторы/iu,
  /грунтовочн(?:ый|ая) или контактн/iu,
];

const UNIT_LABEL_RU: Record<string, string> = {
  bag: "меш.",
  bucket: "вед.",
  day: "день",
  document: "док.",
  hour: "ч",
  kg: "кг",
  l: "л",
  linear_m: "м",
  m: "м",
  m2: "м²",
  m3: "м³",
  m3_day: "м³/сут",
  m3_h: "м³/ч",
  machine_hour: "маш.-ч",
  man_hour: "чел.-ч",
  MW: "МВт",
  pcs: "шт.",
  piece: "шт.",
  point: "точка",
  set: "компл.",
  shift: "смена",
  service: "усл.",
  t: "т",
  test: "исп.",
  ton: "т",
  trip: "рейс",
};

const BBZ_BISHKEK_PRICE_LIST_URL = "https://bbz.kg/price/";
const KULUKE_PRICE_LIST_URL = "https://kuluke.kg/doc/price.pdf";
const LES_KG_CATALOG_URL = "https://les.kg/";

function verifiedCatalogReferenceForPublicName(publicNameRu: string): string | null {
  if (/^(?:Бетон М350 \(B25\)|Автобетононасос 36 м)$/u.test(publicNameRu)) return BBZ_BISHKEK_PRICE_LIST_URL;
  if (/^(?:Арматура А500С, 12 мм|Вязальная проволока 1,2 мм)$/u.test(publicNameRu)) {
    return KULUKE_PRICE_LIST_URL;
  }
  if (/^Фанера ламинированная 18 мм$/u.test(publicNameRu)) return LES_KG_CATALOG_URL;
  return null;
}

function capitalizeRu(value: string): string {
  const trimmed = value.trim();
  return trimmed ? `${trimmed[0]!.toLocaleUpperCase("ru-RU")}${trimmed.slice(1)}` : trimmed;
}

export function shortPublicWorkNameRu(sourceNameRu: string): string {
  const segment = sourceNameRu.split(":").at(-1)?.trim() || sourceNameRu.trim();
  return capitalizeRu(segment.replace(/\s*[—–-]\s*\d[\d\s.,]*\s*(?:м²|м2|м³|м3|м|кг|т)\s*$/iu, ""));
}

export function normalizePublicBoqNameRu(input: {
  sourceNameRu: string;
  workNameRu?: string | null;
}): string {
  const source = input.sourceNameRu.trim();
  if (/^Доставка трансформаторного оборудования, кабеля и строительных материалов тяжёлым транспортом$/iu.test(source)) {
    return "Доставка трансформатора и кабеля";
  }
  if (/^Доставка энергетических модулей, металлоконструкций, кабеля и преобразовательного оборудования$/iu.test(source)) {
    return "Доставка энергетического оборудования";
  }
  if (/^Доставка ветроэнергетических установок, секций башен, кабеля и электротехнического оборудования$/iu.test(source)) {
    return "Доставка ветроэнергетического оборудования";
  }
  if (/^Вывоз кабельных обрезков, защитной упаковки и тары ветроэнергетического оборудования$/iu.test(source)) {
    return "Вывоз тары ветроэнергетического оборудования";
  }
  if (/^Доставка аккумуляторных шкафов, преобразователей мощности, кабеля и электротехнического оборудования$/iu.test(source)) {
    return "Доставка аккумуляторного оборудования";
  }
  if (/^Доставка щебня, асфальтобетонной смеси и дорожных материалов автомобилями-самосвалами$/iu.test(source)) {
    return "Доставка щебня и асфальтобетонной смеси";
  }
  const concreteCatalogNames: readonly [RegExp, string][] = [
    [/^Бетон М350 \(B25\)(?: для .+)?$/iu, "Бетон М350 (B25)"],
    [/^Арматура А500С, 12 мм(?: для .+)?$/iu, "Арматура А500С, 12 мм"],
    [/^Арматура А240, 8 мм(?: для .+)?$/iu, "Арматура А240, 8 мм"],
    [/^Вязальная проволока 1,2 мм(?: для .+)?$/iu, "Вязальная проволока 1,2 мм"],
    [/^Фиксатор арматуры 40 мм(?: для .+)?$/iu, "Фиксатор арматуры 40 мм"],
    [/^Плёнка полиэтиленовая 200 мкм(?: для .+)?$/iu, "Плёнка полиэтиленовая 200 мкм"],
    [/^Фанера ламинированная 18 мм(?: для .+)?$/iu, "Фанера ламинированная 18 мм"],
    [/^Масло для опалубки, 20 л(?: для .+)?$/iu, "Масло для опалубки, 20 л"],
    [/^Стяжной винт опалубки М17(?: для .+)?$/iu, "Стяжной винт опалубки М17"],
    [/^Гайка для стяжного винта М17(?: для .+)?$/iu, "Гайка для стяжного винта М17"],
    [/^Ремонтный состав для бетона, 25 кг(?: для .+)?$/iu, "Ремонтный состав для бетона, 25 кг"],
    [/^Праймер для бетона, 10 л(?: для .+)?$/iu, "Праймер для бетона, 10 л"],
    [/^Безусадочная подливочная смесь, 25 кг(?: для .+)?$/iu, "Безусадочная подливочная смесь, 25 кг"],
    [/^Анкерный болт М20×500 мм(?: для .+)?$/iu, "Анкерный болт М20×500 мм"],
    [/^Шаблон анкерной группы(?: для .+)?$/iu, "Шаблон анкерной группы"],
    [/^Средство для ухода за бетоном, 20 л(?: для .+)?$/iu, "Средство для ухода за бетоном, 20 л"],
    [/^Автобетононасос 36 м(?: для .+)?$/iu, "Автобетононасос 36 м"],
    [/^Глубинный вибратор(?: для .+)?$/iu, "Глубинный вибратор"],
    [/^Арматурный станок(?: для .+)?$/iu, "Арматурный станок"],
    [/^Аренда циркулярной пилы(?: для .+)?$/iu, "Аренда циркулярной пилы"],
    [/^Шлифовальная машина по бетону(?: для .+)?$/iu, "Шлифовальная машина по бетону"],
    [/^Лазерный нивелир(?: для .+)?$/iu, "Лазерный нивелир"],
    [/^Перфоратор SDS-max(?: для .+)?$/iu, "Перфоратор SDS-max"],
    [/^Распылитель ранцевый, 20 л(?: для .+)?$/iu, "Распылитель ранцевый, 20 л"],
    [/^Доставка бетона автобетоносмесителем 9 м³(?: для .+)?$/iu, "Доставка бетона автобетоносмесителем 9 м³"],
    [/^Доставка арматуры(?: для .+)?$/iu, "Доставка арматуры"],
    [/^Доставка опалубки(?: для .+)?$/iu, "Доставка опалубки"],
  ];
  for (const [pattern, publicNameRu] of concreteCatalogNames) {
    if (pattern.test(source)) return publicNameRu;
  }
  if (/^комплект ручного инструмента и оснастки(?::|$)/iu.test(source)) return "Аренда ручного инструмента";
  if (/^основной монтажный цикл(?::|$)/iu.test(source)) {
    return input.workNameRu ? shortPublicWorkNameRu(input.workNameRu) : "Монтаж основных конструкций";
  }
  const withoutAppendedWorkTitle = source.includes(":") && input.workNameRu && source.endsWith(input.workNameRu)
    ? source.slice(0, source.length - input.workNameRu.length).replace(/:\s*$/u, "").trim()
    : source;
  return withoutAppendedWorkTitle
    .replace(/\s*,?\s*(?:без\s+(?:принятой\s+)?цены(?:\s+до(?:\s|$).*)?|цена не определена.*|PRICE_MISSING.*)$/iu, "")
    .replace(/[：:]+/gu, " — ")
    .replace(/\s+/gu, " ")
    .replace(/\s+([,.;])/gu, "$1")
    .trim();
}

function knownSpecification(publicNameRu: string, unitLabelRu: string): { specification: string; search: string } | null {
  if (/^Бетон М350 \(B25\)$/u.test(publicNameRu)) {
    return {
      specification: "Класс B25; водонепроницаемость W6; морозостойкость F150; подвижность П4; цена за м³",
      search: "Бетон М350 (B25), W6, F150, П4, м³",
    };
  }
  if (/^Арматура А500С, 12 мм$/u.test(publicNameRu)) {
    return {
      specification: "Класс А500С; диаметр 12 мм; длина прутка и масса погонного метра по прайс-листу",
      search: "Арматура А500С, 12 мм, пруток",
    };
  }
  if (/^Арматура А240, 8 мм$/u.test(publicNameRu)) {
    return {
      specification: "Класс А240; диаметр 8 мм; для хомутов и распределительной арматуры",
      search: "Арматура А240, 8 мм, пруток",
    };
  }
  if (/^Вязальная проволока 1,2 мм$/u.test(publicNameRu)) {
    return {
      specification: "Диаметр 1,2 мм; масса бухты указывается поставщиком",
      search: "Вязальная проволока 1,2 мм, бухта",
    };
  }
  if (/^Фиксатор арматуры 40 мм$/u.test(publicNameRu)) {
    return {
      specification: "Защитный слой 40 мм; тип фиксатора уточняется по схеме армирования",
      search: "Фиксатор арматуры 40 мм",
    };
  }
  if (/^Щебень 20[–-]40 мм$/u.test(publicNameRu)) {
    return {
      specification: "Фракция 20–40 мм; порода и насыпная плотность по паспорту поставщика",
      search: "Щебень 20–40 мм",
    };
  }
  if (/^Фанера ламинированная 18 мм$/u.test(publicNameRu)) {
    return {
      specification: "Толщина 18 мм; размер листа и оборотность по прайс-листу",
      search: "Фанера ламинированная 18 мм, лист",
    };
  }
  return unitLabelRu
    ? {
        specification: `Единица поставки или тарифа: ${unitLabelRu}; характеристики подтверждаются прайс-листом`,
        search: publicNameRu,
      }
    : null;
}

export function buildPublicBoqProcurementNamingProjection(input: {
  sourceNameRu: string;
  workNameRu?: string | null;
  unit: string;
  catalogOrPriceListReference: string;
}): PublicBoqProcurementNamingProjection {
  const publicNameRu = normalizePublicBoqNameRu(input);
  const unitLabelRu = UNIT_LABEL_RU[input.unit] ?? input.unit.trim();
  const known = knownSpecification(publicNameRu, unitLabelRu);
  const hasRussianName = /[А-Яа-яЁё]/u.test(publicNameRu);
  const forbidden = GENERIC_OR_UNBUYABLE_NAME.some((pattern) => pattern.test(publicNameRu));
  const canBeProcuredByName = Boolean(
    known && hasRussianName && publicNameRu.length >= 2 && publicNameRu.length <= 80 && !forbidden,
  );
  const verifiedCatalogReference = verifiedCatalogReferenceForPublicName(publicNameRu);
  return {
    publicNameRu,
    specificationRu: known?.specification ?? "Спецификация поставщика обязательна до закупки",
    procurementSearchNameRu: known?.search ?? publicNameRu,
    catalogOrPriceListReference: verifiedCatalogReference ?? input.catalogOrPriceListReference,
    canBeProcuredByName,
  };
}
