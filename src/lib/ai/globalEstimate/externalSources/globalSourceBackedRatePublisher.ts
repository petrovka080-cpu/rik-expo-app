import type { EstimateRowSourceEvidence } from "../globalEstimateTypes";
import type { GlobalExternalPriceObservation, GlobalExternalRateCandidate, GlobalSourceBackedRateLink } from "./globalExternalSourceTypes";

export function publishApprovedSourceBackedRateLink(input: {
  rateTable: GlobalSourceBackedRateLink["rateTable"];
  rateId: string;
  candidate: GlobalExternalRateCandidate;
  observation: GlobalExternalPriceObservation;
  evidence: EstimateRowSourceEvidence;
}): GlobalSourceBackedRateLink {
  if (input.candidate.status !== "approved") {
    throw new Error(`GLOBAL_ESTIMATE_RATE_CANDIDATE_NOT_APPROVED:${input.candidate.id}`);
  }
  if (!input.evidence.sourceId || input.evidence.label.trim().length === 0) {
    throw new Error("GLOBAL_ESTIMATE_SOURCE_EVIDENCE_REQUIRED_FOR_RATE_LINK");
  }
  return {
    ...input.evidence,
    rateTable: input.rateTable,
    rateId: input.rateId,
    sourceObservationId: input.observation.id,
    sourceRunId: input.observation.sourceRunId,
    connectorId: input.observation.connectorId,
  };
}
