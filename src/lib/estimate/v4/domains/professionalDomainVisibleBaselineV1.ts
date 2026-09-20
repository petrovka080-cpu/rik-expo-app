import type {
  ProfessionalDomainParameterDefinitionV1,
  ProfessionalDomainParameterSchemaV1,
} from "../domainFactory";
import type {
  ProfessionalParameterValueV4,
  ProfessionalValueSourceTypeV4,
} from "../professionalProjectAssemblyV4";

export const PROFESSIONAL_DOMAIN_VISIBLE_BASELINE_VERSION_V1 =
  "registered-professional-visible-baseline:v1" as const;

const BASELINE_CAPTURED_AT = "2026-08-17T00:00:00.000Z";

type InlineOverride = {
  value: unknown;
  source?: string | null;
  sourceText?: string | null;
  lastChangedAt?: string | null;
};

export type ProfessionalDomainVisibleBaselineV1 = {
  parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>>;
  assumption_keys: readonly string[];
  explicit_parameter_keys: readonly string[];
  parameter_source_types: Readonly<Record<string, ProfessionalValueSourceTypeV4>>;
  parameter_source_metadata: Readonly<Record<string, {
    sourceType: ProfessionalValueSourceTypeV4;
    sourceId: string;
    baselineVersion: typeof PROFESSIONAL_DOMAIN_VISIBLE_BASELINE_VERSION_V1;
    reasonRu: string;
    unit: string | null;
  }>>;
};

export type ProfessionalDomainVisibleParameterMetadataV1 = {
  labelRu: string;
  unit: string | null;
  inputKind: "number" | "boolean" | "select" | "text";
  choices: readonly { value: string; labelRu: string }[];
  requiredFor: "contract_ready" | "better_accuracy";
  sourceType: ProfessionalValueSourceTypeV4 | null;
  sourceId: string | null;
  defaultSourceVersion: typeof PROFESSIONAL_DOMAIN_VISIBLE_BASELINE_VERSION_V1;
  defaultReasonRu: string | null;
  minimum: number | null;
  maximum: number | null;
  formulaConsumers: readonly string[];
  sourceOwnership: readonly string[];
  guideShortRu: string;
  guideKind: "PROJECT_REQUIRED" | "VALIDATION_RANGE" | "REFERENCE_GUIDANCE";
  guideDetailsRu: readonly string[];
};

export function professionalDomainVisibleParameterLabelRu(
  parameter: Pick<ProfessionalDomainParameterDefinitionV1, "parameter_id" | "label_ru">,
): string {
  if (parameter.parameter_id === "normative_rate_code") return "Применимая нормативная расценка";
  if (/^accepted_.+_revision_id$/.test(parameter.parameter_id)) {
    return "Подтверждённая редакция связанного раздела работ";
  }
  if (parameter.parameter_id === "price_basis_reference") return "Источник цены";
  if (parameter.parameter_id === "price_basis_date") return "Дата источника цены";
  const withoutTechnicalTokens = parameter.label_ru
    .replace(/[a-z][a-z0-9]*(?:[_-][a-z0-9]+)+/giu, " ")
    .replace(/\b(?:non-cost|dependency|pricebook|YYYY-MM-DD)\b/giu, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([:;,.])/g, "$1")
    .trim()
    .replace(/[:;,.-]+$/g, "")
    .trim();
  return /[А-Яа-яЁё]/u.test(withoutTechnicalTokens)
    ? withoutTechnicalTokens
    : "Проектный параметр выбранной работы";
}

function visibleUnitSuffix(unit: string | null): string {
  return unit ? ` ${unit}` : "";
}

export function professionalDomainVisibleParameterMetadataV1(
  parameter: ProfessionalDomainParameterDefinitionV1,
  value: ProfessionalParameterValueV4 | null | undefined,
): ProfessionalDomainVisibleParameterMetadataV1 {
  const labelRu = professionalDomainVisibleParameterLabelRu(parameter);
  const range = parameter.minimum != null && parameter.maximum != null
    ? `${parameter.minimum}–${parameter.maximum}${visibleUnitSuffix(parameter.unit_id)}`
    : parameter.minimum != null
      ? `от ${parameter.minimum}${visibleUnitSuffix(parameter.unit_id)}`
      : parameter.maximum != null
        ? `до ${parameter.maximum}${visibleUnitSuffix(parameter.unit_id)}`
        : null;
  const choiceLabels = (parameter.choices ?? []).map((choice) => choice.label_ru).filter(Boolean);
  const guideKind: ProfessionalDomainVisibleParameterMetadataV1["guideKind"] = range
    ? "VALIDATION_RANGE"
    : choiceLabels.length > 0
      ? "REFERENCE_GUIDANCE"
      : "PROJECT_REQUIRED";
  const guideShortRu = range
    ? `Ориентир допустимого диапазона: ${range}`
    : choiceLabels.length > 0
      ? `Ориентир выбора: ${choiceLabels.slice(0, 3).join(" / ")}`
      : `По проекту или обмеру: укажите «${labelRu.toLocaleLowerCase("ru-RU")}»${visibleUnitSuffix(parameter.unit_id)}`;
  const sourceText = parameter.source_ownership.length > 0
    ? `Источники и владельцы: ${parameter.source_ownership.join(", ")}.`
    : "Источник: инженерное допущение с обязательным последующим уточнением по проекту или обмеру.";
  const formulaText = parameter.formula_consumers.length > 0
    ? `Потребители формул: ${parameter.formula_consumers.join(", ")}.`
    : "Параметр управляет validation или scope decision; отдельная формула количества не заявлена.";
  return {
    labelRu,
    unit: parameter.unit_id,
    inputKind: parameter.input_type === "choice" ? "select" : parameter.input_type,
    choices: parameter.choices?.map((choice) => ({ value: choice.value, labelRu: choice.label_ru })) ?? [],
    requiredFor: parameter.priority === "P0" ? "contract_ready" : "better_accuracy",
    sourceType: value?.source_type ?? null,
    sourceId: value?.source_id ?? null,
    defaultSourceVersion: PROFESSIONAL_DOMAIN_VISIBLE_BASELINE_VERSION_V1,
    defaultReasonRu: value?.source_type === "VISIBLE_BASELINE_ASSUMPTION"
      ? `Видимое предварительное допущение для «${labelRu}»; замените его фактическим значением проекта.`
      : null,
    minimum: parameter.minimum ?? null,
    maximum: parameter.maximum ?? null,
    formulaConsumers: [...parameter.formula_consumers],
    sourceOwnership: [...parameter.source_ownership],
    guideShortRu,
    guideKind,
    guideDetailsRu: [
      sourceText,
      formulaText,
      range
        ? "Это validation-ориентир, а не обязательная нормативная величина без подтверждённого locator."
        : "Фактическое значение пользователя имеет приоритет над предварительным допущением.",
    ],
  };
}

function primitive(value: unknown): value is string | number | boolean {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function finiteNumber(value: string): number | null {
  const parsed = Number(value.replace(/\s+/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function firstNumber(input: string, pattern: RegExp): number | null {
  const match = pattern.exec(input.normalize("NFKC"));
  return match?.[1] ? finiteNumber(match[1]) : null;
}

function rawMeasurements(rawInput: string): Readonly<Record<string, number | null>> {
  return {
    area_m2: firstNumber(rawInput, /(\d+(?:[.,]\d+)?)\s*(?:m2|m²|м2|м²|кв\.?\s*м)/iu),
    length_m: firstNumber(rawInput, /(?:length|длин[аы]?)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:m|м)(?![mм²2])/iu),
    width_m: firstNumber(rawInput, /(?:width|ширин[аы]?)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:m|м)(?![mм²2])/iu),
    height_m: firstNumber(rawInput, /(?:height|высот[аы]?)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:m|м)(?![mм²2])/iu),
    diameter_mm: firstNumber(rawInput, /(?:diameter|диаметр)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:mm|мм)/iu),
    voltage_kv: firstNumber(rawInput, /(?:voltage|напряжени[ея])\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:kv|кв)/iu),
  };
}

function sourceTypeForOverride(source: string | null | undefined): ProfessionalValueSourceTypeV4 {
  if (source === "default_assumption") return "VISIBLE_BASELINE_ASSUMPTION";
  if (source === "derived") return "SURVEY_MEASUREMENT";
  return "USER_EXPLICIT";
}

function withinRange(value: number, parameter: ProfessionalDomainParameterDefinitionV1): boolean {
  return Number.isFinite(value) &&
    (parameter.minimum == null || value >= parameter.minimum) &&
    (parameter.maximum == null || value <= parameter.maximum);
}

function rawValueForParameter(
  parameter: ProfessionalDomainParameterDefinitionV1,
  measurements: Readonly<Record<string, number | null>>,
  quantityParameterIds: ReadonlySet<string>,
): number | null {
  const id = parameter.parameter_id;
  const direct = measurements[id];
  if (typeof direct === "number" && withinRange(direct, parameter)) return direct;
  if (!quantityParameterIds.has(id)) return null;
  const byUnit = parameter.unit_id === "m2"
    ? measurements.area_m2
    : parameter.unit_id === "m"
      ? measurements.length_m
      : parameter.unit_id === "mm" && /diameter/i.test(id)
        ? measurements.diameter_mm
        : parameter.unit_id === "kV"
          ? measurements.voltage_kv
          : null;
  return typeof byUnit === "number" && withinRange(byUnit, parameter) ? byUnit : null;
}

function clamp(value: number, parameter: ProfessionalDomainParameterDefinitionV1): number {
  const aboveMinimum = parameter.minimum == null ? value : Math.max(value, parameter.minimum);
  return parameter.maximum == null ? aboveMinimum : Math.min(aboveMinimum, parameter.maximum);
}

function baselineNumber(parameter: ProfessionalDomainParameterDefinitionV1): number {
  const id = parameter.parameter_id;
  if (/design_supply_temperature_c/.test(id)) return clamp(80, parameter);
  if (/design_return_temperature_c/.test(id)) return clamp(60, parameter);
  if (/temperature_c/.test(id)) return clamp(20, parameter);
  if (/percent/.test(id)) return clamp(5, parameter);
  if (/fraction/.test(id)) return clamp(0.05, parameter);
  if (/procurement_factor/.test(id)) return clamp(1, parameter);
  if (parameter.maximum != null && parameter.maximum <= 1) {
    const minimum = parameter.minimum ?? 0;
    return clamp(minimum + (parameter.maximum - minimum) / 2, parameter);
  }
  if (/(?:count|quantity|item|point|test|document|service|record)/.test(id)) return clamp(1, parameter);
  if (/(?:area|length|width|height|diameter|depth|thickness|volume|flow|capacity|power)/.test(id)) {
    return clamp(1, parameter);
  }
  return clamp(1, parameter);
}

function baselineChoice(
  parameter: ProfessionalDomainParameterDefinitionV1,
  scopeCapability: string,
): string | boolean {
  if (parameter.parameter_id === "estimate_scope_mode") return "MINIMAL_EXPLICIT_SCOPE";
  if (parameter.parameter_id === "scope_capability") return scopeCapability;
  const choices = parameter.choices ?? [];
  const projectSpecified = choices.find((choice) => choice.value === "PROJECT_SPECIFIED");
  return String((projectSpecified ?? choices[0])?.value ?? "PRELIMINARY_SELECTION_TO_BE_REFINED");
}

function baselineValue(
  parameter: ProfessionalDomainParameterDefinitionV1,
  catalogId: string,
  scopeCapability: string,
): string | number | boolean {
  if (parameter.input_type === "number") return baselineNumber(parameter);
  if (parameter.input_type === "boolean") {
    if (parameter.parameter_id === "work_included") return true;
    if (parameter.parameter_id === "access_equipment_required") {
      return /(?:drywall_ceiling|bulkhead|ceiling|roof|roofing|facade)/iu.test(catalogId);
    }
    return false;
  }
  if (parameter.input_type === "choice") return baselineChoice(parameter, scopeCapability);
  if (parameter.parameter_id === "project_type") return "Предварительный частный проект";
  if (parameter.parameter_id === "exact_krerm_rate_code") {
    return "N_A_WITH_REASON:OPEN_OFFICIAL_KRERM_08_RATE_TABLE_NOT_PUBLISHED_USE_CUSTOMER_APPROVED_INDIVIDUAL_NORM_PER_KRERM_GUIDANCE_1_6_1_7";
  }
  if (parameter.parameter_id === "exact_krerp_rate_code") {
    return "N_A_WITH_REASON:EXACT_KRERP_01_RATE_NOT_APPLICABLE_TO_GENERIC_FIXTURE_USE_CUSTOMER_APPROVED_INDIVIDUAL_RATE_PER_KRERP_GUIDANCE_5_5_1_5_5_5";
  }
  if (parameter.parameter_id === "normative_rate_code") return "Применимую расценку необходимо уточнить по проекту";
  if (/(?:product|material|equipment|system).*?(?:profile|model|type|class|route)/.test(parameter.parameter_id)) {
    return "Предварительный профиль — уточнить по паспорту материала или оборудования";
  }
  return "Предварительное значение — уточнить по проекту";
}

function isPriceParameter(parameterId: string): boolean {
  return parameterId.startsWith("unit_price_") ||
    parameterId === "price_basis_reference" ||
    parameterId === "price_basis_date";
}

function makeParameterValue(input: {
  parameter: ProfessionalDomainParameterDefinitionV1;
  value: string | number | boolean;
  sourceType: ProfessionalValueSourceTypeV4;
  sourceId: string;
  capturedAt?: string | null;
  applicability: string;
}): ProfessionalParameterValueV4 {
  return {
    value: input.value,
    unit_id: input.parameter.unit_id,
    source_type: input.sourceType,
    source_id: input.sourceId,
    captured_at: input.capturedAt || BASELINE_CAPTURED_AT,
    confidence: input.sourceType === "USER_EXPLICIT" ? "high" : "medium",
    applicability: input.applicability,
  };
}

export function buildProfessionalDomainVisibleBaselineV1(input: {
  schema: ProfessionalDomainParameterSchemaV1;
  catalogId: string;
  workKey: string;
  scopeCapability: string;
  rawInput: string;
  supplied?: Readonly<Record<string, InlineOverride>>;
  requireExplicitNormativeRateCode?: boolean;
}): ProfessionalDomainVisibleBaselineV1 {
  const values: Record<string, ProfessionalParameterValueV4> = {};
  const assumptionKeys = new Set<string>();
  const explicitKeys = new Set<string>();
  const definitions = new Map(input.schema.parameters.map((parameter) => [parameter.parameter_id, parameter]));
  const quantityParameterIds = new Set(input.schema.quantity_alternatives.flat());
  const measurements = rawMeasurements(input.rawInput);

  for (const [parameterId, override] of Object.entries(input.supplied ?? {})) {
    const parameter = definitions.get(parameterId);
    if (!parameter || !primitive(override.value)) continue;
    const sourceType = sourceTypeForOverride(override.source);
    values[parameterId] = makeParameterValue({
      parameter,
      value: override.value,
      sourceType,
      sourceId: override.sourceText?.trim() || `inline-override:${input.catalogId}:${parameterId}:${override.source ?? "user"}`,
      capturedAt: override.lastChangedAt,
      applicability: `Canonical inline override for ${input.catalogId}`,
    });
    if (sourceType === "VISIBLE_BASELINE_ASSUMPTION") assumptionKeys.add(parameterId);
    else explicitKeys.add(parameterId);
  }

  for (const parameter of input.schema.parameters) {
    if (values[parameter.parameter_id]) continue;
    const rawValue = rawValueForParameter(parameter, measurements, quantityParameterIds);
    if (rawValue == null) continue;
    values[parameter.parameter_id] = makeParameterValue({
      parameter,
      value: rawValue,
      sourceType: "USER_EXPLICIT",
      sourceId: `raw-input:${input.catalogId}:${parameter.parameter_id}`,
      applicability: `Explicit quantity and unit parsed from the selected-work request for ${input.catalogId}`,
    });
    explicitKeys.add(parameter.parameter_id);
  }

  const selectedQuantityAlternative = input.schema.quantity_alternatives.find((alternative) =>
    alternative.every((parameterId) => values[parameterId] !== undefined),
  ) ?? input.schema.quantity_alternatives[0] ?? [];
  const selectedQuantityIds = new Set(selectedQuantityAlternative);
  const inactiveAlternativeQuantityIds = new Set(
    input.schema.quantity_alternatives.flat().filter((parameterId) => !selectedQuantityIds.has(parameterId)),
  );
  const baselineRequiredIds = new Set([
    ...input.schema.parameters
      .filter((parameter) => parameter.priority === "P0" &&
        !inactiveAlternativeQuantityIds.has(parameter.parameter_id) &&
        !(input.requireExplicitNormativeRateCode && parameter.parameter_id === "normative_rate_code") &&
        !isPriceParameter(parameter.parameter_id))
      .map((parameter) => parameter.parameter_id),
    ...selectedQuantityAlternative,
  ]);
  for (const parameterId of baselineRequiredIds) {
    if (values[parameterId]) continue;
    const parameter = definitions.get(parameterId);
    if (!parameter) continue;
    values[parameterId] = makeParameterValue({
      parameter,
      value: baselineValue(parameter, input.catalogId, input.scopeCapability),
      sourceType: "VISIBLE_BASELINE_ASSUMPTION",
      sourceId: `${PROFESSIONAL_DOMAIN_VISIBLE_BASELINE_VERSION_V1}:${input.catalogId}:${parameterId}`,
      applicability: `Visible preliminary baseline for ${input.workKey}; replace with project, survey, material-passport or verified norm data`,
    });
    assumptionKeys.add(parameterId);
  }

  const parameterSourceTypes = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value.source_type]),
  );
  const parameterSourceMetadata = Object.fromEntries(Object.entries(values).map(([key, value]) => {
    const definition = definitions.get(key);
    const label = definition
      ? professionalDomainVisibleParameterLabelRu(definition)
      : "Проектный параметр выбранной работы";
    return [key, {
      sourceType: value.source_type,
      sourceId: value.source_id,
      baselineVersion: PROFESSIONAL_DOMAIN_VISIBLE_BASELINE_VERSION_V1,
      reasonRu: value.source_type === "VISIBLE_BASELINE_ASSUMPTION"
        ? `Видимое предварительное допущение для «${label}»; замените его фактическим значением проекта.`
        : `Значение «${label}» получено из пользовательского запроса или правки.`,
      unit: value.unit_id,
    }];
  }));
  return {
    parameter_values: Object.freeze(values),
    assumption_keys: Object.freeze([...assumptionKeys].sort()),
    explicit_parameter_keys: Object.freeze([...explicitKeys].sort()),
    parameter_source_types: Object.freeze(parameterSourceTypes),
    parameter_source_metadata: Object.freeze(parameterSourceMetadata),
  };
}
