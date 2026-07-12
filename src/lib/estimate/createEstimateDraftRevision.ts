import { buildProfessionalWorkPassport } from "./buildProfessionalWorkPassport";
import { buildEstimateFromInlineWorkPrompt, type InlineWorkPromptEstimateBuildResult } from "./buildEstimateFromInlineWorkPrompt";
import type {
  EstimateDraftRevision,
  EstimateDraftRevisionArtifacts,
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
import { buildAiEstimateMissingInputs } from "./aiEstimateParameterSchema";
import { aiEstimateCanonicalUnitForParameter, isAiEstimateTechnicalHiddenParam } from "./aiEstimateRuParameterDictionary";
import { recalculateProfessionalBoqRowsFromParams } from "./recalculateProfessionalBoqRowsFromParams";

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
      sourceLabel: item.sourceLabel ?? null,
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
      normReviewStatus: item.normReviewStatus ?? null,
      priceStatus: item.priceStatus ?? null,
      priceSource: item.priceSource ?? null,
      priceSourceId: item.priceSourceId ?? null,
      priceSourceLabel: item.priceSourceLabel ?? null,
      materialKey: item.materialKey ?? null,
      rateKey: item.rateKey ?? null,
      includedInProcurement: item.itemType !== "work" && item.itemType !== "document",
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
): Record<string, EstimateDraftRevisionParam> {
  const merged = { ...params };
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
    if (depthBaseKey && !merged[depthBaseKey] && isPrimitiveParamValue(source.professionalDepthBaseQuantity)) {
      merged[depthBaseKey] = {
        value: source.professionalDepthBaseQuantity,
        canonicalUnit: aiEstimateCanonicalUnitForParameter(depthBaseKey),
        source: "derived",
        sourceText: "professional_depth_base_quantity",
        lastChangedAt: now,
      };
    }
    for (const [key, value] of Object.entries(source)) {
      if (!isRowSourceParameterCandidate(key, value) || merged[key]) continue;
      const genericArea = key.endsWith("_area_m2") &&
        params.area_m2?.source === "user_input" &&
        sameParamValue(params.area_m2.value, value)
        ? params.area_m2
        : null;
      merged[key] = {
        value,
        canonicalUnit: aiEstimateCanonicalUnitForParameter(key),
        source: "derived",
        sourceText: genericArea?.sourceText ?? "calculator_input_parameter",
        lastChangedAt: now,
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
      formulaId: row.formulaId,
      quantityFormula: row.quantityFormula,
      calculationTrace: row.calculationTrace,
      resultQuantity: row.quantity,
      sourceParamKeys: rowParamKeys.get(row.rowId) ?? [],
    })),
    staleTraceAccepted: false,
  };
}

function resolveStatus(result: InlineWorkPromptEstimateBuildResult): EstimateDraftRevision["status"] {
  if (result.parseResult.mustAskUserToSelectTemplate) return "needs_template_selection";
  if (!result.draft || result.draft.items.length === 0) return "failed";
  if (result.parseResult.missingInputs.length > 0) return "needs_more_params_but_preliminary_available";
  return "draft_ready";
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

function usesCanonicalCapitalRenovationCalculator(rows: readonly ProfessionalBoqRow[]): boolean {
  return rows.length > 0 && rows.every((row) => row.sourceParameters?.capitalRenovationCalculator === true);
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
  const matched = result.parseResult.matchedTemplate;
  const draftTemplateId = result.draft?.items.find((item) => item.templateId?.trim())?.templateId?.trim() ?? "";
  const selectedTemplateId = matched?.templateId ?? input.selectedTemplateId ?? draftTemplateId;
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
    matchedFamily: matched?.family ?? passport?.familyId ?? result.draft?.selectedWork?.selectedWorkKey ?? result.draft?.repairType ?? "",
  });
  const initialRows = attachProfessionalMaterialQuantityLines({
    rows: buildProfessionalBoqRowsFromConsumerDraft(result.draft),
    templateId: selectedTemplateId,
    family: matchedFamily,
  });
  const params = mergeCalculatorInputParams(
    paramsFromBuildResult(result, createdAt, input.paramOverrides),
    initialRows,
    createdAt,
  );
  const rows = usesCanonicalCapitalRenovationCalculator(initialRows)
    ? initialRows
    : recalculateProfessionalBoqRowsFromParams({
      rows: initialRows,
      params,
      changedParamKey: input.changedParamKey,
    });
  const trace = buildTrace({ revisionId, selectedTemplateId, params, rows });
  const missingInputs = buildAiEstimateMissingInputs({
    selectedTemplateId,
    params,
    existingMissingInputs: missingInputsFromParse(result.parseResult.missingInputs),
  });
  return {
    estimateDraftId,
    revisionId,
    previousRevisionId: input.previousRevisionId ?? null,
    source,
    rawInput: input.rawInput,
    selectedTemplateId,
    matchedFamily,
    params,
    assumptions: assumptionsFromParse(result.parseResult.assumptions, input.assumptionOverrides),
    missingInputs,
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
