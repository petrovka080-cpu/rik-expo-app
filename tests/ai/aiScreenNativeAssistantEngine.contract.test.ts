import { getAiScreenNativeAssistantPack } from "../../src/features/ai/screenNative/aiScreenNativeAssistantEngine";
import { validateAiScreenNativeAssistantPack } from "../../src/features/ai/screenNative/aiScreenNativeAssistantPolicy";

describe("AI screen-native assistant engine", () => {
  it("builds a finance value pack with summary, critical items, ready options and approval actions", () => {
    const pack = getAiScreenNativeAssistantPack({
      role: "accountant",
      context: "accountant",
      screenId: "accountant.main",
      searchParams: {
        paymentSupplierName: "Evidence Supplier",
        paymentAmountLabel: "1 200 000 KZT",
        paymentTotalAmountLabel: "4 850 000 KZT",
        paymentRisk: "amount above supplier history",
        paymentMissingDocument: "delivery confirmation",
        paymentEvidence: "payment:1248|document:delivery",
        paymentApprovalCount: "3",
      },
    });

    expect(pack.screenId).toBe("accountant.main");
    expect(pack.summary).toContain("4 850 000 KZT");
    expect(pack.criticalItems[0]?.reason).toContain("amount above supplier history");
    expect(pack.readyOptions[0]?.title).toContain("Evidence Supplier");
    expect(pack.nextActions.some((action) => action.requiresApproval)).toBe(true);
    expect(validateAiScreenNativeAssistantPack(pack).ok).toBe(true);
  });

  it("falls back to missing data without inventing rows", () => {
    const pack = getAiScreenNativeAssistantPack({
      role: "security",
      context: "security",
      screenId: "security.screen",
    });

    expect(pack.fakeDataUsed).toBe(false);
    expect(pack.missingData[0]?.label).toContain("read-only");
    expect(pack.readyOptions[0]?.actionKind).toBe("draft_only");
    expect(validateAiScreenNativeAssistantPack(pack).ok).toBe(true);
  });
});
