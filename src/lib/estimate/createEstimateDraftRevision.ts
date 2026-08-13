import type { InlineWorkPromptEstimateBuildResult } from "./buildEstimateFromInlineWorkPrompt";
import type {
  EstimateDraftRevision,
  EstimateDraftRevisionArtifacts,
  EstimateDraftRevisionEstimateLevel,
  EstimateDraftRevisionParam,
  EstimateDraftRevisionParamSource,
  EstimateDraftRevisionSource,
  EstimateResolvedIdentity,
  ParamToCalculationTrace,
  ProfessionalBoqRow,
  ProfessionalBoqSection,
} from "./estimateDraftRevisionContract";
import type { ConsumerRepairAiDraft } from "../consumerRequests/consumerRequestTypes";
import type { InlineWorkPromptExtractedParam } from "../ai/extractWorkParamsFromInlinePrompt";
import type { InlineWorkPromptParseResult } from "../ai/parseInlineWorkEstimatePrompt";
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
} from "./v4/asphalt/asphaltV4Constants";
import { ASPHALT_WORK_SPECIFIC_PARAMETER_SCHEMA_V4 } from "./v4/asphalt/asphaltWorkSpecificParameterSchemaV4";
import { ROAD_SCOPE_RESOLVER_VERSION_V4 } from "./v4/asphalt/roadScopeTruthV4";
import { isExactAsphaltRelatedConsumerDraftV4 } from "./v4/asphalt/asphaltRelatedProductionBindingV4";
import { MULTI_DOMAIN_REFERENCE_PASSPORTS_V4 } from "./v4/multiDomainReferencePassportsV4";
import { estimateDeterministicHash } from "./estimateDeterministicHash";

function loadProfessionalWorkPassportBuilder() {
  return require(
    "./buildProfessionalWorkPassport"
  ) as typeof import("./buildProfessionalWorkPassport");
}

function loadInlineWorkPromptEstimateBuilder() {
  return require(
    "./buildEstimateFromInlineWorkPrompt"
  ) as typeof import("./buildEstimateFromInlineWorkPrompt");
}

function buildProfessionalWorkPassportIfApplicable(templateId: string) {
  if (templateId.endsWith("_dynamic_professional_boq_runtime_v1")) return null;
  return loadProfessionalWorkPassportBuilder().buildProfessionalWorkPassport(templateId);
}

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
  /** Exact domain draft compiled once before immutable revision projection. */
  prebuiltExactDraft?: ConsumerRepairAiDraft | null;
  /** @deprecated Use prebuiltExactDraft. Kept for Roadworks Wave A callers. */
  prebuiltExactRoadworksWaveADraft?: ConsumerRepairAiDraft | null;
};

const EMPTY_ARTIFACTS: EstimateDraftRevisionArtifacts = {
  snapshotId: null,
  pdfArtifactId: null,
  buyerHandoffId: null,
  artifactsValidForRevisionId: null,
};

export const ESTIMATE_RESOLVED_IDENTITY_COMPILER_VERSION =
  "estimate-draft-revision-compiler-v2";

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
  const asphaltCategory = item.sourceParameters?.professionalBoqCategory ?? item.sourceParameters?.asphaltV4Category;
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
      costingMode: item.sourceParameters?.asphaltV4CostingMode === "RESOURCE_MODE" || item.sourceParameters?.asphaltV4CostingMode === "UNIT_RATE_MODE"
        ? item.sourceParameters.asphaltV4CostingMode
        : null,
      costTreatment: ["COMPOSITE_RATE", "RESOURCE_BASED", "ANALYTICAL_ONLY", "INFORMATIONAL_SUBTOTAL"].includes(
        String(item.sourceParameters?.asphaltV4CostTreatment ?? ""),
      )
        ? item.sourceParameters?.asphaltV4CostTreatment as NonNullable<ProfessionalBoqRow["costTreatment"]>
        : null,
      costOwnershipId: typeof item.sourceParameters?.asphaltV4CostOwnershipId === "string"
        ? item.sourceParameters.asphaltV4CostOwnershipId
        : null,
      payable: typeof item.sourceParameters?.asphaltV4Payable === "boolean"
        ? item.sourceParameters.asphaltV4Payable
        : null,
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
  const roadworksWaveASource = rows.find((row) => row.sourceParameters?.roadworksWaveA === true)?.sourceParameters;
  const roadworksWaveASnapshot = roadworksWaveASource?.parameterSnapshot &&
    typeof roadworksWaveASource.parameterSnapshot === "object" &&
    !Array.isArray(roadworksWaveASource.parameterSnapshot)
    ? roadworksWaveASource.parameterSnapshot as Record<string, unknown>
    : {};
  const roadworksWaveAAssumptionKeys = new Set(
    Array.isArray(roadworksWaveASource?.assumptionKeys)
      ? roadworksWaveASource.assumptionKeys.filter((key): key is string => typeof key === "string")
      : [],
  );
  const roadworksWaveAMetadata = roadworksWaveASource?.roadworksWaveAParameterMetadata &&
    typeof roadworksWaveASource.roadworksWaveAParameterMetadata === "object" &&
    !Array.isArray(roadworksWaveASource.roadworksWaveAParameterMetadata)
    ? roadworksWaveASource.roadworksWaveAParameterMetadata as Record<string, Record<string, unknown>>
    : {};
  for (const [key, value] of Object.entries(roadworksWaveASnapshot)) {
    if (!isPrimitiveParamValue(value) || !(key in roadworksWaveAMetadata)) continue;
    const existing = merged[key];
    if (roadworksWaveAAssumptionKeys.has(key)) {
      if (roadworksWaveAMetadata[key]?.tier === "P0") {
        if (!existing || existing.source === "default_assumption" || existing.source === "derived") delete merged[key];
        continue;
      }
      if (existing && existing.source !== "default_assumption" && existing.source !== "derived") continue;
      const unit = roadworksWaveAMetadata[key]?.unit;
      merged[key] = {
        value,
        canonicalUnit: typeof unit === "string" ? unit : aiEstimateCanonicalUnitForParameter(key),
        source: "default_assumption",
        sourceText: `${roadworksWaveAMetadata[key]?.defaultSourceId ?? "roadworks-wave-a-versioned-defaults"}:${roadworksWaveAMetadata[key]?.defaultSourceVersion ?? "unknown"}`,
        lastChangedAt: now,
      };
      continue;
    }
    if (existing && existing.source !== "default_assumption" && existing.source !== "derived") continue;
    const unit = roadworksWaveAMetadata[key]?.unit;
    merged[key] = {
      value,
      canonicalUnit: typeof unit === "string" ? unit : aiEstimateCanonicalUnitForParameter(key),
      source: "user_input",
      sourceText: "roadworks_wave_a_explicit_input",
      lastChangedAt: now,
    };
  }
  const asphaltRelatedSource = rows.find((row) => row.sourceParameters?.asphaltRelatedV4 === true)?.sourceParameters;
  const asphaltRelatedSnapshot = asphaltRelatedSource?.parameterSnapshot &&
    typeof asphaltRelatedSource.parameterSnapshot === "object" &&
    !Array.isArray(asphaltRelatedSource.parameterSnapshot)
    ? asphaltRelatedSource.parameterSnapshot as Record<string, unknown>
    : {};
  const asphaltRelatedAssumptionKeys = new Set(
    Array.isArray(asphaltRelatedSource?.assumptionKeys)
      ? asphaltRelatedSource.assumptionKeys.filter((key): key is string => typeof key === "string")
      : [],
  );
  const asphaltRelatedMetadata = asphaltRelatedSource?.asphaltRelatedParameterMetadata &&
    typeof asphaltRelatedSource.asphaltRelatedParameterMetadata === "object" &&
    !Array.isArray(asphaltRelatedSource.asphaltRelatedParameterMetadata)
    ? asphaltRelatedSource.asphaltRelatedParameterMetadata as Record<string, Record<string, unknown>>
    : {};
  for (const [key, value] of Object.entries(asphaltRelatedSnapshot)) {
    if (!isPrimitiveParamValue(value) || !(key in asphaltRelatedMetadata)) continue;
    const existing = merged[key];
    if (asphaltRelatedAssumptionKeys.has(key)) {
      if (!existing || existing.source === "default_assumption" || existing.source === "derived") delete merged[key];
      continue;
    }
    if (existing && existing.source !== "default_assumption" && existing.source !== "derived") continue;
    const unit = asphaltRelatedMetadata[key]?.unit;
    merged[key] = {
      value,
      canonicalUnit: typeof unit === "string" ? unit : aiEstimateCanonicalUnitForParameter(key),
      source: "user_input",
      sourceText: "asphalt_related_exact_explicit_input",
      lastChangedAt: now,
    };
  }
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
    const roadworksMetadata = row.sourceParameters?.roadworksWaveAParameterMetadata;
    if (roadworksMetadata && typeof roadworksMetadata === "object" && !Array.isArray(roadworksMetadata)) {
      for (const [key, raw] of Object.entries(roadworksMetadata)) {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
        const label = (raw as Record<string, unknown>).labelRu;
        if (typeof label === "string" && label.trim()) labels.set(key, label.trim());
      }
    }
    const asphaltRelatedMetadata = row.sourceParameters?.asphaltRelatedParameterMetadata;
    if (!asphaltRelatedMetadata || typeof asphaltRelatedMetadata !== "object" || Array.isArray(asphaltRelatedMetadata)) continue;
    for (const [key, raw] of Object.entries(asphaltRelatedMetadata)) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const label = (raw as Record<string, unknown>).labelRu;
      if (typeof label === "string" && label.trim()) labels.set(key, label.trim());
    }
  }
  return labels;
}

function roadworksWaveARevisionContext(rows: readonly ProfessionalBoqRow[]): {
  workKey: string;
  parameterSchemaId: string;
  parameterKeys: string[];
  assumptionKeys: string[];
  metadata: Record<string, Record<string, unknown>>;
} | null {
  const source = rows.find((row) => row.sourceParameters?.roadworksWaveA === true)?.sourceParameters;
  if (!source) return null;
  const workKey = typeof source.selectedWorkId === "string" ? source.selectedWorkId : "";
  const parameterSchemaId = typeof source.parameterSchemaId === "string" ? source.parameterSchemaId : "";
  const snapshot = source.parameterSnapshot && typeof source.parameterSnapshot === "object" && !Array.isArray(source.parameterSnapshot)
    ? source.parameterSnapshot as Record<string, unknown>
    : {};
  const metadata = source.roadworksWaveAParameterMetadata &&
    typeof source.roadworksWaveAParameterMetadata === "object" &&
    !Array.isArray(source.roadworksWaveAParameterMetadata)
    ? source.roadworksWaveAParameterMetadata as Record<string, Record<string, unknown>>
    : {};
  const parameterKeys = Object.keys(metadata).filter((key) => key in snapshot);
  const assumptionKeys = Array.isArray(source.assumptionKeys)
    ? source.assumptionKeys.filter((key): key is string => typeof key === "string" && parameterKeys.includes(key))
    : [];
  return workKey && parameterSchemaId && parameterKeys.length > 0
    ? { workKey, parameterSchemaId, parameterKeys, assumptionKeys, metadata }
    : null;
}

function asphaltRelatedRevisionContext(rows: readonly ProfessionalBoqRow[]): {
  workKey: string;
  parameterSchemaId: string;
  parameterKeys: string[];
  assumptionKeys: string[];
  metadata: Record<string, Record<string, unknown>>;
  readiness: string;
} | null {
  const source = rows.find((row) => row.sourceParameters?.asphaltRelatedV4 === true)?.sourceParameters;
  if (!source) return null;
  const workKey = typeof source.selectedWorkId === "string" ? source.selectedWorkId : "";
  const parameterSchemaId = typeof source.parameterSchemaId === "string" ? source.parameterSchemaId : "";
  const readiness = typeof source.domainResolutionReadiness === "string" ? source.domainResolutionReadiness : "UNSUPPORTED_OR_AMBIGUOUS";
  const snapshot = source.parameterSnapshot && typeof source.parameterSnapshot === "object" && !Array.isArray(source.parameterSnapshot)
    ? source.parameterSnapshot as Record<string, unknown>
    : {};
  const metadata = source.asphaltRelatedParameterMetadata &&
    typeof source.asphaltRelatedParameterMetadata === "object" &&
    !Array.isArray(source.asphaltRelatedParameterMetadata)
    ? source.asphaltRelatedParameterMetadata as Record<string, Record<string, unknown>>
    : {};
  const parameterKeys = Object.keys(metadata).filter((key) => key in snapshot);
  const assumptionKeys = Array.isArray(source.assumptionKeys)
    ? source.assumptionKeys.filter((key): key is string => typeof key === "string" && parameterKeys.includes(key))
    : [];
  return workKey && parameterSchemaId && parameterKeys.length > 0
    ? { workKey, parameterSchemaId, parameterKeys, assumptionKeys, metadata, readiness }
    : null;
}

function professionalDomainRevisionContext(rows: readonly ProfessionalBoqRow[]): {
  workKey: string;
  catalogId: string;
  canonicalTechnologyId: string;
  parameterSchemaId: string;
  parameterKeys: string[];
  projectAssemblyId: string;
} | null {
  const source = rows.find((row) => row.sourceParameters?.professionalDomainFactoryV1 === true)?.sourceParameters;
  if (!source) return null;
  const workKey = typeof source.workKey === "string" ? source.workKey : "";
  const catalogId = typeof source.catalogId === "string" ? source.catalogId : "";
  const canonicalTechnologyId = typeof source.canonicalTechnologyId === "string" ? source.canonicalTechnologyId : "";
  const parameterSchemaId = typeof source.parameterSchemaId === "string" ? source.parameterSchemaId : "";
  const projectAssemblyId = typeof source.projectAssemblyId === "string" ? source.projectAssemblyId : "";
  const parameterKeys = Array.isArray(source.parameterKeys)
    ? source.parameterKeys.filter((key): key is string => typeof key === "string" && key.trim().length > 0)
    : [];
  return workKey && catalogId && canonicalTechnologyId && parameterSchemaId && projectAssemblyId && parameterKeys.length > 0
    ? { workKey, catalogId, canonicalTechnologyId, parameterSchemaId, parameterKeys, projectAssemblyId }
    : null;
}

function missingInputsFromAsphaltRelated(
  context: NonNullable<ReturnType<typeof asphaltRelatedRevisionContext>>,
): EstimateDraftRevision["missingInputs"] {
  return context.assumptionKeys.map((key) => ({
    key,
    label: typeof context.metadata[key]?.labelRu === "string"
      ? context.metadata[key].labelRu as string
      : key,
    blocksPreliminaryEstimate: context.metadata[key]?.tier === "P0" || context.readiness === "NORMATIVE_SOURCE_GAP",
    requiredFor: "contract_ready" as const,
  }));
}

function missingInputsFromRoadworksWaveA(
  context: NonNullable<ReturnType<typeof roadworksWaveARevisionContext>>,
): EstimateDraftRevision["missingInputs"] {
  return context.assumptionKeys.filter((key) => context.metadata[key]?.tier === "P0").map((key) => ({
    key,
    label: typeof context.metadata[key]?.labelRu === "string"
      ? context.metadata[key].labelRu as string
      : key,
    blocksPreliminaryEstimate: true,
    requiredFor: "contract_ready" as const,
  }));
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

const PASSPORT_PRIMARY_QUANTITY_KEYS = ["area_m2", "length_m", "volume_m3", "count"] as const;

function passportPrimaryQuantityParamKey(
  params: Record<string, EstimateDraftRevisionParam>,
): string | null {
  for (const key of PASSPORT_PRIMARY_QUANTITY_KEYS) {
    const value = params[key]?.value;
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return key;
  }
  return null;
}

function sourceParamKeys(row: ProfessionalBoqRow, params: Record<string, EstimateDraftRevisionParam>): string[] {
  const sourceParameters = row.sourceParameters ?? {};
  const keys = Object.keys(params);
  const declaredAffectedBy = Array.isArray(sourceParameters.affectedBy)
    ? sourceParameters.affectedBy.filter(
      (key): key is string => typeof key === "string" && keys.includes(key),
    )
    : [];
  if (declaredAffectedBy.length > 0) return declaredAffectedBy;
  const trace = `${row.quantityFormula ?? ""};${row.calculationTrace ?? ""}`;
  const formulaKeys = keys.filter((key) => formulaReferencesKey(trace, key));
  if (formulaKeys.length > 0) return formulaKeys;
  if (
    sourceParameters.passportBackedNaturalLanguageIngress === true &&
    (formulaReferencesKey(trace, "q") || formulaReferencesKey(trace, "baseQuantity"))
  ) {
    const primaryKey = passportPrimaryQuantityParamKey(params);
    return primaryKey ? [primaryKey] : [];
  }
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

function resolveStatus(
  result: InlineWorkPromptEstimateBuildResult,
  remainingMissingInputCount = result.parseResult.missingInputs.length,
  exactSelectionConfirmed = false,
): EstimateDraftRevision["status"] {
  if (result.parseResult.mustAskUserToSelectTemplate && !exactSelectionConfirmed) return "needs_template_selection";
  if (!result.draft || result.draft.items.length === 0) return "failed";
  // The clarification model remains attached for editing even after every
  // applicable input is resolved. Status must follow the final filtered
  // missing-input set, otherwise a complete Asphalt V4 revision can never be
  // approved despite missing_required_count === 0 and a non-empty BOQ.
  if (remainingMissingInputCount > 0) return "needs_more_params_but_preliminary_available";
  return "draft_ready";
}

function resolveEstimateLevel(input: {
  result: InlineWorkPromptEstimateBuildResult;
  matchedFamily: string;
  missingInputs: EstimateDraftRevision["missingInputs"];
  rows: readonly ProfessionalBoqRow[];
  exactSelectionConfirmed?: boolean;
}): EstimateDraftRevisionEstimateLevel {
  if (
    (input.result.parseResult.mustAskUserToSelectTemplate && !input.exactSelectionConfirmed) ||
    input.rows.length === 0
  ) return "NEEDS_INPUT";
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

function stringSourceParameter(
  rows: readonly ProfessionalBoqRow[],
  keys: readonly string[],
): string | null {
  for (const row of rows) {
    for (const key of keys) {
      const value = row.sourceParameters?.[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return null;
}

function sourceBindingVersions(
  rows: readonly ProfessionalBoqRow[],
): EstimateResolvedIdentity["sourceBindingVersions"] {
  const bindings = new Map<string, string>();
  for (const row of rows) {
    const sourceId = row.normSourceId?.trim() || row.sourceId?.trim();
    if (!sourceId) continue;
    const version = row.normVersion?.trim() || row.templateVersion?.trim() || "unversioned";
    bindings.set(sourceId, version);
  }
  return [...bindings.entries()]
    .map(([sourceId, version]) => ({ sourceId, version }))
    .sort((left, right) => left.sourceId.localeCompare(right.sourceId));
}

export function resolvedEstimateIdentityChecksum(
  identity: Omit<EstimateResolvedIdentity, "checksum">,
): string {
  return estimateDeterministicHash({
    ...identity,
    resolvedParameters: Object.fromEntries(
      Object.entries(identity.resolvedParameters)
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
    sourceBindingVersions: [...identity.sourceBindingVersions]
      .sort((left, right) => left.sourceId.localeCompare(right.sourceId)),
  });
}

function usesCanonicalCapitalRenovationCalculator(rows: readonly ProfessionalBoqRow[]): boolean {
  return rows.length > 0 && rows.every((row) => row.sourceParameters?.capitalRenovationCalculator === true);
}

function usesCanonicalMultiDomainReferenceV4(rows: readonly ProfessionalBoqRow[]): boolean {
  return rows.length > 0 && rows.every((row) => row.sourceParameters?.multiDomainReferenceV4 === true);
}

function usesExactRoadworksWaveAConsumerDraft(
  draft: ConsumerRepairAiDraft | null,
): boolean {
  return Boolean(
    draft?.items.length &&
    draft.items.every((item) => item.sourceParameters?.roadworksWaveA === true),
  );
}

function usesExactAsphaltRelatedConsumerDraft(
  draft: ConsumerRepairAiDraft | null,
): boolean {
  return isExactAsphaltRelatedConsumerDraftV4(draft);
}

function usesProfessionalDomainFactoryConsumerDraft(
  draft: ConsumerRepairAiDraft | null,
): boolean {
  return Boolean(draft?.items.length && draft.items.every((item) =>
    item.sourceParameters?.professionalDomainFactoryV1 === true &&
    typeof item.sourceParameters?.domainId === "string" &&
    typeof item.sourceParameters?.catalogId === "string" &&
    typeof item.sourceParameters?.workKey === "string"));
}

function buildPrebuiltExactDraftResult(input: {
  rawInput: string;
  selectedTemplateId?: string | null;
  selectedTemplateName?: string | null;
  selectedWorkKey?: string | null;
  draft: ConsumerRepairAiDraft;
}): InlineWorkPromptEstimateBuildResult {
  const exactRoadworksWaveA = usesExactRoadworksWaveAConsumerDraft(input.draft);
  const exactAsphaltRelated = usesExactAsphaltRelatedConsumerDraft(input.draft);
  const exactProfessionalDomain = usesProfessionalDomainFactoryConsumerDraft(input.draft);
  if (!exactRoadworksWaveA && !exactAsphaltRelated && !exactProfessionalDomain) {
    throw new Error("PREBUILT_EXACT_DRAFT_INVALID");
  }
  const selectedWorkKey = input.draft.selectedWork?.selectedWorkKey?.trim();
  const selectedCatalogWorkId = input.draft.selectedWork?.selectedCatalogWorkId?.trim();
  const templateId = input.draft.items[0]?.templateId?.trim() ||
    input.selectedTemplateId?.trim() ||
    selectedWorkKey;
  const requestedWorkId = input.selectedWorkKey?.trim();
  if (!selectedWorkKey || !templateId || (
    requestedWorkId && ![selectedWorkKey, selectedCatalogWorkId, templateId].includes(requestedWorkId)
  )) {
    throw new Error("PREBUILT_EXACT_DRAFT_IDENTITY_MISMATCH");
  }
  const templateName = input.selectedTemplateName?.trim() ||
    input.draft.selectedWork?.selectedWorkTitleRu?.trim() ||
    input.draft.titleRu;
  const parseResult: InlineWorkPromptParseResult = {
    rawInput: input.rawInput,
    matchedTemplate: {
      templateId,
      templateName,
      family: selectedWorkKey,
      confidence: 1,
      matchSource: "user_selected",
      matchedTextSpan: [0, input.rawInput.length],
    },
    candidateTemplates: [{
      templateId,
      templateName,
      family: selectedWorkKey,
      workKey: selectedWorkKey,
      confidence: 1,
      reason: exactAsphaltRelated
        ? "prebuilt_exact_asphalt_related_binding"
        : exactProfessionalDomain
          ? "prebuilt_exact_professional_domain_binding"
          : "prebuilt_exact_roadworks_wave_a_binding",
    }],
    paramText: input.rawInput.trim(),
    extractedParams: {},
    rawInputFacts: [],
    rawInputFactExtraction: {
      raw_input: input.rawInput,
      facts: [],
      metrics: {
        explicit_input_facts_ignored: 0,
        explicit_input_unit_mismatches: 0,
        explicit_input_facts_overwritten_by_default: 0,
      },
    },
    assumptions: [],
    missingInputs: [],
    canBuildPreliminaryEstimate: true,
    mustAskUserToSelectTemplate: false,
  };
  return {
    parseResult,
    draft: input.draft,
    canBuildPreliminaryEstimate: true,
    pdfMappingValid: true,
    buyerHandoffMappingValid: input.draft.items.some((item) => item.itemType !== "work"),
    v4ClarificationExperience: null,
    roadScopeResolution: null,
  };
}

export function createEstimateDraftRevision(input: CreateEstimateDraftRevisionInput): EstimateDraftRevision {
  const source = input.source ?? "initial_prompt";
  const createdAt = input.createdAt ?? new Date().toISOString();
  const prebuiltExactDraft = input.prebuiltExactDraft ?? input.prebuiltExactRoadworksWaveADraft;
  const result = prebuiltExactDraft
    ? buildPrebuiltExactDraftResult({
      rawInput: input.rawInput,
      selectedTemplateId: input.selectedTemplateId,
      selectedTemplateName: input.selectedTemplateName,
      selectedWorkKey: input.selectedWorkKey,
      draft: prebuiltExactDraft,
    })
    : loadInlineWorkPromptEstimateBuilder().buildEstimateFromInlineWorkPrompt({
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
  if (
    !result.canBuildPreliminaryEstimate &&
    usesExactAsphaltRelatedConsumerDraft(result.draft)
  ) {
    const reason = result.blockingReason ?? "NEEDS_REQUIRED_INPUTS";
    const missing = result.draft?.missingData.filter(Boolean).join("|") ?? "";
    throw new Error(missing ? `${reason}:${missing}` : reason);
  }
  const matched = result.parseResult.matchedTemplate;
  const draftTemplateId = result.draft?.items.find((item) => item.templateId?.trim())?.templateId?.trim() ?? "";
  const exactAsphaltRelatedConsumerDraft = usesExactAsphaltRelatedConsumerDraft(result.draft);
  const isAsphaltV4Draft = !exactAsphaltRelatedConsumerDraft && (draftTemplateId === ASPHALT_V4_RUNTIME_TEMPLATE_ID ||
    Boolean(result.v4ClarificationExperience) ||
    Boolean(result.draft?.items.some((item) => item.sourceParameters?.asphaltV4 === true)));
  const draftSelectedWorkKey = result.draft?.selectedWork?.selectedWorkKey?.trim() ?? "";
  // Exact Roadworks Wave A already owns its passport, parameter schema and
  // calculation identity in the compiled row metadata. Re-entering the broad
  // professional catalog here performs a second generic catalog scan on the
  // cold request path and can never add authoritative information.
  const exactRoadworksWaveAConsumerDraft = usesExactRoadworksWaveAConsumerDraft(result.draft);
  const exactProfessionalDomainConsumerDraft = usesProfessionalDomainFactoryConsumerDraft(result.draft);
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
  const requestedPassport = requestedTemplateId && !exactRoadworksWaveAConsumerDraft && !exactProfessionalDomainConsumerDraft
    ? buildProfessionalWorkPassportIfApplicable(requestedTemplateId)
    : null;
  const selectedTemplateId = exactProfessionalDomainConsumerDraft
    ? draftTemplateId || requestedTemplateId
    : requestedTemplateId === ASPHALT_V4_RUNTIME_TEMPLATE_ID || isAsphaltV4Draft
    ? ASPHALT_V4_RUNTIME_TEMPLATE_ID
    : requestedReferencePassport
      ? requestedReferencePassport.professionalEstimatePassportId
      : requestedPassport
        ? requestedPassport.templateId
        : (
          draftDisagreesWithBroadMatch ? draftTemplateId : matched?.templateId ?? draftTemplateId
        );
  const passport = selectedTemplateId && !exactRoadworksWaveAConsumerDraft && !exactProfessionalDomainConsumerDraft
    ? requestedPassport?.templateId === selectedTemplateId
      ? requestedPassport
      : buildProfessionalWorkPassportIfApplicable(selectedTemplateId)
    : null;
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
  const roadworksWaveAContext = roadworksWaveARevisionContext(initialRows);
  const asphaltRelatedContext = asphaltRelatedRevisionContext(initialRows);
  const professionalDomainContext = professionalDomainRevisionContext(initialRows);
  const exactRoadworksWaveADraft = roadworksWaveAContext !== null;
  const exactAsphaltRelatedDraft = asphaltRelatedContext !== null;
  const isMultiDomainReferenceV4Draft = usesCanonicalMultiDomainReferenceV4(initialRows);
  const parameterSchema = exactRoadworksWaveADraft || exactAsphaltRelatedDraft || professionalDomainContext
    ? null
    : buildAiEstimateParameterSchema(selectedTemplateId);
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
    professionalDomainContext !== null ||
    exactAsphaltRelatedDraft ||
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
  const missingInputs = exactRoadworksWaveADraft
    ? missingInputsFromRoadworksWaveA(roadworksWaveAContext)
    : exactAsphaltRelatedDraft
      ? missingInputsFromAsphaltRelated(asphaltRelatedContext)
    // A compiled registered-domain draft has already passed its exact schema
    // gate in compileProfessionalEstimateDomainV1. Re-entering the broad
    // 11,610-work passport/schema lookup here is both redundant and very slow
    // on Web and native cold paths. Missing-input collection remains on the
    // parameter-collection branch, where no compiled draft/context exists.
    : professionalDomainContext
      ? []
    : limitMissingInputsByRawInputPolicy({
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
  const exactSelectionConfirmed = Boolean(input.selectedTemplateId?.trim() || input.selectedWorkKey?.trim());
  const estimateLevel = resolveEstimateLevel({
    result,
    matchedFamily,
    missingInputs,
    rows,
    exactSelectionConfirmed,
  });
  const assumptionsByKey = new Map<string, EstimateDraftRevision["assumptions"][number]>();
  for (const assumption of assumptionsFromParse(result.parseResult.assumptions, input.assumptionOverrides)) {
    assumptionsByKey.set(assumption.key, assumption);
  }
  for (const assumption of declaredAsphaltAssumptionsFromRows(rows)) assumptionsByKey.set(assumption.key, assumption);
  if (roadworksWaveAContext) {
    for (const key of roadworksWaveAContext.assumptionKeys) {
      const assumedParam = params[key];
      const usesVersionedDefault = assumedParam?.source === "default_assumption";
      assumptionsByKey.set(key, {
        key,
        value: usesVersionedDefault ? assumedParam.value : null,
        reason: usesVersionedDefault
          ? `Versioned exact-work default: ${assumedParam.sourceText ?? "roadworks-wave-a-versioned-defaults"}`
          : `Required exact-work input is not confirmed: ${roadworksWaveAContext.metadata[key]?.labelRu ?? key}`,
        replacedByUserInput: false,
        visibleToUser: true,
      });
    }
  }
  if (asphaltRelatedContext) {
    for (const key of asphaltRelatedContext.assumptionKeys) {
      assumptionsByKey.set(key, {
        key,
        value: null,
        reason: `Required exact asphalt-related input is not confirmed: ${asphaltRelatedContext.metadata[key]?.labelRu ?? key}`,
        replacedByUserInput: false,
        visibleToUser: true,
      });
    }
  }
  const roadScopeBinding = !exactRoadworksWaveADraft &&
    result.roadScopeResolution?.resolverStatus === "RESOLVED" &&
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
    : null;
  const calculationProfileId = stringSourceParameter(rows, ["calculationProfileId"]);
  const calculationStrategyId =
    stringSourceParameter(rows, ["calculationStrategyId"]) ||
    calculationProfileId ||
    input.selectedTemplateId?.trim() ||
    input.selectedWorkKey?.trim() ||
    draftSelectedWorkKey ||
    matched?.templateId ||
    selectedTemplateId;
  const formulaGraphVersion =
    stringSourceParameter(rows, ["formulaGraphVersion", "formulaGraphId"]) ||
    roadScopeBinding?.formulaGraphVersions[0] ||
    rows.find((row) => row.templateVersion)?.templateVersion ||
    `${selectedTemplateId}:formula-graph:v1`;
  const identityWithoutChecksum = {
    requestedCatalogWorkId:
      roadScopeBinding?.requestedCatalogWorkId ||
      stringSourceParameter(rows, ["requestedCatalogWorkId", "selectedWorkId", "catalogId"]) ||
      input.selectedWorkKey?.trim() ||
      null,
    passportId:
      stringSourceParameter(rows, ["professionalEstimatePassportId", "passportId", "semanticOwner"]) ||
      (isAsphaltV4Draft ? ASPHALT_WORK_ID_V4 : selectedTemplateId),
    passportVersion: stringSourceParameter(rows, ["professionalEstimatePassportVersion", "passportVersion"]) || undefined,
    parameterSchemaId: stringSourceParameter(rows, ["parameterSchemaId"]) || undefined,
    parameterSchemaVersion: stringSourceParameter(rows, ["parameterSchemaVersion"]) || undefined,
    calculationStrategyId,
    calculationProfileId: calculationProfileId || undefined,
    calculationProfileVersion: stringSourceParameter(rows, ["calculationProfileVersion"]) || undefined,
    canonicalModelId: stringSourceParameter(rows, ["canonicalModelId"]) || selectedTemplateId,
    canonicalModelVersion:
      stringSourceParameter(rows, ["canonicalModelVersion"]) ||
      rows.find((row) => row.templateVersion)?.templateVersion ||
      formulaGraphVersion,
    selectedScope:
      stringSourceParameter(rows, ["selectedRoadScope", "scopeProfile", "scopeMode"]) ||
      roadScopeBinding?.selectedRoadScope ||
      null,
    scopePresetId: stringSourceParameter(rows, ["scopePresetId"]) || null,
    resolvedParameters: params,
    formulaGraphVersion,
    normativeCompositionId: stringSourceParameter(rows, ["normativeCompositionId"]) || undefined,
    semanticFingerprint: stringSourceParameter(rows, ["semanticFingerprint"]) || undefined,
    compilerVersion: ESTIMATE_RESOLVED_IDENTITY_COMPILER_VERSION,
    sourceBindingVersions: sourceBindingVersions(rows),
    semanticOwner:
      stringSourceParameter(rows, [
        "semanticOwner",
        "canonicalModelId",
        "professionalEstimatePassportId",
      ]) ||
      selectedTemplateId,
    originalPrompt: input.rawInput,
    legacyFallbackUsed: professionalDomainContext ? false : undefined,
    fallbackReason: professionalDomainContext ? null : undefined,
    projectionOwner: "estimate_draft_revision" as const,
  } satisfies Omit<EstimateResolvedIdentity, "checksum">;
  const resolvedIdentity: EstimateResolvedIdentity = {
    ...identityWithoutChecksum,
    checksum: resolvedEstimateIdentityChecksum(identityWithoutChecksum),
  };
  return {
    estimateDraftId,
    revisionId,
    createdAt,
    previousRevisionId: input.previousRevisionId ?? null,
    source,
    rawInput: input.rawInput,
    selectedTemplateId,
    matchedFamily,
    professionalWorkId: roadworksWaveAContext?.workKey ?? asphaltRelatedContext?.workKey ?? professionalDomainContext?.workKey ?? (isAsphaltV4Draft ? ASPHALT_WORK_ID_V4 : null),
    workAssemblyId: professionalDomainContext?.projectAssemblyId ?? (isAsphaltV4Draft ? assemblyIdFromRows(rows) : null),
    roadScopeBinding,
    resolvedIdentity,
    quantityBasis: isAsphaltV4Draft || exactAsphaltRelatedDraft ? quantityBasisFromRows(rows) : null,
    workSpecificParameterSchemaId: roadworksWaveAContext?.parameterSchemaId ?? asphaltRelatedContext?.parameterSchemaId ?? professionalDomainContext?.parameterSchemaId ?? (isAsphaltV4Draft
      ? ASPHALT_WORK_SPECIFIC_PARAMETER_SCHEMA_V4.schema_id
      : null),
    workSpecificParameterSignature: roadworksWaveAContext?.parameterKeys ?? asphaltRelatedContext?.parameterKeys ?? professionalDomainContext?.parameterKeys ?? (isAsphaltV4Draft
      ? ASPHALT_WORK_SPECIFIC_PARAMETER_SCHEMA_V4.parameters.map((parameter) => parameter.parameter_id)
      : []),
    applicableBoqSignature: applicableBoqSignature(rows),
    legacyRowsCount: professionalDomainContext
      ? rows.filter((row) => row.sourceParameters?.professionalDomainFactoryV1 !== true).length
      : isAsphaltV4Draft
      ? rows.filter((row) => row.sourceParameters?.asphaltV4 !== true).length
      : exactAsphaltRelatedDraft
        ? rows.filter((row) => row.sourceParameters?.asphaltRelatedV4 !== true).length
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
    status: exactAsphaltRelatedDraft && asphaltRelatedContext.readiness !== "CALCULATION_READY"
      ? "blocking_required"
      : resolveStatus(result, missingInputs.length, exactSelectionConfirmed),
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
