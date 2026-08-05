export const PROFESSIONAL_UNIT_REGISTRY_VERSION = "professional-unit-registry:2026-07.v1" as const;

export type ProfessionalUnitDimension =
  | "length"
  | "area"
  | "volume"
  | "count"
  | "package"
  | "mass"
  | "flow"
  | "time"
  | "transport_work"
  | "labor_time"
  | "machine_time"
  | "service"
  | "document"
  | "test"
  | "power";

export type ProfessionalUnitSystem = "metric" | "imperial" | "mixed";

export type ProfessionalUnitDefinition = {
  code: string;
  aliases: readonly string[];
  dimension: ProfessionalUnitDimension;
  canonicalSiUnit: string;
  conversionFactorToSi: number;
  precision: number;
  discrete: boolean;
  displayRu: string;
  displayNameRu: string;
  displayEn: string;
  jurisdictions: readonly string[];
  unitSystems: readonly ProfessionalUnitSystem[];
  provenance: typeof PROFESSIONAL_UNIT_REGISTRY_VERSION;
  boqCanonical: boolean;
};

function unit<const T extends Omit<ProfessionalUnitDefinition, "jurisdictions" | "provenance"> &
  Partial<Pick<ProfessionalUnitDefinition, "jurisdictions">>>(
  input: T,
): Readonly<T & Pick<ProfessionalUnitDefinition, "jurisdictions" | "provenance">> {
  return Object.freeze({
    ...input,
    jurisdictions: input.jurisdictions ?? ["*"],
    provenance: PROFESSIONAL_UNIT_REGISTRY_VERSION,
  }) as Readonly<T & Pick<ProfessionalUnitDefinition, "jurisdictions" | "provenance">>;
}

const ALL_SYSTEMS = ["metric", "imperial", "mixed"] as const;
const METRIC_MIXED = ["metric", "mixed"] as const;
const IMPERIAL_MIXED = ["imperial", "mixed"] as const;

const DEFINITIONS = [
  unit({ code: "m", aliases: ["meter", "metre"], dimension: "length", canonicalSiUnit: "m", conversionFactorToSi: 1, precision: 3, discrete: false, displayRu: "м", displayNameRu: "метр", displayEn: "m", unitSystems: METRIC_MIXED, boqCanonical: true }),
  unit({ code: "lm", aliases: ["linear_m", "linear_meter", "linear_metre", "m.p.", "м.п.", "пог. м", "пог.м"], dimension: "length", canonicalSiUnit: "m", conversionFactorToSi: 1, precision: 3, discrete: false, displayRu: "пог. м", displayNameRu: "погонный метр", displayEn: "linear m", unitSystems: METRIC_MIXED, boqCanonical: true }),
  unit({ code: "linear_ft", aliases: ["ft", "linear_foot", "linear_feet"], dimension: "length", canonicalSiUnit: "m", conversionFactorToSi: 0.3048, precision: 3, discrete: false, displayRu: "пог. фут", displayNameRu: "погонный фут", displayEn: "linear ft", unitSystems: IMPERIAL_MIXED, boqCanonical: false }),
  unit({ code: "m2", aliases: ["sq_m", "sqm", "m²", "м2", "м²", "кв.м", "кв_м", "квадратный метр", "квадратные метры"], dimension: "area", canonicalSiUnit: "m2", conversionFactorToSi: 1, precision: 3, discrete: false, displayRu: "м²", displayNameRu: "квадратный метр", displayEn: "m²", unitSystems: METRIC_MIXED, boqCanonical: true }),
  unit({ code: "sq_ft", aliases: ["sqft", "ft2", "ft²", "square_foot", "square_feet"], dimension: "area", canonicalSiUnit: "m2", conversionFactorToSi: 0.09290304, precision: 3, discrete: false, displayRu: "кв. фут", displayNameRu: "квадратный фут", displayEn: "sq ft", unitSystems: IMPERIAL_MIXED, boqCanonical: false }),
  unit({ code: "m3", aliases: ["cubic_m", "cbm", "m³", "м3", "м³"], dimension: "volume", canonicalSiUnit: "m3", conversionFactorToSi: 1, precision: 3, discrete: false, displayRu: "м³", displayNameRu: "кубический метр", displayEn: "m³", unitSystems: METRIC_MIXED, boqCanonical: true }),
  unit({ code: "cu_ft", aliases: ["ft3", "ft³", "cubic_foot", "cubic_feet"], dimension: "volume", canonicalSiUnit: "m3", conversionFactorToSi: 0.0283168466, precision: 3, discrete: false, displayRu: "куб. фут", displayNameRu: "кубический фут", displayEn: "cu ft", unitSystems: IMPERIAL_MIXED, boqCanonical: false }),
  unit({ code: "pcs", aliases: ["pc", "piece", "pieces", "шт", "шт."], dimension: "count", canonicalSiUnit: "pcs", conversionFactorToSi: 1, precision: 0, discrete: true, displayRu: "шт.", displayNameRu: "штука", displayEn: "pcs", unitSystems: ALL_SYSTEMS, boqCanonical: true }),
  unit({ code: "circuit", aliases: ["circuits", "контур", "контуры"], dimension: "count", canonicalSiUnit: "pcs", conversionFactorToSi: 1, precision: 0, discrete: true, displayRu: "контур", displayNameRu: "контур", displayEn: "circuit", unitSystems: ALL_SYSTEMS, boqCanonical: true }),
  unit({ code: "zone", aliases: ["zones", "зона", "зоны"], dimension: "count", canonicalSiUnit: "pcs", conversionFactorToSi: 1, precision: 0, discrete: true, displayRu: "зона", displayNameRu: "зона", displayEn: "zone", unitSystems: ALL_SYSTEMS, boqCanonical: true }),
  unit({ code: "point", aliases: ["точка"], dimension: "count", canonicalSiUnit: "pcs", conversionFactorToSi: 1, precision: 0, discrete: true, displayRu: "точка", displayNameRu: "точка", displayEn: "point", unitSystems: ALL_SYSTEMS, boqCanonical: true }),
  unit({ code: "set", aliases: ["комплект", "компл.", "компл", "набор"], dimension: "package", canonicalSiUnit: "set", conversionFactorToSi: 1, precision: 0, discrete: true, displayRu: "компл.", displayNameRu: "комплект", displayEn: "set", unitSystems: ALL_SYSTEMS, boqCanonical: true }),
  unit({ code: "roll", aliases: ["рулон"], dimension: "package", canonicalSiUnit: "roll", conversionFactorToSi: 1, precision: 0, discrete: true, displayRu: "рул.", displayNameRu: "рулон", displayEn: "roll", unitSystems: ALL_SYSTEMS, boqCanonical: true }),
  unit({ code: "pack", aliases: ["package", "пачка", "упаковка"], dimension: "package", canonicalSiUnit: "pack", conversionFactorToSi: 1, precision: 0, discrete: true, displayRu: "уп.", displayNameRu: "упаковка", displayEn: "pack", unitSystems: ALL_SYSTEMS, boqCanonical: true }),
  unit({ code: "bag", aliases: ["мешок"], dimension: "package", canonicalSiUnit: "bag", conversionFactorToSi: 1, precision: 0, discrete: true, displayRu: "меш.", displayNameRu: "мешок", displayEn: "bag", unitSystems: ALL_SYSTEMS, boqCanonical: true }),
  unit({ code: "bucket", aliases: ["pail", "ведро"], dimension: "package", canonicalSiUnit: "bucket", conversionFactorToSi: 1, precision: 0, discrete: true, displayRu: "вед.", displayNameRu: "ведро", displayEn: "bucket", unitSystems: ALL_SYSTEMS, boqCanonical: true }),
  unit({ code: "kg", aliases: ["кг"], dimension: "mass", canonicalSiUnit: "kg", conversionFactorToSi: 1, precision: 3, discrete: false, displayRu: "кг", displayNameRu: "килограмм", displayEn: "kg", unitSystems: METRIC_MIXED, boqCanonical: true }),
  unit({ code: "lbs", aliases: ["lb", "pound", "pounds"], dimension: "mass", canonicalSiUnit: "kg", conversionFactorToSi: 0.45359237, precision: 3, discrete: false, displayRu: "фунт", displayNameRu: "фунт", displayEn: "lbs", unitSystems: IMPERIAL_MIXED, boqCanonical: false }),
  unit({ code: "t", aliases: ["ton", "tonne", "тонна", "тонн"], dimension: "mass", canonicalSiUnit: "kg", conversionFactorToSi: 1000, precision: 3, discrete: false, displayRu: "т", displayNameRu: "тонна", displayEn: "t", unitSystems: METRIC_MIXED, boqCanonical: true }),
  unit({ code: "l", aliases: ["liter", "litre", "литр", "л"], dimension: "volume", canonicalSiUnit: "m3", conversionFactorToSi: 0.001, precision: 3, discrete: false, displayRu: "л", displayNameRu: "литр", displayEn: "l", unitSystems: ALL_SYSTEMS, boqCanonical: true }),
  unit({ code: "m3_h", aliases: ["m3h", "m3_hour", "m3_per_hour", "m3/h", "м3/ч", "м³/ч"], dimension: "flow", canonicalSiUnit: "m3_s", conversionFactorToSi: 1 / 3600, precision: 3, discrete: false, displayRu: "м³/ч", displayNameRu: "кубический метр в час", displayEn: "m³/h", unitSystems: ALL_SYSTEMS, boqCanonical: true }),
  unit({ code: "m3_day", aliases: ["m3d", "m3_per_day", "m3/day", "м3/сут", "м³/сут"], dimension: "flow", canonicalSiUnit: "m3_s", conversionFactorToSi: 1 / 86400, precision: 3, discrete: false, displayRu: "м³/сут", displayNameRu: "кубический метр в сутки", displayEn: "m³/day", unitSystems: ALL_SYSTEMS, boqCanonical: true }),
  unit({ code: "day", aliases: ["день", "сутки"], dimension: "time", canonicalSiUnit: "s", conversionFactorToSi: 86400, precision: 2, discrete: false, displayRu: "сут.", displayNameRu: "сутки", displayEn: "day", unitSystems: ALL_SYSTEMS, boqCanonical: true }),
  unit({ code: "trip", aliases: ["рейс"], dimension: "transport_work", canonicalSiUnit: "trip", conversionFactorToSi: 1, precision: 0, discrete: true, displayRu: "рейс", displayNameRu: "рейс", displayEn: "trip", unitSystems: ALL_SYSTEMS, boqCanonical: true }),
  unit({ code: "shift", aliases: ["смена", "смены"], dimension: "machine_time", canonicalSiUnit: "shift", conversionFactorToSi: 1, precision: 2, discrete: false, displayRu: "смена", displayNameRu: "смена", displayEn: "shift", unitSystems: ALL_SYSTEMS, boqCanonical: true }),
  unit({ code: "man_hour", aliases: ["labor_hour", "hour", "чел_час", "чел.-ч"], dimension: "labor_time", canonicalSiUnit: "man_hour", conversionFactorToSi: 1, precision: 2, discrete: false, displayRu: "чел.-ч", displayNameRu: "человеко-час", displayEn: "man-hour", unitSystems: ALL_SYSTEMS, boqCanonical: true }),
  unit({ code: "machine_hour", aliases: ["equipment_hour", "маш_час", "маш.-ч"], dimension: "machine_time", canonicalSiUnit: "machine_hour", conversionFactorToSi: 1, precision: 2, discrete: false, displayRu: "маш.-ч", displayNameRu: "машино-час", displayEn: "machine-hour", unitSystems: ALL_SYSTEMS, boqCanonical: true }),
  unit({ code: "service", aliases: ["услуга"], dimension: "service", canonicalSiUnit: "service", conversionFactorToSi: 1, precision: 0, discrete: true, displayRu: "усл.", displayNameRu: "услуга", displayEn: "service", unitSystems: ALL_SYSTEMS, boqCanonical: true }),
  unit({ code: "document", aliases: ["документ"], dimension: "document", canonicalSiUnit: "document", conversionFactorToSi: 1, precision: 0, discrete: true, displayRu: "док.", displayNameRu: "документ", displayEn: "document", unitSystems: ALL_SYSTEMS, boqCanonical: true }),
  unit({ code: "test", aliases: ["испытание", "проба"], dimension: "test", canonicalSiUnit: "test", conversionFactorToSi: 1, precision: 0, discrete: true, displayRu: "исп.", displayNameRu: "испытание", displayEn: "test", unitSystems: ALL_SYSTEMS, boqCanonical: true }),
  unit({ code: "t_km", aliases: ["tkm", "т-км", "т·км"], dimension: "transport_work", canonicalSiUnit: "kg_m", conversionFactorToSi: 1_000_000, precision: 3, discrete: false, displayRu: "т·км", displayNameRu: "тонно-километр", displayEn: "t·km", unitSystems: ALL_SYSTEMS, boqCanonical: true }),
  unit({ code: "m_drilling_depth", aliases: [], dimension: "length", canonicalSiUnit: "m", conversionFactorToSi: 1, precision: 3, discrete: false, displayRu: "м глубины", displayNameRu: "метр глубины бурения", displayEn: "m depth", unitSystems: ALL_SYSTEMS, boqCanonical: true }),
  unit({ code: "m2_glazing", aliases: [], dimension: "area", canonicalSiUnit: "m2", conversionFactorToSi: 1, precision: 3, discrete: false, displayRu: "м² остекления", displayNameRu: "квадратный метр остекления", displayEn: "m² glazing", unitSystems: ALL_SYSTEMS, boqCanonical: true }),
  unit({ code: "m2_roof", aliases: [], dimension: "area", canonicalSiUnit: "m2", conversionFactorToSi: 1, precision: 3, discrete: false, displayRu: "м² кровли", displayNameRu: "квадратный метр кровли", displayEn: "m² roof", unitSystems: ALL_SYSTEMS, boqCanonical: true }),
  unit({ code: "m2_formwork", aliases: [], dimension: "area", canonicalSiUnit: "m2", conversionFactorToSi: 1, precision: 3, discrete: false, displayRu: "м² опалубки", displayNameRu: "квадратный метр опалубки", displayEn: "m² formwork", unitSystems: ALL_SYSTEMS, boqCanonical: true }),
  unit({ code: "m3_concrete", aliases: [], dimension: "volume", canonicalSiUnit: "m3", conversionFactorToSi: 1, precision: 3, discrete: false, displayRu: "м³ бетона", displayNameRu: "кубический метр бетона", displayEn: "m³ concrete", unitSystems: ALL_SYSTEMS, boqCanonical: true }),
  unit({ code: "kg_rebar", aliases: [], dimension: "mass", canonicalSiUnit: "kg", conversionFactorToSi: 1, precision: 3, discrete: false, displayRu: "кг арматуры", displayNameRu: "килограмм арматуры", displayEn: "kg rebar", unitSystems: ALL_SYSTEMS, boqCanonical: true }),
  unit({ code: "W", aliases: ["w", "вт"], dimension: "power", canonicalSiUnit: "W", conversionFactorToSi: 1, precision: 0, discrete: false, displayRu: "Вт", displayNameRu: "ватт", displayEn: "W", unitSystems: ALL_SYSTEMS, boqCanonical: true }),
  unit({ code: "kW", aliases: ["kw", "квт"], dimension: "power", canonicalSiUnit: "W", conversionFactorToSi: 1000, precision: 2, discrete: false, displayRu: "кВт", displayNameRu: "киловатт", displayEn: "kW", unitSystems: ALL_SYSTEMS, boqCanonical: true }),
  unit({ code: "MW", aliases: ["mw", "мвт"], dimension: "power", canonicalSiUnit: "W", conversionFactorToSi: 1_000_000, precision: 3, discrete: false, displayRu: "МВт", displayNameRu: "мегаватт", displayEn: "MW", unitSystems: ALL_SYSTEMS, boqCanonical: true }),
] as const;

type RegistryEntry = (typeof DEFINITIONS)[number];
export type CanonicalProfessionalBoqUnit = Extract<RegistryEntry, { boqCanonical: true }>["code"];

export const PROFESSIONAL_UNIT_REGISTRY: readonly ProfessionalUnitDefinition[] = Object.freeze(DEFINITIONS);
export const CANONICAL_PROFESSIONAL_BOQ_UNIT_CODES: readonly CanonicalProfessionalBoqUnit[] =
  Object.freeze(DEFINITIONS.filter((entry) => entry.boqCanonical).map((entry) => entry.code as CanonicalProfessionalBoqUnit));

function normalizeUnitToken(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/\s+/g, "_")
    .replace(/[²]/g, "2")
    .replace(/[³]/g, "3")
    .replace(/^(?:m3|м3)(?:_|\/)?(?:h|hr|hour|ч|час)$/u, "m3_h")
    .replace(/^(?:m3|м3)_per_(?:h|hr|hour|ч|час)$/u, "m3_h")
    .replace(/^(?:m3|м3)(?:_|\/)?(?:d|day|сут|сутки)$/u, "m3_day")
    .replace(/^(?:m3|м3)_per_(?:d|day|сут|сутки)$/u, "m3_day")
    .replace(/^м\.?п\.?$/u, "lm")
    .replace(/^пог\.?_м$/u, "lm")
    .replace(/^пог\.?м$/u, "lm")
    .replace(/^м2$/u, "m2")
    .replace(/^м3$/u, "m3")
    .replace(/^шт\.?$/u, "pcs");
}

const BY_CODE = new Map<string, ProfessionalUnitDefinition>(
  DEFINITIONS.map((entry) => [entry.code, entry]),
);
const BY_ALIAS = new Map<string, ProfessionalUnitDefinition>();
for (const entry of DEFINITIONS) {
  for (const alias of [entry.code, ...entry.aliases]) {
    BY_ALIAS.set(normalizeUnitToken(alias), entry);
  }
}

export function getProfessionalUnitDefinition(code: string): ProfessionalUnitDefinition | null {
  return BY_CODE.get(code) ?? null;
}

export function resolveProfessionalUnitDefinition(value: string | null | undefined): ProfessionalUnitDefinition | null {
  if (!value) return null;
  return BY_ALIAS.get(normalizeUnitToken(value)) ?? null;
}

export function convertProfessionalUnitQuantity(value: number, fromUnit: string, toUnit: string): number | null {
  const from = resolveProfessionalUnitDefinition(fromUnit);
  const to = resolveProfessionalUnitDefinition(toUnit);
  if (!from || !to || from.dimension !== to.dimension || !Number.isFinite(value)) return null;
  return value * from.conversionFactorToSi / to.conversionFactorToSi;
}

export function professionalUnitConversionFactor(fromUnit: string, toUnit: string): number | null {
  return convertProfessionalUnitQuantity(1, fromUnit, toUnit);
}

export type ProfessionalPricedUnitProvenance = {
  registryVersion: typeof PROFESSIONAL_UNIT_REGISTRY_VERSION;
  sourceUnit: string;
  sourceQuantity: number;
  sourceUnitPrice: number;
  targetUnit: string;
  quantityFactor: number;
  jurisdiction: string;
  unitSystem: ProfessionalUnitSystem;
  converted: boolean;
};

export type NormalizedProfessionalPricedUnit = {
  quantity: number;
  unitPrice: number;
  unit: string;
  total: number;
  provenance: ProfessionalPricedUnitProvenance;
};

function localeTargetUnit(source: ProfessionalUnitDefinition, unitSystem: ProfessionalUnitSystem): string {
  if (unitSystem === "metric") {
    if (source.code === "sq_ft") return "m2";
    if (source.code === "linear_ft") return "lm";
    if (source.code === "cu_ft") return "m3";
    if (source.code === "lbs") return "kg";
  }
  if (unitSystem === "imperial") {
    if (source.code === "m2") return "sq_ft";
    if (source.code === "m" || source.code === "lm") return "linear_ft";
    if (source.code === "m3") return "cu_ft";
    if (source.code === "kg") return "lbs";
  }
  return source.code;
}

export function normalizeProfessionalPricedUnitForLocale(input: {
  quantity: number;
  unitPrice: number;
  unit: string;
  jurisdiction: string;
  unitSystem: ProfessionalUnitSystem;
  priorProvenance?: ProfessionalPricedUnitProvenance | null;
}): NormalizedProfessionalPricedUnit | null {
  if (input.priorProvenance?.converted) {
    const alreadyNormalized =
      input.priorProvenance.targetUnit === input.unit &&
      input.priorProvenance.unitSystem === input.unitSystem &&
      input.priorProvenance.jurisdiction === input.jurisdiction;
    return alreadyNormalized
      ? {
          quantity: input.quantity,
          unitPrice: input.unitPrice,
          unit: input.unit,
          total: input.quantity * input.unitPrice,
          provenance: input.priorProvenance,
        }
      : null;
  }
  const source = resolveProfessionalUnitDefinition(input.unit);
  if (!source || !Number.isFinite(input.quantity) || !Number.isFinite(input.unitPrice)) return null;
  const targetUnit = localeTargetUnit(source, input.unitSystem);
  const convertedQuantity = convertProfessionalUnitQuantity(input.quantity, source.code, targetUnit);
  if (convertedQuantity === null || convertedQuantity === 0) return null;
  const sourceTotal = input.quantity * input.unitPrice;
  const convertedUnitPrice = sourceTotal / convertedQuantity;
  const quantityFactor = convertedQuantity / input.quantity;
  return {
    quantity: convertedQuantity,
    unitPrice: convertedUnitPrice,
    unit: targetUnit,
    total: sourceTotal,
    provenance: {
      registryVersion: PROFESSIONAL_UNIT_REGISTRY_VERSION,
      sourceUnit: source.code,
      sourceQuantity: input.quantity,
      sourceUnitPrice: input.unitPrice,
      targetUnit,
      quantityFactor,
      jurisdiction: input.jurisdiction,
      unitSystem: input.unitSystem,
      converted: targetUnit !== source.code,
    },
  };
}
