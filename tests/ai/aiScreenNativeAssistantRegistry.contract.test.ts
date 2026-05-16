import {
  getAiScreenNativeAssistantRegistryEntry,
  listAiScreenNativeAssistantRegistry,
  listAiScreenNativeCoverageGroups,
} from "../../src/features/ai/screenNative/aiScreenNativeAssistantRegistry";

describe("AI screen-native assistant registry", () => {
  it("covers the required product screen groups", () => {
    const ids = listAiScreenNativeAssistantRegistry().map((entry) => entry.screenId);

    expect(listAiScreenNativeCoverageGroups()).toHaveLength(28);
    expect(ids).toEqual(expect.arrayContaining([
      "accountant.main",
      "accountant.payment",
      "accountant.history",
      "buyer.main",
      "buyer.requests",
      "buyer.request.detail",
      "procurement.copilot",
      "market.home",
      "supplier.showcase",
      "warehouse.main",
      "warehouse.incoming",
      "warehouse.issue",
      "director.dashboard",
      "director.finance",
      "director.reports",
      "ai.command_center",
      "approval.inbox",
      "foreman.main",
      "foreman.ai.quick_modal",
      "foreman.subcontract",
      "contractor.main",
      "documents.main",
      "agent.documents.knowledge",
      "reports.modal",
      "chat.main",
      "map.main",
      "office.hub",
      "security.screen",
      "screen.runtime",
    ]));
    expect(getAiScreenNativeAssistantRegistryEntry("screen.runtime")?.roleScope).toContain("admin");
  });
});
