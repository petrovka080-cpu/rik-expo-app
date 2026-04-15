import {
  clearContractorProgressQueueForProgress,
} from "../../lib/offline/contractorProgressQueue";
import type {
  PlatformLocalRecoveryCleanupResult,
  PlatformLocalRecoveryCleanupTarget,
} from "../../lib/offline/platformTerminalRecovery";
import { clearContractorProgressDraftForProgress } from "./contractor.progressDraft.store";

const trim = (value: unknown) => String(value ?? "").trim();

export const clearContractorProgressLocalRecovery = async (
  progressId: string,
): Promise<PlatformLocalRecoveryCleanupResult> => {
  const entityId = trim(progressId);
  if (!entityId) {
    return {
      kind: "contractor_progress",
      entityId: "",
      cleared: false,
      clearedOwners: [],
    };
  }

  await clearContractorProgressQueueForProgress(entityId);
  await clearContractorProgressDraftForProgress(entityId);

  return {
    kind: "contractor_progress",
    entityId,
    cleared: true,
    clearedOwners: ["contractor_progress_queue_v2", "contractor_progress_draft_store_v2"],
  };
};

export const contractorProgressRecoveryCleanupAdapter = {
  clearLocalRecoveryState: async (
    target: PlatformLocalRecoveryCleanupTarget,
  ): Promise<PlatformLocalRecoveryCleanupResult> => {
    if (target.kind !== "contractor_progress") {
      return {
        ...target,
        cleared: false,
        clearedOwners: [],
      };
    }
    return await clearContractorProgressLocalRecovery(target.entityId);
  },
};
