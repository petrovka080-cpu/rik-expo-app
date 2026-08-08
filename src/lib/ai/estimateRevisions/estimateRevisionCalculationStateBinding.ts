import type { EstimateDraftRevisionState } from "../../estimate/estimateDraftRevisionContract";
import { assertEstimateRevisionStateIntegrity, stableEstimateRevisionHash } from "./estimateRevisionIntegrityGuard";
import type { EstimateRevisionState } from "./estimateRevisionTypes";

export const ESTIMATE_REVISION_CALCULATION_STATE_BINDING_VERSION =
  "estimate-revision-calculation-state-binding-v1" as const;

export function bindEstimateRevisionCalculationState(
  state: EstimateRevisionState,
  calculationState: EstimateDraftRevisionState,
): EstimateRevisionState {
  const currentCalculationRevision = calculationState.revisions.find(
    (revision) => revision.revisionId === calculationState.currentRevisionId,
  );
  if (!currentCalculationRevision) {
    throw new Error(`ESTIMATE_REVISION_CALCULATION_CURRENT_MISSING:${calculationState.currentRevisionId}`);
  }
  const next: EstimateRevisionState = {
    ...state,
    calculation_state: {
      adapter_version: ESTIMATE_REVISION_CALCULATION_STATE_BINDING_VERSION,
      calculation_state_hash: stableEstimateRevisionHash(calculationState),
      state: calculationState,
      immutable: true,
    },
  };
  assertEstimateRevisionStateIntegrity(next);
  return next;
}

export function getBoundEstimateRevisionCalculationState(
  state: EstimateRevisionState | null | undefined,
): EstimateDraftRevisionState | null {
  if (!state?.calculation_state) return null;
  assertEstimateRevisionStateIntegrity(state);
  return state.calculation_state.state;
}
