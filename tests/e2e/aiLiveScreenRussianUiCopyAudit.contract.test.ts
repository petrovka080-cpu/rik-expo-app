import { listAiLiveScreenButtons, listAiLiveScreenManifests, validateAiLiveScreenRussianCopy } from "../../src/lib/ai/liveScreenCopilot";

describe("AI live screen Russian UI copy audit", () => {
  it("keeps live screen user-facing labels Russian and non-generic", () => {
    const audit = validateAiLiveScreenRussianCopy({
      buttons: listAiLiveScreenButtons(),
      texts: listAiLiveScreenManifests().map((manifest) => `${manifest.titleRu}\n${manifest.userGoalRu}`),
    });
    expect(audit.passed).toBe(true);
  });
});
