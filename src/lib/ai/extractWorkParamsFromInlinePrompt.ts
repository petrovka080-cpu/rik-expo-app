import { repairGlobalWorkMojibakeRu } from "./globalEstimate";

export type InlineWorkPromptExtractedParam = {
  value: number | string | boolean;
  unit?: string;
  canonicalUnit?: string;
  sourceText: string;
  confidence: number;
};

export type InlineWorkPromptExtractedParams = Record<string, InlineWorkPromptExtractedParam>;

const DECIMAL = "(\\d+(?:[,.]\\d+)?)";
const LINEAR_UNIT = "(км|km|мм|mm|см|cm|м|m|метр|метра|метров|meter|meters)";

export function normalizeInlineWorkPromptText(value: string | null | undefined): string {
  return repairGlobalWorkMojibakeRu(String(value ?? ""))
    .normalize("NFKC")
    .toLocaleLowerCase("ru-RU")
    .replace(/\u0451/g, "\u0435")
    .replace(/\u00a0/g, " ")
    .replace(/[×х]/gu, "x")
    .replace(/м²/gu, "м2")
    .replace(/м³/gu, "м3")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(value: string | undefined): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value: number, precision = 4): number {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}

function setParam(
  params: InlineWorkPromptExtractedParams,
  key: string,
  value: number | string | boolean,
  input: {
    unit?: string;
    canonicalUnit?: string;
    sourceText: string;
    confidence?: number;
    overwrite?: boolean;
  },
): void {
  if (!input.overwrite && params[key]) return;
  params[key] = {
    value,
    unit: input.unit,
    canonicalUnit: input.canonicalUnit,
    sourceText: input.sourceText.trim(),
    confidence: input.confidence ?? 0.92,
  };
}

function toMeters(value: number, unit: string | undefined): number {
  const normalized = String(unit ?? "м").toLocaleLowerCase("ru-RU");
  if (normalized === "км" || normalized === "km") return value * 1000;
  if (normalized === "см" || normalized === "cm") return value / 100;
  if (normalized === "мм" || normalized === "mm") return value / 1000;
  return value;
}

function toMillimeters(value: number, unit: string | undefined): number {
  const normalized = String(unit ?? "мм").toLocaleLowerCase("ru-RU");
  if (normalized === "м" || normalized === "m" || normalized.startsWith("метр")) return value * 1000;
  if (normalized === "см" || normalized === "cm") return value * 10;
  if (normalized === "км" || normalized === "km") return value * 1_000_000;
  return value;
}

function extractKeywordLinear(
  text: string,
  key: string,
  keywordPattern: string,
  target: "m" | "mm",
  params: InlineWorkPromptExtractedParams,
): void {
  const pattern = new RegExp(`(?:${keywordPattern})\\s*(?:=|:)?\\s*${DECIMAL}\\s*${LINEAR_UNIT}?`, "iu");
  const match = pattern.exec(text);
  const value = parseNumber(match?.[1]);
  if (value == null) return;
  const unit = match?.[2] ?? (target === "m" ? "м" : "мм");
  const converted = target === "m" ? toMeters(value, unit) : toMillimeters(value, unit);
  setParam(params, key, round(converted), {
    unit,
    canonicalUnit: target,
    sourceText: match?.[0] ?? "",
  });
}

function extractKeywordLinearWithMiddleWords(
  text: string,
  key: string,
  keywordPattern: string,
  target: "m" | "mm",
  params: InlineWorkPromptExtractedParams,
): void {
  const pattern = new RegExp(`(?:${keywordPattern})(?:\\s+[\\p{L}-]+){0,3}\\s*(?:=|:)?\\s*${DECIMAL}\\s*${LINEAR_UNIT}?`, "iu");
  const match = pattern.exec(text);
  const value = parseNumber(match?.[1]);
  if (value == null) return;
  const unit = match?.[2] ?? (target === "m" ? "м" : "мм");
  const converted = target === "m" ? toMeters(value, unit) : toMillimeters(value, unit);
  setParam(params, key, round(converted), {
    unit,
    canonicalUnit: target,
    sourceText: match?.[0] ?? "",
  });
}

function extractNamedCount(
  text: string,
  key: string,
  keywordPattern: string,
  params: InlineWorkPromptExtractedParams,
): void {
  const patterns = [
    new RegExp(`${DECIMAL}\\s*(?:${keywordPattern})`, "iu"),
    new RegExp(`(?:${keywordPattern})\\s*(?:=|:)?\\s*${DECIMAL}`, "iu"),
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    const value = parseNumber(match?.[1]);
    if (value == null) continue;
    setParam(params, key, Math.max(1, Math.round(value)), {
      unit: "pcs",
      canonicalUnit: "pcs",
      sourceText: match?.[0] ?? "",
      confidence: 0.9,
    });
    return;
  }
}

function extractArea(text: string, params: InlineWorkPromptExtractedParams): void {
  const patterns = [
    new RegExp(`${DECIMAL}\\s*(?:кв\\.?\\s*м(?:етр(?:а|ов)?)?|квадрат(?:ных|ные)?\\s*м(?:етр(?:а|ов)?)?|м2|m2|sqm|sq\\.?\\s*m)`, "iu"),
    new RegExp(`(?:площадь|area)\\s*(?:=|:)?\\s*${DECIMAL}\\s*(?:м2|m2|кв\\.?\\s*м)?`, "iu"),
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    const value = parseNumber(match?.[1]);
    if (value == null) continue;
    setParam(params, "area_m2", round(value), {
      unit: "m2",
      canonicalUnit: "m2",
      sourceText: match?.[0] ?? "",
    });
    return;
  }
}

function extractVolume(text: string, params: InlineWorkPromptExtractedParams): void {
  const patterns = [
    new RegExp(`${DECIMAL}\\s*(?:куб(?:ов|а|ы)?|куб\\.?\\s*м|м3|m3)`, "iu"),
    new RegExp(`(?:объем|обьем|volume)\\s*(?:=|:)?\\s*${DECIMAL}\\s*(?:м3|m3|куб(?:ов)?)?`, "iu"),
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    const value = parseNumber(match?.[1]);
    if (value == null) continue;
    setParam(params, "volume_m3", round(value), {
      unit: "m3",
      canonicalUnit: "m3",
      sourceText: match?.[0] ?? "",
    });
    return;
  }
}

function extractCount(text: string, params: InlineWorkPromptExtractedParams): void {
  const patterns = [
    new RegExp(`(?:количество|count|qty)\\s*(?:=|:)?\\s*${DECIMAL}\\s*(?:шт|штук|pcs|piece|pieces)?`, "iu"),
    new RegExp(`${DECIMAL}\\s*(?:шт|штук|pcs|piece|pieces)\\b`, "iu"),
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    const value = parseNumber(match?.[1]);
    if (value == null) continue;
    setParam(params, "count", round(value), {
      unit: "pcs",
      canonicalUnit: "pcs",
      sourceText: match?.[0] ?? "",
    });
    return;
  }
}

function extractConstructionCounts(text: string, params: InlineWorkPromptExtractedParams): void {
  extractNamedCount(text, "bathrooms_count", "сануз(?:ел|ла|лов|лы)?|ванн(?:ая|ые|ых|ы)?|душев(?:ая|ые|ых)?|bathrooms?", params);
  extractNamedCount(text, "doors_count", "двер(?:ь|и|ей)|проем(?:а|ов|ы)?|doors?", params);
  extractNamedCount(text, "electrical_points", "электр(?:о)?точ(?:ка|ки|ек)|розет(?:ка|ки|ок)|выключател(?:ь|и|ей)|electrical\\s+points?|sockets?", params);
  extractNamedCount(text, "water_points", "водоточ(?:ка|ки|ек)|точ(?:ка|ки|ек)\\s+вод(?:ы|оснабжения)?|water\\s+points?", params);
  extractNamedCount(text, "sewer_points", "точ(?:ка|ки|ек)\\s+канализац(?:ии|ия)?|канализационн(?:ая|ые)\\s+точ(?:ка|ки|ек)|sewer\\s+points?", params);
  extractNamedCount(text, "roof_windows_count", "мансардн(?:ое|ых|ые)\\s+окн(?:о|а)?|roof\\s+windows?", params);
}

function extractDiameter(text: string, params: InlineWorkPromptExtractedParams): void {
  const shorthand = /\b(?:dn|d)\s*(\d{2,4})\b/iu.exec(text);
  const keyword = new RegExp(`(?:диаметр|diameter)\\s*(?:=|:)?\\s*${DECIMAL}\\s*${LINEAR_UNIT}?`, "iu").exec(text);
  const rawValue = shorthand?.[1] ?? keyword?.[1];
  const value = parseNumber(rawValue);
  if (value == null) return;
  const unit = keyword?.[2] ?? "мм";
  setParam(params, "diameter_mm", round(toMillimeters(value, unit)), {
    unit,
    canonicalUnit: "mm",
    sourceText: shorthand?.[0] ?? keyword?.[0] ?? "",
  });
}

function extractCableSection(text: string, params: InlineWorkPromptExtractedParams): void {
  const match = /\b(\d+)\s*x\s*(\d+(?:[,.]\d+)?)\b/iu.exec(text);
  if (!match) return;
  setParam(params, "cable_section", `${match[1]}x${match[2].replace(",", ".")}`, {
    canonicalUnit: "cores_x_mm2",
    sourceText: match[0],
  });
}

function extractElectrical(text: string, params: InlineWorkPromptExtractedParams): void {
  const voltage = new RegExp(`${DECIMAL}\\s*(?:кв|kv)\\b`, "iu").exec(text);
  const voltageValue = parseNumber(voltage?.[1]);
  if (voltageValue != null) {
    setParam(params, "voltage_kv", round(voltageValue), {
      unit: "kV",
      canonicalUnit: "kV",
      sourceText: voltage?.[0] ?? "",
      confidence: 0.88,
    });
  }

  const power = new RegExp(`${DECIMAL}\\s*(?:мвт|mw|квт|kw)\\b`, "iu").exec(text);
  const powerValue = parseNumber(power?.[1]);
  if (powerValue == null || !power) return;
  const unit = /мвт|mw/iu.test(power[0]) ? "MW" : "kW";
  setParam(params, unit === "MW" ? "power_mw" : "power_kw", round(powerValue), {
    unit,
    canonicalUnit: unit,
    sourceText: power[0],
    confidence: 0.88,
  });
}

function extractGenericLinear(text: string, params: InlineWorkPromptExtractedParams): void {
  const km = new RegExp(`${DECIMAL}\\s*(?:км|km)(?:\\s|$)`, "iu").exec(text);
  const kmValue = parseNumber(km?.[1]);
  if (kmValue != null) {
    const meters = round(kmValue * 1000);
    setParam(params, "length_m", meters, {
      unit: "km",
      canonicalUnit: "m",
      sourceText: km?.[0] ?? "",
      confidence: 0.82,
    });
    setParam(params, "line_length_m", meters, {
      unit: "km",
      canonicalUnit: "m",
      sourceText: km?.[0] ?? "",
      confidence: 0.82,
    });
  }

  const bareCm = new RegExp(`${DECIMAL}\\s*(?:см|cm)(?:\\s|$)`, "iu").exec(text);
  const bareCmValue = parseNumber(bareCm?.[1]);
  if (bareCmValue != null && !params.depth_mm && !params.thickness_m) {
    setParam(params, "depth_mm", round(bareCmValue * 10), {
      unit: "cm",
      canonicalUnit: "mm",
      sourceText: bareCm?.[0] ?? "",
      confidence: 0.72,
    });
  }

  const meterValues = [...text.matchAll(new RegExp(`${DECIMAL}\\s*(?:м|m|метр|метра|метров)(?:\\s|$)`, "giu"))];
  const semanticLinearParams = [
    params.line_length_m,
    params.width_m,
    params.height_m,
    params.ceiling_height_m,
    params.thickness_m,
    params.trench_depth_m,
    params.trench_width_m,
    params.insulation_thickness_mm,
    params.depth_mm,
    params.diameter_mm,
  ].filter(Boolean);
  const semanticLinearSourceTexts = semanticLinearParams.map((param) => param?.sourceText ?? "").filter(Boolean);
  const unclaimedMeterValue = meterValues.find((match) => {
    const parsed = parseNumber(match[1]);
    const sourceClaimed = semanticLinearSourceTexts.some((sourceText) => sourceText.includes(match[0].trim()));
    const sameSemanticNumber = semanticLinearParams.some((param) =>
      typeof param?.value === "number" &&
      parsed != null &&
      Math.abs(param.value - parsed) < 0.0001 &&
      String(param.sourceText ?? "").includes(match[1])
    );
    return !sourceClaimed && !sameSemanticNumber;
  });
  if (!params.length_m && unclaimedMeterValue) {
    const value = parseNumber(unclaimedMeterValue[1]);
    if (value != null) {
      setParam(params, "length_m", round(value), {
        unit: "m",
        canonicalUnit: "m",
        sourceText: unclaimedMeterValue[0],
        confidence: 0.68,
      });
    }
  }
}

function extractMode(text: string, params: InlineWorkPromptExtractedParams): void {
  const turnkey = /(?:под\s+ключ|turnkey)/iu.exec(text);
  if (!turnkey) return;
  setParam(params, "package_mode", "turnkey", {
    sourceText: turnkey[0],
    confidence: 0.95,
  });
}

function addDerivedParams(params: InlineWorkPromptExtractedParams): void {
  const length = typeof params.length_m?.value === "number" ? params.length_m.value : null;
  const height = typeof params.height_m?.value === "number" ? params.height_m.value : null;
  const thickness = typeof params.thickness_m?.value === "number" ? params.thickness_m.value : null;
  if (length != null && height != null && thickness != null) {
    setParam(params, "volume_m3", round(length * height * thickness), {
      unit: "m3",
      canonicalUnit: "m3",
      sourceText: "length_m * height_m * thickness_m",
      confidence: 0.9,
      overwrite: false,
    });
  }
}

export function extractWorkParamsFromInlinePrompt(rawInput: string): InlineWorkPromptExtractedParams {
  const text = normalizeInlineWorkPromptText(rawInput);
  const params: InlineWorkPromptExtractedParams = {};

  extractArea(text, params);
  extractVolume(text, params);
  extractKeywordLinearWithMiddleWords(text, "ceiling_height_m", "высот[аы]\\s+потолк[а-я]*|потолк[а-я]*|ceiling\\s+height", "m", params);
  extractKeywordLinearWithMiddleWords(text, "trench_width_m", "ширин[аы]\\s+транше[а-я]*|trench\\s+width", "m", params);
  extractKeywordLinearWithMiddleWords(text, "trench_depth_m", "глубин[аы]\\s+транше[а-я]*|trench\\s+depth", "m", params);
  extractKeywordLinearWithMiddleWords(text, "insulation_thickness_mm", "толщин[аы]\\s+утеплител[а-я]*|утеплител[а-я]*|insulation\\s+thickness", "mm", params);
  extractKeywordLinear(text, "length_m", "длина|протяженность|length", "m", params);
  extractKeywordLinear(text, "line_length_m", "длина\\s+линии|трасса|line\\s+length", "m", params);
  extractKeywordLinear(text, "width_m", "ширина|width", "m", params);
  extractKeywordLinear(text, "height_m", "высота|height", "m", params);
  extractKeywordLinear(text, "thickness_m", "толщина|thickness", "m", params);
  extractKeywordLinear(text, "depth_mm", "глубина|depth", "mm", params);
  extractDiameter(text, params);
  extractCableSection(text, params);
  extractCount(text, params);
  extractConstructionCounts(text, params);
  extractElectrical(text, params);
  extractMode(text, params);
  extractGenericLinear(text, params);
  addDerivedParams(params);

  return params;
}
