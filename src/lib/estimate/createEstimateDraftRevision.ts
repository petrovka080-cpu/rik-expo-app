import { buildProfessionalWorkPassport } from "./buildProfessionalWorkPassport";
import { buildEstimateFromInlineWorkPrompt, type InlineWorkPromptEstimateBuildResult } from "./buildEstimateFromInlineWorkPrompt";
import type {
  EstimateDraftRevision,
  EstimateDraftRevisionArtifacts,
  EstimateDraftRevisionEstimateLevel,
  EstimateDraftRevisionParam,
  EstimateDraftRevisionParamSource,
  EstimateDraftRevisionSource,
  ParamToCalculationTrace,
  ProfessionalBoqRow,
  ProfessionalBoqSection,
} from "./estimateDraftRevisionContract";
import type { ConsumerRepairAiDraft } from "../consumerRequests";
import type { InlineWorkPromptExtractedParam } from "../ai/extractWorkParamsFromInlinePrompt";
import { attachProfessionalMaterialQuantityLines } from "./professionalMaterialQuantityCalculator";
import {
  buildAiEstimateMissingInputs,
  buildAiEstimateParameterSchema,
  type AiEstimateParameterSchema,
} from "./aiEstimateParameterSchema";
import {
  aiEstimateCanonicalUnitForParameter,
  hasHumanReadableAiEstimateParameterPassport,
  isAiEstimateTechnicalHiddenParam,
} from "./aiEstimateRuParameterDictionary";
import { recalculateProfessionalBoqRowsFromParams } from "./recalculateProfessionalBoqRowsFromParams";
import { rawInputFactStringValue } from "./rawInputFactExtraction";
import {
  ASPHALT_V4_RUNTIME_TEMPLATE_ID,
  ASPHALT_WORK_ID_V4,
  ASPHALT_WORK_SPECIFIC_PARAMETER_SCHEMA_V4,
  ROAD_SCOPE_RESOLVER_VERSION_V4,
} from "./v4/asphalt";
import { MULTI_DOMAIN_REFERENCE_PASSPORTS_V4 } from "./v4/multiDomainReferencePassportsV4";
import { estimateDeterministicHash } from "./estimateDeterministicHash";

export type CreateEstimateDraftRevisionInput = {
  estimateDraftId?: string;
  rawInput: string;
  selectedTemplateId?: string | null;
  selectedTemplateName?: string | null;
  selectedWorkKey?: string | null;
  city?: string | null;
  currency?: string | null;
  countryCode?: string | null;
  previousRevisionId?: string | null;
  source?: EstimateDraftRevisionSource;
  createdAt?: string;
  revisionIndex?: number;
  paramOverrides?: Record<string, EstimateDraftRevisionParam>;
  assumptionOverrides?: EstimateDraftRevision["assumptions"];
  artifacts?: Partial<EstimateDraftRevisionArtifacts>;
  changedParamKey?: string | null;
};

const EMPTY_ARTIFACTS: EstimateDraftRevisionArtifacts = {
  snapshotId: null,
  pdfArtifactId: null,
  buyerHandoffId: null,
  artifactsValidForRevisionId: null,
};

function safeIdPart(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || "estimate";
}

function createStableRevisionId(input: {
  estimateDraftId: string;
  previousRevisionId?: string | null;
  source: EstimateDraftRevisionSource;
  createdAt: string;
  revisionIndex?: number;
}): string {
  const index = input.revisionIndex ?? (input.previousRevisionId ? 2 : 1);
  return `edr_${safeIdPart(input.estimateDraftId)}_r${index}_${safeIdPart(input.source)}_${safeIdPart(input.createdAt)}`;
}

function sectionTitle(rowType: ProfessionalBoqRow["rowType"]): string {
  if (rowType === "material") return "Материалы";
  if (rowType === "work" || rowType === "labor") return "Работы";
  if (rowType === "equipment") return "Оборудование";
  if (rowType === "transport") return "Транспорт";
  if (rowType === "service") return "Услуги";
  return "Другое";
}

function rowTypeFromDraftItem(item: ConsumerRepairAiDraft["items"][number]): ProfessionalBoqRow["rowType"] {
  const asphaltCategory = item.sourceParameters?.asphaltV4Category;
  if (asphaltCategory === "material") return "material";
  if (asphaltCategory === "work") return "work";
  if (asphaltCategory === "labor") return "labor";
  if (asphaltCategory === "machinery" || asphaltCategory === "equipment") return "equipment";
  if (asphaltCategory === "transport") return "transport";
  if (asphaltCategory === "documentation") return "document";
  if (asphaltCategory === "testing" || asphaltCategory === "subcontract_service") return "service";
  if (item.itemType === "material") return "material";
  if (item.itemType === "work") return "work";
  if (item.itemType === "service") {
    if (item.category === "logistics" || item.category === "delivery") return "transport";
    if (/equipment|machine|crane|excavator|shift/i.test(String(item.category ?? item.titleRu))) return "equipment";
    return "service";
  }
  if (item.itemType === "document") return "document";
  return "other";
}

function rowIdFromDraftItem(item: ConsumerRepairAiDraft["items"][number], index: number): string {
  const sourceRowCode = item.sourceParameters?.rowCode;
  if (typeof sourceRowCode === "string" && sourceRowCode.trim()) return sourceRowCode.trim();
  if (item.rateKey?.trim()) return item.rateKey.trim();
  if (item.formulaId?.trim()) return `${item.formulaId.trim()}_${index + 1}`;
  return `boq_row_${index + 1}`;
}

export function buildProfessionalBoqRowsFromConsumerDraft(draft: ConsumerRepairAiDraft | null): ProfessionalBoqRow[] {
  return (draft?.items ?? []).map((item, index) => {
    const rowType = rowTypeFromDraftItem(item);
    const normalizedAsphaltRow = item.sourceParameters?.asphaltV4 === true;
    return {
      rowId: rowIdFromDraftItem(item, index),
      rowType,
      titleRu: item.titleRu,
      quantity: item.quantity,
      unit: item.unit,
      unitLabel: item.unitLabel ?? null,
      unitPrice: item.unitPrice ?? null,
      currency: item.currency ?? "KGS",
      category: item.category ?? null,
      sourceId: item.sourceId ?? null,
      sourceLabel: normalizedAsphaltRow ? undefined : item.sourceLabel ?? null,
      formulaId: item.formulaId ?? null,
      quantityFormula: item.quantityFormula ?? null,
      calculationTrace: item.calculationTrace ?? null,
      sourceParameters: item.sourceParameters ?? null,
      templateId: item.templateId ?? null,
      templateVersion: item.templateVersion ?? null,
      normId: item.normId ?? null,
      normFamilyId: item.normFamilyId ?? null,
      normSourceId: item.normSourceId ?? null,
      normSourceTitle: item.normSourceTitle ?? null,
      normVersion: item.normVersion ?? null,
      normReviewStatus: normalizedAsphaltRow ? undefined : item.normReviewStatus ?? null,
      priceStatus: item.priceStatus ?? null,
      priceSource: item.priceSource ?? null,
      priceSourceId: item.priceSourceId ?? null,
      priceSourceLabel: normalizedAsphaltRow ? undefined : item.priceSourceLabel ?? null,
      materialKey: item.materialKey ?? null,
      rateKey: item.rateKey ?? null,
      includedInProcurement: typeof item.sourceParameters?.includedInProcurement === "boolean"
        ? item.sourceParameters.includedInProcurement
        : item.itemType !== "work" && item.itemType !== "document",
      materialQuantity: null,
    };
  });
}

function buildBoqSections(rows: ProfessionalBoqRow[]): ProfessionalBoqSection[] {
  const order: ProfessionalBoqRow["rowType"][] = ["material", "work", "labor", "equipment", "transport", "service", "document", "other"];
  const sections: ProfessionalBoqSection[] = [];
  for (const rowType of order) {
    const rowIds = rows.filter((row) => row.rowType === rowType).map((row) => row.rowId);
    if (rowIds.length > 0) sections.push({ id: rowType, title: sectionTitle(rowType), rowIds });
  }
  return sections;
}

function paramFromExtracted(
  param: InlineWorkPromptExtractedParam,
  now: string,
  source: EstimateDraftRevisionParamSource = "user_input",
): EstimateDraftRevisionParam {
  const actualSource = param.sourceText.includes("*") ? "derived" : source;
  return {
    value: param.value,
    canonicalUnit: param.canonicalUnit,
    source: actualSource,
    sourceText: param.sourceText,
    lastChangedAt: now,
  };
}

function paramsFromBuildResult(
  result: InlineWorkPromptEstimateBuildResult,
  now: string,
  overrides?: Record<string, EstimateDraftRevisionParam>,
): Record<string, EstimateDraftRevisionParam> {
  const params: Record<string, EstimateDraftRevisionParam> = {};
  for (const [key, value] of Object.entries(result.parseResult.extractedParams)) {
    params[key] = paramFromExtracted(value, now);
  }
  for (const assumption of result.parseResult.assumptions) {
    if (!params[assumption.param]) {
      params[assumption.param] = {
        value: typeof assumption.value === "number" || typeof assumption.value === "string" || typeof assumption.value === "boolean"
          ? assumption.value
          : String(assumption.value),
        source: "default_assumption",
        sourceText: assumption.reason,
        lastChangedAt: now,
      };
    }
  }
  for (const [key, override] of Object.entries(overrides ?? {})) {
    if (override.source === "derived") continue;
    params[key] = override;
  }
  return params;
}

const ROW_SOURCE_PARAMETER_SKIP_PREFIXES = [
  "inlineWorkPrompt",
  "expandedComplex",
  "dynamicProfessionalBoq",
  "professional",
  "capitalRenovation",
  "norm",
  "price",
];

const ROW_SOURCE_PARAMETER_SKIP_KEYS = new Set([
  "rowCode",
  "rowId",
  "formulaId",
  "formulaVariables",
  "formulaFunctions",
  "formulaContext",
  "sourcePrompt",
  "includedInProcurement",
  "extractedParams",
  "work_family_id",
  "calculatorId",
  "baseQuantity",
  "baseUnit",
  "templateRowUnit",
  "rowUnit",
  "displayUnit",
  "workKey",
  "recipeId",
  "formulaDefinitionId",
]);

function isPrimitiveParamValue(value: unknown): value is EstimateDraftRevisionParam["value"] {
  return typeof value === "number" || typeof value === "string" || typeof value === "boolean";
}

function isRowSourceParameterCandidate(key: string, value: unknown): value is EstimateDraftRevisionParam["value"] {
  if (!/^[a-z][a-z0-9_]*$/i.test(key)) return false;
  if (isAiEstimateTechnicalHiddenParam(key)) return false;
  if (ROW_SOURCE_PARAMETER_SKIP_KEYS.has(key)) return false;
  if (ROW_SOURCE_PARAMETER_SKIP_PREFIXES.some((prefix) => key.startsWith(prefix))) return false;
  return isPrimitiveParamValue(value);
}

function sameParamValue(a: unknown, b: unknown): boolean {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 0.0001;
  return a === b;
}

function mergeCalculatorInputParams(
  params: Record<string, EstimateDraftRevisionParam>,
  rows: readonly ProfessionalBoqRow[],
  now: string,
  visibleParameterLabels: ReadonlyMap<string, string> = new Map(),
): Record<string, EstimateDraftRevisionParam> {
  const merged = { ...params };
  const revisionMetadata = rows.find((row) =>
    Array.isArray(row.sourceParameters?.asphaltV4AssumptionKeys) ||
    Array.isArray(row.sourceParameters?.asphaltV4DerivedParameterKeys)
  )?.sourceParameters ?? {};
  const revisionAssumptionKeys = new Set(Array.isArray(revisionMetadata.asphaltV4AssumptionKeys)
    ? revisionMetadata.asphaltV4AssumptionKeys.filter((value): value is string => typeof value === "string")
    : []);
  const revisionDerivedKeys = new Set(Array.isArray(revisionMetadata.asphaltV4DerivedParameterKeys)
    ? revisionMetadata.asphaltV4DerivedParameterKeys.filter((value): value is string => typeof value === "string")
    : []);
  const revisionRuntimeUnits = revisionMetadata.asphaltV4ParameterUnits &&
    typeof revisionMetadata.asphaltV4ParameterUnits === "object" &&
    !Array.isArray(revisionMetadata.asphaltV4ParameterUnits)
    ? revisionMetadata.asphaltV4ParameterUnits as Record<string, unknown>
    : {};
  for (const row of rows) {
    const source = row.sourceParameters ?? {};
    if (!merged.q && isPrimitiveParamValue(source.baseQuantity)) {
      merged.q = {
        value: source.baseQuantity,
        canonicalUnit: typeof source.baseUnit === "string" ? source.baseUnit : aiEstimateCanonicalUnitForParameter("q"),
        source: "derived",
        sourceText: "calculator_base_quantity",
        lastChangedAt: now,
      };
    }
    const depthBaseKey = typeof source.professionalDepthBaseParameterKey === "string"
      ? source.professionalDepthBaseParameterKey.trim()
      : "";
    if (
      depthBaseKey &&
      !merged[depthBaseKey] &&
      isPrimitiveParamValue(source.professionalDepthBaseQuantity) &&
      hasHumanReadableAiEstimateParameterPassport(depthBaseKey, visibleParameterLabels.get(depthBaseKey))
    ) {
      merged[depthBaseKey] = {
        value: source.professionalDepthBaseQuantity,
        canonicalUnit: aiEstimateCanonicalUnitForParameter(depthBaseKey),
        source: "derived",
        sourceText: "professional_depth_base_quantity",
        lastChangedAt: now,
      };
    }
    for (const [key, value] of Object.entries(source)) {
      const authoritativeAsphaltRuntimeValue = source.asphaltV4 === true && (
        revisionDerivedKeys.has(key) || key === "area_m2"
      );
      if (!isRowSourceParameterCandidate(key, value) || (merged[key] && !authoritativeAsphaltRuntimeValue)) continue;
      if (!hasHumanReadableAiEstimateParameterPassport(key, visibleParameterLabels.get(key))) continue;
      const genericArea = key.endsWith("_area_m2") &&
        params.area_m2?.source === "user_input" &&
        sameParamValue(params.area_m2.value, value)
        ? params.area_m2
        : null;
      merged[key] = {
        value,
        canonicalUnit: typeof revisionRuntimeUnits[key] === "string"
          ? revisionRuntimeUnits[key]
          : aiEstimateCanonicalUnitForParameter(key),
        source: source.asphaltV4 === true
          ? revisionAssumptionKeys.has(key)
            ? "default_assumption"
            : revisionDerivedKeys.has(key)
              ? "derived"
              : "user_input"
          : "derived",
        sourceText: genericArea?.sourceText ?? (source.asphaltV4 === true
          ? revisionAssumptionKeys.has(key)
            ? "asphalt_v4_declared_assembly_assumption"
            : revisionDerivedKeys.has(key)
              ? "asphalt_v4_derived_quantity_basis"
              : "asphalt_v4_user_or_form_fact"
          : "calculator_input_parameter"),
        lastChangedAt: now,
      };
    }
  }
  return merged;
}

function bindGenericParamsToFormulaDependencies(
  params: Record<string, EstimateDraftRevisionParam>,
  schema: AiEstimateParameterSchema | null,
): Record<string, EstimateDraftRevisionParam> {
  if (!schema) return params;
  const merged = { ...params };
  const formulaDependencyFields = schema.fields.filter((field) => field.source === "formula_dependency");
  for (const sourceField of schema.fields) {
    const sourceParam = merged[sourceField.key];
    if (!sourceParam) continue;
    for (const targetField of formulaDependencyFields) {
      if (merged[targetField.key] || sourceField.key === targetField.key) continue;
      if (sourceField.unit !== targetField.unit) continue;
      const referencedBySource = sourceField.formulaRefs.some((formula) => {
        const escaped = targetField.key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`(^|[^a-zA-Z0-9_])${escaped}($|[^a-zA-Z0-9_])`).test(formula);
      });
      if (!referencedBySource) continue;
      merged[targetField.key] = {
        ...sourceParam,
        canonicalUnit: targetField.unit ?? sourceParam.canonicalUnit,
        sourceText: sourceParam.sourceText
          ? `${sourceParam.sourceText}:formula_binding:${sourceField.key}`
          : `formula_binding:${sourceField.key}`,
      };
    }
  }
  return merged;
}

function assumptionsFromParse(
  assumptions: InlineWorkPromptEstimateBuildResult["parseResult"]["assumptions"],
  overrides?: EstimateDraftRevision["assumptions"],
): EstimateDraftRevision["assumptions"] {
  if (overrides) return overrides;
  return assumptions.map((assumption) => ({
    key: assumption.param,
    value: assumption.value,
    reason: assumption.reason,
    replacedByUserInput: false,
    visibleToUser: true,
  }));
}

function declaredAsphaltAssumptionsFromRows(rows: readonly ProfessionalBoqRow[]): EstimateDraftRevision["assumptions"] {
  const result = new Map<string, EstimateDraftRevision["assumptions"][number]>();
  for (const row of rows) {
    const candidate = row.sourceParameters?.asphaltV4DeclaredAssumptions;
    if (!Array.isArray(candidate)) continue;
    for (const item of candidate) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const record = item as Record<string, unknown>;
      const key = typeof record.canonical_key === "string" ? record.canonical_key : "";
      const reason = typeof record.reason_ru === "string" ? record.reason_ru : "";
      if (!key || !reason) continue;
      result.set(key, {
        key,
        value: record.value,
        reason,
        replacedByUserInput: false,
        visibleToUser: true,
      });
    }
  }
  return [...result.values()];
}

function quantityBasisFromRows(rows: readonly ProfessionalBoqRow[]): EstimateDraftRevision["quantityBasis"] {
  for (const row of rows) {
    const candidate = row.sourceParameters?.asphaltV4QuantityBasis;
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
    const basis = candidate as Record<string, unknown>;
    if ((basis.basis_type !== "project" && basis.basis_type !== "reference") || typeof basis.area_m2 !== "number") continue;
    const source = basis.source;
    if (source !== "raw_input" && source !== "revision" && source !== "confirmed_parameter" && source !== "reference_policy") continue;
    return {
      basisType: basis.basis_type,
      length_m: typeof basis.length_m === "number" ? basis.length_m : null,
      width_m: typeof basis.width_m === "number" ? basis.width_m : null,
      area_m2: basis.area_m2,
      source,
      formulaTrace: typeof basis.formula_trace === "string" ? basis.formula_trace : "",
      assumptionIds: Array.isArray(basis.assumption_ids)
        ? basis.assumption_ids.filter((value): value is string => typeof value === "string")
        : [],
    };
  }
  return null;
}

function assemblyIdFromRows(rows: readonly ProfessionalBoqRow[]): string | null {
  for (const row of rows) {
    const value = row.sourceParameters?.asphaltV4AssemblyId;
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function missingInputsFromParse(
  missingInputs: InlineWorkPromptEstimateBuildResult["parseResult"]["missingInputs"],
): EstimateDraftRevision["missingInputs"] {
  return missingInputs.map((input) => ({
    key: input.param,
    label: input.label,
    blocksPreliminaryEstimate: false,
    requiredFor: input.requiredFor,
  }));
}

function asphaltV4ParameterKey(parameterId: string): string {
  const match = parameterId.match(/^asphalt_concrete_pavement:parameter:([a-z0-9_]+):v4$/i);
  return match?.[1] ?? parameterId;
}

function missingInputsFromAsphaltV4(
  result: InlineWorkPromptEstimateBuildResult,
): EstimateDraftRevision["missingInputs"] {
  const clarification = result.v4ClarificationExperience;
  if (!clarification) return [];
  const questions = [
    ...clarification.critical_required,
    ...clarification.recommended,
    ...clarification.optional_or_assumption,
  ];
  return questions.flatMap((question) => {
    const requiredFor = question.required_tier === "critical" ? "contract_ready" as const : "better_accuracy" as const;
    if (!question.structured_group) {
      return [{
        key: asphaltV4ParameterKey(question.parameter_id),
        label: question.title_ru,
        blocksPreliminaryEstimate: false as const,
        requiredFor,
      }];
    }
    const groupKey = asphaltV4ParameterKey(question.parameter_id);
    const prefix = groupKey === "asphalt_layers" ? "asphalt_layer" : groupKey === "crushed_layers" ? "crushed_layer" : groupKey.replace(/s$/, "");
    const values = Array.isArray(question.prefilled_value)
      ? question.prefilled_value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item)))
      : [];
    const count = Math.max(question.structured_group.minimum_items, values.length);
    return Array.from({ length: count }, (_, index) => question.structured_group!.fields.flatMap((field) => {
      const value = values[index]?.[field.canonical_key];
      if (value !== null && value !== undefined && value !== "") return [];
      return [{
        key: `${prefix}_${index + 1}_${field.canonical_key}`,
        label: `${question.structured_group!.item_label_ru} ${index + 1} — ${field.professional_name_ru.toLocaleLowerCase("ru-RU")}`,
        blocksPreliminaryEstimate: false as const,
        requiredFor,
      }];
    })).flat();
  });
}

function runtimeParameterLabels(rows: readonly ProfessionalBoqRow[]): ReadonlyMap<string, string> {
  const labels = new Map<string, string>();
  for (const row of rows) {
    const candidate = row.sourceParameters?.asphaltV4ParameterLabelsRu;
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
    for (const [key, value] of Object.entries(candidate)) {
      if (typeof value === "string" && value.trim()) labels.set(key, value.trim());
    }
  }
  return labels;
}

function limitMissingInputsByRawInputPolicy(input: {
  matchedFamily: string;
  rawInputFacts: InlineWorkPromptEstimateBuildResult["parseResult"]["rawInputFacts"];
  missingInputs: EstimateDraftRevision["missingInputs"];
}): EstimateDraftRevision["missingInputs"] {
  const scaleClass = rawInputFactStringValue(input.rawInputFacts, "scale_class");
  if (input.matchedFamily !== "solar_power_plant" || scaleClass !== "utility_scale") {
    return input.missingInputs;
  }
  return [
    {
      key: "solar_capacity_basis",
      label: "100 МВт — это мощность DC или AC?",
      blocksPreliminaryEstimate: false,
      requiredFor: "better_accuracy",
    },
    {
      key: "solar_installation_type",
      label: "Наземная, крышная или плавучая станция?",
      blocksPreliminaryEstimate: false,
      requiredFor: "better_accuracy",
    },
    {
      key: "project_location",
      label: "Где расположена площадка?",
      blocksPreliminaryEstimate: false,
      requiredFor: "better_accuracy",
    },
    {
      key: "solar_mounting_type",
      label: "Фиксированные конструкции или трекеры?",
      blocksPreliminaryEstimate: false,
      requiredFor: "better_accuracy",
    },
    {
      key: "grid_connection_scope",
      label: "Входит ли подключение к электрической сети?",
      blocksPreliminaryEstimate: false,
      requiredFor: "better_accuracy",
    },
  ];
}

function formulaReferencesKey(text: string, key: string): boolean {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-zA-Z0-9_])${escaped}($|[^a-zA-Z0-9_])`).test(text);
}

function sourceParamKeys(row: ProfessionalBoqRow, params: Record<string, EstimateDraftRevisionParam>): string[] {
  const sourceParameters = row.sourceParameters ?? {};
  const keys = Object.keys(params);
  const trace = `${row.quantityFormula ?? ""};${row.calculationTrace ?? ""}`;
  const formulaKeys = keys.filter((key) => formulaReferencesKey(trace, key));
  if (formulaKeys.length > 0) return formulaKeys;
  if (sourceParameters.dynamicProfessionalBoq === true) {
    const primaryQuantityKeys = new Set(["q", "area_m2", "length_m", "width_m", "height_m", "volume_m3", "count"]);
    return keys.filter((key) => primaryQuantityKeys.has(key));
  }
  return [];
}

function buildTrace(input: {
  revisionId: string;
  selectedTemplateId: string;
  params: Record<string, EstimateDraftRevisionParam>;
  rows: ProfessionalBoqRow[];
}): ParamToCalculationTrace {
  const rowParamKeys = new Map(input.rows.map((row) => [row.rowId, sourceParamKeys(row, input.params)]));
  const normalizedAsphaltTrace = input.selectedTemplateId === ASPHALT_V4_RUNTIME_TEMPLATE_ID;
  return {
    traceId: `param_trace:${input.revisionId}`,
    revisionId: input.revisionId,
    selectedTemplateId: input.selectedTemplateId,
    params: Object.entries(input.params).map(([key, param]) => ({
      key,
      value: param.value,
      canonicalUnit: param.canonicalUnit,
      source: param.source,
      affectsRowIds: input.rows
        .filter((row) => (rowParamKeys.get(row.rowId) ?? []).includes(key))
        .map((row) => row.rowId),
    })),
    rows: input.rows.map((row) => ({
      rowId: row.rowId,
      // Asphalt V4 keeps these values canonically on the BOQ row. The trace
      // stores only dependency edges and the result, avoiding a second copy.
      formulaId: normalizedAsphaltTrace ? undefined : row.formulaId,
      quantityFormula: normalizedAsphaltTrace ? undefined : row.quantityFormula,
      calculationTrace: normalizedAsphaltTrace ? undefined : row.calculationTrace,
      resultQuantity: row.quantity,
      sourceParamKeys: rowParamKeys.get(row.rowId) ?? [],
    })),
    staleTraceAccepted: false,
  };
}

function resolveStatus(result: InlineWorkPromptEstimateBuildResult): EstimateDraftRevision["status"] {
  if (result.parseResult.mustAskUserToSelectTemplate) return "needs_template_selection";
  if (result.v4ClarificationExperience && result.draft) return "needs_more_params_but_preliminary_available";
  if (!result.draft || result.draft.items.length === 0) return "failed";
  if (result.parseResult.missingInputs.length > 0) return "needs_more_params_but_preliminary_available";
  return "draft_ready";
}

function resolveEstimateLevel(input: {
  result: InlineWorkPromptEstimateBuildResult;
  matchedFamily: string;
  missingInputs: EstimateDraftRevision["missingInputs"];
  rows: readonly ProfessionalBoqRow[];
}): EstimateDraftRevisionEstimateLevel {
  if (input.result.parseResult.mustAskUserToSelectTemplate || input.rows.length === 0) return "NEEDS_INPUT";
  const scaleClass = rawInputFactStringValue(input.result.parseResult.rawInputFacts, "scale_class");
  if (input.matchedFamily === "solar_power_plant" && scaleClass === "utility_scale" && input.missingInputs.length > 0) {
    return "CONCEPT_SCOPE";
  }
  return "PRELIMINARY_QUANTITY_BOQ";
}

function canonicalMatchedFamily(input: {
  selectedTemplateId: string;
  matchedFamily: string;
}): string {
  if (
    input.selectedTemplateId === "dynamic_fencing_estimate_dynamic_professional_boq_runtime_v1" ||
    input.matchedFamily === "dynamic_fencing_estimate"
  ) {
    return "profile_sheet_fence";
  }
  return input.matchedFamily;
}

function applicableBoqSignature(rows: readonly ProfessionalBoqRow[]): string {
  return estimateDeterministicHash(rows.map((row) => ({
    rowId: row.rowId,
    rowType: row.rowType,
    category: row.category,
    quantity: row.quantity,
    unit: row.unit,
    formulaId: row.formulaId,
    includedInProcurement: row.includedInProcurement,
  })));
}

function usesCanonicalCapitalRenovationCalculator(rows: readonly ProfessionalBoqRow[]): boolean {
  return rows.length > 0 && rows.every((row) => row.sourceParameters?.capitalRenovationCalculator === true);
}

function usesCanonicalMultiDomainReferenceV4(rows: readonly ProfessionalBoqRow[]): boolean {
  return rows.length > 0 && rows.every((row) => row.sourceParameters?.multiDomainReferenceV4 === true);
}

export function createEstimateDraftRevision(input: CreateEstimateDraftRevisionInput): EstimateDraftRevision {
  const source = input.source ?? "initial_prompt";
  const createdAt = input.createdAt ?? new Date().toISOString();
  const result = buildEstimateFromInlineWorkPrompt({
    rawInput: input.rawInput,
    selectedTemplateId: input.selectedTemplateId,
    selectedWorkKey: input.selectedWorkKey,
    selectedTemplateName: input.selectedTemplateName,
    city: input.city,
    currency: input.currency,
    countryCode: input.countryCode,
    paramOverrides: input.paramOverrides,
  });
  if (result.blockingReason === "road_scope_selection_required") {
    throw new Error("road_scope_selection_required");
  }
  const matched = result.parseResult.matchedTemplate;
  const draftTemplateId = result.draft?.items.find((item) => item.templateId?.trim())?.templateId?.trim() ?? "";
  const isAsphaltV4Draft = draftTemplateId === ASPHALT_V4_RUNTIME_TEMPLATE_ID ||
    Boolean(result.v4ClarificationExperience) ||
    Boolean(result.draft?.items.some((item) => item.sourceParameters?.asphaltV4 === true));
  const draftSelectedWorkKey = result.draft?.selectedWork?.selectedWorkKey?.trim() ?? "";
  const draftDisagreesWithBroadMatch = Boolean(
    draftTemplateId &&
    draftSelectedWorkKey &&
    matched?.family &&
    matched.family !== draftSelectedWorkKey,
  );
  const requestedTemplateId = input.selectedTemplateId?.trim() ?? "";
  const requestedReferencePassport = MULTI_DOMAIN_REFERENCE_PASSPORTS_V4.find(
    (item) => item.professionalEstimatePassportId === requestedTemplateId,
  );
  const requestedPassport = requestedTemplateId ? buildProfessionalWorkPassport(requestedTemplateId) : null;
  const selectedTemplateId = requestedTemplateId === ASPHALT_V4_RUNTIME_TEMPLATE_ID || isAsphaltV4Draft
    ? ASPHALT_V4_RUNTIME_TEMPLATE_ID
    : requestedReferencePassport
      ? requestedReferencePassport.professionalEstimatePassportId
      : requestedPassport
        ? requestedPassport.templateId
        : (
          draftDisagreesWithBroadMatch ? draftTemplateId : matched?.templateId ?? draftTemplateId
        );
  const passport = selectedTemplateId ? buildProfessionalWorkPassport(selectedTemplateId) : null;
  const estimateDraftId = input.estimateDraftId ?? `draft_${safeIdPart(selectedTemplateId || input.rawInput)}`;
  const revisionId = createStableRevisionId({
    estimateDraftId,
    previousRevisionId: input.previousRevisionId,
    source,
    createdAt,
    revisionIndex: input.revisionIndex,
  });
  const matchedFamily = canonicalMatchedFamily({
    selectedTemplateId,
    matchedFamily: draftDisagreesWithBroadMatch
      ? draftSelectedWorkKey
      : matched?.family ?? passport?.familyId ?? draftSelectedWorkKey ?? result.draft?.repairType ?? "",
  });
  const initialRows = attachProfessionalMaterialQuantityLines({
    rows: buildProfessionalBoqRowsFromConsumerDraft(result.draft),
    templateId: selectedTemplateId,
    family: matchedFamily,
  });
  const isMultiDomainReferenceV4Draft = usesCanonicalMultiDomainReferenceV4(initialRows);
  const parameterSchema = buildAiEstimateParameterSchema(selectedTemplateId);
  const visibleParameterLabels = new Map(runtimeParameterLabels(initialRows));
  for (const field of parameterSchema?.fields ?? []) {
    visibleParameterLabels.set(field.key, field.labelRu);
  }
  const params = bindGenericParamsToFormulaDependencies(
    mergeCalculatorInputParams(
      paramsFromBuildResult(result, createdAt, input.paramOverrides),
      initialRows,
      createdAt,
      visibleParameterLabels,
    ),
    parameterSchema,
  );
  const recalculatedRows = usesCanonicalCapitalRenovationCalculator(initialRows) ||
    isMultiDomainReferenceV4Draft ||
    isAsphaltV4Draft
    ? initialRows
    : recalculateProfessionalBoqRowsFromParams({
      rows: initialRows,
      params,
      changedParamKey: input.changedParamKey,
    });
  const rows = attachProfessionalMaterialQuantityLines({
    rows: recalculatedRows,
    templateId: selectedTemplateId,
    family: matchedFamily,
  });
  const trace = buildTrace({ revisionId, selectedTemplateId, params, rows });
  const missingInputs = limitMissingInputsByRawInputPolicy({
    matchedFamily,
    rawInputFacts: result.parseResult.rawInputFacts,
    missingInputs: buildAiEstimateMissingInputs({
      selectedTemplateId,
      params,
      existingMissingInputs: (isAsphaltV4Draft || requestedTemplateId === ASPHALT_V4_RUNTIME_TEMPLATE_ID
        ? missingInputsFromAsphaltV4(result)
        : isMultiDomainReferenceV4Draft
          ? []
        : missingInputsFromParse(result.parseResult.missingInputs)
      ).filter((item, index, values) => values.findIndex((candidate) => candidate.key === item.key) === index),
    }),
  });
  const estimateLevel = resolveEstimateLevel({ result, matchedFamily, missingInputs, rows });
  const assumptionsByKey = new Map<string, EstimateDraftRevision["assumptions"][number]>();
  for (const assumption of assumptionsFromParse(result.parseResult.assumptions, input.assumptionOverrides)) {
    assumptionsByKey.set(assumption.key, assumption);
  }
  for (const assumption of declaredAsphaltAssumptionsFromRows(rows)) assumptionsByKey.set(assumption.key, assumption);
  return {
    estimateDraftId,
    revisionId,
    previousRevisionId: input.previousRevisionId ?? null,
    source,
    rawInput: input.rawInput,
    selectedTemplateId,
    matchedFamily,
    professionalWorkId: isAsphaltV4Draft ? ASPHALT_WORK_ID_V4 : null,
    workAssemblyId: isAsphaltV4Draft ? assemblyIdFromRows(rows) : null,
    roadScopeBinding: result.roadScopeResolution?.resolverStatus === "RESOLVED" &&
      result.roadScopeResolution.selectedScopeId && result.roadScopeResolution.semanticKind &&
      result.roadScopeResolution.semanticKind !== "SEARCH_ALIAS" &&
      result.roadScopeResolution.semanticKind !== "DOMAIN_REVIEW_REQUIRED"
      ? {
        requestedCatalogWorkId: result.roadScopeResolution.requestedCatalogWorkId,
        originalUserText: result.roadScopeResolution.originalText,
        semanticKind: result.roadScopeResolution.semanticKind,
        selectedRoadScope: result.roadScopeResolution.selectedScopeId,
        resolverEvidence: [...result.roadScopeResolution.evidence],
        assumptions: [...result.roadScopeResolution.assumptions],
        exclusions: [...result.roadScopeResolution.exclusions],
        resolverVersion: ROAD_SCOPE_RESOLVER_VERSION_V4,
        passportVersions: [selectedTemplateId],
        formulaGraphVersions: [
          isAsphaltV4Draft
            ? "asphalt-v4-formula-graph"
            : rows.find((row) => row.templateVersion)?.templateVersion ?? "legacy-expanded-formula-graph",
        ],
        sourceRegistryVersion: "estimate-v4-source-registry",
        compositeProject: null,
      }
      : null,
    quantityBasis: isAsphaltV4Draft ? quantityBasisFromRows(rows) : null,
    workSpecificParameterSchemaId: isAsphaltV4Draft
      ? ASPHALT_WORK_SPECIFIC_PARAMETER_SCHEMA_V4.schema_id
      : null,
    workSpecificParameterSignature: isAsphaltV4Draft
      ? ASPHALT_WORK_SPECIFIC_PARAMETER_SCHEMA_V4.parameters.map((parameter) => parameter.parameter_id)
      : [],
    applicableBoqSignature: applicableBoqSignature(rows),
    legacyRowsCount: isAsphaltV4Draft
      ? rows.filter((row) => row.sourceParameters?.asphaltV4 !== true).length
      : 0,
    estimateLevel,
    rawInputFacts: result.parseResult.rawInputFacts,
    rawInputFactMetrics: result.parseResult.rawInputFactExtraction.metrics,
    params,
    assumptions: [...assumptionsByKey.values()],
    missingInputs,
    professionalClarification: result.v4ClarificationExperience ?? null,
    boq: {
      sections: buildBoqSections(rows),
      rows,
    },
    trace,
    status: resolveStatus(result),
    artifacts: {
      ...EMPTY_ARTIFACTS,
      ...(input.artifacts ?? {}),
    },
  };
}

export function createInitialEstimateDraftRevisionState(
  input: Omit<CreateEstimateDraftRevisionInput, "previousRevisionId" | "source" | "revisionIndex">,
) {
  const revision = createEstimateDraftRevision({ ...input, source: "initial_prompt", revisionIndex: 1 });
  return {
    estimateDraftId: revision.estimateDraftId,
    currentRevisionId: revision.revisionId,
    revisions: [revision],
    diffs: [],
  };
}
