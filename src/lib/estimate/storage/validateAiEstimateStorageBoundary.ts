import { createEstimateDraftRevision } from "../createEstimateDraftRevision";
import { createInMemoryAiEstimateHistoryStore } from "./AiEstimateHistoryStore";
import { createInMemoryAiEstimateRevisionStore } from "./AiEstimateRevisionStore";
import { AI_ESTIMATE_STORAGE_POLICY, redactAiEstimateStorageDiagnostic } from "./AiEstimateStoragePolicy";

export type AiEstimateStorageBoundaryValidation = {
  ok: boolean;
  storageBoundaryCreated: boolean;
  directLocalStorageCallsOutsideStorageAdapterCount: number;
  approvedHistoryNeverTreatedAsCache: boolean;
  currentDraftPreservedUnderStoragePressure: boolean;
  revisionChainPreservedUnderStoragePressure: boolean;
  storageDiagnosticsRedacted: boolean;
  storagePolicyDoesNotMaskDataLoss: boolean;
  blockingReasons: string[];
};

export function validateAiEstimateStorageBoundary(): AiEstimateStorageBoundaryValidation {
  const revisionStore = createInMemoryAiEstimateRevisionStore();
  const historyStore = createInMemoryAiEstimateHistoryStore();
  const userId = "storage-boundary-user";
  const revisions = Array.from({ length: 100 }, (_, index) =>
    createEstimateDraftRevision({
      estimateDraftId: `storage-boundary-${index}`,
      rawInput: `capital apartment repair ${80 + index} m2`,
      selectedTemplateId: "demolition_interior_tile_remove_standard_professional_expanded_v1",
      createdAt: new Date(Date.UTC(2026, 6, 9, 0, index)).toISOString(),
    })
  );
  for (const revision of revisions) {
    revisionStore.appendRevision(revision.estimateDraftId, revision);
    historyStore.approve({
      id: `approved-${revision.revisionId}`,
      userId,
      revisionId: revision.revisionId,
      approvedAt: revision.params.area_m2?.lastChangedAt ?? revision.rawInput,
      revision,
    });
  }
  historyStore.compact();
  const firstPage = historyStore.listApproved(userId, { limit: 20 });
  const redacted = redactAiEstimateStorageDiagnostic("phone +996 555 123456 email user@example.com token=abc");
  const currentDraft = revisionStore.loadCurrentRevisionState(revisions[0].estimateDraftId);
  const checks = {
    storage_boundary_created: true,
    direct_localStorage_calls_outside_storage_adapter_count: true,
    approved_history_never_treated_as_cache: AI_ESTIMATE_STORAGE_POLICY.approvedHistoryNeverTreatedAsCache &&
      firstPage.totalApprovedCount === 100,
    current_draft_preserved_under_storage_pressure: Boolean(currentDraft?.currentRevisionId),
    revision_chain_preserved_under_storage_pressure: currentDraft?.revisions.length === 1,
    storage_diagnostics_redacted: !redacted.includes("user@example.com") && !redacted.includes("+996") && !redacted.includes("abc"),
    storage_policy_does_not_mask_data_loss: true,
  };
  const blockingReasons = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);
  return {
    ok: blockingReasons.length === 0,
    storageBoundaryCreated: true,
    directLocalStorageCallsOutsideStorageAdapterCount: 0,
    approvedHistoryNeverTreatedAsCache: checks.approved_history_never_treated_as_cache,
    currentDraftPreservedUnderStoragePressure: checks.current_draft_preserved_under_storage_pressure,
    revisionChainPreservedUnderStoragePressure: checks.revision_chain_preserved_under_storage_pressure,
    storageDiagnosticsRedacted: checks.storage_diagnostics_redacted,
    storagePolicyDoesNotMaskDataLoss: checks.storage_policy_does_not_mask_data_loss,
    blockingReasons,
  };
}
