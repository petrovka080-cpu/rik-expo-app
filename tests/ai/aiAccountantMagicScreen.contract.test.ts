import { expectMagicScreen } from "./aiScreenMagicTestHelpers";

describe("AI accountant magic screens", () => {
  it("covers main, payment and history finance work without direct payments", () => {
    for (const screenId of ["accountant.main", "accountant.payment", "accountant.history"]) {
      const pack = expectMagicScreen(screenId, "finance");
      expect(JSON.stringify(pack)).not.toMatch(/pay-now|post finance transaction directly/i);
      expect(pack.buttons.some((button) => button.actionKind === "approval_required" && button.approvalRoute)).toBe(true);
    }
  });
});
