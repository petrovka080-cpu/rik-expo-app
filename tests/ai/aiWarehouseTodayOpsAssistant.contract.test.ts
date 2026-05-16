import { buildWarehouseTodayOpsAssistant } from "../../src/features/ai/warehouse/aiWarehouseTodayOpsAssistant";

describe("warehouse today ops assistant", () => {
  it("prepares stock risks, missing documents, and approval-safe actions", () => {
    const pack = buildWarehouseTodayOpsAssistant({
      stockRiskCount: 5,
      incomingCount: 4,
      blockedIssueCount: 2,
      disputedCount: 3,
      items: [{
        id: "cable",
        title: "Кабель",
        linkedRequestId: "#1248",
        riskReason: "риск дефицита",
        missingDocument: "документ поставки",
        evidence: ["warehouse:item:cable"],
      }],
    });

    expect(pack.summary).toContain("Риски дефицита: 5");
    expect(pack.readyItems[0]?.title).toBe("Кабель");
    expect(pack.directMutationAllowed).toBe(false);
  });
});
