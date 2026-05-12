import {
  buildAiScreenRuntimeRegistryEvidence,
  hasAiScreenRuntimeEvidence,
  normalizeAiScreenRuntimeEvidenceRefs,
  toAiScreenRuntimeEvidenceRefs,
} from "../../src/features/ai/screenRuntime/aiScreenRuntimeEvidence";

describe("AI screen runtime evidence", () => {
  it("normalizes bounded evidence and strips empty refs", () => {
    const refs = normalizeAiScreenRuntimeEvidenceRefs([" a ", "", "a", "b"]);

    expect(refs).toEqual(["a", "b"]);
    expect(hasAiScreenRuntimeEvidence(refs)).toBe(true);
  });

  it("builds redacted registry evidence without raw payload or prompt storage", () => {
    const evidence = buildAiScreenRuntimeRegistryEvidence({
      screenId: "buyer.main",
      producerName: "buyerProcurementProducer",
      entityTypes: ["request"],
    });

    expect(evidence.length).toBeGreaterThan(0);
    expect(evidence.every((ref) => ref.redacted)).toBe(true);
    expect(evidence.every((ref) => ref.rawPayloadStored === false)).toBe(true);
    expect(evidence.every((ref) => ref.rawDbRowsExposed === false)).toBe(true);
    expect(evidence.every((ref) => ref.rawPromptExposed === false)).toBe(true);
  });

  it("keeps evidence objects redacted when converting ids", () => {
    expect(
      toAiScreenRuntimeEvidenceRefs({
        ids: ["screen_runtime:buyer:registry"],
        labelPrefix: "buyer",
      }),
    ).toEqual([
      expect.objectContaining({
        id: "screen_runtime:buyer:registry",
        redacted: true,
        rawPayloadStored: false,
      }),
    ]);
  });
});
