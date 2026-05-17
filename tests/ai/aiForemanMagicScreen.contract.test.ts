import { expectMagicScreen } from "./aiScreenMagicTestHelpers";

describe("AI foreman magic screens", () => {
  it("covers foreman closeout, quick modal and subcontract without signing", () => {
    for (const screenId of ["foreman.main", "foreman.ai.quick_modal", "foreman.subcontract"]) {
      const pack = expectMagicScreen(screenId);
      expect(pack.buttons.some((button) => button.actionKind === "draft_only")).toBe(true);
      expect(JSON.stringify(pack)).not.toMatch(/fake construction norm|sign directly allowed/i);
    }
  });
});
