import type {
  EstimateDraftRevision,
  EstimateDraftRevisionParam,
} from "./estimateDraftRevisionContract";
import {
  buildAiEstimateParameterSchema,
  type AiEstimateParameterInputKind,
  type AiEstimateParameterSchemaField,
} from "./aiEstimateParameterSchema";
import {
  aiEstimateCanonicalUnitForParameter,
  aiEstimateRuLabelForParameter,
  aiEstimateRuSourceLabel,
  aiEstimateRuUnitForParameter,
  containsForbiddenAiEstimateVisibleToken,
  hasHumanReadableAiEstimateParameterPassport,
  isAiEstimateTechnicalHiddenParam,
} from "./aiEstimateRuParameterDictionary";
import { buildNormativeParameterCompletenessModel } from "./buildNormativeParameterCompletenessModel";
import type { AiEstimateNormativeParameterRequirement } from "./aiEstimateNormativeWorkParameterPassport";
import {
  ASPHALT_V4_RUNTIME_TEMPLATE_ID,
  ASPHALT_WORK_ID_V4,
  ASPHALT_WORK_SPECIFIC_PARAMETER_SCHEMA_V4,
} from "./v4/asphalt";
import type { ParameterInputKindV4 } from "./v4/professionalEstimateV4Contract";
import type {
  AiEstimateParameterCard,
  AiEstimateParameterCardSource,
} from "./aiEstimateParameterCardContract";

export type {
  AiEstimateParameterCard,
  AiEstimateParameterCardSource,
} from "./aiEstimateParameterCardContract";

function asphaltV4ParameterKey(parameterId: string): string {
  return parameterId.match(/^asphalt_concrete_pavement:parameter:([a-z0-9_]+):v4$/i)?.[1] ?? parameterId;
}

function collectRuntimeParameterMetadata(revision: EstimateDraftRevision): {
  labels: Map<string, string>;
  units: Map<string, string>;
} {
  const labels = new Map<string, string>();
  const units = new Map<string, string>();
  for (const row of revision.boq.rows) {
    const source = row.sourceParameters ?? {};
    for (const [property, target] of [["asphaltV4ParameterLabelsRu", labels], ["asphaltV4ParameterUnits", units]] as const) {
      const value = source[property];
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      for (const [key, text] of Object.entries(value)) {
        if (typeof text === "string" && text.trim()) target.set(key, text.trim());
      }
    }
  }
  return { labels, units };
}

type AsphaltClarificationQuestion = NonNullable<EstimateDraftRevision["professionalClarification"]>["critical_required"][number];

function isAsphaltV4Revision(revision: EstimateDraftRevision): boolean {
  return revision.selectedTemplateId === ASPHALT_V4_RUNTIME_TEMPLATE_ID ||
    revision.matchedFamily === ASPHALT_WORK_ID_V4 ||
    revision.professionalWorkId === ASPHALT_WORK_ID_V4;
}

function asphaltStructuredPrefix(key: string): string {
  if (key === "asphalt_layers") return "asphalt_layer";
  if (key === "crushed_layers") return "crushed_layer";
  return key.replace(/s$/, "");
}

function controlFromV4InputKind(kind: ParameterInputKindV4): AsphaltClarificationQuestion["control"] {
  if (["quantity", "integer", "decimal"].includes(kind)) return "numeric_input";
  if (kind === "enum") return "single_select";
  if (kind === "multiselect") return "multi_select";
  if (kind === "boolean") return "boolean_select";
  if (kind === "document") return "file_upload";
  if (kind === "location") return "location_input";
  if (kind === "equipment_selection" || kind === "material_selection") return "selection";
  if (kind === "repeatable_group") return "repeatable_group";
  return "text_input";
}

function cardInputKindFromV4(kind: ParameterInputKindV4): AiEstimateParameterInputKind {
  if (["quantity", "integer", "decimal"].includes(kind)) return "number";
  if (kind === "boolean") return "boolean";
  if (["enum", "multiselect", "equipment_selection", "material_selection"].includes(kind)) return "select";
  return "text";
}

function clarificationQuestionsByKey(revision: EstimateDraftRevision): Map<string, AsphaltClarificationQuestion> {
  const clarification = revision.professionalClarification;
  if (!clarification) return new Map();
  const questions = [
    ...clarification.critical_required,
    ...clarification.recommended,
    ...clarification.optional_or_assumption,
  ];
  const result = new Map<string, AsphaltClarificationQuestion>();
  for (const question of questions) {
    const key = asphaltV4ParameterKey(question.parameter_id);
    result.set(key, question);
    if (!question.structured_group) continue;
    const prefix = asphaltStructuredPrefix(key);
    const indexedKeys = [
      ...Object.keys(revision.params),
      ...revision.missingInputs.map((item) => item.key),
    ].flatMap((candidate) => {
      const match = candidate.match(new RegExp(`^${prefix}_(\\d+)_`));
      return match?.[1] ? [Number(match[1])] : [];
    });
    const count = Math.max(
      question.structured_group.minimum_items,
      Array.isArray(question.prefilled_value) ? question.prefilled_value.length : 0,
      ...indexedKeys,
    );
    for (let index = 1; index <= count; index += 1) {
      const prefilled = Array.isArray(question.prefilled_value) && question.prefilled_value[index - 1] &&
        typeof question.prefilled_value[index - 1] === "object"
        ? question.prefilled_value[index - 1] as Record<string, unknown>
        : {};
      for (const field of question.structured_group.fields) {
        const flatKey = `${prefix}_${index}_${field.canonical_key}`;
        result.set(flatKey, {
          ...question,
          parameter_id: flatKey,
          title_ru: `${question.structured_group.item_label_ru} ${index} — ${field.professional_name_ru.toLocaleLowerCase("ru-RU")}`,
          why_it_matters_ru: field.user_help_ru,
          how_to_answer_ru: ["quantity", "integer", "decimal"].includes(field.input_kind)
            ? "Введите число в указанной единице."
            : field.choices.length > 0
              ? "Выберите один вариант из списка."
              : "Введите подтверждённое значение.",
          input_kind: field.input_kind,
          control: controlFromV4InputKind(field.input_kind),
          canonical_unit_id: field.canonical_unit_id,
          display_units: [],
          choices: field.choices,
          range: null,
          step: null,
          precision: null,
          example_ru: field.example_ru,
          current_value_source_ru: prefilled[field.canonical_key] == null
            ? "Значение пока не указано"
            : question.current_value_source_ru,
          missing_value_consequence_ru: field.missing_value_consequence_ru,
          prefilled_value: prefilled[field.canonical_key] ?? null,
          structured_group: null,
          answered_structured_field_keys: [],
        });
      }
    }
  }
  return result;
}

function cardInputKindFromClarification(question: AsphaltClarificationQuestion | undefined): AiEstimateParameterInputKind | null {
  if (!question) return null;
  return cardInputKindFromV4(question.input_kind);
}

function asphaltV4Fields(revision: EstimateDraftRevision): Map<string, AiEstimateParameterSchemaField> {
  const fields = new Map<string, AiEstimateParameterSchemaField>();
  ASPHALT_WORK_SPECIFIC_PARAMETER_SCHEMA_V4.parameters.forEach((parameter, parameterIndex) => {
    fields.set(parameter.canonical_key, {
      key: parameter.canonical_key,
      labelRu: parameter.professional_name_ru,
      unit: parameter.canonical_unit_id,
      unitRu: aiEstimateRuUnitForParameter(parameter.canonical_key, parameter.canonical_unit_id),
      required: parameter.necessity === "critical",
      requiredFor: parameter.necessity === "critical" ? "contract_ready" : "better_accuracy",
      inputKind: cardInputKindFromV4(parameter.input_kind),
      editable: true,
      source: "professional_suggestion",
      affectsRowIds: parameter.affected_row_ids,
      affectsRowTitlesRu: [],
      formulaRefs: parameter.formula_dependencies,
      aliasesRu: [],
      suggestWhenMissing: true,
      priority: parameterIndex,
    });
    if (!parameter.structured_group) return;
    const prefix = asphaltStructuredPrefix(parameter.canonical_key);
    const indexedKeys = [...Object.keys(revision.params), ...revision.missingInputs.map((item) => item.key)]
      .flatMap((candidate) => {
        const match = candidate.match(new RegExp(`^${prefix}_(\\d+)_`));
        return match?.[1] ? [Number(match[1])] : [];
      });
    const explicitCountValue = revision.params[`${prefix}_count`]?.value;
    const explicitCount = typeof explicitCountValue === "number"
      ? explicitCountValue
      : Number(explicitCountValue);
    const count = Math.min(
      parameter.structured_group.maximum_items,
      Math.max(
        parameter.structured_group.minimum_items,
        Number.isFinite(explicitCount) ? Math.round(explicitCount) : 0,
        ...indexedKeys,
      ),
    );
    for (let index = 1; index <= count; index += 1) {
      parameter.structured_group.fields.forEach((field, fieldIndex) => {
        const key = `${prefix}_${index}_${field.canonical_key}`;
        fields.set(key, {
          key,
          labelRu: `${parameter.structured_group!.item_label_ru} ${index} — ${field.professional_name_ru.toLocaleLowerCase("ru-RU")}`,
          unit: field.canonical_unit_id,
          unitRu: aiEstimateRuUnitForParameter(key, field.canonical_unit_id),
          required: field.required,
          requiredFor: parameter.necessity === "critical" ? "contract_ready" : "better_accuracy",
          inputKind: cardInputKindFromV4(field.input_kind),
          editable: true,
          source: "professional_suggestion",
          affectsRowIds: parameter.affected_row_ids,
          affectsRowTitlesRu: [],
          formulaRefs: parameter.formula_dependencies,
          aliasesRu: [],
          suggestWhenMissing: true,
          priority: parameterIndex * 10 + fieldIndex + index,
        });
      });
    }
  });
  return fields;
}

function asphaltV4CardMetadata(key: string) {
  const direct = ASPHALT_WORK_SPECIFIC_PARAMETER_SCHEMA_V4.parameters.find((parameter) => parameter.canonical_key === key);
  if (direct) {
    return {
      control: controlFromV4InputKind(direct.input_kind),
      choices: direct.input_kind === "boolean"
        ? [{ value: "yes", labelRu: "Да" }, { value: "no", labelRu: "Нет" }, { value: "unknown", labelRu: "Неизвестно" }]
        : direct.choices.map((item) => ({ value: item.value, labelRu: item.label_ru })),
      whyItMattersRu: direct.user_help_ru,
      exampleRu: direct.example_ru,
      missingValueConsequenceRu: direct.missing_value_consequence_ru,
    };
  }
  for (const parameter of ASPHALT_WORK_SPECIFIC_PARAMETER_SCHEMA_V4.parameters) {
    if (!parameter.structured_group) continue;
    const prefix = asphaltStructuredPrefix(parameter.canonical_key);
    const match = key.match(new RegExp(`^${prefix}_\\d+_([a-z0-9_]+)$`));
    const field = match?.[1]
      ? parameter.structured_group.fields.find((candidate) => candidate.canonical_key === match[1])
      : null;
    if (!field) continue;
    return {
      control: controlFromV4InputKind(field.input_kind),
      choices: field.input_kind === "boolean"
        ? [{ value: "yes", labelRu: "Да" }, { value: "no", labelRu: "Нет" }, { value: "unknown", labelRu: "Неизвестно" }]
        : field.choices.map((item) => ({ value: item.value, labelRu: item.label_ru })),
      whyItMattersRu: field.user_help_ru,
      exampleRu: field.example_ru,
      missingValueConsequenceRu: field.missing_value_consequence_ru,
    };
  }
  return null;
}

function cardSource(param: EstimateDraftRevisionParam | null): AiEstimateParameterCardSource {
  if (!param) return "schema_missing";
  if (param.source === "edited_by_user") return "manual_override";
  if (param.source === "default_assumption") return "catalog_default";
  if (param.source === "derived") return "formula_derived";
  return "user_prompt";
}

function traceRowsForParam(revision: EstimateDraftRevision, key: string): string[] {
  return revision.trace.params.find((param) => param.key === key)?.affectsRowIds ?? [];
}

function rowTitles(revision: EstimateDraftRevision, rowIds: readonly string[]): string[] {
  const byId = new Map(revision.boq.rows.map((row) => [row.rowId, row.titleRu]));
  return rowIds.map((rowId) => byId.get(rowId)).filter((value): value is string => Boolean(value));
}

function hasSpecificAreaParameterWithTrace(revision: EstimateDraftRevision): boolean {
  return revision.trace.params.some((param) =>
    param.key !== "area_m2" &&
    /_area_m2$/.test(param.key) &&
    param.affectsRowIds.length > 0 &&
    revision.params[param.key],
  );
}

function formulaReferencesKey(text: string, key: string): boolean {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-zA-Z0-9_])${escaped}($|[^a-zA-Z0-9_])`).test(text);
}

function isEditableSourceParameterValue(value: unknown): value is EstimateDraftRevisionParam["value"] {
  return typeof value === "number" && Number.isFinite(value) ||
    typeof value === "string" && value.trim().length > 0 ||
    typeof value === "boolean";
}

function collectFormulaBackedSourceParameters(
  revision: EstimateDraftRevision,
  runtimeLabels: ReadonlyMap<string, string>,
  runtimeUnits: ReadonlyMap<string, string>,
): Map<string, EstimateDraftRevisionParam> {
  const result = new Map<string, EstimateDraftRevisionParam>();
  for (const row of revision.boq.rows) {
    const source = row.sourceParameters ?? {};
    const formulaContext = source.formulaContext && typeof source.formulaContext === "object" && !Array.isArray(source.formulaContext)
      ? source.formulaContext as Record<string, unknown>
      : {};
    const candidates = { ...source, ...formulaContext };
    const formulaText = `${row.quantityFormula ?? ""};${row.calculationTrace ?? ""}`;
    for (const [key, value] of Object.entries(candidates)) {
      if (!/^[a-z][a-z0-9_]*$/i.test(key)) continue;
      if (isAiEstimateTechnicalHiddenParam(key)) continue;
      if (!hasHumanReadableAiEstimateParameterPassport(key, runtimeLabels.get(key))) continue;
      if (!isEditableSourceParameterValue(value)) continue;
      if (!formulaReferencesKey(formulaText, key)) continue;
      if (revision.params[key] || result.has(key)) continue;
      result.set(key, {
        value,
        canonicalUnit: runtimeUnits.get(key) ?? aiEstimateCanonicalUnitForParameter(key),
        source: "default_assumption",
        sourceText: "calculator_input_parameter",
        lastChangedAt: revision.trace.revisionId,
      });
    }
  }
  return result;
}

function syntheticField(
  revision: EstimateDraftRevision,
  key: string,
  fallbackLabelRu?: string | null,
): AiEstimateParameterSchemaField | null {
  if (!hasHumanReadableAiEstimateParameterPassport(key, fallbackLabelRu)) return null;
  const affectedRowIds = traceRowsForParam(revision, key);
  const runtimeMetadata = collectRuntimeParameterMetadata(revision);
  const question = clarificationQuestionsByKey(revision).get(key);
  const unit = revision.params[key]?.canonicalUnit ?? runtimeMetadata.units.get(key) ?? question?.canonical_unit_id ?? null;
  return {
    key,
    labelRu: aiEstimateRuLabelForParameter(key, fallbackLabelRu),
    unit,
    unitRu: aiEstimateRuUnitForParameter(key, unit),
    required: false,
    requiredFor: "better_accuracy",
    inputKind: cardInputKindFromClarification(question) ?? (typeof revision.params[key]?.value === "number" || Boolean(unit) ? "number" : "text"),
    editable: true,
    source: "professional_suggestion",
    affectsRowIds: affectedRowIds,
    affectsRowTitlesRu: rowTitles(revision, affectedRowIds),
    formulaRefs: [],
    aliasesRu: [],
    suggestWhenMissing: true,
    priority: 90,
  };
}

function fieldFromNormativeRequirement(requirement: AiEstimateNormativeParameterRequirement): AiEstimateParameterSchemaField {
  return {
    key: requirement.key,
    labelRu: requirement.labelRu,
    unit: requirement.unit,
    unitRu: requirement.unitRu,
    required: requirement.role === "required_for_quantity",
    requiredFor: requirement.requiredFor,
    inputKind: requirement.inputKind,
    editable: true,
    source: "professional_suggestion",
    affectsRowIds: requirement.affectsRowIds,
    affectsRowTitlesRu: requirement.affectsRowTitlesRu,
    formulaRefs: requirement.formulaRefs,
    aliasesRu: [],
    suggestWhenMissing: true,
    priority: requirement.priority,
  };
}

function formatValue(
  key: string,
  value: EstimateDraftRevisionParam["value"] | null,
  unitRu: string,
  choices: readonly { value: string; labelRu: string }[] = [],
): string {
  if (value == null || value === "") return "нужно уточнить";
  const selectedChoiceLabel = choices.find((choice) => choice.value === String(value))?.labelRu;
  if (selectedChoiceLabel) return selectedChoiceLabel;
  if (key === "package_mode" && value === "turnkey") return "под ключ";
  if (key === "scale_class" && value === "utility_scale") return "промышленная электростанция";
  if (key === "scale_class" && value === "small_rooftop_or_ground") return "небольшая крышная или наземная установка";
  if (key === "scale_class" && value === "commercial_scale") return "коммерческая установка";
  if (key === "scale_class" && value === "unknown_scale") return "масштаб нужно уточнить";
  if (value === "PRELIMINARY_REQUIRES_INPUT") return "Нужно уточнить данные";
  if (value === "READY_PROFESSIONAL") return "Параметры заполнены";
  if (value === "PRICE_MISSING") return "Цена не подтверждена";
  const text = typeof value === "number"
    ? new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 }).format(value)
    : String(value);
  if (containsForbiddenAiEstimateVisibleToken(text) || /^[a-z0-9]+(?:_[a-z0-9]+)+$/i.test(text)) return "уточняется";
  return unitRu ? `${text} ${unitRu}` : text;
}

function contextualLabel(revision: EstimateDraftRevision, key: string, fallbackLabelRu?: string | null): string {
  if (isAsphaltV4Revision(revision) && fallbackLabelRu?.trim()) return fallbackLabelRu.trim();
  if (revision.matchedFamily === "solar_power_plant" && key === "capacity_mw") {
    return "Мощность электростанции";
  }
  return aiEstimateRuLabelForParameter(key, fallbackLabelRu);
}

function shouldUseRevisionMissingInputsOnly(revision: EstimateDraftRevision): boolean {
  return revision.matchedFamily === "solar_power_plant" && revision.estimateLevel === "CONCEPT_SCOPE";
}

export function buildAiEstimateParameterCards(input: {
  revision: EstimateDraftRevision | null;
  includeMissing?: boolean;
}): AiEstimateParameterCard[] {
  const revision = input.revision;
  if (!revision) return [];
  const asphaltV4 = isAsphaltV4Revision(revision);
  const schema = asphaltV4 ? null : buildAiEstimateParameterSchema(revision.selectedTemplateId);
  const fieldsByKey = asphaltV4
    ? asphaltV4Fields(revision)
    : new Map((schema?.fields ?? []).map((field) => [field.key, field]));
  const missingLabelsByKey = new Map(revision.missingInputs.map((item) => [item.key, item.label]));
  const runtimeMetadata = collectRuntimeParameterMetadata(revision);
  const clarificationByKey = clarificationQuestionsByKey(revision);
  const normativeModel = asphaltV4 ? null : buildNormativeParameterCompletenessModel(revision);
  const formulaBackedSourceParams = collectFormulaBackedSourceParameters(revision, runtimeMetadata.labels, runtimeMetadata.units);
  for (const item of normativeModel?.passport.requirements ?? []) {
    if (!fieldsByKey.has(item.key)) fieldsByKey.set(item.key, fieldFromNormativeRequirement(item));
  }
  const keys = new Set<string>();
  for (const key of Object.keys(revision.params)) {
    const fallback = fieldsByKey.get(key)?.labelRu ?? runtimeMetadata.labels.get(key) ?? missingLabelsByKey.get(key);
    if (
      (!asphaltV4 || fieldsByKey.has(key)) &&
      !isAiEstimateTechnicalHiddenParam(key) &&
      hasHumanReadableAiEstimateParameterPassport(key, fallback)
    ) keys.add(key);
  }
  if (revision.matchedFamily === "solar_power_plant" && revision.params.capacity_mw) {
    keys.delete("capacity");
    keys.delete("capacity_kw");
    keys.delete("capacity_watts");
    keys.delete("power_mw");
    keys.delete("power_kw");
  }
  for (const key of formulaBackedSourceParams.keys()) keys.add(key);
  const redundantGenericArea = traceRowsForParam(revision, "area_m2").length === 0 && hasSpecificAreaParameterWithTrace(revision);
  if (redundantGenericArea) keys.delete("area_m2");
  if (input.includeMissing) {
    for (const missing of revision.missingInputs) {
      if (
        (!asphaltV4 || fieldsByKey.has(missing.key)) &&
        !isAiEstimateTechnicalHiddenParam(missing.key) &&
        hasHumanReadableAiEstimateParameterPassport(missing.key, missing.label)
      ) keys.add(missing.key);
    }
    if (!shouldUseRevisionMissingInputsOnly(revision)) {
      for (const item of normativeModel?.missingRequirements ?? []) {
        if (
          !isAiEstimateTechnicalHiddenParam(item.requirement.key) &&
          hasHumanReadableAiEstimateParameterPassport(item.requirement.key, item.requirement.labelRu)
        ) {
          keys.add(item.requirement.key);
        }
      }
    }
    if (redundantGenericArea) keys.delete("area_m2");
  }
  if (asphaltV4 && /(?:проект|спецификац|ведомост|черт[её]ж|прилож)/iu.test(revision.rawInput)) {
    keys.add("project_document");
  }

  const cards = [...keys].flatMap((key) => {
    const param = revision.params[key] ?? formulaBackedSourceParams.get(key) ?? null;
    const question = clarificationByKey.get(key);
    const fallbackLabel = runtimeMetadata.labels.get(key) ?? missingLabelsByKey.get(key) ?? question?.title_ru;
    const field = fieldsByKey.get(key) ?? syntheticField(revision, key, fallbackLabel);
    if (!field || !hasHumanReadableAiEstimateParameterPassport(key, field.labelRu)) return [];
    const traceRowIds = traceRowsForParam(revision, key);
    const sourceParamRowIds = formulaBackedSourceParams.has(key)
      ? revision.boq.rows
        .filter((row) => formulaReferencesKey(`${row.quantityFormula ?? ""};${row.calculationTrace ?? ""}`, key))
        .map((row) => row.rowId)
      : [];
    const affectsRowIds = traceRowIds.length > 0 ? traceRowIds : sourceParamRowIds.length > 0 ? sourceParamRowIds : field.affectsRowIds;
    const unitRu = aiEstimateRuUnitForParameter(key, param?.canonicalUnit ?? field.unit);
    const source = cardSource(param);
    const labelRu = contextualLabel(revision, key, field.labelRu);
    const revisionMissing = revision.missingInputs.find((item) => item.key === key);
    const asphaltMetadata = asphaltV4 ? asphaltV4CardMetadata(key) : null;
    if (!labelRu || containsForbiddenAiEstimateVisibleToken(labelRu) || /[a-z]+_[a-z0-9_]+/i.test(labelRu)) return [];
    return [{
      key,
      labelRu,
      value: param?.value ?? null,
      displayValueRu: formatValue(key, param?.value ?? null, unitRu, asphaltMetadata?.choices),
      unitRu,
      source,
      sourceLabelRu: aiEstimateRuSourceLabel(source),
      inputKind: field.inputKind,
      editable: true as const,
      clickAction: "open_parameter_editor" as const,
      noStepperControls: true as const,
      missing: !param,
      requiredFor: field.requiredFor,
      requiredForLabelRu: field.requiredFor === "contract_ready"
        ? "для рабочей сметы"
        : field.requiredFor === "safety_review"
          ? "для проверки безопасности"
          : "для точного расчета",
      affectsRowIds,
      affectsRowTitlesRu: affectsRowIds.length > 0 ? rowTitles(revision, affectsRowIds).slice(0, 12) : field.affectsRowTitlesRu,
      formulaRefs: field.formulaRefs,
      clarificationTier: question?.required_tier ?? (revisionMissing?.requiredFor === "contract_ready" ? "critical" : revisionMissing ? "recommended" : undefined),
      clarificationControl: question?.control ?? asphaltMetadata?.control,
      whyItMattersRu: question?.why_it_matters_ru ?? asphaltMetadata?.whyItMattersRu,
      howToAnswerRu: question?.how_to_answer_ru,
      exampleRu: question?.example_ru ?? asphaltMetadata?.exampleRu,
      changesInEstimateRu: question?.changes_in_estimate_ru,
      missingValueConsequenceRu: question?.missing_value_consequence_ru ?? asphaltMetadata?.missingValueConsequenceRu,
      provenanceRu: question?.current_value_source_ru,
      choices: question?.choices.map((choice) => ({ value: choice.value, labelRu: choice.label_ru })) ?? asphaltMetadata?.choices,
    }];
  });

  return cards.sort((a, b) => {
    const aField = fieldsByKey.get(a.key);
    const bField = fieldsByKey.get(b.key);
    const tierRank = { critical: 0, recommended: 1, optional: 2 } as const;
    const tierDelta = asphaltV4
      ? (a.missing ? tierRank[a.clarificationTier ?? "optional"] : -1) -
        (b.missing ? tierRank[b.clarificationTier ?? "optional"] : -1)
      : 0;
    return tierDelta
      || (aField?.priority ?? 90) - (bField?.priority ?? 90)
      || a.labelRu.localeCompare(b.labelRu, "ru");
  });
}

export function findAiEstimateParameterCard(
  revision: EstimateDraftRevision | null,
  key: string | null | undefined,
): AiEstimateParameterCard | null {
  if (!revision || !key) return null;
  return buildAiEstimateParameterCards({ revision, includeMissing: true }).find((card) => card.key === key) ?? null;
}
