import type { AiEstimateParameterCard } from "../estimate/aiEstimateParameterCardContract";
import {
  aiEstimateRuLabelForParameter,
  aiEstimateRuSourceLabel,
  aiEstimateRuUnitForParameter,
  containsForbiddenAiEstimateVisibleToken,
  hasHumanReadableAiEstimateParameterPassport,
  isAiEstimateTechnicalHiddenParam,
} from "../estimate/aiEstimateRuParameterDictionary";
import type { EstimateDraftRevision } from "../estimate/estimateDraftRevisionContract";
import type {
  CanonicalParameter,
  CanonicalParameterSession,
} from "../estimate/canonicalParameters/canonicalParameterCore";
import { getAsphaltParameterV4 } from "../estimate/v4/asphalt/asphaltWorkSpecificParameterSchemaV4";
import type { WorkSpecificParameterV4 } from "../estimate/v4/professionalEstimateV4Contract";

const COMPOSITE_DERIVED_COUNT: Readonly<Record<string, string>> = Object.freeze({
  crushed_layers: "crushed_layer_count",
  asphalt_layers: "asphalt_layer_count",
});

function revisionCardSource(
  source: EstimateDraftRevision["params"][string]["source"] | null,
): AiEstimateParameterCard["source"] {
  if (source === "user_input") return "user_prompt";
  if (source === "edited_by_user") return "manual_override";
  if (source === "default_assumption") return "catalog_default";
  if (source === "derived") return "formula_derived";
  return "schema_missing";
}

function revisionRequiredLabel(requiredFor: AiEstimateParameterCard["requiredFor"]): string {
  if (requiredFor === "contract_ready") return "для рабочей сметы";
  if (requiredFor === "safety_review") return "для проверки безопасности";
  return "для точного расчёта";
}

function revisionDisplayValue(
  key: string,
  value: EstimateDraftRevision["params"][string]["value"] | null,
  unitRu: string,
): string {
  if (value == null || value === "") return "нужно уточнить";
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  const text = typeof value === "number"
    ? new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 }).format(value)
    : String(value);
  if (containsForbiddenAiEstimateVisibleToken(text) || /^[a-z0-9]+(?:_[a-z0-9]+)+$/iu.test(text)) {
    return "уточняется";
  }
  return unitRu ? `${text} ${unitRu}` : text;
}

/**
 * Presentation-only adapter for persisted legacy revisions.
 *
 * The active R5.8 path renders the canonical backend session above. Historical
 * local revisions still need a readable, non-mutating fallback, but importing
 * the former schema/passport builder here also pulled its frontend compiler
 * into every production bundle. Everything used below is already persisted in
 * the immutable revision; no formula, resource branch or template is evaluated.
 */
export function buildRevisionParameterCards(
  revision: EstimateDraftRevision | null,
): AiEstimateParameterCard[] {
  if (!revision) return [];
  const missingByKey = new Map(revision.missingInputs.map((item) => [item.key, item]));
  const rowTitleById = new Map(revision.boq.rows.map((row) => [row.rowId, row.titleRu]));
  const keys = new Set([...Object.keys(revision.params), ...missingByKey.keys()]);
  return [...keys].flatMap((key) => {
    const parameter = revision.params[key] ?? null;
    const missing = missingByKey.get(key) ?? null;
    const fallbackLabel = missing?.label ?? null;
    if (isAiEstimateTechnicalHiddenParam(key) || !hasHumanReadableAiEstimateParameterPassport(key, fallbackLabel)) {
      return [];
    }
    const labelRu = aiEstimateRuLabelForParameter(key, fallbackLabel);
    if (!labelRu || containsForbiddenAiEstimateVisibleToken(labelRu) || /[a-z]+_[a-z0-9_]+/iu.test(labelRu)) {
      return [];
    }
    const affectedRowIds = revision.trace.params.find((item) => item.key === key)?.affectsRowIds ?? [];
    const formulaRefs = affectedRowIds.flatMap((rowId) => {
      const formulaId = revision.trace.rows.find((row) => row.rowId === rowId)?.formulaId;
      return formulaId ? [formulaId] : [];
    });
    const unitRu = aiEstimateRuUnitForParameter(key, parameter?.canonicalUnit ?? null);
    const source = revisionCardSource(parameter?.source ?? null);
    const requiredFor = missing?.requiredFor ?? "better_accuracy";
    return [{
      key,
      labelRu,
      value: parameter?.value ?? null,
      displayValueRu: revisionDisplayValue(key, parameter?.value ?? null, unitRu),
      unitRu,
      source,
      sourceLabelRu: aiEstimateRuSourceLabel(source),
      inputKind: typeof parameter?.value === "boolean"
        ? "boolean"
        : typeof parameter?.value === "number" || Boolean(parameter?.canonicalUnit)
          ? "number"
          : "text",
      editable: true,
      clickAction: "open_parameter_editor",
      noStepperControls: true,
      missing: parameter == null,
      requiredFor,
      requiredForLabelRu: revisionRequiredLabel(requiredFor),
      affectsRowIds: affectedRowIds,
      affectsRowTitlesRu: affectedRowIds
        .map((rowId) => rowTitleById.get(rowId))
        .filter((title): title is string => Boolean(title)),
      formulaRefs: [...new Set(formulaRefs)],
      clarificationTier: requiredFor === "contract_ready"
        ? "critical"
        : requiredFor === "safety_review" ? "recommended" : "optional",
      provenanceRu: parameter?.sourceText,
      guideShortRu: parameter?.canonicalUnit
        ? `По проекту или обмеру: введите подтверждённое значение, ${unitRu}`
        : "По проекту: укажите подтверждённое значение.",
      guideKind: parameter?.canonicalUnit ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
    } satisfies AiEstimateParameterCard];
  }).sort((a, b) => a.labelRu.localeCompare(b.labelRu, "ru"));
}

function guideForParameter(parameter: CanonicalParameter, asphalt: WorkSpecificParameterV4 | null): {
  guideShortRu: string;
  guideKind: NonNullable<AiEstimateParameterCard["guideKind"]>;
  guideDetailsRu: string[];
} {
  const unit = aiEstimateRuUnitForParameter(parameter.parameterId, parameter.unit);
  const source = parameter.normativeSource;
  const applicability = asphalt?.applicability_condition ?? "always";
  const affected = [...parameter.affectsFormula, ...parameter.affectsRows].join(", ") || "только паспорт параметров";
  let guideShortRu: string;
  let guideKind: NonNullable<AiEstimateParameterCard["guideKind"]>;
  if (asphalt?.structured_group) {
    guideShortRu = `Добавьте каждый ${asphalt.structured_group.item_label_ru.toLocaleLowerCase("ru-RU")} отдельно; количество рассчитывается автоматически`;
    guideKind = "DERIVED_VALUE_RULE";
  } else if (parameter.allowedValues.length > 0 || parameter.valueType === "boolean") {
    guideShortRu = `Правило выбора: ${parameter.description}`;
    guideKind = "ENUM_DECISION_RULE";
  } else if (source && parameter.validation.min != null && parameter.validation.max != null) {
    guideShortRu = `Нормативный диапазон: ${parameter.validation.min}–${parameter.validation.max}${unit ? ` ${unit}` : ""}`;
    guideKind = "NORMATIVE_RANGE";
  } else if (parameter.parameterId.includes("compaction_factor")) {
    guideShortRu = `По проекту/КРЕР: введите подтверждённый коэффициент${unit ? `, ${unit}` : ""}`;
    guideKind = "PROJECT_DEFINED";
  } else if (parameter.parameterId.includes("waste_percent")) {
    guideShortRu = `По проекту/методике: введите подтверждённый технологический запас${unit ? `, ${unit}` : ""}`;
    guideKind = "PROJECT_DEFINED";
  } else if (parameter.valueType === "number") {
    guideShortRu = `По проекту или обмеру: фиксированная числовая норма не установлена${unit ? `, ${unit}` : ""}`;
    guideKind = "MEASUREMENT_RULE";
  } else {
    guideShortRu = "По проекту: фиксированная числовая норма не установлена";
    guideKind = "NO_NUMERIC_NORM";
  }
  return {
    guideShortRu,
    guideKind,
    guideDetailsRu: [
      `Почему нужен параметр: ${parameter.description}`,
      source
        ? `Нормативный документ: ${source.document}; редакция ${source.revision}; точный locator ${source.locator}.`
        : "Источник значения: проект, обмер, изготовитель или инженерное решение; универсальный числовой норматив не заявлен.",
      source ? `Source snapshot: ${source.sourceHash}; проверено ${source.checkedAt}.` : "Число не подставляется автоматически и требует provenance пользователя.",
      `Применимость: ${applicability}.`,
      `Изменяемые формулы/строки: ${affected}.`,
    ],
  };
}

function structuredGroupForParameter(asphalt: WorkSpecificParameterV4 | null): AiEstimateParameterCard["structuredGroup"] {
  const group = asphalt?.structured_group;
  if (!group) return undefined;
  return {
    itemLabelRu: group.item_label_ru,
    minimumItems: group.minimum_items,
    maximumItems: group.maximum_items,
    fields: group.fields.map((field) => ({
      key: field.canonical_key,
      labelRu: field.professional_name_ru,
      inputKind: field.data_type === "number" ? "number" : field.choices.length > 0 ? "select" : "text",
      unitRu: aiEstimateRuUnitForParameter(field.canonical_key, field.canonical_unit_id),
      required: field.required,
      choices: field.choices.map((choice) => ({ value: choice.value, labelRu: choice.label_ru })),
      guideShortRu: field.data_type === "number"
        ? `По проекту/паспорту: введите подтверждённое значение${field.canonical_unit_id ? `, ${aiEstimateRuUnitForParameter(field.canonical_key, field.canonical_unit_id)}` : ""}`
        : `Правило выбора: ${field.user_help_ru}`,
    })),
  };
}

function cardSource(parameter: CanonicalParameter): AiEstimateParameterCard["source"] {
  if (parameter.source === "USER_EXPLICIT") return "manual_override";
  if (parameter.source === "TEXT_EXTRACTED") return "user_prompt";
  if (parameter.source === "CALCULATED" || parameter.source === "NORMATIVE_DERIVED") return "formula_derived";
  if (parameter.source === "ASSUMED" || parameter.source === "PROJECT_SPECIFIC") return "catalog_default";
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

function requiredFor(parameter: CanonicalParameter): AiEstimateParameterCard["requiredFor"] {
  if (parameter.requiredLevel === "CONDITIONAL") return "safety_review";
  if (parameter.requiredLevel === "BLOCKING_REQUIRED" || parameter.requiredLevel === "CONTRACT_REQUIRED") {
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
  const choice = parameter.allowedValues.find((candidate) => candidate.value === parameter.value);
  if (choice) return choice.label;
  if (typeof parameter.value === "boolean") return parameter.value ? "Да" : "Нет";
  const value = typeof parameter.value === "number"
    ? new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 }).format(parameter.value)
    : String(parameter.value);
  const unit = aiEstimateRuUnitForParameter(parameter.parameterId, parameter.unit);
  return unit ? `${value} ${unit}` : value;
}

/** Pure presenter for server/session parameters; it never evaluates formulas or resource branches. */
export function buildCanonicalParameterCards(input: {
  session: CanonicalParameterSession | null;
  revision: EstimateDraftRevision | null;
}): AiEstimateParameterCard[] {
  if (!input.session) return [];
  const rowTitleById = new Map((input.revision?.boq.rows ?? []).map((row) => [row.rowId, row.titleRu]));
  const visibleParameters = input.session.parameters.filter((parameter) => getAsphaltParameterV4(parameter.parameterId)?.internal_only !== true);
  const derivedCountKeys = new Set(visibleParameters
    .map((parameter) => COMPOSITE_DERIVED_COUNT[parameter.parameterId])
    .filter((key): key is string => Boolean(key)));
  return visibleParameters.filter((parameter) => !derivedCountKeys.has(parameter.parameterId)).map((parameter) => {
    const asphalt = getAsphaltParameterV4(parameter.parameterId);
    const guide = guideForParameter(parameter, asphalt);
    const affectedRowIds = input.revision?.trace.params.find(
      (candidate) => candidate.key === parameter.parameterId,
    )?.affectsRowIds ?? [...parameter.affectsRows];
    const choices = parameter.valueType === "boolean" && parameter.allowedValues.length === 0
      ? [{ value: "true", labelRu: "Да" }, { value: "false", labelRu: "Нет" }]
      : parameter.allowedValues.map((choice) => ({ value: String(choice.value), labelRu: choice.label }));
    return {
      key: parameter.parameterId,
      labelRu: parameter.label,
      value: parameter.value,
      displayValueRu: displayValue(parameter),
      unitRu: aiEstimateRuUnitForParameter(parameter.parameterId, parameter.unit),
      source: cardSource(parameter),
      sourceLabelRu: sourceLabel(parameter),
      inputKind: parameter.valueType === "number"
        ? "number"
        : parameter.valueType === "boolean"
          ? "boolean"
          : parameter.allowedValues.length > 0 ? "select" : "text",
      editable: true,
      clickAction: "open_parameter_editor",
      noStepperControls: true,
      missing: parameter.value == null && parameter.state !== "NOT_APPLICABLE",
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
        : parameter.requiredLevel === "CONTRACT_REQUIRED" || parameter.requiredLevel === "CONDITIONAL"
          ? "recommended"
          : "optional",
      choices,
      ...guide,
      structuredGroup: structuredGroupForParameter(asphalt),
      derivedCountParameterKey: COMPOSITE_DERIVED_COUNT[parameter.parameterId],
    };
  });
}
