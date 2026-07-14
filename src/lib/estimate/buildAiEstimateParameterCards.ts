import type {
  EstimateDraftRevision,
  EstimateDraftRevisionParam,
} from "./estimateDraftRevisionContract";
import {
  buildAiEstimateParameterSchema,
  type AiEstimateParameterInputKind,
  type AiEstimateParameterRequiredFor,
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

export type AiEstimateParameterCardSource =
  | "user_prompt"
  | "manual_override"
  | "catalog_default"
  | "formula_derived"
  | "schema_missing";

export type AiEstimateParameterCard = {
  key: string;
  labelRu: string;
  value: EstimateDraftRevisionParam["value"] | null;
  displayValueRu: string;
  unitRu: string;
  source: AiEstimateParameterCardSource;
  sourceLabelRu: string;
  inputKind: AiEstimateParameterInputKind;
  editable: true;
  clickAction: "open_parameter_editor";
  noStepperControls: true;
  missing: boolean;
  requiredFor: AiEstimateParameterRequiredFor;
  requiredForLabelRu: string;
  affectsRowIds: string[];
  affectsRowTitlesRu: string[];
  formulaRefs: string[];
};

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

function collectFormulaBackedSourceParameters(revision: EstimateDraftRevision): Map<string, EstimateDraftRevisionParam> {
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
      if (!hasHumanReadableAiEstimateParameterPassport(key)) continue;
      if (!isEditableSourceParameterValue(value)) continue;
      if (!formulaReferencesKey(formulaText, key)) continue;
      if (revision.params[key] || result.has(key)) continue;
      result.set(key, {
        value,
        canonicalUnit: aiEstimateCanonicalUnitForParameter(key),
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
  const unit = revision.params[key]?.canonicalUnit ?? null;
  return {
    key,
    labelRu: aiEstimateRuLabelForParameter(key, fallbackLabelRu),
    unit,
    unitRu: aiEstimateRuUnitForParameter(key, unit),
    required: false,
    requiredFor: "better_accuracy",
    inputKind: typeof revision.params[key]?.value === "number" ? "number" : "text",
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

function formatValue(key: string, value: EstimateDraftRevisionParam["value"] | null, unitRu: string): string {
  if (value == null || value === "") return "нужно уточнить";
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
  if (containsForbiddenAiEstimateVisibleToken(text) || /[a-z]+_[a-z0-9_]+/i.test(text)) return "уточняется";
  return unitRu ? `${text} ${unitRu}` : text;
}

function contextualLabel(revision: EstimateDraftRevision, key: string, fallbackLabelRu?: string | null): string {
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
  const schema = buildAiEstimateParameterSchema(revision.selectedTemplateId);
  const fieldsByKey = new Map((schema?.fields ?? []).map((field) => [field.key, field]));
  const missingLabelsByKey = new Map(revision.missingInputs.map((item) => [item.key, item.label]));
  const normativeModel = buildNormativeParameterCompletenessModel(revision);
  const formulaBackedSourceParams = collectFormulaBackedSourceParameters(revision);
  for (const item of normativeModel?.passport.requirements ?? []) {
    if (!fieldsByKey.has(item.key)) fieldsByKey.set(item.key, fieldFromNormativeRequirement(item));
  }
  const keys = new Set<string>();
  for (const key of Object.keys(revision.params)) {
    const fallback = fieldsByKey.get(key)?.labelRu ?? missingLabelsByKey.get(key);
    if (!isAiEstimateTechnicalHiddenParam(key) && hasHumanReadableAiEstimateParameterPassport(key, fallback)) keys.add(key);
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
      if (!isAiEstimateTechnicalHiddenParam(missing.key) && hasHumanReadableAiEstimateParameterPassport(missing.key, missing.label)) keys.add(missing.key);
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

  const cards = [...keys].flatMap((key) => {
    const param = revision.params[key] ?? formulaBackedSourceParams.get(key) ?? null;
    const field = fieldsByKey.get(key) ?? syntheticField(revision, key, missingLabelsByKey.get(key));
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
    if (!labelRu || containsForbiddenAiEstimateVisibleToken(labelRu) || /[a-z]+_[a-z0-9_]+/i.test(labelRu)) return [];
    return [{
      key,
      labelRu,
      value: param?.value ?? null,
      displayValueRu: formatValue(key, param?.value ?? null, unitRu),
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
    }];
  });

  return cards.sort((a, b) => {
    const aField = fieldsByKey.get(a.key);
    const bField = fieldsByKey.get(b.key);
    return (aField?.priority ?? 90) - (bField?.priority ?? 90)
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
