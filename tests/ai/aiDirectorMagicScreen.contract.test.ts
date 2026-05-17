import { expectMagicScreen } from "./aiScreenMagicTestHelpers";

describe("AI director magic screens", () => {
  it("covers director dashboard, finance, reports, command center and approval inbox", () => {
    for (const screenId of ["director.dashboard", "director.finance", "director.reports", "ai.command_center", "approval.inbox"]) {
      const pack = expectMagicScreen(screenId);
      expect(pack.buttons.some((button) => button.actionKind === "approval_required")).toBe(true);
      expect(JSON.stringify(pack)).not.toMatch(/auto-approve|decision on behalf/i);
    }
  });
});
