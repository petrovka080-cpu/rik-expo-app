import {
  AI_WAREHOUSE_STOCK_APPROVAL_MAGIC_GREEN_STATUS,
  AI_WAREHOUSE_STOCK_APPROVAL_MAGIC_REQUIRED_SCREENS,
  AI_WAREHOUSE_STOCK_APPROVAL_MAGIC_WAVE,
  buildAiScreenMagicEnterpriseMatrix,
  listAiScreenMagicPacksForScope,
} from "../../scripts/e2e/aiScreenMagicScopedWaveProof";
import { buildAiScreenMagicButtonResultCopy } from "../../src/features/ai/screenMagic/aiScreenMagicButtonResolver";
import { answerAiScreenMagicQuestion } from "../../src/features/ai/screenMagic/aiScreenMagicQuestionAnswerEngine";

describe("AI warehouse stock approval magic wave", () => {
  it("covers warehouse screens with stock-safe reads, drafts and approval routing", () => {
    const packs = listAiScreenMagicPacksForScope(AI_WAREHOUSE_STOCK_APPROVAL_MAGIC_WAVE);

    expect(packs.map((pack) => pack.screenId)).toEqual([...AI_WAREHOUSE_STOCK_APPROVAL_MAGIC_REQUIRED_SCREENS]);
    for (const pack of packs) {
      expect(pack.domain).toBe("warehouse");
      expect(pack.aiPreparedWork.length).toBeGreaterThanOrEqual(4);
      expect(pack.qa.length).toBeGreaterThanOrEqual(5);
      expect(pack.safety).toMatchObject({
        fakeDataUsed: false,
        directDangerousMutationAllowed: false,
        approvalBypassAllowed: false,
        providerRequired: false,
        dbWriteUsed: false,
      });

      const actionKinds = new Set(pack.buttons.map((button) => button.actionKind));
      expect([...actionKinds]).toEqual(expect.arrayContaining([
        "safe_read",
        "draft_only",
        "approval_required",
        "forbidden",
      ]));
      expect(pack.buttons.some((button) =>
        button.actionKind === "approval_required" && Boolean(button.approvalRoute),
      )).toBe(true);
      expect(pack.buttons.some((button) =>
        button.actionKind === "forbidden" && Boolean(button.forbiddenReason),
      )).toBe(true);

      const answer = answerAiScreenMagicQuestion({ pack, question: pack.qa[0]?.question ?? "" });
      expect(answer).toMatchObject({
        providerCallAllowed: false,
        answeredFromScreenContext: true,
      });

      for (const button of pack.buttons) {
        const result = buildAiScreenMagicButtonResultCopy({ pack, buttonIdOrLabel: button.id });
        expect(result).toMatchObject({
          providerCallAllowed: false,
          dbWriteUsed: false,
          directMutationUsed: false,
        });
        expect(button.canExecuteDirectly).toBe(false);
      }
    }
  });

  it("can close as proof-only without claiming physical iOS button verification", () => {
    const matrix = buildAiScreenMagicEnterpriseMatrix(AI_WAREHOUSE_STOCK_APPROVAL_MAGIC_WAVE, {
      webProofPass: true,
      androidProofPass: true,
      iosDeliveryProofPass: false,
      iosDeliveryNotRequired: true,
      chatDialogNotTiny: true,
      uselessHeaderRemoved: true,
      debugCopyHidden: true,
      providerUnavailableCopyHidden: true,
    });

    expect(matrix.final_status).toBe(AI_WAREHOUSE_STOCK_APPROVAL_MAGIC_GREEN_STATUS);
    expect(matrix).toMatchObject({
      screens_covered: true,
      safe_read_no_mutation: true,
      draft_only_not_final_submit: true,
      approval_required_routes_to_ledger: true,
      forbidden_shows_user_reason: true,
      ios_delivery_proof_pass: false,
      ios_delivery_not_required: true,
      buttons_verified_on_ios: false,
      fake_green_claimed: false,
    });
  });
});
