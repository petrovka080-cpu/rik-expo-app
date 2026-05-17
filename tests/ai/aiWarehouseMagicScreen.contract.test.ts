import { expectMagicScreen } from "./aiScreenMagicTestHelpers";

describe("AI warehouse magic screens", () => {
  it("covers warehouse main, incoming and issue without stock mutation", () => {
    for (const screenId of ["warehouse.main", "warehouse.incoming", "warehouse.issue"]) {
      const pack = expectMagicScreen(screenId, "warehouse");
      expect(pack.buttons.some((button) => button.label.toLowerCase().includes("дефицит") || button.actionKind === "safe_read")).toBe(true);
      expect(JSON.stringify(pack)).not.toMatch(/write-off|stock mutation allowed|receive directly/i);
    }
  });
});
