import {
  normalizeCanonicalProfessionalBoqUnit,
  type CanonicalProfessionalBoqUnit,
} from "./canonicalUnits";

export type NormalizedEstimateUnit = {
  rawUnit: string | null;
  canonicalUnit: CanonicalProfessionalBoqUnit | null;
  known: boolean;
};

export function normalizeEstimateUnit(unit: string | null | undefined): NormalizedEstimateUnit {
  const canonicalUnit = normalizeCanonicalProfessionalBoqUnit(unit);
  return {
    rawUnit: unit == null ? null : String(unit),
    canonicalUnit,
    known: canonicalUnit !== null,
  };
}

export function requireKnownEstimateUnit(unit: string | null | undefined): CanonicalProfessionalBoqUnit {
  const normalized = normalizeEstimateUnit(unit);
  if (!normalized.canonicalUnit) {
    throw new Error(`UNKNOWN_ESTIMATE_UNIT:${unit ?? "missing"}`);
  }
  return normalized.canonicalUnit;
}
