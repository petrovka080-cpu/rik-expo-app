import { listAiRoleScreenAssistantRegistry } from "../../src/features/ai/realAssistants/aiRoleScreenAssistantRegistry";

describe("AI role-screen assistant registry", () => {
  it("covers the major role screens with product assistant entries", () => {
    const screenIds = listAiRoleScreenAssistantRegistry().map((entry) => entry.screenId);
    expect(screenIds).toEqual(expect.arrayContaining([
      "accountant.main",
      "accountant.payment",
      "buyer.main",
      "buyer.requests",
      "buyer.request.detail",
      "director.dashboard",
      "approval.inbox",
      "warehouse.main",
      "warehouse.incoming",
      "warehouse.issue",
      "foreman.main",
      "contractor.main",
      "documents.main",
      "agent.documents.knowledge",
      "chat.main",
      "map.main",
      "office.hub",
      "security.screen",
    ]));
  });
});
