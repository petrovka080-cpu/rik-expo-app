import { joinedAiLiveScreenCopilotSources } from "./aiLiveScreenCopilotArchitectureTestHelpers";

describe("AI live screen copilot architecture - no hooks", () => {
  it("keeps the new live screen copilot layer as pure services/adapters", () => {
    expect(joinedAiLiveScreenCopilotSources()).not.toMatch(/\buse(State|Effect|Memo|Callback|Reducer|Ref|FocusEffect)\b/);
  });
});
