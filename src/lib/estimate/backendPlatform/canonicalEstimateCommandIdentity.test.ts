import {
  canonicalEstimateCandidateAdmissionIdempotencyKey,
  canonicalEstimateRecalculateIdempotencyKey,
} from "./canonicalEstimateCommandIdentity";

describe("canonical estimate command identity", () => {
  it("is stable for an exact retry and changes with the immutable mutation", () => {
    const base = {
      parentRevisionId: "parent-revision",
      parameters: { area_m2: 500 },
      customRows: [],
    };
    const override = (unitPrice: number) => ({
      unitPrice,
      provenance: { kind: "manual" as const, reason: "test-price-edit" },
    });
    const first = canonicalEstimateRecalculateIdempotencyKey({
      ...base,
      rowOverrides: { material: override(100) },
    });
    const exactRetry = canonicalEstimateRecalculateIdempotencyKey({
      ...base,
      rowOverrides: { material: override(100) },
    });
    const changedPrice = canonicalEstimateRecalculateIdempotencyKey({
      ...base,
      rowOverrides: { material: override(101) },
    });

    expect(exactRetry).toBe(first);
    expect(changedPrice).not.toBe(first);
  });

  it("namespaces isolated candidate admission retries by the exact source tree", () => {
    const clientIdempotencyKey = "canonical-recalculate-command";
    const first = canonicalEstimateCandidateAdmissionIdempotencyKey({
      clientIdempotencyKey,
      candidateSourceTree: "source-tree-a",
      isolatedCandidateTest: true,
    });
    const exactRetry = canonicalEstimateCandidateAdmissionIdempotencyKey({
      clientIdempotencyKey,
      candidateSourceTree: "source-tree-a",
      isolatedCandidateTest: true,
    });
    const nextCandidate = canonicalEstimateCandidateAdmissionIdempotencyKey({
      clientIdempotencyKey,
      candidateSourceTree: "source-tree-b",
      isolatedCandidateTest: true,
    });

    expect(exactRetry).toBe(first);
    expect(nextCandidate).not.toBe(first);
    expect(first.startsWith(clientIdempotencyKey)).toBe(true);
    expect(first.length).toBeLessThanOrEqual(200);
    expect(
      canonicalEstimateCandidateAdmissionIdempotencyKey({
        clientIdempotencyKey,
        candidateSourceTree: "source-tree-a",
        isolatedCandidateTest: false,
      }),
    ).toBe(clientIdempotencyKey);
  });

  it("keeps candidate admission keys bounded without collisions for long client keys", () => {
    const first = canonicalEstimateCandidateAdmissionIdempotencyKey({
      clientIdempotencyKey: `r6-control72-${"a".repeat(240)}`,
      candidateSourceTree: "source-tree-a",
      isolatedCandidateTest: true,
    });
    const second = canonicalEstimateCandidateAdmissionIdempotencyKey({
      clientIdempotencyKey: `r6-control72-${"b".repeat(240)}`,
      candidateSourceTree: "source-tree-a",
      isolatedCandidateTest: true,
    });

    expect(first.length).toBeLessThanOrEqual(200);
    expect(second.length).toBeLessThanOrEqual(200);
    expect(second).not.toBe(first);
  });

  it("fails closed when isolated candidate admission has no source identity", () => {
    expect(() => canonicalEstimateCandidateAdmissionIdempotencyKey({
      clientIdempotencyKey: "canonical-recalculate-command",
      candidateSourceTree: "UNSET",
      isolatedCandidateTest: true,
    })).toThrow("CANONICAL_ESTIMATE_CANDIDATE_SOURCE_TREE_REQUIRED");
  });
});
