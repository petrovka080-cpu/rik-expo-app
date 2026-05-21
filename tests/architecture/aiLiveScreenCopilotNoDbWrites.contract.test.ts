import { joinedAiLiveScreenCopilotSources } from "./aiLiveScreenCopilotArchitectureTestHelpers";

describe("AI live screen copilot architecture - no DB writes", () => {
  it("does not write app data from AI answers", () => {
    expect(joinedAiLiveScreenCopilotSources()).not.toMatch(/\b(insert|upsert|update|delete|rpc)\s*\(/i);
  });
});
