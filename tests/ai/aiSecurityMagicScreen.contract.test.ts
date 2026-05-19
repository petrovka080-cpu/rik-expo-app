import { expectMagicScreen } from "./aiScreenMagicTestHelpers";

describe("AI security magic screen", () => {
  it("surfaces security review work without permission grants", () => {
    const pack = expectMagicScreen("security.screen", "security");

    expect(pack.screenSummary).toMatch(/безопас/i);
    expect(JSON.stringify(pack)).not.toMatch(/service[_-]?role green path|permission grant allowed|policy disable/i);
  });
});
