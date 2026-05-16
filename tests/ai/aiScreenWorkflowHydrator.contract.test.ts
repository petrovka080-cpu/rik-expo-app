import { hydrateAiScreenWorkflowContext } from "../../src/features/ai/screenWorkflows/aiScreenWorkflowHydrator";

describe("AI screen workflow hydrator", () => {
  it("hydrates explicit screen evidence without inventing missing facts", () => {
    const context = hydrateAiScreenWorkflowContext({
      role: "accountant",
      context: "accountant",
      screenId: "accountant.main",
      searchParams: {
        paymentEvidence: "payment:1|document:2",
        paymentSupplierName: "Evidence Supplier",
      },
    });

    expect(context.workflowScreenId).toBe("accountant.main");
    expect(context.hasRealHydratedEvidence).toBe(true);
    expect(context.evidenceLabels).toEqual(["payment:1", "document:2"]);
  });

  it("keeps document knowledge alias on the documents workflow", () => {
    const context = hydrateAiScreenWorkflowContext({
      role: "unknown",
      context: "reports",
      screenId: "agent.documents.knowledge",
    });

    expect(context.workflowScreenId).toBe("documents.main");
    expect(context.hasRealHydratedEvidence).toBe(false);
  });
});
