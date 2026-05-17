import { expectMagicScreen } from "./aiScreenMagicTestHelpers";

describe("AI chat magic screen", () => {
  it("turns discussion into safe drafts and approval candidates without sending directly", () => {
    const pack = expectMagicScreen("chat.main", "chat");

    expect(pack.screenSummary).toContain("Итоги");
    expect(JSON.stringify(pack)).not.toMatch(/send chat message directly allowed|order creation allowed/i);
  });
});
