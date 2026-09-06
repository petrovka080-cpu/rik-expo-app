import { createHash } from "node:crypto";

import {
  approveConsumerRepairRequestDraft,
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairRequest,
  sendConsumerRepairRequestToMarketplace,
  updateConsumerRepairRequestDraft,
  upsertConsumerRepairCanonicalBackendDraft,
  type ConsumerRepairAiDraft,
  type ConsumerRepairDraftBundle,
  ConsumerRepairValidationError,
} from "../../src/lib/consumerRequests";
import {
  ensureConsumerRepairBundleEstimateRevisionState,
  freezeConsumerRepairEstimateRevision,
} from "../../src/lib/consumerRequests/consumerRequestEditableEstimateSnapshot";
import {
  appendCanonicalBackendRevisionProjection,
} from "../../src/lib/consumerRequests/consumerCanonicalBackendRevisionProjection";
import { createConsumerRepairEvent } from "../../src/lib/consumerRequests/consumerRequestAuditTrail";
import {
  createConsumerRepairItemsFromDraftRevision,
} from "../../src/lib/consumerRequests/consumerRequestService";
import { saveConsumerRepairBundle } from "../../src/lib/consumerRequests/consumerRequestRepository";
import { applyAiEstimateParameterBatchOverride } from "../../src/lib/estimate/applyAiEstimateParameterOverrides";
import {
  createCanonicalParameterSession,
  type CanonicalParameterSeed,
  type CanonicalParameterValue,
} from "../../src/lib/estimate/canonicalParameters/canonicalParameterCore";
import { REGISTERED_CANONICAL_PARAMETER_SCHEMAS } from "../../src/lib/estimate/canonicalParameters/registeredCanonicalParameterSchemas";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { compareEstimateDraftRevisions } from "../../src/lib/estimate/compareEstimateDraftRevisions";
import type { EstimateDraftRevision } from "../../src/lib/estimate/estimateDraftRevisionContract";
import { resolvedEstimateIdentityChecksum } from "../../src/lib/estimate/resolvedEstimateIdentityChecksum";
import { resolveRegisteredProfessionalEstimateSelectionV1 } from "../../src/lib/estimate/v4/domains/registeredProfessionalEstimateDomainsV1";
import { buildHvacFromInlineInputV1 } from "../../src/lib/estimate/v4/domains/heatingVentilationComplete/productionBinding";
import { buildInteriorFinishesFromInlineInputV1 } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/productionBinding";
import { getAsphaltRelatedProfileByCatalogRecordIdV4 } from "../../src/lib/estimate/v4/asphalt/asphaltRelatedSemanticRegistryV4";
import type { UserParamPatchOperation } from "../../src/lib/estimate/validateUserParamPatch";
import type { StructuredEstimatePayload } from "../../src/lib/estimateStructuredPipeline/structuredEstimateTypes";

const AUDIT_RELEASE_ID = "a8000000-0000-4000-8000-000000000001";

function deterministicUuid(seed: string): string {
  const hex = createHash("sha256").update(seed).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function auditItemFingerprint(aiDraft: ConsumerRepairAiDraft): string {
  const rows = aiDraft.items.map((item) => {
    const sourceParameters = Object.fromEntries(
      Object.entries(item.sourceParameters ?? {})
        .filter(([key]) => !key.startsWith("canonicalBackend"))
        .sort(([left], [right]) => left.localeCompare(right)),
    );
    return {
      itemType: item.itemType,
      titleRu: item.titleRu,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice ?? null,
      currency: item.currency ?? "KGS",
      source: item.source,
      catalogItemId: item.catalogItemId ?? null,
      selectedCatalogItemId: item.selectedCatalogItemId ?? null,
      materialKey: item.materialKey ?? null,
      rateKey: item.rateKey ?? null,
      formulaId: item.formulaId ?? null,
      quantityFormula: item.quantityFormula ?? null,
      sourceParameters,
    };
  });
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}

function auditPayloadForRevision(input: {
  revision: EstimateDraftRevision;
  revisionId: string;
  releaseId: string;
  parentRevisionId: string | null;
  revisionNumber: number;
  createdAt: string;
}): StructuredEstimatePayload {
  const parameters = Object.fromEntries(
    Object.entries(input.revision.params).map(([key, param]) => [key, param.value]),
  );
  const catalogId =
    input.revision.resolvedIdentity?.requestedCatalogWorkId ?? input.revision.selectedTemplateId;
  return {
    workKey: input.revision.matchedFamily,
    inputText: input.revision.rawInput,
    canonicalBackend: {
      compilerOwner: "backend",
      revisionId: input.revisionId,
      parentRevisionId: input.parentRevisionId,
      revisionNumber: input.revisionNumber,
      releaseId: input.releaseId,
      catalogId,
      createdAt: input.createdAt,
      checksumSha256: createHash("sha256")
        .update(JSON.stringify({
          revisionId: input.revisionId,
          parentRevisionId: input.parentRevisionId,
          parameters,
          rows: input.revision.boq.rows,
        }))
        .digest("hex"),
      formulaGraphVersion:
        input.revision.resolvedIdentity?.formulaGraphVersion ?? "canonical-audit-projection-v1",
      parameterSchemaHash: input.revision.workSpecificParameterSchemaId,
      parameters,
    },
  } as unknown as StructuredEstimatePayload;
}

function restoreAuditCalculationSemantics(
  projected: EstimateDraftRevision,
  calculated: EstimateDraftRevision,
): EstimateDraftRevision {
  const resolvedIdentity = projected.resolvedIdentity
    ? {
        ...(calculated.resolvedIdentity ?? {}),
        ...projected.resolvedIdentity,
        requestedCatalogWorkId:
          calculated.resolvedIdentity?.requestedCatalogWorkId ??
          projected.resolvedIdentity.requestedCatalogWorkId,
        passportId:
          calculated.resolvedIdentity?.passportId ?? projected.resolvedIdentity.passportId,
        calculationStrategyId:
          calculated.resolvedIdentity?.calculationStrategyId ??
          projected.resolvedIdentity.calculationStrategyId,
        selectedScope:
          calculated.resolvedIdentity?.selectedScope ?? projected.resolvedIdentity.selectedScope,
        scopePresetId:
          calculated.resolvedIdentity?.scopePresetId ?? projected.resolvedIdentity.scopePresetId,
        resolvedParameters: calculated.params,
      }
    : undefined;
  return {
    ...projected,
    source: calculated.source,
    professionalWorkId: calculated.professionalWorkId,
    workAssemblyId: calculated.workAssemblyId,
    roadScopeBinding: calculated.roadScopeBinding,
    quantityBasis: calculated.quantityBasis,
    workSpecificParameterSchemaId: calculated.workSpecificParameterSchemaId,
    workSpecificParameterSignature: calculated.workSpecificParameterSignature,
    applicableBoqSignature: calculated.applicableBoqSignature,
    rawInputFacts: calculated.rawInputFacts,
    rawInputFactMetrics: calculated.rawInputFactMetrics,
    params: calculated.params,
    assumptions: calculated.assumptions,
    missingInputs: calculated.missingInputs,
    professionalClarification: calculated.professionalClarification,
    electricalCircuitSchedule: calculated.electricalCircuitSchedule,
    trace: {
      ...calculated.trace,
      traceId: `canonical_backend_trace:${projected.revisionId}`,
      revisionId: projected.revisionId,
    },
    resolvedIdentity: resolvedIdentity
      ? {
          ...resolvedIdentity,
          checksum: resolvedEstimateIdentityChecksum(resolvedIdentity),
        }
      : undefined,
  };
}

function bindAuditRequestedCatalogWorkId(
  revision: EstimateDraftRevision,
  requestedCatalogWorkId: string,
): EstimateDraftRevision {
  if (!revision.resolvedIdentity) return revision;
  const identity = {
    ...revision.resolvedIdentity,
    requestedCatalogWorkId,
  };
  const { checksum: _previousChecksum, ...identityWithoutChecksum } = identity;
  return {
    ...revision,
    resolvedIdentity: {
      ...identityWithoutChecksum,
      checksum: resolvedEstimateIdentityChecksum(identityWithoutChecksum),
    },
  };
}

function parseAuditCanonicalValue(
  rawValue: string,
  valueType: "number" | "string" | "boolean",
): CanonicalParameterValue {
  const normalized = rawValue.trim();
  if (!normalized) throw new Error("CANONICAL_AUDIT_PARAMETER_VALUE_REQUIRED");
  if (valueType === "string") return normalized;
  if (valueType === "boolean") {
    const lower = normalized.toLocaleLowerCase("ru-RU");
    if (["true", "yes", "да"].includes(lower)) return true;
    if (["false", "no", "нет"].includes(lower)) return false;
    throw new Error(`CANONICAL_AUDIT_BOOLEAN_INVALID:${rawValue}`);
  }
  const parsed = Number(normalized.replace(/\s+/g, "").replace(",", "."));
  if (!Number.isFinite(parsed)) throw new Error(`CANONICAL_AUDIT_NUMBER_INVALID:${rawValue}`);
  return parsed;
}

function auditParameterCollectionDraft(input: {
  created: ConsumerRepairDraftBundle;
  aiDraft: ConsumerRepairAiDraft;
  candidateRevision: EstimateDraftRevision | null;
}): ConsumerRepairDraftBundle {
  const selectedCatalogWorkId =
    input.aiDraft.selectedWork?.selectedCatalogWorkId ??
    input.created.draft.selectedCatalogWorkId ??
    input.aiDraft.selectedWork?.selectedWorkKey ??
    input.created.draft.selectedWorkKey ??
    input.candidateRevision?.selectedTemplateId ??
    "";
  const selection = selectedCatalogWorkId
    ? resolveRegisteredProfessionalEstimateSelectionV1(selectedCatalogWorkId)
    : null;
  const canonicalWorkKey =
    selection?.work_key ??
    input.candidateRevision?.matchedFamily ??
    input.aiDraft.selectedWork?.selectedWorkKey ??
    input.created.draft.selectedWorkKey ??
    "";
  const schema = canonicalWorkKey
    ? REGISTERED_CANONICAL_PARAMETER_SCHEMAS.getByCanonicalWorkKey(canonicalWorkKey)
    : null;
  if (!schema) return input.created;
  const knownParameterIds = new Set(schema.definitions.map((definition) => definition.parameterId));
  const seeds: CanonicalParameterSeed[] = Object.entries(input.candidateRevision?.params ?? {})
    .filter(([parameterId]) => knownParameterIds.has(parameterId))
    .map(([parameterId, parameter]) => ({
      parameterId,
      value: parameter.value,
      source: parameter.source === "default_assumption" || parameter.source === "derived"
        ? "ASSUMED" as const
        : "TEXT_EXTRACTED" as const,
      confidence: parameter.source === "default_assumption" ? 0.55 : 0.95,
      assumption: parameter.source === "default_assumption" ? parameter.sourceText ?? null : null,
      sourceText: parameter.sourceText ?? null,
    }));
  const session = createCanonicalParameterSession({
    schema,
    draftId: input.created.draft.id,
    revisionId: `${input.created.draft.id}:audit-parameter-collection`,
    seeds,
    createdAt: input.created.draft.createdAt,
  });
  return saveConsumerRepairBundle({
    ...input.created,
    canonicalParameterSession: session,
  });
}

function createInitialAuditRevisionFromParameterCollection(input: {
  bundle: ConsumerRepairDraftBundle;
  patches: CanonicalConsumerRepairAuditParamPatch[];
  createdAt: string;
}): EstimateDraftRevision | null {
  const session = input.bundle.canonicalParameterSession;
  if (!session) return null;
  const schema = REGISTERED_CANONICAL_PARAMETER_SCHEMAS.getByCanonicalWorkKey(
    session.canonicalWorkKey,
  );
  if (!schema) return null;
  const definitions = new Map(schema.definitions.map((definition) => [definition.parameterId, definition]));
  const params: EstimateDraftRevision["params"] = Object.fromEntries(
    session.parameters.flatMap((parameter) =>
      parameter.value == null || !parameter.valid || parameter.source === "MISSING"
        ? []
        : [[parameter.parameterId, {
            value: parameter.value,
            ...(parameter.unit ? { canonicalUnit: parameter.unit } : {}),
            source: parameter.source === "ASSUMED" ? "default_assumption" as const : "user_input" as const,
            sourceText: parameter.sourceText ?? `canonical-session:${parameter.parameterId}`,
            lastChangedAt: input.createdAt,
          }]]
    ),
  );
  for (const patch of input.patches) {
    const definition = definitions.get(patch.paramKey);
    if (!definition) throw new Error(`CANONICAL_AUDIT_PARAMETER_NOT_REGISTERED:${patch.paramKey}`);
    if (patch.operation === "remove_param") {
      delete params[patch.paramKey];
      continue;
    }
    params[patch.paramKey] = {
      value: parseAuditCanonicalValue(patch.rawValue, definition.valueType),
      ...(definition.unit ? { canonicalUnit: definition.unit } : {}),
      source: "user_input",
      sourceText: patch.rawValue,
      lastChangedAt: input.createdAt,
    };
  }
  const selectedCatalogWorkId =
    input.bundle.draft.selectedCatalogWorkId ?? input.bundle.draft.selectedWorkKey ?? session.canonicalWorkKey;
  const selection = resolveRegisteredProfessionalEstimateSelectionV1(selectedCatalogWorkId);
  const revisionInput = {
    estimateDraftId: input.bundle.draft.id,
    rawInput:
      input.bundle.draft.problemText ?? input.bundle.draft.selectedWorkRawInput ?? session.canonicalWorkKey,
    selectedWorkKey: selection?.catalog_id ?? selectedCatalogWorkId,
    selectedTemplateId: selection?.template_id ?? selectedCatalogWorkId,
    selectedTemplateName: selection?.title_ru ?? input.bundle.draft.selectedWorkTitleRu,
    city: input.bundle.draft.city,
    currency: input.bundle.items[0]?.currency ?? "KGS",
    countryCode: "KG",
    paramOverrides: params,
    createdAt: input.createdAt,
  };
  const prebuiltExactDraft = selection?.domain_id === "interior_finishes"
    ? buildInteriorFinishesFromInlineInputV1(revisionInput).production?.draft ?? null
    : selection?.domain_id === "heating_ventilation"
      ? buildHvacFromInlineInputV1(revisionInput).production?.draft ?? null
      : null;
  const revision = createEstimateDraftRevision({
    ...revisionInput,
    ...(prebuiltExactDraft ? { prebuiltExactDraft } : {}),
  });
  return selection
    ? bindAuditRequestedCatalogWorkId(revision, selection.catalog_id)
    : revision;
}

function createRegisteredAuditRevisionAfterPatch(input: {
  bundle: ConsumerRepairDraftBundle;
  currentRevision: EstimateDraftRevision;
  patches: CanonicalConsumerRepairAuditParamPatch[];
  createdAt: string;
  revisionIndex: number;
}): EstimateDraftRevision | null {
  const selectedCatalogWorkId =
    input.currentRevision.resolvedIdentity?.requestedCatalogWorkId ??
    input.bundle.draft.selectedCatalogWorkId ??
    input.currentRevision.selectedTemplateId;
  const selection = resolveRegisteredProfessionalEstimateSelectionV1(selectedCatalogWorkId);
  if (!selection) return null;
  const definitions = new Map(
    selection.canonical_parameter_schema.definitions.map((definition) => [definition.parameterId, definition]),
  );
  const params: EstimateDraftRevision["params"] = { ...input.currentRevision.params };
  for (const patch of input.patches) {
    const definition = definitions.get(patch.paramKey);
    if (!definition) throw new Error(`CANONICAL_AUDIT_PARAMETER_NOT_REGISTERED:${patch.paramKey}`);
    if (patch.operation === "remove_param") {
      delete params[patch.paramKey];
      continue;
    }
    params[patch.paramKey] = {
      value: parseAuditCanonicalValue(patch.rawValue, definition.valueType),
      ...(definition.unit ? { canonicalUnit: definition.unit } : {}),
      source: "edited_by_user",
      sourceText: patch.rawValue,
      lastChangedAt: input.createdAt,
    };
  }
  const revisionInput = {
    rawInput: input.currentRevision.rawInput,
    selectedWorkKey: selection.catalog_id,
    selectedTemplateId: selection.template_id,
    selectedTemplateName: selection.title_ru,
    city: input.bundle.draft.city,
    currency: input.currentRevision.boq.rows[0]?.currency ?? "KGS",
    countryCode: "KG",
    paramOverrides: params,
  };
  const prebuiltExactDraft = selection.domain_id === "interior_finishes"
    ? buildInteriorFinishesFromInlineInputV1(revisionInput).production?.draft ?? null
    : selection.domain_id === "heating_ventilation"
      ? buildHvacFromInlineInputV1(revisionInput).production?.draft ?? null
      : null;
  if (!prebuiltExactDraft) return null;
  return bindAuditRequestedCatalogWorkId(createEstimateDraftRevision({
    ...revisionInput,
    estimateDraftId: input.bundle.draft.id,
    previousRevisionId: input.currentRevision.revisionId,
    source: input.patches.length === 1 ? "param_edit" : "param_batch",
    createdAt: input.createdAt,
    revisionIndex: input.revisionIndex,
    prebuiltExactDraft,
  }), selection.catalog_id);
}

function resolveInitialAuditRevision(input: {
  aiDraft: ConsumerRepairAiDraft;
  problemText?: string | null;
  city?: string | null;
}): EstimateDraftRevision | null {
  if (input.aiDraft.runtimeEstimateDraftRevision) {
    return input.aiDraft.runtimeEstimateDraftRevision;
  }
  const selectedWorkKey = input.aiDraft.selectedWork?.selectedWorkKey;
  if (!selectedWorkKey) return null;
  const common = {
    rawInput: input.problemText ?? input.aiDraft.summaryRu,
    selectedWorkKey,
    city: input.city,
    currency: input.aiDraft.items[0]?.currency ?? "KGS",
    countryCode: "KG",
    createdAt: "2026-07-05T00:00:00.000Z",
  };
  try {
    return createEstimateDraftRevision({
      ...common,
      prebuiltExactDraft: input.aiDraft,
    });
  } catch {
    try {
      return createEstimateDraftRevision(common);
    } catch {
      return null;
    }
  }
}

function hasUnresolvedExactAsphaltRequirements(
  aiDraft: ConsumerRepairAiDraft,
  revision: EstimateDraftRevision | null,
): boolean {
  if (!revision) return false;
  const profile = getAsphaltRelatedProfileByCatalogRecordIdV4(
    aiDraft.selectedWork?.selectedCatalogWorkId ??
    aiDraft.selectedWork?.selectedWorkKey ??
    revision.resolvedIdentity?.requestedCatalogWorkId ??
    revision.professionalWorkId ??
    revision.matchedFamily,
  );
  if (!profile) return false;
  return profile.requiredParameters.some((parameterId) => {
    const parameter = revision.params[parameterId];
    return !parameter || parameter.source === "default_assumption";
  });
}

function bindAuditItemsToRevision(input: {
  items: ConsumerRepairDraftBundle["items"];
  revisionId: string;
  releaseId: string;
  catalogId: string;
}): ConsumerRepairDraftBundle["items"] {
  return input.items.map((item, index) => ({
    ...item,
    sourceParameters: {
      ...(item.sourceParameters ?? {}),
      canonicalBackendRevisionId: input.revisionId,
      canonicalBackendReleaseId: input.releaseId,
      canonicalBackendCatalogId: input.catalogId,
      canonicalBackendRowId:
        item.sourceParameters?.rowCode ?? item.id ?? `canonical-audit-row-${index + 1}`,
      canonicalBackendOwnershipStatus: "OWNED",
      compilerOwner: "backend",
      estimateDraftRevisionId: input.revisionId,
    },
  }));
}

/**
 * Test/audit-only projection adapter for historical lifecycle proofs.
 *
 * Production compilation stays backend-only. This helper gives old proof
 * scenarios an explicit immutable backend revision identity instead of
 * reopening the removed in-process compiler path.
 */
export function bindCanonicalBackendAuditRevision(
  aiDraft: ConsumerRepairAiDraft,
  namespace: string,
): {
  aiDraft: ConsumerRepairAiDraft;
  revisionId: string;
  releaseId: string;
} {
  const payload = aiDraft.structuredEstimatePayload;
  const revisionId = deterministicUuid(
    `${namespace}:${payload?.fingerprint ?? aiDraft.repairType}:${auditItemFingerprint(aiDraft)}`,
  );
  const catalogId = String(
    payload?.canonicalBackend?.catalogId
      ?? aiDraft.selectedWork?.selectedCatalogWorkId
      ?? aiDraft.selectedWork?.selectedWorkKey
      ?? payload?.workKey
      ?? aiDraft.repairType,
  ).trim();
  const rowSources = aiDraft.items.map((item, index) => {
    const payloadRow = payload?.rows[index];
    const rowCode = String(
      item.sourceParameters?.rowCode ?? payloadRow?.code ?? `${namespace}:row:${index + 1}`,
    ).trim();
    return {
      ...item.sourceParameters,
      canonicalBackendRevisionId: revisionId,
      canonicalBackendReleaseId: AUDIT_RELEASE_ID,
      canonicalBackendCatalogId: catalogId,
      canonicalBackendRowId: payloadRow?.rowId ?? `${namespace}:row:${index + 1}`,
      canonicalBackendOwnershipStatus: "OWNED",
      compilerOwner: "backend",
      rowCode,
      rowSha256: createHash("sha256")
        .update(JSON.stringify(payloadRow ?? item))
        .digest("hex"),
    };
  });
  const canonicalPayload = payload
    ? {
        ...payload,
        rows: payload.rows.map((row, index) => ({
          ...row,
          sourceParameters: rowSources[index] ?? row.sourceParameters,
        })),
        canonicalBackend: {
          compilerOwner: "backend" as const,
          revisionId,
          parentRevisionId: payload.canonicalBackend?.revisionId ?? null,
          revisionNumber: (payload.canonicalBackend?.revisionNumber ?? 0) + 1,
          releaseId: AUDIT_RELEASE_ID,
          catalogId,
          createdAt: "2026-07-05T00:00:00.000Z",
          checksumSha256: createHash("sha256")
            .update(JSON.stringify({ namespace, revisionId, fingerprint: payload.fingerprint }))
            .digest("hex"),
          formulaGraphVersion: "canonical-audit-projection-v1",
          parameterSchemaHash: null,
          parameters: {},
        },
      }
    : undefined;
  return {
    revisionId,
    releaseId: AUDIT_RELEASE_ID,
    aiDraft: {
      ...aiDraft,
      // A canonical backend projection must never carry the retired local
      // mutable revision owner into createConsumerRepairRequestDraft.
      runtimeEstimateDraftRevision: undefined,
      structuredEstimatePayload: canonicalPayload,
      items: aiDraft.items.map((item, index) => ({
        ...item,
        sourceParameters: rowSources[index],
      })),
    },
  };
}

function selectedWorkFromBundle(bundle: ConsumerRepairDraftBundle): ConsumerRepairAiDraft["selectedWork"] {
  const draft = bundle.draft;
  if (!draft.selectedWorkKey || !draft.selectedWorkTitleRu) return undefined;
  return {
    selectedWorkKey: draft.selectedWorkKey,
    selectedWorkTitleRu: draft.selectedWorkTitleRu,
    selectedWorkCategoryKey: draft.selectedWorkCategoryKey ?? draft.repairType ?? draft.selectedWorkKey,
    selectedWorkCategoryTitleRu:
      draft.selectedWorkCategoryTitleRu ?? draft.repairType ?? draft.selectedWorkTitleRu,
    selectedWorkRawInput: draft.selectedWorkRawInput ?? draft.problemText ?? "",
    selectedWorkSource: "user_selected",
    selectedWorkResolverReGuessed: false,
    selectedCatalogWorkId: draft.selectedCatalogWorkId ?? undefined,
  };
}

/**
 * Turns an explicitly edited audit snapshot into a new immutable backend
 * child revision. The production legacy mutation endpoints remain closed;
 * callers must opt into this audit projection after completing the old UI
 * interaction they are proving.
 */
export function reprojectCanonicalConsumerRepairAuditDraft(
  bundle: ConsumerRepairDraftBundle,
  namespace = bundle.draft.consumerUserId,
): ConsumerRepairDraftBundle {
  const payload = bundle.structuredEstimatePayload ?? undefined;
  const titleRu = bundle.draft.title ?? bundle.draft.repairType ?? "Смета";
  const aiDraft: ConsumerRepairAiDraft = {
    titleRu,
    summaryRu: bundle.draft.problemText ?? titleRu,
    repairType: bundle.draft.repairType ?? payload?.workKey ?? "construction",
    selectedWork: selectedWorkFromBundle(bundle),
    estimatePresentation: payload?.presentation,
    structuredEstimatePayload: payload,
    electricalCircuitSchedule: bundle.electricalCircuitSchedule ?? undefined,
    items: bundle.items.map((item) => ({
      itemType: item.itemType,
      titleRu: item.titleRu,
      quantity: item.quantity ?? 0,
      unit: item.unit ?? "item",
      unitPrice: item.unitPrice,
      currency: item.currency,
      source: item.source,
      catalogItemId: item.catalogItemId,
      selectedCatalogItemId: item.selectedCatalogItemId,
      materialKey: item.materialKey,
      rateKey: item.rateKey,
      catalogBindingStatus: item.catalogBindingStatus,
      catalogCandidates: item.catalogCandidates,
      category: item.category,
      unitLabel: item.unitLabel,
      sourceId: item.sourceId,
      sourceLabel: item.sourceLabel,
      formulaId: item.formulaId,
      quantityFormula: item.quantityFormula,
      calculationTrace: item.calculationTrace,
      sourceParameters: item.sourceParameters,
      templateId: item.templateId,
      templateVersion: item.templateVersion,
      normId: item.normId,
      normFamilyId: item.normFamilyId,
      normSourceId: item.normSourceId,
      normSourceTitle: item.normSourceTitle,
      normVersion: item.normVersion,
      normReviewStatus: item.normReviewStatus,
      priceStatus: item.priceStatus,
      priceSource: item.priceSource,
      priceSourceId: item.priceSourceId,
      priceSourceLabel: item.priceSourceLabel,
      priceTrace: item.priceTrace,
      priceCandidates: item.priceCandidates,
      costConfidence: item.costConfidence,
      confidence: item.confidence,
      addedBy: item.addedBy,
    })),
    missingData: [],
    dangerousDiyBlocked: false,
  };
  const binding = bindCanonicalBackendAuditRevision(aiDraft, namespace);
  return upsertConsumerRepairCanonicalBackendDraft({
    requestDraftId: bundle.draft.id,
    consumerUserId: bundle.draft.consumerUserId,
    problemText: bundle.draft.problemText,
    city: bundle.draft.city,
    aiDraft: binding.aiDraft,
  });
}

export type CanonicalConsumerRepairAuditParamPatch = {
  operation: UserParamPatchOperation;
  paramKey: string;
  rawValue: string;
};

export function applyCanonicalConsumerRepairAuditParamBatchPatch(input: {
  requestDraftId: string;
  patches: CanonicalConsumerRepairAuditParamPatch[];
  userId?: string;
  createdAt?: string;
  auditEventType?: "estimate_params_batch_recalculated" | "estimate_params_recalculated";
}): ConsumerRepairDraftBundle {
  const bundle = getConsumerRepairRequest(input.requestDraftId);
  const userId = input.userId ?? bundle.draft.consumerUserId;
  if (userId !== bundle.draft.consumerUserId) {
    throw new ConsumerRepairValidationError([{
      code: "OWNER_MISMATCH",
      messageRu: "Изменить параметры сметы может только владелец заявки.",
      field: "userId",
    }]);
  }
  if (input.patches.length === 0) {
    throw new ConsumerRepairValidationError([{
      code: "ESTIMATE_PARAM_BATCH_EMPTY",
      messageRu: "Не выбраны параметры для пересчёта сметы.",
      field: "patches",
    }]);
  }
  const state = bundle.estimateDraftRevisionState;
  const currentRevision = state?.revisions.find((revision) =>
    revision.revisionId === state.currentRevisionId
  );
  if (!state || !currentRevision) {
    const createdAt = input.createdAt ?? new Date().toISOString();
    const initialRevision = createInitialAuditRevisionFromParameterCollection({
      bundle,
      patches: input.patches,
      createdAt,
    });
    if (!initialRevision || initialRevision.status !== "draft_ready" || initialRevision.boq.rows.length === 0) {
      throw new ConsumerRepairValidationError([{
        code: "ESTIMATE_REVISION_STATE_RECOVERY_REQUIRED",
        messageRu: `Для пересчёта нужна сохранённая backend revision: ${[
          initialRevision?.status ?? "missing",
          initialRevision?.boq.rows.length ?? 0,
          initialRevision?.missingInputs.map((item) => item.key).join(",") ?? "",
          initialRevision?.selectedTemplateId ?? "",
          initialRevision?.resolvedIdentity?.requestedCatalogWorkId ?? "",
        ].join(":")}.`,
        field: [
          "estimateDraftRevisionState",
          initialRevision?.status ?? "missing",
          initialRevision?.boq.rows.length ?? 0,
          initialRevision?.missingInputs.map((item) => item.key).join(",") ?? "",
          initialRevision?.selectedTemplateId ?? "",
          initialRevision?.resolvedIdentity?.requestedCatalogWorkId ?? "",
        ].join(":"),
      }]);
    }
    const revisionId = deterministicUuid(
      `canonical-audit-initial:${bundle.draft.id}:${initialRevision.revisionId}`,
    );
    const releaseId = AUDIT_RELEASE_ID;
    const catalogId =
      initialRevision.resolvedIdentity?.requestedCatalogWorkId ?? initialRevision.selectedTemplateId;
    const items = bindAuditItemsToRevision({
      items: createConsumerRepairItemsFromDraftRevision(bundle.draft.id, initialRevision),
      revisionId,
      releaseId,
      catalogId,
    });
    const payload = auditPayloadForRevision({
      revision: initialRevision,
      revisionId,
      releaseId,
      parentRevisionId: null,
      revisionNumber: 1,
      createdAt,
    });
    const nextBundle: ConsumerRepairDraftBundle = {
      ...bundle,
      draft: {
        ...bundle.draft,
        status: "draft",
        approvedAt: null,
        updatedAt: createdAt,
        problemText: initialRevision.rawInput,
        missingData: [],
        marketplaceReadyAt: null,
        marketplaceValidationErrors: [],
      },
      items,
      pdfs: bundle.pdfs.map((pdf) =>
        pdf.pdfStatus === "generated" ? { ...pdf, pdfStatus: "archived" as const } : pdf
      ),
      structuredEstimatePayload: payload,
      estimateRevisionState: undefined,
      editableEstimateSnapshot: undefined,
      canonicalParameterSession: null,
      estimateDraftSession: null,
      marketplaceLink: {
        ...bundle.marketplaceLink,
        marketplaceDemandId: null,
        status: "not_sent",
        idempotencyKey: null,
        sentAt: null,
      },
      events: [
        ...bundle.events,
        createConsumerRepairEvent({
          requestDraftId: bundle.draft.id,
          actorUserId: userId,
          eventType: input.auditEventType ?? "estimate_params_batch_recalculated",
          payload: {
            initialRevisionCreated: true,
            patchCount: input.patches.length,
            rowsBefore: 0,
            rowsAfter: initialRevision.boq.rows.length,
            previousRevisionId: null,
            revisionId,
          },
        }),
      ],
    };
    const projected = appendCanonicalBackendRevisionProjection({
      previousBundle: bundle,
      nextBundle,
      payload,
    });
    const projectedState = projected.estimateDraftRevisionState;
    const saved = saveConsumerRepairBundle(projectedState
      ? {
          ...projected,
          estimateDraftRevisionState: {
            ...projectedState,
            revisions: projectedState.revisions.map((revision) =>
              revision.revisionId === projectedState.currentRevisionId
                ? restoreAuditCalculationSemantics(revision, initialRevision)
                : revision
            ),
          },
        }
      : projected);
    return ensureConsumerRepairBundleEstimateRevisionState(saved);
  }
  const createdAt = input.createdAt ?? new Date().toISOString();
  const registeredRevision = createRegisteredAuditRevisionAfterPatch({
    bundle,
    currentRevision,
    patches: input.patches,
    createdAt,
    revisionIndex: state.revisions.length + 1,
  });
  const result = registeredRevision
    ? {
        revision: registeredRevision,
        diff: compareEstimateDraftRevisions(currentRevision, registeredRevision),
      }
    : applyAiEstimateParameterBatchOverride({
        revision: currentRevision,
        patches: input.patches,
        createdAt,
        city: bundle.draft.city,
        currency: currentRevision.boq.rows[0]?.currency ?? "KGS",
        countryCode: "KG",
        revisionIndex: state.revisions.length + 1,
      });
  const revisionId = deterministicUuid(
    `canonical-audit-child:${bundle.draft.id}:${result.revision.revisionId}`,
  );
  const releaseId = String(
    bundle.items[0]?.sourceParameters?.canonicalBackendReleaseId ?? AUDIT_RELEASE_ID,
  ).trim() || AUDIT_RELEASE_ID;
  const catalogId = result.revision.selectedTemplateId;
  const items = bindAuditItemsToRevision({
    items: createConsumerRepairItemsFromDraftRevision(bundle.draft.id, result.revision),
    revisionId,
    releaseId,
    catalogId,
  });
  const payload = auditPayloadForRevision({
    revision: result.revision,
    revisionId,
    releaseId,
    parentRevisionId: state.currentRevisionId,
    revisionNumber:
      Math.max(0, ...state.revisions.map((revision) => revision.canonicalRevisionNumber ?? 0)) + 1,
    createdAt,
  });
  const nextBundle: ConsumerRepairDraftBundle = {
    ...bundle,
    draft: {
      ...bundle.draft,
      status: "draft",
      approvedAt: null,
      updatedAt: createdAt,
      problemText: result.revision.rawInput,
      missingData: [
        ...result.revision.missingInputs.map((item) => item.label),
        ...result.revision.assumptions
          .filter((assumption) => !assumption.replacedByUserInput)
          .map((assumption) => assumption.reason),
      ],
      marketplaceReadyAt: null,
      marketplaceValidationErrors: [],
    },
    items,
    pdfs: bundle.pdfs.map((pdf) =>
      pdf.pdfStatus === "generated" ? { ...pdf, pdfStatus: "archived" as const } : pdf
    ),
    structuredEstimatePayload: bundle.structuredEstimatePayload
      ? {
          ...bundle.structuredEstimatePayload,
          canonicalBackend: payload.canonicalBackend,
        }
      : bundle.structuredEstimatePayload,
    estimateRevisionState: undefined,
    editableEstimateSnapshot: undefined,
    canonicalParameterSession: null,
    estimateDraftSession: null,
    marketplaceLink: {
      ...bundle.marketplaceLink,
      marketplaceDemandId: null,
      status: "not_sent",
      idempotencyKey: null,
      sentAt: null,
    },
    events: [
      ...bundle.events,
      createConsumerRepairEvent({
        requestDraftId: bundle.draft.id,
        actorUserId: userId,
        eventType: input.auditEventType ?? "estimate_params_batch_recalculated",
        payload: {
          patchCount: input.patches.length,
          rowsBefore: currentRevision.boq.rows.length,
          rowsAfter: result.revision.boq.rows.length,
          previousRevisionId: currentRevision.revisionId,
          revisionId,
        },
      }),
    ],
  };
  const projected = appendCanonicalBackendRevisionProjection({
    previousBundle: bundle,
    nextBundle,
    payload,
  });
  const projectedState = projected.estimateDraftRevisionState;
  if (projectedState?.revisions.length !== state.revisions.length + 1) {
    throw new Error(`CANONICAL_AUDIT_CHILD_REVISION_NOT_APPENDED:${[
      state.currentRevisionId,
      revisionId,
      state.revisions.length,
      projectedState?.revisions.length ?? 0,
      state.revisions.map((revision) => revision.revisionId).join(","),
      projectedState?.revisions.map((revision) => revision.revisionId).join(",") ?? "",
    ].join(":")}`);
  }
  const saved = saveConsumerRepairBundle(projectedState
    ? {
        ...projected,
        estimateDraftRevisionState: {
          ...projectedState,
          revisions: projectedState.revisions.map((revision) =>
            revision.revisionId === projectedState.currentRevisionId
              ? restoreAuditCalculationSemantics(revision, result.revision)
              : revision
          ),
        },
      }
    : projected);
  if (saved.estimateDraftRevisionState?.revisions.length !== state.revisions.length + 1) {
    throw new Error(`CANONICAL_AUDIT_CHILD_REVISION_NOT_PERSISTED:${[
      state.currentRevisionId,
      revisionId,
      state.revisions.length,
      saved.estimateDraftRevisionState?.revisions.length ?? 0,
      projectedState.revisions.map((revision) => revision.resolvedIdentity?.compilerVersion).join(","),
    ].join(":")}`);
  }
  return ensureConsumerRepairBundleEstimateRevisionState(saved);
}

export function applyCanonicalConsumerRepairAuditParamPatch(input: {
  requestDraftId: string;
  operation: UserParamPatchOperation;
  paramKey: string;
  rawValue: string;
  userId?: string;
  createdAt?: string;
}): ConsumerRepairDraftBundle {
  return applyCanonicalConsumerRepairAuditParamBatchPatch({
    requestDraftId: input.requestDraftId,
    patches: [{
      operation: input.operation,
      paramKey: input.paramKey,
      rawValue: input.rawValue,
    }],
    userId: input.userId,
    createdAt: input.createdAt,
    auditEventType: "estimate_params_recalculated",
  });
}

function hasCurrentCanonicalProjection(bundle: ConsumerRepairDraftBundle): boolean {
  if (bundle.items.length === 0) return false;
  const revisionIds = new Set(bundle.items.map((item) =>
    String(item.sourceParameters?.canonicalBackendRevisionId ?? "").trim()
  ));
  const releaseIds = new Set(bundle.items.map((item) =>
    String(item.sourceParameters?.canonicalBackendReleaseId ?? "").trim()
  ));
  if (revisionIds.size !== 1 || releaseIds.size !== 1) return false;
  const revisionId = [...revisionIds][0];
  const releaseId = [...releaseIds][0];
  if (!revisionId || !releaseId) return false;
  const projectedState = bundle.estimateDraftRevisionState;
  // Some historical fixture families have no StructuredEstimatePayload and
  // therefore no compatibility calculation projection. Their backend row
  // identity is still complete and is exactly what the production approval
  // guard validates.
  return !projectedState || projectedState.currentRevisionId === revisionId;
}

export function createCanonicalConsumerRepairAuditDraft(
  input: Parameters<typeof createConsumerRepairRequestDraft>[0],
  namespace = input.consumerUserId,
): ConsumerRepairDraftBundle {
  if (!input.aiDraft) throw new Error("CANONICAL_AUDIT_AI_DRAFT_REQUIRED");
  const binding = bindCanonicalBackendAuditRevision(input.aiDraft, namespace);
  const candidateRevision = !input.aiDraft.structuredEstimatePayload
    ? resolveInitialAuditRevision({
        aiDraft: input.aiDraft,
        problemText: input.problemText,
        city: input.city,
      })
    : null;
  // Infrastructure audits may supply an already resolved normative row set
  // without a frontend runtime revision. Bind that immutable fixture directly
  // to an audit backend identity; preliminary runtime revisions still have a
  // candidateRevision and must complete their required parameters first.
  if (
    !input.aiDraft.structuredEstimatePayload &&
    !candidateRevision &&
    input.aiDraft.items.length > 0 &&
    input.aiDraft.missingData.length === 0
  ) {
    return createConsumerRepairRequestDraft({
      ...input,
      aiDraft: binding.aiDraft,
    });
  }
  const runtimeRevision = candidateRevision?.status === "draft_ready" &&
      candidateRevision.boq.rows.length > 0 &&
      !hasUnresolvedExactAsphaltRequirements(input.aiDraft, candidateRevision)
    ? candidateRevision
    : null;
  if (!input.aiDraft.structuredEstimatePayload && !runtimeRevision) {
    const created = createConsumerRepairRequestDraft({
      ...input,
      pendingRoadScopeSelection: null,
      aiDraft: {
        ...input.aiDraft,
        runtimeEstimateDraftRevision: undefined,
        items: [],
      },
    });
    return auditParameterCollectionDraft({
      created,
      aiDraft: input.aiDraft,
      candidateRevision,
    });
  }
  if (runtimeRevision) {
    const created = createConsumerRepairRequestDraft({
      ...input,
      aiDraft: binding.aiDraft,
    });
    const payload = auditPayloadForRevision({
      revision: runtimeRevision,
      revisionId: binding.revisionId,
      releaseId: binding.releaseId,
      parentRevisionId: null,
      revisionNumber: 1,
      createdAt: runtimeRevision.createdAt ?? "2026-07-05T00:00:00.000Z",
    });
    const projected = appendCanonicalBackendRevisionProjection({
      previousBundle: null,
      nextBundle: created,
      payload,
    });
    const projectedState = projected.estimateDraftRevisionState;
    if (!projectedState) return saveConsumerRepairBundle(projected);
    const revisions = projectedState.revisions.map((revision) => {
      if (revision.revisionId !== projectedState.currentRevisionId) return revision;
      return restoreAuditCalculationSemantics(revision, runtimeRevision);
    });
    const saved = saveConsumerRepairBundle({
      ...projected,
      estimateDraftRevisionState: {
        ...projectedState,
        revisions,
      },
    });
    return ensureConsumerRepairBundleEstimateRevisionState(saved);
  }
  let bundle = upsertConsumerRepairCanonicalBackendDraft({
    consumerUserId: input.consumerUserId,
    problemText: input.problemText,
    city: input.city,
    aiDraft: binding.aiDraft,
  });
  bundle = updateConsumerRepairRequestDraft({
    requestDraftId: bundle.draft.id,
    patch: {
      repairType: input.repairType ?? binding.aiDraft.repairType,
      addressText: input.addressText,
      preferredTimeText: input.preferredTimeText,
      contactPhone: input.contactPhone,
    },
  });
  return bundle;
}

export function approveCanonicalConsumerRepairAuditDraft(input: {
  bundle: ConsumerRepairDraftBundle;
  userId?: string;
  generatedAt?: string;
}): ConsumerRepairDraftBundle {
  const projectedBundle = hasCurrentCanonicalProjection(input.bundle)
    ? input.bundle
    : reprojectCanonicalConsumerRepairAuditDraft(input.bundle);
  const userId = input.userId ?? projectedBundle.draft.consumerUserId;
  const firstItem = projectedBundle.items[0];
  const revisionId = String(firstItem?.sourceParameters?.canonicalBackendRevisionId ?? "").trim();
  const releaseId = String(firstItem?.sourceParameters?.canonicalBackendReleaseId ?? "").trim();
  if (!revisionId || !releaseId) throw new Error("CANONICAL_AUDIT_REVISION_BINDING_MISSING");

  const withPdf = generateConsumerRepairRequestPdfForDraft({
    requestDraftId: projectedBundle.draft.id,
    userId,
    generatedAt: input.generatedAt,
  });
  const pdf = withPdf.pdfs[0];
  if (!pdf) throw new Error("CANONICAL_AUDIT_PDF_MISSING");

  const approved = approveConsumerRepairRequestDraft({
    requestDraftId: withPdf.draft.id,
    userId,
    generatedAt: input.generatedAt,
    canonicalArtifact: {
      artifactId: pdf.id,
      revisionId,
      releaseId,
      status: "ready",
      sha256: null,
    },
  });
  // Historical audit runners still inspect the compatibility snapshot shape.
  // Recreate that read-only view after the canonical bundle has been saved;
  // never persist it back over the backend-owned calculation state.
  const compatibility = freezeConsumerRepairEstimateRevision({
    bundle: ensureConsumerRepairBundleEstimateRevisionState(approved),
    actor_id: userId,
    created_at: input.generatedAt,
  });
  const revision = compatibility.estimateRevisionState?.revisions.find(
    (candidate) => candidate.revision_id === compatibility.estimateRevisionState?.current_revision_id,
  );
  if (!revision) return compatibility;
  const canonicalRevisionId = String(
    compatibility.items[0]?.sourceParameters?.canonicalBackendRevisionId ?? "",
  ).trim();
  if (canonicalRevisionId && approved.pdfs[0]?.revisionId === canonicalRevisionId) {
    return {
      ...compatibility,
      pdfs: approved.pdfs,
    };
  }
  return {
    ...compatibility,
    pdfs: compatibility.pdfs.map((candidate, index) => index === 0
      ? candidate.revisionId === canonicalRevisionId
        ? candidate
        : {
          ...candidate,
          revisionId: revision.revision_id,
          snapshotId: revision.snapshot_id,
          revisionRowsHash: revision.rows_hash,
          revisionTotalsHash: revision.totals_hash,
          revisionFullSnapshotHash: revision.full_snapshot_hash,
        }
      : candidate),
  };
}

/** Drop-in audit migration for historical callers that only retained an id. */
export function approveCanonicalConsumerRepairAuditRequest(input: {
  requestDraftId: string;
  userId?: string;
  generatedAt?: string;
}): ConsumerRepairDraftBundle {
  return approveCanonicalConsumerRepairAuditDraft({
    bundle: getConsumerRepairRequest(input.requestDraftId),
    userId: input.userId,
    generatedAt: input.generatedAt,
  });
}

export function sendCanonicalConsumerRepairAuditDraft(input: {
  bundle: ConsumerRepairDraftBundle;
  userId?: string;
  generatedAt?: string;
  idempotencyKey?: string;
}): ConsumerRepairDraftBundle {
  const approved = input.bundle.draft.status === "consumer_approved"
    ? input.bundle
    : approveCanonicalConsumerRepairAuditDraft(input);
  const userId = input.userId ?? approved.draft.consumerUserId;
  const revisionId = String(
    approved.items[0]?.sourceParameters?.canonicalBackendRevisionId ?? "",
  ).trim();
  const releaseId = String(
    approved.items[0]?.sourceParameters?.canonicalBackendReleaseId ?? "",
  ).trim();
  if (!revisionId || !releaseId) throw new Error("CANONICAL_AUDIT_REVISION_BINDING_MISSING");
  return sendConsumerRepairRequestToMarketplace({
    requestDraftId: approved.draft.id,
    userId,
    idempotencyKey: input.idempotencyKey,
    canonicalArtifact: {
      artifactId: `audit_procurement_${deterministicUuid(`${approved.draft.id}:${revisionId}`)}`,
      kind: "procurement",
      revisionId,
      releaseId,
      status: "ready",
      sha256: createHash("sha256")
        .update(`${approved.draft.id}:${revisionId}:${releaseId}:procurement`)
        .digest("hex"),
    },
  });
}
