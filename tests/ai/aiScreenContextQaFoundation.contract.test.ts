import {
  AI_CHAT_USABILITY_GREEN_STATUS,
  AI_CHAT_USABILITY_REQUIRED_SCREENS,
  buildAiChatUsabilityFoundationMatrix,
} from "../../src/features/ai/screenMagic/aiScreenMagicProof";
import { listAiScreenMagicPacks } from "../../src/features/ai/screenMagic/aiScreenMagicEngine";
import { answerAiScreenMagicQuestion } from "../../src/features/ai/screenMagic/aiScreenMagicQuestionAnswerEngine";

describe("AI screen context QA foundation", () => {
  it("covers the full foundation screen set with role-native context signals", () => {
    const packs = listAiScreenMagicPacks();
    const packByScreen = new Map(packs.map((pack) => [pack.screenId, pack]));

    expect(AI_CHAT_USABILITY_REQUIRED_SCREENS.length).toBe(28);
    for (const screenId of AI_CHAT_USABILITY_REQUIRED_SCREENS) {
      const pack = packByScreen.get(screenId);

      expect(pack?.userHeader).toBeTruthy();
      expect(pack?.visibleDomainData.length).toBeGreaterThan(0);
      expect(pack?.riskSummary.length).toBeGreaterThan(0);
      expect(pack?.missingDataSummary.length).toBeGreaterThan(0);
      expect(pack?.safeActions.length).toBeGreaterThan(0);
      expect(pack?.approvalCandidates.length).toBeGreaterThan(0);
      expect(pack?.exactBlockers.length).toBeGreaterThan(0);
    }
    expect(packByScreen.get("screen.runtime")?.roleScope.sort()).toEqual(["admin", "developer"]);
  });

  it("answers normal user questions from each required screen context", () => {
    const packs = listAiScreenMagicPacks();
    const packByScreen = new Map(packs.map((pack) => [pack.screenId, pack]));

    for (const screenId of AI_CHAT_USABILITY_REQUIRED_SCREENS) {
      const pack = packByScreen.get(screenId);
      const answer = answerAiScreenMagicQuestion({
        pack,
        question: "Что критично сейчас на этом экране?",
      });

      expect(pack?.aiPreparedWork.length).toBeGreaterThan(0);
      expect(answer).toMatchObject({
        answeredFromScreenContext: true,
        providerCallAllowed: false,
      });
      expect(answer?.answer).toContain(pack?.userHeader);
      expect(answer?.usedSignals).toMatchObject({
        screenId,
      });
      expect(answer?.usedSignals.visibleDomainData.length).toBeGreaterThan(0);
      expect(answer?.usedSignals.risks.length).toBeGreaterThan(0);
      expect(answer?.usedSignals.missingData.length).toBeGreaterThan(0);
      expect(answer?.usedSignals.safeActions.length).toBeGreaterThan(0);
      expect(answer?.usedSignals.approvalCandidates.length).toBeGreaterThan(0);
      expect(answer?.usedSignals.exactBlockers.length).toBeGreaterThan(0);
      expect(answer?.answer).not.toMatch(/screenId:|raw JSON|provider unavailable|module unavailable/i);
    }
  });

  it("builds the foundation matrix without generic chat fallback", () => {
    const matrix = buildAiChatUsabilityFoundationMatrix({
      webProofPass: true,
      androidProofPass: true,
      chatDialogNotTiny: true,
      chatDialogScrolls: true,
      inputVisible: true,
      uselessTopHeaderRemoved: true,
      debugCopyHidden: true,
      providerUnavailableCopyHidden: true,
    });

    expect(matrix.final_status).toBe(AI_CHAT_USABILITY_GREEN_STATUS);
    expect(matrix.qa_from_screen_context).toBe(true);
    expect(matrix.generic_chat_fallback_used).toBe(false);
    expect(matrix.screen_context_hydrated).toBe(true);
  });
});
