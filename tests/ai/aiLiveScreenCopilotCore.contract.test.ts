import {
  AI_LIVE_SCREEN_COPILOT_GREEN_STATUS,
  AI_LIVE_SCREEN_COPILOT_WAVE,
  listAiLiveScreenManifests,
} from "../../src/lib/ai/liveScreenCopilot";
import { answerAiLiveScreenButtonFixture } from "./aiLiveScreenCopilotTestHelpers";

describe("AI live screen copilot core", () => {
  it("declares the live screen wave and integrates Universal Role QA output", () => {
    expect(AI_LIVE_SCREEN_COPILOT_WAVE).toBe("S_AI_LIVE_SCREEN_COPILOT_UI_BUTTONS_RUSSIAN_PROOF_POINT_OF_NO_RETURN");
    expect(AI_LIVE_SCREEN_COPILOT_GREEN_STATUS).toBe("GREEN_AI_LIVE_SCREEN_COPILOT_UI_BUTTONS_RUSSIAN_PROOF_READY");
    expect(listAiLiveScreenManifests()).toHaveLength(10);

    const result = answerAiLiveScreenButtonFixture("director.today_decisions");
    expect(result.providerCallAllowed).toBe(false);
    expect(result.dbWriteUsed).toBe(false);
    expect(result.directMutationUsed).toBe(false);
    expect(result.universalAnswer.sourcePlan.sourceOrder).toContain("app_context_graph");
    expect(result.presentedTextRu).toContain("Коротко:");
    expect(result.guard.failureReason).toBeUndefined();
  });
});
