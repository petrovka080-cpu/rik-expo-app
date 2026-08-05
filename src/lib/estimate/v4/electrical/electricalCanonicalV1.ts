import type {
  EstimateDraftRevisionAssumption,
  EstimateDraftRevisionMissingInput,
  EstimateDraftRevisionParam,
} from "../../estimateDraftRevisionContract";
import {
  CANONICAL_PARAMETER_CORE_SCHEMA_VERSION,
  createCanonicalParameterSession,
  type CanonicalParameterDefinition,
  type CanonicalParameterSchema,
  type CanonicalParameterSeed,
  type CanonicalParameterSession,
} from "../../canonicalParameters/canonicalParameterCore";
import type { EstimateWorkProfileRegistration } from "../../workProfiles/estimateWorkProfileRegistry";
import {
  electricalCircuitCountFromConfirmedPoints,
} from "./electricalProfessionalBoqV1";

export const ELECTRICAL_CANONICAL_WORK_KEY = "electrical_area_installation" as const;
export const ELECTRICAL_CANONICAL_SCOPE_PRESET_ID = "AREA_AND_POINT_INSTALLATION" as const;
export const ELECTRICAL_CANONICAL_PARAMETER_SCHEMA_ID =
  "electrical-area-installation-parameters:2026-07-28.v1" as const;
export const ELECTRICAL_CANONICAL_ENGINE_VERSION =
  "electrical-canonical-compiler:2026-07-28.v1" as const;
export const ELECTRICAL_CANONICAL_FORMULA_GRAPH_VERSION =
  "electrical-canonical-formula-graph:2026-07-28.v1" as const;
export const ELECTRICAL_CANONICAL_CALCULATION_VERSION =
  "electrical-area-installation:2026-07-28.v1" as const;

export type ElectricalCanonicalParameterKey =
  | "area_m2"
  | "package_mode"
  | "object_type"
  | "route_length_m"
  | "outlet_count"
  | "switch_count"
  | "lighting_point_count"
  | "electrical_points_total"
  | "work_scope_type"
  | "estimated_load_kw"
  | "wiring_method"
  | "containment_type"
  | "wall_material"
  | "penetration_count"
  | "cable_type"
  | "cable_section_mm2"
  | "line_count"
  | "group_count"
  | "phase_count"
  | "panel_included"
  | "protective_devices_included"
  | "grounding_included"
  | "demolition_included"
  | "restoration_included"
  | "installation_height_m"
  | "access_condition"
  | "cable_reserve_factor";

export type ElectricalCanonicalParameterValue = number | string | boolean;
export type ElectricalCanonicalParameterValues = Partial<
  Record<ElectricalCanonicalParameterKey, ElectricalCanonicalParameterValue>
>;

export type ElectricalCanonicalParameterDefinition = {
  key: ElectricalCanonicalParameterKey;
  labelRu: string;
  unit: string | null;
  inputKind: "number" | "text" | "boolean" | "select";
  requiredFor: "better_accuracy" | "contract_ready" | "safety_review";
  choices?: readonly { value: string; labelRu: string }[];
  affectsRowCodePrefixes: readonly string[];
  priority: number;
};

export const ELECTRICAL_CANONICAL_PARAMETER_DEFINITIONS:
readonly ElectricalCanonicalParameterDefinition[] = [
  {
    key: "area_m2",
    labelRu: "Площадь объекта",
    unit: "sq_m",
    inputKind: "number",
    requiredFor: "better_accuracy",
    affectsRowCodePrefixes: ["electrical_route_marking", "electrical_wall_scanning", "electrical_dust_protection"],
    priority: 1,
  },
  {
    key: "package_mode",
    labelRu: "Коммерческий пакет",
    unit: null,
    inputKind: "select",
    requiredFor: "better_accuracy",
    choices: [
      { value: "turnkey", labelRu: "Под ключ" },
      { value: "labor_only", labelRu: "Только работы" },
      { value: "materials_only", labelRu: "Только материалы" },
    ],
    affectsRowCodePrefixes: [],
    priority: 1.1,
  },
  {
    key: "object_type",
    labelRu: "Тип объекта",
    unit: null,
    inputKind: "select",
    requiredFor: "contract_ready",
    choices: [
      { value: "apartment", labelRu: "Квартира" },
      { value: "house", labelRu: "Дом" },
      { value: "office", labelRu: "Офис" },
      { value: "commercial_space", labelRu: "Коммерческое помещение" },
      { value: "other", labelRu: "Другой объект" },
    ],
    affectsRowCodePrefixes: ["electrical_survey"],
    priority: 1.2,
  },
  {
    key: "route_length_m",
    labelRu: "Длина кабельной трассы",
    unit: "linear_m",
    inputKind: "number",
    requiredFor: "contract_ready",
    affectsRowCodePrefixes: [
      "electrical_power_cable",
      "electrical_lighting_cable",
      "electrical_corrugation_channel",
      "electrical_chasing_or_channel",
      "electrical_cable_laying",
      "electrical_reserve",
    ],
    priority: 2,
  },
  {
    key: "outlet_count",
    labelRu: "Количество розеток",
    unit: "pcs",
    inputKind: "number",
    requiredFor: "contract_ready",
    affectsRowCodePrefixes: ["electrical_socket_boxes", "electrical_outlets", "electrical_outlet_install"],
    priority: 3,
  },
  {
    key: "switch_count",
    labelRu: "Количество выключателей",
    unit: "pcs",
    inputKind: "number",
    requiredFor: "contract_ready",
    affectsRowCodePrefixes: ["electrical_socket_boxes", "electrical_switches", "electrical_switch_install"],
    priority: 4,
  },
  {
    key: "lighting_point_count",
    labelRu: "Количество точек освещения",
    unit: "pcs",
    inputKind: "number",
    requiredFor: "contract_ready",
    affectsRowCodePrefixes: ["electrical_lighting_points", "electrical_lighting_point_install"],
    priority: 5,
  },
  {
    key: "electrical_points_total",
    labelRu: "Всего электрических точек",
    unit: "pcs",
    inputKind: "number",
    requiredFor: "better_accuracy",
    affectsRowCodePrefixes: ["electrical_load_groups"],
    priority: 6,
  },
  {
    key: "work_scope_type",
    labelRu: "Вид электромонтажных работ",
    unit: null,
    inputKind: "select",
    requiredFor: "better_accuracy",
    choices: [
      { value: "new_installation", labelRu: "Новая электропроводка" },
      { value: "partial_replacement", labelRu: "Частичная замена" },
      { value: "extension", labelRu: "Расширение существующей сети" },
    ],
    affectsRowCodePrefixes: ["electrical_survey"],
    priority: 7,
  },
  {
    key: "estimated_load_kw",
    labelRu: "Расчётная электрическая нагрузка",
    unit: "kW",
    inputKind: "number",
    requiredFor: "safety_review",
    affectsRowCodePrefixes: ["electrical_panel", "electrical_breakers"],
    priority: 8,
  },
  {
    key: "wiring_method",
    labelRu: "Способ прокладки",
    unit: null,
    inputKind: "select",
    requiredFor: "better_accuracy",
    choices: [
      { value: "concealed", labelRu: "Скрытая прокладка" },
      { value: "open", labelRu: "Открытая прокладка" },
    ],
    affectsRowCodePrefixes: ["electrical_corrugation_channel", "electrical_chasing_or_channel"],
    priority: 10,
  },
  {
    key: "containment_type",
    labelRu: "Система прокладки кабеля",
    unit: null,
    inputKind: "select",
    requiredFor: "better_accuracy",
    choices: [
      { value: "corrugation", labelRu: "Гофрированная труба" },
      { value: "cable_channel", labelRu: "Кабель-канал" },
      { value: "tray", labelRu: "Кабельный лоток" },
      { value: "conduit", labelRu: "Жёсткая труба" },
    ],
    affectsRowCodePrefixes: [
      "electrical_corrugation_channel",
      "electrical_chasing_or_channel",
    ],
    priority: 10.5,
  },
  {
    key: "wall_material",
    labelRu: "Материал стен",
    unit: null,
    inputKind: "select",
    requiredFor: "better_accuracy",
    choices: [
      { value: "concrete", labelRu: "Бетон" },
      { value: "brick", labelRu: "Кирпич" },
      { value: "drywall", labelRu: "ГКЛ / каркасная стена" },
      { value: "other", labelRu: "Другой материал" },
    ],
    affectsRowCodePrefixes: ["electrical_wall_scanning", "electrical_chasing_or_channel"],
    priority: 11,
  },
  {
    key: "penetration_count",
    labelRu: "Количество кабельных проходок",
    unit: "pcs",
    inputKind: "number",
    requiredFor: "better_accuracy",
    affectsRowCodePrefixes: [
      "electrical_reference_wall_sleeves",
      "electrical_reference_firestop",
      "electrical_reference_penetration_drilling",
    ],
    priority: 11.5,
  },
  {
    key: "cable_type",
    labelRu: "Тип кабеля",
    unit: null,
    inputKind: "text",
    requiredFor: "contract_ready",
    affectsRowCodePrefixes: ["electrical_power_cable", "electrical_lighting_cable"],
    priority: 12,
  },
  {
    key: "cable_section_mm2",
    labelRu: "Сечение кабеля",
    unit: "mm2",
    inputKind: "number",
    requiredFor: "contract_ready",
    affectsRowCodePrefixes: ["electrical_power_cable", "electrical_lighting_cable"],
    priority: 13,
  },
  {
    key: "line_count",
    labelRu: "Количество кабельных линий",
    unit: "pcs",
    inputKind: "number",
    requiredFor: "better_accuracy",
    affectsRowCodePrefixes: ["electrical_junction_boxes", "electrical_cable_laying"],
    priority: 14,
  },
  {
    key: "group_count",
    labelRu: "Количество групп",
    unit: "pcs",
    inputKind: "number",
    requiredFor: "contract_ready",
    affectsRowCodePrefixes: ["electrical_load_groups", "electrical_junction_boxes", "electrical_breakers"],
    priority: 15,
  },
  {
    key: "phase_count",
    labelRu: "Количество фаз",
    unit: "pcs",
    inputKind: "select",
    requiredFor: "safety_review",
    choices: [
      { value: "1", labelRu: "Однофазная сеть" },
      { value: "3", labelRu: "Трёхфазная сеть" },
    ],
    affectsRowCodePrefixes: ["electrical_panel", "electrical_panel_mount", "electrical_breakers"],
    priority: 16,
  },
  {
    key: "panel_included",
    labelRu: "Щит входит в объём",
    unit: null,
    inputKind: "boolean",
    requiredFor: "contract_ready",
    affectsRowCodePrefixes: ["electrical_panel", "electrical_panel_mount"],
    priority: 17,
  },
  {
    key: "protective_devices_included",
    labelRu: "Автоматы и УЗО входят в объём",
    unit: null,
    inputKind: "boolean",
    requiredFor: "safety_review",
    affectsRowCodePrefixes: ["electrical_breakers"],
    priority: 18,
  },
  {
    key: "grounding_included",
    labelRu: "Заземление входит в объём",
    unit: null,
    inputKind: "boolean",
    requiredFor: "safety_review",
    affectsRowCodePrefixes: ["electrical_ground_bus", "electrical_grounding_test"],
    priority: 19,
  },
  {
    key: "demolition_included",
    labelRu: "Демонтаж существующей проводки",
    unit: null,
    inputKind: "boolean",
    requiredFor: "better_accuracy",
    affectsRowCodePrefixes: ["electrical_demolition", "electrical_demolition_waste"],
    priority: 20,
  },
  {
    key: "restoration_included",
    labelRu: "Восстановление отделки входит в объём",
    unit: null,
    inputKind: "boolean",
    requiredFor: "contract_ready",
    affectsRowCodePrefixes: ["electrical_chase_repair"],
    priority: 20.1,
  },
  {
    key: "installation_height_m",
    labelRu: "Высота монтажа",
    unit: "linear_m",
    inputKind: "number",
    requiredFor: "safety_review",
    affectsRowCodePrefixes: ["electrical_access_equipment"],
    priority: 20.5,
  },
  {
    key: "access_condition",
    labelRu: "Условия доступа к месту работ",
    unit: null,
    inputKind: "select",
    requiredFor: "better_accuracy",
    choices: [
      { value: "normal", labelRu: "Свободный доступ" },
      { value: "restricted", labelRu: "Стеснённый доступ" },
      { value: "height_equipment", labelRu: "Нужна вышка или подмости" },
    ],
    affectsRowCodePrefixes: ["electrical_access_equipment"],
    priority: 20.6,
  },
  {
    key: "cable_reserve_factor",
    labelRu: "Коэффициент запаса кабеля",
    unit: null,
    inputKind: "number",
    requiredFor: "better_accuracy",
    affectsRowCodePrefixes: ["electrical_power_cable", "electrical_lighting_cable", "electrical_reserve"],
    priority: 21,
  },
] as const;

function canonicalRequiredLevel(
  key: ElectricalCanonicalParameterKey,
): CanonicalParameterDefinition["requiredLevel"] {
  if ([
    "area_m2",
    "route_length_m",
    "outlet_count",
    "switch_count",
    "lighting_point_count",
  ].includes(key)) return "BLOCKING_REQUIRED";
  if (
    key === "object_type" ||
    key === "work_scope_type" ||
    key === "wiring_method" ||
    key === "demolition_included" ||
    key === "restoration_included" ||
    key === "cable_type" ||
    key === "cable_section_mm2" ||
    key === "group_count" ||
    key === "panel_included"
  ) {
    return "CONTRACT_REQUIRED";
  }
  if (
    key === "estimated_load_kw" ||
    key === "installation_height_m" ||
    key === "phase_count" ||
    key === "protective_devices_included" ||
    key === "grounding_included"
  ) {
    return "CONDITIONAL";
  }
  return "OPTIONAL";
}

function canonicalValueType(
  definition: ElectricalCanonicalParameterDefinition,
): CanonicalParameterDefinition["valueType"] {
  if (definition.inputKind === "boolean") return "boolean";
  if (definition.inputKind === "number") return "number";
  if (
    definition.key === "phase_count" ||
    definition.key === "wiring_method" ||
    definition.key === "wall_material"
  ) {
    return definition.key === "phase_count" ? "number" : "string";
  }
  return "string";
}

export const ELECTRICAL_CANONICAL_PARAMETER_SCHEMA: CanonicalParameterSchema = {
  coreSchemaVersion: CANONICAL_PARAMETER_CORE_SCHEMA_VERSION,
  schemaId: ELECTRICAL_CANONICAL_PARAMETER_SCHEMA_ID,
  schemaVersion: "1.0.0",
  workPassportId: "ELECTRICAL_CANONICAL_V1",
  canonicalWorkKey: ELECTRICAL_CANONICAL_WORK_KEY,
  calculationVersion: ELECTRICAL_CANONICAL_CALCULATION_VERSION,
  requiredAlternatives: [
    {
      alternativeId: "confirmed_quantitative_scope",
      parameterIds: [
        "area_m2",
        "route_length_m",
        "outlet_count",
        "switch_count",
        "lighting_point_count",
      ],
    },
  ],
  definitions: ELECTRICAL_CANONICAL_PARAMETER_DEFINITIONS.map((definition) => ({
    parameterId: definition.key,
    label: definition.labelRu,
    description: `Параметр расчёта «${definition.labelRu}»; изменение пересчитывает только связанные строки.`,
    valueType: canonicalValueType(definition),
    unit: definition.unit,
    requiredLevel: canonicalRequiredLevel(definition.key),
    visibilityCondition: { kind: "ALWAYS" as const },
    validation: definition.inputKind === "number"
      ? {
          min: definition.key === "cable_reserve_factor" ? 1 : 0,
          integer: [
            "outlet_count",
            "switch_count",
            "lighting_point_count",
            "line_count",
            "group_count",
            "phase_count",
            "penetration_count",
          ].includes(definition.key),
        }
      : definition.inputKind === "text"
        ? { nonEmpty: true }
        : {},
    allowedValues: (definition.choices ?? []).map((choice) => ({
      value: definition.key === "phase_count" ? Number(choice.value) : choice.value,
      label: choice.labelRu,
    })),
    affectsRows: [...definition.affectsRowCodePrefixes],
    affectsFormula: definition.affectsRowCodePrefixes.map((prefix) =>
      `electrical:${prefix}:v1`
    ),
    normativeSource: null,
    displayOrder: definition.priority,
  })),
};

export const ELECTRICAL_CANONICAL_PROFILE: EstimateWorkProfileRegistration = {
  registrationVersion: "1.0.0",
  workPassportId: "ELECTRICAL_CANONICAL_V1",
  canonicalWorkKey: ELECTRICAL_CANONICAL_WORK_KEY,
  catalogWorkIds: [
    ELECTRICAL_CANONICAL_WORK_KEY,
    "electrical_basic",
    "electrical_wiring",
    "power_cable_laying",
  ],
  scopePresets: [{
    scopePresetId: ELECTRICAL_CANONICAL_SCOPE_PRESET_ID,
    labelRu: "Электромонтаж по площади, трассам и точкам",
    calculationStrategyId: ELECTRICAL_CANONICAL_CALCULATION_VERSION,
    parameterSchemaVersion: ELECTRICAL_CANONICAL_PARAMETER_SCHEMA_ID,
    engineVersion: ELECTRICAL_CANONICAL_ENGINE_VERSION,
    requiredParameterAlternatives: [
      {
        alternativeId: "confirmed_quantitative_scope",
        parameterKeys: [
          "area_m2",
          "route_length_m",
          "outlet_count",
          "switch_count",
          "lighting_point_count",
        ],
      },
    ],
  }],
  formulaGraphVersion: ELECTRICAL_CANONICAL_FORMULA_GRAPH_VERSION,
  readiness: {
    catalogMapped: "PROVEN",
    runtimeCompilable: "PROVEN",
    formulaInvariant: "PROVEN",
    normativeVerified: "PARTIAL_REVIEW_REQUIRED",
    priceCovered: "PARTIAL",
    referenceAccepted: "PENDING",
  },
};

type MatchResult = { value: ElectricalCanonicalParameterValue; sourceText: string };

function positiveNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function numberMatch(text: string, patterns: readonly RegExp[]): MatchResult | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = positiveNumber(match?.[1]);
    if (match && value != null) return { value, sourceText: match[0] };
  }
  return null;
}

function booleanMatch(text: string, positive: RegExp, negative: RegExp): MatchResult | null {
  const no = text.match(negative);
  if (no) return { value: false, sourceText: no[0] };
  const yes = text.match(positive);
  return yes ? { value: true, sourceText: yes[0] } : null;
}

function extractedMatches(text: string): Partial<Record<ElectricalCanonicalParameterKey, MatchResult>> {
  const normalized = text.normalize("NFKC");
  const result: Partial<Record<ElectricalCanonicalParameterKey, MatchResult>> = {};
  result.area_m2 = numberMatch(normalized, [
    /(?:площад(?:ь|и)|объект|area)\D{0,20}(\d+(?:[,.]\d+)?)\s*(?:м²|м2|кв\.?\s*м|sq(?:uare)?[_\s-]*m|sqm)/iu,
    /(\d+(?:[,.]\d+)?)\s*(?:м²|м2|кв\.?\s*м|sq(?:uare)?[_\s-]*m|sqm)/iu,
  ]) ?? undefined;
  if (/под\s+ключ/iu.test(normalized)) {
    result.package_mode = { value: "turnkey", sourceText: "под ключ" };
  } else if (/только\s+работ/iu.test(normalized)) {
    result.package_mode = { value: "labor_only", sourceText: "только работы" };
  } else if (/только\s+материал/iu.test(normalized)) {
    result.package_mode = { value: "materials_only", sourceText: "только материалы" };
  }
  if (/квартир[а-яё]*/iu.test(normalized)) {
    result.object_type = { value: "apartment", sourceText: "квартира" };
  } else if (/(?:частн[а-яё]*\s+)?дом(?:а|е|ом)?/iu.test(normalized)) {
    result.object_type = { value: "house", sourceText: "дом" };
  } else if (/офис[а-яё]*/iu.test(normalized)) {
    result.object_type = { value: "office", sourceText: "офис" };
  } else if (/коммерческ[а-яё]*\s+помещени[а-яё]*/iu.test(normalized)) {
    result.object_type = { value: "commercial_space", sourceText: "коммерческое помещение" };
  }
  result.route_length_m = numberMatch(normalized, [
    /(?:длин[а-яё]*\s+)?(?:кабельн[а-яё]*\s+)?трасс[а-яё]*\D{0,16}(\d+(?:[,.]\d+)?)\s*(?:пог\.?\s*)?(?:м|метр(?:а|ов)?)(?=\s|$|[.,;])/iu,
    /(?:кабел[а-яё]*|провод[а-яё]*)\D{0,16}(\d+(?:[,.]\d+)?)\s*(?:пог\.?\s*)?(?:м|метр(?:а|ов)?)(?=\s|$|[.,;])/iu,
  ]) ?? undefined;
  result.outlet_count = numberMatch(normalized, [
    /(\d+(?:[,.]\d+)?)\s*(?:шт\.?\s*)?розет[а-яё]*(?=\s|$|[.,;])/iu,
    /розет[а-яё]*\s*[:=-]?\s*(\d+(?:[,.]\d+)?)\s*(?:шт\.?)?/iu,
  ]) ?? undefined;
  result.switch_count = numberMatch(normalized, [
    /(\d+(?:[,.]\d+)?)\s*(?:шт\.?\s*)?выключател[а-яё]*(?=\s|$|[.,;])/iu,
    /выключател[а-яё]*\s*[:=-]?\s*(\d+(?:[,.]\d+)?)\s*(?:шт\.?)?/iu,
  ]) ?? undefined;
  result.lighting_point_count = numberMatch(normalized, [
    /(\d+(?:[,.]\d+)?)\s*(?:шт\.?\s*)?(?:точ(?:ек|ки|ка)\s+)?освещени(?:я|е)(?=\s|$|[.,;])/iu,
    /(?:точ(?:ек|ки|ка)\s+)?освещени(?:я|е)\s*[:=-]?\s*(\d+(?:[,.]\d+)?)/iu,
    /(\d+(?:[,.]\d+)?)\s*(?:шт\.?\s*)?светов(?:ых|ые)\s+(?:точ(?:ек|ки)|вывод(?:ов|а))(?=\s|$|[.,;])/iu,
  ]) ?? undefined;
  result.group_count = numberMatch(normalized, [
    /(\d+(?:[,.]\d+)?)\s*(?:шт\.?\s*)?групп(?:ы|а)?(?=\s|$|[.,;])/iu,
    /групп(?:ы|а)?\s*[:=-]?\s*(\d+(?:[,.]\d+)?)/iu,
  ]) ?? undefined;
  result.line_count = numberMatch(normalized, [
    /(\d+(?:[,.]\d+)?)\s*(?:шт\.?\s*)?(?:кабельн(?:ых|ые)\s+)?лини(?:й|и|я)(?=\s|$|[.,;])/iu,
    /(?:кабельн(?:ых|ые)\s+)?лини(?:й|и|я)\s*[:=-]?\s*(\d+(?:[,.]\d+)?)/iu,
  ]) ?? undefined;
  result.penetration_count = numberMatch(normalized, [
    /(\d+(?:[,.]\d+)?)\s*(?:шт\.?\s*)?проход(?:ок|ки|ка)(?=\s|$|[.,;])/iu,
    /проход(?:ок|ки|ка)\s*[:=-]?\s*(\d+(?:[,.]\d+)?)/iu,
  ]) ?? undefined;
  result.cable_section_mm2 = numberMatch(normalized, [
    /сечени[а-яё]*\D{0,12}(\d+(?:[,.]\d+)?)\s*(?:мм²|мм2)/iu,
    /кабел[а-яё]*\D{0,20}(\d+(?:[,.]\d+)?)\s*(?:мм²|мм2)/iu,
  ]) ?? undefined;
  result.estimated_load_kw = numberMatch(normalized, [
    /(?:нагрузк[а-яё]*|мощност[а-яё]*)\D{0,12}(\d+(?:[,.]\d+)?)\s*(?:квт|kw)(?=\s|$|[.,;])/iu,
  ]) ?? undefined;
  result.installation_height_m = numberMatch(normalized, [
    /высот[а-яё]*\D{0,12}(\d+(?:[,.]\d+)?)\s*(?:м|метр(?:а|ов)?)(?=\s|$|[.,;])/iu,
  ]) ?? undefined;

  const wiring = normalized.match(/((?:скрыт|открыт)[а-яё]*)\s+(?:способ[а-яё]*\s+)?прокладк[а-яё]*/iu)
    ?? normalized.match(/прокладк[а-яё]*\s+((?:скрыт|открыт)[а-яё]*)/iu);
  if (wiring) {
    result.wiring_method = {
      value: wiring[1].toLocaleLowerCase("ru-RU").startsWith("скрыт") ? "concealed" : "open",
      sourceText: wiring[0],
    };
  }
  if (/кабельн[а-яё]*\s+лоток|кабель-лоток/iu.test(normalized)) {
    result.containment_type = { value: "tray", sourceText: "кабельный лоток" };
  } else if (/кабель-канал/iu.test(normalized)) {
    result.containment_type = { value: "cable_channel", sourceText: "кабель-канал" };
  } else if (/гофр[а-яё]*/iu.test(normalized)) {
    result.containment_type = { value: "corrugation", sourceText: "гофра" };
  } else if (/ж[её]стк[а-яё]*\s+труб/iu.test(normalized)) {
    result.containment_type = { value: "conduit", sourceText: "жёсткая труба" };
  }
  if (/частичн[а-яё]*\s+замен/iu.test(normalized)) {
    result.work_scope_type = {
      value: "partial_replacement",
      sourceText: "частичная замена",
    };
  } else if (/расширени[а-яё]*\s+(?:сет|проводк)/iu.test(normalized)) {
    result.work_scope_type = {
      value: "extension",
      sourceText: "расширение сети",
    };
  } else if (/нов[а-яё]*\s+(?:электропроводк|проводк|электросет)/iu.test(normalized)) {
    result.work_scope_type = {
      value: "new_installation",
      sourceText: "новая электропроводка",
    };
  }
  if (/стесн[её]нн[а-яё]*\s+доступ/iu.test(normalized)) {
    result.access_condition = {
      value: "restricted",
      sourceText: "стеснённый доступ",
    };
  } else if (/вышк[а-яё]*|подмост[а-яё]*/iu.test(normalized)) {
    result.access_condition = {
      value: "height_equipment",
      sourceText: "вышка или подмости",
    };
  }
  const wall = normalized.match(/стен[а-яё]*\D{0,12}(бетон[а-яё]*|кирпич[а-яё]*|гкл|гипсокартон[а-яё]*)/iu);
  if (wall) {
    const value = wall[1].toLocaleLowerCase("ru-RU");
    result.wall_material = {
      value: value.startsWith("бетон") ? "concrete" : value.startsWith("кирпич") ? "brick" : "drywall",
      sourceText: wall[0],
    };
  }
  const phase = normalized.match(/((?:однофазн|тр[её]хфазн)[а-яё]*)\s+сет[а-яё]*/iu);
  if (phase) {
    result.phase_count = {
      value: phase[1].toLocaleLowerCase("ru-RU").startsWith("одно") ? 1 : 3,
      sourceText: phase[0],
    };
  }
  const cableType = normalized.match(/(?:^|[^A-Za-zА-Яа-яЁё])(ВВГ(?:нг)?(?:-?LS)?|NYM|ПВС)(?=$|[^A-Za-zА-Яа-яЁё])/iu);
  if (cableType) result.cable_type = { value: cableType[1].toUpperCase(), sourceText: cableType[0] };

  result.panel_included = booleanMatch(
    normalized,
    /(?:нуж(?:ен|на)|включ(?:ить|ён|ена)|установ(?:ить|ка))\D{0,10}(?:электрическ\w*\s+)?щит/iu,
    /(?:без|не\s+нуж(?:ен|на)|не\s+включать)\D{0,10}(?:электрическ\w*\s+)?щит/iu,
  ) ?? undefined;
  result.protective_devices_included = booleanMatch(
    normalized,
    /(?:нужн\w*|включ(?:ить|ены)|установ(?:ить|ка))\D{0,12}(?:автомат\w*|узо|дифавтомат\w*)/iu,
    /(?:без|не\s+нужн\w*|не\s+включать)\D{0,12}(?:автомат\w*|узо|дифавтомат\w*)/iu,
  ) ?? undefined;
  result.grounding_included = booleanMatch(
    normalized,
    /(?:нужн\w*|включ(?:ить|ено)|установ(?:ить|ка))\D{0,12}заземлени\w*/iu,
    /(?:без|не\s+нужн\w*|не\s+включать)\D{0,12}заземлени\w*/iu,
  ) ?? undefined;
  result.demolition_included = booleanMatch(
    normalized,
    /(?:нуж(?:ен|ен)?|включ(?:ить|ён)|с)\D{0,12}демонтаж\w*/iu,
    /(?:без|не\s+нуж(?:ен|но)|не\s+включать)\D{0,12}демонтаж\w*/iu,
  ) ?? undefined;
  result.restoration_included = booleanMatch(
    normalized,
    /(?:нужн\w*|включ(?:ить|ено)|с)\D{0,16}(?:восстановлени\w*|заделк\w*)\D{0,8}(?:отделк\w*|штроб\w*)/iu,
    /(?:без|не\s+нужн\w*|не\s+включать)\D{0,16}(?:восстановлени\w*|заделк\w*)\D{0,8}(?:отделк\w*|штроб\w*)/iu,
  ) ?? undefined;
  return result;
}

function assumedSeed(
  parameterId: ElectricalCanonicalParameterKey,
  value: ElectricalCanonicalParameterValue,
  assumption: string,
): CanonicalParameterSeed {
  return {
    parameterId,
    value,
    source: "ASSUMED",
    confidence: 0.45,
    assumption,
    sourceText: assumption,
  };
}

export function buildElectricalCanonicalParameterSession(input: {
  text: string;
  overrides?: ElectricalCanonicalParameterValues;
  draftId: string;
  revisionId: string;
  changedAt: string;
  previousSession?: CanonicalParameterSession | null;
}): CanonicalParameterSession {
  const extracted = extractedMatches(input.text);
  const seeds: CanonicalParameterSeed[] = [];
  for (const definition of ELECTRICAL_CANONICAL_PARAMETER_DEFINITIONS) {
    if (definition.key === "electrical_points_total") continue;
    const override = input.overrides?.[definition.key];
    const match = extracted[definition.key];
    const value = override ?? match?.value;
    if (value == null || value === "") continue;
    seeds.push({
      parameterId: definition.key,
      value,
      source: override != null ? "USER_EXPLICIT" : "TEXT_EXTRACTED",
      confidence: override != null ? 1 : 0.95,
      assumption: null,
      sourceText: override != null ? "parameter_editor" : match?.sourceText ?? null,
    });
  }
  const seedIds = new Set(seeds.map((seed) => seed.parameterId));
  const numericValue = (parameterId: ElectricalCanonicalParameterKey): number | null => {
    const value = seeds.find((seed) => seed.parameterId === parameterId)?.value;
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  };
  const pointValues = [
    numericValue("outlet_count"),
    numericValue("switch_count"),
    numericValue("lighting_point_count"),
  ];
  const knownPointValues = pointValues.filter((value): value is number => value != null);
  if (knownPointValues.length > 0) {
    const total = knownPointValues.reduce((sum, value) => sum + value, 0);
    seeds.push({
      parameterId: "electrical_points_total",
      value: total,
      source: "CALCULATED",
      confidence: knownPointValues.length === 3 ? 1 : 0.65,
      assumption: knownPointValues.length === 3
        ? null
        : "Сумма учитывает только явно указанные типы точек.",
      sourceText: "outlet_count + switch_count + lighting_point_count",
    });
  }
  const confirmedQuantitativeScope = [
    "area_m2",
    "route_length_m",
    "outlet_count",
    "switch_count",
    "lighting_point_count",
  ].every((parameterId) => seedIds.has(parameterId));
  // Engineering defaults are permitted only after a complete dimensional
  // basis exists. They remain visible and editable ASSUMED parameters.
  if (confirmedQuantitativeScope) {
    const assumedCircuitCount = electricalCircuitCountFromConfirmedPoints({
      outletCount: numericValue("outlet_count") ?? 0,
      switchCount: numericValue("switch_count") ?? 0,
      lightingPointCount: numericValue("lighting_point_count") ?? 0,
    });
    if (!seedIds.has("group_count")) {
      seeds.push(assumedSeed(
        "group_count",
        Math.max(1, assumedCircuitCount),
        "Предварительное число групп принято из явно указанных точек; требуется подтверждение расписанием цепей.",
      ));
    }
    if (!seedIds.has("line_count")) {
      seeds.push(assumedSeed(
        "line_count",
        Math.max(1, assumedCircuitCount),
        "Предварительное число линий принято равным числу видимых групп; требуется подтверждение расписанием цепей.",
      ));
    }
    if (!seedIds.has("cable_reserve_factor")) {
      seeds.push(assumedSeed(
        "cable_reserve_factor",
        1,
        "Запас кабеля не добавлен: коэффициент 1,00 до явного подтверждения.",
      ));
    }
    if (!seedIds.has("phase_count")) {
      seeds.push(assumedSeed(
        "phase_count",
        1,
        "Для предварительного расписания цепей принято однофазное исполнение; требуется подтверждение.",
      ));
    }
  }
  return createCanonicalParameterSession({
    schema: ELECTRICAL_CANONICAL_PARAMETER_SCHEMA,
    draftId: input.draftId,
    revisionId: input.revisionId,
    seeds,
    createdAt: input.changedAt,
    previousSession: input.previousSession,
  });
}

function missingInput(key: ElectricalCanonicalParameterKey): EstimateDraftRevisionMissingInput {
  const definition = ELECTRICAL_CANONICAL_PARAMETER_DEFINITIONS.find((item) => item.key === key)!;
  return {
    key,
    label: definition.labelRu,
    blocksPreliminaryEstimate: canonicalRequiredLevel(key) === "BLOCKING_REQUIRED",
    requiredFor: definition.requiredFor,
  };
}

export function resolveElectricalCanonicalParameters(input: {
  text: string;
  overrides?: ElectricalCanonicalParameterValues;
  changedAt: string;
}): {
  params: Record<string, EstimateDraftRevisionParam>;
  values: ElectricalCanonicalParameterValues;
  missingInputs: EstimateDraftRevisionMissingInput[];
  assumptions: EstimateDraftRevisionAssumption[];
} {
  const canonicalSession = buildElectricalCanonicalParameterSession({
    text: input.text,
    overrides: input.overrides,
    draftId: "electrical-canonical-resolution",
    revisionId: `electrical-canonical-resolution:${input.changedAt}`,
    changedAt: input.changedAt,
  });
  const definitionById = new Map(
    ELECTRICAL_CANONICAL_PARAMETER_DEFINITIONS.map((definition) => [definition.key, definition]),
  );
  const params: Record<string, EstimateDraftRevisionParam> = Object.fromEntries(
    canonicalSession.parameters
      .filter((parameter) => parameter.value != null)
      .map((parameter) => {
        const definition = definitionById.get(parameter.parameterId as ElectricalCanonicalParameterKey);
        const source = parameter.source === "USER_EXPLICIT"
          ? "edited_by_user"
          : parameter.source === "TEXT_EXTRACTED"
            ? "user_input"
            : parameter.source === "CALCULATED"
              ? "derived"
              : "default_assumption";
        return [parameter.parameterId, {
          value: parameter.value!,
          ...(definition?.unit ? { canonicalUnit: definition.unit } : {}),
          source,
          sourceText: parameter.sourceText ?? parameter.assumption ?? undefined,
          lastChangedAt: input.changedAt,
        }];
      }),
  );
  const missingInputs = canonicalSession.parameters
    .filter((parameter) => parameter.source === "MISSING")
    .map((parameter) => missingInput(parameter.parameterId as ElectricalCanonicalParameterKey));
  const assumptions: EstimateDraftRevisionAssumption[] = canonicalSession.parameters
    .filter((parameter) => parameter.source === "ASSUMED")
    .map((parameter) => ({
      key: parameter.parameterId,
      value: parameter.value,
      reason: parameter.assumption ?? `Предварительное значение: ${parameter.label}`,
      replacedByUserInput: false,
      visibleToUser: true,
    }));

  return {
    params,
    values: Object.fromEntries(
      Object.entries(params).map(([key, param]) => [key, param.value]),
    ) as ElectricalCanonicalParameterValues,
    missingInputs,
    assumptions,
  };
}

export function isElectricalCanonicalWorkKey(
  workKey: string | null | undefined,
): boolean {
  return workKey === ELECTRICAL_CANONICAL_WORK_KEY;
}
