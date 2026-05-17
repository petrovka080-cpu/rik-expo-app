import { getAiScreenMagicPack } from "../../src/features/ai/screenMagic/aiScreenMagicEngine";
import { resolveAiScreenMagicButton } from "../../src/features/ai/screenMagic/aiScreenMagicButtonResolver";

describe("AI screen magic button resolver", () => {
  it("resolves safe read, draft, approval and forbidden buttons with no direct execution", () => {
    const pack = getAiScreenMagicPack({ role: "buyer", context: "buyer", screenId: "buyer.main" });
    const statuses = pack.buttons.map((button) => resolveAiScreenMagicButton(button).status);

    expect(statuses).toEqual(expect.arrayContaining([
      "clickable_safe_read",
      "clickable_draft_only",
      "routes_to_approval_ledger",
      "forbidden_with_reason",
    ]));
    expect(pack.buttons.every((button) => button.canExecuteDirectly === false)).toBe(true);
  });
});
