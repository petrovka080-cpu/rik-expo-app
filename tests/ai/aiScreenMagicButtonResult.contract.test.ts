import {
  buildAiScreenMagicButtonResultCopy,
  resolveAiScreenMagicButton,
} from "../../src/features/ai/screenMagic/aiScreenMagicButtonResolver";
import { listAiScreenMagicPacks } from "../../src/features/ai/screenMagic/aiScreenMagicEngine";
import { AI_CHAT_USABILITY_REQUIRED_SCREENS } from "../../src/features/ai/screenMagic/aiScreenMagicProof";

describe("AI screen magic button result contract", () => {
  it("resolves every required-screen button to exactly one visible safe result", () => {
    const packByScreen = new Map(listAiScreenMagicPacks().map((pack) => [pack.screenId, pack]));
    const seenKinds = new Set<string>();

    for (const screenId of AI_CHAT_USABILITY_REQUIRED_SCREENS) {
      const pack = packByScreen.get(screenId);
      expect(pack).toBeTruthy();

      for (const button of pack?.buttons ?? []) {
        seenKinds.add(button.actionKind);
        const resolution = resolveAiScreenMagicButton(button);
        const result = buildAiScreenMagicButtonResultCopy({ pack: pack!, buttonIdOrLabel: button.id });

        expect(result).toBeTruthy();
        expect(result).toMatchObject({
          resultType: button.actionKind,
          providerCallAllowed: false,
          dbWriteUsed: false,
          directMutationUsed: false,
        });
        expect(result?.answer).toContain(button.label);
        expect(button.resultType).toBe(button.actionKind);
        expect(resolution.canExecuteDirectly).toBe(false);

        if (button.actionKind === "approval_required") {
          expect(button.approvalRoute).toBeTruthy();
          expect(resolution.status).toBe("routes_to_approval_ledger");
        }
        if (button.actionKind === "forbidden") {
          expect(button.forbiddenReason).toBeTruthy();
          expect(resolution.status).toBe("forbidden_with_reason");
        }
      }
    }

    expect([...seenKinds].sort()).toEqual(expect.arrayContaining([
      "approval_required",
      "draft_only",
      "forbidden",
      "safe_read",
    ]));
  });

  it("keeps role-native foundation buttons available without exposing internal action names", () => {
    const packByScreen = new Map(listAiScreenMagicPacks().map((pack) => [pack.screenId, pack]));
    const expectedKindsByScreen: Record<string, string[]> = {
      "accountant.main": ["safe_read", "draft_only", "approval_required"],
      "buyer.main": ["safe_read", "draft_only", "approval_required"],
      "warehouse.issue": ["safe_read", "draft_only", "approval_required"],
      "director.dashboard": ["safe_read", "draft_only"],
      "foreman.main": ["safe_read", "draft_only"],
      "approval.inbox": ["safe_read", "draft_only", "approval_required"],
    };
    const forbiddenVisibleCopy =
      /safe_read|draft_only|approval_required|exact_blocker|forbidden|evidence|rationale|provider|runtime|mutation|execute directly/i;

    for (const [screenId, kinds] of Object.entries(expectedKindsByScreen)) {
      const pack = packByScreen.get(screenId);
      expect(pack).toBeTruthy();

      for (const kind of kinds) {
        expect((pack?.buttons ?? []).some((button) => button.actionKind === kind)).toBe(true);
      }
      expect((pack?.buttons ?? []).map((button) => button.label).join("\n")).not.toMatch(forbiddenVisibleCopy);
    }
  });
});
