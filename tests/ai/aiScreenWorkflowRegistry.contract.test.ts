import {
  getAiScreenWorkflowCoverageCount,
  getAiScreenWorkflowRegistryEntry,
  listAiScreenWorkflowRegistry,
} from "../../src/features/ai/screenWorkflows/aiScreenWorkflowRegistry";

describe("AI screen workflow registry", () => {
  it("covers the 28 audited major screens with workflow metadata", () => {
    const entries = listAiScreenWorkflowRegistry();
    const ids = entries.map((entry) => entry.screenId);

    expect(getAiScreenWorkflowCoverageCount()).toBe(28);
    expect(ids).toEqual(expect.arrayContaining([
      "accountant.main",
      "accountant.payment",
      "accountant.history",
      "buyer.main",
      "buyer.requests",
      "buyer.request.detail",
      "procurement.copilot",
      "warehouse.main",
      "director.dashboard",
      "approval.inbox",
      "foreman.main",
      "documents.main",
      "chat.main",
      "map.main",
      "office.hub",
      "security.screen",
      "screen.runtime",
    ]));
    expect(entries.every((entry) => entry.actionIds.length >= 4)).toBe(true);
    expect(entries.every((entry) => entry.qaExamples.length >= 5)).toBe(true);
  });

  it("maps the document knowledge alias to documents.main workflow", () => {
    expect(getAiScreenWorkflowRegistryEntry("agent.documents.knowledge")?.screenId).toBe("documents.main");
  });
});
