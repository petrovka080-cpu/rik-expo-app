import { joinedAiLiveScreenCopilotSources } from "./aiLiveScreenCopilotArchitectureTestHelpers";

describe("AI live screen copilot architecture - no second framework", () => {
  it("uses Universal Role QA instead of creating another provider framework", () => {
    const source = joinedAiLiveScreenCopilotSources();
    expect(source).toContain("answerUniversalRoleQa");
    expect(source).not.toMatch(/new\s+OpenAI|GoogleGenerativeAI|createChatCompletion|chat\.completions|generateText/);
  });
});
