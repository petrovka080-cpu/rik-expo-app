import { hydrateAiScreenNativeAssistantContext } from "../../src/features/ai/screenNative/aiScreenNativeAssistantHydrator";

describe("AI screen-native assistant hydrator", () => {
  it("hydrates screen-native fields from read-only screen params", () => {
    const hydrated = hydrateAiScreenNativeAssistantContext({
      role: "accountant",
      context: "accountant",
      searchParams: {
        screenId: "accountant.payment",
        criticalTitle: "Evidence Supplier",
        criticalReason: "amount above history",
        nativeEvidence: "payment:1248|document:delivery",
        todayCount: "7",
        todayAmountLabel: "4 850 000 KZT",
        pendingApprovalCount: "3",
      },
    });

    expect(hydrated.screenId).toBe("accountant.payment");
    expect(hydrated.criticalTitle).toBe("Evidence Supplier");
    expect(hydrated.evidenceLabels).toEqual(["payment:1248", "document:delivery"]);
    expect(hydrated.today).toMatchObject({ count: 7, amountLabel: "4 850 000 KZT", pendingApprovalCount: 3 });
  });
});
