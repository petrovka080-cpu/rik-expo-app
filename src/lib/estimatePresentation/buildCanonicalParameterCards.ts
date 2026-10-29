import type { AiEstimateParameterCard } from "../estimate/aiEstimateParameterCardContract";
import { canonicalPublicEstimateChoiceLabelRu, canonicalPublicEstimateFixtureTextRu, canonicalPublicEstimateParameterGuideRu, canonicalPublicEstimateParameterTitleRu } from '../estimate/backendPlatform/canonicalPublicEstimateLanguageRu';
import type { CanonicalPublicInputContext } from '../estimate/backendPlatform/canonicalPublicEstimateInputWordingRu';
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
import { canonicalParameterAffectsEstimateCalculation } from "../estimate/canonicalParameters/canonicalParameterCalculationRelevance";
import { resolveCanonicalParameterVisibility } from "../estimate/canonicalParameters/canonicalParameterCore";
import { canonicalParameterSessionConditionValuesV1 } from '../estimate/canonicalParameters/canonicalParameterSessionConditionValuesV1';
import { getAsphaltParameterV4 } from "../estimate/v4/asphalt/asphaltWorkSpecificParameterSchemaV4";
import type { WorkSpecificParameterV4 } from "../estimate/v4/professionalEstimateV4Contract";

const COMPOSITE_DERIVED_COUNT: Readonly<Record<string, string>> = Object.freeze({
  crushed_layers: "crushed_layer_count",
  asphalt_layers: "asphalt_layer_count",
});

function publicParameterText(value: string | null | undefined): string {
  return canonicalPublicEstimateFixtureTextRu(String(value ?? ""))
    .replace(/\s*Проверочный\s+объект\s+BATCH[-\s]*\d+\s*\.?/giu, "")
    .replace(/\b(?:backend|release|revision|child|server(?:-side)?)\b/gi, "")
    .replace(/\bBATCH[-\s]*\d+\b\.?/gi, "")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, "")
    .replace(/\b[0-9a-f]{64}\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function humanSourceText(value: string | null | undefined): string | null {
  const raw = String(value ?? '').trim();
  if (!raw || /canonical-work:|(?:^|[\\/])(?:src|data|scripts)[\\/]|\.json(?:$|:)|^[a-z0-9]+(?:[_:.-][a-z0-9]+)+$/iu.test(raw)
    || /^[0-9a-f-]{32,}$/iu.test(raw) || (!/\s/u.test(raw) && !/[А-Яа-яЁё]/u.test(raw))) return null;
  return publicParameterText(raw) || null;
}

function parameterSourceSummary(parameter: CanonicalParameter): string {
  const evidence = parameter.sourceProvenance;
  const document = humanSourceText(evidence?.document) ?? humanSourceText(parameter.normativeSource?.document);
  const locator = humanSourceText(evidence?.locator) ?? humanSourceText(parameter.normativeSource?.locator);
  const application = parameter.inputOwnership === 'APPLICATION';
  const unresolved = application && (parameter.value == null || /UNRESOLVED/u.test(evidence?.sourceRole ?? ''));
  const preliminary = evidence?.runtimeClassification === 'ASSUMPTION' || parameter.source === 'ASSUMED';
  const norm = application && (evidence?.runtimeClassification === 'NORMATIVE' || evidence?.guideKind === 'MANDATORY_NORM_VALUE');
  const label = unresolved ? 'Норма или техническое значение ещё не определены приложением'
    : preliminary ? 'Предварительный профиль — требует проверки по проекту'
    : norm ? 'Норма приложения — только для чтения'
    : application ? 'Техническое значение приложения — только для чтения' : 'Данные объекта';
  const value = parameter.value;
  const unit = evidence?.unitLabel?.trim() || aiEstimateRuUnitForParameter(parameter.parameterId, parameter.unit);
  const quantity = value == null ? '' : `: ${typeof value === 'number' ? displayNumber(value) : publicParameterText(String(value))}${unit ? ' ' + unit : ''}`;
  const minimum = evidence?.minimum, maximum = evidence?.maximum;
  const range = minimum != null || maximum != null
    ? ` Допустимый диапазон по документу: ${minimum ?? 'не указан'}–${maximum ?? 'не указан'}${unit ? ' ' + unit : ''}.` : '';
  const target = evidence?.target == null ? ''
    : ` Справочное значение по документу: ${typeof evidence.target === 'number' ? displayNumber(evidence.target) : publicParameterText(evidence.target)}${unit ? ' ' + unit : ''}.`;
  const source = document ? ` Источник: ${document}${locator ? '; ' + locator : '; точный пункт не указан'}.`
    : locator ? ` Документ-источник не указан. Указанный пункт: ${locator}.`
    : application ? ' Документ-источник и точный пункт для этого значения пока не указаны.'
      : 'Документ-источник для этого поля не указан; значение подтверждают обмером или документом объекта.';
  return `${label}${quantity}.${range}${target} ${source}`.replace(/\s+/gu, ' ').trim();
}

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

let parameterDisplayFormatter: Intl.NumberFormat | undefined;

function displayNumber(value: number): string {
  // Display only; actual values, input precision and canonical validation stay intact.
  parameterDisplayFormatter ??= new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 });
  return parameterDisplayFormatter.format(value);
}

function revisionDisplayValue(
  key: string,
  value: EstimateDraftRevision["params"][string]["value"] | null,
  unitRu: string,
): string {
  if (value == null || value === "") return "нужно уточнить";
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  const text = typeof value === "number"
    ? displayNumber(value)
    : canonicalPublicEstimateFixtureTextRu(String(value));
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
    const labelRu = publicParameterText(aiEstimateRuLabelForParameter(key, fallbackLabel));
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
    // A persisted calculated value is the baseline, not a locked field. An
    // explicit user edit is submitted to the canonical owner as an override;
    // dependent values and BOQ rows are still recalculated by that owner.
    const editable = true;
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
      editable,
      clickAction: editable ? "open_parameter_editor" : "read_only",
      noStepperControls: true,
      missing: parameter == null,
      requiredFor,
      requiredForLabelRu: revisionRequiredLabel(requiredFor),
      affectsRowIds: affectedRowIds,
      affectsRowTitlesRu: affectedRowIds
        .map((rowId) => rowTitleById.get(rowId))
        .filter((title): title is string => Boolean(title))
        .map(publicParameterText),
      formulaRefs: [...new Set(formulaRefs)],
      clarificationTier: requiredFor === "contract_ready"
        ? "critical"
        : requiredFor === "safety_review" ? "recommended" : "optional",
      provenanceRu: publicParameterText(parameter?.sourceText),
      guideShortRu: parameter?.canonicalUnit
        ? `По проекту или обмеру: введите подтверждённое значение, ${unitRu}`
        : "По проекту: укажите подтверждённое значение.",
      guideKind: parameter?.canonicalUnit ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
    } satisfies AiEstimateParameterCard];
  }).sort((a, b) => a.labelRu.localeCompare(b.labelRu, "ru"));
}

function guideForParameter(parameter: CanonicalParameter, asphalt: WorkSpecificParameterV4 | null, context: CanonicalPublicInputContext): {
  guideShortRu: string;
  guideKind: NonNullable<AiEstimateParameterCard["guideKind"]>;
  guideDetailsRu: string[];
} {
  const unit = aiEstimateRuUnitForParameter(parameter.parameterId, parameter.unit);
  const source = parameter.normativeSource;
  const applicability = asphalt?.applicability_condition ?? "always";
  let guideShortRu: string;
  let guideKind: NonNullable<AiEstimateParameterCard["guideKind"]>;
  const authoredGuide = canonicalPublicEstimateParameterGuideRu(parameter.parameterId, parameter.label, context);
  if (parameter.inputOwnership === 'APPLICATION') {
    guideShortRu = parameter.value == null
      ? 'Приложению не хватает нормы или технического значения из проверенного источника. Вводить его вручную не требуется.'
      : parameter.sourceProvenance?.runtimeClassification === 'ASSUMPTION' || parameter.source === 'ASSUMED'
        ? 'Предварительный профиль приложения; его применимость к объекту ещё требует проверки.'
        : 'Значение определяет приложение по указанному источнику; поле доступно только для чтения.';
    guideKind = parameter.value == null ? 'NO_NUMERIC_NORM' : 'REFERENCE_GUIDANCE';
  } else if (authoredGuide) {
    guideShortRu = authoredGuide;
    guideKind = parameter.allowedValues.length > 0 ? 'ENUM_DECISION_RULE'
      : parameter.valueType === 'number' ? 'MEASUREMENT_RULE' : 'PROJECT_DEFINED';
  } else if (asphalt?.structured_group) {
    guideShortRu = `Добавьте каждый ${asphalt.structured_group.item_label_ru.toLocaleLowerCase("ru-RU")} отдельно; количество рассчитывается автоматически`;
    guideKind = "DERIVED_VALUE_RULE";
  } else if (parameter.allowedValues.length > 0 || parameter.valueType === "boolean") {
    guideShortRu = `Правило выбора: ${publicParameterText(parameter.description)}`;
    guideKind = "ENUM_DECISION_RULE";
  } else if (source && parameter.validation.min != null && parameter.validation.max != null) {
    guideShortRu = `Допустимый диапазон ввода: ${parameter.validation.min}–${parameter.validation.max}${unit ? ` ${unit}` : ""}`;
    guideKind = "VALIDATION_RANGE";
  } else if (parameter.parameterId.includes("compaction_factor")) {
    guideShortRu = `По проекту/КРЕР: введите подтверждённый коэффициент${unit ? `, ${unit}` : ""}`;
    guideKind = "PROJECT_DEFINED";
  } else if (parameter.parameterId.includes("waste_percent")) {
    guideShortRu = `По проекту/методике: введите подтверждённый технологический запас${unit ? `, ${unit}` : ""}`;
    guideKind = "PROJECT_DEFINED";
  } else if (parameter.valueType === "number") {
    guideShortRu = `Укажите фактическое значение из обмера или принятого документа${unit ? `, ${unit}` : ""}. Пример формата не заменяет данные объекта.`;
    guideKind = "MEASUREMENT_RULE";
  } else {
    guideShortRu = "Укажите точное согласованное обозначение, условие или ссылку из принятого документа. Не подбирайте значение наугад.";
    guideKind = "PROJECT_DEFINED";
  }
  return {
    guideShortRu: publicParameterText(guideShortRu),
    guideKind,
    guideDetailsRu: [
      ...(authoredGuide ? [`Полное условие поля: ${publicParameterText(parameter.description)}`] : []),
      `Почему нужен параметр: ${publicParameterText(parameter.description)}`,
      parameterSourceSummary(parameter),
      source ? `Источник проверен ${source.checkedAt}.` : parameter.inputOwnership === 'APPLICATION'
        ? 'Источник и значение определяет приложение; пользователь не становится источником нормы.'
        : "Число не подставляется автоматически и требует подтверждённого источника пользователя.",
      `Применимость: ${publicParameterText(applicability)}.`,
      `Связанных позиций расчёта: ${parameter.affectsRows.length}.`,
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
  if (choice) return canonicalPublicEstimateChoiceLabelRu(choice.label,choice.value);
  if (typeof parameter.value === "boolean") return parameter.value ? "Да" : "Нет";
  const value = typeof parameter.value === "number"
    ? displayNumber(parameter.value)
    : canonicalPublicEstimateFixtureTextRu(String(parameter.value));
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
  const sessionValues = canonicalParameterSessionConditionValuesV1(input.session);
  const conditionState = (parameter: CanonicalParameter): boolean | null => {
    return resolveCanonicalParameterVisibility(parameter.visibilityCondition, sessionValues);
  };
  const tracedCalculationParameterIds = new Set(
    (input.revision?.trace.params ?? [])
      .filter((parameter) => parameter.affectsRowIds.length > 0)
      .map((parameter) => parameter.key),
  );
  const backendBlockingParameterIds = new Set(input.session.blockingMissingParameterIds);
  // The first calculation screen is global, not work-specific: it exposes
  // only values that a formula or a BOQ/resource branch actually consumes.
  // Documentary references with no calculation consumer remain durable on
  // old revisions but do not clutter or block this form.
  const displayParameters = input.session.parameters.filter(parameter =>
    parameter.inputOwnership !== 'APPLICATION' && parameter.consumerInputRole !== 'APPLICATION_TECHNICAL');
  const visibleParameters = displayParameters.filter((parameter) => {
    const state = conditionState(parameter);
    return parameter.parameterId !== "scope_profile"
    && (
      canonicalParameterAffectsEstimateCalculation(parameter)
      || tracedCalculationParameterIds.has(parameter.parameterId)
    )
    && (backendBlockingParameterIds.has(parameter.parameterId) ? state !== false : state === true
      || parameter.inputOwnership === 'APPLICATION' && parameter.value != null && state !== false);
  });
  const derivedCountKeys = new Set(visibleParameters
    .map((parameter) => COMPOSITE_DERIVED_COUNT[parameter.parameterId])
    .filter((key): key is string => Boolean(key)));
  return visibleParameters.filter((parameter) => !derivedCountKeys.has(parameter.parameterId)).map((parameter) => {
    const asphalt = getAsphaltParameterV4(parameter.parameterId);
    const context = {catalogId: input.session!.workPassportId, unitId: parameter.unit, descriptionRu: parameter.description};
    const guide = guideForParameter(parameter, asphalt, context);
    const affectedRowIds = input.revision?.trace.params.find(
      (candidate) => candidate.key === parameter.parameterId,
    )?.affectsRowIds ?? [...parameter.affectsRows];
    const choices = parameter.valueType === "boolean" && parameter.allowedValues.length === 0
      ? [{ value: "true", labelRu: "Да" }, { value: "false", labelRu: "Нет" }]
      : parameter.allowedValues.map((choice) => ({ value: String(choice.value), labelRu: canonicalPublicEstimateChoiceLabelRu(choice.label,choice.value) }));
    return {
      key: parameter.parameterId,
      inputOwnership: parameter.inputOwnership,
      sourceSummaryRu: parameterSourceSummary(parameter),
      consumerInputRole: parameter.consumerInputRole,
      labelRu: publicParameterText(canonicalPublicEstimateParameterTitleRu(parameter.parameterId, parameter.label, context)),
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
      // Ownership comes from the published schema, not the value's label or source link.
      editable: parameter.source !== "CALCULATED" && parameter.inputOwnership !== 'APPLICATION' && parameter.consumerInputRole !== 'APPLICATION_TECHNICAL',
      clickAction: parameter.source !== "CALCULATED" && parameter.inputOwnership !== 'APPLICATION' && parameter.consumerInputRole !== 'APPLICATION_TECHNICAL'
        ? "open_parameter_editor"
        : "read_only",
      noStepperControls: true,
      missing: parameter.value == null && (parameter.state !== "NOT_APPLICABLE"
        // An unanswered visible object/scope choice is not a filled field.
        // Optionality stays in requiredFor and never invents a default answer.
        || parameter.consumerInputRole === 'OBJECT_FACT' && parameter.resourceSelectionInput === true
          && parameter.allowedValues.length > 0),
      requiredFor: requiredFor(parameter),
      requiredForLabelRu: requiredLabel(parameter),
      affectsRowIds: affectedRowIds,
      affectsRowTitlesRu: affectedRowIds
        .map((rowId) => rowTitleById.get(rowId))
        .filter((title): title is string => Boolean(title))
        .map(publicParameterText),
      formulaRefs: [...parameter.affectsFormula],
      whyItMattersRu: publicParameterText(parameter.description),
      changesInEstimateRu: affectedRowIds.length > 0
        ? `Пересчитывает связанные позиции: ${affectedRowIds.length}.`
        : "Уточняет состав и уровень доверия расчёта.",
      missingValueConsequenceRu: parameter.requiredLevel === "BLOCKING_REQUIRED"
        ? "Без этого параметра профессиональный итог не рассчитывается."
        : "Предварительная смета остаётся доступной с явно показанным ограничением.",
      provenanceRu: publicParameterText(parameter.assumption ?? parameter.sourceText ?? sourceLabel(parameter)),
      clarificationTier: parameter.requiredLevel === "BLOCKING_REQUIRED"
        ? "critical"
        : parameter.requiredLevel === "CONTRACT_REQUIRED" || parameter.requiredLevel === "CONDITIONAL"
          ? "recommended"
          : "optional",
      choices,
      ...guide,
      guideDetailsRu: [...(guide.guideDetailsRu ?? []),
        ...(canonicalPublicEstimateParameterTitleRu(parameter.parameterId, parameter.label, context) !== parameter.label
          ? ['Полное описание: ' + publicParameterText(parameter.label)] : [])],
      structuredGroup: structuredGroupForParameter(asphalt),
      derivedCountParameterKey: COMPOSITE_DERIVED_COUNT[parameter.parameterId],
    };
  });
}
