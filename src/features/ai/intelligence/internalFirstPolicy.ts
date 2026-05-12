export type InternalFirstDecision = {
  internalDataChecked: true;
  marketplaceChecked: boolean;
  externalAllowed: boolean;
  externalUsed: boolean;
  reason: string;
  evidenceRefs: string[];
};

export type InternalFirstDecisionInput = {
  internalEvidenceRefs: readonly string[];
  marketplaceEvidenceRefs?: readonly string[];
  externalPolicyAllowed?: boolean;
  externalRequested?: boolean;
  externalLiveFetchEnabled?: boolean;
};

export type InternalFirstViolation =
  | "external_source_used_before_internal_search"
  | "final_decision_from_external_only"
  | "external_source_without_citation"
  | "external_source_without_timestamp";

export function resolveInternalFirstDecision(
  input: InternalFirstDecisionInput,
): InternalFirstDecision {
  const internalEvidenceRefs = input.internalEvidenceRefs.filter((ref) => ref.trim().length > 0);
  const marketplaceEvidenceRefs = (input.marketplaceEvidenceRefs ?? []).filter((ref) => ref.trim().length > 0);
  const internalDataChecked = true;
  const marketplaceChecked = marketplaceEvidenceRefs.length > 0;
  const externalAllowed = input.externalPolicyAllowed === true && internalDataChecked;
  const externalUsed =
    externalAllowed &&
    input.externalRequested === true &&
    input.externalLiveFetchEnabled === true &&
    internalEvidenceRefs.length > 0;

  return {
    internalDataChecked,
    marketplaceChecked,
    externalAllowed,
    externalUsed,
    evidenceRefs: [...internalEvidenceRefs, ...marketplaceEvidenceRefs],
    reason:
      internalEvidenceRefs.length > 0
        ? "Internal app evidence was checked first; marketplace and external comparison remain policy-bound."
        : "Internal app evidence was checked first, but no evidence-backed internal data was available.",
  };
}

export function validateInternalFirstSequence(params: {
  decision: InternalFirstDecision;
  finalActionFromExternalOnly?: boolean;
  citations?: readonly { sourceId: string; checkedAt?: string; urlHash?: string }[];
}): readonly InternalFirstViolation[] {
  const violations: InternalFirstViolation[] = [];

  if (params.decision.externalUsed && params.decision.evidenceRefs.length === 0) {
    violations.push("external_source_used_before_internal_search");
  }
  if (params.finalActionFromExternalOnly === true) {
    violations.push("final_decision_from_external_only");
  }
  if (params.decision.externalUsed) {
    const citations = params.citations ?? [];
    if (citations.length === 0 || citations.some((citation) => !citation.sourceId || !citation.urlHash)) {
      violations.push("external_source_without_citation");
    }
    if (citations.some((citation) => !citation.checkedAt)) {
      violations.push("external_source_without_timestamp");
    }
  }

  return violations;
}
