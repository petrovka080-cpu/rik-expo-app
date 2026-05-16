import { getAiScreenNativeAssistantPack } from "../../src/features/ai/screenNative/aiScreenNativeAssistantEngine";

describe("documents screen-native value packs", () => {
  it("prepares document summary, missing evidence and draft actions without signing", () => {
    const pack = getAiScreenNativeAssistantPack({
      role: "unknown",
      context: "reports",
      screenId: "documents.main",
      searchParams: {
        documentTitle: "Delivery document",
        documentRequestId: "1248",
        documentPaymentLabel: "Evidence Supplier payment",
        documentMissingEvidence: "delivery confirmation",
        documentRisks: "payment can proceed without full evidence",
        documentEvidence: "document:1|payment:1248",
      },
    });

    expect(pack.title).toContain("Документ");
    expect(pack.readyOptions[0]?.title).toContain("Delivery document");
    expect(pack.missingData[0]?.label).toContain("delivery confirmation");
    expect(pack.directMutationAllowed).toBe(false);
  });
});
