import {
  getAiScreenMagicCoverageCount,
  getAiScreenMagicRegistryEntry,
  listAiScreenMagicRegistry,
} from "../../src/features/ai/screenMagic/aiScreenMagicRegistry";
import { listAiScreenWorkflowRegistry } from "../../src/features/ai/screenWorkflows/aiScreenWorkflowRegistry";

describe("AI screen magic registry", () => {
  it("covers the 28 audited major screens with screen-specific product metadata", () => {
    const entries = listAiScreenMagicRegistry();
    const ids = entries.map((entry) => entry.screenId);

    expect(getAiScreenMagicCoverageCount()).toBe(28);
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
      "reports.modal",
      "chat.main",
      "map.main",
      "office.hub",
      "security.screen",
      "screen.runtime",
    ]));
    expect(entries.every((entry) => entry.preparedWork.length >= 4)).toBe(true);
    expect(entries.every((entry) => entry.qa.length >= 5)).toBe(true);
  });

  it("has an explicit magic registry entry for every audited workflow screen", () => {
    const magicIds = new Set(listAiScreenMagicRegistry().map((entry) => entry.screenId));
    const workflowIds = listAiScreenWorkflowRegistry().map((entry) => entry.screenId);

    expect(workflowIds).toHaveLength(28);
    expect(workflowIds.filter((screenId) => !magicIds.has(screenId))).toEqual([]);
  });

  it("maps document knowledge alias through the underlying workflow registry", () => {
    expect(getAiScreenMagicRegistryEntry("agent.documents.knowledge")?.screenId).toBe("documents.main");
  });
});
