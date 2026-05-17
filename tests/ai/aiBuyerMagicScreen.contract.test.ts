import { expectMagicScreen } from "./aiScreenMagicTestHelpers";

describe("AI buyer magic screens", () => {
  it("covers buyer and procurement screens with internal-first, draft and approval actions", () => {
    for (const screenId of ["buyer.main", "buyer.requests", "buyer.request.detail", "procurement.copilot", "market.home", "supplier.showcase"]) {
      const pack = expectMagicScreen(screenId);
      expect(pack.buttons.some((button) => button.actionKind === "draft_only")).toBe(true);
      expect(pack.buttons.some((button) => button.actionKind === "approval_required" && button.approvalRoute)).toBe(true);
      expect(JSON.stringify(pack)).not.toMatch(/\bSupplier A\b|\bSupplier B\b|fake supplier|fake price/i);
    }
  });
});
