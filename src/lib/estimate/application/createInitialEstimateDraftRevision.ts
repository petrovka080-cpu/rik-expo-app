import {
  createEstimateDraftRevision,
  type CreateEstimateDraftRevisionInput,
} from "../createEstimateDraftRevision";

export function createInitialEstimateDraftRevision(input: CreateEstimateDraftRevisionInput) {
  return createEstimateDraftRevision(input);
}
