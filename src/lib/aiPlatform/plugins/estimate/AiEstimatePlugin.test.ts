import type { CanonicalEstimateSearchItem } from "../../../estimate/backendPlatform/contracts";
import { selectExactProfessionalCanonicalItem } from "./AiEstimatePlugin";

const admission = (allowed: boolean) => ({
  allowed,
  mode: "isolated_candidate_test" as const,
  releaseId: "22222222-2222-4222-8222-222222222222",
  definitionVersionId: "33333333-3333-4333-8333-333333333333",
  catalogId: "r41_surface_paving_stone_laying",
  reasons: [],
  evaluatedAt: "2026-08-23T00:00:00.000Z",
  contractVersion: "estimate-admission-r3" as const,
});

function item(overrides: Partial<CanonicalEstimateSearchItem> = {}): CanonicalEstimateSearchItem {
  return {
    catalogId: "r41_surface_paving_stone_laying",
    matchType: "T2_EXACT_ALIAS",
    publicationState: "ADMITTED_BACKEND",
    selectableMode: "PROFESSIONAL",
    estimateReady: true,
    contentAdmission: admission(true),
    ...overrides,
  } as CanonicalEstimateSearchItem;
}

describe("AI canonical estimate exact selection", () => {
  it("accepts one admitted T2 exact alias as the canonical identity", () => {
    const selected = selectExactProfessionalCanonicalItem({
      literalTotalCount: 1,
      items: [item()],
    });

    expect(selected?.catalogId).toBe("r41_surface_paving_stone_laying");
  });

  it("fails closed for fuzzy, duplicate, non-ready, or non-admitted results", () => {
    expect(selectExactProfessionalCanonicalItem({
      literalTotalCount: 1,
      items: [item({ matchType: "T3_CANONICAL_PREFIX" })],
    })).toBeNull();
    expect(selectExactProfessionalCanonicalItem({
      literalTotalCount: 2,
      items: [item(), item({ catalogId: "duplicate" })],
    })).toBeNull();
    expect(selectExactProfessionalCanonicalItem({
      literalTotalCount: 1,
      items: [item({ estimateReady: false })],
    })).toBeNull();
    expect(selectExactProfessionalCanonicalItem({
      literalTotalCount: 1,
      items: [item({ contentAdmission: admission(false) })],
    })).toBeNull();
  });
});
