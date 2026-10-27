import {
  createEstimateDraftRevision,
  type CreateEstimateDraftRevisionInput,
} from "../backendPlatform/canonicalEstimateHistoricalDraftProjection";

export function createInitialEstimateDraftRevision(input: CreateEstimateDraftRevisionInput) {
  return createEstimateDraftRevision(input);
}
