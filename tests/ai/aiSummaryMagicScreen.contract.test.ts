import { expectMagicScreen } from "./aiScreenMagicTestHelpers";

describe("AI summary magic screen", () => {
  it("prepares narrative drafts without final send", () => {
    const pack = expectMagicScreen("reports.modal", "reports");

    expect(pack.buttons.some((button) => button.actionKind === "draft_only")).toBe(true);
    expect(JSON.stringify(pack)).not.toMatch(/final send without review allowed|fake narrative/i);
  });
});
