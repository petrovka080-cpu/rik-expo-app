import { createSnapshotFromDraftRevision } from "../../features/estimates/createSnapshotFromDraftRevision";
import { renderPdfFromDraftRevision } from "../../features/pdf/renderPdfFromDraftRevision";
import { createBuyerHandoffFromDraftRevision } from "../../features/procurement/createBuyerHandoffFromDraftRevision";
import {
  createEstimateDraftRevision,
  resolvedEstimateIdentityChecksum,
} from "./createEstimateDraftRevision";
import { buildEstimateReplayRecord } from "./buildEstimateReplayRecord";
import { compareEstimateReplayRecords } from "./compareEstimateReplayResult";
import type {
  AnyEstimateReplayRecord,
  EstimateReplayComparison,
  EstimateReplayRecord,
  LegacyEstimateReplayRecord,
} from "./replayableEstimateCoreContract";

export type LegacyReplayMigrationEvidence = {
  mode: "LEGACY_REPLAY_MIGRATION";
  registryVersion: typeof LEGACY_REPLAY_COMPATIBILITY_REGISTRY_VERSION;
  sourceRecordId: string;
  historicalRecordMutated: false;
  attemptedSelectors: string[];
  matchedSelector: string | null;
  hashesVerified: boolean;
  structuralCountersVerified: boolean;
  semanticOwnerMatched: boolean | null;
  manualPricesTransfer: "NOT_PRESENT" | "TRANSFERRED" | "REJECTED_SEMANTIC_OWNER_MISMATCH";
  unmatchedRows: string[];
  canonicalRevisionCreated: boolean;
  canonicalRecordId: string | null;
  status: "MIGRATED" | "FAILED";
  failureCode: "LEGACY_REPLAY_UNSAFE_MIGRATION" | null;
};

export type EstimateReplayRunResult = {
  expected: AnyEstimateReplayRecord;
  actual: EstimateReplayRecord;
  comparison: EstimateReplayComparison;
  replayMode: "CANONICAL_RESOLVED_IDENTITY" | "LEGACY_REPLAY_MIGRATION";
  newRevisionPromptFallbackUsed: false;
  legacyMigrationEvidence: LegacyReplayMigrationEvidence | null;
  replay_runner_created: true;
};

export const LEGACY_REPLAY_COMPATIBILITY_REGISTRY_VERSION =
  "legacy-replay-compatibility-registry-v1" as const;

const LEGACY_SELECTOR_BY_CANONICAL_TEMPLATE_ID = new Map<string, string | null>([
  [
    "carpentry_metal_interior_fence_install_technical_room_professional_expanded_v1",
    "profile_sheet_fence",
  ],
  ["earth_dam_preliminary_boq_expanded_complex_v1", null],
]);

let legacyReplayMigrationUsageCounter = 0;

export function legacyReplayMigrationUsageCount(): number {
  return legacyReplayMigrationUsageCounter;
}

function buildReplayCandidate(input: {
  record: AnyEstimateReplayRecord;
  rawInput: string;
  selectedTemplateId?: string;
  selectedWorkKey?: string;
  paramOverrides?: Parameters<typeof createEstimateDraftRevision>[0]["paramOverrides"];
}): EstimateReplayRecord {
  const revision = createEstimateDraftRevision({
    estimateDraftId: input.record.estimate_draft_id,
    rawInput: input.rawInput,
    selectedTemplateId: input.selectedTemplateId,
    selectedWorkKey: input.selectedWorkKey,
    paramOverrides: input.paramOverrides,
    createdAt: input.record.created_at,
    source: "initial_prompt",
    revisionIndex: 1,
  });
  const snapshot = createSnapshotFromDraftRevision(revision);
  const pdf = renderPdfFromDraftRevision({ revision: snapshot.revision, snapshot: snapshot.snapshot });
  const buyer = createBuyerHandoffFromDraftRevision({ revision: pdf.revision, snapshot: pdf.snapshot });
  return buildEstimateReplayRecord({
    caseId: input.record.case_id,
    revision: buyer.revision,
    snapshot: buyer.snapshot,
    pdf: pdf.pdf,
    buyerHandoff: buyer.buyerHandoff,
    sourceSha: input.record.version_lineage.source_sha,
    createdAt: input.record.created_at,
    versionLineage: input.record.version_lineage,
  });
}

function comparisonWithIdentityBlockers(
  expected: EstimateReplayRecord,
  actual: EstimateReplayRecord,
): EstimateReplayComparison {
  const comparison = compareEstimateReplayRecords(expected, actual);
  const { checksum, ...identityWithoutChecksum } = expected.resolved_identity;
  const identityBlockers = [
    resolvedEstimateIdentityChecksum(identityWithoutChecksum) === checksum
      ? ""
      : "resolved_identity_checksum_invalid",
    actual.resolved_identity.canonicalModelId === expected.resolved_identity.canonicalModelId
      ? ""
      : "canonical_model_id_mismatch",
    actual.resolved_identity.canonicalModelVersion === expected.resolved_identity.canonicalModelVersion
      ? ""
      : "canonical_model_version_mismatch",
    actual.resolved_identity.semanticOwner === expected.resolved_identity.semanticOwner
      ? ""
      : "semantic_owner_mismatch",
  ].filter(Boolean);
  if (identityBlockers.length === 0) return comparison;
  return {
    ...comparison,
    status: "failed",
    drift_detected: true,
    blocking_reasons: [...comparison.blocking_reasons, ...identityBlockers],
  };
}

function replayCanonicalResolvedIdentity(
  record: EstimateReplayRecord,
): EstimateReplayRunResult {
  const identity = record.resolved_identity;
  const actual = buildReplayCandidate({
    record,
    rawInput: identity.originalPrompt,
    selectedTemplateId: identity.calculationStrategyId,
    selectedWorkKey: identity.requestedCatalogWorkId ?? undefined,
    paramOverrides: identity.resolvedParameters,
  });
  return {
    expected: record,
    actual,
    comparison: comparisonWithIdentityBlockers(record, actual),
    replayMode: "CANONICAL_RESOLVED_IDENTITY",
    newRevisionPromptFallbackUsed: false,
    legacyMigrationEvidence: null,
    replay_runner_created: true,
  };
}

function legacySelectors(record: LegacyEstimateReplayRecord): Array<{
  label: string;
  selectedTemplateId?: string;
  selectedWorkKey?: string;
}> {
  const registered = LEGACY_SELECTOR_BY_CANONICAL_TEMPLATE_ID.has(record.selected_template_id)
    ? LEGACY_SELECTOR_BY_CANONICAL_TEMPLATE_ID.get(record.selected_template_id)
    : undefined;
  const candidates: Array<{
    label: string;
    selectedTemplateId?: string;
    selectedWorkKey?: string;
  }> = [];
  if (registered !== undefined) {
    candidates.push({
      label: registered ?? "prompt-only-registered",
      selectedTemplateId: registered ?? undefined,
    });
  }
  candidates.push({
    label: `canonical:${record.selected_template_id}`,
    selectedTemplateId: record.selected_template_id,
  });
  if (record.matched_family !== record.selected_template_id) {
    candidates.push({
      label: `family-template:${record.matched_family}`,
      selectedTemplateId: record.matched_family,
    });
  }
  candidates.push({
    label: `family-work-key:${record.matched_family}`,
    selectedWorkKey: record.matched_family,
  });
  candidates.push({ label: "prompt-only-legacy" });
  return candidates.filter((candidate, index, values) =>
    values.findIndex((other) =>
      other.selectedTemplateId === candidate.selectedTemplateId &&
      other.selectedWorkKey === candidate.selectedWorkKey
    ) === index
  );
}

function migrateLegacyReplayRecord(
  record: LegacyEstimateReplayRecord,
): EstimateReplayRunResult {
  legacyReplayMigrationUsageCounter += 1;
  const selectors = legacySelectors(record);
  let primary: EstimateReplayRecord | null = null;
  let primaryComparison: EstimateReplayComparison | null = null;
  for (const selector of selectors) {
    try {
      const candidate = buildReplayCandidate({
        record,
        rawInput: record.source_prompt,
        selectedTemplateId: selector.selectedTemplateId,
        selectedWorkKey: selector.selectedWorkKey,
      });
      const comparison = compareEstimateReplayRecords(record, candidate);
      primary ??= candidate;
      primaryComparison ??= comparison;
      if (comparison.status !== "passed") continue;
      return {
        expected: record,
        actual: candidate,
        comparison,
        replayMode: "LEGACY_REPLAY_MIGRATION",
        newRevisionPromptFallbackUsed: false,
        legacyMigrationEvidence: {
          mode: "LEGACY_REPLAY_MIGRATION",
          registryVersion: LEGACY_REPLAY_COMPATIBILITY_REGISTRY_VERSION,
          sourceRecordId: record.record_id,
          historicalRecordMutated: false,
          attemptedSelectors: selectors.map((item) => item.label),
          matchedSelector: selector.label,
          hashesVerified: comparison.mismatch_count === 0,
          structuralCountersVerified:
            comparison.rows_count_match &&
            comparison.material_rows_count_match &&
            comparison.work_rows_count_match,
          semanticOwnerMatched: null,
          manualPricesTransfer: "NOT_PRESENT",
          unmatchedRows: [],
          canonicalRevisionCreated: true,
          canonicalRecordId: candidate.record_id,
          status: "MIGRATED",
          failureCode: null,
        },
        replay_runner_created: true,
      };
    } catch {
      // Compatibility candidates are isolated. A terminal typed migration
      // failure is returned below when none can reproduce the historical record.
    }
  }
  const actual = primary ?? buildReplayCandidate({
    record,
    rawInput: record.source_prompt,
    selectedTemplateId: record.selected_template_id,
  });
  const comparison = primaryComparison ?? compareEstimateReplayRecords(record, actual);
  return {
    expected: record,
    actual,
    comparison: {
      ...comparison,
      status: "failed",
      drift_detected: true,
      blocking_reasons: [
        ...comparison.blocking_reasons,
        "LEGACY_REPLAY_UNSAFE_MIGRATION",
      ],
    },
    replayMode: "LEGACY_REPLAY_MIGRATION",
    newRevisionPromptFallbackUsed: false,
    legacyMigrationEvidence: {
      mode: "LEGACY_REPLAY_MIGRATION",
      registryVersion: LEGACY_REPLAY_COMPATIBILITY_REGISTRY_VERSION,
      sourceRecordId: record.record_id,
      historicalRecordMutated: false,
      attemptedSelectors: selectors.map((item) => item.label),
      matchedSelector: null,
      hashesVerified: false,
      structuralCountersVerified: false,
      semanticOwnerMatched: null,
      manualPricesTransfer: "NOT_PRESENT",
      unmatchedRows: comparison.blocking_reasons,
      canonicalRevisionCreated: false,
      canonicalRecordId: null,
      status: "FAILED",
      failureCode: "LEGACY_REPLAY_UNSAFE_MIGRATION",
    },
    replay_runner_created: true,
  };
}

export const LEGACY_REPLAY_MIGRATION = {
  registryVersion: LEGACY_REPLAY_COMPATIBILITY_REGISTRY_VERSION,
  migrate: migrateLegacyReplayRecord,
  getUsageCount: legacyReplayMigrationUsageCount,
} as const;

export function replayEstimateFromRecord(
  record: AnyEstimateReplayRecord,
): EstimateReplayRunResult {
  return record.resolved_identity
    ? replayCanonicalResolvedIdentity(record)
    : LEGACY_REPLAY_MIGRATION.migrate(record);
}
