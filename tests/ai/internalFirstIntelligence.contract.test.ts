import {
  resolveInternalFirstDecision,
  validateInternalFirstSequence,
} from "../../src/features/ai/intelligence/internalFirstPolicy";

describe("AI internal-first intelligence policy", () => {
  it("checks internal app evidence before marketplace or external sources", () => {
    const decision = resolveInternalFirstDecision({
      internalEvidenceRefs: ["internal:request:1"],
      marketplaceEvidenceRefs: ["marketplace:supplier:2"],
      externalPolicyAllowed: true,
      externalRequested: true,
      externalLiveFetchEnabled: false,
    });

    expect(decision).toEqual(
      expect.objectContaining({
        internalDataChecked: true,
        marketplaceChecked: true,
        externalAllowed: true,
        externalUsed: false,
      }),
    );
    expect(decision.evidenceRefs).toEqual(["internal:request:1", "marketplace:supplier:2"]);
  });

  it("detects unsafe external-only and uncited external decisions", () => {
    expect(
      validateInternalFirstSequence({
        decision: {
          internalDataChecked: true,
          marketplaceChecked: false,
          externalAllowed: true,
          externalUsed: true,
          evidenceRefs: [],
          reason: "bad order",
        },
        finalActionFromExternalOnly: true,
        citations: [],
      }),
    ).toEqual(
      expect.arrayContaining([
        "external_source_used_before_internal_search",
        "final_decision_from_external_only",
        "external_source_without_citation",
      ]),
    );
  });

  it("requires external citations to include a source and timestamp when external use is enabled", () => {
    const violations = validateInternalFirstSequence({
      decision: {
        internalDataChecked: true,
        marketplaceChecked: false,
        externalAllowed: true,
        externalUsed: true,
        evidenceRefs: ["internal:request:1"],
        reason: "external comparison used",
      },
      citations: [{ sourceId: "supplier_public_catalog.default", urlHash: "url:hash" }],
    });

    expect(violations).toContain("external_source_without_timestamp");
  });
});
