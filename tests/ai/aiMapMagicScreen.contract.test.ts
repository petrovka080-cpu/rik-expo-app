import { expectMagicScreen } from "./aiScreenMagicTestHelpers";

describe("AI map magic screen", () => {
  it("keeps logistics recommendations evidence-based without fake ETA", () => {
    const pack = expectMagicScreen("map.main");

    expect(pack.screenSummary).toContain("Логистика");
    expect(JSON.stringify(pack)).not.toMatch(/fake distance|fake ETA|fake availability/i);
  });
});
