import { expectMagicScreen } from "./aiScreenMagicTestHelpers";

describe("AI runtime magic screen", () => {
  it("keeps runtime diagnostics dev/admin safe and read-only", () => {
    const pack = expectMagicScreen("screen.runtime");

    expect(pack.screenSummary).toMatch(/диагностик|администратор/i);
    expect(JSON.stringify(pack)).not.toMatch(/write screen state allowed|debug panel for normal users/i);
  });
});
