import type { GlobalExternalPriceObservation, GlobalExternalRateCandidate } from "./globalExternalSourceTypes";

export function buildGlobalExternalRateCandidate(
  observation: GlobalExternalPriceObservation,
  input: { rateKey?: string; status?: GlobalExternalRateCandidate["status"] } = {},
): GlobalExternalRateCandidate {
  return {
    id: `candidate_${observation.id}`,
    observationId: observation.id,
    rateKind: observation.observedKind,
    rateKey: input.rateKey ?? observation.normalizedKey,
    countryCode: observation.countryCode,
    stateOrRegion: observation.stateOrRegion,
    city: observation.city,
    unit: observation.normalizedUnit,
    currency: observation.currency,
    priceMin: observation.priceMin,
    priceMax: observation.priceMax,
    priceDefault: observation.priceValue,
    matchConfidence: observation.confidence,
    sourceQuality: observation.confidence,
    status: input.status ?? "pending",
  };
}

export function approveGlobalExternalRateCandidate(candidate: GlobalExternalRateCandidate): GlobalExternalRateCandidate {
  return { ...candidate, status: "approved" };
}
