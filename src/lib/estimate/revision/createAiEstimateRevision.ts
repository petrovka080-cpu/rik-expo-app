import {
  createEstimateDraftRevision,
  type CreateEstimateDraftRevisionInput,
} from "../createEstimateDraftRevision";
import type { EstimateDraftRevision } from "../estimateDraftRevisionContract";

export function createAiEstimateRevision(input: CreateEstimateDraftRevisionInput): EstimateDraftRevision {
  return createEstimateDraftRevision(input);
}
