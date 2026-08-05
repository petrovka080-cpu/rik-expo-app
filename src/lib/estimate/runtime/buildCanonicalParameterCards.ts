import type { AiEstimateParameterCard } from "../aiEstimateParameterCardContract";
import {
  aiEstimateRuUnitForParameter,
} from "../aiEstimateRuParameterDictionary";
import type { EstimateDraftRevision } from "../estimateDraftRevisionContract";
import type {
  CanonicalParameter,
  CanonicalParameterSession,
} from "../canonicalParameters/canonicalParameterCore";

function source(parameter: CanonicalParameter): AiEstimateParameterCard["source"] {
  if (parameter.source === "USER_EXPLICIT") return "manual_override";
  if (parameter.source === "TEXT_EXTRACTED") return "user_prompt";
  if (parameter.source === "CALCULATED" || parameter.source === "NORMATIVE_DERIVED") {
    return "formula_derived";
  }
  if (parameter.source === "ASSUMED" || parameter.source === "PROJECT_SPECIFIC") {
    return "catalog_default";
  }
  return "schema_missing";
}

function sourceLabel(parameter: CanonicalParameter): string {
  if (parameter.source === "USER_EXPLICIT") return "изменено пользователем";
  if (parameter.source === "TEXT_EXTRACTED") return "из текста";
  if (parameter.source === "CALCULATED") return "рассчитано";
  if (parameter.source === "NORMATIVE_DERIVED") return "по нормативному источнику";
  if (parameter.source === "PROJECT_SPECIFIC") return "из проекта";
  if (parameter.source === "ASSUMED") return "явное допущение";
  return "нужно уточнить";
}

function requiredFor(
  parameter: CanonicalParameter,
): AiEstimateParameterCard["requiredFor"] {
  if (parameter.requiredLevel === "CONDITIONAL") return "safety_review";
  if (
    parameter.requiredLevel === "BLOCKING_REQUIRED" ||
    parameter.requiredLevel === "CONTRACT_REQUIRED"
  ) {
    return "contract_ready";
  }
  return "better_accuracy";
}

function requiredLabel(parameter: CanonicalParameter): string {
  if (parameter.requiredLevel === "BLOCKING_REQUIRED") return "для начала расчёта";
  if (parameter.requiredLevel === "CONTRACT_REQUIRED") return "для договорной сметы";
  if (parameter.requiredLevel === "CONDITIONAL") return "для проверки безопасности и состава";
  return "для повышения точности";
}

function displayValue(parameter: CanonicalParameter): string {
  if (parameter.value == null) return "нужно уточнить";
  const choice = parameter.allowedValues.find((candidate) =>
    candidate.value === parameter.value
  );
  if (choice) return choice.label;
  if (typeof parameter.value === "boolean") return parameter.value ? "Да" : "Нет";
  const value = typeof parameter.value === "number"
    ? new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 }).format(parameter.value)
    : String(parameter.value);
  const unit = aiEstimateRuUnitForParameter(parameter.parameterId, parameter.unit);
  return unit ? `${value} ${unit}` : value;
}

export function buildCanonicalParameterCards(input: {
  session: CanonicalParameterSession | null;
  revision: EstimateDraftRevision | null;
}): AiEstimateParameterCard[] {
  if (!input.session) return [];
  const rowTitleById = new Map(
    (input.revision?.boq.rows ?? []).map((row) => [row.rowId, row.titleRu]),
  );
  return input.session.parameters.map((parameter) => {
    const affectedRowIds = (input.revision?.trace.params.find(
      (candidate) => candidate.key === parameter.parameterId,
    )?.affectsRowIds ?? [...parameter.affectsRows]);
    const choices = parameter.valueType === "boolean" &&
      parameter.allowedValues.length === 0
      ? [
          { value: "true", labelRu: "Да" },
          { value: "false", labelRu: "Нет" },
        ]
      : parameter.allowedValues.map((choice) => ({
          value: String(choice.value),
          labelRu: choice.label,
        }));
    return {
      key: parameter.parameterId,
      labelRu: parameter.label,
      value: parameter.value,
      displayValueRu: displayValue(parameter),
      unitRu: aiEstimateRuUnitForParameter(parameter.parameterId, parameter.unit),
      source: source(parameter),
      sourceLabelRu: sourceLabel(parameter),
      inputKind: parameter.valueType === "number"
        ? "number"
        : parameter.valueType === "boolean"
          ? "boolean"
          : parameter.allowedValues.length > 0
            ? "select"
            : "text",
      editable: true,
      clickAction: "open_parameter_editor",
      noStepperControls: true,
      missing: parameter.value == null,
      requiredFor: requiredFor(parameter),
      requiredForLabelRu: requiredLabel(parameter),
      affectsRowIds: affectedRowIds,
      affectsRowTitlesRu: affectedRowIds
        .map((rowId) => rowTitleById.get(rowId))
        .filter((title): title is string => Boolean(title)),
      formulaRefs: [...parameter.affectsFormula],
      whyItMattersRu: parameter.description,
      changesInEstimateRu: affectedRowIds.length > 0
        ? `Пересчитывает связанные позиции: ${affectedRowIds.length}.`
        : "Уточняет состав и уровень доверия расчёта.",
      missingValueConsequenceRu: parameter.requiredLevel === "BLOCKING_REQUIRED"
        ? "Без этого параметра профессиональный итог не рассчитывается."
        : "Предварительная смета остаётся доступной с явно показанным ограничением.",
      provenanceRu: parameter.assumption ?? parameter.sourceText ?? sourceLabel(parameter),
      clarificationTier: parameter.requiredLevel === "BLOCKING_REQUIRED"
        ? "critical"
        : parameter.requiredLevel === "CONTRACT_REQUIRED" ||
            parameter.requiredLevel === "CONDITIONAL"
          ? "recommended"
          : "optional",
      choices,
    };
  });
}
