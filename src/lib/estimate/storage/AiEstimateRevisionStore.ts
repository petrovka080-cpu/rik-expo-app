import type { EstimateDraftRevision, EstimateDraftRevisionState } from "../estimateDraftRevisionContract";
import { safeJsonParseValue } from "../../format";

export type AiEstimateRevisionStore = {
  saveCurrentRevisionState(state: EstimateDraftRevisionState): void;
  loadCurrentRevisionState(estimateDraftId: string): EstimateDraftRevisionState | null;
  appendRevision(estimateDraftId: string, revision: EstimateDraftRevision): EstimateDraftRevisionState;
};

function clone<T>(value: T): T {
  return safeJsonParseValue<T>(JSON.stringify(value), value);
}

export function createInMemoryAiEstimateRevisionStore(): AiEstimateRevisionStore {
  const states = new Map<string, EstimateDraftRevisionState>();
  return {
    saveCurrentRevisionState(state) {
      states.set(state.estimateDraftId, clone(state));
    },
    loadCurrentRevisionState(estimateDraftId) {
      const state = states.get(estimateDraftId);
      return state ? clone(state) : null;
    },
    appendRevision(estimateDraftId, revision) {
      const existing = states.get(estimateDraftId);
      const next: EstimateDraftRevisionState = existing
        ? {
            ...clone(existing),
            currentRevisionId: revision.revisionId,
            revisions: [...existing.revisions, clone(revision)],
          }
        : {
            estimateDraftId,
            currentRevisionId: revision.revisionId,
            revisions: [clone(revision)],
            diffs: [],
          };
      states.set(estimateDraftId, next);
      return clone(next);
    },
  };
}
