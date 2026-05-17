import { expectMagicScreen } from "./aiScreenMagicTestHelpers";

describe("AI office magic screen", () => {
  it("prepares office queue work without role mutation", () => {
    const pack = expectMagicScreen("office.hub");

    expect(pack.screenSummary).toContain("Офис");
    expect(JSON.stringify(pack)).not.toMatch(/role mutation allowed|permission grant allowed/i);
  });
});
