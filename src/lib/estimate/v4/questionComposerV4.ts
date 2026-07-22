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
  title_ru: string;
  why_it_matters_ru: string;
  how_to_answer_ru: string;
  input_kind: ParameterInputKindV4;
  canonical_unit_id: string | null;
  display_units: { unit_id: string; symbol: string; label_ru: string }[];
  choices: { value: string; label_ru: string }[];
  example_ru: string;
  changes_in_estimate_ru: string;
  current_value_source_ru: string;
  missing_value_consequence_ru: string;
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
function isAnswered(parameter: WorkSpecificParameterV4, factsByParameter: ReadonlyMap<string, UserFactV4>): boolean {
  const fact = factsByParameter.get(parameter.parameter_id);
  return Boolean(fact && fact.value !== null && fact.value !== "" && fact.provenance !== "unknown");
}

function selectedAlternativeIds(
  schema: WorkSpecificParameterSchemaV4,
  factsByParameter: ReadonlyMap<string, UserFactV4>,
): Set<string> {
  const suppressed = new Set<string>();
  for (const group of schema.mutually_exclusive_input_groups) {
    const answered = group.parameter_ids.find((id) => factsByParameter.has(id));
    if (!answered) continue;
    group.parameter_ids.filter((id) => id !== answered).forEach((id) => suppressed.add(id));
  }
  return suppressed;
}

function questionFor(
  parameter: WorkSpecificParameterV4,
  fact: UserFactV4 | undefined,
): ComposedQuestionV4 {
  return {
    question_id: `${parameter.parameter_id}:question:v4`,
    parameter_id: parameter.parameter_id,
    group: parameter.necessity === "critical" ? "critical" : parameter.necessity === "recommended" ? "recommended" : "optional",
    title_ru: parameter.professional_name_ru,
    why_it_matters_ru: parameter.user_help_ru,
    how_to_answer_ru: howToAnswer(parameter),
    input_kind: parameter.input_kind,
    canonical_unit_id: parameter.canonical_unit_id,
    display_units: parameter.display_unit_ids.flatMap((unitId) => {
      const unit = getEngineeringUnitV4(unitId);
      return unit ? [{ unit_id: unit.unit_id, symbol: unit.symbol, label_ru: unit.localized_name_ru }] : [];
    }),
    choices: parameter.input_kind === "boolean"
      ? [{ value: "yes", label_ru: "Да" }, { value: "no", label_ru: "Нет" }, { value: "unknown", label_ru: "Неизвестно" }]
      : parameter.choices,
    example_ru: parameter.example_ru,
    changes_in_estimate_ru: parameter.affected_row_ids.length > 0
      ? `Пересчитывает строки сметы: ${parameter.affected_row_ids.slice(0, 3).join(", ")}${parameter.affected_row_ids.length > 3 ? "…" : ""}.`
      : "Влияет на применимость, состав или точность сметы.",
    current_value_source_ru: fact ? PROVENANCE_LABELS[fact.provenance] : "Значение пока не указано",
    missing_value_consequence_ru: parameter.missing_value_consequence_ru,
  };
}

export function composeWorkSpecificQuestionsV4(input: {
  schema: WorkSpecificParameterSchemaV4;
  facts?: readonly UserFactV4[];
  maximum_questions?: number;
}): QuestionCompositionV4 {
  const factsByParameter = new Map((input.facts ?? []).filter((fact) => fact.parameter_id).map((fact) => [fact.parameter_id as string, fact]));
  const answeredIds = new Set(input.schema.parameters.filter((parameter) => isAnswered(parameter, factsByParameter)).map((parameter) => parameter.parameter_id));
  const suppressedAlternatives = selectedAlternativeIds(input.schema, factsByParameter);
  const candidates = input.schema.parameters
    .filter((parameter) => !parameter.internal_only)
    .filter((parameter) => parameter.necessity !== "derived")
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
