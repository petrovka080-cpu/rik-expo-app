import {
  AI_PROCUREMENT_NATIVE_MAGIC_GREEN_STATUS,
  AI_PROCUREMENT_NATIVE_MAGIC_REQUIRED_SCREENS,
  AI_PROCUREMENT_NATIVE_MAGIC_WAVE,
  buildAiScreenMagicEnterpriseMatrix,
  listAiScreenMagicPacksForScope,
} from "../../scripts/e2e/aiScreenMagicScopedWaveProof";
import { buildAiScreenMagicButtonResultCopy } from "../../src/features/ai/screenMagic/aiScreenMagicButtonResolver";
import { answerAiScreenMagicQuestion } from "../../src/features/ai/screenMagic/aiScreenMagicQuestionAnswerEngine";

describe("AI procurement native magic wave", () => {
  it("covers only the first production-safe procurement slice with contextual QA and safe results", () => {
    const packs = listAiScreenMagicPacksForScope(AI_PROCUREMENT_NATIVE_MAGIC_WAVE);

    expect(packs.map((pack) => pack.screenId)).toEqual([...AI_PROCUREMENT_NATIVE_MAGIC_REQUIRED_SCREENS]);
    for (const pack of packs) {
      expect(pack.domain).toMatch(/procurement|marketplace/);
      expect(pack.aiPreparedWork.length).toBeGreaterThanOrEqual(4);
      expect(pack.qa.length).toBeGreaterThanOrEqual(5);
      expect(pack.safety).toMatchObject({
        fakeDataUsed: false,
        directDangerousMutationAllowed: false,
        approvalBypassAllowed: false,
        providerRequired: false,
        dbWriteUsed: false,
      });

      const answer = answerAiScreenMagicQuestion({ pack, question: pack.qa[0]?.question ?? "" });
      expect(answer).toMatchObject({
        providerCallAllowed: false,
        answeredFromScreenContext: true,
      });

      const actionKinds = new Set(pack.buttons.map((button) => button.actionKind));
      expect([...actionKinds]).toEqual(expect.arrayContaining([
        "safe_read",
        "draft_only",
        "approval_required",
        "forbidden",
      ]));
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

  it("can reach the enterprise green matrix only when web, Android and iOS proofs are all present", () => {
    const partial = buildAiScreenMagicEnterpriseMatrix(AI_PROCUREMENT_NATIVE_MAGIC_WAVE, {
      webProofPass: true,
      androidProofPass: true,
      iosDeliveryProofPass: false,
      chatDialogNotTiny: true,
      uselessHeaderRemoved: true,
      debugCopyHidden: true,
      providerUnavailableCopyHidden: true,
    });
    expect(partial.final_status).toBe("BLOCKED_AI_MAGIC_WAVE_PROOF_INCOMPLETE");
    expect(partial.ios_delivery_proof_pass).toBe(false);
    expect(partial.fake_green_claimed).toBe(false);

    const green = buildAiScreenMagicEnterpriseMatrix(AI_PROCUREMENT_NATIVE_MAGIC_WAVE, {
      webProofPass: true,
      androidProofPass: true,
      iosDeliveryProofPass: true,
      chatDialogNotTiny: true,
      uselessHeaderRemoved: true,
      debugCopyHidden: true,
      providerUnavailableCopyHidden: true,
    });
    expect(green.final_status).toBe(AI_PROCUREMENT_NATIVE_MAGIC_GREEN_STATUS);
    expect(green).toMatchObject({
      screens_covered: true,
      web_proof_pass: true,
      android_proof_pass: true,
      ios_delivery_proof_pass: true,
      safe_read_no_mutation: true,
      draft_only_not_final_submit: true,
      approval_required_routes_to_ledger: true,
      forbidden_shows_user_reason: true,
      generic_fallback_used: false,
      fake_data_used: false,
      db_writes_used: false,
      direct_dangerous_mutations: false,
      new_hooks_added: false,
      hidden_testid_shims_added: false,
      fake_green_claimed: false,
    });
  });
});
