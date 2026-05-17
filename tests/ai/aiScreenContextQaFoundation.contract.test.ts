import {
  AI_CHAT_USABILITY_GREEN_STATUS,
  AI_CHAT_USABILITY_REQUIRED_SCREENS,
  buildAiChatUsabilityFoundationMatrix,
} from "../../src/features/ai/screenMagic/aiScreenMagicProof";
import { listAiScreenMagicPacks } from "../../src/features/ai/screenMagic/aiScreenMagicEngine";
import { answerAiScreenMagicQuestion } from "../../src/features/ai/screenMagic/aiScreenMagicQuestionAnswerEngine";

describe("AI screen context QA foundation", () => {
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
      expect(answer?.answer).toContain(pack?.screenSummary);
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
