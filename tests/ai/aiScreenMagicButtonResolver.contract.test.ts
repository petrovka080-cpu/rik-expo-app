import { getAiScreenMagicPack } from "../../src/features/ai/screenMagic/aiScreenMagicEngine";
import {
  buildAiScreenMagicClickPayload,
  buildAiScreenMagicButtonResultCopy,
  isAiScreenMagicClickPayload,
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
      buttonIdOrLabel: buildAiScreenMagicClickPayload(draft!),
    });

    expect(isAiScreenMagicClickPayload(buildAiScreenMagicClickPayload(draft!))).toBe(true);
    expect(result).toMatchObject({
      providerCallAllowed: false,
      dbWriteUsed: false,
      directMutationUsed: false,
    });
    expect(result?.answer).toContain("Черновик подготовлен");
    expect(result?.answer).toContain(draft?.label);
    expect(result?.answer).toContain("Финальная отправка не выполнена");
  });

  it("requires exact audited button labels or ids and rejects fuzzy partial clicks", () => {
    const pack = getAiScreenMagicPack({ role: "buyer", context: "buyer", screenId: "buyer.main" });
    const draft = pack.buttons.find((button) => button.actionKind === "draft_only");
    expect(draft).toBeTruthy();

    const exactById = buildAiScreenMagicButtonResultCopy({
      pack,
      buttonIdOrLabel: draft!.id,
    });
    const fuzzyPartial = buildAiScreenMagicButtonResultCopy({
      pack,
      buttonIdOrLabel: `Готово от AI: ${draft!.label.slice(0, Math.max(1, draft!.label.length - 2))}`,
    });

    expect(exactById?.button.id).toBe(draft!.id);
    expect(fuzzyPartial).toBeNull();
  });
});
