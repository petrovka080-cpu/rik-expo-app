import { getAiScreenMagicPack } from "../../src/features/ai/screenMagic/aiScreenMagicEngine";
import {
  buildAiScreenMagicButtonResultCopy,
  resolveAiScreenMagicButton,
} from "../../src/features/ai/screenMagic/aiScreenMagicButtonResolver";

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

  it("builds visible click results without provider calls or direct mutations", () => {
    const pack = getAiScreenMagicPack({ role: "buyer", context: "buyer", screenId: "buyer.main" });
    const draft = pack.buttons.find((button) => button.actionKind === "draft_only");
    expect(draft).toBeTruthy();

    const result = buildAiScreenMagicButtonResultCopy({
      pack,
      buttonIdOrLabel: draft!.label,
    });

    expect(result).toMatchObject({
      providerCallAllowed: false,
      dbWriteUsed: false,
      directMutationUsed: false,
    });
    expect(result?.answer).toContain("Готово от AI");
    expect(result?.answer).toContain("Черновик");
  });
});
