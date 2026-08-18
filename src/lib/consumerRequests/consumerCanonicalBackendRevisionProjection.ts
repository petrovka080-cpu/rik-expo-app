import { compareEstimateDraftRevisions } from "../estimate/compareEstimateDraftRevisions";
import type {
  EstimateDraftRevision,
  EstimateDraftRevisionParam,
  EstimateDraftRevisionState,
  ProfessionalBoqRow,
} from "../estimate/estimateDraftRevisionContract";
import { resolvedEstimateIdentityChecksum } from "../estimate/resolvedEstimateIdentityChecksum";
import type { StructuredEstimatePayload } from "../estimateStructuredPipeline/structuredEstimateTypes";
import type {
  ConsumerRepairDraftBundle,
  ConsumerRepairRequestItem,
} from "./consumerRequestTypes";

export const CANONICAL_BACKEND_REVISION_PROJECTION_VERSION =
  "canonical-estimate-backend-projection.v1" as const;

function backendParameterValue(value: unknown): string | number | boolean | null {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? value
    : null;
}

function rowType(item: ConsumerRepairRequestItem): ProfessionalBoqRow["rowType"] {
  if (item.itemType === "work") return "work";
  if (item.itemType === "material") return "material";
  if (item.itemType === "service") return "service";
  if (item.itemType === "document") return "document";
  const category = item.category?.trim().toLocaleLowerCase("en-US");
  if (category === "equipment" || category === "transport" || category === "labor") return category;
  return "other";
}

function projectedRow(item: ConsumerRepairRequestItem): ProfessionalBoqRow {
  const source = item.sourceParameters ?? {};
  const rowId = typeof source.rowCode === "string" && source.rowCode.trim()
    ? source.rowCode.trim()
    : item.id;
  return {
    rowId,
    rowType: rowType(item),
    titleRu: item.titleRu,
    quantity: item.quantity ?? 0,
    unit: item.unit ?? "item",
    unitLabel: item.unitLabel ?? null,
    unitPrice: item.unitPrice ?? null,
    currency: item.currency,
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
    includedInProcurement: source.includedInProcurement === true,
    costingMode: null,
    costTreatment: null,
    costOwnershipId: null,
    payable: typeof source.payable === "boolean" ? source.payable : null,
  };
}

function parameterProjection(
  payload: StructuredEstimatePayload,
  previous: EstimateDraftRevision | null,
): Record<string, EstimateDraftRevisionParam> {
  const createdAt = payload.canonicalBackend?.createdAt ?? new Date().toISOString();
  const values = payload.canonicalBackend?.parameters ?? {};
  return Object.fromEntries(Object.entries(values).flatMap(([key, rawValue]) => {
    const value = backendParameterValue(rawValue);
    if (value == null) return [];
    const previousParam = previous?.params[key];
    const unchanged = previousParam?.value === value;
    return [[key, {
      value,
      source: unchanged ? previousParam.source : previousParam ? "edited_by_user" : "user_input",
      sourceText: CANONICAL_BACKEND_REVISION_PROJECTION_VERSION,
      lastChangedAt: unchanged ? previousParam.lastChangedAt : createdAt,
    } satisfies EstimateDraftRevisionParam]];
  }));
}

export function appendCanonicalBackendRevisionProjection(input: {
  previousBundle: ConsumerRepairDraftBundle | null;
  nextBundle: ConsumerRepairDraftBundle;
  payload: StructuredEstimatePayload | null | undefined;
}): ConsumerRepairDraftBundle {
  const payload = input.payload;
  const metadata = payload?.canonicalBackend;
  if (!payload || !metadata || metadata.compilerOwner !== "backend" || input.nextBundle.items.length === 0) {
    return input.nextBundle;
  }
  const previousState = input.previousBundle?.estimateDraftRevisionState ?? null;
  if (previousState?.revisions.some((revision) => revision.revisionId === metadata.revisionId)) {
    return { ...input.nextBundle, estimateDraftRevisionState: previousState };
  }
  const previousRevision = previousState?.revisions.find(
    (revision) => revision.revisionId === metadata.parentRevisionId,
  ) ?? previousState?.revisions.find(
    (revision) => revision.revisionId === previousState.currentRevisionId,
  ) ?? null;
  const rows = input.nextBundle.items.map(projectedRow);
  const params = parameterProjection(payload, previousRevision);
  const sectionsByCategory = new Map<string, string[]>();
  for (const row of rows) {
    const category = row.category ?? row.rowType;
    sectionsByCategory.set(category, [...(sectionsByCategory.get(category) ?? []), row.rowId]);
  }
  const identityWithoutChecksum = {
    requestedCatalogWorkId: metadata.catalogId,
    passportId: payload.workKey,
    calculationStrategyId: "canonical-backend-formula-graph",
    canonicalModelId: "canonical-estimate-backend",
    canonicalModelVersion: metadata.releaseId,
    selectedScope: null,
    scopePresetId: null,
    resolvedParameters: params,
    formulaGraphVersion: metadata.formulaGraphVersion ?? metadata.checksumSha256,
    compilerVersion: CANONICAL_BACKEND_REVISION_PROJECTION_VERSION,
    sourceBindingVersions: [{ sourceId: metadata.releaseId, version: metadata.checksumSha256 }],
    semanticOwner: payload.workKey,
    originalPrompt: payload.inputText,
    legacyFallbackUsed: false,
    fallbackReason: null,
    projectionOwner: "estimate_draft_revision" as const,
  };
  const revision: EstimateDraftRevision = {
    estimateDraftId: input.nextBundle.draft.id,
    revisionId: metadata.revisionId,
    createdAt: metadata.createdAt,
    previousRevisionId: metadata.parentRevisionId,
    source: previousRevision ? "param_batch" : "initial_prompt",
    rawInput: payload.inputText,
    selectedTemplateId: metadata.catalogId,
    matchedFamily: payload.workKey,
    professionalWorkId: payload.workKey,
    workAssemblyId: null,
    resolvedIdentity: {
      ...identityWithoutChecksum,
      checksum: resolvedEstimateIdentityChecksum(identityWithoutChecksum),
    },
    roadScopeBinding: null,
    quantityBasis: typeof params.area_m2?.value === "number"
      ? {
        basisType: "project",
        length_m: typeof params.length_m?.value === "number" ? params.length_m.value : null,
        width_m: typeof params.width_m?.value === "number" ? params.width_m.value : null,
        area_m2: params.area_m2.value,
        source: "confirmed_parameter",
        formulaTrace: metadata.formulaGraphVersion ?? metadata.checksumSha256,
        assumptionIds: [],
      }
      : null,
    workSpecificParameterSchemaId: metadata.parameterSchemaHash ?? null,
    workSpecificParameterSignature: Object.keys(params),
    applicableBoqSignature: metadata.checksumSha256,
    legacyRowsCount: 0,
    estimateLevel: "SOURCE_BACKED_PROFESSIONAL_BOQ",
    rawInputFacts: [],
    rawInputFactMetrics: {
      explicit_input_facts_ignored: 0,
      explicit_input_unit_mismatches: 0,
      explicit_input_facts_overwritten_by_default: 0,
    },
    params,
    assumptions: [],
    missingInputs: [],
    professionalClarification: null,
    boq: {
      sections: [...sectionsByCategory].map(([category, rowIds]) => ({
        id: `canonical_backend_section:${category}`,
        title: category,
        rowIds,
      })),
      rows,
    },
    trace: {
      traceId: `canonical_backend_trace:${metadata.revisionId}`,
      revisionId: metadata.revisionId,
      selectedTemplateId: metadata.catalogId,
      params: Object.entries(params).map(([key, param]) => ({
        key,
        value: param.value,
        canonicalUnit: param.canonicalUnit,
        source: param.source,
        affectsRowIds: [],
      })),
      rows: rows.map((row) => ({
        rowId: row.rowId,
        formulaId: row.formulaId,
        quantityFormula: row.quantityFormula,
        calculationTrace: row.calculationTrace,
        resultQuantity: row.quantity,
        sourceParamKeys: [],
      })),
      staleTraceAccepted: false,
    },
    status: "draft_ready",
    artifacts: {
      snapshotId: null,
      pdfArtifactId: null,
      buyerHandoffId: null,
      artifactsValidForRevisionId: null,
    },
  };
  const diff = previousRevision ? compareEstimateDraftRevisions(previousRevision, revision) : null;
  if (diff && diff.changedParams.length === 0) revision.source = "template_change";
  return {
    ...input.nextBundle,
    estimateDraftRevisionState: {
      estimateDraftId: input.nextBundle.draft.id,
      currentRevisionId: revision.revisionId,
      revisions: [...(previousState?.revisions ?? []), revision],
      diffs: [...(previousState?.diffs ?? []), ...(diff ? [diff] : [])],
    },
  };
}

export function canonicalBackendRevisionProjectionForSave(
  bundle: ConsumerRepairDraftBundle,
): EstimateDraftRevisionState | null {
  const state = bundle.estimateDraftRevisionState ?? null;
  if (!state || bundle.items.length === 0) return null;
  const current = state.revisions.find((revision) => revision.revisionId === state.currentRevisionId);
  const revisionIds = new Set(bundle.items.map((item) =>
    String(item.sourceParameters?.canonicalBackendRevisionId ?? "").trim()
  ));
  if (
    !current || revisionIds.size !== 1 || !revisionIds.has(current.revisionId)
    || state.revisions.some((revision) =>
      revision.resolvedIdentity?.compilerVersion !== CANONICAL_BACKEND_REVISION_PROJECTION_VERSION
    )
    || current.boq.rows.length !== bundle.items.length
  ) return null;
  return state;
}
