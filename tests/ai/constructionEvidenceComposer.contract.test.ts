import { composeConstructionEvidence } from "../../src/features/ai/constructionKnowhow/constructionEvidenceComposer";

describe("Construction evidence composer", () => {
  it("uses redacted internal evidence and reports internal-first completeness", () => {
    const result = composeConstructionEvidence({
      roleId: "director_control",
      domainId: "procurement",
      evidenceRefs: [
        {
          refId: "request:abc",
          sourceType: "internal_runtime",
          label: "Request snapshot",
          sourceIdHash: "abc",
          redacted: true,
          rawRowsReturned: false,
        },
        {
          refId: "warehouse:def",
          sourceType: "internal_runtime",
          label: "Warehouse status",
          sourceIdHash: "def",
          redacted: true,
          rawRowsReturned: false,
        },
      ],
    });

    expect(result.internalFirstStatus).toBe("complete");
    expect(result.evidenceRequired).toBe(true);
    expect(result.rawRowsReturned).toBe(false);
    expect(result.fakeEvidence).toBe(false);
    expect(result.evidenceRefs.every((ref) => ref.redacted && ref.rawRowsReturned === false)).toBe(true);
  });

  it("does not fake runtime evidence when none is provided", () => {
    const result = composeConstructionEvidence({
      roleId: "buyer",
      domainId: "supplier_selection",
    });

    expect(result.internalFirstStatus).toBe("insufficient");
    expect(result.findings).toContain("internal_runtime_evidence_missing");
    expect(result.evidenceRefs.some((ref) => ref.sourceType === "policy_contract")).toBe(true);
  });
});
