import {
  bindEstimateRevisionCalculationState,
  getBoundEstimateRevisionCalculationState,
  getCurrentEstimateRevision,
  stableEstimateRevisionHash,
} from "../ai/estimateRevisions";
import type { EditableEstimateRow } from "../ai/editableEstimate";
import type {
  EstimateDraftRevision,
  EstimateDraftRevisionParam,
  EstimateDraftRevisionState,
  ProfessionalBoqRow,
} from "../estimate/estimateDraftRevisionContract";
import { resolvedEstimateIdentityChecksum } from "../estimate/resolvedEstimateIdentityChecksum";
import type { ConsumerRepairDraftBundle } from "./consumerRequestTypes";

export const EXACT_ROADWORKS_CALCULATION_STATE_MIGRATION_VERSION =
  "exact-roadworks-canonical-snapshot-to-calculation-state-v1" as const;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function calculationRowType(row: EditableEstimateRow): ProfessionalBoqRow["rowType"] {
  const category = row.category?.trim().toLocaleLowerCase("en-US");
  if (category === "labor" || category === "equipment" || category === "transport") return category;
  if (category === "material" || category === "service" || category === "document" || category === "other") {
    return category;
  }
  return row.rowType;
}

function calculationRow(row: EditableEstimateRow): ProfessionalBoqRow {
  const source = row.sourceParameters ?? {};
  return {
    rowId: typeof source.rowCode === "string" && source.rowCode.trim()
      ? source.rowCode.trim()
      : row.rowId,
    rowType: calculationRowType(row),
    titleRu: row.titleRu,
    quantity: row.quantity ?? 0,
    unit: row.unit ?? "unit",
    unitLabel: row.unitLabel ?? null,
    unitPrice: row.unitPrice ?? null,
    currency: row.currency,
    category: row.category ?? null,
    sourceId: row.sourceId ?? null,
    sourceLabel: row.sourceLabel ?? null,
    formulaId: row.formulaId ?? null,
    quantityFormula: row.quantityFormula ?? null,
    calculationTrace: row.calculationTrace ?? null,
    sourceParameters: row.sourceParameters ?? null,
    templateId: row.templateId ?? null,
    templateVersion: row.templateVersion ?? null,
    normId: row.normId ?? null,
    normFamilyId: row.normFamilyId ?? null,
    normSourceId: row.normSourceId ?? null,
    normSourceTitle: row.normSourceTitle ?? null,
    normVersion: row.normVersion ?? null,
    normReviewStatus: row.normReviewStatus ?? null,
    priceStatus: row.priceStatus,
    priceSource: row.priceSource,
    priceSourceId: row.priceSourceId ?? null,
    priceSourceLabel: row.priceSourceLabel ?? null,
    materialKey: row.materialKey ?? null,
    rateKey: row.rateKey ?? null,
    includedInProcurement: source.includedInProcurement === true,
    costingMode: null,
    costTreatment: null,
    costOwnershipId: null,
    payable: typeof source.payable === "boolean" ? source.payable : null,
  };
}

/**
 * One-way adapter for historical prepared bundles whose immutable canonical
 * snapshot survived but whose old calculation-state compatibility field did
 * not. It projects the exact Roadworks state from snapshot metadata and never
 * invokes prompt parsing, generic routing, or the estimate compiler.
 */
export function migrateExactRoadworksCalculationStateFromCanonicalSnapshot(
  bundle: ConsumerRepairDraftBundle,
): EstimateDraftRevisionState | null {
  const canonicalState = bundle.estimateRevisionState;
  if (!canonicalState || getBoundEstimateRevisionCalculationState(canonicalState)) return null;
  const canonicalRevision = getCurrentEstimateRevision(canonicalState);
  const sourceRow = canonicalRevision.editable_estimate_snapshot.rows.find(
    (row) => row.sourceParameters?.roadworksWaveA === true,
  );
  const source = sourceRow?.sourceParameters ?? null;
  if (!source) return null;
  const workKey = [
    source.requestedCatalogWorkId,
    source.selectedWorkId,
    canonicalRevision.selected_work_key,
    bundle.draft.selectedWorkKey,
  ].find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim();
  const parameterSnapshot = record(source.parameterSnapshot);
  const parameterMetadata = record(source.roadworksWaveAParameterMetadata);
  const passportId = nonEmptyString(source.professionalEstimatePassportId)
    ?? nonEmptyString(source.semanticOwner);
  const calculationProfileId = nonEmptyString(source.calculationProfileId);
  const canonicalModelId = nonEmptyString(source.canonicalModelId);
  const canonicalModelVersion = nonEmptyString(source.canonicalModelVersion);
  const migrationVersion = nonEmptyString(source.migrationVersion)
    ?? nonEmptyString(source.parameterSchemaVersion);
  const parameterSchemaId = nonEmptyString(source.parameterSchemaId);
  if (
    !workKey || !parameterSnapshot || !parameterMetadata || !passportId ||
    !calculationProfileId || !canonicalModelId || !canonicalModelVersion ||
    !migrationVersion || !parameterSchemaId
  ) return null;
  const selectedTemplateId = sourceRow?.templateId?.trim()
    || nonEmptyString(source.inlineWorkPromptTemplateId);
  if (!selectedTemplateId) return null;

  const assumptionKeys = new Set(strings(source.assumptionKeys));
  const createdAt = canonicalRevision.created_at;
  const params: Record<string, EstimateDraftRevisionParam> = {};
  for (const [key, value] of Object.entries(parameterSnapshot)) {
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") continue;
    const metadata = record(parameterMetadata[key]);
    if (!metadata) continue;
    params[key] = {
      value,
      ...(typeof metadata.unit === "string" && metadata.unit.trim()
        ? { canonicalUnit: metadata.unit.trim() }
        : {}),
      source: assumptionKeys.has(key) ? "default_assumption" : "user_input",
      sourceText: assumptionKeys.has(key)
        ? `${String(metadata.defaultSourceId ?? "roadworks-wave-a-versioned-defaults")}:${String(metadata.defaultSourceVersion ?? migrationVersion)}`
        : EXACT_ROADWORKS_CALCULATION_STATE_MIGRATION_VERSION,
      lastChangedAt: createdAt,
    };
  }

  const rows = canonicalRevision.editable_estimate_snapshot.rows.map(calculationRow);
  const revisionId = `calculation_migration:${canonicalRevision.revision_id}`;
  const assumptions = [...assumptionKeys].map((key) => ({
    key,
    value: params[key]?.value ?? null,
    reason: `Versioned exact-work default recovered from canonical snapshot: ${key}`,
    replacedByUserInput: false,
    visibleToUser: true as const,
  }));
  const missingInputs = [...assumptionKeys].flatMap((key) => {
    const metadata = record(parameterMetadata[key]);
    return metadata?.tier === "P0"
      ? [{
          key,
          label: typeof metadata.labelRu === "string" ? metadata.labelRu : key,
          blocksPreliminaryEstimate: true,
          requiredFor: "contract_ready" as const,
        }]
      : [];
  });
  const sectionsByCategory = new Map<string, string[]>();
  for (const row of rows) {
    const category = row.category ?? row.rowType;
    sectionsByCategory.set(category, [...(sectionsByCategory.get(category) ?? []), row.rowId]);
  }
  const formulaGraphVersion = typeof source.formulaGraphId === "string"
    ? source.formulaGraphId
    : migrationVersion;
  const identityWithoutChecksum = {
    requestedCatalogWorkId: workKey,
    passportId: typeof source.professionalEstimatePassportId === "string"
      ? source.professionalEstimatePassportId
      : passportId,
    passportVersion: typeof source.professionalEstimatePassportVersion === "string"
      ? source.professionalEstimatePassportVersion
      : migrationVersion,
    parameterSchemaId,
    parameterSchemaVersion: migrationVersion,
    calculationStrategyId: calculationProfileId,
    calculationProfileId,
    calculationProfileVersion: typeof source.calculationProfileVersion === "string"
      ? source.calculationProfileVersion
      : migrationVersion,
    canonicalModelId,
    canonicalModelVersion,
    selectedScope: nonEmptyString(source.scopeProfile),
    scopePresetId: nonEmptyString(source.scopePresetId),
    resolvedParameters: params,
    formulaGraphVersion,
    normativeCompositionId: nonEmptyString(source.normativeCompositionId) ?? undefined,
    semanticFingerprint: nonEmptyString(source.semanticFingerprint) ?? undefined,
    compilerVersion: EXACT_ROADWORKS_CALCULATION_STATE_MIGRATION_VERSION,
    sourceBindingVersions: [],
    semanticOwner: passportId,
    originalPrompt: bundle.draft.selectedWorkRawInput ?? bundle.draft.problemText ?? workKey,
    legacyFallbackUsed: false,
    fallbackReason: null,
    projectionOwner: "estimate_draft_revision" as const,
  };
  const revision: EstimateDraftRevision = {
    estimateDraftId: bundle.draft.id,
    revisionId,
    createdAt,
    previousRevisionId: null,
    source: "initial_prompt",
    rawInput: identityWithoutChecksum.originalPrompt,
    selectedTemplateId,
    matchedFamily: workKey,
    professionalWorkId: workKey,
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
          formulaTrace: EXACT_ROADWORKS_CALCULATION_STATE_MIGRATION_VERSION,
          assumptionIds: [...assumptionKeys],
        }
      : null,
    workSpecificParameterSchemaId: parameterSchemaId,
    workSpecificParameterSignature: Object.keys(parameterMetadata),
    applicableBoqSignature: stableEstimateRevisionHash(rows.map((row) => [row.rowId, row.quantity, row.unit])),
    legacyRowsCount: 0,
    estimateLevel: missingInputs.length > 0 ? "NEEDS_INPUT" : "SOURCE_BACKED_PROFESSIONAL_BOQ",
    rawInputFacts: [],
    rawInputFactMetrics: {
      explicit_input_facts_ignored: 0,
      explicit_input_unit_mismatches: 0,
      explicit_input_facts_overwritten_by_default: 0,
    },
    params,
    assumptions,
    missingInputs,
    professionalClarification: null,
    boq: {
      sections: [...sectionsByCategory].map(([category, rowIds]) => ({
        id: `migration_section:${category}`,
        title: category,
        rowIds,
      })),
      rows,
    },
    trace: {
      traceId: `trace:${revisionId}`,
      revisionId,
      selectedTemplateId,
      params: Object.entries(params).map(([key, param]) => ({
        key,
        value: param.value,
        canonicalUnit: param.canonicalUnit,
        source: param.source,
        affectsRowIds: rows
          .filter((row) => strings(row.sourceParameters?.affectedBy).includes(key))
          .map((row) => row.rowId),
      })),
      rows: rows.map((row) => ({
        rowId: row.rowId,
        formulaId: row.formulaId,
        quantityFormula: row.quantityFormula,
        calculationTrace: row.calculationTrace,
        resultQuantity: row.quantity,
        sourceParamKeys: strings(row.sourceParameters?.affectedBy),
      })),
      staleTraceAccepted: false,
    },
    status: missingInputs.length > 0 ? "blocking_required" : "draft_ready",
    artifacts: {
      snapshotId: canonicalRevision.snapshot_id,
      pdfArtifactId: null,
      buyerHandoffId: null,
      artifactsValidForRevisionId: revisionId,
    },
  };
  return {
    estimateDraftId: bundle.draft.id,
    currentRevisionId: revisionId,
    revisions: [revision],
    diffs: [],
  };
}

export function ensureExactRoadworksCalculationStateBinding(
  bundle: ConsumerRepairDraftBundle,
): ConsumerRepairDraftBundle {
  if (getBoundEstimateRevisionCalculationState(bundle.estimateRevisionState)) return bundle;
  const migrated = migrateExactRoadworksCalculationStateFromCanonicalSnapshot(bundle);
  if (!migrated || !bundle.estimateRevisionState) return bundle;
  const estimateRevisionState = bindEstimateRevisionCalculationState(
    bundle.estimateRevisionState,
    migrated,
  );
  return {
    ...bundle,
    estimateRevisionState,
    estimateDraftRevisionState: migrated,
  };
}

export function getConsumerRepairCalculationStateForReadOnlyDisplay(
  bundle: ConsumerRepairDraftBundle | null | undefined,
): EstimateDraftRevisionState | null {
  if (!bundle) return null;
  return bundle.estimateDraftRevisionState
    ?? getBoundEstimateRevisionCalculationState(bundle.estimateRevisionState)
    ?? migrateExactRoadworksCalculationStateFromCanonicalSnapshot(bundle);
}
