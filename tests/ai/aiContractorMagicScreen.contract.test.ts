import { expectMagicScreen } from "./aiScreenMagicTestHelpers";

describe("AI contractor magic screen", () => {
  it("covers contractor own-work status without cross-role mutation", () => {
    const pack = expectMagicScreen("contractor.main");

    expect(pack.userGoal).toContain("Подрядчик");
    expect(JSON.stringify(pack)).not.toMatch(/finance mutation|signing allowed|work status mutation allowed/i);
  });
});
