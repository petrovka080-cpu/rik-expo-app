import { repairGlobalWorkMojibakeRu } from "../ai/globalEstimate";
import {
  extractWorkParamsFromInlinePrompt,
  type InlineWorkPromptExtractedParam,
} from "../ai/extractWorkParamsFromInlinePrompt";
import {
  buildAiEstimateParameterSchema,
  type AiEstimateParameterSchemaField,
} from "./aiEstimateParameterSchema";
import { buildProfessionalWorkPassport } from "./buildProfessionalWorkPassport";

export type RawInputFactSource = "USER_RAW_INPUT";

export type RawInputScaleClass =
  | "small_rooftop_or_ground"
  | "commercial_scale"
  | "utility_scale"
  | "unknown_scale";

export type RawInputFact = {
  fact_id: string;
  canonical_parameter_key: string;
  raw_text: string;
  normalized_value: number | string | boolean;
  normalized_unit?: string | null;
  evidence_start: number;
  evidence_end: number;
  confidence: number;
  source: RawInputFactSource;
  requires_confirmation: boolean;
  passport_owner: string;
  affected_formulas: string[];
};

export type RawInputFactExtractionMetrics = {
  explicit_input_facts_ignored: number;
  explicit_input_unit_mismatches: number;
  explicit_input_facts_overwritten_by_default: number;
};

export type RawInputFactExtraction = {
  raw_input: string;
  facts: RawInputFact[];
  metrics: RawInputFactExtractionMetrics;
};

const EMPTY_METRICS: RawInputFactExtractionMetrics = {
  explicit_input_facts_ignored: 0,
  explicit_input_unit_mismatches: 0,
  explicit_input_facts_overwritten_by_default: 0,
};

const POWER_UNIT_PATTERN = "(?:м\\s*вт|мвт|mw|megawatt(?:s)?|к\\s*вт|квт|kw|kilowatt(?:s)?)";
const NUMBER_PATTERN = "(\\d+(?:[\\s\u00a0]\\d{3})*(?:[,.]\\d+)?|\\d+(?:[,.]\\d+)?)";

function normalizeText(value: string): string {
  return repairGlobalWorkMojibakeRu(value)
    .normalize("NFKC")
    .toLocaleLowerCase("ru-RU")
    .replace(/\u0451/g, "\u0435")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(value: string | undefined): number | null {
  const parsed = Number(String(value ?? "").replace(/\s+/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value: number, precision = 6): number {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}

function evidenceSpan(rawInput: string, rawText: string): [number, number] {
  const index = rawInput.toLocaleLowerCase("ru-RU").indexOf(rawText.toLocaleLowerCase("ru-RU"));
  if (index >= 0) return [index, index + rawText.length];
  return [0, Math.min(rawInput.length, rawText.length)];
}

function fact(input: {
  rawInput: string;
  factId: string;
  key: string;
  rawText: string;
  value: number | string | boolean;
  unit?: string | null;
  confidence: number;
  requiresConfirmation?: boolean;
  passportOwner: string;
  affectedFormulas: string[];
}): RawInputFact {
  const [start, end] = evidenceSpan(input.rawInput, input.rawText);
  return {
    fact_id: input.factId,
    canonical_parameter_key: input.key,
    raw_text: input.rawText,
    normalized_value: input.value,
    normalized_unit: input.unit ?? null,
    evidence_start: start,
    evidence_end: end,
    confidence: input.confidence,
    source: "USER_RAW_INPUT",
    requires_confirmation: input.requiresConfirmation ?? false,
    passport_owner: input.passportOwner,
    affected_formulas: input.affectedFormulas,
  };
}

function isSolarPrompt(text: string, matchedFamily?: string | null): boolean {
  return matchedFamily === "solar_power_plant" ||
    /(?:солнечн\w*\s+электростанц|фотоэлектр|сэс\b|solar|photovoltaic|\bpv\b)/iu.test(text);
}

function powerUnit(rawUnit: string): "MW" | "kW" {
  return /(?:м\s*вт|мвт|mw|megawatt)/iu.test(rawUnit) ? "MW" : "kW";
}

function scaleForSolarCapacity(capacityMw: number): RawInputScaleClass {
  if (capacityMw >= 1) return "utility_scale";
  if (capacityMw <= 0.1) return "small_rooftop_or_ground";
  return "commercial_scale";
}

export function extractRawInputFactsFromPrompt(input: {
  rawInput: string;
  matchedFamily?: string | null;
  matchedTemplateId?: string | null;
}): RawInputFactExtraction {
  const rawInput = repairGlobalWorkMojibakeRu(input.rawInput ?? "");
  const normalized = normalizeText(rawInput);
  const facts: RawInputFact[] = [];
  const family = isSolarPrompt(normalized, input.matchedFamily) ? "solar_power_plant" : input.matchedFamily?.trim() || null;

  if (family === "solar_power_plant") {
    const familyMatch = /(?:солнечн\w*\s+электростанц\w*|фотоэлектр\w*|сэс\b|solar(?:\s+power)?(?:\s+plant)?|photovoltaic|\bpv\b)/iu.exec(rawInput) ??
      /(?:солнечн\w*\s+электростанц\w*|фотоэлектр\w*|сэс\b|solar(?:\s+power)?(?:\s+plant)?|photovoltaic|\bpv\b)/iu.exec(normalized);
    facts.push(fact({
      rawInput,
      factId: "raw_fact:work_family:solar_power_plant",
      key: "work_family",
      rawText: familyMatch?.[0] ?? rawInput.trim(),
      value: "solar_power_plant",
      confidence: 0.97,
      passportOwner: "solar_power_plant",
      affectedFormulas: ["template_selection", "solar_scale_classifier"],
    }));
  }

  const powerRegex = new RegExp(`${NUMBER_PATTERN}\\s*(${POWER_UNIT_PATTERN})(?=\\s|,|\\.|$)`, "iu");
  const powerMatch = powerRegex.exec(rawInput) ?? powerRegex.exec(normalized);
  const powerValue = parseNumber(powerMatch?.[1]);
  if (family === "solar_power_plant" && powerMatch && powerValue != null && powerValue > 0) {
    const unit = powerUnit(powerMatch[2] ?? "");
    const capacityMw = unit === "MW" ? powerValue : powerValue / 1000;
    const capacityKw = unit === "kW" ? powerValue : powerValue * 1000;
    const capacityWatts = unit === "MW" ? powerValue * 1_000_000 : powerValue * 1000;
    const scaleClass = scaleForSolarCapacity(capacityMw);
    const rawText = powerMatch[0].trim();
    const formulas = [
      "solar_capacity_mw",
      "solar_capacity_watts",
      "solar_scale_classifier",
      "solar_utility_scope_selector",
    ];

    facts.push(
      fact({
        rawInput,
        factId: "raw_fact:solar_power_plant:capacity",
        key: "capacity",
        rawText,
        value: powerValue,
        unit,
        confidence: 0.96,
        passportOwner: "solar_power_plant",
        affectedFormulas: formulas,
      }),
      fact({
        rawInput,
        factId: "raw_fact:solar_power_plant:capacity_mw",
        key: "capacity_mw",
        rawText,
        value: round(capacityMw),
        unit: "MW",
        confidence: 0.96,
        passportOwner: "solar_power_plant",
        affectedFormulas: formulas,
      }),
      fact({
        rawInput,
        factId: "raw_fact:solar_power_plant:capacity_kw",
        key: "capacity_kw",
        rawText,
        value: round(capacityKw),
        unit: "kW",
        confidence: 0.95,
        passportOwner: "solar_power_plant",
        affectedFormulas: formulas,
      }),
      fact({
        rawInput,
        factId: "raw_fact:solar_power_plant:capacity_watts",
        key: "capacity_watts",
        rawText,
        value: Math.round(capacityWatts),
        unit: "W",
        confidence: 0.95,
        passportOwner: "solar_power_plant",
        affectedFormulas: formulas,
      }),
      fact({
        rawInput,
        factId: "raw_fact:solar_power_plant:capacity_unit",
        key: "capacity_unit",
        rawText,
        value: unit,
        unit: null,
        confidence: 0.95,
        passportOwner: "solar_power_plant",
        affectedFormulas: formulas,
      }),
      fact({
        rawInput,
        factId: "raw_fact:solar_power_plant:scale_class",
        key: "scale_class",
        rawText,
        value: scaleClass,
        unit: null,
        confidence: 0.93,
        passportOwner: "solar_power_plant",
        affectedFormulas: ["solar_scale_classifier", "solar_utility_scope_selector"],
      }),
    );
  }

  addSchemaBoundRawInputFacts({
    rawInput,
    facts,
    matchedFamily: family,
    matchedTemplateId: input.matchedTemplateId,
  });

  return {
    raw_input: rawInput,
    facts,
    metrics: { ...EMPTY_METRICS },
  };
}

function stableFactToken(value: string): string {
  return value.replace(/[^a-zA-Z0-9_:-]+/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
}

function isExplicitSourceText(value: string | null | undefined): value is string {
  const text = String(value ?? "").trim();
  return Boolean(text) && !text.includes("*");
}

function affectedFormulasForField(field: AiEstimateParameterSchemaField): string[] {
  return field.formulaRefs.length > 0
    ? field.formulaRefs
    : field.affectsRowIds.map((rowId) => `row:${rowId}`);
}

function paramForQuantityUnit(
  params: Record<string, InlineWorkPromptExtractedParam>,
  unit: string | null | undefined,
): InlineWorkPromptExtractedParam | null {
  const normalizedUnit = String(unit ?? "").toLocaleLowerCase("ru-RU");
  if (normalizedUnit === "m2") return params.area_m2 ?? null;
  if (normalizedUnit === "m3") return params.volume_m3 ?? null;
  if (normalizedUnit === "m") return params.length_m ?? params.line_length_m ?? null;
  if (normalizedUnit === "point") {
    return params.electrical_points ?? params.water_points ?? params.sewer_points ?? params.count ?? null;
  }
  if (normalizedUnit === "piece" || normalizedUnit === "set" || normalizedUnit === "pcs") {
    return params.count ?? null;
  }
  return params.count ?? params.area_m2 ?? params.volume_m3 ?? params.length_m ?? null;
}

function schemaParamForField(
  field: AiEstimateParameterSchemaField,
  params: Record<string, InlineWorkPromptExtractedParam>,
): InlineWorkPromptExtractedParam | null {
  if (field.key === "q") return paramForQuantityUnit(params, field.unit);
  return params[field.key] ?? null;
}

function schemaBoundFact(input: {
  rawInput: string;
  field: AiEstimateParameterSchemaField;
  param: InlineWorkPromptExtractedParam;
  passportOwner: string;
}): RawInputFact | null {
  if (!isExplicitSourceText(input.param.sourceText)) return null;
  const affectedFormulas = affectedFormulasForField(input.field);
  if (affectedFormulas.length === 0) return null;
  return fact({
    rawInput: input.rawInput,
    factId: `raw_fact:${stableFactToken(input.passportOwner)}:${stableFactToken(input.field.key)}`,
    key: input.field.key,
    rawText: input.param.sourceText,
    value: input.param.value,
    unit: input.field.key === "q"
      ? input.field.unit
      : input.param.canonicalUnit ?? input.param.unit ?? input.field.unit,
    confidence: Math.min(0.94, Math.max(0.78, input.param.confidence)),
    passportOwner: input.passportOwner,
    affectedFormulas,
  });
}

function addSchemaBoundRawInputFacts(input: {
  rawInput: string;
  facts: RawInputFact[];
  matchedFamily?: string | null;
  matchedTemplateId?: string | null;
}): void {
  const templateId = input.matchedTemplateId?.trim();
  if (!templateId) return;
  const schema = buildAiEstimateParameterSchema(templateId);
  const passport = buildProfessionalWorkPassport(templateId);
  if (!schema || !passport) return;

  const params = extractWorkParamsFromInlinePrompt(input.rawInput);
  const existingKeys = new Set(input.facts.map((item) => item.canonical_parameter_key));
  const passportOwner = passport.familyId || input.matchedFamily || templateId;

  for (const field of schema.fields) {
    if (existingKeys.has(field.key)) continue;
    const parsed = schemaParamForField(field, params);
    if (!parsed) continue;
    const rawFact = schemaBoundFact({
      rawInput: input.rawInput,
      field,
      param: parsed,
      passportOwner,
    });
    if (!rawFact) continue;
    input.facts.push(rawFact);
    existingKeys.add(field.key);
  }
}

export function rawInputFactByKey(
  facts: readonly RawInputFact[],
  key: string,
): RawInputFact | null {
  return facts.find((item) => item.canonical_parameter_key === key) ?? null;
}

export function rawInputFactStringValue(
  facts: readonly RawInputFact[],
  key: string,
): string | null {
  const value = rawInputFactByKey(facts, key)?.normalized_value;
  return typeof value === "string" ? value : null;
}
