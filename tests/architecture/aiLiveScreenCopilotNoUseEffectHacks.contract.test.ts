import { joinedAiLiveScreenCopilotSources } from "./aiLiveScreenCopilotArchitectureTestHelpers";

describe("AI live screen copilot architecture - no useEffect hacks", () => {
  it("does not introduce useEffect orchestration in the copilot layer", () => {
    expect(joinedAiLiveScreenCopilotSources()).not.toMatch(/\buseEffect\s*\(|setTimeout\s*\(|setInterval\s*\(/);
  });
});
