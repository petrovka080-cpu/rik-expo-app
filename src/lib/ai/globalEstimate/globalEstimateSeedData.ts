import {
  GLOBAL_WORK_TYPE_DEFINITIONS,
} from "./globalWorkTypeResolver";
import type {
  GlobalEstimateTemplate,
  GlobalEstimateTemplateRowDefinition,
  GlobalPriceSourceType,
  GlobalRateRecord,
  GlobalTaxRule,
  GlobalUnitInput,
  GlobalWorkTypeDefinition,
} from "./globalEstimateTypes";

const CHECKED_AT = "2026-05-22T00:00:00+06:00";
const EFFECTIVE_FROM = "2026-01-01";

export const GLOBAL_PRICE_SOURCES: {
  id: string;
  type: GlobalPriceSourceType;
  label: string;
  countryCode?: string;
  url?: string;
  checkedAt: string;
}[] = [
  {
    id: "src_configured_global_reference_2026",
    type: "configured_reference",
    label: "Configured global construction reference rates",
    checkedAt: CHECKED_AT,
  },
  {
    id: "src_configured_regional_reference_2026",
    type: "configured_reference",
    label: "Configured regional construction reference rates",
    checkedAt: CHECKED_AT,
  },
  {
    id: "src_configured_tax_reference_2026",
    type: "configured_reference",
    label: "Configured tax reference rule; precise tax may require provider or official lookup",
    checkedAt: CHECKED_AT,
  },
];

function row(params: Omit<GlobalEstimateTemplateRowDefinition, "required" | "sortOrder"> & {
  required?: boolean;
  sortOrder?: number;
}): GlobalEstimateTemplateRowDefinition {
  return {
    required: true,
    sortOrder: Number(params.rowNumber.replace(/\D/g, "")) || 0,
    ...params,
  };
}

const laminateRows: GlobalEstimateTemplateRowDefinition[] = [
  row({
    sectionType: "materials",
    sectionNumber: "1",
    rowNumber: "1.1",
    code: "laminate_board",
    names: { ru: "Ламинат 33 класс с запасом 10%", en: "Class 33 laminate flooring with 10% waste allowance", de: "Laminat Klasse 33 mit 10% Verschnitt" },
    quantityFormula: "area * 1.10",
    unitMetric: "sq_m",
    unitImperial: "sq_ft",
    rateKey: "laminate_board",
  }),
  row({
    sectionType: "materials",
    sectionNumber: "1",
    rowNumber: "1.2",
    code: "underlayment",
    names: { ru: "Подложка под ламинат", en: "Laminate underlayment", de: "Trittschalldammung" },
    quantityFormula: "area * 1.05",
    unitMetric: "sq_m",
    unitImperial: "sq_ft",
    rateKey: "underlayment",
  }),
  row({
    sectionType: "materials",
    sectionNumber: "1",
    rowNumber: "1.3",
    code: "baseboard",
    names: { ru: "Плинтус напольный", en: "Baseboard", de: "Sockelleiste" },
    quantityFormula: "sqrt(area) * 8",
    unitMetric: "linear_m",
    unitImperial: "linear_ft",
    rateKey: "baseboard",
  }),
  row({
    sectionType: "materials",
    sectionNumber: "1",
    rowNumber: "1.4",
    code: "baseboard_fittings",
    names: { ru: "Фурнитура для плинтуса", en: "Baseboard fittings", de: "Sockelleisten-Zubehor" },
    quantityFormula: "1",
    unitMetric: "set",
    unitImperial: "set",
    rateKey: "baseboard_fittings",
  }),
  row({
    sectionType: "materials",
    sectionNumber: "1",
    rowNumber: "1.5",
    code: "thresholds",
    names: { ru: "Пороги стыковочные межкомнатные", en: "Doorway transition thresholds", de: "Ubergangsprofile" },
    quantityFormula: "ceil(area / 20)",
    unitMetric: "pcs",
    unitImperial: "pcs",
    rateKey: "thresholds",
  }),
  row({
    sectionType: "labor",
    sectionNumber: "2",
    rowNumber: "2.1",
    code: "floor_priming",
    names: { ru: "Грунтование основания", en: "Subfloor priming", de: "Grundierung des Untergrunds" },
    quantityFormula: "area",
    unitMetric: "sq_m",
    unitImperial: "sq_ft",
    rateKey: "floor_priming",
  }),
  row({
    sectionType: "labor",
    sectionNumber: "2",
    rowNumber: "2.2",
    code: "underlayment_install",
    names: { ru: "Настил подложки", en: "Underlayment installation", de: "Unterlage verlegen" },
    quantityFormula: "area",
    unitMetric: "sq_m",
    unitImperial: "sq_ft",
    rateKey: "underlayment_install",
  }),
  row({
    sectionType: "labor",
    sectionNumber: "2",
    rowNumber: "2.3",
    code: "laminate_install",
    names: { ru: "Укладка ламината", en: "Laminate installation", de: "Laminat verlegen" },
    quantityFormula: "area",
    unitMetric: "sq_m",
    unitImperial: "sq_ft",
    rateKey: "laminate_install",
  }),
  row({
    sectionType: "labor",
    sectionNumber: "2",
    rowNumber: "2.4",
    code: "baseboard_install",
    names: { ru: "Монтаж напольного плинтуса", en: "Baseboard installation", de: "Sockelleisten montieren" },
    quantityFormula: "sqrt(area) * 8",
    unitMetric: "linear_m",
    unitImperial: "linear_ft",
    rateKey: "baseboard_install",
  }),
  row({
    sectionType: "labor",
    sectionNumber: "2",
    rowNumber: "2.5",
    code: "threshold_install",
    names: { ru: "Установка межкомнатных порогов", en: "Threshold installation", de: "Ubergangsprofile montieren" },
    quantityFormula: "ceil(area / 20)",
    unitMetric: "pcs",
    unitImperial: "pcs",
    rateKey: "threshold_install",
  }),
];

function localizedWorkName(definition: GlobalWorkTypeDefinition, language: string): string {
  return definition.names[language] ?? definition.names.en ?? definition.names.ru ?? definition.workKey;
}

function genericTemplate(definition: GlobalWorkTypeDefinition): GlobalEstimateTemplate {
  const unitMetric = definition.defaultMeasureUnit;
  const unitImperial: GlobalUnitInput["normalizedUnit"] =
    unitMetric === "sq_m" ? "sq_ft" :
      unitMetric === "linear_m" ? "linear_ft" :
        unitMetric === "m3" ? "cu_ft" :
          unitMetric === "kg" ? "lbs" :
            unitMetric;
  const materialRate = `${definition.workKey}_material`;
  const auxiliaryRate = `${definition.workKey}_auxiliary`;
  const laborRate = `${definition.workKey}_labor`;
  const workRu = localizedWorkName(definition, "ru");
  const workEn = localizedWorkName(definition, "en");

  return {
    workKey: definition.workKey,
    inputMeasure: unitMetric === "m3" || unitMetric === "cu_ft" ? "volume" : unitMetric === "pcs" ? "count" : unitMetric === "set" ? "set" : "area",
    defaultUnitMetric: unitMetric,
    defaultUnitImperial: unitImperial,
    sections: [
      {
        type: "materials",
        sectionNumber: "1",
        title: { ru: "Материалы и комплектующие", en: "Materials and supplies" },
        rows: [
          row({
            sectionType: "materials",
            sectionNumber: "1",
            rowNumber: "1.1",
            code: `${definition.workKey}_main_material`,
            names: { ru: `Основной материал: ${workRu}`, en: `Primary material: ${workEn}` },
            quantityFormula: "area * 1.08",
            unitMetric,
            unitImperial,
            rateKey: materialRate,
          }),
          row({
            sectionType: "materials",
            sectionNumber: "1",
            rowNumber: "1.2",
            code: `${definition.workKey}_auxiliary`,
            names: { ru: "Расходные материалы и крепеж", en: "Consumables and fixings" },
            quantityFormula: "area * 0.20",
            unitMetric,
            unitImperial,
            rateKey: auxiliaryRate,
          }),
        ],
      },
      {
        type: "labor",
        sectionNumber: "2",
        title: { ru: "Строительные работы", en: "Labor and installation" },
        rows: [
          row({
            sectionType: "labor",
            sectionNumber: "2",
            rowNumber: "2.1",
            code: `${definition.workKey}_prep`,
            names: { ru: `Подготовка: ${workRu}`, en: `Preparation: ${workEn}` },
            quantityFormula: "area",
            unitMetric,
            unitImperial,
            rateKey: laborRate,
          }),
          row({
            sectionType: "labor",
            sectionNumber: "2",
            rowNumber: "2.2",
            code: `${definition.workKey}_install`,
            names: { ru: workRu, en: workEn },
            quantityFormula: "area",
            unitMetric,
            unitImperial,
            rateKey: laborRate,
          }),
        ],
      },
    ],
    assumptions: {
      ru: [
        "Расчет сделан по типовой технологии для указанного объема.",
        "Скрытые дефекты и демонтаж не включены, если пользователь не указал их явно.",
        "Цены являются настроенным backend-справочником и требуют проверки перед договором.",
      ],
      en: [
        "The estimate uses a standard method for the stated quantity.",
        "Hidden defects and demolition are not included unless explicitly stated.",
        "Prices come from configured backend reference data and require review before contract.",
      ],
    },
    regionalRiskKeys: ["site_access", "surface_condition", "hidden_damage", "delivery_and_lifting", "local_tax_precision"],
    clarifyingQuestions: {
      ru: [
        "В каком городе находится объект?",
        "Какое состояние основания или поверхности?",
        "Нужен ли демонтаж старого покрытия или конструкций?",
        "Есть ли ограничения по доступу, доставке или срокам?",
      ],
      en: [
        "What city is the project located in?",
        "What is the current surface or base condition?",
        "Is demolition of existing finishes required?",
        "Are there access, delivery, or deadline constraints?",
      ],
    },
  };
}

export const LAMINATE_TEMPLATE: GlobalEstimateTemplate = {
  workKey: "laminate_laying",
  inputMeasure: "area",
  defaultUnitMetric: "sq_m",
  defaultUnitImperial: "sq_ft",
  sections: [
    {
      type: "materials",
      sectionNumber: "1",
      title: { ru: "Материалы и комплектующие", en: "Materials and supplies", de: "Materialien und Zubehor" },
      rows: laminateRows.filter((item) => item.sectionType === "materials"),
    },
    {
      type: "labor",
      sectionNumber: "2",
      title: { ru: "Строительные работы", en: "Labor and installation", de: "Arbeitsleistungen" },
      rows: laminateRows.filter((item) => item.sectionType === "labor"),
    },
  ],
  assumptions: {
    ru: [
      "Основание считается ровным и готовым к укладке.",
      "Демонтаж старого покрытия не включен.",
      "Материал рассчитан с запасом на подрезку.",
      "Доставка и подъем не включены, если не указано отдельно.",
    ],
    en: [
      "Subfloor is assumed to be level and ready.",
      "Old flooring removal is not included.",
      "Material includes waste allowance.",
      "Delivery and lifting are not included unless specified.",
    ],
    de: [
      "Der Untergrund wird als eben und verlegebereit angenommen.",
      "Ruckbau alter Belage ist nicht enthalten.",
      "Material enthalt Verschnittreserve.",
      "Lieferung und Tragen sind nur enthalten, wenn angegeben.",
    ],
  },
  regionalRiskKeys: [
    "uneven_subfloor",
    "old_floor_demolition",
    "diagonal_layout",
    "continuous_layout_without_thresholds",
    "delivery_and_lifting",
    "local_tax_precision",
  ],
  clarifyingQuestions: {
    ru: [
      "В каком городе находится объект?",
      "Какое сейчас основание пола?",
      "Требуется ли демонтаж старого покрытия?",
      "Нужно ли выравнивание пола?",
      "Планируется прямая или диагональная укладка?",
    ],
    en: [
      "What city is the project located in?",
      "What is the current subfloor?",
      "Is old flooring removal required?",
      "Is floor leveling required?",
      "Straight or diagonal layout?",
    ],
    de: [
      "In welcher Stadt liegt das Objekt?",
      "Welcher Untergrund ist vorhanden?",
      "Muss der alte Boden entfernt werden?",
      "Ist Bodenausgleich erforderlich?",
      "Gerade oder diagonale Verlegung?",
    ],
  },
};

export const GLOBAL_ESTIMATE_TEMPLATES: readonly GlobalEstimateTemplate[] = GLOBAL_WORK_TYPE_DEFINITIONS.map((definition) =>
  definition.workKey === "laminate_laying" ? LAMINATE_TEMPLATE : genericTemplate(definition),
);

export const GLOBAL_ESTIMATE_TEMPLATE_ROWS: readonly (GlobalEstimateTemplateRowDefinition & { workKey: string })[] =
  GLOBAL_ESTIMATE_TEMPLATES.flatMap((template) =>
    template.sections.flatMap((section) => section.rows.map((item) => ({ ...item, workKey: template.workKey }))),
  );

function rate(params: Omit<GlobalRateRecord, "id" | "effectiveFrom" | "checkedAt" | "active" | "sourceType" | "sourceLabel"> & {
  id?: string;
  sourceType?: GlobalRateRecord["sourceType"];
  sourceLabel?: string;
}): GlobalRateRecord {
  return {
    id: params.id ?? `rate_${params.rateKey}_${params.countryCode}_${params.unit}_${params.priceTier}`,
    sourceType: params.sourceType ?? "configured_reference",
    sourceLabel: params.sourceLabel ?? "Configured backend regional reference rate",
    effectiveFrom: EFFECTIVE_FROM,
    checkedAt: CHECKED_AT,
    active: true,
    ...params,
  };
}

const COUNTRIES: { countryCode: string; currency: string; stateOrRegion?: string; city?: string; postalCode?: string; metric: boolean; multiplier: number }[] = [
  { countryCode: "XX", currency: "USD", metric: true, multiplier: 1 },
  { countryCode: "KG", currency: "KGS", city: "Bishkek", metric: true, multiplier: 89 },
  { countryCode: "US", stateOrRegion: "TX", city: "Dallas", postalCode: "75201", currency: "USD", metric: false, multiplier: 1.05 },
  { countryCode: "US", stateOrRegion: "TX", currency: "USD", metric: false, multiplier: 1 },
  { countryCode: "US", stateOrRegion: "CA", currency: "USD", metric: false, multiplier: 1.2 },
  { countryCode: "DE", currency: "EUR", metric: true, multiplier: 0.92 },
  { countryCode: "FR", city: "Paris", currency: "EUR", metric: true, multiplier: 1.05 },
  { countryCode: "GB", city: "London", currency: "GBP", metric: true, multiplier: 0.82 },
  { countryCode: "SG", city: "Singapore", currency: "SGD", metric: false, multiplier: 1.35 },
  { countryCode: "AE", city: "Dubai", currency: "AED", metric: true, multiplier: 3.67 },
  { countryCode: "IN", currency: "INR", metric: true, multiplier: 83 },
];

const BASE_UNIT_PRICES: Record<string, number> = {
  laminate_board: 18,
  underlayment: 2.2,
  baseboard: 3.5,
  baseboard_fittings: 45,
  thresholds: 18,
  floor_priming: 1.2,
  underlayment_install: 0.8,
  laminate_install: 3.8,
  baseboard_install: 2.5,
  threshold_install: 12,
};

const GENERIC_PRICE_BY_CATEGORY: Record<string, { material: number; auxiliary: number; labor: number }> = {
  flooring: { material: 12, auxiliary: 2, labor: 5 },
  tile: { material: 16, auxiliary: 4, labor: 12 },
  painting: { material: 2.5, auxiliary: 0.8, labor: 4 },
  plastering: { material: 3, auxiliary: 1, labor: 7 },
  drywall: { material: 7, auxiliary: 2, labor: 8 },
  electrical: { material: 35, auxiliary: 8, labor: 55 },
  plumbing: { material: 45, auxiliary: 12, labor: 65 },
  waterproofing: { material: 8, auxiliary: 2, labor: 9 },
  foundation: { material: 120, auxiliary: 18, labor: 55 },
  concrete: { material: 110, auxiliary: 16, labor: 48 },
  roofing: { material: 18, auxiliary: 5, labor: 15 },
  facade: { material: 9, auxiliary: 3, labor: 10 },
  roadworks: { material: 14, auxiliary: 4, labor: 12 },
  masonry: { material: 20, auxiliary: 6, labor: 18 },
  demolition: { material: 1, auxiliary: 1, labor: 7 },
  other: { material: 10, auxiliary: 2, labor: 8 },
};

function localUnit(unit: GlobalUnitInput["normalizedUnit"], metric: boolean): GlobalUnitInput["normalizedUnit"] {
  if (metric) return unit;
  if (unit === "sq_m") return "sq_ft";
  if (unit === "linear_m") return "linear_ft";
  if (unit === "m3") return "cu_ft";
  if (unit === "kg") return "lbs";
  return unit;
}

function unitScaleForImperial(unit: GlobalUnitInput["normalizedUnit"]): number {
  if (unit === "sq_ft") return 0.092903;
  if (unit === "linear_ft") return 0.3048;
  if (unit === "cu_ft") return 0.0283168;
  if (unit === "lbs") return 0.45359237;
  return 1;
}

function buildRegionalRates(): GlobalRateRecord[] {
  const laminateRates = COUNTRIES.flatMap((country) =>
    Object.entries(BASE_UNIT_PRICES).map(([rateKey, basePrice]) => {
      const metricUnit: GlobalUnitInput["normalizedUnit"] =
        rateKey.includes("baseboard") ? "linear_m" :
          rateKey.includes("threshold") ? "pcs" :
            rateKey.includes("fittings") ? "set" :
              "sq_m";
      const unit = localUnit(metricUnit, country.metric);
      const unitFactor = country.metric ? 1 : unitScaleForImperial(unit);
      const priceDefault = Number((basePrice * unitFactor * country.multiplier).toFixed(2));
      return rate({
        rateKey,
        names: { en: rateKey.replace(/_/g, " "), ru: rateKey.replace(/_/g, " ") },
        countryCode: country.countryCode,
        stateOrRegion: country.stateOrRegion,
        city: country.city,
        postalCode: country.postalCode,
        unit,
        priceMin: Number((priceDefault * 0.85).toFixed(2)),
        priceMax: Number((priceDefault * 1.2).toFixed(2)),
        priceDefault,
        currency: country.currency,
        priceTier: "standard",
      });
    }),
  );

  const genericRates = GLOBAL_WORK_TYPE_DEFINITIONS.flatMap((definition) => {
    if (definition.workKey === "laminate_laying") return [];
    const prices = GENERIC_PRICE_BY_CATEGORY[definition.category] ?? GENERIC_PRICE_BY_CATEGORY.other;
    const rows = [
      [`${definition.workKey}_material`, prices.material],
      [`${definition.workKey}_auxiliary`, prices.auxiliary],
      [`${definition.workKey}_labor`, prices.labor],
    ] as const;
    return COUNTRIES.flatMap((country) =>
      rows.map(([rateKey, basePrice]) => {
        const unit = localUnit(definition.defaultMeasureUnit, country.metric);
        const unitFactor = country.metric ? 1 : unitScaleForImperial(unit);
        const priceDefault = Number((basePrice * unitFactor * country.multiplier).toFixed(2));
        return rate({
          rateKey,
          names: { en: rateKey.replace(/_/g, " "), ru: rateKey.replace(/_/g, " ") },
          countryCode: country.countryCode,
          stateOrRegion: country.stateOrRegion,
          city: country.city,
          postalCode: country.postalCode,
          unit,
          priceMin: Number((priceDefault * 0.8).toFixed(2)),
          priceMax: Number((priceDefault * 1.25).toFixed(2)),
          priceDefault,
          currency: country.currency,
          priceTier: "standard",
        });
      }),
    );
  });

  return [...laminateRates, ...genericRates];
}

export const GLOBAL_RATE_MATERIALS: readonly GlobalRateRecord[] = buildRegionalRates().filter((item) =>
  item.rateKey.endsWith("_material") ||
  item.rateKey.endsWith("_auxiliary") ||
  ["laminate_board", "underlayment", "baseboard", "baseboard_fittings", "thresholds"].includes(item.rateKey),
);

export const GLOBAL_RATE_WORKS: readonly GlobalRateRecord[] = buildRegionalRates().filter((item) =>
  item.rateKey.endsWith("_labor") ||
  item.rateKey.includes("_labor") ||
  (item.rateKey.includes("_install") && !item.rateKey.endsWith("_material") && !item.rateKey.endsWith("_auxiliary")) ||
  item.rateKey.includes("priming"),
);

export const GLOBAL_TAX_RULES: readonly GlobalTaxRule[] = [
  {
    id: "tax_us_tx_dallas_75201_sales_tax_configured",
    countryCode: "US",
    stateOrRegion: "TX",
    city: "Dallas",
    postalCode: "75201",
    taxType: "sales_tax",
    taxLabel: "Estimated Dallas TX sales tax",
    taxRate: 0.0825,
    appliesTo: "materials",
    customerType: "unknown",
    projectType: "unknown",
    includedInPrice: false,
    requiresPreciseAddress: true,
    requiredPrecision: "postal_code",
    sourceType: "configured_reference",
    sourceLabel: "Configured US sales tax reference; validate with address-based tax provider before billing",
    effectiveFrom: EFFECTIVE_FROM,
    checkedAt: CHECKED_AT,
    active: true,
  },
  {
    id: "tax_kg_nds_configured",
    countryCode: "KG",
    taxType: "nds",
    taxLabel: "НДС Кыргызстан",
    taxRate: 0.12,
    appliesTo: "all",
    customerType: "unknown",
    projectType: "unknown",
    includedInPrice: false,
    requiresPreciseAddress: false,
    sourceType: "configured_reference",
    sourceLabel: "Configured Kyrgyzstan NDS reference",
    effectiveFrom: EFFECTIVE_FROM,
    checkedAt: CHECKED_AT,
    active: true,
  },
  {
    id: "tax_de_vat_standard_configured",
    countryCode: "DE",
    taxType: "vat",
    taxLabel: "VAT Germany standard reference",
    taxRate: 0.19,
    appliesTo: "all",
    customerType: "unknown",
    projectType: "unknown",
    includedInPrice: true,
    requiresPreciseAddress: false,
    sourceType: "configured_reference",
    sourceLabel: "Configured EU VAT reference; category-specific reduced rates require review",
    effectiveFrom: EFFECTIVE_FROM,
    checkedAt: CHECKED_AT,
    active: true,
  },
  {
    id: "tax_fr_vat_standard_configured",
    countryCode: "FR",
    taxType: "vat",
    taxLabel: "TVA France standard reference",
    taxRate: 0.2,
    appliesTo: "all",
    customerType: "unknown",
    projectType: "unknown",
    includedInPrice: true,
    requiresPreciseAddress: false,
    sourceType: "configured_reference",
    sourceLabel: "Configured EU VAT reference; category-specific reduced rates require review",
    effectiveFrom: EFFECTIVE_FROM,
    checkedAt: CHECKED_AT,
    active: true,
  },
  {
    id: "tax_gb_vat_standard_configured",
    countryCode: "GB",
    taxType: "vat",
    taxLabel: "VAT UK standard reference",
    taxRate: 0.2,
    appliesTo: "all",
    customerType: "unknown",
    projectType: "unknown",
    includedInPrice: true,
    requiresPreciseAddress: false,
    sourceType: "configured_reference",
    sourceLabel: "Configured UK VAT reference; project category requires review",
    effectiveFrom: EFFECTIVE_FROM,
    checkedAt: CHECKED_AT,
    active: true,
  },
  {
    id: "tax_sg_gst_configured",
    countryCode: "SG",
    taxType: "gst",
    taxLabel: "Singapore GST reference",
    taxRate: 0.09,
    appliesTo: "all",
    customerType: "unknown",
    projectType: "unknown",
    includedInPrice: false,
    requiresPreciseAddress: false,
    sourceType: "configured_reference",
    sourceLabel: "Configured Singapore GST reference",
    effectiveFrom: EFFECTIVE_FROM,
    checkedAt: CHECKED_AT,
    active: true,
  },
  {
    id: "tax_ae_vat_configured",
    countryCode: "AE",
    taxType: "vat",
    taxLabel: "UAE VAT reference",
    taxRate: 0.05,
    appliesTo: "all",
    customerType: "unknown",
    projectType: "unknown",
    includedInPrice: false,
    requiresPreciseAddress: false,
    sourceType: "configured_reference",
    sourceLabel: "Configured UAE VAT reference",
    effectiveFrom: EFFECTIVE_FROM,
    checkedAt: CHECKED_AT,
    active: true,
  },
  {
    id: "tax_in_gst_configured",
    countryCode: "IN",
    taxType: "gst",
    taxLabel: "India GST reference",
    taxRate: 0.18,
    appliesTo: "all",
    customerType: "unknown",
    projectType: "unknown",
    includedInPrice: false,
    requiresPreciseAddress: false,
    sourceType: "configured_reference",
    sourceLabel: "Configured India GST reference; work/material category requires review",
    effectiveFrom: EFFECTIVE_FROM,
    checkedAt: CHECKED_AT,
    active: true,
  },
];

export const GLOBAL_UNIT_CONVERSIONS = [
  { fromUnit: "sq_m", toUnit: "sq_ft", multiplier: 10.76391041671, dimension: "area" },
  { fromUnit: "sq_ft", toUnit: "sq_m", multiplier: 0.09290304, dimension: "area" },
  { fromUnit: "linear_m", toUnit: "linear_ft", multiplier: 3.280839895, dimension: "length" },
  { fromUnit: "linear_ft", toUnit: "linear_m", multiplier: 0.3048, dimension: "length" },
  { fromUnit: "m3", toUnit: "cu_ft", multiplier: 35.314666721, dimension: "volume" },
  { fromUnit: "cu_ft", toUnit: "m3", multiplier: 0.0283168466, dimension: "volume" },
  { fromUnit: "kg", toUnit: "lbs", multiplier: 2.2046226218, dimension: "mass" },
  { fromUnit: "lbs", toUnit: "kg", multiplier: 0.45359237, dimension: "mass" },
] as const;
