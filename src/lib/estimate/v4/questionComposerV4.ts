import { getEngineeringUnitV4 } from "./engineeringUnitRegistryV4";
import type {
  ParameterInputKindV4,
  UserFactV4,
  WorkSpecificParameterSchemaV4,
  WorkSpecificParameterV4,
} from "./professionalEstimateV4Contract";

export type ComposedQuestionV4 = {
  question_id: string;
  parameter_id: string;
  group: "critical" | "recommended" | "optional";
  required_tier: "critical" | "recommended" | "optional";
  title_ru: string;
  why_it_matters_ru: string;
  how_to_answer_ru: string;
  input_kind: ParameterInputKindV4;
  control: "numeric_input" | "single_select" | "multi_select" | "boolean_select" | "text_input" | "location_input" | "file_upload" | "selection" | "repeatable_group";
  canonical_unit_id: string | null;
  display_units: { unit_id: string; symbol: string; label_ru: string }[];
  choices: { value: string; label_ru: string }[];
  range: { minimum: number | null; maximum: number | null } | null;
  step: number | null;
  precision: number | null;
  example_ru: string;
  changes_in_estimate_ru: string;
  current_value_source_ru: string;
  provenance: UserFactV4["provenance"] | "not_provided";
  missing_value_consequence_ru: string;
  prefilled_value: unknown;
  structured_group: WorkSpecificParameterV4["structured_group"];
  answered_structured_field_keys: string[];
};

export type QuestionCompositionV4 = {
  work_id: string;
  understood_fact_parameter_ids: string[];
  questions: ComposedQuestionV4[];
  deferred_parameter_ids: string[];
  critical_blockers_remaining: number;
};

const PROVENANCE_LABELS: Record<UserFactV4["provenance"], string> = {
  user_confirmed: "Подтверждено пользователем",
  project_document: "Извлечено из проекта или спецификации",
  form_input: "Указано в форме",
  work_specific_default: "Принято из work-specific default",
  family_default: "Принято из family default",
  ai_inference: "Предположено системой и требует подтверждения",
  unknown: "Источник значения неизвестен",
};

function howToAnswer(parameter: WorkSpecificParameterV4): string {
  if (parameter.input_kind === "quantity") return "Введите число и выберите совместимую единицу.";
  if (parameter.input_kind === "enum") return "Выберите один вариант из списка.";
  if (parameter.input_kind === "multiselect") return "Выберите все применимые варианты.";
  if (parameter.input_kind === "boolean") return "Выберите «Да», «Нет» или «Неизвестно».";
  if (parameter.input_kind === "document") return "Загрузите проект, спецификацию, отчёт или чертёж.";
  if (parameter.input_kind === "location") return "Укажите город, адрес или площадку; при необходимости добавьте координаты.";
  if (parameter.input_kind === "material_selection" || parameter.input_kind === "equipment_selection") {
    return "Выберите нейтральную техническую спецификацию или указанную проектом модель.";
  }
  return "Введите известное значение или выберите «Не знаю», если это разрешено.";
}

function controlFor(parameter: WorkSpecificParameterV4): ComposedQuestionV4["control"] {
  if (parameter.input_kind === "quantity" || parameter.input_kind === "integer" || parameter.input_kind === "decimal") return "numeric_input";
  if (parameter.input_kind === "enum") return "single_select";
  if (parameter.input_kind === "multiselect") return "multi_select";
  if (parameter.input_kind === "boolean") return "boolean_select";
  if (parameter.input_kind === "document") return "file_upload";
  if (parameter.input_kind === "location") return "location_input";
  if (parameter.input_kind === "equipment_selection" || parameter.input_kind === "material_selection") return "selection";
  if (parameter.input_kind === "repeatable_group") return "repeatable_group";
  return "text_input";
}

function hasFactValue(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function answeredStructuredFieldKeys(parameter: WorkSpecificParameterV4, value: unknown): string[] {
  if (!parameter.structured_group || !Array.isArray(value)) return [];
  const keys = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    for (const field of parameter.structured_group.fields) {
      if (hasFactValue((item as Record<string, unknown>)[field.canonical_key])) keys.add(field.canonical_key);
    }
  }
  return [...keys].sort();
}

function isAnswered(parameter: WorkSpecificParameterV4, factsByParameter: ReadonlyMap<string, UserFactV4>): boolean {
  const fact = factsByParameter.get(parameter.parameter_id);
  if (!fact || fact.provenance === "unknown" || !hasFactValue(fact.value)) return false;
  if (!parameter.structured_group) return true;
  if (!Array.isArray(fact.value) || fact.value.length < parameter.structured_group.minimum_items) return false;
  return fact.value.every((item) => item && typeof item === "object" && !Array.isArray(item) &&
    parameter.structured_group!.fields.filter((field) => field.required).every((field) =>
      hasFactValue((item as Record<string, unknown>)[field.canonical_key]),
    ));
}

function selectedAlternativeIds(
  schema: WorkSpecificParameterSchemaV4,
  factsByParameter: ReadonlyMap<string, UserFactV4>,
): Set<string> {
  const suppressed = new Set<string>();
  for (const group of schema.mutually_exclusive_input_groups) {
    const answered = group.parameter_ids.find((id) => {
      const parameter = schema.parameters.find((item) => item.parameter_id === id);
      return parameter ? isAnswered(parameter, factsByParameter) : false;
    });
    if (!answered) continue;
    group.parameter_ids.filter((id) => id !== answered).forEach((id) => suppressed.add(id));
  }
  return suppressed;
}

function questionFor(
  parameter: WorkSpecificParameterV4,
  fact: UserFactV4 | undefined,
): ComposedQuestionV4 {
  const canonicalUnit = getEngineeringUnitV4(parameter.canonical_unit_id);
  return {
    question_id: `${parameter.parameter_id}:question:v4`,
    parameter_id: parameter.parameter_id,
    group: parameter.necessity === "critical" ? "critical" : parameter.necessity === "recommended" ? "recommended" : "optional",
    required_tier: parameter.necessity === "critical" ? "critical" : parameter.necessity === "recommended" ? "recommended" : "optional",
    title_ru: parameter.professional_name_ru,
    why_it_matters_ru: parameter.user_help_ru,
    how_to_answer_ru: howToAnswer(parameter),
    input_kind: parameter.input_kind,
    control: controlFor(parameter),
    canonical_unit_id: parameter.canonical_unit_id,
    display_units: parameter.display_unit_ids.flatMap((unitId) => {
      const unit = getEngineeringUnitV4(unitId);
      return unit && canonicalUnit && unit.dimension === canonicalUnit.dimension
        ? [{ unit_id: unit.unit_id, symbol: unit.symbol, label_ru: unit.localized_name_ru }]
        : [];
    }),
    choices: parameter.input_kind === "boolean"
      ? [{ value: "yes", label_ru: "Да" }, { value: "no", label_ru: "Нет" }, { value: "unknown", label_ru: "Неизвестно" }]
      : parameter.choices,
    range: parameter.range,
    step: parameter.step,
    precision: parameter.precision,
    example_ru: parameter.example_ru,
    changes_in_estimate_ru: parameter.affected_row_ids.length > 0
      ? "Уточняет состав и количества связанных позиций сметы."
      : "Влияет на применимость, состав или точность сметы.",
    current_value_source_ru: fact ? PROVENANCE_LABELS[fact.provenance] : "Значение пока не указано",
    provenance: fact?.provenance ?? "not_provided",
    missing_value_consequence_ru: parameter.missing_value_consequence_ru,
    prefilled_value: fact?.value ?? null,
    structured_group: parameter.structured_group ?? null,
    answered_structured_field_keys: answeredStructuredFieldKeys(parameter, fact?.value),
  };
}

export function composeWorkSpecificQuestionsV4(input: {
  schema: WorkSpecificParameterSchemaV4;
  facts?: readonly UserFactV4[];
  maximum_questions?: number;
  parameter_applicability?: Readonly<Record<string, boolean>>;
}): QuestionCompositionV4 {
  const factsByParameter = new Map((input.facts ?? []).filter((fact) => fact.parameter_id).map((fact) => [fact.parameter_id as string, fact]));
  const answeredIds = new Set(input.schema.parameters.filter((parameter) => isAnswered(parameter, factsByParameter)).map((parameter) => parameter.parameter_id));
  const suppressedAlternatives = selectedAlternativeIds(input.schema, factsByParameter);
  const candidates = input.schema.parameters
    .filter((parameter) => !parameter.internal_only)
    .filter((parameter) => parameter.necessity !== "derived")
    .filter((parameter) => input.parameter_applicability?.[parameter.parameter_id] !== false)
    .filter((parameter) => !answeredIds.has(parameter.parameter_id))
    .filter((parameter) => !suppressedAlternatives.has(parameter.parameter_id))
    .sort((left, right) => {
      const rank = { critical: 0, recommended: 1, optional: 2, derived: 3 } as const;
      return rank[left.necessity] - rank[right.necessity] || left.professional_name_ru.localeCompare(right.professional_name_ru, "ru");
    });
  const requestedMaximum = input.maximum_questions ?? input.schema.question_budget.initial_maximum;
  const maximum = Math.max(1, Math.min(requestedMaximum, input.schema.question_budget.hard_maximum));
  const selected = candidates.slice(0, maximum);
  return {
    work_id: input.schema.owner_work_id,
    understood_fact_parameter_ids: [...answeredIds].sort(),
    questions: selected.map((parameter) => questionFor(parameter, factsByParameter.get(parameter.parameter_id))),
    deferred_parameter_ids: candidates.slice(maximum).map((parameter) => parameter.parameter_id),
    critical_blockers_remaining: candidates.filter((parameter) => parameter.necessity === "critical").length,
  };
}
