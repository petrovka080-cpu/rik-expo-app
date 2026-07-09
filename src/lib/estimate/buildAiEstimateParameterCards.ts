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
  aiEstimateRuLabelForParameter,
  aiEstimateRuSourceLabel,
  aiEstimateRuUnitForParameter,
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

function syntheticField(revision: EstimateDraftRevision, key: string): AiEstimateParameterSchemaField {
  const affectedRowIds = traceRowsForParam(revision, key);
  return {
    key,
    labelRu: aiEstimateRuLabelForParameter(key),
    unit: revision.params[key]?.canonicalUnit ?? null,
    unitRu: aiEstimateRuUnitForParameter(key, revision.params[key]?.canonicalUnit),
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
  const text = typeof value === "number"
    ? new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 }).format(value)
    : String(value);
  return unitRu ? `${text} ${unitRu}` : text;
}

export function buildAiEstimateParameterCards(input: {
  revision: EstimateDraftRevision | null;
  includeMissing?: boolean;
}): AiEstimateParameterCard[] {
  const revision = input.revision;
  if (!revision) return [];
  const schema = buildAiEstimateParameterSchema(revision.selectedTemplateId);
  const fieldsByKey = new Map((schema?.fields ?? []).map((field) => [field.key, field]));
  const normativeModel = buildNormativeParameterCompletenessModel(revision);
  for (const item of normativeModel?.passport.requirements ?? []) {
    if (!fieldsByKey.has(item.key)) fieldsByKey.set(item.key, fieldFromNormativeRequirement(item));
  }
  const keys = new Set<string>();
  for (const key of Object.keys(revision.params)) {
    if (!isAiEstimateTechnicalHiddenParam(key)) keys.add(key);
  }
  const redundantGenericArea = traceRowsForParam(revision, "area_m2").length === 0 && hasSpecificAreaParameterWithTrace(revision);
  if (redundantGenericArea) keys.delete("area_m2");
  if (input.includeMissing) {
    for (const missing of revision.missingInputs) {
      if (!isAiEstimateTechnicalHiddenParam(missing.key)) keys.add(missing.key);
    }
    for (const item of normativeModel?.missingRequirements ?? []) {
      if (!isAiEstimateTechnicalHiddenParam(item.requirement.key)) keys.add(item.requirement.key);
    }
    if (redundantGenericArea) keys.delete("area_m2");
  }

  const cards = [...keys].map((key) => {
    const param = revision.params[key] ?? null;
    const field = fieldsByKey.get(key) ?? syntheticField(revision, key);
    const traceRowIds = traceRowsForParam(revision, key);
    const affectsRowIds = traceRowIds.length > 0 ? traceRowIds : field.affectsRowIds;
    const unitRu = aiEstimateRuUnitForParameter(key, param?.canonicalUnit ?? field.unit);
    const source = cardSource(param);
    return {
      key,
      labelRu: field.labelRu,
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
    };
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
